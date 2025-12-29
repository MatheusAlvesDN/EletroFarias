import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { format, subHours } from 'date-fns';
import { v2 as cloudinary } from 'cloudinary';
import * as fs from 'fs';
import * as XLSX from 'xlsx';
import * as path from 'path';
import * as ExcelJS from 'exceljs';
import * as fS from 'node:fs/promises';
import { HttpException, HttpStatus } from '@nestjs/common';

const onlyDigits = (v: any) => String(v ?? '').replace(/\D/g, '');


type AjusteItem = {
  codProd: number;
  diference: number; // quantidade (QTDNEG)
};

interface Produto {
  barcode: string;
  name: string;
  plu: string;
  active: boolean;
  inventory: { stock: number };
  details: {
    categorization: {
      department: any;
      category: any;
      subCategory: any;
    };
    brand: any;
    unit: any;
    volume: any;
    imageUrl: string | null;
    description: string | null;
    nearExpiration: boolean;
    family: any;
  };
  prices: {
    price: number;
    promotionPrice: number | null;
  };
  scalePrices: any;
  multiple: any;
  channels: any;
  serving: any;
};

function getFirstThreeColumnsFromSheet(): Array<{ cod: string; name: string; ean: string }> {
  const filePath = path.join(process.cwd(), 'relatorios/cadastrarEAN.xlsx');

  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];

  const data = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });

  const result = data
    .slice(1) // Ignora o cabeçalho
    .map(row => ({
      cod: row[0],
      name: row[1],
      ean: row[2],
    }));

  return result;
};

export interface ProdutoLocDTO {
  CODPROD: string | null;
  DESCRPROD: string | null;
  MARCA: string | null;
  CARACTERISTICAS: string | null;
  CODVOL: string | null;
  CODGRUPOPROD: string | null;
  LOCALIZACAO: string | null;
  DESCRGRUPOPROD: string | null; // do join GrupoProduto
};

function toAscii(input: string) {
  // remove acentos/diacríticos e troca ç/Ç por c
  return String(input ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '') // remove acentos (inclui a cedilha)
    .replace(/ç/gi, 'c')            // redundante, mas garante
    .trim();
}

type EstoqueLinha = {
  CODLOCAL: number;
  ESTOQUE: number;
  RESERVADO: number;
  DISPONIVEL: number;
  // Se incluir campos de apresentação (ex.: LocalFinanceiro_DESCRLOCAL), eles entram aqui:
  [k: string]: any;
};

type VendedorDTO = {
  CODVEND: number | null;
  CODPARC: number | null;
  APELIDO: string | null;
  AD_TIPOTECNICO: number | null;
};

@Injectable()
export class SankhyaService {
  /*getProductsByLocation(location: string, token: string) {
      throw new Error('Method not implemented.');
  }*/
  private readonly loginUrl = 'https://api.sankhya.com.br/login';
  private readonly queryUrl = 'https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json';
  private readonly logoutUrl = 'https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=MobileLoginSP.logout&outputType=json';
  private readonly baseUrl = 'https://api.sankhya.com.br/'
  private readonly grupoUrl = 'https://api.sankhya.com.br/GrupoProduto'
  private readonly outputDir = process.env.OUTPUT_DIR || path.resolve(process.cwd(), 'exports');
  private readonly logger = new Logger(SankhyaService.name);
  private readonly serviceUrl =
    process.env.SANKHYA_SERVICE_URL // ex.: https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json
    || 'https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json';
  private readonly token: string;
  private readonly appKey: string;
  private readonly username: string;
  private readonly password: string;
  private async resolverCodVolPadrao(codProd: number, authToken: string): Promise<string> {
    const headers = { Authorization: `Bearer ${authToken}` };

    // 1) tenta pelos volumes do produto
    const urlVolumes = `https://api.sankhya.com.br/v1/produtos/${codProd}/volumes`;
    const volResp = await firstValueFrom(this.http.get(urlVolumes, { headers }));

    const lista = volResp.data?.content ?? volResp.data?.items ?? volResp.data ?? [];
    // ⚠️ a estrutura exata pode variar; por isso deixei 3 fallbacks comuns

    const padrao =
      lista.find((v: any) => v?.padrao === true || v?.isPadrao === true || v?.unidadePadrao === true) ??
      lista[0];

    const codVol =
      padrao?.codVol ?? padrao?.CODVOL ?? padrao?.codigoVolume ?? padrao?.volume;

    if (codVol) return String(codVol);

    // 2) fallback: tenta pegar do “produto específico”
    const urlProd = `https://api.sankhya.com.br/v1/produtos/${codProd}`;
    const prodResp = await firstValueFrom(this.http.get(urlProd, { headers }));

    const prod = prodResp.data;
    const codVolProd =
      prod?.codVol ?? prod?.CODVOL ?? prod?.unidadePadrao ?? prod?.unidade?.codigo;

    if (codVolProd) return String(codVolProd);

    throw new Error(`Não consegui determinar CODVOL padrão do produto ${codProd}`);
  }


  constructor(
    private readonly http: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.token = this.configService.get<string>('SANKHYA_TOKEN')!;
    this.appKey = this.configService.get<string>('SANKHYA_APPKEY')!;
    this.username = this.configService.get<string>('SANKHYA_USERNAME')!;
    this.password = this.configService.get<string>('SANKHYA_PASSWORD')!;
    cloudinary.config({
      cloud_name: this.configService.get('CLOUDINARY_NAME'),
      api_key: this.configService.get('CLOUDINARY_KEY'),
      api_secret: this.configService.get('CLOUDINARY_SECRET'),
    });
  }


  async login(): Promise<string> {
    try {
      const response = await firstValueFrom(
        this.http.post(this.loginUrl, null, {
          headers: {
            token: this.token,
            appkey: this.appKey,
            username: this.username,
            password: this.password,
          },
        }),
      );

      const bearerToken = response.data.bearerToken;
      if (!bearerToken) {
        throw new Error('Bearer token não retornado no login.');
      }

      return bearerToken;
    } catch (error: any) {
      console.error(
        'Erro ao autenticar na API Sankhya:',
        error.response?.data || error.message,
      );
      throw error;
    }
  }

  async logout(authToken: string, log: string): Promise<void> {
    try {
      await firstValueFrom(
        this.http.get(this.logoutUrl, {
          headers: {
            Authorization: `Bearer ${authToken}`,
            appkey: this.appKey,
            'Content-Type': 'application/json',
          },
        }),
      );
      console.log(log);
    } catch (error: any) {
      console.error(
        'Erro ao fazer logout:',
        error.response?.data || error.message,
      );
      throw error;
    }
  }



  //#region Cadastro de produtos, com os retornos experados para a API do ifood

  async atualizarPlanilhaComItensRestantes(
    itensRestantes: { cod: string; name: string; ean: string }[],
    caminho = 'relatorios/cadastrarEAN.xlsx'
  ) {
    const filePath = path.join(process.cwd(), caminho);
    const ws = XLSX.utils.json_to_sheet(itensRestantes);
    const wb = XLSX.utils.book_new();

    ws['!cols'] = [
      { wch: 15 }, // cod
      { wch: 50 }, // name
      { wch: 20 }, // ean
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Produtos sem EAN válido');
    XLSX.writeFile(wb, filePath);
  }

  async getProduto(codProd: number, authToken: string): Promise<any> {
    const payload = {
      serviceName: 'CRUDServiceProvider.loadRecords',
      requestBody: {
        dataSet: {
          rootEntity: 'Produto',
          includePresentationFields: 'N',
          tryJoinedFields: 'true',
          offsetPage: '0',
          criteria: {
            expression: {
              $: 'this.CODPROD = ?',
            },
            parameter: [
              {
                $: codProd.toString(),
                type: 'I',
              },
            ],
          },
          entity: [
            {
              path: '',
              fieldset: {
                list: 'CODPROD,DESCRPROD,MARCA,CARACTERISTICAS,CODVOL,CODGRUPOPROD,LOCALIZACAO',
              },
            },
            {
              path: 'GrupoProduto',
              fieldset: {
                list: 'DESCRGRUPOPROD',
              },
            },
          ],
        },
      },
    };
    try {
      const response = await firstValueFrom(
        this.http.post(this.queryUrl, payload, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
            appkey: this.appKey,
          },
        }),
      );

      return response.data.responseBody?.entities?.entity;
    } catch (error: any) {
      console.error(
        'Erro ao buscar produto:',
        error.response?.data || error.message,
      );
      throw error;
    }
  }

  async getProductsByGroup(
    CategoryID: string,
    categoryName: string,
    authToken: string
  ): Promise<any[]> {
    const produtos: any[] = [];
    let page = 0;
    let hasMore = true;

    while (hasMore) {
      const payload = {
        serviceName: 'CRUDServiceProvider.loadRecords',
        requestBody: {
          dataSet: {
            rootEntity: 'Produto',
            includePresentationFields: 'N',
            tryJoinedFields: 'true',
            offsetPage: page.toString(),
            pageSize: '50',
            criteria: {
              expression: { $: 'this.CODGRUPOPROD = ? AND this.ATIVO = ?' },
              parameter: [
                { $: CategoryID, type: 'S' },
                { $: 'S', type: 'S' },
              ],
            },
            entity: [
              {
                path: '',
                fieldset: {
                  list: 'CODPROD,DESCRPROD,CODGRUPOPROD,CARACTERISTICAS,ATIVO,MARCA,UNIDADE,AD_CODBARRA',
                },
              },
            ],
          },
        },
      };

      try {
        const response = await firstValueFrom(
          this.http.post(this.queryUrl, payload, {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${authToken}`,
              appkey: this.appKey,
            },
          }),
        );

        const entities = response.data?.responseBody?.entities?.entity || [];
        produtos.push(...entities);
        hasMore = entities.length >= 50;
        page++;
      } catch (error: any) {
        console.error('Erro na paginação de produtos:', error.response?.data || error.message);
        throw error;
      }
    }

    // 🔁 Processar produtos em paralelo
    const produtosFormatados = await Promise.all(
      produtos
        .filter(prod => prod.f4?.['$'] === 'S') // ATIVO
        .map(async (prod) => {
          const codigo = prod.f0?.['$'] ?? '';
          const descricao = prod.f1?.['$'] ?? '';
          const caracteristicas = prod.f3?.['$'] ?? '';
          const marca = prod.f5?.['$'] ?? '';
          const unidade = prod.f6?.['$'] ?? '';
          const ean = prod.f7?.['$'] ?? '';

          const imagemUrlOriginal = `https://danilo.nuvemdatacom.com.br:9092/mge/Produto@IMAGEM@CODPROD=${codigo}.dbimage`;

          let imageCloudinary: string | null = null;
          try {
            imageCloudinary = await this.processImageFromUrl(imagemUrlOriginal, `produto_${codigo}`);
          } catch (e) {
            console.warn(`Erro ao processar imagem do produto ${codigo}:`, e.message);
          }

          return {
            barcode: ean.toString(),
            name: descricao,
            plu: codigo.toString(),
            active: true,
            inventory: {
              stock: 1,
            },
            details: {
              categorization: {
                department: categoryName,
                category: marca,
                subCategory: null,
              },
              brand: marca,
              unit: unidade,
              volume: null,
              imageUrl: imageCloudinary,
              description: caracteristicas || null,
              nearExpiration: false,
              family: null,
            },
            prices: {
              price: 999999,
              promotionPrice: null,
            },
            scalePrices: null,
            multiple: null,
            channels: null,
            serving: null
          };
        }),
    );

    return produtosFormatados;
  }

  async filterInvalidEanAndExport(
    categoryId: string,
    categoryName: string,
    authToken: string
  ): Promise<Produto[]> {
    const allProducts: Produto[] = await this.getProductsByGroup(
      categoryId,
      categoryName,
      authToken
    );

    const filePath = path.join(process.cwd(), 'relatorios/cadastrarEAN.xlsx');
    const invalidMap = new Map<string, { name: string; ean: string }>(); // PLU -> { name, ean }

    // Carrega dados existentes da planilha
    if (fs.existsSync(filePath)) {
      const workbook = XLSX.readFile(filePath);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const existing: { 'Código PLU': string; 'Nome do Produto': string; EAN?: string }[] =
        XLSX.utils.sheet_to_json(sheet);

      for (const { 'Código PLU': plu, 'Nome do Produto': name, EAN: ean } of existing) {
        invalidMap.set(plu, { name, ean: ean ?? '' });
      }
    }

    const validProducts: Produto[] = [];

    for (const prod of allProducts) {
      const ean = prod.barcode?.toString().trim() ?? '';

      if (!ean || ean.length !== 13 || !/^\d{13}$/.test(ean)) {
        invalidMap.set(prod.plu, { name: prod.name, ean });
      } else {
        validProducts.push(prod);
      }
    }

    if (invalidMap.size > 0) {
      const finalData = Array.from(invalidMap.entries()).map(([PLU, { name, ean }]) => ({
        'Código PLU': PLU,
        'Nome do Produto': name,
        'EAN': ean,
      }));

      const ws = XLSX.utils.json_to_sheet(finalData);
      ws['!cols'] = [
        { wch: 15 }, // PLU
        { wch: 50 }, // Nome
        { wch: 20 }, // EAN
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Produtos sem EAN válido');
      XLSX.writeFile(wb, filePath);
    }

    return validProducts;
  }

  async readPlanWithEAN(): Promise<{ cod: string; name: string; ean: string }[]> {
    const retorno = getFirstThreeColumnsFromSheet();
    return retorno;
  }

  async atualizarProduto(token: string, codProd: string, codeEAN: string) {
    const url = 'https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=DatasetSP.save&outputType=json';

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };

    const data = {
      serviceName: 'CRUDServiceProvider.saveRecord',
      requestBody: {
        entityName: 'Produto',
        standAlone: false,
        fields: ['CODPROD', 'AD_CODBARRA'],
        records: [
          {
            pk: {
              CODPROD: codProd,
            },
            values: {
              1: codeEAN,
            },
          },
        ],
      },
    };

    try {
      const response = await firstValueFrom(
        this.http.post(url, data, { headers }),
      );
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao atualizar produto:', error.response?.data || error.message);
      throw error;
    }
  }

  async getProdutoAlone(codProd: string, authToken: string): Promise<Produto | null> {
    const payload = {
      serviceName: 'CRUDServiceProvider.loadRecords',
      requestBody: {
        dataSet: {
          rootEntity: 'Produto',
          includePresentationFields: 'N',
          tryJoinedFields: 'true',
          offsetPage: '0',
          criteria: {
            expression: {
              $: 'this.CODPROD = ?',
            },
            parameter: [
              {
                $: codProd.toString(),
                type: 'I',
              },
            ],
          },
          entity: [
            {
              path: '',
              fieldset: {
                list: 'CODPROD,DESCRPROD,MARCA,CARACTERISTICAS,CODVOL,CODGRUPOPROD,ATIVO,AD_CODBARRA',
              },
            },
            {
              path: 'GrupoProduto',
              fieldset: {
                list: 'DESCRGRUPOPROD',
              },
            },
          ],
        },
      },
    };

    try {
      const response = await firstValueFrom(
        this.http.post(this.queryUrl, payload, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
            appkey: this.appKey,
          },
        }),
      );

      const entity = response.data.responseBody?.entities?.entity?.[0];
      if (!entity) return null;

      const codigo = entity.f0?.['$'] ?? '';
      const descricao = entity.f1?.['$'] ?? '';
      const marca = entity.f2?.['$'] ?? '';
      const caracteristicas = entity.f3?.['$'] ?? '';
      const unidade = entity.f4?.['$'] ?? '';
      const grupo = entity.f5?.['$'] ?? '';
      const ativo = entity.f6?.['$'] === 'S';
      const ean = entity.f7?.['$'] ?? '';
      const grupoDescricao = entity.f8?.['$'] ?? ''; // DESCRGRUPOPROD

      // Imagem
      const imagemUrlOriginal = `https://danilo.nuvemdatacom.com.br:9092/mge/Produto@IMAGEM@CODPROD=${codigo}.dbimage`;

      let imageCloudinary: string | null = null;
      try {
        imageCloudinary = await this.processImageFromUrl(imagemUrlOriginal, `produto_${codigo}`);
      } catch (e) {
        console.warn(`Erro ao processar imagem do produto ${codigo}:`, e.message);
      }

      const produto: Produto = {
        barcode: ean.toString(),
        name: descricao,
        plu: codigo.toString(),
        active: ativo,
        inventory: {
          stock: 1, // Valor fixo (ajustável se necessário)
        },
        details: {
          categorization: {
            department: grupoDescricao,
            category: marca,
            subCategory: null,
          },
          brand: marca,
          unit: unidade,
          volume: null,
          imageUrl: imageCloudinary,
          description: caracteristicas || null,
          nearExpiration: false,
          family: null,
        },
        prices: {
          price: 999999, // Valor fixo ou carregado de outro lugar
          promotionPrice: null,
        },
        scalePrices: null,
        multiple: null,
        channels: null,
        serving: null,
      };

      return produto;

    } catch (error: any) {
      console.error(
        'Erro ao buscar produto:',
        error.response?.data || error.message,
      );
      throw error;
    }
  }

  //puxa os produtos por grupo do sankhya com EAN em formato para o ifood grocery e adiciona os que não possuem a planilha para cadastrar

  async enrichWithPricesFromProductList(
    produtos: Array<{
      barcode: string;
      name: string;
      plu: string;
      active: boolean;
      inventory: { stock: number };
      details: {
        categorization: {
          department: any;
          category: any;
          subCategory: any;
        };
        brand: any;
        unit: any;
        volume: any;
        imageUrl: string | null;
        description: string | null;
        nearExpiration: boolean;
        family: any;
      };
      prices: {
        price: number;
        promotionPrice: number | null;
      };
      scalePrices: any;
      multiple: any;
      channels: any;
    }>,
    codigoTabela: number,
    authToken: string,
  ): Promise<typeof produtos> {
    // 1. Extrai os códigos dos produtos
    const codigosProdutos = produtos.map(p => parseInt(p.plu));

    // 2. Consulta os preços da tabela
    const precos = await this.getPrecosProdutosTabelaBatch(codigosProdutos, codigoTabela, authToken);

    // 3. Mapeia código -> preço
    const precoMap = new Map(precos.map(p => [p.codProd.toString(), p.valor]));

    // 4. Atualiza os produtos com os preços reais
    return produtos.map(prod => {
      const preco = precoMap.get(prod.plu) ?? 0;
      return {
        ...prod,
        prices: {
          ...prod.prices,
          price: preco,
        },
      };
    });
  }

  async getPrecosProdutosTabelaBatch(
    codigosProdutos: number[],
    codigoTabela: number,
    authToken: string,
  ): Promise<{ codProd: number; valor: number }[]> {
    const pagina = 1;

    const precos: { codProd: number; valor: number }[] = [];

    for (const codProd of codigosProdutos) {
      try {
        const url = `https://api.sankhya.com.br/v1/precos/produto/${codProd}/tabela/${codigoTabela}`;

        const response$ = this.http.get(url, {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
          params: { pagina },
        });

        const response = await firstValueFrom(response$);

        const produto = response.data?.produtos?.[0];

        precos.push({
          codProd,
          valor: produto?.valor ? parseFloat(produto.valor) : 0,
        });
      } catch (error: any) {
        console.error(`Erro ao buscar preço do produto ${codProd}:`, error.response?.data || error.message);
        precos.push({
          codProd,
          valor: 0,
        });
      }
    }

    return precos;
  }

  async getStockInLot(
    produtos: Array<{
      barcode: string;
      name: string;
      plu: string;
      active: boolean;
      inventory: { stock: number };
      details: {
        categorization: {
          department: any;
          category: any;
          subCategory: any;
        };
        brand: any;
        unit: any;
        volume: any;
        imageUrl: string | null;
        description: string | null;
        nearExpiration: boolean;
        family: any;
      };
      prices: {
        price: number;
        promotionPrice: number | null;
      };
      scalePrices: any;
      multiple: any;
      channels: any;
    }>,
    codLocal: number,
    authToken: string,
  ): Promise<typeof produtos> {
    const codigos = produtos.map(p => p.plu).filter(c => !isNaN(Number(c)));

    let page = 0;
    const pageSize = 50;
    let hasMore = true;
    const estoqueMap = new Map<string, number>();

    while (hasMore) {
      const payload = {
        serviceName: 'CRUDServiceProvider.loadRecords',
        requestBody: {
          dataSet: {
            rootEntity: 'Estoque',
            includePresentationFields: 'S',
            offsetPage: page.toString(),
            pageSize: pageSize.toString(),
            criteria: {
              expression: {
                $: `(${codigos.map(() => '(this.CODPROD = ? AND this.CODLOCAL = ?)').join(' OR ')})`,
              },
              parameter: codigos.flatMap(cod => [
                { $: cod.toString(), type: 'I' },
                { $: codLocal.toString(), type: 'I' },
              ]),
            },
            entity: {
              fieldset: {
                list: 'CODPROD,CODLOCAL,ESTOQUE',
              },
            },
          },
        },
      };

      try {
        const response = await firstValueFrom(
          this.http.post(this.queryUrl, payload, {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${authToken}`,
              appkey: this.appKey,
            },
          }),
        );

        const entidades = response.data?.responseBody?.entities?.entity;
        const lista = Array.isArray(entidades)
          ? entidades
          : entidades
            ? [entidades]
            : [];

        for (const item of lista) {
          const codProd = item.f0?.['$'];
          const estoque = parseFloat(item.f2?.['$'] ?? '0');
          if (codProd) {
            estoqueMap.set(codProd, estoque);
          }
        }

        hasMore = lista.length === pageSize;
        page++;
      } catch (error: any) {
        console.error('Erro ao buscar estoques em lote:', error.response?.data || error.message);
        throw new Error('Erro ao buscar estoques em lote');
      }
    }

    return produtos.map(produto => ({
      ...produto,
      inventory: {
        ...produto.inventory,
        stock: estoqueMap.get(produto.plu) ?? 0,
      },
    }));
  }

  //#endregion

  //#region Solicitações para Sistema Interno (Intgr)


  //#region Sistema de separação de pedidos

  async NotasPendentesDeSeparacao(authToken: string): Promise<
  { NUNOTA: number; CODPARC: number; NUMNOTA: number; STATUSNOTA: string; STATUSCONFERENCIA: string }[]
> {
  if (!authToken) throw new Error('authToken é obrigatório');

  const body = {
    serviceName: 'CRUDServiceProvider.loadRecords',
    requestBody: {
      dataSet: {
        rootEntity: 'CabecalhoNota',
        includePresentationFields: 'S',
        tryJoinedFields: 'S',
        offsetPage: 0,
        criteria: { expression: { $: "this.CODTIPOPER = 601" } },
        entity: [
          { path: '', fieldset: { list: 'NUNOTA,CODPARC,NUMNOTA,STATUSNOTA,STATUSCONFERENCIA' } },
          { path: 'CabecalhoConferencia', fieldset: { list: 'STATUSCONFERENCIA' } },
        ],
      },
    },
  };

  const { data } = await firstValueFrom(
    this.http.post(
      'https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json',
      body,
      { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}`, appkey: this.appKey } }
    )
  );

  if (data?.status !== '1') {
    throw new Error(data?.statusMessage || JSON.stringify(data));
  }

  const entities = data?.responseBody?.entities;
  const entityBlocks = Array.isArray(entities?.entity) ? entities.entity : entities?.entity ? [entities.entity] : [];

  // pega o bloco do path raiz (CabecalhoNota)
  const rootBlock =
    entityBlocks.find((b: any) => String(b?.path ?? b?.name ?? '') === '') ??
    entityBlocks[0];

  if (!rootBlock) return [];

  const fieldsRaw = rootBlock?.metadata?.fields?.field ?? entities?.metadata?.fields?.field ?? [];
  const fieldsArr = Array.isArray(fieldsRaw) ? fieldsRaw : [fieldsRaw];
  const fieldIndex: Record<string, string> = {};
  fieldsArr.forEach((f: any, i: number) => {
    if (f?.name) fieldIndex[String(f.name)] = `f${i}`;
  });

  const recordsRaw = rootBlock?.records ?? rootBlock?.record ?? rootBlock?.entity ?? rootBlock?.entities ?? [];
  const records = Array.isArray(recordsRaw) ? recordsRaw : recordsRaw ? [recordsRaw] : [];

  const read = (row: any, fieldName: string) => {
    const key = fieldIndex[fieldName];
    if (!key) return '';
    const v = row?.[key];
    if (v && typeof v === 'object' && '$' in v) return v.$;
    return v ?? '';
  };

  return records.map((r: any) => ({
    NUNOTA: Number(read(r, 'NUNOTA') || 0),
    CODPARC: Number(read(r, 'CODPARC') || 0),
    NUMNOTA: Number(read(r, 'NUMNOTA') || 0),
    STATUSNOTA: String(read(r, 'STATUSNOTA') || ''),
    // tenta os dois jeitos mais comuns:
    STATUSCONFERENCIA: String(
      read(r, 'STATUSCONFERENCIA') ||
      read(r, 'CabecalhoConferencia_STATUSCONFERENCIA') ||
      ''
    ),
  }));
}


  async notasPendentesConferencia(
    authToken: string,
  ): Promise<Array<{
    NUNOTA: number;
    CODPARC: number;
    NUMNOTA: number;
    STATUSNOTA: string;
    STATUSCONFERENCIA: any;
    STATUS: string | null;
  }>> {
    const getVal = (row: any, key: string, idxMap?: Record<string, string>) => {
      const direct = row?.[key];
      if (direct !== undefined) return direct?.$ ?? direct;
      const mappedKey = idxMap?.[key];
      if (mappedKey && row?.[mappedKey] !== undefined) {
        return row[mappedKey]?.$ ?? row[mappedKey];
      }
      return undefined;
    };

    const pickVal = (row: any, keys: string[], idxMap?: Record<string, string>) => {
      for (const k of keys) {
        const v = getVal(row, k, idxMap);
        if (v !== undefined && v !== null) return v;
      }
      return undefined;
    };

    const body = {
      serviceName: 'CRUDServiceProvider.loadRecords',
      requestBody: {
        dataSet: {
          rootEntity: 'CabecalhoNota',
          includePresentationFields: 'S',
          offsetPage: 0,
          recordCount: -1,
          criteria: {
            expression: { $: "this.CODTIPOPER = 601 and this.STATUSNOTA = 'A'" },
          },
          entity: [
            {
              path: '',
              fieldset: {
                list: 'NUNOTA,CODPARC,NUMNOTA,STATUSNOTA,STATUSCONFERENCIA',
              },
            },
            {
              path: 'CabecalhoConferencia',
              fieldset: {
                list: 'STATUS',
              },
            },
          ],
        },
      },
    };

    const { data } = await firstValueFrom(
      this.http.post(
        'https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json',
        body,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
            appkey: this.appKey,
          },
        },
      ),
    );

    const entities = data?.responseBody?.entities;
    const fieldsMeta = entities?.metadata?.fields?.field ?? [];
    const idxMap: Record<string, string> = Object.fromEntries(
      (Array.isArray(fieldsMeta) ? fieldsMeta : [fieldsMeta]).map((f, i) => [f.name, `f${i}`]),
    );

    // fonte principal: dataSet.records (quando includePresentationFields = 'S')
    const records =
      data?.responseBody?.dataSet?.records ??
      data?.responseBody?.entities?.entity ??
      [];
    const list: any[] = Array.isArray(records) ? records : records ? [records] : [];

    if (list.length) {
      return list.map((r: any) => ({
        NUNOTA: Number(getVal(r, 'NUNOTA', idxMap) ?? 0),
        CODPARC: Number(getVal(r, 'CODPARC', idxMap) ?? 0),
        NUMNOTA: Number(getVal(r, 'NUMNOTA', idxMap) ?? 0),
        STATUSNOTA: String(getVal(r, 'STATUSNOTA', idxMap) ?? ''),
        STATUSCONFERENCIA: String(
          pickVal(
            r,
            ['STATUSCONFERENCIA', 'Conferencia_STATUSCONFERENCIA', 'CabecalhoConferencia_STATUSCONFERENCIA'],
            idxMap,
          ) ?? '',
        ),
        STATUS: pickVal(r, ['STATUS', 'CabecalhoConferencia_STATUS', 'Conferencia_STATUS'], idxMap) ?? null,
      }));
    }

    const raw = entities?.entity;
    const entitiesList: any[] = Array.isArray(raw) ? raw : raw ? [raw] : [];

    return entitiesList.map((e) => ({
      NUNOTA: Number(getVal(e, 'NUNOTA', idxMap) ?? 0),
      CODPARC: Number(getVal(e, 'CODPARC', idxMap) ?? 0),
      NUMNOTA: Number(getVal(e, 'NUMNOTA', idxMap) ?? 0),
      STATUSNOTA: String(getVal(e, 'STATUSNOTA', idxMap) ?? ''),
      STATUSCONFERENCIA: String(
        pickVal(
          e,
          ['STATUSCONFERENCIA', 'Conferencia_STATUSCONFERENCIA', 'CabecalhoConferencia_STATUSCONFERENCIA'],
          idxMap,
        ) ?? '',
      ),
      STATUS: pickVal(e, ['STATUS', 'CabecalhoConferencia_STATUS', 'Conferencia_STATUS'], idxMap) ?? null,
    }));
  }


  //#endregion


  //#region Sistemas inventario

  async getCodProduto(codBarra: number | string, authToken: string): Promise<number | null> {
    if (!authToken) throw new Error('authToken é obrigatório');

    const payload = {
      serviceName: 'CRUDServiceProvider.loadRecords',
      requestBody: {
        dataSet: {
          rootEntity: 'CodigoBarras',
          includePresentationFields: 'N',
          tryJoinedFields: 'S',
          offsetPage: '0',
          criteria: {
            expression: { $: 'this.CODBARRA = ?' },
            // CODBARRA costuma ser string (pode ter zero à esquerda)
            parameter: [{ $: String(codBarra), type: 'S' }],
          },
          entity: [
            {
              path: '',
              fieldset: {
                list: 'CODPROD',
              },
            },
          ],
        },
      },
    };

    try {
      const response = await firstValueFrom(
        this.http.post(this.queryUrl, payload, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
            appkey: this.appKey,
          },
        }),
      );

      // valida status do Sankhya (quando existe)
      const status = response?.data?.status;
      if (status && status !== '1') {
        const msg =
          response?.data?.statusMessage ||
          response?.data?.responseBody?.errorMessage ||
          JSON.stringify(response?.data);
        throw new Error(`Sankhya loadRecords falhou: ${msg}`);
      }

      const entities = response.data?.responseBody?.entities;
      if (!entities) return null;

      const raw = entities?.entity;
      const list: any[] = Array.isArray(raw) ? raw : raw ? [raw] : [];
      if (list.length === 0) return null;

      // Como o fieldset é só 'CODPROD', ele normalmente vira f0
      const codProdRaw = list[0]?.f0?.$ ?? null;
      if (codProdRaw === null || codProdRaw === undefined || codProdRaw === '') return null;

      const codProd = Number(codProdRaw);
      return Number.isFinite(codProd) ? codProd : null;
    } catch (error: any) {
      console.error('Erro ao buscar CODPROD por CODBARRA:', error.response?.data || error.message);
      throw error;
    }
  }


  async getProdutoLoc(codProd: number, authToken: string): Promise<Record<string, any> | null> {
    const payload = {
      serviceName: 'CRUDServiceProvider.loadRecords',
      requestBody: {
        dataSet: {
          rootEntity: 'Produto',
          includePresentationFields: 'N',
          tryJoinedFields: 'S',
          offsetPage: '0',
          criteria: {
            expression: { $: 'this.CODPROD = ?' },
            parameter: [{ $: codProd.toString(), type: 'I' }],
          },
          entity: [
            {
              path: '',
              fieldset: {
                list: 'CODPROD,DESCRPROD,MARCA,CARACTERISTICAS,CODVOL,CODGRUPOPROD,LOCALIZACAO,REFERENCIA,AD_LOCALIZACAO,AD_QTDMAX',
              },
            },
            {
              path: 'GrupoProduto',
              fieldset: { list: 'DESCRGRUPOPROD' },
            },
          ],
        },
      },
    };

    try {
      const response = await firstValueFrom(
        this.http.post(this.queryUrl, payload, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
            appkey: this.appKey,
          },
        }),
      );

      const entities = response.data?.responseBody?.entities;
      if (!entities) return null;

      const fields = entities?.metadata?.fields?.field;
      const arrFields = Array.isArray(fields) ? fields : fields ? [fields] : [];

      // pega entidade (só uma neste caso)
      const raw = entities?.entity;
      const list: any[] = Array.isArray(raw) ? raw : raw ? [raw] : [];
      if (list.length === 0) return null;

      const e = list[0];

      // monta objeto usando os nomes do metadata
      const result: Record<string, any> = {};
      arrFields.forEach((f: any, i: number) => {
        const key = f.name; // nome oficial do campo
        result[key] = e?.[`f${i}`]?.$ ?? null;
      });

      return result;
    } catch (error: any) {
      console.error('Erro ao buscar produto:', error.response?.data || error.message);
      throw error;
    }
  }

  async criarCodigoBarras(codBarra: number, codProd: number, authToken: string) {
    console.log("sankhyaservice/codBarra: " + codBarra)
    console.log("sankhyaservice/codProd: " + codProd)
    if (!authToken?.trim()) throw new Error('authToken é obrigatório');
    //if (!Number.isFinite(codBarra))  throw new Error('codBarra é obrigatório');
    if (!Number.isFinite(codProd)) throw new Error('codProd inválido');
    
    const url =
      'https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=DatasetSP.save&outputType=json';

    const body = {
      serviceName: 'DatasetSP.save',
      requestBody: {
        entityName: 'CodigoBarras',
        standAlone: false,
        fields: ['CODBARRA', 'CODPROD'],
        records: [
          {
            // normalmente CODBARRA é a PK
            pk: { CODBARRA: codBarra },
            // valores na mesma ordem de "fields"
            values: {
              0: codBarra,
              1: codProd,
            },
          },
        ],
      },
    };

    const { data } = await firstValueFrom(
      this.http.post(url, body, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
          appkey: this.appKey,
        },
      }),
    );

    if (data?.status !== '1') {
      const msg =
        data?.statusMessage ||
        data?.responseBody?.errorMessage ||
        JSON.stringify(data);
      throw new Error(`Falha ao criar CodigoBarras: ${msg}`);
    }

    return data;
  }

  async updateLocation(codProd: number, localizacao: string, authToken: string) {
    const url =
      'https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=DatasetSP.save&outputType=json';

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    };

    const body = {
      serviceName: 'DatasetSP.save',
      requestBody: {
        entityName: 'Produto',
        standAlone: false,
        fields: ['CODPROD', 'LOCALIZACAO'],
        records: [
          {
            pk: { CODPROD: codProd },
            values: { 1: localizacao }, // equivalente ao { 1: "S" }
          },
        ],
      },
    };

    const { data } = await firstValueFrom(this.http.post(url, body, { headers }));
    return data;
  }

  async updateLocation2(codProd: number, localizacao: string, authToken: string) {
    const url =
      'https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=DatasetSP.save&outputType=json';

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    };

    const body = {
      serviceName: 'DatasetSP.save',
      requestBody: {
        entityName: 'Produto',
        standAlone: false,
        fields: ['CODPROD', 'AD_LOCALIZACAO'],
        records: [
          {
            pk: { CODPROD: codProd },
            values: { 1: localizacao }, // equivalente ao { 1: "S" }
          },
        ],
      },
    };

    const { data } = await firstValueFrom(this.http.post(url, body, { headers }));
    return data;
  }

  async updateQtdMax(codProd: number, quantidade: number, authToken: string) {
    const url =
      'https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=DatasetSP.save&outputType=json';

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    };

    const body = {
      serviceName: 'DatasetSP.save',
      requestBody: {
        entityName: 'Produto',
        standAlone: false,
        fields: ['CODPROD', 'AD_QTDMAX'],
        records: [
          {
            pk: { CODPROD: codProd },
            values: {
              CODPROD: codProd,
              AD_QTDMAX: quantidade,
            },
          },
        ],
      },
    };

    const { data } = await firstValueFrom(this.http.post(url, body, { headers }));
    return data;
  }

  async getEstoqueFront(codProd: number, bearerToken: string): Promise<EstoqueLinha[]> {
    const payload = {
      requestBody: {
        dataSet: {
          rootEntity: 'Estoque',
          includePresentationFields: 'S',
          // Se quiser habilitar joins para pegar campos apresentados como descrições:
          // tryJoinedFields: 'true',
          offsetPage: '0',
          recordCount: '100',
          criteria: {
            expression: { $: 'this.CODPROD = ? and this.CODPARC = 0' },
            parameter: [{ $: String(codProd), type: 'I' }],
          },
          entity: {
            fieldset: {
              // Dica: para também trazer a descrição do local, use:
              // list: 'CODLOCAL,LocalFinanceiro_DESCRLOCAL,ESTOQUE,RESERVADO'
              list: 'CODLOCAL,ESTOQUE,RESERVADO',
            },
          },
        },
      },
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${bearerToken}`,
      // appkey: this.appKey, // se sua instância exigir
    };

    const { data } = await firstValueFrom(
      this.http.post(this.queryUrl, payload, { headers }),
    );

    const entities = data?.responseBody?.entities;
    if (!entities) return [];

    // metadata -> nomes dos campos
    const fieldsMeta = entities?.metadata?.fields?.field;
    const fieldsArr = Array.isArray(fieldsMeta) ? fieldsMeta : fieldsMeta ? [fieldsMeta] : [];

    // linhas -> podem vir como objeto único
    const raw = entities?.entity;
    const rows: any[] = Array.isArray(raw) ? raw : raw ? [raw] : [];

    const resultado: EstoqueLinha[] = rows.map((row: any) => {
      const obj: Record<string, any> = {};

      fieldsArr.forEach((f: any, i: number) => {
        const nome = f.name as string;   // ex.: 'CODLOCAL', 'ESTOQUE', 'RESERVADO', ...
        obj[nome] = row?.[`f${i}`]?.$ ?? null;
      });

      // normalizações numéricas
      const CODLOCAL = obj.CODLOCAL != null ? Number(obj.CODLOCAL) : null;
      const ESTOQUE = obj.ESTOQUE != null ? Number(obj.ESTOQUE) : 0;
      const RESERVADO = obj.RESERVADO != null ? Number(obj.RESERVADO) : 0;

      return {
        ...obj, // mantém eventuais campos de apresentação
        CODLOCAL,
        ESTOQUE,
        RESERVADO,
        DISPONIVEL: ESTOQUE - RESERVADO,
      } as EstoqueLinha;
    });

    return resultado;
  }

  async getNotasCanceladasPorData(date: string, token: string) {
    // espera "30/10/2025" (dd/MM/yyyy)
    const url =
      'https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json';

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    const body = {
      serviceName: 'CRUDServiceProvider.loadRecords',
      requestBody: {
        dataSet: {
          rootEntity: 'NotaCancelada',
          includePresentationFields: 'N',
          metadata: 'S',
          offsetPage: '0',
          pageSize: '50', // pode aumentar se quiser mais notas
          criteria: {
            // no Sankhya precisa formatar como TO_DATE
            expression: {
              $: "this.DTNEG = TO_DATE(?, 'DD/MM/YYYY')",
            },
            parameter: [{ $: date, type: 'S' }],
          },
          entity: {
            fieldset: {
              list: 'NUNOTA,DTNEG,VLRNOTA,AD_INFIDELIMAX,DTCANC',
            },
          },
        },
      },
    };

    const resp = await firstValueFrom(
      this.http.post(url, body, { headers }),
    );

    if (resp?.data?.status !== '1') {
      const msg =
        resp?.data?.statusMessage ||
        resp?.data?.responseBody?.errorMessage ||
        JSON.stringify(resp?.data);
      throw new Error(`Falha ao buscar notas canceladas: ${msg}`);
    }

    const entities = resp.data?.responseBody?.entities;
    if (!entities) return [];

    // mapeia metadata -> f0, f1, ...
    const fields = entities?.metadata?.fields?.field;
    const arrFields = Array.isArray(fields) ? fields : fields ? [fields] : [];
    const idxByName: Record<string, string> = Object.fromEntries(
      arrFields.map((f: any, i: number) => [f.name, `f${i}`]),
    );

    const raw = entities?.entity;
    const rows = Array.isArray(raw) ? raw : raw ? [raw] : [];

    return rows.map((row: any) => {
      const get = (name: string) => {
        const key = idxByName[name];
        return key ? row?.[key]?.$ ?? null : null;
      };

      return {
        nunota: Number(get('NUNOTA')),
        dtneg: get('DTNEG'),
        vlrnota: Number(get('VLRNOTA')),
        ad_infidelimax: get('AD_INFIDELIMAX'),
        dtcanc: get('DTCANC'),
      };
    });
  }

  async incluirAjusteNegativo(diference: number, codProd: number, authToken: string) {
    const url =
      'https://api.sankhya.com.br/gateway/v1/mgecom/service.sbr?serviceName=CACSP.incluirNota&outputType=json';

    // Mesmos headers do cURL (sem "Bearer")
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    };

    // Corpo igual ao cURL, alterando apenas CODPROD e QTDNEG
    const body = {
      serviceName: 'CACSP.incluirNota',
      requestBody: {
        nota: {
          cabecalho: {
            NUNOTA: {},
            CODPARC: { $: '1' },
            DTNEG: { $: format(subHours(new Date(), 3), 'dd/MM/yyyy HH:mm') },
            CODTIPOPER: { $: '317' },
            CODTIPVENDA: { $: '27' },
            CODVEND: { $: '0' },
            CODEMP: { $: '1' },
            TIPMOV: { $: 'P' },
            OBSERVACAO: { $: 'Ajuste realizado por API p/ Ajuste de inventário' },
            CODUSUINC: { $: '81' }
          },
          itens: {
            INFORMARPRECO: 'False',
            item: [
              {
                NUNOTA: {},
                SEQUENCIA: {},
                CODPROD: { $: `${codProd}` },
                QTDNEG: { $: `${diference}` }
              },
            ],
          },
        },
      },
    };

    const resp = await firstValueFrom(this.http.post(url, body, { headers }));
    return resp.data; // traz status, statusMessage, transactionId
  }

  async incluirAjustePositivo(diference: number, codProd: number, authToken: string) {
    const url =
      'https://api.sankhya.com.br/gateway/v1/mgecom/service.sbr?serviceName=CACSP.incluirNota&outputType=json';

    // Mesmos headers do cURL (sem "Bearer")
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    };

    // Corpo igual ao cURL, alterando apenas CODPROD e QTDNEG
    const body = {
      serviceName: 'CACSP.incluirNota',
      requestBody: {
        nota: {
          cabecalho: {
            NUNOTA: {},
            CODPARC: { $: '1' },
            DTNEG: { $: format(subHours(new Date(), 3), 'dd/MM/yyyy HH:mm') },
            CODTIPOPER: { $: '270' },
            CODTIPVENDA: { $: '27' },
            CODVEND: { $: '0' },
            CODEMP: { $: '1' },
            TIPMOV: { $: 'O' },
            OBSERVACAO: { $: 'Ajuste realizado por API p/ Ajuste de inventário' },
            CODUSUINC: { $: '81' }
          },
          itens: {
            INFORMARPRECO: 'False',
            item: [
              {
                NUNOTA: {},
                SEQUENCIA: {},
                CODPROD: { $: `${codProd}` },
                QTDNEG: { $: `${diference}` }
              },
            ],
          },
        },
      },
    };

    const resp = await firstValueFrom(this.http.post(url, body, { headers }));
    return resp.data; // traz status, statusMessage, transactionId
  }


  async incluirAjustesPositivo(itens: AjusteItem[], authToken: string) {
    const url =
      'https://api.sankhya.com.br/gateway/v1/mgecom/service.sbr?serviceName=CACSP.incluirNota&outputType=json';

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    };

    const itensValidos = (itens ?? [])
      .filter(i => i?.codProd && i?.diference != null)
      .map(i => ({
        codProd: i.codProd,
        diference: Number(i.diference),
      }))
      .filter(i => Number.isFinite(i.diference) && i.diference > 0);

    if (itensValidos.length === 0) {
      throw new HttpException('Nenhum item válido para incluir na nota.', HttpStatus.BAD_REQUEST);
    }

    const items = itensValidos.map((i, idx) => ({
      NUNOTA: {},
      SEQUENCIA: {}, // ou { $: String(idx + 1) }
      CODPROD: { $: String(i.codProd) },
      QTDNEG: { $: String(i.diference) },
    }));

    const body = {
      serviceName: 'CACSP.incluirNota',
      requestBody: {
        nota: {
          cabecalho: {
            NUNOTA: {},
            CODPARC: { $: '1' },
            DTNEG: { $: format(subHours(new Date(), 3), 'dd/MM/yyyy HH:mm') },
            CODTIPOPER: { $: '270' },
            CODTIPVENDA: { $: '27' },
            CODVEND: { $: '0' },
            CODEMP: { $: '1' },
            TIPMOV: { $: 'O' },
            OBSERVACAO: { $: 'Ajuste realizado por API p/ Ajuste de inventário | TESTE NOTA POSITIVA' },
            CODUSUINC: { $: '81' },
          },
          itens: {
            INFORMARPRECO: 'False',
            item: items,
          },
        },
      },
    };

    try {
      const resp = await firstValueFrom(this.http.post(url, body, { headers }));
      const data = resp?.data;

      // Erro "aplicacional" do Sankhya (vem 200 mas status=0)
      if (data?.status === '0') {
        const cod = data?.tsError?.tsErrorCode ? ` (${data.tsError.tsErrorCode})` : '';
        const msg = data?.statusMessage || 'Erro desconhecido retornado pelo Sankhya.';
        throw new HttpException(`ERRO NO LANÇAMENTO DA NOTA${cod}: ${msg}`, HttpStatus.BAD_REQUEST);
      }
      
  
      return data; // ou return resp; se você realmente precisa do response inteiro
    } catch (err: any) {
      // Erro HTTP/Axios (401, 403, 500, timeout etc)
      const status = err?.response?.status ?? HttpStatus.BAD_GATEWAY;
      const sankhyaData = err?.response?.data;

      // Se o Sankhya devolveu um body com statusMessage, aproveita
      const msg =
        sankhyaData?.statusMessage ||
        sankhyaData?.message ||
        err?.message ||
        'Falha ao chamar o serviço do Sankhya.';

      const cod = sankhyaData?.tsError?.tsErrorCode ? ` (${sankhyaData.tsError.tsErrorCode})` : '';

      throw new HttpException(`ERRO NA REQUISIÇÃO${cod}: ${msg}`, status);
    }
  }

  async incluirAjustesNegativo(itens: AjusteItem[], authToken: string) {
    const url =
      'https://api.sankhya.com.br/gateway/v1/mgecom/service.sbr?serviceName=CACSP.incluirNota&outputType=json';

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    };

    const itensValidos = (itens ?? [])
      .filter(i => i?.codProd && i?.diference != null)
      .map(i => ({
        codProd: i.codProd,
        diference: Number(i.diference),
      }))
      .filter(i => Number.isFinite(i.diference) && i.diference < 0);

    if (itensValidos.length === 0) {
      throw new HttpException('Nenhum item válido para incluir na nota.', HttpStatus.BAD_REQUEST);
    }

    const items = itensValidos.map((i, idx) => ({
      NUNOTA: {},
      SEQUENCIA: {}, // ou { $: String(idx + 1) }
      CODPROD: { $: String(i.codProd) },
      QTDNEG: { $: String(i.diference*-1) },
    }));

    const body = {
      serviceName: 'CACSP.incluirNota',
      requestBody: {
        nota: {
          cabecalho: {
            NUNOTA: {},
            CODPARC: { $: '1' },
            DTNEG: { $: format(subHours(new Date(), 3), 'dd/MM/yyyy HH:mm') },
            CODTIPOPER: { $: '317' },
            CODTIPVENDA: { $: '27' },
            CODVEND: { $: '0' },
            CODEMP: { $: '1' },
            TIPMOV: { $: 'P' },
            OBSERVACAO: { $: 'Ajuste realizado por API p/ Ajuste de inventário | TESTE NOTA NEGATIVA' },
            CODUSUINC: { $: '81' },
          },
          itens: {
            INFORMARPRECO: 'False',
            item: items,
          },
        },
      },
    };

    try {
      const resp = await firstValueFrom(this.http.post(url, body, { headers }));
      const data = resp?.data;

      // Erro "aplicacional" do Sankhya (vem 200 mas status=0)
      if (data?.status === '0') {
        const cod = data?.tsError?.tsErrorCode ? ` (${data.tsError.tsErrorCode})` : '';
        const msg = data?.statusMessage || 'Erro desconhecido retornado pelo Sankhya.';
        throw new HttpException(`ERRO NO LANÇAMENTO DA NOTA${cod}: ${msg}`, HttpStatus.BAD_REQUEST);
      }


      return data; // ou return resp; se você realmente precisa do response inteiro
    } catch (err: any) {
      // Erro HTTP/Axios (401, 403, 500, timeout etc)
      const status = err?.response?.status ?? HttpStatus.BAD_GATEWAY;
      const sankhyaData = err?.response?.data;

      // Se o Sankhya devolveu um body com statusMessage, aproveita
      const msg =
        sankhyaData?.statusMessage ||
        sankhyaData?.message ||
        err?.message ||
        'Falha ao chamar o serviço do Sankhya.';

      const cod = sankhyaData?.tsError?.tsErrorCode ? ` (${sankhyaData.tsError.tsErrorCode})` : '';

      throw new HttpException(`ERRO NA REQUISIÇÃO${cod}: ${msg}`, status);
    }
  }

  async aprovarSolicitacao( codProd: number,  diference: number, authToken: string) {
    const url =
      'https://api.sankhya.com.br/gateway/v1/mgecom/service.sbr?serviceName=CACSP.incluirNota&outputType=json';

    // Mesmos headers do cURL (sem "Bearer")
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    };

    // Corpo igual ao cURL, alterando apenas CODPROD e QTDNEG
    const body = {
      serviceName: 'CACSP.incluirNota',
      requestBody: {
        nota: {
          cabecalho: {
            NUNOTA: {},
            CODPARC: { $: '1' },
            DTNEG: { $: format(subHours(new Date(), 3), 'dd/MM/yyyy HH:mm') },
            CODTIPOPER: { $: '317' },
            CODTIPVENDA: { $: '27' },
            CODVEND: { $: '0' },
            CODEMP: { $: '1' },
            TIPMOV: { $: 'P' },
            OBSERVACAO: { $: 'Ajuste realizado por API p/ Ajuste de inventário' },
            CODUSUINC: { $: '81' }
          },
          itens: {
            INFORMARPRECO: 'False',
            item: [
              {
                NUNOTA: {},
                SEQUENCIA: {},
                CODPROD: { $: `${codProd}` },
                QTDNEG: { $: `${diference}` }
              },
            ],
          },
        },
      },
    };

    const resp = await firstValueFrom(this.http.post(url, body, { headers }));
    return resp.data; // traz status, statusMessage, transactionId
  }


  async incluirItemNaNota(params: {
    nunota: number;
    codProd: number;
    qtdNeg: number;
    authToken: string;

    codVol?: string;
    vlrUnit?: number;
    vlrDesc?: number;
    percDesc?: number;
  }) {
    const url =
      'https://api.sankhya.com.br/gateway/v1/mgecom/service.sbr?serviceName=CACSP.incluirAlterarItemNota&outputType=json';

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${params.authToken}`,
    };

    // ✅ usa CODVOL informado; se não vier, busca o padrão do produto
    const codVolFinal =
      params.codVol ?? (await this.resolverCodVolPadrao(params.codProd, params.authToken));

    const vlrUnit = params.vlrUnit ?? 0;
    const vlrTot = +(params.qtdNeg * vlrUnit).toFixed(2);

    const body = {
      serviceName: 'CACSP.incluirAlterarItemNota',
      requestBody: {
        nota: {
          NUNOTA: String(params.nunota),
          itens: {
            item: {
              CODPROD: { $: String(params.codProd) },
              NUNOTA: { $: String(params.nunota) },

              SEQUENCIA: { $: '' },
              QTDNEG: { $: String(params.qtdNeg) },

              // ✅ agora sempre vai
              CODVOL: { $: String(codVolFinal) },

              CODLOCALORIG: { $: String(1100) },

              VLRUNIT: { $: String(vlrUnit) },
              VLRTOT: { $: String(vlrTot) },

              VLRDESC: { $: String(params.vlrDesc ?? 0) },
              PERCDESC: { $: String(params.percDesc ?? 0) },
            },
          },
        },
      },
    };

    const resp = await firstValueFrom(this.http.post(url, body, { headers }));
    return resp.data;
  }

  async cadastarCodBarras(codBarras: number, codProduto: number, token : string){
  
  }

  //#endregion


  //#endregion

  //#region imagens, para puxar imagem: https://danilo.nuvemdatacom.com.br:9092/mge/Produto@IMAGEM@CODPROD=33.dbimage    OBS: ${CODPROD} = CODIGO DO PRODUTO PRA PUXAR IMAGEM

  async downloadImage(url: string): Promise<Buffer> {
    const response = await firstValueFrom(
      this.http.get(url, { responseType: 'arraybuffer' }),
    );
    return Buffer.from(response.data);
  }

  async uploadToCloudinary(buffer: Buffer, publicId?: string): Promise<string> {
    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        { resource_type: 'image', public_id: publicId, overwrite: true },
        (error, result) => {
          if (error || !result) {
            return reject(error || new Error('Upload result is undefined.'));
          }
          resolve(result.secure_url);
        },
      ).end(buffer);
    });
  }

  async processImageFromUrl(url: string, publicId?: string): Promise<string> {
    const imageBuffer = await this.downloadImage(url);
    return this.uploadToCloudinary(imageBuffer, publicId);
  }

  //#endregion

  //#region fidelimax

  async getNota(token: string) { // inverter o ad_infidelimax = 'S' dentro do where para 'is null'
    const url =
      'https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json';

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    const body = {
      serviceName: 'CRUDServiceProvider.loadRecords',
      requestBody: {
        dataSet: {
          rootEntity: 'CabecalhoNota',
          includePresentationFields: 'N',
          metadata: 'S',
          tryJoinedFields: 'false',
          offsetPage: '0',
          criteria: {
            expression: {
              $: `
                this.CODTIPOPER IN (700,701,326)
                AND this.CODPARC <> 111111
                AND this.CODEMP = 1
                AND (this.AD_INFIDELIMAX IS NULL OR this.AD_INFIDELIMAX != 'S')
                AND this.STATUSNFE = ?
                AND this.DTFATUR IS NOT NULL
                AND this.DTFATUR >= TO_DATE('01/11/2025','DD/MM/YYYY')
                AND this.DTFATUR <= (SYSDATE - 1)
                `.replace(/\s+/g, ' ').trim(),
            },
            parameter: [
              { $: 'A', type: 'S' },   // STATUSNFE
            ],
          },
          entity: [
            {
              path: '',
              fieldset: {
                list: 'NUNOTA,CODTIPOPER,DTNEG,CODPARC,STATUSNFE,VLRNOTA,CODVEND,CODVENDTEC,AD_INFIDELIMAX',
              },
            },
            {
              // JOIN no Vendedor via CODVEND
              path: 'Vendedor',
              fieldset: {
                // traga ao menos AD_TIPOTECNICO; pode adicionar outros (APELIDO, etc.)
                list: 'AD_TIPOTECNICO',
              },
            },
          ],
        },
      },
    };

    const resp = await firstValueFrom(this.http.post(url, body, { headers }));

    if (resp?.data?.status !== '1') {
      const msg =
        resp?.data?.responseBody?.errorMessage ||
        resp?.data?.serviceMessage ||
        JSON.stringify(resp?.data);
      throw new Error(`Falha no loadRecords: ${msg}`);
    }

    const entities = resp.data.responseBody?.entities;

    // --- helpers ---
    const asArray = (x: any) => (Array.isArray(x) ? x : x ? [x] : []);
    const rawFields = asArray(entities?.metadata?.fields?.field);
    const rawRows = asArray(entities?.entity);

    // trata {} como null e extrai $ quando existir
    const val = (o: any) => {
      if (o && typeof o === 'object') {
        if ('$' in o) return o.$;
        if (Object.keys(o).length === 0) return null;
      }
      return o ?? null;
    };
    const toNumOrNull = (v: any) => (v === null || v === '' ? null : Number(v));

    // nomes dos campos na ordem de f0..fN
    const fieldNames: string[] = rawFields.map((f: any) => f.name);

    // converte {f0..fN} -> {NOME_CAMPO: valor}
    const rowToNamed = (row: any) => {
      const obj: Record<string, any> = {};
      fieldNames.forEach((name, i) => {
        obj[name] = val(row?.[`f${i}`]);
      });
      return obj;
    };
    

    const rowsNamed = rawRows.map(rowToNamed);

    // mapeia para o formato final (com AD_TIPOTECNICO do vendedor)
    const parsed = rowsNamed.map(r => ({
      NUNOTA: toNumOrNull(r.NUNOTA) ?? 0,
      CODTIPOPER: toNumOrNull(r.CODTIPOPER) ?? 0,
      DTNEG: r.DTNEG ?? null,
      CODPARC: toNumOrNull(r.CODPARC) ?? 0,
      STATUSNFE: r.STATUSNFE ?? null,
      VLRNOTA: toNumOrNull(r.VLRNOTA) ?? 0,
      CODVEND: toNumOrNull(r.CODVEND),
      CODVENDTEC: toNumOrNull(r.CODVENDTEC),

      // campo trazido pelo join em Vendedor:
      VENDEDOR_AD_TIPOTECNICO: toNumOrNull(r['Vendedor_AD_TIPOTECNICO']),
    }));

    return parsed;
  }

  async getNotasStatusConferenciaA(token: string): Promise<{ NUNOTA: number; STATUSCONFERENCIA: string }[]> {
    const url = 'https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json';

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    const body = {
      serviceName: 'CRUDServiceProvider.loadRecords',
      requestBody: {
        dataSet: {
          rootEntity: 'CabecalhoNota', // TGFCAB
          includePresentationFields: 'S', // ✅ importante para trazer STATUSCONFERENCIA
          metadata: 'S',
          tryJoinedFields: 'false',
          offsetPage: 0,
          recordCount: -1,
          criteria: {
            expression: {
              $: `
                this.STATUSCONFERENCIA LIKE 'A%'
              `.replace(/\s+/g, ' ').trim(),
            },
          },
          entity: {
            fieldset: {
              list: 'NUNOTA,STATUSCONFERENCIA',
            },
          },
        },
      },
    };

    const resp = await firstValueFrom(this.http.post(url, body, { headers }));

    if (resp?.data?.status !== '1') {
      const msg =
        resp?.data?.responseBody?.errorMessage ||
        resp?.data?.serviceMessage ||
        JSON.stringify(resp?.data);
      throw new Error(`Falha no loadRecords: ${msg}`);
    }

    const entities = resp.data.responseBody?.entities;

    // --- helpers (mesma ideia do teu getNota) ---
    const asArray = (x: any) => (Array.isArray(x) ? x : x ? [x] : []);
    const rawFields = asArray(entities?.metadata?.fields?.field);
    const rawRows = asArray(entities?.entity);

    const val = (o: any) => {
      if (o && typeof o === 'object') {
        if ('$' in o) return o.$;
        if (Object.keys(o).length === 0) return null;
      }
      return o ?? null;
    };

    const toNum = (v: any) => Number(val(v));

    const fieldNames: string[] = rawFields.map((f: any) => f.name);

    const rowToNamed = (row: any) => {
      const obj: Record<string, any> = {};
      fieldNames.forEach((name, i) => {
        obj[name] = val(row?.[`f${i}`]);
      });
      return obj;
    };

    const rowsNamed = rawRows.map(rowToNamed);

    return rowsNamed.map((r: any) => ({
      NUNOTA: toNum(r.NUNOTA),
      STATUSCONFERENCIA: String(r.STATUSCONFERENCIA ?? ''),
    }));
  }


  async getNotaDevol(token: string) { // inverter o ad_infidelimax = 'S' dentro do where para 'is null'
    const url =
      'https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json';

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    const body = {
      serviceName: 'CRUDServiceProvider.loadRecords',
      requestBody: {
        dataSet: {
          rootEntity: 'CabecalhoNota',
          includePresentationFields: 'N',
          metadata: 'S',
          tryJoinedFields: 'false',
          offsetPage: '0',
          criteria: {
            expression: {
              $: `
              this.CODTIPOPER IN (800,801)
              AND this.CODPARC <> 111111
              AND this.CODEMP = 1
              AND (this.AD_INFIDELIMAX IS NULL OR this.AD_INFIDELIMAX != 'S')
              AND this.STATUSNFE = ?
              AND this.DTFATUR IS NOT NULL
              AND this.DTFATUR >= TO_DATE('01/11/2025','DD/MM/YYYY')
              AND this.DTFATUR <= (SYSDATE - 1)
            `.replace(/\s+/g, ' ').trim(),
            },
            parameter: [
              { $: 'A', type: 'S' },
            ],
          },
          entity: [
            {
              path: '',
              fieldset: {
                list: 'NUNOTA,CODTIPOPER,DTNEG,CODPARC,STATUSNFE,VLRNOTA,CODVEND,CODVENDTEC,AD_INFIDELIMAX',
              },
            },
            {
              // JOIN no Vendedor via CODVEND
              path: 'Vendedor',
              fieldset: {
                // traga ao menos AD_TIPOTECNICO; pode adicionar outros (APELIDO, etc.)
                list: 'AD_TIPOTECNICO',
              },
            },
          ],
        },
      },
    };

    const resp = await firstValueFrom(this.http.post(url, body, { headers }));

    if (resp?.data?.status !== '1') {
      const msg =
        resp?.data?.responseBody?.errorMessage ||
        resp?.data?.serviceMessage ||
        JSON.stringify(resp?.data);
      throw new Error(`Falha no loadRecords: ${msg}`);
    }

    const entities = resp.data.responseBody?.entities;

    // --- helpers ---
    const asArray = (x: any) => (Array.isArray(x) ? x : x ? [x] : []);
    const rawFields = asArray(entities?.metadata?.fields?.field);
    const rawRows = asArray(entities?.entity);

    // trata {} como null e extrai $ quando existir
    const val = (o: any) => {
      if (o && typeof o === 'object') {
        if ('$' in o) return o.$;
        if (Object.keys(o).length === 0) return null;
      }
      return o ?? null;
    };
    const toNumOrNull = (v: any) => (v === null || v === '' ? null : Number(v));

    // nomes dos campos na ordem de f0..fN
    const fieldNames: string[] = rawFields.map((f: any) => f.name);

    // converte {f0..fN} -> {NOME_CAMPO: valor}
    const rowToNamed = (row: any) => {
      const obj: Record<string, any> = {};
      fieldNames.forEach((name, i) => {
        obj[name] = val(row?.[`f${i}`]);
      });
      return obj;
    };

    const rowsNamed = rawRows.map(rowToNamed);

    // mapeia para o formato final (com AD_TIPOTECNICO do vendedor)
    const parsed = rowsNamed.map(r => ({
      NUNOTA: toNumOrNull(r.NUNOTA) ?? 0,
      CODTIPOPER: toNumOrNull(r.CODTIPOPER) ?? 0,
      DTNEG: r.DTNEG ?? null,
      CODPARC: toNumOrNull(r.CODPARC) ?? 0,
      STATUSNFE: r.STATUSNFE ?? null,
      VLRNOTA: toNumOrNull(r.VLRNOTA) ?? 0,
      CODVEND: toNumOrNull(r.CODVEND),
      CODVENDTEC: toNumOrNull(r.CODVENDTEC),

      // campo trazido pelo join em Vendedor:
      VENDEDOR_AD_TIPOTECNICO: toNumOrNull(r['Vendedor_AD_TIPOTECNICO']),
    }));

    return parsed;
  }

  async inFidelimaxNoteCheck(nunota, token) {
    const url =
      'https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=DatasetSP.save&outputType=json';

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    const body = {
      serviceName: 'CRUDServiceProvider.saveRecord',
      requestBody: {
        entityName: 'CabecalhoNota',
        standAlone: false,
        fields: ['NUNOTA', 'AD_INFIDELIMAX'],
        records: [
          {
            pk: { NUNOTA: nunota },
            values: {
              1: 'S'
            },
          },
        ],
      },
    };
    const { data } = await firstValueFrom(this.http.post(url, body, { headers }));
    return data
  }

  async getCPFwithCodParc(codParc: number, token: string) {
    const url =
      'https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json';
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    };
    const body = {
      serviceName: 'CRUDServiceProvider.loadRecords',
      requestBody: {
        dataSet: {
          rootEntity: 'Parceiro',
          includePresentationFields: 'N',
          offsetPage: '0',
          criteria: {
            expression: { $: `this.CODPARC = ${codParc}` },
          },
          entity: { fieldset: { list: 'CGC_CPF,NOMEPARC' } }
        }
      }
    };

    const { data } = await firstValueFrom(this.http.post(url, body, { headers }));
    const ent = data?.responseBody?.entities?.entity;
    const row = Array.isArray(ent) ? ent[0] : ent;


    const cpf = data.responseBody.entities.entity.f0?.$;
    const nome = data.responseBody.entities.entity.f1?.$;
    return { cpf: cpf, nome: nome };
  }

  async enderecoPorCEP(cep: string) {
    const digits = cep.replace(/\D/g, "");
    const fontes = [
      (c: string) => fetch(`https://viacep.com.br/ws/${c}/json/`),
    ];
    let data: any;
    for (const fonte of fontes) {
      const r = await fonte(digits);
      if (r.ok) { data = await r.json(); if (!data.erro) break; }
    }
    if (!data) throw new Error("CEP não encontrado");

    // Normalizações úteis para evitar falhas no Sankhya
    const logradouro = (data.street || data.logradouro || "").trim();
    const bairroRaw = (data.neighborhood || data.bairro || "").trim();

    // Alguns CEPs não têm bairro — trate conforme sua regra de negócio
    const bairro = bairroRaw || "Centro"; // ou deixe vazio se o seu layout permitir

    const cidade = (data.city || data.localidade || "").trim();
    const uf = (data.state || data.uf || "").trim();

    return { logradouro, bairro, cidade, uf, cep: digits };
  }

  async getCodParcWithCPF(cpf: string, token: string): Promise<any> {
    const url =
      'https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json';

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    // Escapa aspas simples só por precaução
    const cpfSafe = cpf.replace(/'/g, "''");

    const body = {
      serviceName: 'CRUDServiceProvider.loadRecords',
      requestBody: {
        dataSet: {
          rootEntity: 'Parceiro',
          includePresentationFields: 'N',
          offsetPage: '0',
          criteria: {
            expression: { $: `this.CGC_CPF = '${cpfSafe}'` },
          },
          entity: { fieldset: { list: 'CODPARC' } },
        },
      },
    };

    try {
      const { data } = await firstValueFrom(this.http.post(url, body, { headers }));

      // Caminho defensivo: a API às vezes retorna objeto; às vezes, array.
      const entities = data?.responseBody?.entities?.entity;
      if (!entities) return null;

      const firstEntity = Array.isArray(entities) ? entities[0] : entities;

      // f0.$ é o padrão quando se pede 1 campo no fieldset
      const codparc = firstEntity?.f0?.$ ?? firstEntity?.CODPARC?.$ ?? firstEntity?.CODPARC;

      return codparc != null ? String(codparc) : null;
    } catch (err) {
      // Em erros de rede/401/etc., você pode escolher relançar ou padronizar como null
      // Aqui vamos padronizar como null para atender ao requisito.
      return null;
    }
  }

  async getVendedor(codVendTec: number | null, token: string): Promise<VendedorDTO | null> {
    const url =
      'https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json';

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    const body = {
      serviceName: 'CRUDServiceProvider.loadRecords',
      requestBody: {
        dataSet: {
          rootEntity: 'Vendedor',
          includePresentationFields: 'N',
          metadata: 'S',
          offsetPage: '0',
          criteria: {
            expression: { $: 'this.CODVEND = ?' },
            parameter: [{ $: String(codVendTec), type: 'I' }],
          },
          entity: {
            // ajuste a lista abaixo conforme os campos que você precisa
            fieldset: { list: 'CODVEND,CODPARC,APELIDO,AD_TIPOTECNICO' },
          },
        },
      },
    };

    const resp = await firstValueFrom(this.http.post(url, body, { headers }));

    // valida status do serviço
    if (resp?.data?.status !== '1') {
      const msg =
        resp?.data?.statusMessage ||
        resp?.data?.responseBody?.errorMessage ||
        JSON.stringify(resp?.data);
      throw new Error(`Falha no loadRecords: ${msg}`);
    }

    // normaliza metadata e rows
    const entities = resp.data?.responseBody?.entities;
    const fields = entities?.metadata?.fields?.field;
    const arrFields = Array.isArray(fields) ? fields : fields ? [fields] : [];
    const idxByName: Record<string, string> =
      Object.fromEntries(arrFields.map((f: any, i: number) => [f.name, `f${i}`]));

    const raw = entities?.entity;
    const rows = Array.isArray(raw) ? raw : raw ? [raw] : [];
    if (!rows.length) return null;

    const row = rows[0];
    const get = (name: string) => row?.[idxByName[name]]?.$ ?? null;

    return {
      CODVEND: get('CODVEND'),
      CODPARC: get('CODPARC'),
      APELIDO: get('APELIDO'),
      AD_TIPOTECNICO: get('AD_TIPOTECNICO'),
    };
  }

  async atualizarStatusFidelimax(nunota, status, token: string) {
    const url =
      'https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=DatasetSP.save&outputType=json';

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    const body = {
      serviceName: 'CRUDServiceProvider.saveRecord',
      requestBody: {
        entityName: 'CabecalhoNota',
        standAlone: false,
        fields: ['NUNOTA', 'AD_INFIDELIMAX'],
        records: [
          {
            pk: { NUNOTA: nunota },
            values: { 1: status }, // equivalente ao { 1: "S" }
          },
        ],
      },
    };

    const { data } = await firstValueFrom(this.http.post(url, body, { headers }));
    return data;
  }

  async NotaCanceladaByNunota(nunota: number, token: string) {
    const url =
      'https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json';

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    // 1) Consulta com filtro por NUNOTA
    const bodyByNunota = {
      serviceName: 'CRUDServiceProvider.loadRecords',
      requestBody: {
        dataSet: {
          rootEntity: 'NotaCancelada',
          includePresentationFields: 'S',
          metadata: 'S',
          offsetPage: '0',
          // recordCount opcional; pode omitir
          criteria: {
            expression: { $: 'this.NUNOTA = ?' },
            parameter: [{ $: String(nunota), type: 'I' }], // inteiro
          },
          entity: { fieldset: { list: '*' } },
        },
      },
    };

    const resp = await firstValueFrom(this.http.post(url, bodyByNunota, { headers }));

    if (resp?.data?.status !== '1') {
      console.error('loadRecords error:', JSON.stringify(resp?.data, null, 2));
      throw new Error(resp?.data?.statusMessage || 'Falha no loadRecords');
    }

    // Normaliza metadata (objeto/array)
    const entities = resp?.data?.responseBody?.entities;
    let fields = entities?.metadata?.fields?.field;
    const rawRows = entities?.entity;
    const rows = Array.isArray(rawRows) ? rawRows : rawRows ? [rawRows] : [];

    if (!fields) {
      // 2) Fallback: sem critério, só para “forçar” o metadata
      const bodyNoCriteria = {
        serviceName: 'CRUDServiceProvider.loadRecords',
        requestBody: {
          dataSet: {
            rootEntity: 'NotaCancelada',
            includePresentationFields: 'S',
            metadata: 'S',
            offsetPage: '0',
            // sem criteria
            entity: { fieldset: { list: '*' } },
          },
        },
      };
      const respMeta = await firstValueFrom(this.http.post(url, bodyNoCriteria, { headers }));
      if (respMeta?.data?.status !== '1') {
        console.error('loadRecords (fallback) error:', JSON.stringify(respMeta?.data, null, 2));
        throw new Error(respMeta?.data?.statusMessage || 'Falha no loadRecords (fallback)');
      }
      fields = respMeta?.data?.responseBody?.entities?.metadata?.fields?.field;
    }

    // Agora “fields” pode ser objeto ou array
    const arrFields = Array.isArray(fields) ? fields : fields ? [fields] : [];

    // Loga os descritores de campo (nome, tipo, etc.)
    console.log(JSON.stringify(arrFields, null, 2));

    // Se quiser também mostrar as linhas retornadas para o NUNOTA filtrado:
    // console.log(JSON.stringify(rows, null, 2));

    // Retorna algo útil para o chamador (opcional)
    return {
      fields: arrFields,
      rows,
    };
  }

  async IncluirClienteSankhya(
    nome: string,
    mail: string,
    cpf: string,
    ddd: string | number,
    tel: string | number,
    cep: string | number,
    estado: string,
    cidade: string,
    rua: string,
    numero: string | number,
    bairro: string,
    nascimento: string,
    token: string,
  ) {
    const url = 'https://api.sankhya.com.br/v1/parceiros/clientes';

    const telefoneDdd = onlyDigits(ddd);
    const telefoneNumero = onlyDigits(tel);
    const uf = await this.convertEstadoToUF(estado);

    const headers = {
      accept: 'application/json',
      'content-type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    const body = {
      tipo: 'PF',
      telefoneNumero,
      telefoneDdd,
      emailNfe: String(mail).trim(),
      razao: String(nome).trim(),
      nome: String(nome).trim(),
      dtnasc: String(nascimento).trim(),
      cnpjCpf: cpf,
      endereco: {
        logradouro: String(rua).trim(),
        numero: String(numero || 'S/N'),
        bairro: toAscii(bairro),   // <<< aqui
        cidade: toAscii(cidade),   // <<< e aqui
        cep: String(cep).trim(),
        uf,
      },
    };

    const resp = await firstValueFrom(this.http.post(url, body, { headers }));
    if (resp?.status < 200 || resp?.status >= 300) {
      throw new Error(`Falha ao criar cliente (HTTP ${resp?.status})`);
    }
    return resp.data;
  }

  //async getCodBairroWithBairro(bairroNome) {}

  async listarCidadesPorUfCodigo(
    ufNomeCid: string, // ex.: "CAMALAU - PB"
    token: string
  ): Promise<Array<{
    CODCID: number | string;
    NOMECID: string;
    UF: string | number;
    UFNOMECID: string;
    ufSigla: string;
  }>> {
    type SankhyaFieldValue = { field: string; value: any };
    type SankhyaRecord = { fieldValues: SankhyaFieldValue[] };
    type SankhyaDataSet = { records: SankhyaRecord[] };
    type SankhyaLoadResp = { responseBody?: { dataSet?: SankhyaDataSet } };

    const toObj = (rec: SankhyaRecord): Record<string, any> =>
      rec.fieldValues?.reduce((acc, fv) => ((acc[fv.field] = fv.value), acc), {}) ?? {};

    const extrairUfSigla = (s: string): string =>
      (/-\s*([A-Z]{2})\s*$/i.exec(String(s).trim())?.[1] ?? String(s).slice(-2)).toUpperCase();

    const url =
      'https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json';

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    } as const;

    // escape de aspas simples para o expression
    const literal = String(ufNomeCid).replace(/'/g, "''");

    const body = {
      serviceName: 'CRUDServiceProvider.loadRecords',
      requestBody: {
        dataSet: {
          rootEntity: 'Cidade',
          includePresentationFields: 'S',
          metadata: 'N',
          offsetPage: '1',
          tryJoinedFields: 'true',
          // compare como STRING, com aspas
          criteria: { expression: `UPPER(this.UFNOMECID) = UPPER('${literal}')` },
          entity: { fieldset: { list: 'CODCID, NOMECID, UF, UFNOMECID' } },
        },
      },
    } as const;

    const resp = await firstValueFrom(
      this.http.post<SankhyaLoadResp>(url, body, { headers })
    );

    const records = resp.data.responseBody?.dataSet?.records ?? [];

    return records.map((r) => {
      const o = toObj(r);
      const UFNOMECID = String(o.UFNOMECID ?? '');
      return {
        CODCID: o.CODCID,
        NOMECID: o.NOMECID,
        UF: o.UF,
        UFNOMECID,
        ufSigla: extrairUfSigla(UFNOMECID),
      };
    });
  }

  async atualizarCampoParceiroCampo(
    token: string,
    codParc: string | number,
    campo: string,
    valor: any,
  ) {
    const url =
      'https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=DatasetSP.save&outputType=json';

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    const body = {
      serviceName: 'DatasetSP.save',
      requestBody: {
        entityName: 'Parceiro',
        standAlone: false,
        fields: ['CODPARC', campo],
        records: [
          {
            pk: { CODPARC: String(codParc) },
            values: {
              '1': valor,
            },
          },
        ],
      },
    };

    const resp = await firstValueFrom(this.http.post(url, body, { headers }));
    return resp.data;
  }

  async convertEstadoToUF(estado: string) {
    const { data } = await firstValueFrom(
      this.http.get('https://servicodados.ibge.gov.br/api/v1/localidades/estados'),
    );

    if (!Array.isArray(data)) return ' ';
    return (data.find((e: any) => e.nome === estado)?.sigla) ?? ' ';
  }

  async incluirNotaPremio(produto: string, qtdNeg: string, codParc: string, authToken: string) {
    const url =
      'https://api.sankhya.com.br/gateway/v1/mgecom/service.sbr?serviceName=CACSP.incluirNota&outputType=json';

    // Mesmos headers do cURL (sem "Bearer")
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    };

    // Corpo igual ao cURL, alterando apenas CODPROD e QTDNEG
    const body = {
      serviceName: 'CACSP.incluirNota',
      requestBody: {
        nota: {
          cabecalho: {
            NUNOTA: {},
            CODPARC: { $: `${codParc}` },
            DTNEG: { $: format(subHours(new Date(), 3), 'dd/MM/yyyy HH:mm') },
            CODTIPOPER: { $: '379' },
            CODTIPVENDA: { $: '27' },
            CODVEND: { $: '0' },
            CODEMP: { $: '1' },
            TIPMOV: { $: 'P' },
          },
          itens: {
            INFORMARPRECO: 'False',
            item: [
              {
                NUNOTA: {},
                SEQUENCIA: {},
                CODPROD: { $: String(produto) },
                QTDNEG: { $: String(qtdNeg) },
                CODLOCAL: { $: '1600' },
              },
            ],
          },
        },
      },
    };

    const resp = await firstValueFrom(this.http.post(url, body, { headers }));
    return resp.data; // traz status, statusMessage, transactionId
  }

  async incluirNotaInfiniti(produto: string, qtdNeg: string, codParc: string, authToken: string) {
    const url =
      'https://api.sankhya.com.br/gateway/v1/mgecom/service.sbr?serviceName=CACSP.incluirNota&outputType=json';

    // Mesmos headers do cURL (sem "Bearer")
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    };

    // Corpo igual ao cURL, alterando apenas CODPROD e QTDNEG
    const body = {
      serviceName: 'CACSP.incluirNota',
      requestBody: {
        nota: {
          cabecalho: {
            NUNOTA: {},
            CODPARC: { $: `${codParc}` },
            DTNEG: { $: format(subHours(new Date(), 3), 'dd/MM/yyyy HH:mm') },
            CODTIPOPER: { $: '388' },
            CODTIPVENDA: { $: '27' },
            CODVEND: { $: '0' },
            CODEMP: { $: '1' },
            TIPMOV: { $: 'P' },
          },
          itens: {
            INFORMARPRECO: 'False',
            item: [
              {
                NUNOTA: {},
                SEQUENCIA: {},
                CODPROD: { $: String(produto) },
                QTDNEG: { $: String(qtdNeg) },
              },
            ],
          },
        },
      },
    };

    const resp = await firstValueFrom(this.http.post(url, body, { headers }));
    return resp.data; // traz status, statusMessage, transactionId
  }

  async incluirCashback(qtdNeg: string, codParc: string, authToken: string) {
    const url =
      'https://api.sankhya.com.br/gateway/v1/mgecom/service.sbr?serviceName=CACSP.incluirNota&outputType=json';

    // Mesmos headers do cURL (sem "Bearer")
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    };

    // Corpo igual ao cURL, alterando apenas CODPROD e QTDNEG
    const body = {
      serviceName: 'CACSP.incluirNota',
      requestBody: {
        nota: {
          cabecalho: {
            NUNOTA: {},
            CODPARC: { $: `${codParc}` },
            DTNEG: { $: format(subHours(new Date(), 3), 'dd/MM/yyyy HH:mm') },
            CODTIPOPER: { $: '387' },
            CODTIPVENDA: { $: '24' },
            CODVEND: { $: '0' },
            CODEMP: { $: '1' },
            TIPMOV: { $: 'P' },
          },
          itens: {
            INFORMARPRECO: 'True',
            item: [
              {
                NUNOTA: {},
                SEQUENCIA: {},
                CODPROD: { $: '20486' },
                QTDNEG: { $: '1' },
                VLRUNIT: { $: String(qtdNeg) },
                PERCDESC: { $: '0' },
              },
            ],
          },
        },
      },
    };

    const resp = await firstValueFrom(this.http.post(url, body, { headers }));
    return resp.data; // traz status, statusMessage, transactionId
  }


  async confirmarNota(nunota: number, authToken: string) {
    const url =
      'https://api.sankhya.com.br/gateway/v1/mgecom/service.sbr?serviceName=CACSP.confirmarNota&outputType=json';

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    };

    const body = {
      serviceName: 'CACSP.confirmarNota',
      requestBody: {
        nota: {
          NUNOTA: { $: nunota },              // número, não string
          confirmacaoCentralNota: true,
          ehPedidoWeb: false,
          atualizaPrecoItemPedCompra: false
        },
      },
    };

    const resp = await firstValueFrom(this.http.post(url, body, { headers }));
    console.log('Nota confirmada: ', nunota)
    return resp.data; // status, statusMessage, transactionId...
  }

  //#endregion

  //#region Transporte+

  async getNumUnicoByNotaWithout701(numNota: number | string, token: string): Promise<string | null> {
    const url = 'https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json';

    const data = {
      serviceName: 'CRUDServiceProvider.loadRecords',
      requestBody: {
        dataSet: {
          rootEntity: 'CabecalhoNota',
          includePresentationFields: 'S',
          offsetPage: '0',
          criteria: {
            expression: {
              $:
                `(this.NUMNOTA = ${numNota} AND (this.CODTIPOPER = 700 OR this.CODTIPOPER = 714 OR this.CODTIPOPER = 326 OR this.CODTIPOPER = 322 OR this.CODTIPOPER = 335 OR this.CODTIPOPER = 383))`,
            },
          },
          entity: {
            fieldset: {
              list: 'CODPARC,NUNOTA,CODEMP,DTNEG',
            },
          },
        },
      },
    };

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      // appkey: 'SEU_APPKEY' // se precisar no seu ambiente
    };

    const resp = await firstValueFrom(
      this.http.request({
        method: 'GET', // pode trocar para POST se preferir
        url,
        headers,
        data,
      }),
    );

    const entities = resp.data?.responseBody?.entities;
    if (!entities) return null;

    // mapeia metadados para identificar índice do NUNOTA
    const fields = entities?.metadata?.fields?.field || [];
    const fmap: Record<string, string> = Object.fromEntries(
      fields.map((f: any, i: number) => [f.name, `f${i}`]),
    );
    const nunotaKey = fmap['NUNOTA'] || 'f0';

    // normaliza para array
    const raw = entities?.entity;
    const list: any[] = Array.isArray(raw) ? raw : raw ? [raw] : [];

    if (!list.length) return null;

    return list[0]?.[nunotaKey]?.$ ?? list[0]?.[nunotaKey] ?? null;
  }

  async getNumUnicoByNotaWith701(numNota: number | string, token: string): Promise<string | null> {
    const url = 'https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json';

    const data = {
      serviceName: 'CRUDServiceProvider.loadRecords',
      requestBody: {
        dataSet: {
          rootEntity: 'CabecalhoNota',
          includePresentationFields: 'S',
          offsetPage: '0',
          criteria: {
            expression: {
              $:
                `(this.NUMNOTA = ${numNota} AND (this.CODTIPOPER = 701))`,
            },
          },
          entity: {
            fieldset: {
              list: 'CODPARC,NUNOTA,CODEMP,DTNEG',
            },
          },
        },
      },
    };

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      // appkey: 'SEU_APPKEY' // se precisar no seu ambiente
    };

    const resp = await firstValueFrom(
      this.http.request({
        method: 'GET', // pode trocar para POST se preferir
        url,
        headers,
        data,
      }),
    );

    const entities = resp.data?.responseBody?.entities;
    if (!entities) return null;

    // mapeia metadados para identificar índice do NUNOTA
    const fields = entities?.metadata?.fields?.field || [];
    const fmap: Record<string, string> = Object.fromEntries(
      fields.map((f: any, i: number) => [f.name, `f${i}`]),
    );
    const nunotaKey = fmap['NUNOTA'] || 'f0';

    // normaliza para array
    const raw = entities?.entity;
    const list: any[] = Array.isArray(raw) ? raw : raw ? [raw] : [];

    if (!list.length) return null;

    return list[0]?.[nunotaKey]?.$ ?? list[0]?.[nunotaKey] ?? null;
  }

  async atualizarStatus(nunota, ocorrencia, status, entregador, tipoEnvio, token) {
    const url =
      'https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=DatasetSP.save&outputType=json';

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    const body = {
      serviceName: 'CRUDServiceProvider.saveRecord',
      requestBody: {
        entityName: 'CabecalhoNota',
        standAlone: false,
        fields: ['NUNOTA', 'AD_OCORRENCIA_DE_ENTREGA', 'AD_STATUSENTREGA', 'AD_ENTREGADOR', 'AD_TIPOENVIO'],
        records: [
          {
            pk: { NUNOTA: nunota },
            values: {
              1: ocorrencia,
              2: status,
              3: entregador,
              4: tipoEnvio,
            },
          },
        ],
      },
    };

    const { data } = await firstValueFrom(this.http.post(url, body, { headers }));
    return data;
  }

  async getNote(NUNOTE: string, AuthToken: string) {
    const url =
      'https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json';

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${AuthToken}`,
    };

    const data = {
      serviceName: 'CRUDServiceProvider.loadRecords',
      requestBody: {
        dataSet: {
          rootEntity: 'CabecalhoNota',
          includePresentationFields: 'S',
          metadata: 'S',
          offsetPage: '0',
          criteria: {
            expression: {
              $: `(this.NUNOTA = '${NUNOTE}')`,
            },
          },
          entity: {
            fieldset: {
              list: 'NUNOTA,CODVENDTEC,DTNEG,VLRNOTA,CODPARC,AD_STATUSENTREGA',
            },
          },
        },
      },
    };

    const resp = await firstValueFrom(this.http.post(url, data, { headers }));

    const entities = resp.data?.responseBody?.entities?.entity;
    if (!entities) return null;

    // normaliza: pode vir objeto único ou array
    const list: any[] = Array.isArray(entities) ? entities : [entities];

    if (list.length === 0) return null;
    if (list.length === 1) return list[0];

    // pega o campo DTNEG dos metadados
    // entities.metadata.fields.field => mapeia nomes
    const fields = resp.data?.responseBody?.entities?.metadata?.fields?.field;
    const arrFields = Array.isArray(fields) ? fields : [fields];
    const idxByName: Record<string, string> = Object.fromEntries(
      arrFields.map((f: any, i: number) => [f.name, `f${i}`]),
    );

    // converte DTNEG em Date e escolhe a mais recente
    const sorted = [...list].sort((a, b) => {
      const aDate = new Date(a?.[idxByName['DTNEG']]?.$ ?? 0).getTime();
      const bDate = new Date(b?.[idxByName['DTNEG']]?.$ ?? 0).getTime();
      return bDate - aDate;
    });

    return sorted[0];
  }

  async getNotes(AuthToken: string) {
    const url =
      'https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json';

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${AuthToken}`,
    };

    // expressão do filtro (a mesma que você especificou)
    const whereExpr = `
(
  this.VLRNOTA > 0
  AND this.PENDENTE = 'S'
  AND this.CODTIPOPER IN (326, 700, 701)
  AND this.DTNEG > TO_DATE('21/03/2025','DD/MM/YYYY')
  AND NVL(TRIM(UPPER(this.AD_OCORRENCIA_DE_ENTREGA)),'SEM_VALOR') <> 'FINALIZADO'
  AND NOT (
    (
      TRIM(UPPER(this.AD_OCORRENCIA_DE_ENTREGA)) IN (
        'ENVIADO PARA SALA DE ESPERA',
        'ENVIAR PARA SALA DE ESPERA',
        'REALIZAR A ENTREGA PARCIAL'
      )
      AND TRIM(UPPER(this.AD_STATUSENTREGA)) = 'EM ANDAMENTO'
      AND this.AD_ENTREGADOR IS NOT NULL
      AND TRIM(UPPER(this.AD_TIPOENVIO)) = 'EM ANDAMENTO'
    )
    OR
    (
      TRIM(UPPER(this.AD_OCORRENCIA_DE_ENTREGA)) IN (
        'REALIZADO ENTREGA COMPLETA',
        'REALIZAR A ENTREGA COMPLETA',
        'REALIZAR A ENTREGA',
        'EXCLUIR ENTREGA',
        'MERCADORIA ENTREGUE COM SUCESSO',
        'REALIZADO ENTREGA PARCIAL'
      )
      AND TRIM(UPPER(this.AD_STATUSENTREGA)) = 'FINALIZADO'
      AND this.AD_ENTREGADOR IS NOT NULL
      AND TRIM(UPPER(this.AD_TIPOENVIO)) = 'ENTREGUE'
    )
  )
  AND this.AD_OCORRENCIA_DE_ENTREGA IS NULL
)
`.trim();

    // Campos que precisamos (pode ajustar aqui depois)
    const fieldList = [
      'NUNOTA',
      'NUMNOTA',
      'DTNEG',
      'VLRNOTA'
    ].join(',');

    // helper p/ mapear entity => objeto com chaves de metadados
    const mapEntities = (entitiesRoot: any) => {
      const fieldsMeta = entitiesRoot?.metadata?.fields?.field;
      const fieldsArr = Array.isArray(fieldsMeta) ? fieldsMeta : fieldsMeta ? [fieldsMeta] : [];
      const idxByName: Record<string, string> = Object.fromEntries(
        fieldsArr.map((f: any, i: number) => [f.name, `f${i}`])
      );

      const raw = entitiesRoot?.entity;
      const list: any[] = Array.isArray(raw) ? raw : raw ? [raw] : [];

      // converte cada linha: { f0: { $: valor }, f1: {...} } => { NUNOTA: valor, NUMNOTA: valor, ... }
      const rows = list.map((row: any) => {
        const out: Record<string, any> = {};
        for (const [name, fkey] of Object.entries(idxByName)) {
          const v = row?.[fkey];
          out[name] = v?.$ ?? v ?? null; // resolve {$: ...} ou valor direto
        }
        return out;
      });

      return rows;
    };

    const allRows: any[] = [];
    let page = 0;

    while (true) {
      const data = {
        serviceName: 'CRUDServiceProvider.loadRecords',
        requestBody: {
          dataSet: {
            rootEntity: 'CabecalhoNota',
            includePresentationFields: 'S',
            metadata: 'S',
            offsetPage: String(page),   // paginação
            // se quiser forçar 50 por página explicitamente (opcional):
            // rows: '50',
            criteria: {
              expression: { $: whereExpr },
            },
            entity: {
              fieldset: { list: fieldList },
            },
          },
        },
      };

      const resp = await firstValueFrom(this.http.post(url, data, { headers }));
      const entitiesRoot = resp.data?.responseBody?.entities;

      // quando não vier nada, encerramos
      if (!entitiesRoot?.entity) break;

      const rows = mapEntities(entitiesRoot);
      if (!rows.length) break;

      allRows.push(...rows);

      // Se retornou menos de 50, provavelmente acabou
      if (rows.length < 50) break;

      page += 1;
    }

    // Retorna tudo ordenado pela DTNEG (mais recente primeiro)
    // DTNEG vem como string ISO ou data formatada pelo Sankhya (depende do ambiente),
    // então usamos Date.parse com fallback.
    const sorted = [...allRows].sort((a, b) => {
      const aTs = Date.parse(a.DTNEG || '') || 0;
      const bTs = Date.parse(b.DTNEG || '') || 0;
      return bTs - aTs;
    });

    return sorted;
  }

  //#endregion

  //#region Unico

  async atualizarCorProduto(cod, corFundo, corFonte, token) {
    const url =
      'https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=DatasetSP.save&outputType=json';

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    const body = {
      serviceName: 'CRUDServiceProvider.saveRecord',
      requestBody: {
        entityName: 'Produto',
        standAlone: false,
        fields: ['CODPROD', 'CORFUNDOCONSPRECO', 'CORFONTCONSPRECO'],
        records: [
          {
            pk: { CODPROD: cod },
            values: {
              1: corFundo,
              2: corFonte,
            },
          },
        ],
      },
    };

    const { data } = await firstValueFrom(this.http.post(url, body, { headers }));
    return data;
  }

  //#endregion

  //#region [CODIGOS DE USO UNICO] 

  // Dentro do seu SankhyaService
  async logEstoque1400_fromCurl(authToken: string): Promise<string> {
    const url =
      'https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json';

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
      appkey: this.appKey, // se seu ambiente exigir
    };

    let page = 0;
    const recordCount = 100;
    let hasMore = true;

    // acumula todos os itens mapeados
    const acumulado: Array<{
      COD: string | null;
      Descrição: string | null;
      Estoque: number;
      CODLOCAL?: string | null;
    }> = [];

    while (hasMore) {
      const data = {
        requestBody: {
          dataSet: {
            rootEntity: 'Estoque',
            includePresentationFields: 'S',
            offsetPage: String(page),
            recordCount: String(recordCount),
            criteria: {
              expression: {
                $: 'this.ESTOQUE > ? AND this.CODLOCAL = ?',
              },
              parameter: [
                { $: '0', type: 'I' },
                { $: '1400', type: 'I' },
              ],
            },
            entity: {
              fieldset: {
                // Apenas campos da entidade raiz; os de apresentação virão via includePresentationFields = 'S'
                list: 'CODPROD,CODLOCAL,ESTOQUE',
              },
            },
          },
        },
      };

      // Mantive GET para espelhar seu cURL (funciona); se preferir, pode usar POST
      const resp = await firstValueFrom(
        this.http.request({ method: 'GET', url, headers, data })
      );

      const entities = resp.data?.responseBody?.entities;
      const raw = entities?.entity;
      const list: any[] = Array.isArray(raw) ? raw : raw ? [raw] : [];

      // Mapeia índices f0,f1.. para nomes reais via metadata
      const fields = entities?.metadata?.fields?.field ?? [];
      const map: Record<string, string> = Object.fromEntries(
        fields.map((f: any, i: number) => [f.name, `f${i}`])
      );

      // Constrói linhas já com os nomes desejados na planilha
      const linhas = list.map((e) => ({
        COD: e?.[map['CODPROD']]?.$ ?? null,
        Descrição: e?.[map['Produto_DESCRPROD']]?.$ ?? null, // presentation field
        Estoque: Number(e?.[map['ESTOQUE']]?.$ ?? 0),
        CODLOCAL: e?.[map['CODLOCAL']]?.$ ?? null, // opcional (pode remover da planilha se não quiser)
      }));

      acumulado.push(...linhas);

      hasMore = String(entities?.hasMoreResult).toLowerCase() === 'true';
      page++;
    }

    // === GERAR PLANILHA ===
    // Se não quiser a coluna CODLOCAL, remova aqui:
    const rowsForSheet = acumulado.map(({ COD, Descrição, Estoque /*, CODLOCAL*/ }) => ({
      COD,
      Descrição,
      Estoque,
      // CODLOCAL, // descomente se quiser incluir
    }));

    const ws = XLSX.utils.json_to_sheet(rowsForSheet, { header: ['COD', 'Descrição', 'Estoque'] });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Estoque 1400');

    // cria pasta ./exports se não existir
    const dir = path.resolve(process.cwd(), 'exports');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const ts = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const fileName = `estoque_1400_${ts.getFullYear()}${pad(ts.getMonth() + 1)}${pad(ts.getDate())}_${pad(ts.getHours())}${pad(ts.getMinutes())}${pad(ts.getSeconds())}.xlsx`;
    const filePath = path.join(dir, fileName);

    XLSX.writeFile(wb, filePath);

    // Retorna o caminho do arquivo gerado (útil para log/download)
    return filePath;
  }

  async exportProdutosPrecoZeroOuNullPorTabelaExcel_Contextualizado(
    authToken: string,
    codigoTabela: number,
  ): Promise<string> {
    const pageSize = 50;
    let page = 0;

    // 1) Buscar TODOS os produtos (apenas o necessário)
    const produtos: Array<{ CODPROD: string; DESCRPROD: string | null }> = [];

    for (; ;) {
      const payload = {
        serviceName: 'CRUDServiceProvider.loadRecords',
        requestBody: {
          dataSet: {
            rootEntity: 'Produto',
            includePresentationFields: 'N',
            offsetPage: String(page),
            pageSize: String(pageSize),
            entity: { fieldset: { list: 'CODPROD,DESCRPROD,USOPROD,ATIVO' } },
          },
        },
      };

      const data = await this.callSankhya(payload, authToken);
      const entities = data?.responseBody?.entities;
      const raw = entities?.entity;
      const list: any[] = Array.isArray(raw) ? raw : raw ? [raw] : [];
      if (list.length === 0) break;

      for (const e of list) {
        const cod = e.f0?.['$'] ?? null;
        const descr = e.f1?.['$'] ?? null;
        if (cod) produtos.push({ CODPROD: String(cod), DESCRPROD: descr });
      }

      // continua até acabar (só aqui usamos paginação — na parte de preços não)
      if (String(entities?.hasMoreResult).toLowerCase() !== 'true' || list.length < pageSize) break;
      page++;
    }

    // 2) Preços contextualizados em LOTES de 50 e empilhando com push (sem paginação de preço)
    const rows: Array<{ CODPROD: string; DESCRPROD: string | null; PRECO: string | null }> = [];

    // helper para fatiar em lotes de 50
    const chunk = <T,>(arr: T[], size: number) =>
      Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
        arr.slice(i * size, i * size + size),
      );

    const lotes = chunk(produtos, 50);

    for (const lote of lotes) {
      try {
        // *** Ajuste o BODY conforme seu ambiente ***
        const body = {
          // alguns ambientes aceitam só "tabela": codigoTabela
          tabela: codigoTabela,
          // outros pedem objeto: { codigo: codigoTabela }
          // tabela: { codigo: codigoTabela },

          // lista de produtos: { codigo } ou { codProd }
          produtos: lote.map(p => ({ codigo: Number(p.CODPROD) })),
          // se seu ambiente exigir mais contexto (empresa, canal, parceiro), inclua aqui:
          // empresa: 1,
          // canalVenda: '1',
          // parceiro: 123,
        };

        const resp: any = await firstValueFrom(
          this.http.post('https://api.sankhya.com.br/v1/precos/contextualizado', body, {
            headers: { Authorization: `Bearer ${authToken}`, appkey: this.appKey },
            timeout: 60000,
          }),
        );

        // *** Ajuste as chaves conforme a resposta no seu ambiente ***
        // Normalmente vem algo como: { produtos: [ { codigo: 123, valor: "0.00", ... }, ... ] }
        const precos: any[] = Array.isArray(resp?.data?.produtos) ? resp.data.produtos : [];

        // Empilha no array final com .push (sem paginação extra)
        for (const prec of precos) {
          // identificar o código do produto e o valor
          // use 'codigo' ou 'codProd' conforme vier na resposta
          const cod = String(prec?.codigo ?? prec?.codProd ?? '');
          const valorStr = prec?.valor ?? null;
          const valorNum =
            valorStr != null ? Number(String(valorStr).replace(',', '.')) : null;

          if (cod) {
            // Captura a descrição do cadastro carregada antes
            const descr = lote.find(p => p.CODPROD === cod)?.DESCRPROD ?? null;

            // FILTRO: somente preço 0 ou null
            if (valorNum === null || isNaN(valorNum) || valorNum === 0) {
              rows.push({
                CODPROD: cod,
                DESCRPROD: descr,
                PRECO: valorStr, // guarda como string original (ou null)
              });
            }
          }
        }
      } catch (err: any) {
        // Se o lote falhar, marca todos os itens do lote como sem preço (opcional)
        for (const p of lote) {
          rows.push({ CODPROD: p.CODPROD, DESCRPROD: p.DESCRPROD, PRECO: null });
        }
        // this.logger.warn(`Falha no lote: ${err?.message || err}`);
      }
    }

    // 3) Gerar Excel
    await fS.mkdir(this.outputDir, { recursive: true });
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('PrecoZeroOuNull (Contextualizado)');

    ws.columns = [
      { header: 'CODPROD', key: 'CODPROD', width: 12 },
      { header: 'DESCRPROD', key: 'DESCRPROD', width: 40 },
      { header: 'PRECO', key: 'PRECO', width: 14 },
    ];
    ws.addRows(rows);
    ws.views = [{ state: 'frozen', ySplit: 1 }];

    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filePath = path.join(
      this.outputDir,
      `produtos_preco_zero_context_${codigoTabela}_${stamp}.xlsx`,
    );
    await wb.xlsx.writeFile(filePath);
    this.logger.log(`Planilha gerada: ${filePath}`);

    return filePath;
  }

  private async callSankhya(body: any, authToken: string) {
    const { data } = await firstValueFrom(
      this.http.post(this.serviceUrl, body, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
          appkey: this.appKey,
        },
        timeout: 60_000,
      }),
    );
    // opcional: validar status === '1'
    return data;
  }


  async getProductsByLocation(location: string, token: string): Promise<any[]> {
    const payload = {
      serviceName: 'CRUDServiceProvider.loadRecords',
      requestBody: {
        dataSet: {
          rootEntity: 'Produto',
          includePresentationFields: 'N',
          tryJoinedFields: 'true',
          offsetPage: '0',
          criteria: {
            expression: { $: 'this.LOCALIZACAO = ?' },
            parameter: [{ $: location, type: 'S' }],
          },
          entity: [
            {
              path: '',
              fieldset: {
                list: 'CODPROD,DESCRPROD,LOCALIZACAO',
              },
            },
          ],
        },
      },
    };

    const data = await this.callSankhya(payload, token);

    const entities = data?.responseBody?.entities?.entity;
    const list: any[] = Array.isArray(entities) ? entities : entities ? [entities] : [];

    return list.map((e) => ({
      CODPROD: Number(e.f0?.$ ?? e.f0 ?? 0),
      DESCRPROD: e.f1?.$ ?? e.f1 ?? null,
      LOCALIZACAO: e.f2?.$ ?? e.f2 ?? location,
    }));
  }




  //#endregion

}

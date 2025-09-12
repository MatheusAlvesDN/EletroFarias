import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { v2 as cloudinary } from 'cloudinary';
import * as fs from 'fs';
import * as XLSX from 'xlsx';
import * as path from 'path';
import * as ExcelJS from 'exceljs';
import * as fS from 'node:fs/promises';


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

type ProdutoRow = {
  CODPROD?: string | number;
  DESCRPROD?: string;
  PRECO?: number | string | null;
  MARCA?: string;
  CODVOL?: string;
};

  type EstoqueLinha = {
    CODLOCAL: number;
    ESTOQUE: number;
    RESERVADO: number;
    DISPONIVEL: number;
    // Se incluir campos de apresentação (ex.: LocalFinanceiro_DESCRLOCAL), eles entram aqui:
    [k: string]: any;
  };

@Injectable()
export class SankhyaService {
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

  async logout(authToken: string): Promise<void> {
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
      console.log('Logout Sankhya realizado com sucesso.');
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

  //#region Solicitações para FrontEnd

  async getProdutoLoc(codProd: number, authToken: string): Promise<Record<string, any> | null> {
    const payload = {
      serviceName: 'CRUDServiceProvider.loadRecords',
      requestBody: {
        dataSet: {
          rootEntity: 'Produto',
          includePresentationFields: 'N',
          tryJoinedFields: 'true',
          offsetPage: '0',
          criteria: {
            expression: { $: 'this.CODPROD = ?' },
            parameter: [{ $: codProd.toString(), type: 'I' }],
          },
          entity: [
            {
              path: '',
              fieldset: {
                list: 'CODPROD,DESCRPROD,MARCA,CARACTERISTICAS,CODVOL,CODGRUPOPROD,LOCALIZACAO,REFERENCIA',
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

  async getEstoqueFront(codProd: number, bearerToken: string): Promise < EstoqueLinha[] > {
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

  

  //#endregion

  //#region imagens, para puxar imagem: https://danilo.nuvemdatacom.com.br:9092/mge/Produto@IMAGEM@CODPROD=33.dbimage    OBS: ${CODPROD} = CODIGO DO PRODUTO PRA PUXAR IMAGEM

  async downloadImage(url: string): Promise < Buffer > {
  const response = await firstValueFrom(
    this.http.get(url, { responseType: 'arraybuffer' }),
  );
  return Buffer.from(response.data);
}

  async uploadToCloudinary(buffer: Buffer, publicId ?: string): Promise < string > {
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

  async processImageFromUrl(url: string, publicId ?: string): Promise < string > {
  const imageBuffer = await this.downloadImage(url);
  return this.uploadToCloudinary(imageBuffer, publicId);
}

  //#endregion

  //#region fidelimax

  async getNota(data: string, token: string) {
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
        tryJoinedFields: 'true',          // << importante p/ juntar campos do join
        metadata: 'S',
        offsetPage: '0',
        criteria: {
          // Parametrizado evita problemas de aspas
          expression: { $: 'this.DTNEG = ? AND (this.CODTIPOPER = 700 OR this.CODTIPOPER = 701 OR this.CODTIPOPER = 315 OR this.CODTIPOPER = 326) AND this.AD_INFIDELIMAX IS NULL AND this.CODPARC <> ? AND this.STATUSNFE = ?' },
          parameter: [
            { $: data, type: 'D' },       // 'DD/MM/AAAA'
            { $: '111111', type: 'S' },
            { $: 'A', type: 'S' },
          ],
        },
        entity: [
          {
            path: '',
            fieldset: {
              list: 'NUNOTA,CODTIPOPER,DTNEG,CODPARC,STATUSNFE,VLRNOTA,CODVEND,CODVENDTEC',
            },
          },
          {
            path: 'Vendedor',             // << JOIN com Vendedor (pela FK CODVEND)
            fieldset: {
              list: 'CODVEND,CODPARC,APELIDO,AD_TIPOTECNICO,AD_FIDELIMAX',
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

  // mapeia via metadata (name -> f{index})
  const fieldsArr = Array.isArray(entities?.metadata?.fields?.field)
    ? entities.metadata.fields.field
    : entities?.metadata?.fields?.field
      ? [entities.metadata.fields.field]
      : [];

  const idxByName: Record<string, string> =
    Object.fromEntries(fieldsArr.map((f: any, i: number) => [f.name, `f${i}`]));

  const normalize = (raw: any) => (Array.isArray(raw) ? raw : raw ? [raw] : []);
  const rowsRaw = normalize(entities?.entity);

  const get = (row: any, name: string) => row?.[idxByName[name]]?.$ ?? null;

  // OBS: campos do join vêm com prefixo "Vendedor_" no metadata
  const rows = rowsRaw.map(row => ({
    NUNOTA: get(row, 'NUNOTA'),
    DTNEG: get(row, 'DTNEG'),
    CODTIPOPER: get(row, 'CODTIPOPER'),
    CODPARC: get(row, 'CODPARC'),
    STATUSNFE: get(row, 'STATUSNFE'),
    VLRNOTA: Number(get(row, 'VLRNOTA') ?? 0),
    CODVEND: get(row, 'CODVEND'),
    CODVENDTEC: get(row, 'CODVENDTEC'),

    // do join:
    VENDEDOR_CODVEND: get(row, 'Vendedor_CODVEND'),
    VENDEDOR_CODPARC: get(row, 'Vendedor_CODPARC'),
    VENDEDOR_APELIDO: get(row, 'Vendedor_APELIDO'),
    VENDEDOR_AD_TIPOTECNICO: get(row, 'Vendedor_AD_TIPOTECNICO'),
    VENDEDOR_AD_FIDELIMAX: get(row, 'Vendedor_AD_FIDELIMAX'),
  }));

  return rows;
}

  async getDevol(data: string, token: string) {
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
        includePresentationFields: 'S',
        metadata: 'S',
        offsetPage: '0',
        criteria: {
          expression: { $: `this.DTNEG = ${data} AND (this.CODTIPOPER = 800 OR this.CODTIPOPER = 801 OR this.CODTIPOPER = 312) AND (this.AD_INFIDELIMAX is null)` },
        },
        entity: {
          fieldset: {
            list: 'NUNOTA,CODTIPOPER,DTNEG,CODTIPOPER,CODPARC,STATUSNFE,AD_INFIDELIMAX',
          },
        },
      },
    },
  };

  const resp = await firstValueFrom(this.http.post(url, body, { headers }));

  // valida retorno MGE
  if (resp?.data?.status !== '1') {
    const msg =
      resp?.data?.responseBody?.errorMessage ||
      resp?.data?.serviceMessage ||
      JSON.stringify(resp?.data);
    throw new Error(`Falha no loadRecords: ${msg}`);
  }

  const entities = resp.data.responseBody?.entities;

  // ---- mapeia via metadata (name -> f{index}) ----
  const fieldsArr = Array.isArray(entities?.metadata?.fields?.field)
    ? entities.metadata.fields.field
    : entities?.metadata?.fields?.field
      ? [entities.metadata.fields.field]
      : [];

  const idxByName: Record<string, string> = Object.fromEntries(
    fieldsArr.map((f: any, i: number) => [f.name, `f${i}`]),
  );

  const normalizeEntityList = (raw: any) => (Array.isArray(raw) ? raw : raw ? [raw] : []);

  const rowsRaw = normalizeEntityList(entities?.entity);

  const getVal = (row: any, name: string) => row?.[idxByName[name]]?.$ ?? null;

  // retorna cada linha como { CAMPO: valor, ... } baseado nos nomes do fieldset
  const rows = rowsRaw.map(row =>
    Object.fromEntries(fieldsArr.map((f: any) => [f.name, getVal(row, f.name)])),
  );

  return rows; // <- ex.: [{ NUNOTA: '258932', DTNEG: '19/08/2025', ...}, ...]
}

  async getVendedor(codVendTec: number, token: string) {
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

  //#endregion

  //#region Transporte+

  async getNumUnicoByNotaWithout701(numNota: number | string, token: string): Promise < string | null > {
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
              `(this.NUMNOTA = ${numNota} AND (this.CODTIPOPER = 700 OR this.CODTIPOPER = 714 OR this.CODTIPOPER = 326 OR this.CODTIPOPER = 322 OR this.CODTIPOPER = 335))`,
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
  if(!entities) return null;

  // mapeia metadados para identificar índice do NUNOTA
  const fields = entities?.metadata?.fields?.field || [];
  const fmap: Record<string, string> = Object.fromEntries(
    fields.map((f: any, i: number) => [f.name, `f${i}`]),
  );
  const nunotaKey = fmap['NUNOTA'] || 'f0';

  // normaliza para array
  const raw = entities?.entity;
  const list: any[] = Array.isArray(raw) ? raw : raw ? [raw] : [];

  if(!list.length) return null;

  return list[0]?.[nunotaKey]?.$ ?? list[0]?.[nunotaKey] ?? null;
}

  async getNumUnicoByNotaWith701(numNota: number | string, token: string): Promise < string | null > {
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
  if(!entities) return null;

  // mapeia metadados para identificar índice do NUNOTA
  const fields = entities?.metadata?.fields?.field || [];
  const fmap: Record<string, string> = Object.fromEntries(
    fields.map((f: any, i: number) => [f.name, `f${i}`]),
  );
  const nunotaKey = fmap['NUNOTA'] || 'f0';

  // normaliza para array
  const raw = entities?.entity;
  const list: any[] = Array.isArray(raw) ? raw : raw ? [raw] : [];

  if(!list.length) return null;

  return list[0]?.[nunotaKey]?.$ ?? list[0]?.[nunotaKey] ?? null;
}

  async atualizarStatusEntrega(nunota, status, token: string) {
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
      fields: ['NUNOTA', 'AD_STATUSENTREGA'],
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

  async atualizarStatusOcorrencia(nunota, ocorrencia, token) {
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
      fields: ['NUNOTA', 'AD_OCORRENCIA_DE_ENTREGA'],
      records: [
        {
          pk: { NUNOTA: nunota },
          values: { 1: ocorrencia },
        },
      ],
    },
  };

  const { data } = await firstValueFrom(this.http.post(url, body, { headers }));
  return data;
  }

  async atualizarStatus(nunota, ocorrencia, status, token) {
    await this.atualizarStatusEntrega(nunota, status, token);
    await this.atualizarStatusOcorrencia(nunota, ocorrencia, token);
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

  //#endregion

  //#region [CODIGOS DE USO UNICO] 

  // Dentro do seu SankhyaService
  async logEstoque1400_fromCurl(authToken: string): Promise < string > {
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
    CODLOCAL ?: string | null;
  }> =[];

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
): Promise < string > {
  const pageSize = 50;
  let page = 0;

  // 1) Buscar TODOS os produtos (apenas o necessário)
  const produtos: Array<{ CODPROD: string; DESCRPROD: string | null }> =[];

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

  //#endregion

}

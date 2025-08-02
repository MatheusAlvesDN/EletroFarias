import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { v2 as cloudinary } from 'cloudinary';
import * as fs from 'fs';
import * as XLSX from 'xlsx';
import * as path from 'path';

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
}

function getFirstThreeColumnsFromSheet(): Array<{ [key: string]: any }> {
  const filePath = path.join(process.cwd(), 'cadastrarEAN.xlsx');

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
}

@Injectable()
export class SankhyaService {
  private readonly loginUrl = 'https://api.sankhya.com.br/login';
  private readonly queryUrl = 'https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json';
  private readonly logoutUrl = 'https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=MobileLoginSP.logout&outputType=json';
  private readonly baseUrl = 'https://api.sankhya.com.br/'
  private readonly grupoUrl = 'https://api.sankhya.com.br/GrupoProduto'
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

  async updateEAN() {
    const retorno = getFirstThreeColumnsFromSheet();
    return retorno
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
                list: 'CODPROD,DESCRPROD,MARCA,CARACTERISTICAS,CODVOL,CODGRUPOPROD',
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

    const filePath = path.join(process.cwd(), 'cadastrarEAN.xlsx');
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

  async atualizarProduto(token: string, codProd: string, codBarra: string) {
    const url = 'https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.saveRecord&outputType=json';

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
            pk: { CODPROD: codProd },
            values: { AD_CODBARRA: codBarra },
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
      console.error('Erro ao atualizar produto:', error.response?.data || error.message);
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

  async getNoteVendas(dataHoje: string, AuthToken: string) {
    const url = 'https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json';

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AuthToken}`,
    };

    const data = {
      serviceName: 'CRUDServiceProvider.loadRecords',
      requestBody: {
        dataSet: {
          rootEntity: 'CabecalhoNota',
          includePresentationFields: 'S',
          offsetPage: '0',
          criteria: {
            expression: {
              $: `(this.DTNEG = '${dataHoje}' AND (this.CODTIPOPER = 11 OR this.CODTIPOPER = 315 OR this.CODTIPOPER = 326 AND this.CODTIPOPER = 700 OR this.CODTIPOPER = 701))`
            }
          },
          entity: {
            fieldset: {
              list: 'NUNOTA,CODVENDTEC,DTALTER,VLRNOTA,CODPARC'
            }
          }
        }
      }
    };

    try {
      const response = await firstValueFrom(
        this.http.request({
          method: 'GET',
          url,
          headers,
          data,
        }),
      );

      const entities = response?.data?.responseBody?.entities?.entity;

      if (!entities) {
        console.error('Nenhuma nota encontrada ou resposta inválida:', response?.data);
        return [];
      }

      const notas = Array.isArray(entities) ? entities : [entities];

      return notas.map((record: any) => ({
        NUNOTA: record.f0?.$ ?? null,
        CODVENDTEC: record.f1?.$ ?? null,
        DTALTER: record.f2?.$ ?? null,
        value: record.f3?.$ ?? null,
      }));

    } catch (error) {
      console.error('Erro ao obter notas do Sankhya:', error?.message || error);
      return [];
    }
  }

  async getNoteDevol(dataHoje: string, AuthToken: string) {
    const url = 'https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json';

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AuthToken}`,
    };

    const data = {
      serviceName: 'CRUDServiceProvider.loadRecords',
      requestBody: {
        dataSet: {
          rootEntity: 'CabecalhoNota',
          includePresentationFields: 'S',
          offsetPage: '0',
          criteria: {
            expression: {
              $: `(this.DTNEG = '${dataHoje}' AND (this.CODTIPOPER = 800 OR this.CODTIPOPER = 801 OR this.CODTIPOPER = 312))`
            }
          },
          entity: {
            fieldset: {
              list: 'NUNOTA,CODVENDTEC,DTALTER,VLRNOTA,CODPARC'
            }
          }
        }
      }
    };

    try {
      const response = await firstValueFrom(
        this.http.request({
          method: 'GET',
          url,
          headers,
          data,
        }),
      );

      const entities = response?.data?.responseBody?.entities?.entity;

      if (!entities) {
        console.error('Nenhuma nota encontrada ou resposta inválida');
        return [];
      }

      const notas = Array.isArray(entities) ? entities : [entities];

      return notas.map((record: any) => ({
        NUNOTA: record.f0?.$ ?? null,
        CODVENDTEC: record.f1?.$ ?? null,
        DTALTER: record.f2?.$ ?? null,
        value: record.f3?.$ ?? null,
        Parc: record.f4?.$ ?? null,
      }));

    } catch (error) {
      console.error('Erro ao obter notas do Sankhya:', error?.message || error);
      return [];
    }
  }

  async enrichNoteWithCODPAR(
    notas: Array<{
      NUNOTA: string;
      CODVENDTEC: number;
      DTALTER: string;
      value: number;
    }>,
    authToken: string
  ): Promise<
    Array<{
      NUNOTA: string;
      CODVENDTEC: number;
      DTALTER: string;
      value: number;
      CODPARC: string | null;
      NOMEPARC?: string;
      CLIENTE?: string;
      TELEFONE?: string;
      EMAIL?: string;
      CGC_CPF?: string;
      DTNASC?: string;
    }>
  > {
    const enrichedNotas: Array<{
      NUNOTA: string;
      CODVENDTEC: number;
      DTALTER: string;
      value: number;
      CODPARC: string | null;
      NOMEPARC?: string;
      CLIENTE?: string;
      TELEFONE?: string;
      EMAIL?: string;
      CGC_CPF?: string;
      DTNASC?: string;
    }> = [];
    const codVendCache = new Map<number, string | null>();
    const codParcCache = new Map<string, any>();

    for (const nota of notas) {
      const codVend = nota.CODVENDTEC;
      let codParc: string | null = null;

      // 1️⃣ Verifica o cache de CODVENDTEC
      if (codVendCache.has(codVend)) {
        codParc = codVendCache.get(codVend)!;
      } else {
        // Consulta o CODPARC pelo CODVEND
        const payload = {
          serviceName: 'CRUDServiceProvider.loadRecords',
          requestBody: {
            dataSet: {
              rootEntity: 'Vendedor',
              includePresentationFields: 'N',
              offsetPage: '0',
              criteria: {
                expression: { $: 'this.CODVEND = ?' },
                parameter: [{ $: codVend, type: 'I' }],
              },
              entity: {
                fieldset: { list: 'CODVEND,CODPARC,APELIDO' },
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

          const entity = response.data?.responseBody?.entities?.entity;
          const metadata = response.data?.responseBody?.entities?.metadata?.fields?.field;

          if (entity && metadata) {
            const fieldMap = Object.fromEntries(
              metadata.map((f: any, i: number) => [f.name, `f${i}`])
            );
            const vendedor = Array.isArray(entity) ? entity[0] : entity;
            codParc = vendedor?.[fieldMap['CODPARC']]?.$ ?? null;
          }
        } catch (err) {
          console.warn(`Erro buscando CODPARC para CODVEND ${codVend}`, err?.response?.data || err.message);
        }

        codVendCache.set(codVend, codParc);
      }

      // 2️⃣ Prepara o objeto base com CODPARC
      const notaComParc: any = { ...nota, CODPARC: codParc };

      // 3️⃣ Se tiver CODPARC, busca dados do parceiro
      if (codParc && !codParcCache.has(codParc)) {
        const parceiroPayload = {
          serviceName: 'CRUDServiceProvider.loadRecords',
          requestBody: {
            dataSet: {
              rootEntity: 'Parceiro',
              includePresentationFields: 'N',
              offsetPage: '0',
              criteria: {
                expression: { $: 'this.CLIENTE = ? and this.CODPARC = ?' },
                parameter: [
                  { $: 'S', type: 'S' },
                  { $: codParc, type: 'I' },
                ],
              },
              entity: {
                fieldset: {
                  list: 'CODPARC,NOMEPARC,CLIENTE,TELEFONE,EMAILNFE,CGC_CPF,DTNASC',
                },
              },
            },
          },
        };

        try {
          const response = await firstValueFrom(
            this.http.post(this.queryUrl, parceiroPayload, {
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${authToken}`,
                appkey: this.appKey,
              },
            }),
          );

          const entity = response.data?.responseBody?.entities?.entity;
          const metadata = response.data?.responseBody?.entities?.metadata?.fields?.field;

          if (entity && metadata) {
            const fieldMap = Object.fromEntries(
              metadata.map((f: any, i: number) => [f.name, `f${i}`])
            );

            const parceiro = Array.isArray(entity) ? entity[0] : entity;

            const dadosParceiro = {
              NOMEPARC: parceiro?.[fieldMap['NOMEPARC']]?.$ ?? null,
              CLIENTE: parceiro?.[fieldMap['CLIENTE']]?.$ ?? null,
              TELEFONE: parceiro?.[fieldMap['TELEFONE']]?.$ ?? null,
              EMAIL: parceiro?.[fieldMap['EMAILNFE']]?.$ ?? null,
              CGC_CPF: parceiro?.[fieldMap['CGC_CPF']]?.$ ?? null,
              DTNASC: parceiro?.[fieldMap['DTNASC']]?.$ ?? null,
            };

            codParcCache.set(codParc, dadosParceiro);
          } else {
            codParcCache.set(codParc, null);
          }
        } catch (err) {
          console.warn(`Erro buscando dados do parceiro ${codParc}`, err?.response?.data || err.message);
          codParcCache.set(codParc, null);
        }
      }

      // 4️⃣ Incrementa dados do parceiro se tiver
      if (codParc && codParcCache.has(codParc)) {
        Object.assign(notaComParc, codParcCache.get(codParc));
      }

      enrichedNotas.push(notaComParc);
    }

    return enrichedNotas;
  }

  //#endregion

}


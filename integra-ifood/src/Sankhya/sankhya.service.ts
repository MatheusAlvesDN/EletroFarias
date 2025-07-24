import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import * as fs from 'fs';


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
  ): Promise<Array<{
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
  }>> {
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
                { $: 'S', type: 'S' }
              ],
            },
            entity: [{
              path: '',
              fieldset: {
                list: 'CODPROD,DESCRPROD,CODGRUPOPROD,CARACTERISTICAS,ATIVO,MARCA,UNIDADE',
              },
            }],
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

    return produtos
      .filter(prod => prod.f4?.['$'] === 'S') // f4 = ATIVO
      .map(prod => {
        const codigo = prod.f0?.['$'] ?? ''; // CODPROD
        const descricao = prod.f1?.['$'] ?? ''; // DESCRPROD
        const caracteristicas = prod.f3?.['$'] ?? ''; // CARACTERISTICAS
        const marca = prod.f5?.['$'] ?? '';
        const unidade = prod.f6?.['$'] ?? '';

        return {
          barcode: codigo.toString(),
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
            imageUrl: `https://danilo.nuvemdatacom.com.br:9092/mge/Produto@IMAGEM@CODPROD=${codigo}.dbimage`,
            description: caracteristicas || null,
            nearExpiration: true, // verificar
            family: null,
          },
          prices: {
            price: 999999,
            promotionPrice: null,
          },
          scalePrices: null,
          multiple: null,
          channels: null,
        };
      });
  }

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
    const codigosProdutos = produtos.map(p => parseInt(p.barcode));

    // 2. Consulta os preços da tabela
    const precos = await this.getPrecosProdutosTabelaBatch(codigosProdutos, codigoTabela, authToken);

    // 3. Mapeia código -> preço
    const precoMap = new Map(precos.map(p => [p.codProd.toString(), p.valor]));

    // 4. Atualiza os produtos com os preços reais
    return produtos.map(prod => {
      const preco = precoMap.get(prod.barcode) ?? 0;
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

  //#endregion

  //#region imagens, para puxar imagem: https://danilo.nuvemdatacom.com.br:9092/mge/Produto@IMAGEM@CODPROD=33.dbimage    OBS: ${CODPROD} = CODIGO DO PRODUTO PRA PUXAR IMAGEM

  

  //#endregion
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


}
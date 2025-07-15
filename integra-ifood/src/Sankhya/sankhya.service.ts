import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';


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
    this.password = this.configService.get<string>('SANKHYA_USERNAMEPASSWORD')!;
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

  async getEstoque(codProd: number, codLocal: number, authToken: string): Promise<any> {
    const payload = {
      serviceName: 'CRUDServiceProvider.loadRecords',
      requestBody: {
        dataSet: {
          rootEntity: 'Estoque',
          includePresentationFields: 'S',
          offsetPage: '0',
          recordCount: '50',
          criteria: {
            expression: {
              $: 'this.CODPROD = ?',
            },
            parameter: [
              { $: codProd.toString(), type: 'I' },
              { $: codLocal.toString(), type: 'I' },
            ],
          },
          entity: {
            fieldset: {
              list: 'CODPROD,CODLOCAL,ESTOQUE',  // Somente campos da entidade Estoque
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

      const entities = response.data.responseBody?.entities?.entity;

      if (Array.isArray(entities) && entities.length > 0) {
        return entities.map((item) => ({
          codProd: item.f0?.['$'],
          codLocal: item.f1?.['$'],
          estoque: parseFloat(item.f2?.['$'] ?? '0'),
        }));
      }

      return [];
    } catch (error: any) {
      console.error('Erro ao buscar estoque:', error.response?.data || error.message);
      throw error;
    }
  } // para puxar imagem: https://danilo.nuvemdatacom.com.br:9092/mge/Produto@IMAGEM@CODPROD=`${CODPROD}`.dbimage    OBS: ${CODPROD} = CODIGO DO PRODUTO PRA PUXAR IMAGEM

  async getPrecosProdutosTabela(
    codigosProdutos: number[],
    codigoTabela: number,
    authToken: string,
    pagina: number = 1,
  ): Promise<{ codProd: number; valor: number }[]> {
    const resultados: { codProd: number; valor: number }[] = [];

    for (const codigoProduto of codigosProdutos) {
      const url = `${this.baseUrl}v1/precos/produto/${codigoProduto}/tabela/${codigoTabela}`;

      try {
        const response = await firstValueFrom(
          this.http.get(url, {
            headers: {
              Authorization: `Bearer ${authToken}`,
              appkey: this.appKey,
            },
            params: { pagina },
          }),
        );

        const produtos = response.data?.produtos;
        if (Array.isArray(produtos)) {
          for (const item of produtos) {
            resultados.push({
              codProd: codigoProduto,
              valor: parseFloat(item.valor ?? '0'),
            });
          }
        }
      } catch (error: any) {
        console.error(
          `Erro ao buscar preço do produto ${codigoProduto}:`,
          error.response?.data || error.message,
        );
      }
    }

    return resultados;
  } // retorna preço do produto de acordo com a tabela

  async getProductsByGroup(
    codGrupoProd: string,
    categoryIdIfood: string,
    authToken: string
  ): Promise<Array<{
    externalCode: string;
    name: string;
    description: string;
    serving: string;
    imagePath: string;
    categories: { id: string }[];
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
                { $: codGrupoProd, type: 'S' },
                { $: 'S', type: 'S' }
              ],
            },
            entity: [{
              path: '',
              fieldset: {
                list: 'CODPROD,DESCRPROD,CODGRUPOPROD,CARACTERISTICAS,ATIVO',
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
      .filter(prod => prod.f4?.['$'] === 'S') // f4 corresponde ao campo ATIVO
      .map(prod => {
        const codigo = prod.f0?.['$'] ?? '';
        const descricao = prod.f1?.['$'] ?? '';
        const caracteristicas = prod.f3?.['$'] ?? '';

        return {
          externalCode: codigo,
          name: descricao,
          description: caracteristicas || 'Produto sem descrição',
          serving: 'SERVES_1',
          imagePath: `https://danilo.nuvemdatacom.com.br:9092/mge/Produto@IMAGEM@CODPROD=${codigo}.dbimage`,
          categories: [{ id: categoryIdIfood }],
        };
      });
  }

  async getEstoquesLote(
    produtos: { externalCode: string; productId: string; valor: number }[],
    codLocal: number,
    authToken: string,
  ): Promise<
    {
      externalCode: string;
      productId: string;
      valor: number;
      quantity: number;
    }[]
  > {
    const codigos = produtos.map(p => p.externalCode).filter(c => !isNaN(Number(c)));

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
                $: `(${codigos
                  .map(() => '(this.CODPROD = ? AND this.CODLOCAL = ?)')
                  .join(' OR ')})`,
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
      quantity: estoqueMap.get(produto.externalCode) ?? 0,
    }));
  }

  async enrichWithPrices(
    produtosCriados: {
      externalCode: string;
      success: boolean;
      data?: {
        id: string;
        // outros campos...
      };
    }[],
    codigoTabela: number,
    authToken: string,
  ): Promise<
    {
      externalCode: string;
      productId: string;
      valor: number;
    }[]
  > {
    const codigosProdutos = produtosCriados
      .filter(p => p.success && p.externalCode)
      .map(p => parseInt(p.externalCode));

    const precos = await this.getPrecosProdutosTabela(codigosProdutos, codigoTabela, authToken);

    const precoMap = new Map(precos.map(p => [p.codProd.toString(), p.valor]));

    const result = produtosCriados
      .filter(p => p.success && p.data?.id)
      .map(p => ({
        externalCode: p.externalCode,
        productId: p.data!.id,
        valor: precoMap.get(p.externalCode) ?? 0,
      }));

    return result;
  }

  async enrichWithStock(
    productsCodesWithPrices: {
      externalCode: string;
      productId: string;
      valor: number;
    }[],
    codLocal: number,
    authToken: string,
  ): Promise<
    {
      externalCode: string;
      productId: string;
      valor: number;
      quantity: number;
    }[]
  > {
    return this.getEstoquesLote(productsCodesWithPrices, codLocal, authToken);
  }

}
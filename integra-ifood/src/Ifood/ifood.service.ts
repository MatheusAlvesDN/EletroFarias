import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import * as fs from 'fs';
import * as path from 'path';

interface TokenData {
  accessToken: string;
  expiration: number;
}


  type SankhyaBarcodeRow = {
  CODPROD: string | number;
  CODBARRA: string;
};

type ProdutoBarcodes = {
  codprod: number;
  barcodes: string[];
};

type SankhyaProdutoEan = {
  codprod: number;
  descrprod?: string;
  ean?: string;
};

@Injectable()
export class IfoodService {
  private readonly logger = new Logger(IfoodService.name);
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly loginUrl: string;
  private readonly merchantId: string;
  private readonly catalogId: string;
  private readonly tokenFilePath = path.resolve(__dirname, '../../token.json');

  constructor(
    private readonly http: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.clientId = this.configService.get<string>('IFOOD_CLIENT_ID')!;
    this.clientSecret = this.configService.get<string>('IFOOD_CLIENT_SECRET')!;
    this.loginUrl = this.configService.get<string>('IFOOD_LOGIN_URL')!;
    this.merchantId = this.configService.get<string>('IFOOD_MERCHANT_ID')!;
    this.catalogId = this.configService.get<string>('IFOOD_CATALOG_ID')!;
  }
  //#region Autenticação
  private readTokenFromFile(): TokenData | null {
    try {
      if (!fs.existsSync(this.tokenFilePath)) return null;
      const data = fs.readFileSync(this.tokenFilePath, 'utf8');
      const token: TokenData = JSON.parse(data);
      if (Date.now() < token.expiration) return token;
      return null;
    } catch {
      return null;
    }
  }

  private writeTokenToFile(token: TokenData): void {
    fs.writeFileSync(this.tokenFilePath, JSON.stringify(token), 'utf8');
  }

  private async requestNewToken(): Promise<TokenData> {
    const body = new URLSearchParams({
      grantType: 'client_credentials',
      clientId: this.clientId,
      clientSecret: this.clientSecret,
    });

    const response = await firstValueFrom(
      this.http.post(this.loginUrl, body.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }),
    );

    const accessToken = response.data.accessToken;
    const expiresIn = response.data.expiresIn;
    const expiration = Date.now() + expiresIn * 1000 - 60_000;

    const tokenData: TokenData = { accessToken, expiration };
    this.writeTokenToFile(tokenData);
    return tokenData;
  }

  public async getValidAccessToken(): Promise<string> {
    const savedToken = this.readTokenFromFile();
    if (savedToken) {
      return savedToken.accessToken;
    }
    const newToken = await this.requestNewToken();
    return newToken.accessToken;
  }

  async getMerchantId(authToken: string): Promise<string> {
    const response = await firstValueFrom(
      this.http.get('https://merchant-api.ifood.com.br/merchant/v1.0/merchants', {
        headers: {
          Authorization: `bearer ${authToken}`,
        },
      }),
    );

    const merchants = response.data;
    if (!merchants || merchants.length === 0) {
      throw new Error('Nenhum merchant encontrado para esta conta.');
    }

    // Retorna o ID do primeiro merchant encontrado
    return merchants[0].id;
  }

  async getFirstCatalog(merchantId: string, authToken: string): Promise<string> {
    const response = await firstValueFrom(
      this.http.get(`https://merchant-api.ifood.com.br/catalog/v2.0/merchants/${merchantId}/catalogs`, {
        headers: {
          Authorization: `bearer ${authToken}`,
        },
      }),
    );

    return response.data[0].catalogId;
  }

  //#endregion


  //#region Cadastro de itens Grocery no ifood

  async sendItemIngestion(
    authToken: string,
    merchantId: string,
    items: {
      barcode: string;
      name: string;
      plu: string;
      active: boolean;
      inventory: { stock: number };
      details: {
        categorization: {
          department: string | null;
          category: string | null;
          subCategory: string | null;
        };
        brand: string | null;
        unit: string | null;
        volume: string | null;
        imageUrl: string | null;
        description: string | null;
        nearExpiration: boolean;
        family: string | null;
      };
      prices: {
        price: number;
        promotionPrice: number | null;
      };
      scalePrices: any;
      multiple: any;
      channels: any;
    }[],
  ) {
    const url = `https://merchant-api.ifood.com.br/item/v1.0/ingestion/${merchantId}?reset=true`;

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    };

    try {
      const response = await firstValueFrom(
        this.http.post(url, items, { headers }),
      );
      return response.data;
    } catch (error) {
      console.error('Erro ao enviar item:', error.response?.data || error);
      throw error;
    }
  }

  //#endregion

  //#region Update

  async getAllItemsFromCategories(accessToken: string, merchantId: string, catalogId: string): Promise<any[]> {
    const url = `https://merchant-api.ifood.com.br/catalog/v2.0/merchants/${merchantId}/catalogs/${catalogId}/categories?includeItems=true`;

    const headers = {
      Authorization: `Bearer ${accessToken}`,
    };

    const response = await firstValueFrom(
      this.http.get(url, { headers }),
    );

    const categorias = response.data;

    if (!Array.isArray(categorias)) {
      this.logger.warn('Resposta inesperada da API do iFood');
      return [];
    }

    // 🔁 Flatten: junta todos os items de cada categoria em um array único
    const allItems = categorias.flatMap(categoria => categoria.items || []);

    this.logger.log(`Total de produtos encontrados: ${allItems.length}`);

    return allItems;
  }

  //#endregion

  //#region Exclusão de produtos
  async deleteCategory(merchantId: string, categoryId: string, token: string): Promise<void> {
    const url = `https://merchant-api.ifood.com.br/catalog/v2.0/merchants/${merchantId}/categories/${categoryId}`;

    try {
      const response = await firstValueFrom(
        this.http.delete(url, {
          headers: {
            Authorization: `Bearer ${token}`, // ou só `token` se não usar Bearer
          },
        })
      );

      console.log('Categoria excluída com sucesso:', response.status);
    } catch (error) {
      console.error('Erro ao excluir categoria:', error?.response?.data || error.message);
      throw error;
    }
  }

  async deleteAllProductsFromCategory(
    merchantId: string,
    authToken: string,
    category: { items: any[] }
  ): Promise<void> {
    const headers = {
      Authorization: `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    };

    const items = category.items || [];

    for (const item of items) {
      const productId = item.productId;
      const externalCode = item.externalCode;

      if (!productId || productId.length !== 36) {
        console.warn(`⚠️ Produto com externalCode ${externalCode} tem productId inválido: ${productId}`);
        continue;
      }

      try {
        await firstValueFrom(
          this.http.delete(
            `https://merchant-api.ifood.com.br/catalog/v1.0/merchants/${merchantId}/products/${productId}`,
            { headers }
          )
        );
        console.log(`✅ Produto ${externalCode} com ID ${productId} deletado com sucesso.`);
      } catch (error: any) {
        console.error(`❌ Erro ao deletar produto ${externalCode} (${productId}):`, error.response?.data || error.message);
      }
    }
  }

  async deleteAllProducts(
    merchantId: string,
    authToken: string,
    products: { externalCode: string; productId: string }[]
  ): Promise<void> {
    const headers = {
      Authorization: `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    };

    for (const { externalCode, productId } of products) {
      if (!productId || productId.length !== 36) {
        console.warn(`ID inválido para o externalCode ${externalCode}: ${productId}`);
        continue;
      }

      try {
        await firstValueFrom(
          this.http.delete(
            `https://merchant-api.ifood.com.br/catalog/v1.0/merchants/${merchantId}/products/${productId}`,
            { headers }
          )
        );
        console.log(`✅ Produto ${externalCode} com ID ${productId} deletado com sucesso.`);
      } catch (error: any) {
        console.error(
          `❌ Erro ao deletar produto ${externalCode} (${productId}):`,
          error.response?.data || error.message
        );
      }
    }
  }

  async getCategoriesByCatalog(merchantId: string, catalogId: string, authToken: string): Promise<any> {
    const url = `https://merchant-api.ifood.com.br/catalog/v2.0/merchants/${merchantId}/catalogs/${catalogId}/categories`;

    const response = await firstValueFrom(
      this.http.get(url, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        params: {
          includeItems: true,
          include_items: true, // se a API aceitar ambos
        },
      }),
    );
    return response.data;
  }

  async updateCategory( //Não esta em uso no momento
    merchantId: string,
    catalogId: string,
    categoryId: string,
    data: {
      name: string;
      externalCode: string;
      status: 'AVAILABLE' | 'UNAVAILABLE';
      index: number;
    },
    authToken: string
  ): Promise<any> {
    const url = `https://merchant-api.ifood.com.br/catalog/v2.0/merchants/${merchantId}/catalogs/${catalogId}/categories/${categoryId}`;

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    };

    try {
      const response = await firstValueFrom(
        this.http.patch(url, data, { headers })
      );
      return response.data;
    } catch (error: any) {
      console.error('Erro ao atualizar categoria:', error?.response?.data || error.message);
      throw error;
    }
  }

  async updateProductInventory(
    merchantId: string,
    authToken: string,
    productId: string,
    amount: number
  ): Promise<any> {
    const headers = {
      Authorization: `Bearer ${authToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    const body = {
      productId,
      amount,
    };

    try {
      const response = await firstValueFrom(
        this.http.post(
          `https://merchant-api.ifood.com.br/catalog/v2.0/merchants/${merchantId}/inventory`,
          body,
          { headers }
        )
      );

      console.log(`📦 Estoque atualizado para o produto ${productId} com quantidade ${amount}`);
      return response.data;
    } catch (error: any) {
      console.error(`❌ Erro ao atualizar estoque do produto ${productId}:`, error.response?.data || error.message);
      throw error;
    }
  }

  async updateAllProductInventories(
    merchantId: string,
    authToken: string,
    productsWithPricesQuantities: { productId: string; quantity: number }[]
  ): Promise<void> {
    const headers = {
      Authorization: `Bearer ${authToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    for (const product of productsWithPricesQuantities) {
      const body = {
        productId: product.productId,
        amount: product.quantity,
      };

      try {
        await firstValueFrom(
          this.http.post(
            `https://merchant-api.ifood.com.br/catalog/v2.0/merchants/${merchantId}/inventory`,
            body,
            { headers }
          )
        );
        console.log(`📦 Estoque atualizado: ${product.productId} -> ${product.quantity}`);
      } catch (error: any) {
        console.error(
          `❌ Erro ao atualizar estoque do produto ${product.productId}:`,
          error.response?.data || error.message
        );
      }
    }
  }
  //#endregion


  //#region busca EAN e envio de produtos

  // Coloque isso dentro do seu IfoodService

  private getSankhyaGatewayUrl(): string {
    // exemplo: https://api.sankhya.com.br  (produção)
    // ou: https://api.sandbox.sankhya.com.br (sandbox)
    return this.configService.get<string>('SANKHYA_GATEWAY_URL')!;
  }

  /**
   * Faz a consulta no Sankhya usando CRUDServiceProvider.loadRecords
   * Entidade: Produto (mapeia TGFPRO) :contentReference[oaicite:1]{index=1}
   *
   * Observação:
   * - O campo de EAN costuma estar em "CODBARRA" (código de barras do estoque),
   *   mas isso pode variar dependendo de entidade/campos habilitados.
   * - Se sua entidade "Produto" não expuser CODBARRA, você pode precisar ajustar o fieldset
   *   ou usar DbExplorerSP.executeQuery.
   */
  private async fetchProdutosComEanSankhya(
    sankhyaAuthToken: string,
    opts?: { onlyActive?: boolean; pageStart?: number; maxPages?: number },
  ): Promise<SankhyaProdutoEan[]> {
    const gateway = this.getSankhyaGatewayUrl();
    const url = `${gateway}/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json`; // :contentReference[oaicite:2]{index=2}

    const onlyActive = opts?.onlyActive ?? true;
    let offsetPage = opts?.pageStart ?? 0;
    const maxPages = opts?.maxPages ?? 500;

    const out: SankhyaProdutoEan[] = [];

    for (let page = 0; page < maxPages; page++) {
      const body: any = {
        serviceName: 'CRUDServiceProvider.loadRecords',
        requestBody: {
          dataSet: {
            rootEntity: 'Produto', // :contentReference[oaicite:3]{index=3}
            ignoreCalculatedFields: 'true',
            useFileBasedPagination: 'true', // :contentReference[oaicite:4]{index=4}
            includePresentationFields: 'N',
            tryJoinedFields: 'true',
            offsetPage: String(offsetPage), // :contentReference[oaicite:5]{index=5}
            criteria: {
              expression: {
                // Ajuste aqui se quiser filtrar por empresa, grupo, etc.
                // Mantive um filtro simples: ativo e com código de barras preenchido.
                $: onlyActive
                  ? "ATIVO = 'S' AND CODBARRA IS NOT NULL AND CODBARRA <> ''"
                  : "CODBARRA IS NOT NULL AND CODBARRA <> ''",
              },
            },
            entity: [
              {
                path: '',
                fieldset: {
                  // Campos típicos da entidade Produto (TGFPRO) :contentReference[oaicite:6]{index=6}
                  // Se CODBARRA não vier, veja observação abaixo.
                  list: 'CODPROD, DESCRPROD, CODBARRA',
                },
              },
            ],
          },
        },
      };

      const resp = await firstValueFrom(
        this.http.post(url, body, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sankhyaAuthToken}`,
          },
        }),
      );

      const rows = this.extractSankhyaRows(resp.data);
      if (!rows.length) break;

      for (const r of rows) {
        const codprod = Number(r?.CODPROD ?? r?.codprod);
        const descrprod = String(r?.DESCRPROD ?? r?.descrprod ?? '');
        const ean = (r?.CODBARRA ?? r?.codbarras ?? r?.ean ?? r?.EAN ?? '').toString().trim();

        if (Number.isFinite(codprod) && ean) {
          out.push({ codprod, descrprod, ean });
        }
      }

      offsetPage++;
    }

    return out;
  }

  /**
   * O retorno do Sankhya pode mudar um pouco de formato conforme serviço/versão/config.
   * Esse extractor tenta cobrir os formatos mais comuns do "loadRecords".
   */
  private extractSankhyaRows(payload: any): any[] {
    const rb = payload?.responseBody ?? payload?.ResponseBody ?? payload;
    const ds = rb?.dataSet ?? rb?.dataset ?? rb?.DataSet;

    // Alguns retornos vêm como ds.rows / ds.row / ds.entity...
    const rows1 = ds?.rows;
    if (Array.isArray(rows1)) return rows1;

    const rows2 = ds?.row;
    if (Array.isArray(rows2)) return rows2;
    if (rows2 && typeof rows2 === 'object') return [rows2];

    // Alguns retornos vêm com "entity" e "record"
    const ent = ds?.entity ?? ds?.entities;
    if (Array.isArray(ent)) {
      const recs = ent.flatMap((e: any) => e?.record ?? e?.records ?? []);
      if (recs.length) return recs;
    }

    // fallback: tenta achar uma lista de objetos em algum lugar
    if (Array.isArray(ds)) return ds;
    return [];
  }

  /**
   * Método principal: pega EAN do Sankhya e envia pro iFood.
   * Usa o seu sendItemIngestion (ingestion) como saída.
   */
  public async syncEansFromSankhyaToIfood(params: {
    sankhyaAuthToken: string;
    ifoodAccessToken: string;
    merchantId?: string; // se não passar, ele pega o primeiro via API
  }): Promise<{ totalSankhya: number; sentToIfood: number }> {
    const merchantId =
      params.merchantId ?? (await this.getMerchantId(params.ifoodAccessToken));

    // 1) Buscar produtos + EAN no Sankhya
    const produtos = await this.fetchProdutosComEanSankhya(params.sankhyaAuthToken, {
      onlyActive: true,
    });

    // 2) Montar payload no formato que seu ingestion já espera
    // Observação: no iFood, "barcode" deve ser o EAN/GTIN.
    // "plu" costuma ser seu identificador interno (ex.: CODPROD).
    const items = produtos.map((p) => ({
      barcode: p.ean!,
      name: p.descrprod?.slice(0, 120) || `PROD ${p.codprod}`,
      plu: String(p.codprod),
      active: true,
      inventory: { stock: 0 }, // se você não quer mexer em estoque aqui, mantenha 0 ou busque do Sankhya
      details: {
        categorization: {
          department: null,
          category: null,
          subCategory: null,
        },
        brand: null,
        unit: null,
        volume: null,
        imageUrl: null,
        description: null,
        nearExpiration: false,
        family: null,
      },
      prices: {
        price: 0, // se você não quer mexer em preço aqui, mantenha 0 ou busque do Sankhya
        promotionPrice: null,
      },
      scalePrices: null,
      multiple: null,
      channels: null,
    }));

    // 3) Enviar para o iFood
    // ATENÇÃO: seu sendItemIngestion usa reset=true na URL.
    // Isso normalmente "resseta" itens e pode remover coisas — use com cuidado.
    await this.sendItemIngestion(params.ifoodAccessToken, merchantId, items);

    this.logger.log(
      `Sync EAN concluído. Sankhya: ${produtos.length} | iFood enviados: ${items.length}`,
    );

    return { totalSankhya: produtos.length, sentToIfood: items.length };
  }
  
/**
 * Executa SQL no Sankhya via DbExplorerSP.executeQuery
 * (Útil quando o campo não está na entidade Produto/TGFPRO, e sim em TGFBAR)
 */
private async executeSankhyaQuery<T = any>(
  sankhyaAuthToken: string,
  sql: string,
): Promise<T[]> {
  const gateway = this.getSankhyaGatewayUrl();

  // endpoint "mge" é o mais comum para esses serviços
  const url =
    `${gateway}/gateway/v1/mge/service.sbr?serviceName=DbExplorerSP.executeQuery&outputType=json`;

  const body = {
    serviceName: 'DbExplorerSP.executeQuery',
    requestBody: {
      sql: sql,
    },
  };

  const resp = await firstValueFrom(
    this.http.post(url, body, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sankhyaAuthToken}`,
      },
    }),
  );

  // O retorno do DbExplorer pode vir em formatos diferentes conforme ambiente.
  // Esse extractor tenta cobrir os casos mais comuns.
  const rb = resp.data?.responseBody ?? resp.data?.ResponseBody ?? resp.data;
  const result = rb?.result ?? rb?.Result ?? rb?.queryResult ?? rb;

  // Alguns vêm como array direto, outros como { rows: [...] }
  if (Array.isArray(result)) return result as T[];
  if (Array.isArray(result?.rows)) return result.rows as T[];

  // Alguns vêm como { response: { rows: [...] } }
  if (Array.isArray(result?.response?.rows)) return result.response.rows as T[];

  // Fallback: tenta achar uma lista de objetos
  const maybe = rb?.rows ?? rb?.Rows;
  if (Array.isArray(maybe)) return maybe as T[];

  return [];
}

/**
 * Busca TGFBAR e devolve { codprod, barcodes[] }
 */
private async fetchBarcodesFromTGFBAR(
  sankhyaAuthToken: string,
  opts?: { onlyActiveProducts?: boolean },
): Promise<ProdutoBarcodes[]> {
  // Ajuste simples: se quiser filtrar apenas produtos ativos,
  // a gente faz join com TGFPRO (ATIVO = 'S').
  const onlyActiveProducts = opts?.onlyActiveProducts ?? true;

  const sql = onlyActiveProducts
    ? `
      SELECT
        b.CODPROD,
        b.CODBARRA
      FROM TGFBAR b
      JOIN TGFPRO p ON p.CODPROD = b.CODPROD
      WHERE p.ATIVO = 'S'
        AND b.CODBARRA IS NOT NULL
        AND TRIM(b.CODBARRA) <> ''
    `
    : `
      SELECT
        b.CODPROD,
        b.CODBARRA
      FROM TGFBAR b
      WHERE b.CODBARRA IS NOT NULL
        AND TRIM(b.CODBARRA) <> ''
    `;

  const rows = await this.executeSankhyaQuery<SankhyaBarcodeRow>(sankhyaAuthToken, sql);

  // Agrupa por produto
  const map = new Map<number, Set<string>>();

  for (const r of rows) {
    const codprod = Number((r as any).CODPROD ?? (r as any).codprod);
    const codbarraRaw = String((r as any).CODBARRA ?? (r as any).codbarra ?? '').trim();

    if (!Number.isFinite(codprod) || !codbarraRaw) continue;

    // Normaliza: só dígitos (EAN normalmente é numérico)
    const codbarra = codbarraRaw.replace(/\D/g, '');
    if (!codbarra) continue;

    if (!map.has(codprod)) map.set(codprod, new Set());
    map.get(codprod)!.add(codbarra);
  }

  return Array.from(map.entries()).map(([codprod, set]) => ({
    codprod,
    barcodes: Array.from(set),
  }));
}






  //#endregion



  //#region Metodos para debug



  //#endregion

}
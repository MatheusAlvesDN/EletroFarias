import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { SankhyaService } from '../Sankhya/sankhya.service';
import * as fs from 'fs';
import * as path from 'path';

interface TokenData {
  accessToken: string;
  expiration: number;
}

type IfoodCategoryCreateInput = {
  name: string;
  status?: 'AVAILABLE' | 'UNAVAILABLE';
  template?: 'DEFAULT';
  sequence?: number;
};

export interface IfoodIngestionItem {
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
  scalePrices?: any;
  multiple?: any;
  channels?: any;
}

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
    private readonly sankhyaService: SankhyaService,
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

  /**
   * Envia itens para o iFood em lotes para evitar erro de Payload Too Large.
   * @param reset Se true, APAGA itens do iFood que não estiverem nesta lista (Cuidado!).
   */
  async sendItemIngestion(
    authToken: string,
    merchantId: string,
    items: IfoodIngestionItem[],
    reset = false,
  ) {
    const BATCH_SIZE = 200;
    const totalItems = items.length;

    if (reset && totalItems > BATCH_SIZE) {
      console.warn('ATENÇÃO: reset=true com muitos itens. Isso pode falhar por tamanho de payload. Considere usar reset=false.');
    }

    const chunks = reset ? [items] : this.chunkArray(items, BATCH_SIZE);

    console.log(`Iniciando sincronização de ${totalItems} itens em ${chunks.length} lote(s). Modo Reset: ${reset}`);

    const results: { batchId: string; status: string }[] = [];
    for (const [index, chunk] of chunks.entries()) {
      try {
        console.log(`Enviando lote ${index + 1}/${chunks.length} com ${chunk.length} itens...`);

        const url = `https://merchant-api.ifood.com.br/item/v1.0/ingestion/${merchantId}?reset=${reset}`;

        const headers = {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        };

        const response = await firstValueFrom(
          this.http.post(url, chunk, { headers }),
        );

        // EXTRAÇÃO DO ID
        let batchId: string | undefined = undefined;

        if (Array.isArray(response.data) && response.data.length > 0) {
          const firstObj = response.data[0];
          if (firstObj && Array.isArray(firstObj.integrationUuid) && firstObj.integrationUuid.length > 0) {
            batchId = firstObj.integrationUuid[0];
          }
        } else if (typeof response.data === 'string' && response.data.trim() !== '') {
          batchId = response.data;
        } else if (response.data && typeof response.data === 'object') {
          batchId = response.data.batchId
            || response.data.integrationId
            || response.data.integrationUuid;
        }

        console.log(`Lote ${index + 1} enviado. BatchID capturado: ${batchId}`);

        if (batchId) {
          // ✅ CORREÇÃO: Removida a checagem de rota inexistente. 
          // Se recebemos o batchId, o iFood já aceitou na fila.
          results.push({ batchId, status: 'ENVIADO_PARA_FILA_IFOOD' });
        } else {
          console.log(`⚠️ Não foi possível extrair o batchId do Lote ${index + 1}. Resposta foi:`, JSON.stringify(response.data));
        }

      } catch (error: any) {
        console.error(`Erro ao enviar lote ${index + 1}:`, error.response?.data || error.message);
      }
    }

    return results;
  }

  // Monitoramento do status do lote de ingestão
  private async pollIngestionStatus(authToken: string, batchId: string, attempts = 0): Promise<any> {
    const MAX_ATTEMPTS = 10;
    const DELAY_MS = 2000; // Aguarda 2 segundos por tentativa

    if (attempts >= MAX_ATTEMPTS) {
      console.warn(`Parando de monitorar batch ${batchId} após ${MAX_ATTEMPTS} tentativas.`);
      return { status: 'TIMEOUT_POLLING' };
    }

    const url = `https://merchant-api.ifood.com.br/item/v1.0/ingestion/status/${batchId}`;
    const headers = {
      Authorization: `Bearer ${authToken}`,
      Accept: 'application/json'
    };

    try {
      await new Promise(resolve => setTimeout(resolve, DELAY_MS));

      const response = await firstValueFrom(this.http.get(url, { headers }));
      const data = response.data;

      console.log(`Status Batch ${batchId}: ${data.status}`);

      if (data.status === 'COMPLETED' || data.status === 'COMPLETED_WITH_ERRORS') {
        return data;
      }

      if (data.status === 'FAILED') {
        console.error('Batch falhou:', data.errors);
        return data;
      }

      // Se ainda estiver PENDING ou IN_PROGRESS, tenta de novo recursivamente
      return this.pollIngestionStatus(authToken, batchId, attempts + 1);

    } catch (error: any) {
      console.error(`Erro ao consultar status do batch ${batchId}`, error.response?.data || error.message);
      return null;
    }
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunked_arr: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunked_arr.push(array.slice(i, i + size));
    }
    return chunked_arr;
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

    // Flatten: junta todos os items de cada categoria em um array único
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
            Authorization: `Bearer ${token}`,
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
          include_items: true,
        },
      }),
    );
    return response.data;
  }

  async updateCategory(
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

  //#region Update Categories

  async getAllCategories(
    accessToken: string,
    merchantId: string,
    catalogId: string,
  ): Promise<any[]> {
    const url = `https://merchant-api.ifood.com.br/catalog/v2.0/merchants/${merchantId}/catalogs/${catalogId}/categories?includeItems=false`;

    const headers = {
      Authorization: `Bearer ${accessToken}`,
    };

    const response = await firstValueFrom(this.http.get(url, { headers }));
    const categorias = response.data;

    if (!Array.isArray(categorias)) {
      this.logger.warn('Resposta inesperada da API do iFood (categorias).');
      return [];
    }

    this.logger.log(`Total de categorias encontradas: ${categorias.length}`);
    return categorias;
  }

  async getAllCategoriesSlim(
    accessToken: string,
    merchantId: string,
    catalogId: string,
  ): Promise<Array<{ id: string; name: string; sequence?: number }>> {
    const url = `https://merchant-api.ifood.com.br/catalog/v2.0/merchants/${merchantId}/catalogs/${catalogId}/categories?includeItems=false`;

    const headers = { Authorization: `Bearer ${accessToken}` };

    const response = await firstValueFrom(this.http.get(url, { headers }));
    const categorias = response.data;

    if (!Array.isArray(categorias)) {
      this.logger.warn('Resposta inesperada da API do iFood (categorias).');
      return [];
    }

    const mapped = categorias.map((c: any) => ({
      id: String(c.id ?? c.categoryId ?? ''),
      name: String(c.name ?? c.title ?? ''),
      sequence: c.sequence ?? c.order ?? undefined,
    }));

    this.logger.log(`Total de categorias encontradas: ${mapped.length}`);
    return mapped;
  }

  async categoryExists(
    accessToken: string,
    merchantId: string,
    catalogId: string,
    categoryIdOrName: string,
  ): Promise<{ exists: boolean; category?: any }> {
    const url = `https://merchant-api.ifood.com.br/catalog/v2.0/merchants/${merchantId}/catalogs/${catalogId}/categories?includeItems=false`;

    const headers = { Authorization: `Bearer ${accessToken}` };

    const response = await firstValueFrom(this.http.get(url, { headers }));
    const categorias = response.data;

    if (!Array.isArray(categorias)) {
      this.logger.warn('Resposta inesperada da API do iFood (categorias).');
      return { exists: false };
    }

    const needle = String(categoryIdOrName).trim().toLowerCase();

    const found = categorias.find((c: any) => {
      const id = c?.id ?? c?.categoryId;
      const name = c?.name ?? c?.title;
      return (
        (id != null && String(id).trim().toLowerCase() === needle) ||
        (name != null && String(name).trim().toLowerCase() === needle)
      );
    });

    return found ? { exists: true, category: found } : { exists: false };
  }

  async createCategory(
    accessToken: string,
    merchantId: string,
    catalogId: string,
    input: IfoodCategoryCreateInput,
  ): Promise<any> {
    const url = `https://merchant-api.ifood.com.br/catalog/v2.0/merchants/${merchantId}/catalogs/${catalogId}/categories`;

    const headers = {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    };

    const payload = {
      name: input.name,
      status: input.status ?? 'AVAILABLE',
      template: input.template ?? 'DEFAULT',
      sequence: input.sequence ?? 0,
    };

    const response = await firstValueFrom(this.http.post(url, payload, { headers }));
    return response.data;
  }
  //#endregion


  async syncProductToIfood(productId: number): Promise<void> {
    const authTokenSankhya = await this.sankhyaService.login();
    const log = "syncProductToIfood";

    try {
      const authTokenIfood = await this.getValidAccessToken();
      const merchantID = await this.getMerchantId(authTokenIfood);

      const produto = await this.sankhyaService.getProduto(productId, authTokenSankhya);

      if (!produto) {
        this.logger.error(`[${log}] getProduto retornou vazio. productId=${productId}`);
        throw new Error(`Produto ${productId} não encontrado no Sankhya.`);
      }

      const groupName = produto?.f6?.["$"];
      const groupIdSankhya = produto?.f5?.["$"];

      if (!groupIdSankhya) throw new Error(`Produto ${productId} sem groupId (f5.$ vazio).`);
      if (!groupName) throw new Error(`Produto ${productId} sem groupName (f6.$ vazio).`);

      const produtosValidos = await this.sankhyaService.filterInvalidEanAndExport(groupIdSankhya, groupName, authTokenSankhya);

      if (!produtosValidos?.length) return;

      const allProductsWithPrice = await this.sankhyaService.enrichWithPricesFromProductList(produtosValidos, 0, authTokenSankhya);
      const allProductsWithPriceStock = await this.sankhyaService.getStockInLot(allProductsWithPrice, 1100, authTokenSankhya);

      await this.sendItemIngestion(authTokenIfood, merchantID, allProductsWithPriceStock);
      this.logger.log(`[${log}] Ingestão enviada. itens=${allProductsWithPriceStock.length}`);
    } finally {
      await this.sankhyaService.logout(authTokenSankhya, log);
    }
  }

  async deleteProductFromIfood(productId: number): Promise<void> {
    const authTokenSankhya = await this.sankhyaService.login();
    const authTokenIfood = await this.getValidAccessToken();
    const merchantID = await this.getMerchantId(authTokenIfood);
    const catalogId = await this.getFirstCatalog(merchantID, authTokenIfood);

    const produto = await this.sankhyaService.getProduto(productId, authTokenSankhya);
    console.log(produto);

    // Implemente a lógica de exclusão do iFood aqui utilizando o deleteItem...

    await this.sankhyaService.logout(authTokenSankhya, "deleteProductFromIfood");
  }

  async getAllCategoriesConfig(): Promise<any> {
    const authTokenIfood = await this.getValidAccessToken();
    const merchantID = await this.getMerchantId(authTokenIfood);
    const catalogID = await this.getFirstCatalog(merchantID, authTokenIfood);

    return await this.getCategoriesByCatalog(merchantID, catalogID, authTokenIfood);
  }

  async cadastrarProdutosIfood(produtos: any[]) {
    const list = Array.isArray(produtos) ? produtos : [];

    const validos = list.map((p) => ({
      ...p,
      CODPROD: Number(p?.CODPROD),
      CODBARRA: String(p?.CODBARRA ?? '').trim() || null,
      CODBARRAS: Array.isArray(p?.CODBARRAS) ? p!.CODBARRAS!.map((x) => String(x ?? '').trim()).filter(Boolean) : [],
      DESCRPROD: p?.DESCRPROD ?? null,
      MARCA: (p?.MARCA ?? null) as any,
      DESCRGRUPOPROD: p?.DESCRGRUPOPROD ?? null,
    }))
      .filter((p) => Number.isFinite(p.CODPROD) && p.CODPROD > 0)
      .filter((p) => (p.CODBARRAS.length > 0) || !!p.CODBARRA);

    if (validos.length === 0) {
      throw new BadRequestException('Nenhum produto válido recebido (precisa CODPROD e ao menos 1 código de barras).');
    }

    const uniqMap = new Map<number, any>();
    for (const p of validos) uniqMap.set(p.CODPROD, p);
    const uniq = Array.from(uniqMap.values());

    const authTokenIfood = await this.getValidAccessToken();
    const merchantID = await this.getMerchantId(authTokenIfood);

    let items: IfoodIngestionItem[] = [];
    const authTokenSankhya = await this.sankhyaService.login();

    try {
      for (const p of uniq) {
        const barcode = (String(p.CODBARRA ?? '').trim() || p.CODBARRAS?.[0] || '').trim();

        let unidade: string | null = null;

        try {
          // Isolado para evitar que erro em um único produto quebre o array inteiro
          const produto = await this.sankhyaService.getProdutoInfos(p.CODPROD, authTokenSankhya);
          if (produto) {
            unidade = produto.UNIDADE || produto.CODVOL || null;
          }
        } catch (e) {
          this.logger.warn(`Erro ao buscar infos do CODPROD ${p.CODPROD}. Será enviado com mock.`);
        }

        // Tratamento rigoroso para o formato exigido pelo iFood
        const categoriaTratada = p.DESCRGRUPOPROD ? p.DESCRGRUPOPROD.slice(0, 50) : 'Diversos';

        items.push({
          barcode: barcode,
          name: (p.DESCRPROD ?? `PROD ${p.CODPROD}`).toString().slice(0, 120),
          plu: String(p.CODPROD),
          active: false, // Forçamos inativo para não ir pra loja antes da hora
          inventory: { stock: 0 },
          details: {
            categorization: {
              department: 'Geral', // iFood EXIGE departamento
              category: categoriaTratada,
              subCategory: null
            },
            brand: p.MARCA ? p.MARCA.slice(0, 50) : 'Genérica',
            unit: 'UNIT', // iFood EXIGE padrão UNIT ou KG. Ignoramos o Sankhya aqui na criação.
            volume: null,
            imageUrl: null,
            description: '',
            nearExpiration: false,
            family: null,
          },
          prices: {
            price: 10, // iFood REJEITA itens com preço 0 na carga inicial
            promotionPrice: null
          },
          scalePrices: null,
          multiple: null,
          channels: null,
        });
      }
    } finally {
      await this.sankhyaService.logout(authTokenSankhya, "cadastrarProdutosIfood");
    }

    this.logger.log(`cadastrarProdutosIfood: recebidos=${list.length} válidos=${validos.length} uniq=${uniq.length} envio=${items.length}`);

    const resp = await this.sendItemIngestion(authTokenIfood, merchantID, items);

    return {
      message: `Produtos enviados para o iFood: ${items.length}`,
      sent: items.length,
      merchantID,
      response: resp,
    };
  }

}
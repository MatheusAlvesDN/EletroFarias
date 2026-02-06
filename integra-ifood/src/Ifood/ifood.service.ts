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

const axios = require('axios');

async function checkIngestionStatus(integrationId, token) {
  const url = `https://merchant-api.ifood.com.br/item/v1.0/ingestion/status/${integrationId}`;

  try {
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    console.log('Resposta de Status:', JSON.stringify(response.data, null, 2));

    // Verifica o estado geral
    if (response.data.status === 'COMPLETED') {
      console.log('✅ Todos os itens foram processados com sucesso!');
    } else if (response.data.status === 'IN_PROGRESS') {
      console.log('⏳ Ainda processando... aguarde alguns segundos e tente novamente.');
    } else if (response.data.status === 'COMPLETED_WITH_ERRORS') {
      console.log('⚠️ Concluído, mas alguns itens tiveram erro.');
    }
  } catch (error) {
    console.error('Erro ao buscar status:', error.response ? error.response.data : error.message);
  }
}

// Substitua pelo seu token atual





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

  /*

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

    for (const item of items){
      console.log(item)
    }

    try {
      const response = await firstValueFrom(
        this.http.post(url, items, { headers }),
      );
      console.log(response)
      checkIngestionStatus(response.data, authToken);
      return response.data;
    } catch (error) {
      console.error('Erro ao enviar item:', error.response?.data || error);
      throw error;
    }
  }

  */

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
    // 1. Configurações de lote (Chunking)
    const BATCH_SIZE = 200; // Tamanho seguro para o payload
    const totalItems = items.length;

    // Se reset=true, não podemos enviar em lotes separadas, pois o lote 2 apagaria o lote 1.
    // Nesse caso, assumimos o risco de enviar tudo ou forçamos reset=false.
    if (reset && totalItems > BATCH_SIZE) {
      console.warn('ATENÇÃO: reset=true com muitos itens. Isso pode falhar por tamanho de payload. Considere usar reset=false.');
    }

    // Dividir em chunks (apenas se não for reset total, ou se o usuário aceitar o risco)
    // Para simplificar a lógica segura: Se for reset=true, enviamos tudo. Se for false, quebramos.
    const chunks = reset ? [items] : this.chunkArray(items, BATCH_SIZE);

    console.log(`Iniciando sincronização de ${totalItems} itens em ${chunks.length} lote(s). Modo Reset: ${reset}`);

    const results: { batchId: string; status: any }[] = [];
    for (const [index, chunk] of chunks.entries()) {
      try {
        console.log(`Enviando lote ${index + 1}/${chunks.length} com ${chunk.length} itens...`);

        // URL dinâmica baseada no parametro reset
        const url = `https://merchant-api.ifood.com.br/item/v1.0/ingestion/${merchantId}?reset=${reset}`;

        const headers = {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        };

        const response = await firstValueFrom(
          this.http.post(url, chunk, { headers }),
        );

        const batchId = response.data?.batchId;
        console.log(`Lote ${index + 1} enviado. BatchID: ${batchId}`);

        if (batchId) {
          // Chama a função de verificação (polling)
          const status = await this.pollIngestionStatus(authToken, merchantId, batchId);
          results.push({ batchId, status });
        }

      } catch (error) {
        console.error(`Erro ao enviar lote ${index + 1}:`, error.response?.data || error.message);
        // Opcional: throw error para parar tudo ou continue para tentar o próximo lote
      }
    }

    return results;
  }

  private async pollIngestionStatus(authToken: string, merchantId: string, batchId: string, attempts = 0): Promise<any> {
    const MAX_ATTEMPTS = 10;
    const DELAY_MS = 2000; // 2 segundos

    if (attempts >= MAX_ATTEMPTS) {
      console.warn(`Parando de monitorar batch ${batchId} após ${MAX_ATTEMPTS} tentativas.`);
      return { status: 'TIMEOUT_POLLING' };
    }

    const url = `https://merchant-api.ifood.com.br/item/v1.0/ingestion/${merchantId}/${batchId}`;
    const headers = { Authorization: `Bearer ${authToken}` };

    try {
      // Aguarda um pouco antes de consultar
      await new Promise(resolve => setTimeout(resolve, DELAY_MS));

      const response = await firstValueFrom(this.http.get(url, { headers }));
      const data = response.data;

      // Status possíveis: PENDING, IN_PROGRESS, COMPLETED, FAILED
      console.log(`Status Batch ${batchId}: ${data.status}`);

      if (data.status === 'COMPLETED') {
        return data; // Sucesso
      }

      if (data.status === 'FAILED') {
        console.error('Batch falhou:', data.errors);
        return data; // Falha
      }

      // Se ainda estiver PENDING ou IN_PROGRESS, tenta de novo recursivamente
      return this.pollIngestionStatus(authToken, merchantId, batchId, attempts + 1);

    } catch (error) {
      console.error(`Erro ao consultar status do batch ${batchId}`, error);
      return null;
    }
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    // AQUI ESTÁ A CORREÇÃO: Adicionamos ': T[][]'
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

    // iFood usually returns the created category object (id, name, status, etc.)
    return response.data;
  }




  //#endregion


}
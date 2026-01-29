import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

interface TokenData {
  accessToken: string;
  expiration: number;
}

@Injectable()
export class IfoodService {
  private readonly logger = new Logger(IfoodService.name);
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly loginUrl: string;
  private readonly merchantId: string;
  private readonly catalogId: string;
  private readonly tokenFilePath = path.join(os.tmpdir(), 'ifood-token.json');

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
      this.http.get(
        'https://merchant-api.ifood.com.br/merchant/v1.0/merchants',
        {
          headers: {
            Authorization: `bearer ${authToken}`,
          },
        },
      ),
    );

    const merchants = response.data;
    if (!merchants || merchants.length === 0) {
      throw new Error('Nenhum merchant encontrado para esta conta.');
    }

    // Retorna o ID do primeiro merchant encontrado
    return merchants[0].id;
  }

  async getFirstCatalog(
    merchantId: string,
    authToken: string,
  ): Promise<string> {
    const response = await firstValueFrom(
      this.http.get(
        `https://merchant-api.ifood.com.br/catalog/v2.0/merchants/${merchantId}/catalogs`,
        {
          headers: {
            Authorization: `bearer ${authToken}`,
          },
        },
      ),
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

  async getAllItemsFromCategories(
    accessToken: string,
    merchantId: string,
    catalogId: string,
  ): Promise<any[]> {
    const url = `https://merchant-api.ifood.com.br/catalog/v2.0/merchants/${merchantId}/catalogs/${catalogId}/categories?includeItems=true`;

    const headers = {
      Authorization: `Bearer ${accessToken}`,
    };

    const response = await firstValueFrom(this.http.get(url, { headers }));

    const categorias = response.data;

    if (!Array.isArray(categorias)) {
      this.logger.warn('Resposta inesperada da API do iFood');
      return [];
    }

    // 🔁 Flatten: junta todos os items de cada categoria em um array único
    const allItems = categorias.flatMap((categoria) => categoria.items || []);

    this.logger.log(`Total de produtos encontrados: ${allItems.length}`);

    return allItems;
  }

  //#endregion

  //#region Exclusão de produtos
  async deleteCategory(
    merchantId: string,
    categoryId: string,
    token: string,
  ): Promise<void> {
    const url = `https://merchant-api.ifood.com.br/catalog/v2.0/merchants/${merchantId}/categories/${categoryId}`;

    try {
      const response = await firstValueFrom(
        this.http.delete(url, {
          headers: {
            Authorization: `Bearer ${token}`, // ou só `token` se não usar Bearer
          },
        }),
      );

      console.log('Categoria excluída com sucesso:', response.status);
    } catch (error) {
      console.error(
        'Erro ao excluir categoria:',
        error?.response?.data || error.message,
      );
      throw error;
    }
  }

  async deleteAllProductsFromCategory(
    merchantId: string,
    authToken: string,
    category: { items: any[] },
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
        console.warn(
          `⚠️ Produto com externalCode ${externalCode} tem productId inválido: ${productId}`,
        );
        continue;
      }

      try {
        await firstValueFrom(
          this.http.delete(
            `https://merchant-api.ifood.com.br/catalog/v1.0/merchants/${merchantId}/products/${productId}`,
            { headers },
          ),
        );
        console.log(
          `✅ Produto ${externalCode} com ID ${productId} deletado com sucesso.`,
        );
      } catch (error: any) {
        console.error(
          `❌ Erro ao deletar produto ${externalCode} (${productId}):`,
          error.response?.data || error.message,
        );
      }
    }
  }

  async deleteAllProducts(
    merchantId: string,
    authToken: string,
    products: { externalCode: string; productId: string }[],
  ): Promise<void> {
    const headers = {
      Authorization: `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    };

    for (const { externalCode, productId } of products) {
      if (!productId || productId.length !== 36) {
        console.warn(
          `ID inválido para o externalCode ${externalCode}: ${productId}`,
        );
        continue;
      }

      try {
        await firstValueFrom(
          this.http.delete(
            `https://merchant-api.ifood.com.br/catalog/v1.0/merchants/${merchantId}/products/${productId}`,
            { headers },
          ),
        );
        console.log(
          `✅ Produto ${externalCode} com ID ${productId} deletado com sucesso.`,
        );
      } catch (error: any) {
        console.error(
          `❌ Erro ao deletar produto ${externalCode} (${productId}):`,
          error.response?.data || error.message,
        );
      }
    }
  }

  async getCategoriesByCatalog(
    merchantId: string,
    catalogId: string,
    authToken: string,
  ): Promise<any> {
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

  async updateCategory(
    //Não esta em uso no momento
    merchantId: string,
    catalogId: string,
    categoryId: string,
    data: {
      name: string;
      externalCode: string;
      status: 'AVAILABLE' | 'UNAVAILABLE';
      index: number;
    },
    authToken: string,
  ): Promise<any> {
    const url = `https://merchant-api.ifood.com.br/catalog/v2.0/merchants/${merchantId}/catalogs/${catalogId}/categories/${categoryId}`;

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    };

    try {
      const response = await firstValueFrom(
        this.http.patch(url, data, { headers }),
      );
      return response.data;
    } catch (error: any) {
      console.error(
        'Erro ao atualizar categoria:',
        error?.response?.data || error.message,
      );
      throw error;
    }
  }

  async updateProductInventory(
    merchantId: string,
    authToken: string,
    productId: string,
    amount: number,
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
          { headers },
        ),
      );

      console.log(
        `📦 Estoque atualizado para o produto ${productId} com quantidade ${amount}`,
      );
      return response.data;
    } catch (error: any) {
      console.error(
        `❌ Erro ao atualizar estoque do produto ${productId}:`,
        error.response?.data || error.message,
      );
      throw error;
    }
  }

  async updateAllProductInventories(
    merchantId: string,
    authToken: string,
    productsWithPricesQuantities: { productId: string; quantity: number }[],
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
            { headers },
          ),
        );
        console.log(
          `📦 Estoque atualizado: ${product.productId} -> ${product.quantity}`,
        );
      } catch (error: any) {
        console.error(
          `❌ Erro ao atualizar estoque do produto ${product.productId}:`,
          error.response?.data || error.message,
        );
      }
    }
  }
  //#endregion

  //#region Metodos para debug

  //#endregion
}

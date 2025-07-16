import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import * as fs from 'fs';
import * as path from 'path';

interface TokenData {
  accessToken: string;
  expiration: number;
}

@Injectable()
export class IfoodService {
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


  //#region Cadastro de produtos no ifood
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

  async createCategory(
    categoryName: string,
    externalCode: string,
    authToken: string
  ): Promise<string> {
    const url = `https://merchant-api.ifood.com.br/catalog/v2.0/merchants/${this.merchantId}/catalogs/${this.catalogId}/categories`;

    const payload = {
      name: categoryName,
      status: 'AVAILABLE',
      externalCode,
      index: 0,
      template: 'DEFAULT',
    };

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    };

    try {
      const response = await firstValueFrom(this.http.post(url, payload, { headers }));
      return response.data?.id ?? null; // Categoria criada com sucesso
    } catch (err: any) {
      const status = err.response?.status;
      const errBody = err.response?.data;

      if (status === 409) {
        const conflictId = errBody?.error?.conflictingResources?.[0];
        if (typeof conflictId === 'string') {
          return conflictId; // ID da categoria já existente
        }

        console.warn('Conflito sem ID reconhecível:', errBody);
        return "ERROR";
      }

      console.error('Erro ao criar categoria:', errBody || err.message || err);
      return "ERROR";
    }
  }

  async createProduct(
    product: {
      externalCode: string;
      name: string;
      description: string;
      serving: string;
      imagePath: string;
    },
    merchantId: string,
    categoryId: string,
    authToken: string,
  ) {
    const url = `https://merchant-api.ifood.com.br/catalog/v2.0/merchants/${merchantId}/products`;

    const body = {
      name: product.name,
      description: product.description || 'Produto sem descrição',
      serving: product.serving || 'SERVES_1',
      externalCode: product.externalCode,
      imagePath: product.imagePath,
      categories: [
        {
          id: categoryId,
        },
      ],
    };

    // Debug log para garantir que o payload está correto
    console.log('Enviando produto para iFood:', JSON.stringify(body, null, 2));

    try {
      const response = await firstValueFrom(
        this.http.post(url, body, {
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
        }),
      );

      return response.data;
    } catch (error: any) {
      const responseData = error?.response?.data;
      console.error(
        `Erro ao criar produto ${product.externalCode}:`,
        JSON.stringify(responseData, null, 2) || error.message,
      );
      throw error;
    }
  }

  async createAllProducts(
    products: Array<{
      externalCode: string;
      name: string;
      description: string;
      serving: string;
      imagePath: string;
    }>,
    merchantId: string,
    categoryId: string,
    authToken: string,
  ): Promise<Array<{
    externalCode: string;
    success: boolean;
    data?: any;
    error?: any;
  }>> {
    return await Promise.all(
      products.map(async (product) => {
        try {
          const created = await this.createProduct(product, merchantId, categoryId, authToken);
          return {
            externalCode: product.externalCode,

            success: true,
            data: created,
          };
        } catch (error) {
          return {
            externalCode: product.externalCode,
            success: false,
            error,
          };
        }
      }),
    );
  }

  async createItemOnIfood(
    merchantId: string,
    authToken: string,
    productId: string,
    externalCode: string,
    categoryId: string,
    priceValue: number,
    originalValue: number = priceValue,
    quantity: number
  ): Promise<any> {
    const headers = {
      Authorization: `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    };

    const body = {
      item: {
        type: 'DEFAULT',
        categoryId,
        status: 'AVAILABLE',
        price: {
          value: priceValue,
          originalValue,
        },
        externalCode,
        index: 0,
        productId,
        tags: ['FROSTY'],
        stock: {
          quantity: quantity, // ✅ Corrigido: 'stock.quantity' ao invés de 'quantity'
        },
      },
    };

    try {
      const response = await firstValueFrom(
        this.http.put(
          `https://merchant-api.ifood.com.br/catalog/v2.0/merchants/${merchantId}/items`,
          body,
          { headers }
        )
      );

      console.log(`✅ Item criado com sucesso para o produto ${externalCode} com quantidade ${quantity}`);
      return response.data;
    } catch (error: any) {
      console.error(`❌ Erro ao criar item para ${externalCode}:`, error.response?.data || error.message);
      throw error;
    }
  }

  async createItemsLot(
    merchantId: string,
    authToken: string,
    itemsArray: {
      externalCode: string;
      success: boolean;
      data?: {
        id: string;
        name: string;
        description: string;
        externalCode: string;
        image: string;
        shifts: any[];
        serving: string;
        dietaryRestrictions: any[];
        weight: object;
        industrialized: boolean;
      };
    }[],
    categoryId: string,
    priceAndQuantity: { externalCode: string; valor: number, quantity: number }[]
  ) {
    const priceAndQuantityMap = new Map(
      priceAndQuantity.map(p => [p.externalCode, { valor: p.valor, quantity: p.quantity }])
    );

    for (const item of itemsArray) {
      if (item.success && item.data?.id) {
        const itemPriceAndQuantity = priceAndQuantityMap.get(item.externalCode);
        const preco = itemPriceAndQuantity?.valor ?? 0;
        const quantity = itemPriceAndQuantity?.quantity ?? 0;

        try {
          await this.createItemOnIfood(
            merchantId,
            authToken,
            item.data.id,
            item.externalCode,
            categoryId,
            preco,
            preco,
            quantity
          );
        } catch (error) {
          console.error(`Erro ao criar item para externalCode ${item.externalCode}`, error);
        }
      } else {
        console.warn(`Item com externalCode ${item.externalCode} não está com sucesso ou não possui ID.`);
      }
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

  async getProductIdIfood(
    merchantId: string,
    authToken: string,
    allProducts: { externalCode: string }[]
  ): Promise<Record<string, string>> {
    const headers = {
      Authorization: `Bearer ${authToken}`,
    };

    const limit = 200;
    let page = 1;
    let allProductsFromApi: any[] = [];

    while (true) {
      const response = await firstValueFrom(
        this.http.get(
          `https://merchant-api.ifood.com.br/catalog/v2.0/merchants/${merchantId}/products`,
          {
            headers,
            params: { limit, page },
          }
        )
      );

      const productsPage = response.data?.elements ?? [];
      allProductsFromApi = allProductsFromApi.concat(productsPage);

      if (productsPage.length < limit) break;
      page++;
    }

    // Normaliza e filtra os externalCodes locais
    const externalCodesSet = new Set(
      allProducts
        .map(p => p.externalCode?.toString().trim())
        .filter(code => !!code)
    );

    // Mapeia os produtos existentes na API do iFood
    const map: Record<string, string> = {};
    for (const prod of allProductsFromApi) {
      const code = prod.externalCode?.toString().trim();
      const id = prod.id?.toString();
      if (code && id && externalCodesSet.has(code)) {
        map[code] = id;
      }
    }

    return map;
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
  //#endregion

  //#region Metodos para debug

  async getAllProductsFromIfood(
    merchantId: string,
    authToken: string,
  ): Promise<any[]> {
    const headers = {
      Authorization: `Bearer ${authToken}`,
    };

    const limit = 200;
    let page = 0;
    const allProducts: any[] = [];

    while (true) {
      const response = await firstValueFrom(
        this.http.get(
          `https://merchant-api.ifood.com.br/catalog/v2.0/merchants/${merchantId}/products`,
          {
            headers,
            params: { limit, page },
          },
        ),
      );

      const produtos = response.data?.elements ?? [];
      allProducts.push(...produtos);

      if (produtos.length < limit) break;
      page++;
    }

    return allProducts;
  } //chamada para puxar todos os produtos cadastrados
  async deleteAllProducts2(
    merchantId: string,
    authToken: string,
    products: { externalCode: string; id: string }[] // <-- usa "id" aqui
  ): Promise<void> {
    const headers = {
      Authorization: `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    };

    for (const { externalCode, id } of products) {
      if (!id || id.length !== 36) {
        console.warn(`ID inválido para o externalCode ${externalCode}: ${id}`);
        continue;
      }

      try {
        await firstValueFrom(
          this.http.delete(
            `https://merchant-api.ifood.com.br/catalog/v1.0/merchants/${merchantId}/products/${id}`,
            { headers }
          )
        );
        console.log(`✅ Produto ${externalCode} com ID ${id} deletado com sucesso.`);
      } catch (error: any) {
        console.error(
          `❌ Erro ao deletar produto ${externalCode} (${id}):`,
          error.response?.data || error.message
        );
      }
    }
  } //chamada para excluir todos os produtos

  //#endregion

}
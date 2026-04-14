import { Controller, Post, Get, Query, Body, BadRequestException } from '@nestjs/common';
import { IfoodService } from './ifood.service';

@Controller('ifood')
export class IfoodController {
  constructor(private readonly ifoodService: IfoodService) { }

  @Post('sync-product')
  async syncProduct(@Query('id') idString: string) {
    const productId = parseInt(idString, 10);
    if (isNaN(productId)) {
      throw new BadRequestException('ID de produto inválido. Por favor, forneça um número.');
    }
    return this.ifoodService.syncProductToIfood(productId);
  }

  @Post('delete-product')
  async deleteProduct(@Query('id') idString: string) {
    const productId = parseInt(idString, 10);
    if (isNaN(productId)) {
      throw new BadRequestException('ID de produto inválido. Por favor, forneça um número.');
    }
    return this.ifoodService.deleteProductFromIfood(productId);
  }

  @Get('categories')
  async getAllCategories() {
    return this.ifoodService.getAllCategoriesConfig();
  }

  @Post('cadastrar-produtos')
  async cadastrarProdutosIfood(@Body() body: { produtos?: any[] }) {
    const produtos = Array.isArray(body?.produtos) ? body.produtos : [];
    return await this.ifoodService.cadastrarProdutosIfood(produtos);
  }

  @Get('descobrir-catalogo')
  async descobrirCatalog() {
    const token = await this.ifoodService.getValidAccessToken();

    // O "as string" garante ao TypeScript que o valor não é undefined
    const merchantId = process.env.IFOOD_MERCHANT_ID as string;

    const catalogId = await this.ifoodService.getFirstCatalog(merchantId, token);
    console.log("MEU CATALOG ID É:", catalogId);
    return { catalogId };
  }

  @Get('verificar-catalogo')
  async verificarCatalogo() {
    const token = await this.ifoodService.getValidAccessToken();
    const merchantId = process.env.IFOOD_MERCHANT_ID as string;
    const catalogId = process.env.IFOOD_CATALOG_ID as string;

    const items = await this.ifoodService.getAllItemsFromCategories(token, merchantId, catalogId);

    return {
      total_encontrado: items.length,
      itens: items
    };
  }
}
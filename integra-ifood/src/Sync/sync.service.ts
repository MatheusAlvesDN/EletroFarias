import { Injectable } from '@nestjs/common';
import { SankhyaService } from '../Sankhya/sankhya.service';
import { IfoodService } from '../Ifood/ifood.service';

@Injectable()
export class SyncService {
    constructor(
        private readonly sankhyaService: SankhyaService,
        private readonly ifoodService: IfoodService,
    ) { }

    async authenticationKeys() {
        const authTokenSankhya = await this.sankhyaService.login();
        const authTokenIfood = await this.ifoodService.getValidAccessToken();
        const merchantID = await this.ifoodService.getMerchantId(authTokenIfood);
        return {

        }
    }

    async createCategoryByProdId(productId: number): Promise<void> { //Ciclo de cadastro de produtos, itens e categoria
        const authTokenSankhya = await this.sankhyaService.login();
        const authTokenIfood = await this.ifoodService.getValidAccessToken();
        const merchantID = await this.ifoodService.getMerchantId(authTokenIfood);
        const catalogId = await this.ifoodService.getFirstCatalog(merchantID, authTokenIfood)
        // 1. Buscar dados do produto (para saber qual o grupo e nome da categoria)
        const produto = await this.sankhyaService.getProduto(productId, authTokenSankhya);
        const groupName = produto.f6?.['$'];
        const groupIdSankhya = produto.f5?.['$'];
        const allProducts = await this.sankhyaService.getProductsByGroup(groupIdSankhya,groupName,authTokenSankhya)
        const allProductsWithPrice = await this.sankhyaService.enrichWithPricesFromProductList(allProducts,0,authTokenSankhya)
        const allProductsWithPriceStock = await this.sankhyaService.getStockInLot(allProductsWithPrice,1100,authTokenSankhya);
        const newproduto = await this.ifoodService.sendItemIngestion(authTokenIfood, merchantID,allProductsWithPriceStock);


        console.log(allProductsWithPriceStock);
        await this.sankhyaService.logout(authTokenSankhya);
    }

    async deleteCategoryByProdId(productId: number): Promise<void> {
        const authTokenSankhya = await this.sankhyaService.login();
        const authTokenIfood = await this.ifoodService.getValidAccessToken();
        const merchantID = await this.ifoodService.getMerchantId(authTokenIfood);
        const catalogId = await this.ifoodService.getFirstCatalog(merchantID, authTokenIfood)
        const produto = await this.sankhyaService.getProduto(productId, authTokenSankhya);
    console.log(produto);
    }

    async getAllCategories(): Promise<any> {
        const authTokenIfood = await this.ifoodService.getValidAccessToken();
        const authTokenSankhya = await this.sankhyaService.login();
        const merchantID = await this.ifoodService.getMerchantId(authTokenIfood);
        const catalogID = await this.ifoodService.getFirstCatalog(merchantID, authTokenIfood);
        const allCategories = await this.ifoodService.getCategoriesByCatalog(merchantID, catalogID, authTokenIfood);

        console.log('fetched')

        return allCategories
    }

    async updateInventory(): Promise<any> {
        const authTokenSankhya = await this.sankhyaService.login();
        const authTokenIfood = await this.ifoodService.getValidAccessToken();
        const merchantID = await this.ifoodService.getMerchantId(authTokenIfood);
        const catalogId = await this.ifoodService.getFirstCatalog(merchantID, authTokenIfood)
        const allProducts = await this.ifoodService.getAllProductsFromIfood(merchantID, authTokenIfood)

    }



    async testNewServices(): Promise<any> {
        const authTokenSankhya = await this.sankhyaService.login();
        const authTokenIfood = await this.ifoodService.getValidAccessToken();
        const merchantID = await this.ifoodService.getMerchantId(authTokenIfood);

        const teste = await this.sankhyaService.getPrecosProdutosTabelaBatch([44, 38], 0, authTokenSankhya)
        console.log(teste)

    }


}
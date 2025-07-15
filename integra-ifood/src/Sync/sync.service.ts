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
        // 2. Criar categoria no iFood
        const categoryIdIfood = await this.ifoodService.createCategory(groupName, groupIdSankhya, authTokenIfood);
        // 3. Buscar todos os produtos desse grupo de uma vez -> 
        const allProducts = await this.sankhyaService.getProductsByGroup(groupIdSankhya, categoryIdIfood, authTokenSankhya);
        const newProducts = await this.ifoodService.createAllProducts(allProducts, merchantID, groupIdSankhya, authTokenIfood);
        const productsCodesWithPrices = await this.sankhyaService.enrichWithPrices(newProducts, 0, authTokenSankhya);
        const productsWithPricesQuantities = await this.sankhyaService.enrichWithStock(productsCodesWithPrices, 1100, authTokenSankhya);
        await this.ifoodService.updateAllProductInventories(
            merchantID,
            authTokenIfood,
            productsWithPricesQuantities // array com { productId, quantity }
        );
        const newItems = await this.ifoodService.createItemsLot(merchantID, authTokenIfood, newProducts, categoryIdIfood, productsWithPricesQuantities);
        // 4. Buscar os preços de todos os produtos de uma vez só
        //const precos = await this.sankhyaService.getPrecosProdutosTabela(codigosProdutos, 0, authTokenSankhya);
        // await this.ifoodService.createItem(merchantID, authTokenIfood, allProducts[0])


        // 5. Criar produtos no catalogo do ifood



        console.log(newItems);
        await this.sankhyaService.logout(authTokenSankhya);
    }

    async deleteCategoryByProdId(productId: number): Promise<void> {
        const authTokenSankhya = await this.sankhyaService.login();
        const authTokenIfood = await this.ifoodService.getValidAccessToken();
        const merchantID = await this.ifoodService.getMerchantId(authTokenIfood);
        const catalogId = await this.ifoodService.getFirstCatalog(merchantID, authTokenIfood);
        const produto = await this.sankhyaService.getProduto(productId, authTokenSankhya);
        const groupIdSankhya: string = produto?.f5?.['$']; //recebe o codigo do grupo ao qual o produto parametro faz parte
        if (!groupIdSankhya) {
            throw new Error('groupIdSankhya não encontrado no produto');
        }

        const allCategories = await this.ifoodService.getCategoriesByCatalog(merchantID, catalogId, authTokenIfood);
        const productsInCategory = allCategories.find((cat: any) => cat.externalCode === groupIdSankhya);
        if (!productsInCategory) {
            throw new Error(`Categoria com externalCode ${groupIdSankhya} não encontrada no catálogo.`);
        }
        //console.log(productsInCategory)
        await this.ifoodService.deleteAllProductsFromCategory(merchantID,authTokenIfood,productsInCategory);
        await this.ifoodService.deleteCategory(merchantID,productsInCategory.id,authTokenIfood);
    }

    async getAllCategories(): Promise<any> {
        const authTokenIfood = await this.ifoodService.getValidAccessToken();
        const merchantID = await this.ifoodService.getMerchantId(authTokenIfood);
        const catalogID = await this.ifoodService.getFirstCatalog(merchantID, authTokenIfood);
        const allCategories = await this.ifoodService.getCategoriesByCatalog(merchantID, catalogID, authTokenIfood);
        console.log('fetched')
        return allCategories
    }

    async testNewServices(productId: number): Promise<any> {
        const authTokenSankhya = await this.sankhyaService.login();
        const authTokenIfood = await this.ifoodService.getValidAccessToken();
        const merchantID = await this.ifoodService.getMerchantId(authTokenIfood);

    }

    
}
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SankhyaService } from '../Sankhya/sankhya.service';
import { IfoodService } from '../Ifood/ifood.service';
import { Fidelimax } from '../Fidelimax/fidelimax.service'

@Injectable()
export class SyncService {
    private readonly logger = new Logger(SyncService.name);
    constructor(
        private readonly sankhyaService: SankhyaService,
        private readonly ifoodService: IfoodService,
        private readonly fidelimaxService: Fidelimax,
    ) { }

    //#region Ifood-Sankhya
    async createCategoryByProdId(productId: number): Promise<void> { //Ciclo de cadastro de produtos, itens e categoria
        const authTokenSankhya = await this.sankhyaService.login();
        const authTokenIfood = await this.ifoodService.getValidAccessToken();
        const merchantID = await this.ifoodService.getMerchantId(authTokenIfood);
        // 1. Buscar dados do produto (para saber qual o grupo e nome da categoria)
        const produto = await this.sankhyaService.getProduto(productId, authTokenSankhya);
        const groupName = produto.f6?.['$'];
        const groupIdSankhya = produto.f5?.['$'];
        const produtosValidos = await this.sankhyaService.filterInvalidEanAndExport(groupIdSankhya, groupName, authTokenSankhya);
        const allProductsWithPrice = await this.sankhyaService.enrichWithPricesFromProductList(produtosValidos, 0, authTokenSankhya)
        const allProductsWithPriceStock = await this.sankhyaService.getStockInLot(allProductsWithPrice, 1100, authTokenSankhya);
        const newproduto = await this.ifoodService.sendItemIngestion(authTokenIfood, merchantID, allProductsWithPriceStock);
        this.logger.log(allProductsWithPriceStock);
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
        console.log(allCategories)

        return allCategories
    }

    async updateInventory(): Promise<any> {
        const authTokenSankhya = await this.sankhyaService.login();
        const authTokenIfood = await this.ifoodService.getValidAccessToken();
        const merchantID = await this.ifoodService.getMerchantId(authTokenIfood);
        const catalogId = await this.ifoodService.getFirstCatalog(merchantID, authTokenIfood);

        console.log('allProducts')
    }

    //@Cron('*/15 * * * * *') // A cada 15 min
    async updateIfoodStock() {
        const authTokenIfood = await this.ifoodService.getValidAccessToken();
        const authTokenSankhya = await this.sankhyaService.login();
        const merchantID = await this.ifoodService.getMerchantId(authTokenIfood);
        const catalogId = await this.ifoodService.getFirstCatalog(merchantID, authTokenIfood);
        const allItems = await this.ifoodService.getAllItemsFromCategories(authTokenIfood, merchantID, catalogId); //retorna todos os produtos cadastrados.
        //const allProductsWithPrice = await this.sankhyaService.enrichWithPricesFromProductList(allItems, 0, authTokenSankhya);
        //const updatedStockProducts = await this.sankhyaService.getStockInLot(allItems, 1100, authTokenSankhya); //atualiza o preço de todos os produtos.
        // Comparar allitens com updatedStockProducts para enviar apenas os produtos que tiverem diferença em preço ou quantidade [inserir aqui]
        //const newproduto = await this.ifoodService.sendItemIngestion(authTokenIfood, merchantID, updatedStockProducts);
        const produto = await this.sankhyaService.getProduto(17842, authTokenSankhya);
        const groupName = produto.f6?.['$'];
        const groupIdSankhya = produto.f5?.['$'];

        const allProducts = await this.sankhyaService.getProductsByGroup(groupIdSankhya, groupName, authTokenSankhya)
        await this.sankhyaService.logout(authTokenSankhya);
        this.logger.log(allItems);
    }

    //#endregion

    //#region fidelimax-Sankhya

    //@Cron('*/15 * * * * *') // Executa todos os dias as 23:00 - Pontua todos os vend tecnicos e cadastra na plataforma.
    async updatePointsFidelimax() {
        const sankhyaToken = await this.sankhyaService.login();
        const hoje = new Date();
        const dataHojeFormatada = hoje.toLocaleDateString('pt-BR');
        const pedidos = await this.sankhyaService.getNoteVendas(dataHojeFormatada, sankhyaToken);
        const parceiro = await this.sankhyaService.enrichNoteWithCODPAR(pedidos, sankhyaToken);
        const clientes = await this.fidelimaxService.pontuarNotasNaFidelimax(parceiro);
        this.logger.log(clientes);
        // Aqui você pode continuar o processamento, como inserção na carga full etc.
    }

    //@Cron('*/15 * * * * *') // Executa todos os dias as 23:00 - Pontua todas as dev e cadastra na plataforma.
    async updateDevolFidelimax() {
        const sankhyaToken = await this.sankhyaService.login();
        const hoje = new Date();
        const dataHojeFormatada = hoje.toLocaleDateString('pt-BR');
        const pedidos = await this.sankhyaService.getNoteDevol('25/07/2025', sankhyaToken);
        this.logger.log(pedidos);

    }

    //@Cron('*/15 * * * * *')
    async teste() {//Solicitação para ler planilha de produtos, os que possuirem EAN validos atualizar para o sankhya > cadastrar no ifood > retirar da planilha
        const sankhyaToken = await this.sankhyaService.login();
        const tabelaEanXLSX = await this.sankhyaService.updateEAN();
        const produtosWithEan =
            await this.sankhyaService.atualizarProduto(sankhyaToken, '1427', '1234567891012')
        this.logger.log(tabelaEanXLSX);
        await this.sankhyaService.logout(sankhyaToken);
        return tabelaEanXLSX
    }
    //#endregion

}
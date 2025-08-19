import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SankhyaService } from '../Sankhya/sankhya.service';
import { IfoodService } from '../Ifood/ifood.service';
import { Fidelimax } from '../Fidelimax/fidelimax.service'
import { TransporteMais } from '../Transporte+/transport.service'

function filtrarEanCom13Digitos(produtos: { cod: string; name: string; ean: string }[]) {
    return produtos.filter(prod => /^\d{13}$/.test(prod.ean));
}



@Injectable()
export class SyncService {
    private readonly logger = new Logger(SyncService.name);
    constructor(
        private readonly sankhyaService: SankhyaService,
        private readonly ifoodService: IfoodService,
        private readonly fidelimaxService: Fidelimax,
        private readonly transporteMais: TransporteMais,
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
    private toBRDate(input: string): string {
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(input)) return input; // já está em dd/MM/yyyy
        const d = new Date(input);
        return isNaN(d.getTime()) ? new Date().toLocaleDateString('pt-BR') : d.toLocaleDateString('pt-BR');
    }

    //@Cron('*/15 * * * * *') // Executa todos os dias as 23:00 - Pontua todos os vend tecnicos e cadastra na plataforma.
    async updatePointsFidelimax() {
        const sankhyaToken = await this.sankhyaService.login();
        const hoje = new Date();
        const dataHojeFormatada = hoje.toLocaleDateString('pt-BR');

        // Pontuar vendas do dia
        const vendasTecnicas = await this.sankhyaService.getNoteVendasTec(dataHojeFormatada, sankhyaToken);
        const vendas = await this.sankhyaService.getNoteNOTVendasTec(dataHojeFormatada, sankhyaToken);
        const parceiros = await this.sankhyaService.enrichNoteWithCODPAR(vendas, sankhyaToken);
        const parceirosWithTecnicos = await this.sankhyaService.enrichNoteWithCODPAR(vendasTecnicas, sankhyaToken);
        const todosParceiros = [...parceiros, ...parceirosWithTecnicos];
        const clientes = await this.fidelimaxService.pontuarNotasNaFidelimax(todosParceiros);

        // Estornar pontuação por devol
        const devolNotTec = await this.sankhyaService.getNoteDevolNOTVendasTec(dataHojeFormatada, sankhyaToken);
        const devolWithTec = await this.sankhyaService.getNoteDevolWithVendTec(dataHojeFormatada, sankhyaToken);
        const todosDevol = [...devolNotTec, ...devolWithTec];
        const allDevolParceiros = await this.sankhyaService.enrichNoteWithCODPAR(todosDevol, sankhyaToken);
        const estornarclientes = await this.fidelimaxService.debitarConsumidores(allDevolParceiros);
        this.logger.log(estornarclientes);
    }


    //@Cron('*/15 * * * * *') // UpdateIfood
    async teste() {
        const sankhyaToken = await this.sankhyaService.login();
        const authTokenIfood = await this.ifoodService.getValidAccessToken();
        const merchantID = await this.ifoodService.getMerchantId(authTokenIfood);
        const tabelaEanXLSX = await this.sankhyaService.readPlanWithEAN();
        const itensToUpdate = filtrarEanCom13Digitos(tabelaEanXLSX);
        const itensRestantes = [...tabelaEanXLSX]; // Cópia para remoção
        for (const item of itensToUpdate) {
            const codProd = item.cod;
            const codBarra = item.ean;
            try {
                await this.sankhyaService.atualizarProduto(sankhyaToken, codProd, codBarra);
                this.logger.log(`✅ Produto ${codProd} atualizado com EAN ${codBarra}`);
                const produto = await this.sankhyaService.getProdutoAlone(codProd, sankhyaToken);
                if (produto) {
                    await this.ifoodService.sendItemIngestion(authTokenIfood, merchantID, [produto]);
                }
                // Remove da planilha na memória
                const index = itensRestantes.findIndex(prod => prod.cod === codProd);
                if (index !== -1) itensRestantes.splice(index, 1);
            } catch (error) {
                this.logger.error(`❌ Erro ao atualizar produto ${codProd}: ${error.message}`);
            }
        }
        // Reescreve a planilha com os que não foram atualizados
        this.sankhyaService.atualizarPlanilhaComItensRestantes(itensRestantes);

        await this.sankhyaService.logout(sankhyaToken);

        return itensToUpdate;
    }



    //#endregion

    //#region Transporte+ - Sankhya

    @Cron('0 */10 10-22 * * 1-5') // Seg–Sex, a cada 10 min das 08:00 às 17:59
    @Cron('0 */10 10-15 * * 6')   // Sáb, a cada 10 min das 08:00 às 12:59
    async atualizarEntregas() {
        const sankhyaToken = await this.sankhyaService.login();
        try {
            // 1) Busca listas [{ id, numero }]
            const entregas500 = await this.transporteMais.buscarEntregasPorTipo('500'); // numero = NUNOTA
            const entregas55 = await this.transporteMais.buscarEntregasPorTipo('55');  // numero = NUMNOTA
            const entregas65 = await this.transporteMais.buscarEntregasPorTipo('65');

            // 2) Monta lista de NUNOTAS
            const nunotas: string[] = [];

            // a) 500: já é NUNOTA
            for (const e of entregas500) {
                if (typeof e?.numero === 'number') {
                    nunotas.push(String(e.numero));
                }
            }
            
            for (const e of entregas65) {
                if (typeof e?.numero !== 'number') continue;
                const nunota =
                    // use o método que você já tem para achar por TOPs 700/701/326
                    await this.sankhyaService.getNumUnicoByNota(e.numero, sankhyaToken)
                if (nunota) nunotas.push(String(nunota));
                else console.warn(`NUMNOTA ${e.numero}: NUNOTA não encontrado.`);
            }

            // b) 55: precisa resolver NUMNOTA -> NUNOTA
            for (const e of entregas55) {
                if (typeof e?.numero !== 'number') continue;
                const nunota =
                    // use o método que você já tem para achar por TOPs 700/701/326
                    await this.sankhyaService.getNumUnicoByNota(e.numero, sankhyaToken)
                if (nunota) nunotas.push(String(nunota));
                else console.warn(`NUMNOTA ${e.numero}: NUNOTA não encontrado.`);
            }

            // 3) Dedup NUNOTA
            const unicos = Array.from(new Set(nunotas));
            if (!unicos.length) {
                console.log('Nenhuma entrega para atualizar.');
                return;
            }

            // 4) Atualiza status
            let ok = 0, fail = 0;
            for (const nunota of unicos) {
                try {
                    await this.sankhyaService.atualizarStatusEntrega(nunota, 'S', sankhyaToken);
                    ok++;
                    console.log(`Pedido (${nunota}) atualizado com sucesso`);
                } catch (e: any) {
                    fail++;
                    console.error(`Falha ao processar NUNOTA ${nunota}:`, e?.message ?? e);
                }
            }

            console.log(`Resumo: ${ok} atualizados, ${fail} falhas.`);
        } finally {
            await this.sankhyaService.logout(sankhyaToken);
        }
    }

    //@Cron('*/10 * * * * *')
    async atualizarEntregas2() {
        const token = await this.sankhyaService.login();

        const entregas: any[] = await this.transporteMais.buscarEntregas('19/08/2025');
        console.log(entregas);
        if (!Array.isArray(entregas)) return;
        const entregas55 = entregas.filter(e => String(e.tipo) === '55');
        const entregas500 = entregas.filter(e => String(e.tipo) === '500');
        await this.sankhyaService.atualizarStatusEntrega(entregas500, 'S', token)
        for (const e of entregas55) {
            if (typeof e?.numero !== 'number') continue;
            const nunota =
                await this.sankhyaService.atualizarStatusEntrega(await this.sankhyaService.getNumUnicoByNota(e.numero, token), '2', token)

        }
        console.log('55:', entregas55);
        console.log('500:', entregas500);
        await this.sankhyaService.logout(token);
    }

    //#endregion

    //@Cron('*/10 * * * * *')
    async testea() {
        const sankhyaToken = await this.sankhyaService.login();

        const entregas500 = await this.transporteMais.buscarEntregasPorTipo('500', '15/08/2025');

        console.log(entregas500);

        this.sankhyaService.logout(sankhyaToken);
    }
}


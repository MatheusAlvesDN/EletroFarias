import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SankhyaService } from '../Sankhya/sankhya.service';
import { IfoodService } from '../Ifood/ifood.service';
import { Fidelimax } from '../Fidelimax/fidelimax.service'
import { TransporteMais } from '../Transporte+/transport.service'
import e from 'express';
import { format, subDays } from 'date-fns';

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

    //@Cron('*/10 * * * * *') // Executa todos os dias as 23:00 - Pontua todos os vend tecnicos e cadastra na plataforma.
    async updatePointsFidelimax() {
        const sankhyaToken = await this.sankhyaService.login();
        const hoje = new Date();
        const dataHojeFormatada = hoje.toLocaleDateString('pt-BR');
        const vendasParaPontuarCliente = await this.sankhyaService.getNota('23/08/2025', sankhyaToken);
        const devolParaEstornar = await this.sankhyaService.getDevol(dataHojeFormatada, sankhyaToken);
        for (const vendas of vendasParaPontuarCliente) {
            const valor = Number(vendas.VLRNOTA);
            const numero = String(vendas.NUNOTA);
            const cliente = String(vendas.CODPARC);
            const vendedor = Number(vendas.CODVEND);
            const vendedorTec = Number(vendas.CODVENDTEC);
            const tipovenda = String(vendas.VENDEDOR_AD_TIPOTECNICO);
            const tagFidelimax = String(vendas.VENDEDOR_AD_FIDELIMAX);

            console.log('Nunico para pontuar: ', numero)
            console.log('Valor para pontuar: ', valor)
            console.log('Parc para pontuar: ', cliente)
            console.log('Vendedor: ', vendedor)
            console.log('Vendedor técnico: ', vendedorTec)
            console.log('Tipo de venda(4-LID,5-EF): ', tipovenda)
            if (vendedorTec !== 0 && tagFidelimax == 'S') {
                const vendedorTecPar = await this.sankhyaService.getVendedor(vendedorTec, sankhyaToken)
                console.log('VENDEDOR TECNICO:')
                console.log('Nome:', vendedorTecPar?.APELIDO)
                console.log('Cod do parceiro:', vendedorTecPar?.CODPARC)
                console.log('Tipo de vendedor tecnico(1-Arquiteto,2-Eletricista,3-Engenheiro):', vendedorTecPar?.AD_TIPOTECNICO)
            }
            //const notaAtualizada = await this.sankhyaService.atualizarStatusFidelimax(numero,'S',sankhyaToken);
            console.log(' ')
        }

        //const notasPontuadas = await this.fidelimaxService.pontuarNotasNaFidelimax(nuunico)
        //console.log(vendasParaPontuar);
        await this.sankhyaService.logout(sankhyaToken);
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

    @Cron('0 */10 10-22 * * 1-6') // Seg–Sex, a cada 10 min das 08:00 às 17:59
    async atualizarEntregas() {
        const token = await this.sankhyaService.login();
        try {
            const hoje = new Date();
            const entregas = await this.transporteMais.buscarEntregas(format (hoje, 'dd/MM/yyyy'));
            const resultados = await Promise.all(
                entregas[0].data.map(async (entrega) => {
                    // 👉 aqui você decide qual campo usar
                    // por exemplo: entrega.numero ou entrega.nunota

                    const numero = String(entrega.numero);
                    const tipo = entrega.tipo;
                    if (tipo === '500') {
                        await this.sankhyaService.atualizarStatusEntrega(numero, 'S', token);
                        console.log('Nota atualizada: ', numero)
                    } else if (tipo === '65') {
                        const NUunico = await this.sankhyaService.getNumUnicoByNotaWith701(numero, token)
                        await this.sankhyaService.atualizarStatusEntrega(NUunico, 'S', token);
                        console.log('Nota atualizada: ', NUunico)
                    } else {
                        const NUunico = await this.sankhyaService.getNumUnicoByNotaWithout701(numero, token)
                        await this.sankhyaService.atualizarStatusEntrega(NUunico, 'S', token);
                        console.log('Nota atualizada: ', NUunico)
                    }

                    // 👉 aqui você atualiza status ou faz qualquer outra lógica
                    // await this.sankhyaService.atualizarStatusEntrega(nunota, 'S', token);

                    // 👉 aqui você retorna o objeto como quiser
                })
            );

            return resultados;
        } finally {
            await this.sankhyaService.logout(token);
        }
    }

    //@Cron('*/10 * * * * *')
    @Cron('0 0 8 * * 2-7')
    async atualizarEntregasEndDay() {
        const token = await this.sankhyaService.login();
        try {
            const ontem = subDays(new Date(), 1);
            const entregas = await this.transporteMais.buscarEntregas(format (ontem, 'dd/MM/yyyy'));
            const resultados = await Promise.all(
                entregas[0].data.map(async (entrega) => {
                    // 👉 aqui você decide qual campo usar
                    // por exemplo: entrega.numero ou entrega.nunota

                    const numero = String(entrega.numero);
                    const tipo = entrega.tipo;
                    if (tipo === '500') {
                        await this.sankhyaService.atualizarStatusEntrega(numero, 'S', token);
                        console.log('Nota atualizada: ', numero)
                    } else if (tipo === '65') {
                        const NUunico = await this.sankhyaService.getNumUnicoByNotaWith701(numero, token)
                        await this.sankhyaService.atualizarStatusEntrega(NUunico, 'S', token);
                        console.log('Nota atualizada: ', NUunico)
                    } else {
                        const NUunico = await this.sankhyaService.getNumUnicoByNotaWithout701(numero, token)
                        await this.sankhyaService.atualizarStatusEntrega(NUunico, 'S', token);
                        console.log('Nota atualizada: ', NUunico)
                    }

                    // 👉 aqui você atualiza status ou faz qualquer outra lógica
                    // await this.sankhyaService.atualizarStatusEntrega(nunota, 'S', token);

                    // 👉 aqui você retorna o objeto como quiser
                })
            );

            return resultados;
        } finally {
            await this.sankhyaService.logout(token);
        }
    }

    //@Cron('*/10 * * * * *')
    async testeB() {

    }

    //#endregion

    //@Cron('*/10 * * * * *')
    async getProductLocation(codProd: number): Promise<any> {
        const sankhyaToken = await this.sankhyaService.login();
        const produto = await this.sankhyaService.getProdutoLoc(codProd, sankhyaToken);
        this.sankhyaService.logout(sankhyaToken);
        return produto;
    }

    async updateProductLocation(codProd: number,location: string) {
        const sankhyaToken = await this.sankhyaService.login();
        await this.sankhyaService.updateLocation(codProd,location,sankhyaToken);
        this.sankhyaService.logout(sankhyaToken)
    }
}


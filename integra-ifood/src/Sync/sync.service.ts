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

    //@Cron('* */10 10-22 * * 1-6')
    async atualizarEntregas() {
        const token = await this.sankhyaService.login();
        try {
            const hoje = subDays(new Date(), 0);
            const entregas = await this.transporteMais.buscarEntregas(format(hoje, 'dd/MM/yyyy'));

            // resolve NÚNICO conforme o tipo
            const resolveNuUnico = async (tipo: string | undefined, numeroStr: string, tk: string) => {
                if (tipo === '500') return numeroStr;
                if (tipo === '65') return this.sankhyaService.getNumUnicoByNotaWith701(numeroStr, tk);
                return this.sankhyaService.getNumUnicoByNotaWithout701(numeroStr, tk);
            };

            // sobrescreve "numero" com o NU único
            const resultado = await Promise.all(
                entregas.map(async (entrega) => ({
                    ...entrega,
                    numero: await resolveNuUnico(entrega.tipo, String(entrega.numero), token),
                }))
            );

            // retorna apenas o total consolidado (como você prefere)
            return resultado;
        } finally {
            await this.sankhyaService.logout(token);
        }
    }


    async teste12() {
        const token = await this.sankhyaService.login();
        const teste = await this.sankhyaService.getNumUnicoByNotaWithout701('47016', token);
        console.log(teste);
        await this.sankhyaService.logout(token);
    }


    @Cron('* */10 * * * *')
    async atualizarEntregas2(data?: string) {
        const token = await this.sankhyaService.login();
        try {
            const hoje = subDays(new Date(), 0);
            const dataStr = data ?? format(hoje, 'dd/MM/yyyy');

            // busca via serviço 2
            const entregas = await this.transporteMais.buscarEntregas2(dataStr);

            // resolve NÚNICO conforme o tipo
            const resolveNuUnico = async (
                tipo: string | undefined,
                numeroStr: string,
                tk: string
            ) => {
                if (tipo === '500') return numeroStr;
                if (tipo === '65')
                    return this.sankhyaService.getNumUnicoByNotaWith701(numeroStr, tk);
                return this.sankhyaService.getNumUnicoByNotaWithout701(numeroStr, tk);
            };

            // sobrescreve "numero" com o NU único
            const resultado = await Promise.all(
                entregas.map(async (entrega) => ({
                    ...entrega,
                    numero: await resolveNuUnico(entrega.tipo, String(entrega.numero), token),
                }))
            );

            // agora chama atualizarStatus para cada entrega
            await Promise.all(
                resultado.map((entrega) =>
                    this.sankhyaService.atualizarStatus(
                        entrega.numero,                   // nunota
                        entrega.ocorrenciaDescricao,       // ocorrencia
                        entrega.situacao,                 // status
                        entrega.motoristaNome,            // entregador
                        entrega.ocorrenciaSituacao,      // tipoEnvio
                        token
                    )
                )
            );
            console.log(resultado)
            return resultado; // ou o que você quiser retornar
        } finally {
            await this.sankhyaService.logout(token);
        }
    }


    //@Cron('0 20 12 * * *', { timeZone: 'America/Fortaleza' })
    async atualizarEntregasBack() {
        const acumulado: any[] = [];

        for (let cont = 170; cont >= 0; cont--) {
            const dataRef = subDays(new Date(), cont);
            const dataStr = format(dataRef, 'dd/MM/yyyy');
            console.log(`[SYNC] Processando dia: ${cont} (${dataStr})`);

            try {
                const res = await this.atualizarEntregas2(dataStr); // <-- passe a data!
                console.log(`[SYNC] OK ${dataStr}: ${res?.length ?? 0} entregas atualizadas`);
                acumulado.push(...(res ?? []));
            } catch (err: any) {
                console.error(`[SYNC] ERRO em ${dataStr}:`, err?.message ?? err);
            }
        }

        console.log(`[SYNC] Concluído. Total de registros processados: ${acumulado.length}`);
        return acumulado;
    }



    //@Cron('*/10 * * * * *')
    async testeB() {
        const token = await this.sankhyaService.login();
        const response = await this.sankhyaService.atualizarStatus('263273', '', '', '', '', token);
        console.log(response);
        //console.log(response.responseBody.entities.entity);
        await this.sankhyaService.logout(token);
    }

    //#endregion

    //#region Sankhya consulta
    async getProductLocation(codProd: number): Promise<any> {
        const token = await this.sankhyaService.login();
        try {
            // Busca em paralelo pra ficar mais rápido
            const [produto, estoque] = await Promise.all([
                this.sankhyaService.getProdutoLoc(codProd, token),  // Record<string, any> | null
                this.sankhyaService.getEstoqueFront(codProd, token),     // EstoqueLinha[]
            ]);

            if (!produto) return null;
            // 1) Se quiser manter o shape do produto e anexar estoque + totais:
            return {
                ...produto,
                estoque,
            };;
        } finally {
            await this.sankhyaService.logout(token);
        }
    }

    async updateProductLocation(codProd: number, location: string) {
        const sankhyaToken = await this.sankhyaService.login();
        await this.sankhyaService.updateLocation(codProd, location, sankhyaToken);
        const result = await this.sankhyaService.getEstoqueFront(44, sankhyaToken);
        console.log(result)
        this.sankhyaService.logout(sankhyaToken)
    }
    //#endregion

    //#region Login
    async sendAuth(auth: string) {
    }
    //#endregion

}
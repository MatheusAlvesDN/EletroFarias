import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SankhyaService } from '../Sankhya/sankhya.service';
import { IfoodService } from '../Ifood/ifood.service';
import { Fidelimax } from '../Fidelimax/fidelimax.service'
import { TransporteMais } from '../Transporte+/transport.service'
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

    async claimreward(product, quant, voucher){
        const token = await this.sankhyaService.login();
        const produtos = await this.fidelimaxService.listarProdutosFidelimax();
        const produtoResgatado = produtos.filter(p => p.nome === product)
        await this.sankhyaService.incluirNota(produtoResgatado.identificador,produtoResgatado.quantidade_premios,'0',token);
        await this.sankhyaService.logout(token);
        console.log ('tu arrasa')
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

    //@Cron('0 58 22 * * *')
    async usoParaAtualizarNotasEmLote() {
        const token = await this.sankhyaService.login();
        try {
            const notas = await this.sankhyaService.getNotes(token);

            for (const nota of notas) {
                await this.sankhyaService.atualizarStatus(
                    261199,
                    'finalizado',            // ocorrencia
                    'finalizado',  // status
                    null,            // entregador
                    'finalizado',            // tipoEnvio
                    token
                );
            }
        } finally {
            await this.sankhyaService.logout(token);
        }
    }

    //@Cron('0 57 14 * * *')
    async usoParaProdutoEmLote() {
        const token = await this.sankhyaService.login();
        const items = [
    20,
    75,
    278,
    375,
    478,
    512,
    719,
    720,
    733,
    862,
    872,
    951,
    952,
    980,
    1005,
    1018,
    1027,
    1070,
    1079,
    1240,
    1359,
    1360,
    1369,
    1399,
    1448,
    1521,
    1558,
    1560,
    1562,
    1643,
    1647,
    1649,
    1650,
    1651,
    1702,
    1852,
    2040,
    2104,
    2126,
    2140,
    2311,
    2312,
    2455,
    2499,
    2547,
    2556,
    2600,
    2601,
    2680,
    2682,
    2683,
    2688,
    2697,
    2752,
    2859,
    2862,
    2885,
    2886,
    2887,
    2908,
    2914,
    2915,
    2933,
    2962,
    2978,
    2991,
    2998,
    3004,
    3046,
    3061,
    3062,
    3127,
    3191,
    3209,
    3310,
    3341,
    3412,
    3494,
    3507,
    3520,
    3524,
    3533,
    3555,
    3560,
    3563,
    3564,
    3566,
    3568,
    3578,
    3579,
    3585,
    3587,
    3589,
    3592,
    3593,
    3596,
    3618,
    3680,
    3695,
    3714,
    3715,
    3746,
    3747,
    3748,
    3749,
    3750,
    3751,
    3752,
    3765,
    3766,
    3798,
    3815,
    3816,
    3817,
    3818,
    3833,
    3861,
    3862,
    3863,
    3864,
    3880,
    3899,
    3905,
    3916,
    4024,
    4090,
    4091,
    4181,
    4314,
    4335,
    4346,
    4349,
    4357,
    4360,
    4363,
    4364,
    4365,
    4540,
    4541,
    4547,
    4642,
    4645,
    4664,
    4719,
    4877,
    4878,
    4978,
    5010,
    5041,
    5045,
    5046,
    5281,
    5282,
    5283,
    5285,
    5298,
    5331,
    5332,
    5333,
    5335,
    5530,
    6307,
    6404,
    6405,
    6490,
    6491,
    6504,
    6517,
    6539,
    6549,
    6554,
    6560,
    6589,
    6592,
    6594,
    6600,
    6601,
    6603,
    6604,
    6605,
    6606,
    6607,
    6778,
    6781,
    6865,
    6875,
    6929,
    6964,
    7571,
    4623,
    6785,
    6786,
    6597,
    7186,
    7187,
    7924,
    7615,
    7981,
    8053,
    8054,
    8056,
    8088,
    8176,
    7627,
    2290,
    8394,
    8471,
    8533,
    2408,
    6291,
    6953,
    6957,
    8548,
    361,
    382,
    411,
    438,
    1672,
    1700,
    2460,
    2822,
    2911,
    3388,
    3389,
    3484,
    3576,
    3577,
    4195,
    4386,
    4871,
    7008,
    7978,
    8020,
    8126,
    8393,
    8626,
    8644,
    8645,
    1722,
    8649,
    2442,
    3233,
    1589,
    4679,
    4680,
    4681,
    4682,
    4683,
    4684,
    4685,
    4686,
    4687,
    4688,
    5885,
    4375,
    8724,
    2913,
    3111,
    3552,
    3740,
    3741,
    3742,
    8946,
    8922,
    7826,
    1559,
    3677,
    6009,
    6776,
    8806,
    514,
    9214,
    9224,
    9225,
    9232,
    9362,
    9369,
    6460,
    3519,
    9226,
    9396,
    7347,
    3384,
    806,
    2678,
    9476,
    9510,
    9513,
    9553,
    7819,
    3960,
    9609,
    3264,
    9702,
    9703,
    9704,
    340,
    3496,
    8105,
    8990,
    292,
    2772,
    3773,
    7563,
    2759,
    3625,
    5338,
    7200,
    8099,
    8100,
    8549,
    8925,
    685,
    686,
    688,
    691,
    1363,
    1701,
    4409,
    158,
    231,
    410,
    414,
    823,
    1308,
    1356,
    1357,
    1879,
    7317,
    3646,
    9901,
    9903,
    3917,
    7259,
    7754,
    7755,
    7756,
    7757,
    7758,
    7759,
    7786,
    7795,
    7927,
    8076,
    8079,
    9177,
    9215,
    9217,
    9220,
    9555,
    9557,
    9558,
    2508,
    9353,
    4449,
    3582,
    4569,
    10004,
    10008,
    10009,
    10010,
    3346,
    3591,
    8572,
    9805,
    9806,
    1202,
    1928,
    1931,
    2146,
    5811,
    6223,
    8633,
    8814,
    8928,
    4348,
    5820,
    5824,
    7792,
    9848,
    10289,
    10255,
    10256,
    10257,
    10258,
    10259,
    10569,
    10598,
    10499,
    10500,
    10534,
    3411,
    7089,
    7097,
    7117,
    7118,
    7119,
    7123,
    7124,
    7125,
    7163,
    7164,
    7169,
    7170,
    7172,
    7173,
    7174,
    7530,
    8001,
    8463,
    9452,
    9454,
    9456,
    9458,
    9459,
    9460,
    9461,
    9462,
    9463,
    9464,
    9465,
    9466,
    9468,
    9469,
    9470,
    9471,
    9472,
    9473,
    9474,
    9480,
    9481,
    9483,
    9485,
    9486,
    9487,
    9488,
    9489,
    9490,
    9491,
    9492,
    9493,
    9494,
    9495,
    9496,
    9498,
    9499,
    9500,
    9502,
    9503,
    9504,
    9505,
    9506,
    9507,
    9508,
    9509,
    9511,
    9512,
    9514,
    9515,
    9516,
    9517,
    9518,
    9519,
    9520,
    9521,
    9522,
    9523,
    9525,
    9529,
    9530,
    9531,
    9532,
    9533,
    9534,
    9535,
    9536,
    9537,
    9538,
    9539,
    9540,
    9541,
    9542,
    9543,
    9544,
    9545,
    9546,
    9548,
    9549,
    9550,
    9551,
    9552,
    9554,
    9897,
    10693,
    2578,
    1215,
    1219,
    1842,
    5446,
    6694,
    759,
    760,
    6588,
    6590,
    6595,
    6639,
    10810,
    10814,
    647,
    6593,
    7319,
    3017,
    10963,
    11006,
    10892,
    4803,
    10533,
    1276,
    1277,
    1278,
    9230,
    9445,
    11109,
    11110,
    11111,
    11113,
    11115,
    11116,
    11118,
    11119,
    11121,
    11122,
    11123,
    11124,
    11125,
    11126,
    11127,
    11128,
    11129,
    11130,
    9444,
    9446,
    9447,
    9448,
    9450,
    9451,
    9482,
    9484,
    9501,
    9524,
    9526,
    9528,
    10781,
    10567,
    10969,
    11035,
    5348,
    11159,
    2125,
    5100,
    11233,
    11235,
    3631,
    447,
    3508,
    9803,
    9804,
    4211,
    4214,
    4231,
    4232,
    4242,
    10621,
    10864,
    10866,
    4538,
    303,
    10003,
    10507,
    10509,
    10510,
    10511,
    10512,
    4336,
    10812,
    11326,
    6632,
    7828,
    7526,
    11001,
    11009,
    11013,
    11014,
    11015,
    3514,
    11401,
    11402,
    11404,
    10170,
    10177,
    10340,
    10342,
    10344,
    10345,
    10346,
    10347,
    10348,
    10349,
    10351,
    10352,
    10353,
    10354,
    10590,
    10821,
    10823,
    10826,
    10828,
    10831,
    10834,
    10952,
    10953,
    7852,
    7859,
    9409,
    9410,
    9998,
    10124,
    10125,
    10126,
    10127,
    10128,
    10129,
    10133,
    10134,
    10135,
    10137,
    10254,
    11466,
    11472,
    8878,
    8879,
    9123,
    9124,
    9125,
    9126,
    9178,
    9179,
    9180,
    9181,
    9182,
    9183,
    9271,
    10665,
    10708,
    10757,
    10758,
    10785,
    11028,
    11031,
    11032,
    11034,
    11211,
    11059,
    11060,
    11061,
    11376,
    11547,
    11557,
    8221,
    8222,
    8223,
    8225,
    8226,
    9299,
    10603,
    10737,
    8213,
    8215,
    8217,
    8218,
    8219,
    8227,
    8228,
    8229,
    8231,
    8232,
    8245,
    8252,
    8254,
    8259,
    8263,
    8264,
    8265,
    8266,
    8278,
    8279,
    8285,
    8286,
    8287,
    8288,
    8289,
    8290,
    8291,
    8292,
    8293,
    8294,
    8295,
    8296,
    8297,
    8298,
    8299,
    8300,
    8301,
    8302,
    8303,
    8304,
    8305,
    8476,
    8778,
    9032,
    9298,
    10222,
    10223,
    10224,
    10946,
    10971,
    11308,
    11309,
    11310,
    11311,
    11405,
    11587,
    8203,
    8204,
    8205,
    8206,
    8207,
    8209,
    8220,
    8274,
    8276,
    8277,
    8315,
    8316,
    8318,
    8430,
    8610,
    8611,
    8613,
    8614,
    8616,
    8617,
    8619,
    8621,
    8844,
    11626,
    11629,
    8185,
    8192,
    8194,
    8196,
    8197,
    8201,
    8900,
    8904,
    9167,
    10061,
    10443,
    7260,
    8780,
    8885,
    9304,
    9929,
    9934,
    10582,
    10904,
    10905,
    10906,
    8873,
    8918,
    9248,
    9255,
    9259,
    9261,
    9262,
    9263,
    9264,
    9265,
    9266,
    9269,
    9720,
    9902,
    10021,
    10096,
    10098,
    10104,
    10106,
    10115,
    10117,
    10121,
    10122,
    10123,
    10152,
    10153,
    10154,
    10155,
    10172,
    10173,
    10174,
    10268,
    10469,
    10470,
    10473,
    10475,
    10476,
    10477,
    10478,
    10479,
    10480,
    10482,
    10483,
    10486,
    10487,
    10490,
    10491,
    10517,
    10518,
    10519,
    10520,
    10552,
    10553,
    10554,
    10560,
    10565,
    10659,
    10777,
    10778,
    10817,
    10818,
    10990,
    11258,
    11447,
    7761,
    7846,
    10149,
    10150,
    10151,
    10852,
    10853,
    11647,
    11648,
    11651,
    11654,
    11656,
    11657,
    11665,
    11668,
    10236,
    10237,
    10876,
    11674,
    11678,
    11634,
    11635,
    7844,
    7845,
    7847,
    7848,
    7849,
    7850,
    7851,
    7858,
    7860,
    7861,
    7862,
    7863,
    7864,
    7865,
    7867,
    7868,
    7869,
    7870,
    7871,
    7872,
    7873,
    7874,
    7877,
    7880,
    7884,
    7915,
    9189,
    9623,
    10322,
    10323,
    11640,
    11649,
    11650,
    5071,
    7994,
    6659,
    11692,
    9663,
    11790,
    11791,
    11793,
    11807,
    11809,
    11695,
    11867,
    11868,
    11869,
    11870,
    11871,
    11872,
    10895,
    11916,
    11920,
    11923,
    11956,
    11967,
    11970,
    11606,
    11598,
    11778,
    11779,
    11782,
    12013,
    11720,
    11721,
    11722,
    255,
    721,
    12057,
    11272,
    3588,
    12073,
    12089,
    7213,
    2435,
    4828,
    12150,
    12152,
    12166,
    12167,
    258,
    12357,
    11963,
    12360,
    12416,
    12418,
    12421,
    9731,
    4046,
    9728,
    3735,
    3737,
    3738,
    3739,
    5001,
    10801,
    12325,
    12509,
    12497,
    12498,
    12502,
    12503,
    12504,
    12472,
    12610,
    12628,
    12629,
    12631,
    12658,
    12659,
    12662,
    12663,
    12669,
    12672,
    12674,
    12534,
    12537,
    12550,
    12552,
    12555,
    12556,
    12557,
    12560,
    12561,
    8127,
    12294,
    12730,
    12769,
    12776,
    12799,
    12818,
    12827,
    12828,
    9055,
    12725,
    12889,
    8479,
    8520,
    8524,
    9730,
    12778,
    749,
    950,
    7429,
    6548,
    12871,
    12872,
    12876,
    12877,
    12878,
    12882,
    12974,
    13046,
    13052,
    13054,
    13099,
    13104,
    13113,
    12981,
    13112,
    13065,
    13129,
    13133,
    276,
    280,
    425,
    6430,
    10336,
    12517,
    4691,
    4692,
    4695,
    4697,
    1400,
    13161,
    10992,
    12753,
    10894,
    8063,
    13210,
    9336,
    1714,
    13273,
    11858,
    11859,
    13192,
    360,
    6429,
    12154,
    1735,
    1960,
    3676,
    10931,
    10513,
    10514,
    13340,
    13342,
    13240,
    12507,
    13437,
    13164,
    13166,
    13167,
    13440,
    13464
  ]      
        for (const item of items) {
    await this.sankhyaService.atualizarCorProduto(item,'16711680','16777215',token);
    console.log(item)
  }

        await this.sankhyaService.logout(token);
    }


    @Cron('0 */10 10-22 * * 1-6')
    async atualizarEntregas2(data?: string) {
        const token = await this.sankhyaService.login();
        try {
            const hoje = new Date();
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


    //@Cron('*/10 * * * * *', { timeZone: 'America/Fortaleza' })
    async atualizarEntregasBack() {
        const acumulado: any[] = [];
        const token = await this.sankhyaService.login();


        for (let cont = 1; cont >= 0; cont--) {
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
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SankhyaService } from '../Sankhya/sankhya.service';
import { IfoodService } from '../Ifood/ifood.service';
import { Fidelimax } from '../Fidelimax/fidelimax.service'
import { TransporteMais } from '../Transporte+/transport.service'
import { format, subDays, subHours } from 'date-fns';
import { PrismaService } from '../Prisma/prisma.service';
import { PrintService } from '../Service/print.service';
import { ClientRequest } from 'node:http';
import { Console } from 'node:console';
import { NotFoundException } from '@nestjs/common';
import { randomInt } from 'node:crypto';

const onlyDigits = (v: any) => String(v ?? '').replace(/\D/g, '');
const RESET_DATE_ISO = '1981-11-23T14:01:48.190Z';

export type LocalizacoesDTO = {
    Rua: string;
    Predio: string;
    Nivel: string;
    Apartamento: string;
    Endereco: string;
    Armazenamento: string;
};

type Sorte = {
    muitoDificil: number;
    dificil: number;
    razoavel: number;
    facil:number;
}



interface PedidoPendenteSankhya {
    NUNOTA: number;
    NUMNOTA: number;
    DESCROPER: string;
    DTALTER: string;
    HRALTER: string;
    PARCEIRO: string;
    VENDEDOR: string;
    DESCRPROD: string;
    ESTOQUE_ATUAL: number;
    QTD_NEGOCIADA: number;
    QTD_PENDENTE_CALC: number;
}

type Localizacoes = {
    Rua: string;
    Predio: string;
    Nivel: string;
    Apartamento: string;
    Endereco: string;
    Armazenamento: string;
}

type Produtos = {
    codProduto: number;
    quantidade: number;
    descricao: string;
};

type ProdutoDto = {
    CODPROD: number;
    DESCRPROD: string | null;
    CODBARRA?: string | null;

    CODGRUPOPROD?: number | null;
    DESCRGRUPOPROD?: string | null;

    MARCA?: string | null;
    ATIVO?: any;

    CODBARRAS?: string[];
};

export type IfoodItemIngestion = {
    /** Código de barras (EAN/GTIN) */
    barcode: string;

    /** Nome do produto */
    name: string;

    /** Código externo (normalmente CODPROD do Sankhya como string) */
    plu: string;

    /** Se o item está ativo no catálogo */
    active: boolean;

    /** Estoque (grocery) */
    inventory: {
        stock: number;
    };

    /** Detalhes/cadastro do item */
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

    /** Preços */
    prices: {
        price: number;
        promotionPrice: number | null;
    };

    /** Campos opcionais do contrato atual que você já usa no service */
    scalePrices: any;
    multiple: any;
    channels: any;

    /**
     * ✅ Extras internos (NÃO são do iFood, mas ajudam no pipeline Sankhya->iFood)
     * Se você não quiser, pode remover sem impactar o frontend.
     */
    meta?: {
        codprod?: number;
        codgrupoprod?: number | null;
        descrgrupoprod?: string | null;
        marca?: string | null;
    };
};

type EtiquetaCabo = {
    nunota: number;
    parceiro: string;
    vendedor: string;
    codprod: number;
    descrprod: string;
    qtdneg: number;
    codbarras: string;
};

type ListParams = {
    groupId?: number;
    manufacturerId?: number;
    search?: string;
    limit: number;
    offset: number;
};


function orderByEnderecoStrict<T extends { endereco: string }>(items: T[]): T[] {
    return [...items].sort((a, b) => {
        const pa = a.endereco.split('.').map(Number);
        const pb = b.endereco.split('.').map(Number);

        const len = Math.max(pa.length, pb.length);
        for (let i = 0; i < len; i++) {
            const da = pa[i] ?? 0;
            const db = pb[i] ?? 0;
            if (da !== db) return da - db;
        }
        return 0;
    });
}


function norm(s: string) {
    return String(s ?? '').normalize('NFC').trim();
}


@Injectable()
export class SyncService {


    getInventoryList() {
        throw new Error('Method not implemented.');
    }
    private readonly logger = new Logger(SyncService.name);
    constructor(
        private readonly sankhyaService: SankhyaService,
        private readonly ifoodService: IfoodService,
        private readonly fidelimaxService: Fidelimax,
        private readonly transporteMais: TransporteMais,
        private readonly prismaService: PrismaService,
        private readonly printService: PrintService,

    ) { }

    //#region Ifood-Sankhya
    /*
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
        const log = "createCategoryByProdId"
        await this.sankhyaService.logout(authTokenSankhya, log);
    }*/

    async createCategoryByProdId(productId: number): Promise<void> {
        const authTokenSankhya = await this.sankhyaService.login();
        const log = "createCategoryByProdId";

        try {
            const authTokenIfood = await this.ifoodService.getValidAccessToken();
            const merchantID = await this.ifoodService.getMerchantId(authTokenIfood);

            // 1) Buscar produto no Sankhya
            const produto = await this.sankhyaService.getProduto(productId, authTokenSankhya);

            if (!produto) {
                this.logger.error(
                    `[${log}] getProduto retornou vazio. productId=${productId}`
                );
                // você pode trocar por NotFoundException se for controller
                throw new Error(`Produto ${productId} não encontrado no Sankhya (getProduto retornou vazio).`);
            }

            // Se vier num caminho diferente, isso ajuda a enxergar
            this.logger.debug(
                `[${log}] produto keys=${Object.keys(produto).join(",")} productId=${productId}`
            );

            const groupName = produto?.f6?.["$"];
            const groupIdSankhya = produto?.f5?.["$"];

            if (!groupIdSankhya) {
                this.logger.error(
                    `[${log}] Produto sem grupo (f5.$ vazio). productId=${productId} produto=${JSON.stringify(produto).slice(0, 1200)}`
                );
                throw new Error(`Produto ${productId} sem groupId (f5.$ vazio).`);
            }

            if (!groupName) {
                this.logger.warn(
                    `[${log}] Produto com grupoId=${groupIdSankhya} mas sem nome do grupo (f6.$ vazio). productId=${productId}`
                );
                // escolha 1: bloquear
                throw new Error(`Produto ${productId} sem groupName (f6.$ vazio).`);
                // escolha 2: fallback
                // groupName = "SEM_CATEGORIA";
            }

            const produtosValidos = await this.sankhyaService.filterInvalidEanAndExport(
                groupIdSankhya,
                groupName,
                authTokenSankhya
            );

            if (!produtosValidos?.length) {
                this.logger.warn(
                    `[${log}] Nenhum produto válido após filtro. groupId=${groupIdSankhya} groupName=${groupName}`
                );
                return;
            }

            const allProductsWithPrice = await this.sankhyaService.enrichWithPricesFromProductList(
                produtosValidos,
                0,
                authTokenSankhya
            );

            const allProductsWithPriceStock = await this.sankhyaService.getStockInLot(
                allProductsWithPrice,
                1100,
                authTokenSankhya
            );

            await this.ifoodService.sendItemIngestion(
                authTokenIfood,
                merchantID,
                allProductsWithPriceStock
            );

            this.logger.log(`[${log}] Ingestão enviada. itens=${allProductsWithPriceStock.length}`);
        } finally {
            await this.sankhyaService.logout(authTokenSankhya, log);
        }
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
        const log = "updateIfoodStock"
        await this.sankhyaService.logout(authTokenSankhya, log);
        this.logger.log(allItems);
    }

    //#endregion

    //#region fidelimax-Sankhya
    private toBRDate(input: string): string {
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(input)) return input; // já está em dd/MM/yyyy
        const d = new Date(input);
        return isNaN(d.getTime()) ? new Date().toLocaleDateString('pt-BR') : d.toLocaleDateString('pt-BR');
    }

    //@Cron('0 * * * * *')
    async updatePointsFidelimax() {
        /*  const sankhyaToken = await this.sankhyaService.login();
          const hoje = new Date();
          const dataHojeFormatada = hoje.toLocaleDateString('pt-BR');
          const vendasDoDia = await this.sankhyaService.getNota(sankhyaToken);
          const vendasTecDia = vendasDoDia.filter(n => n.CODVENDTEC != null); // apenas as vendas com vend tecnico
          const vendasClientDia = vendasDoDia.filter(n => n.CODVENDTEC == null); // apenas as vendas sem vend tecnico
          const existing = await this.usersService.findReward('teste');
          if (existing == null) {
              await this.usersService.createRegisterReward('teste', '70107145413', 10.0)
          } else {
              console.log(existing)
          }
  
          //console.log('Vendas tecnicas: ', vendasTecDia)
          //console.log('Vendas cliente: ', vendasClientDia)
          for (const venda of vendasTecDia) { // Pontuação das notas com VendTec
              const parceiroTec = await this.sankhyaService.getVendedor(venda.CODVENDTEC, sankhyaToken)
              const teste = await this.sankhyaService.atualizarStatusFidelimax(venda.NUNOTA, 'S', sankhyaToken)
              //console.log(parceiroTec)
          }
          //const devolParaEstornar = await this.sankhyaService.getDevol(dataHojeFormatada, sankhyaToken);
          //const notasPontuadas = await this.fidelimaxService.pontuarNotasNaFidelimax(nuunico)
          await this.sankhyaService.logout(sankhyaToken);*/
    }


    @Cron('0 */10 * * * *')
    async registerClub() {
        console.log('verificação de notas para o clube:')
        const fidelimaxClients = await this.fidelimaxService.listarTodosConsumidores();
        const token = await this.sankhyaService.login();
        const notes = await this.sankhyaService.getNota(token) // Todas as notas de venda com 24hrs+
        const notesDevol = await this.sankhyaService.getNotaDevol(token) // Todas as notas de devolução com 24hrs+
        const notasNaoPontua = notes.filter((note) => note.VENDEDOR_AD_TIPOTECNICO !== 5)
        const notasDevolNaoPontua = notesDevol.filter((note) => note.VENDEDOR_AD_TIPOTECNICO !== 5)
        const validClientNotes = notes.filter((note) => note.VENDEDOR_AD_TIPOTECNICO === 5 && (note.CODVENDTEC === null || note.CODVENDTEC === 0)) // Notas do cliente da Eletro
        const validVendTecNotes = notes.filter((note) => note.VENDEDOR_AD_TIPOTECNICO === 5 && (note.CODVENDTEC !== null && note.CODVENDTEC !== 0)) // Notas com vendTec da Eletro
        const validClientNotesDevol = notesDevol.filter((note) => note.VENDEDOR_AD_TIPOTECNICO === 5 && (note.CODVENDTEC === null || note.CODVENDTEC === 0)) // Notas de devolução do cliente da Eletro

        const validVendTecNotesDevol = notesDevol.filter((note) => note.VENDEDOR_AD_TIPOTECNICO === 5 && (note.CODVENDTEC !== null && note.CODVENDTEC !== 0)) // Notas de devolução com vendedor tec. da Eletro
        console.log("notes:" + notes.length)
        console.log("nota não pontua: ", notasNaoPontua.length)
        console.log("notesDevol: " + notesDevol.length)
        console.log("notesDevolNaoPontua: " + notasDevolNaoPontua.length)
        console.log("validClientNotes: " + validClientNotes.length)
        console.log("validVendTecNotes: " + validVendTecNotes.length)
        console.log("validClientNotesDevol: " + validClientNotesDevol.length)
        console.log("validVendTecNotesDevol: " + validVendTecNotesDevol.length)

        //#region Notas que não pontuam
        for (const note of notasNaoPontua) {
            console.log("nota não pontua " + note + " cliente: " + note.CODPARC)
            await this.sankhyaService.inFidelimaxNoteCheck(note.NUNOTA, token)
        }

        for (const note of notasDevolNaoPontua) {
            console.log("nota não pontua " + note + " cliente: " + note.CODPARC + " vendedor: " + note.CODVENDTEC + "VENDEDOR AD TIPOTECNICO: " + note.VENDEDOR_AD_TIPOTECNICO)
            await this.sankhyaService.inFidelimaxNoteCheck(note.NUNOTA, token)
        }
        //#endregion

        //#region Debitos (registrando caso cliente não tenha saldo)
        for (const note of validClientNotesDevol) {
            console.log("const note of validClientNotesDevol: " + note)            //Verificar se o cliente possui cadastro no fidelimax
            const cliente = await this.sankhyaService.getCPFwithCodParc(note.CODPARC, token)
            console.log(cliente)
            const result = await this.fidelimaxService.debitarConsumidor(cliente.cpf, note.VLRNOTA, String(note.NUNOTA))
            const hasFidelimax = fidelimaxClients.some((f) => f.documento === cliente?.cpf);
            if (hasFidelimax === false) {
                console.log('Cliente não possui cadastro no Fidelimax')
                await this.sankhyaService.inFidelimaxNoteCheck(note.NUNOTA, token)
            } else {
                console.log('Cliente possui cadastro no Fidelimax')
                await this.sankhyaService.inFidelimaxNoteCheck(note.NUNOTA, token)
                //Verificar se foi feito o debito e registra se não foi
                if (result.CodigoResposta == 100) {
                    console.log('Estornado.')
                } else if (result.CodigoResposta == 113) {
                    console.log('Cliente sem saldo para estorno:', note.NUNOTA)
                    const userDebit = await this.prismaService.findDebit(cliente.cpf)
                    if (!userDebit) {
                        await this.prismaService.registerDebit(cliente.cpf, note.VLRNOTA, 'Devolução TOP 800, 801', cliente?.nome, String(note.NUNOTA))

                    } else {
                        await this.prismaService.addDebit(userDebit.id, note.VLRNOTA)

                    }
                } else { console.log('Erro ao debitar: ', result.CodigoResposta) }

            }
        }
        //#endregion

        //#region Debitos (registrando caso cliente ou vend. tec. não tenha saldo)
        for (const note of validVendTecNotesDevol) {
            console.log("const note of validVendTecNotesDevol: " + note)            //Verificar se o cliente e vend. tec. possui cadastro no fidelimax
            const cliente = await this.sankhyaService.getCPFwithCodParc(note.CODPARC, token)
            console.log(cliente)

            const clientHasFidelimax = fidelimaxClients.some((f) => f.documento === cliente?.cpf);
            const codeParcVendTec = await this.sankhyaService.getVendedor(note.CODVENDTEC, token)
            console.log(codeParcVendTec)
            const vendTec = await this.sankhyaService.getCPFwithCodParc(Number(codeParcVendTec?.CODPARC), token)
            console.log(vendTec)
            const vendTecHasFidelimax = fidelimaxClients.some((f) => f.documento === vendTec?.cpf);
            await this.sankhyaService.inFidelimaxNoteCheck(note.NUNOTA, token)

            // Cliente
            if (clientHasFidelimax === false) {
                console.log('Cliente não possui cadastro no Fidelimax')
                await this.sankhyaService.inFidelimaxNoteCheck(note.NUNOTA, token)
            } else {
                console.log('Cliente possui cadastro no Fidelimax')
                const result = await this.fidelimaxService.debitarConsumidor(cliente.cpf, note.VLRNOTA, String(note.NUNOTA))
                await this.sankhyaService.inFidelimaxNoteCheck(note.NUNOTA, token)
                //Verificar se foi feito o debito e registra se não foi
                if (result.CodigoResposta == 100) {
                    console.log('Estornado.')
                } else if (result.CodigoResposta == 113) {
                    console.log('Cliente sem saldo para estorno:', note.NUNOTA)
                    const userDebit = await this.prismaService.findDebit(cliente.cpf)
                    if (!userDebit) {
                        await this.prismaService.registerDebit(cliente.cpf, note.VLRNOTA, 'Devolução TOP 800, 801', cliente?.nome, String(note.NUNOTA))

                    } else {
                        await this.prismaService.addDebit(userDebit.id, note.VLRNOTA)

                    }
                } else { console.log('Erro ao debitar: ', result.CodigoResposta) }

            }

            // Vend. Tec.
            if (vendTecHasFidelimax === false) {
                console.log('Cliente não possui cadastro no Fidelimax')
                await this.sankhyaService.inFidelimaxNoteCheck(note.NUNOTA, token)
            } else {
                console.log('Cliente possui cadastro no Fidelimax')
                const result = await this.fidelimaxService.debitarConsumidor(vendTec.cpf, note.VLRNOTA * 3, String(note.NUNOTA))
                await this.sankhyaService.inFidelimaxNoteCheck(note.NUNOTA, token)
                //Verificar se foi feito o debito e registra se não foi
                if (result.CodigoResposta == 100) {
                    console.log('Estornado.')
                } else if (result.CodigoResposta == 113) {
                    console.log('Cliente sem saldo para estorno:', note.NUNOTA)
                    const userDebit = await this.prismaService.findDebit(vendTec.cpf)
                    if (!userDebit) {
                        await this.prismaService.registerDebit(vendTec.cpf, note.VLRNOTA * 3, 'Devolução TOP 800, 801', cliente?.nome, String(note.NUNOTA))

                    } else {
                        await this.prismaService.addDebit(userDebit.id, note.VLRNOTA * 3)

                    }
                } else { console.log('Erro ao debitar: ', result.CodigoResposta) }

            }

        }
        //#endregion

        //#region Registrar pontuação (vendas sem vend. tec.)(verificando debitos pendentes)
        for (const note of validClientNotes) {
            console.log("const note of validClientNotes: " + note.NUNOTA)
            //Verificar se o cliente possui cadastro no fidelimax
            const cliente = await this.sankhyaService.getCPFwithCodParc(note.CODPARC, token)
            console.log(cliente)
            const hasFidelimax = fidelimaxClients.some((f) => f.documento === cliente?.cpf);
            await this.sankhyaService.inFidelimaxNoteCheck(note.NUNOTA, token)
            if (hasFidelimax === true) {
                console.log('Cliente ', note.CODPARC, ' possui cadastro no fidelimax')
                const userDebit = await this.prismaService.findDebit(cliente.cpf)

                if (userDebit!) {
                    console.log('Cliente ', note.CODPARC, ' possui debito de', userDebit.debitoReais)
                    const clientNewDebit = Number(userDebit.debitoReais) - Number(note.VLRNOTA)
                    if (clientNewDebit > 0) {
                        await this.prismaService.reduceDebit(userDebit.id, note.VLRNOTA)
                    } else {
                        await this.prismaService.deleteDebit(userDebit.id);
                        await this.fidelimaxService.pontuarClienteFidelimax(cliente.cpf, -clientNewDebit, String(note.NUNOTA))
                    }
                } else {
                    console.log('Cliente não possui debito ', note.CODPARC)
                    // CLIENTE PONTUANDO *2 ATÉ GABRIEL INFORMAR PARA TIRAR (AJUSTE EM DOIS LOCAIS)
                    await this.fidelimaxService.pontuarClienteFidelimax(cliente.cpf, note.VLRNOTA * 2, String(note.NUNOTA))
                }
            } else if (hasFidelimax === false) {
                console.log('Cliente ', String(note.CODPARC), ' não possui cadastro no fidelimax')
            }
        }
        //#endregion

        //#region Registrar pontuação (vendas com vend. tec.)(verificando debitos pendentes)
        for (const note of validVendTecNotes) {
            console.log("const note of validVendTecNotes: " + note)
            //Verificar se o cliente e vend. tec. possui cadastro no fidelimax
            const cliente = await this.sankhyaService.getCPFwithCodParc(note.CODPARC, token)
            console.log(cliente)
            const clientHasFidelimax = fidelimaxClients.some((f) => f.documento === cliente?.cpf);
            const codeParcVendTec = await this.sankhyaService.getVendedor(note.CODVENDTEC, token)
            console.log(codeParcVendTec)
            const vendTec = await this.sankhyaService.getCPFwithCodParc(Number(codeParcVendTec?.CODPARC), token)
            console.log(vendTec)
            const vendTecHasFidelimax = fidelimaxClients.some((f) => f.documento === vendTec?.cpf);
            await this.sankhyaService.inFidelimaxNoteCheck(note.NUNOTA, token)
            console.log(note)            //Cliente

            if (clientHasFidelimax === true) {
                console.log('Cliente ', note.CODPARC, ' possui cadastro no fidelimax')
                const userDebit = await this.prismaService.findDebit(cliente.cpf)

                if (userDebit!) {
                    console.log('Cliente ', note.CODPARC, ' possui debito de', userDebit.debitoReais)
                    const clientNewDebit = Number(userDebit.debitoReais) - Number(note.VLRNOTA)
                    if (clientNewDebit > 0) {
                        await this.prismaService.reduceDebit(userDebit.id, note.VLRNOTA)
                    } else {
                        await this.prismaService.deleteDebit(userDebit.id);
                        await this.fidelimaxService.pontuarClienteFidelimax(cliente.cpf, -clientNewDebit, String(note.NUNOTA))
                    }
                } else {
                    console.log('Cliente não possui debito ', note.CODPARC)
                    // CLIENTE PONTUANDO *2 ATÉ GABRIEL INFORMAR PARA TIRAR (AJUSTE EM DOIS LOCAIS)
                    await this.fidelimaxService.pontuarClienteFidelimax(cliente.cpf, note.VLRNOTA * 2, String(note.NUNOTA))
                }
            } else if (clientHasFidelimax === false) {
                console.log('Cliente ', String(note.CODPARC), ' não possui cadastro no fidelimax')

            }

            //Vendedor Tec.

            if (vendTecHasFidelimax === true) {
                console.log('Vendedor tec. ', codeParcVendTec?.CODPARC, ' possui cadastro no fidelimax')
                const userDebit = await this.prismaService.findDebit(vendTec.cpf)

                if (userDebit!) {
                    console.log('Vendedor tec. ', codeParcVendTec?.CODPARC, ' possui debito de', userDebit.debitoReais)
                    const clientNewDebit = Number(userDebit.debitoReais) - Number(note.VLRNOTA * 3)
                    if (clientNewDebit > 0) {
                        await this.prismaService.reduceDebit(userDebit.id, note.VLRNOTA * 3)
                    } else {
                        await this.prismaService.deleteDebit(userDebit.id);
                        await this.fidelimaxService.pontuarClienteFidelimax(vendTec.cpf, -clientNewDebit, String(note.NUNOTA))
                    }
                } else {
                    console.log('Vendedor tec. não possui debito.')
                    await this.fidelimaxService.pontuarClienteFidelimax(vendTec.cpf, note.VLRNOTA * 3, String(note.NUNOTA))
                }
            } else if (clientHasFidelimax === false) {
                console.log('Vendedor tec. ', codeParcVendTec?.CODPARC, ' não possui cadastro no fidelimax')

            }

        }

        //#endregion

        const log = "registerClub"
        await this.sankhyaService.logout(token, log);
    }

    //@Cron('*/15 * * * * *')
    async testeg() {
        const token = await this.sankhyaService.login();
        console.log(await this.sankhyaService.getNota(token))
        const log = "testeg"
        await this.sankhyaService.logout(token, log);

    }

    async claimreward(payload) {
        const token = await this.sankhyaService.login();
        try {
            const codParc = await this.sankhyaService.getCodParcWithCPF(payload.cpf, token);

            // se não achou parceiro, melhor parar
            if (!codParc) {
                console.warn('Parceiro não encontrado para CPF', payload.cpf);
                return;
            }

            const allProducts = await this.fidelimaxService.listarProdutosFidelimax();

            // cashback não precisa de produto
            const isCashback = payload.premio === 'Cashback';

            // só procura produto se não for cashback
            const prod = !isCashback
                ? allProducts.find((p: any) => p.nome === payload.premio)
                : null;

            // se for produto e não achou, não segue
            if (!isCashback && !prod) {
                console.warn('Produto do Fidelimax não encontrado:', payload.premio);
                return;
            }

            const existing = await this.prismaService.findReward(payload.voucher);
            if (existing != null) {
                console.log('Tentativa de resgate duplicado');
                return;
            }

            if (isCashback) {
                const res = await this.sankhyaService.incluirCashback(
                    payload.reais_cashback,
                    codParc,
                    token
                );

                // checa estrutura antes de acessar
                const nuNota = res?.responseBody?.pk?.NUNOTA?.$;
                if (!nuNota) {
                    console.error('Sankhya não retornou NUNOTA no cashback:', res);
                    return;
                }

                await this.sankhyaService.confirmarNota(nuNota, token);
                await this.prismaService.createRegisterReward(payload.voucher, payload.cpf, 0);
                return;
            }

            // daqui pra baixo já sabemos que tem prod
            const isInfiniti =
                prod.identificador === '20487' || prod.identificador === '20616';

            if (isInfiniti) {
                const res = await this.sankhyaService.incluirNotaInfiniti(
                    prod.identificador,
                    payload.quantidade_premios,
                    codParc,
                    token
                );
                const nuNota = res?.responseBody?.pk?.NUNOTA?.$;
                await this.sankhyaService.confirmarNota(nuNota, token);
            } else {
                await this.sankhyaService.incluirNotaPremio(
                    prod.identificador,
                    payload.quantidade_premios,
                    codParc,
                    token
                );
            }

            await this.prismaService.createRegisterReward(payload.voucher, payload.cpf, 0);
        } finally {
            const log = "claimreward"
            await this.sankhyaService.logout(token, log);
        }
    }

    //@Cron('*/15 * * * * *')
    async registerUser(payload: {
        nome: string;
        email: string;
        cpf: string;
        telefone?: string;
        nascimento: string; // ajuste o tipo se necessário (Date/string)
    }) {
        const token = await this.sankhyaService.login();

        // helpers locais (somente para esta função)
        const onlyDigits = (v: any) => String(v ?? '').replace(/\D/g, '');
        const stripAccents = (s?: string | null) =>
            String(s ?? '')
                .normalize('NFD')
                // remove marcas diacríticas unicode (Node 16+)
                .replace(/\p{Diacritic}/gu, '')
                // normaliza espaços
                .replace(/\s+/g, ' ')
                .trim();

        const UF_TO_ESTADO: Record<string, string> = {
            AC: 'Acre', AL: 'Alagoas', AP: 'Amapá', AM: 'Amazonas', BA: 'Bahia',
            CE: 'Ceará', DF: 'Distrito Federal', ES: 'Espírito Santo', GO: 'Goiás',
            MA: 'Maranhão', MT: 'Mato Grosso', MS: 'Mato Grosso do Sul', MG: 'Minas Gerais',
            PA: 'Pará', PB: 'Paraíba', PR: 'Paraná', PE: 'Pernambuco', PI: 'Piauí',
            RJ: 'Rio de Janeiro', RN: 'Rio Grande do Norte', RS: 'Rio Grande do Sul',
            RO: 'Rondônia', RR: 'Roraima', SC: 'Santa Catarina', SP: 'São Paulo',
            SE: 'Sergipe', TO: 'Tocantins',
        };
        const ufToEstado = (uf?: string | null) =>
            (uf ? UF_TO_ESTADO[String(uf).toUpperCase()] ?? '' : '');

        const resolveCepPublico = async (cepIn: string) => {
            const cep = onlyDigits(cepIn);
            if (cep.length !== 8) throw new Error(`CEP inválido: "${cepIn}"`);

            // 1) ViaCEP
            try {
                const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
                const d: any = await r.json();
                if (!d?.erro) {
                    const uf = String(d?.uf ?? '').toUpperCase();
                    return {
                        cep,
                        uf,
                        estado: ufToEstado(uf),                // mantém acentos
                        cidade: d?.localidade ?? '',
                        logradouro: d?.logradouro ?? '',
                        bairro: (String(d?.bairro ?? '').trim() || 'Centro'),
                    };
                }
            } catch { /* fallback */ }

            // 2) BrasilAPI v2
            try {
                const r2 = await fetch(`https://brasilapi.com.br/api/cep/v2/${cep}`);
                const d2: any = await r2.json();
                const uf = String(d2?.state ?? '').toUpperCase();
                if (uf && d2?.city) {
                    return {
                        cep,
                        uf,
                        estado: ufToEstado(uf),                // mantém acentos
                        cidade: d2?.city ?? '',
                        logradouro: d2?.street ?? '',
                        bairro: (String(d2?.neighborhood ?? '').trim() || 'Centro'),
                    };
                }
            } catch { /* erro final abaixo */ }

            throw new Error(`Não foi possível obter endereço público para o CEP ${cep}`);
        };

        try {
            let codParc = await this.sankhyaService.getCodParcWithCPF(payload.cpf, token);

            if (codParc == null) {
                const endereco = await this.fidelimaxService.getEnderecoDoConsumidor(payload.cpf);
                console.log('Endereco FIDELIMAX:', endereco);

                // CEP via APIs públicas
                let pubAddr:
                    | { cep: string; uf: string; estado: string; cidade: string; logradouro: string; bairro: string }
                    | null = null;

                const cepDigits = onlyDigits(String(endereco?.cep ?? ''));
                if (cepDigits.length === 8) {
                    try {
                        pubAddr = await resolveCepPublico(cepDigits);
                        console.log('Endereco (público):', pubAddr);
                    } catch (e) {
                        console.warn('Falha ao resolver CEP em APIs públicas:', e);
                    }
                }

                // higieniza telefone e separa DDD / número
                const telDigits = onlyDigits(String(payload.telefone ?? ''));
                const ddd = telDigits.slice(0, 2) || '';
                const telefone = telDigits.slice(2) || '';

                // valores de endereço
                const cep = pubAddr?.cep ?? cepDigits ?? '';
                const estado = pubAddr?.estado ?? '';               // Estado por extenso (mantém acentos)
                // REMOVE acentos de rua, bairro e cidade:
                const cidade = stripAccents(pubAddr?.cidade ?? '');
                const rua = stripAccents(pubAddr?.logradouro ?? '');
                const bairro = stripAccents(pubAddr?.bairro ?? 'Centro');
                const numero = String(endereco?.numero ?? 'S/N');

                // cria cliente na Sankhya e captura o código retornado
                const novoCodParc = await this.sankhyaService.IncluirClienteSankhya(
                    payload.nome,
                    payload.email,
                    payload.cpf,
                    ddd,
                    telefone,
                    cep,
                    estado,   // com acento (ex.: "Paraíba")
                    cidade,   // SEM acento
                    rua,      // SEM acento
                    numero,
                    bairro,   // SEM acento (ou "Centro")
                    payload.nascimento,
                    token
                );

                console.log('Inclusão cliente retornou:', novoCodParc);

                codParc = novoCodParc ?? codParc;

                if (codParc) {
                    await this.sankhyaService.atualizarCampoParceiroCampo(token, codParc, 'EMAILNFE', payload.email);
                    await this.sankhyaService.atualizarCampoParceiroCampo(token, codParc, 'AD_CONSTRUTORA', 1);
                    await this.sankhyaService.atualizarCampoParceiroCampo(token, codParc, 'AD_CONTRIBUINTE', 1);
                } else {
                    console.warn('Não foi possível obter codParc após inclusão; pulando atualizações.');
                }
            } else {
                console.log('Cliente já possui cadastro:', codParc);
                // opcional: sincronizar flags/email
            }
        } catch (err) {
            console.error('Erro em registerUser:', err);
            throw err;
        } finally {
            const log = "registerUser"
            await this.sankhyaService.logout(token, log);
        }
    }

    async registerInSankhya() {

    }

    async registerInClub() {

    }

    //@Cron('*/15 * * * * *')
    async testeA() {
        const token = await this.sankhyaService.login();
        const consumidores = await this.sankhyaService.convertEstadoToUF('Paraíba');
        console.log(consumidores)
        const log = "testeA"
        await this.sankhyaService.logout(token, log);
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
            const log = "atualizarEntregas!"
            await this.sankhyaService.logout(token, log);
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
            const log = "usoParaAtualizarNotasEmLote"
            await this.sankhyaService.logout(token, log);
        }
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
            const log = "atualizarEntregas2"
            await this.sankhyaService.logout(token, log);
        }
    }

    //@Cron('*/10 * * * * *', { timeZone: 'America/Fortaleza' })
    async atualizarEntregasBack() {
        const acumulado: any[] = [];
        const token = await this.sankhyaService.login();


        for (let cont = 6; cont >= 0; cont--) {
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
        //const response = await this.sankhyaService.NotasPendentesDeSeparacao(token)
        const logb = await this.sankhyaService.notasPendentesConferencia(token)
        console.log(logb)
        const log = "Teste B"
        await this.sankhyaService.logout(token, log);
    }

    //#endregion

    // ...

    // SANKHYA SERVICE

    //#region Lançamentos e consulta de notas 

    //Lançamento de nota positiva/nota de compra no Sankhya

    async getProductForNota(codProd: number, token: string): Promise<any> {

        let codigo = codProd.toString()

        let codProduto = codProd;

        if (codigo.length > 5) {
            const codProdReal = await this.sankhyaService.getCodProduto(codProd, token);
            if (!codProdReal) {
                throw new NotFoundException(`Não encontrei CODPROD para CODBARRA ${codProd}`);
            }
            codigo = String(codProdReal).padStart(12, '0');
            codProduto = codProdReal;
        }


        try {
            const [produto, estoque] = await Promise.all([
                this.sankhyaService.getProdutoLoc(codProduto, token),  // Record<string, any> | null
                this.sankhyaService.getEstoqueFront(codProduto, token),     // EstoqueLinha[]
            ]);



            if (!produto) return null;

            // 1) Se quiser manter o shape do produto e anexar estoque + totais:
            return {
                ...produto,
                estoque,
            };;
        } finally {
            const log = "getProduct"
            //await this.sankhyaService.logout(token, log);
        }
    }

    async ajustePositivo(produtos: { codProd: number; diference: number }[], userEmail: string) {
        let token = await this.sankhyaService.login();
        // 1) tenta incluir no Sankhya (se der erro, vai lançar e NÃO executa o prisma)
        const sankhyaResp = await this.sankhyaService.incluirAjustesPositivo(produtos, token);
        console.log("Nota: " + JSON.stringify(sankhyaResp.nota));
        console.log("Lançados: " + JSON.stringify(sankhyaResp.lancados))
        console.log("Falha: " + JSON.stringify(sankhyaResp.falhas))
        await this.sankhyaService.logout(token, "ajustePositivo")

        // 2) só chega aqui se NÃO houve erro

        if (sankhyaResp.lancados.length > 0) {
            await this.prismaService.createLogSync("Ajuste Positivo - Itens lançados em nota de venda ", "FINALIZADO", "Numero da nota: " + sankhyaResp.nota.responseBody, userEmail)

            await this.prismaService.incluirNota(sankhyaResp.lancados);
            //await this.sankhyaService.confirmarNota(sankhyaResp.nota.responseBody.pk.NUNOTA.$, token);
        }




        if (sankhyaResp.falhas.length > 0) {
            await this.prismaService.createLogSync("Ajuste Positivo - Itens lançados em nota de venda ", "FALHA", JSON.stringify(sankhyaResp.falhas), userEmail)
            throw new BadRequestException('ITENS NÃO PUDERAM SER LANÇADOS EM NOTA ' + JSON.stringify(sankhyaResp.falhas));
        }

        // 3) devolve o que você quiser pro front

        return {
            ok: true,
            sankhya: sankhyaResp,
        };
    }



    //lançamento de nota negativa/nota de venda no Sankhya
    async ajusteNegativo(produtos: { codProd: number; diference: number }[], userEmail: string) {
        let token = await this.sankhyaService.login();
        // 1) tenta incluir no Sankhya (se der erro, vai lançar e NÃO executa o prisma)
        const sankhyaResp = await this.sankhyaService.incluirAjustesNegativo(produtos, token);
        console.log("Nota: " + JSON.stringify(sankhyaResp.nota));
        console.log("Lançados: " + JSON.stringify(sankhyaResp.lancados))
        console.log("Falha: " + JSON.stringify(sankhyaResp.falhas))
        await this.sankhyaService.logout(token, "ajusteNegativo")

        // 2) só chega aqui se NÃO houve erro

        if (sankhyaResp.lancados.length > 0) {
            await this.prismaService.createLogSync("Ajuste Negativo - Itens lançados em nota de venda ", "FINALIZADO", "Numero da nota: " + sankhyaResp.nota.responseBody, userEmail)

            await this.prismaService.incluirNota(sankhyaResp.lancados);
            //await this.sankhyaService.confirmarNota(sankhyaResp.nota.responseBody.pk.NUNOTA.$, token);
        }




        if (sankhyaResp.falhas.length > 0) {
            await this.prismaService.createLogSync("Ajuste Negativo - Itens lançados em nota de venda ", "FALHA", JSON.stringify(sankhyaResp.falhas), userEmail)
            throw new BadRequestException('ITENS NÃO PUDERAM SER LANÇADOS EM NOTA ' + JSON.stringify(sankhyaResp.falhas));
        }

        // 3) devolve o que você quiser pro front

        return {
            ok: true,
            sankhya: sankhyaResp,
        };
    }

    //consulta notas não confirmadas no Sankhya
    //@Cron('*/10 * * * * *', { timeZone: 'America/Fortaleza' })
    async listarNotasNaoConfirmadas() {
        const token = await this.sankhyaService.login();
        const notas = await this.sankhyaService.listarNotasNaoConfirmadas2(token);
        await this.sankhyaService.logout(token, "listarNotasNaoConfirmadas")
        return notas
    }

    //apagar notas não confirmadas automaticamente
    @Cron('0 0 23 * * *', { timeZone: 'America/Fortaleza' })
    async deletarNaoConfirmadas() {
        const token = await this.sankhyaService.login();
        const justificativa = 'Limpeza automática de notas não confirmadas';
        const falhas: Array<{ nunota: number; erro: string }> = [];
        const notas = (await this.sankhyaService.listarNotasNaoConfirmadas2(token)).filter((nota) => nota[7].toUpperCase() !== 'L');

        for (const row of notas) {
            const nunota = Number(row?.[0] ?? row?.NUNOTA);
            if (!Number.isFinite(nunota)) continue;

            try {
                await this.sankhyaService.cancelarNota(token, nunota, justificativa);
            } catch (e: any) {
                falhas.push({
                    nunota,
                    erro: e?.message ?? 'Erro ao deletar',
                });
            }
        }

        this.prismaService.createLogSync("Deletar Notas Não Confirmadas", "FINALIZADO", `Total: ${notas.length} | Deletadas: ${notas.length - falhas.length} | Falhas: ${falhas.length}`, "SYSTEM");
        await this.sankhyaService.logout(token, "deletarNaoConfirmadas")
        return { total: notas.length, deletadas: notas.length - falhas.length, falhas };
    }


    async listarNotasTV() {
        const token = await this.sankhyaService.login();
        const notas = (await this.sankhyaService.listarNotasTV(token));
        const log = "getNotasLoja"
        await this.sankhyaService.logout(token, log)
        return notas;
    }

    async listarNotasDfarias() {
        const token = await this.sankhyaService.login();
        const notas = (await this.sankhyaService.listarNotasTV(token));
        for (const nota of notas) {
            console.log("Nunota: " + nota.nunota + " TOP: " + nota.codtipoper)
        }
        const log = "getNotasLoja"
        await this.sankhyaService.logout(token, log)
        return notas.filter((n) => n.codtipoper === 322);
    }

    async getNotasLoja() {
        const token = await this.sankhyaService.login();
        const notas = (await this.sankhyaService.listarNotasTV(token))//.filter((n) => n.adTipoDeEntrega?.toUpperCase() === "EI" && n.codtipoper !== 322);
        const log = "getNotasLoja"
        await this.sankhyaService.logout(token, log)
        return notas;
    }

    async emSeparacao(nunota: number, dtneg: string, hrneg: string) {
        const token = await this.sankhyaService.login();
        const retorno = await this.sankhyaService.emSeparacao(nunota, dtneg, hrneg, token)
        await this.sankhyaService.logout(token, "emSeparacao");
        return retorno;
    }

    async desSeparacao(nunota: number) {
        const token = await this.sankhyaService.login();
        await this.sankhyaService.deseparacao(nunota, token)
        await this.sankhyaService.logout(token, "emSeparacao");
    }

    //#endregion

    //#region Consulta e Atualização de Produtos no Sankhya 

    //consulta produto por codbarra ou codprod
    async getProduct(codProd: number): Promise<any> {
        const token = await this.sankhyaService.login();
        let codigo = codProd.toString()

        let codProduto = codProd;

        if (codigo.length > 5) {
            const codProdReal = await this.sankhyaService.getCodProduto(codProd, token);
            if (!codProdReal) {
                throw new NotFoundException(`Não encontrei CODPROD para CODBARRA ${codProd}`);
            }
            codigo = String(codProdReal).padStart(12, '0');
            codProduto = codProdReal;
        }



        try {
            const [produto, estoque] = await Promise.all([
                this.sankhyaService.getProdutoLoc(codProduto, token),  // Record<string, any> | null
                this.sankhyaService.getEstoqueFront(codProduto, token),     // EstoqueLinha[]
            ]);

            if (!produto) return null;
            // 1) Se quiser manter o shape do produto e anexar estoque + totais:
            return {
                ...produto,
                estoque,
            };;
        } finally {
            const log = "getProduct"
            await this.sankhyaService.logout(token, log);
        }
    }

    //atualiza localizacao do produto
    async updateProductLocation(codProd: number, location: string, userEmail: string) {
        const sankhyaToken = await this.sankhyaService.login();
        const resp = await this.sankhyaService.updateLocation(codProd, location, sankhyaToken);
        const log = "updateProductLocation"
        await this.sankhyaService.logout(sankhyaToken, log);
        await this.prismaService.createLogSync("Atualizar Localização do Produto(" + codProd + ") para: " + location, "FINALIZADO", JSON.stringify(resp.responseBody), userEmail);
        return resp;
    }

    //atualiza localizacao2 do produto
    async updateProductLocation2(codProd: number, location: string, userEmail: string) {
        const sankhyaToken = await this.sankhyaService.login();
        const resp = await this.sankhyaService.updateLocation2(codProd, location, sankhyaToken);
        const log = "updateProductLocation2"
        await this.sankhyaService.logout(sankhyaToken, log);
        await this.prismaService.createLogSync("Atualizar Localização 2(AD_LOCALIZACAO) do Produto(" + codProd + ") para: " + location, "FINALIZADO", JSON.stringify(resp.responseBody), userEmail);
        return resp;
    }

    //atualiza quantidade maxima(AD_QTDMAX) do produto
    async updateQtdMax(codProd: number, quantidade: number, userEmail: string) {
        const sankhyaToken = await this.sankhyaService.login();
        const resp = await this.sankhyaService.updateQtdMax(codProd, quantidade, sankhyaToken);
        const log = "updateQtdMax"
        await this.sankhyaService.logout(sankhyaToken, log);
        await this.prismaService.createLogSync(("Atualizar Quantidade Máxima do Produto(" + codProd + ") quantidade:" + quantidade), "FINALIZADO", JSON.stringify(resp.responseBody), userEmail);
        return resp;
    }

    //cadastra codigo de barras para o produto(codBarra na tabela TGFBAR)
    async cadastarCodBarras(codBarras: number, codProduto: number, userEmail: string) {
        const token = await this.sankhyaService.login();
        await this.prismaService.createLogSync("Cadastrar Código de Barras", "FINALIZADO", `Cód.Barras: ${codBarras} || Cod.Produto: ${codProduto}`, userEmail);
        const resp = await this.sankhyaService.criarCodigoBarras(codBarras, codProduto, token);
        await this.sankhyaService.logout(token, "cadastrarCodBarras")
        return resp;
    }

    //consulta todos os produtos de uma determinada localizacao
    async getProductsByLocation(location: string) {
        const token = await this.sankhyaService.login();

        try {
            const rows = await this.sankhyaService.getProductsByLocation(location, token);

            const list: any[] = Array.isArray(rows) ? rows : [];

            return list.map((r: any) => ({
                CODPROD: Number(r.CODPROD),
                DESCRPROD: r.DESCRPROD ?? null,
                LOCALIZACAO: r.LOCALIZACAO ?? location,
                ESTOQUE:
                    r.DISPONIVEL ??
                    r.ESTOQUE ??
                    r.QTDESTOQUE ??
                    null,
                QTDESTOQUE: r.QTDESTOQUE
            }));
        } finally {
            const log = "getProductsByLocation"
            await this.sankhyaService.logout(token, log);
        }
    }

    //consulta todos os produtos de uma determinada localizacao
    async getAllProductsByLocation(location: string) {
        const token = await this.sankhyaService.login();

        try {
            const rows = await this.sankhyaService.getProductsByLocation(location, token);

            const list: any[] = Array.isArray(rows) ? rows : [];

            return list.map((r: any) => ({
                DESCRPROD: r.DESCRPROD ?? null,
                LOCALIZACAO: r.LOCALIZACAO ?? location,
                ESTOQUE:
                    r.DISPONIVEL ??
                    r.ESTOQUE ??
                    r.QTDESTOQUE ??
                    null,
                QTDESTOQUE: r.QTDESTOQUE
            }));
        } finally {
            const log = "getAllProductsByLocation"
            await this.sankhyaService.logout(token, log);
        }
    }

    async listarFilaCabos() {
        const token = await this.sankhyaService.login();
        const retorno = await this.sankhyaService.listarFilaCabos(token);
        await this.sankhyaService.logout(token, "listarFilaCabos")
        return retorno;
    }

    async listarItensPendentes() {
        const token = await this.sankhyaService.login()
        const retorno = await this.sankhyaService.listarPendenciasEstoque(token)
        console.log(retorno)
        await this.sankhyaService.logout(token, "listarItensPendentes")
        return retorno//.filter((p) => p[32] > p[35]);
    }

    async listarItensNotaLid(nunota: number | string) {
        const nunotaNumber = Number(nunota)

        const token = await this.sankhyaService.login()
        const retorno = await this.sankhyaService.listarPendenciasEstoque(token)

        const filtrado = retorno.filter(p => p[5] === nunotaNumber && p[32] <= p[35])

        await this.sankhyaService.logout(token, "listarItensPendentes")
        return filtrado
    }


    async pedidosLid() {
        const token = await this.sankhyaService.login()
        const retorno = await this.sankhyaService.listarPedidosLid(token);
        await this.sankhyaService.logout(token, "listarItensPendentes")
        return retorno;
    }

    async atualizarCoresProdutos() {
        const token = await this.sankhyaService.login();
        const retorno = await this.sankhyaService.aplicarCoresProdutos(token);
        //const token2 = await this.sankhyaService.login();
        const retorno2 = await this.sankhyaService.removerCoresProdutos(token);
        //await this.sankhyaService.logout(token2, "atualizarCoresProdutos")
        await this.sankhyaService.logout(token, "atualizarCoresProdutos")
        const retorna = (JSON.stringify(retorno) + " " + JSON.stringify(retorno2))
        return retorna;
    }

    //#endregion

    //#region IMPRESSÃO DE ETIQUETA || CODIGOS DEVEM SER REPASSADOS PARA SERVICE AUXILIAR NO FUTURO
    async imprimirEtiquetaCabo(nunota: number, parceiro: string, vendedor: string, codprod: number, descrprod: string, qtdneg: number) {
        const token = await this.sankhyaService.login()
        const codBarras = codprod
        const body: EtiquetaCabo = {
            nunota: nunota,
            parceiro: parceiro,
            vendedor: vendedor,
            codprod: codprod,
            descrprod: descrprod,
            qtdneg: qtdneg,
            codbarras: String(codprod),
        };
        const pdfBuffer = await this.printService.gerarEtiquetaCaboPdf(body);
        await this.sankhyaService.logout(token, "imprimirEtiquetaCabo")
        return pdfBuffer;
    }

    async imprimirEtiquetaLoc(localizacao: Localizacoes) {
        const token = await this.sankhyaService.login()
        const pdfBuffer = await this.printService.gerarEtiquetaLocPDF(localizacao.Endereco, localizacao.Armazenamento);
        await this.sankhyaService.logout(token, "imprimirEtiquetaLoc")
        return pdfBuffer;
    }

    async imprimirEtiquetaLocMulti() {
        const token = await this.sankhyaService.login()
        const localizacoes = await this.prismaService.getAllLocalizacoes();
        let items: { localizacao: string, endereco: string }[] = []
        for (const localizacao of localizacoes) {
            items.push({ endereco: localizacao.Endereco, localizacao: localizacao.Armazenamento })
        }
        const etiquetas = orderByEnderecoStrict(items)
        const pdfBuffer = await this.printService.gerarEtiquetaLocQRCodeMulti(etiquetas);
        await this.sankhyaService.logout(token, "imprimirEtiquetaLoc")
        return pdfBuffer;
    }

    async imprimirEtiquetaTest() {
        const pdf = await this.printService.gerarEtiquetaTeste();
        return pdf;
    }

    async imprimirEtiqueta(nunota: number, parceiro: string, vendedor: string, codprod: number, descrprod: string, qtdneg: number, sequencia: number) {
        const token = await this.sankhyaService.login()
        await this.sankhyaService.updateImpresso(nunota, sequencia, token)
        const codBarras = codprod
        const body: EtiquetaCabo = {
            nunota: nunota,
            parceiro: parceiro,
            vendedor: vendedor,
            codprod: codprod,
            descrprod: descrprod,
            qtdneg: qtdneg,
            codbarras: String(codprod),
        };
        const pdf = await this.printService.gerarEtiquetaPdf(body);
        await this.sankhyaService.logout(token, "imprimir etiqueta")
        return pdf;
    }

    async impresso(nunota: number, codprod: number) {
        const token = await this.sankhyaService.login()
        try {
            return await this.sankhyaService.updateImpresso(nunota, codprod, token);
        } finally {
            await this.sankhyaService.logout(token, 'updateImpresso')
        }
    }

    //#endregion

    // PRISMA SERVICE

    //#region Login 

    // ?????
    async sendAuth(auth: string) {
    }

    //realiza o login do usuario |
    async loginSession(userEmail: string) {
        return this.prismaService.loginSession(userEmail);
    }

    //realiza o logout do usuario | 
    async logoutSession(userEmail: string) {
        return this.prismaService.logoutSession(userEmail);
    }

    //altera a senha do usuario
    async alterarSenha(userEmail: string, senha: string) {
        return this.prismaService.alterarSenha(userEmail, senha);
    }

    //consulta os usuarios logados
    async getLogins() {
        return this.prismaService.getLogins();
    }

    //#endregion

    //#region Inventario 

    //adiciona contagem ao inventario
    async addCount(codProd: number, contagem: number, descricao: string, localizacao: string, userEmail: string) {
        const token = await this.sankhyaService.login();
        const log = "addcount: " + userEmail + " || " + codProd + " || " + contagem + " || " + descricao + " || " + localizacao

        try {

            const linhas = await this.sankhyaService.getEstoqueFront(codProd, token);

            const linha1100 = linhas.find(
                (l) => Number(l.CODLOCAL) === 1100,
            );

            const inStockRaw =
                linha1100 && Number.isFinite(Number(linha1100.DISPONIVEL))
                    ? Number(linha1100.DISPONIVEL)
                    : 0;

            const countInt = Math.round(contagem);   // 👈 garante Int
            const stockInt = Math.round(inStockRaw); // 👈 garante Int
            //this.prismaService.updateNotFound2(localizacao, codProd)
            this.prismaService.createLogSync("Adicionar contagem", "FINALIZADO", log, userEmail);
            return this.prismaService.addCount(
                codProd,
                countInt,
                stockInt,
                userEmail,
                descricao ?? '',            // 👈 garante string
                localizacao || 'Z-000'    // 👈 fallback
            );
        } finally {
            await this.sankhyaService.logout(token, log);
        }
    }

    //adiciona contagem ao inventario com reservado
    async addCount2(codProd: number, contagem: number, descricao: string, localizacao: string, reservado: number, userEmail: string) {

        const token = await this.sankhyaService.login();
        const log = "addcount2" + userEmail + " || " + codProd + " || " + contagem + " || " + descricao + " || " + localizacao


        try {

            const linhas = await this.sankhyaService.getEstoqueFront(codProd, token);

            const linha1100 = linhas.find(
                (l) => Number(l.CODLOCAL) === 1100,
            );

            const inStockRaw =
                linha1100 && Number.isFinite(Number(linha1100.DISPONIVEL))
                    ? Number(linha1100.DISPONIVEL)
                    : 0;

            const countInt = Math.round(contagem);   // 👈 garante Int
            const stockInt = Math.round(inStockRaw); // 👈 garante Int

            const items = await this.sankhyaService.getProductsByLocation(localizacao, token);
            const codProdutos: number[] = [];
            for (const item of items) {
                codProdutos.push(item.CODPROD)
            }
            //this.prismaService.updateNotFound2(localizacao, codProd);
            this.prismaService.createLogSync("Adicionar contagem", "FINALIZADO", log, userEmail);
            return this.prismaService.addCount2(
                codProd,
                countInt,
                stockInt,
                userEmail,
                descricao ?? '',            // 👈 garante string
                localizacao || 'Z-000',     // 👈 fallback
                reservado || 0
            );
        } finally {
            await this.sankhyaService.logout(token, log);
        }
    }

    //adiciona recontagem ao inventario
    async addNewCount(codProd: number, contagem: number, descricao: string, localizacao: string, reservado: number, userEmail: any) {

        const token = await this.sankhyaService.login();
        const log = "addNewCount" + userEmail + " || " + codProd + " || " + contagem + " || " + descricao + " || " + localizacao


        try {


            const linhas = await this.sankhyaService.getEstoqueFront(codProd, token);

            const linha1100 = linhas.find(
                (l) => Number(l.CODLOCAL) === 1100,
            );

            const inStockRaw =
                linha1100 && Number.isFinite(Number(linha1100.DISPONIVEL))
                    ? Number(linha1100.DISPONIVEL)
                    : 0;

            const countInt = Math.round(contagem);   // 👈 garante Int
            const stockInt = Math.round(inStockRaw); // 👈 garante Int
            this.prismaService.createLogSync("Adicionar recontagem", "FINALIZADO", log, userEmail);

            return this.prismaService.addNewCount(
                codProd,
                countInt,
                stockInt,
                userEmail,
                descricao ?? '',            // 👈 garante string
                localizacao || 'Z-000',     // 👈 fallback
                reservado || 0
            );
        } finally {
            await this.sankhyaService.logout(token, log);
        }
    }

    //retorna a localizações e quantidade maxima do produto
    async getProductLocation(codProduto: number): Promise<any> {
        const token = await this.sankhyaService.login();
        let codProd = codProduto;
        if (String(codProduto).length > 5) {
            codProd = Number(await this.sankhyaService.getCodProduto(codProduto, token))
        }
        try {
            const [produto, estoque] = await Promise.all([
                this.sankhyaService.getProdutoLoc(codProd, token),
                this.sankhyaService.getEstoqueFront(codProd, token),
            ]);

            if (!produto) return null;
            return {
                ...produto,
                estoque,
            };;
        } finally {
            const log = "getProductLocation"
            await this.sankhyaService.logout(token, log);
        }
    }

    //consulta a lista de contagens realizadas
    async getInvetoryList() {
        const token = await this.sankhyaService.login();
        //await this.usersService.addCount(codProd, count)
        const log = "getInventoryList"
        await this.sankhyaService.logout(token, log);
    }

    //consulta a lista de produtos não encontrados
    async getNotFoundList() {
        return this.prismaService.getNotFoundList();
    }

    //consulta a lista de produtos não encontrados e atualiza com o codigo do produto passado
    async getNotFoundListSup(localizacao: string, codProd: number) {
        const notFound = await this.prismaService.getNotFound(localizacao)

        if (!notFound) {
            const codigos: number[] = [];
            const codProduto: number[] = [];
            codProduto.push(codProd)
            const itens = await this.getProductsByLocation(localizacao);
            for (const codigo of itens) {
                codigos.push(codigo.CODPROD)
            }
            const faltandoSet = new Set(codigos);
            const contadosSet = new Set(codProduto);

            faltandoSet.delete(codProd);
            contadosSet.add(codProd);

            const novoCodProdFaltando = Array.from(faltandoSet);
            const novoCodProdContados = Array.from(contadosSet);


            return this.prismaService.createNotFound(localizacao, novoCodProdFaltando, novoCodProdContados)
        } else {


            const faltandoSet = new Set<number>((notFound.codProdFaltando ?? []) as number[]);
            const contadosSet = new Set<number>((notFound.codProdContados ?? []) as number[]);

            faltandoSet.delete(codProd);
            contadosSet.add(codProd);

            const novoCodProdFaltando = Array.from(faltandoSet); // number[]
            const novoCodProdContados = Array.from(contadosSet); // number[]

            return this.prismaService.updateNotFoundList(
                localizacao,
                novoCodProdFaltando,
                novoCodProdContados
            );
        }
    }

    //atualiza a lista de produtos não encontrados
    async notFoundListFull() {
        const inventoryList = await this.prismaService.getInventoryList();
        for (const inventario of inventoryList) {
            //const codProduto: number[] = [];
            await this.updateNotFound2(inventario.localizacao, inventario.codProd);
        }
        return this.prismaService.getNotFoundList();
    }

    //verifica se aquela localização já possui produtos contados ou não localizados e atualiza a lista | METODO REDUNDANTE, NECESSÁRIO VERIFICAR USOS PRA EVENTUAL DESCARTE
    async updateNotFound2(localizacao: string, codProd: number) {
        const notFound = await this.prismaService.getNotFound(localizacao)

        if (!notFound) {
            const codigos: number[] = [];
            const codProduto: number[] = [];
            codProduto.push(codProd)
            const itens = await this.getProductsByLocation(localizacao);
            for (const codigo of itens) {
                codigos.push(codigo.CODPROD)
            }
            const faltandoSet = new Set(codigos);
            const contadosSet = new Set(codProduto);

            faltandoSet.delete(codProd);
            contadosSet.add(codProd);

            const novoCodProdFaltando = Array.from(faltandoSet);
            const novoCodProdContados = Array.from(contadosSet);


            return this.prismaService.createNotFound(localizacao, novoCodProdFaltando, novoCodProdContados)
        } else {


            const faltandoSet = new Set(notFound.codProdFaltando);
            const contadosSet = new Set(notFound.codProdContados);

            faltandoSet.delete(codProd);
            contadosSet.add(codProd);

            const novoCodProdFaltando = Array.from(faltandoSet);
            const novoCodProdContados = Array.from(contadosSet);

            return this.prismaService.updateNotFoundList(
                localizacao,
                novoCodProdFaltando,
                novoCodProdContados
            );
        }
    }

    //consulta produtos com multiplas localizacoes
    async getMultiLocation() {
        return this.prismaService.getMultiLocation();
    }


    //#endregion

    //#region Ajuste de Inventario

    //realiza o ajuste de contagem no primsa
    async postInplantCount(diference: number, codProd: number, id: string, userEmail: string) {
        const token = await this.sankhyaService.login();
        await this.prismaService.updateInventoryDate(id, format(new Date(), "yyyy-MM-dd'T'HH:mm:ss.SSSxxx"), userEmail)
        const log = "postInplantCount"
        await this.sankhyaService.logout(token, log);
    }

    //retorna produtos que já foram ajustados para a pagina de ajuste de contagem
    async retornarProdutos(codProd: number[], userEmail: string) {
        this.prismaService.createLogSync("Retornar produtos para ajuste de contagem", "FINALIZADO", "codProd: " + codProd + " || userEmail: " + userEmail, userEmail)
        return this.prismaService.retornarProdutos(codProd)
    }

    //consulta os itens para serem lançados em nota positiva/nota de compra 
    async getNotaPositiva() {
        return this.prismaService.getNotaPositiva();
    }

    //consulta os itens para serem lançados em nota negativa/nota de venda
    async getNotaNegativa() {
        return this.prismaService.getNotaNegativa();
    }

    //consulta os itens que já foram lançados em nota positiva/nota de compra para correção
    async getNotaPositivaCorrecao() {
        return this.prismaService.getNotaPositivaCorrecao();
    }

    //consulta os itens que já foram lançados em nota negativa/nota de venda para correção
    async getNotaNegativaCorrecao() {
        return this.prismaService.getNotaNegativaCorrecao();
    }

    //#endregion

    //#region Solicitações de produtos 

    //solicita produtos
    async solicitaProdutos(email: string, produtos: Produtos[]) {
        return this.prismaService.solicitaProduto(email, produtos)
    }

    //consulta solicitações de produtos
    async getSolicitacao() {
        return this.prismaService.getSolicitacao();
    }

    //consulta solicitações de produtos de um usuario especifico
    async getSolicitacaoUser(userEmail: string) {
        return await this.prismaService.getSolicitacaoUsuario(userEmail);
    }

    //aprova solicitação de produtos
    async aprovarSolicitacao(produtos: Produtos[], ID: string, userEmail: string) {
        const token = await this.sankhyaService.login()
        this.prismaService.baixaSolicitacao(ID, userEmail)
        const log = "aprovarSolicitacao"
        const retorno = this.sankhyaService.aprovarSolicitacao(produtos, token);
        await this.sankhyaService.logout(token, log)
        return retorno
    }

    //reprova solicitação de produtos
    async reprovarSolicitacao(ID: string, userEmail: string) {
        return this.prismaService.reprovarSolicitacao(ID, userEmail)
    }

    //#endregion

    //#region Estoque

    //atualiza curva de produtos (A/B/C/D)
    async synccurvaProdutoProdutos() {
        const token = await this.sankhyaService.login();
        const rows = await this.sankhyaService.getcurvaProdutoFromGadgetSql(token);

        for (const r of rows) {
            const codProd = Number(r['0']);
            const curvaABC = String(r['20']);
            const descricao = String(r['1']);
            await this.prismaService.updateCurva(codProd, curvaABC, descricao)
        }

        await this.sankhyaService.logout(token, "curva de produtos")

        return { total: rows.length };

    }

    //consulta curvas de produtos (A/B/C/D) 
    async getCurvas() {
        return this.prismaService.getCurvas()
    }

    //consulta curva de um produto especifico(por codProd) 
    async getCurvaById(codProd: number) {
        return this.prismaService.getCurvaById(codProd)
    }

    //consulta codigo de barras do produto
    async getCodBarras(codProduto: number) {
        const token = await this.sankhyaService.login();
        const retorno = await this.sankhyaService.getCodBarras(codProduto, token);
        await this.sankhyaService.logout(token, "getCodBarras");
        return retorno
    }

    //cria notificação de erro no estoque
    async createErroEstoque(userEmail: string, codProd: number, descricao: string) {
        return this.prismaService.createErroEstoque(userEmail, codProd, descricao)
    }

    //consulta erros de estoque
    async getAllErroEstoque() {
        return this.prismaService.getAllErroEstoque();
    }

    //lançamento da correção de erros no estoque
    async correcaoErroEstoque() {
        await this.prismaService.correcaoErroEstoque();
        return null;
    }

    //marcar erro de estoque como finalizado
    async finalizarErroEstoque(id: string, descricao: string, userEmail: string) {
        return this.prismaService.finalizarErroEstoque(id, descricao, userEmail)
    }

    //#endregion

    //#region Triagem

    async getSeparadores() {
        return this.prismaService.getSeparadores();
    }

    async getPedidoSeparador(userEmail: string) {
        return this.prismaService.getPedidoSeparador(userEmail);
    }

    async adicionarSeparador(userEmail: string, estoque: string) {
        return this.prismaService.adicionarSeparador(userEmail, estoque);
    }

    async removerSeparador(userEmail: string, estoque: string) {
        return this.prismaService.removerSeparador(userEmail, estoque);
    }

    async getEstoqueById(region: string) {
        return this.prismaService.getEstoqueById(region);
    }

    async getEstoque() {
        return this.prismaService.getEstoque();
    }

    //#endregion

    //#region ADMIN

    //consulta todos os usuarios
    async getUsuarios() {
        return this.prismaService.getUsuarios();
    }

    //altera a role do usuario
    async changeRole(userEmail: string, role: string, reqEmail: string) {
        this.prismaService.createLogSync("Alterar role de usuario", "FINALIZADO", "userEmail: " + userEmail + " || role: " + role + " || reqEmail: " + reqEmail, reqEmail);
        return this.prismaService.changeRole(userEmail, role);
    }

    //cria novo usuario
    async criarUsuario(userEmail: string, senha: string, reqEmail: string) {
        this.prismaService.createLogSync("Criar novo usuario", "FINALIZADO", "userEmail: " + userEmail + " || reqEmail: " + reqEmail, reqEmail);
        return this.prismaService.createUser(userEmail, senha);
    }

    //reseta senha do usuario, passando userEmail como paramentro
    async resetSenha(userEmail: string, reqEmail: string) {
        this.prismaService.createLogSync("Resetar senha de usuario", "FINALIZADO", "userEmail: " + userEmail + " || reqEmail: " + reqEmail, reqEmail);
        return this.prismaService.resetSenha(userEmail);
    }

    //deleta usuario passando userEmail como paramentro
    async deleteUsuario(userEmail: string, reqEmail: string) {
        this.prismaService.createLogSync("Deletar usuario", "FINALIZADO", "userEmail: " + userEmail + " || reqEmail: " + reqEmail, reqEmail);
        return this.prismaService.deleteUsuario(userEmail);
    }

    //#endregion

    //#region Log Sync

    //monta o log sync a partir de dados encaminhados pelo controller, e faz a chamada para o prisma service
    async createLogSync(syncType: string, status: string, message: string, userEmail: string) {
        return this.prismaService.createLogSync(syncType, status, message, userEmail);
    }

    //#endregion

    //#region ifood

    async listarProdutosSankhya(params: ListParams) {
        const auth = await this.sankhyaService.login();
        const log = 'listarProdutosSankhya';

        try {
            const data = await this.sankhyaService.listarProdutosPorGrupoEFabricante(params, auth);
            return data; // { items, total }
        } finally {
            await this.sankhyaService.logout(auth, log);
        }
    }

    async getAllProdutos(): Promise<any[]> {
        const auth = await this.sankhyaService.login();
        const log = 'getAllProdutos';
        try {
            return await this.sankhyaService.getAllProdutosTGFPRO(auth, { maxRecords: 30000 });
        } finally {
            await this.sankhyaService.logout(auth, log);
        }
    }

    async getAllProdutosPaginado(params: { limit: number; offset: number; search?: string }) {
        const auth = await this.sankhyaService.login();
        const log = 'getAllProdutosPaginado';
        try {
            return this.sankhyaService.listarProdutosPorGrupoEFabricante(
                {
                    groupId: undefined,
                    manufacturerId: undefined,
                    search: params.search,
                    limit: params.limit,
                    offset: params.offset,
                },
                auth,
            );
        } finally {
            await this.sankhyaService.logout(auth, log);
        }
    }

    async cadastrarProdutosIfood(produtos: ProdutoDto[]) {
        const list = Array.isArray(produtos) ? produtos : [];

        const validos = list
            .map((p) => ({
                ...p,
                CODPROD: Number(p?.CODPROD),
                CODBARRA: String(p?.CODBARRA ?? '').trim() || null,
                CODBARRAS: Array.isArray(p?.CODBARRAS) ? p!.CODBARRAS!.map((x) => String(x ?? '').trim()).filter(Boolean) : [],
                DESCRPROD: p?.DESCRPROD ?? null,
                MARCA: (p?.MARCA ?? null) as any,
                DESCRGRUPOPROD: p?.DESCRGRUPOPROD ?? null,
            }))
            .filter((p) => Number.isFinite(p.CODPROD) && p.CODPROD > 0)
            .filter((p) => (p.CODBARRAS.length > 0) || !!p.CODBARRA);

        if (validos.length === 0) {
            throw new BadRequestException('Nenhum produto válido recebido (precisa CODPROD e ao menos 1 código de barras).');
        }
        const uniqMap = new Map<number, ProdutoDto>();
        for (const p of validos) uniqMap.set(p.CODPROD, p);
        const uniq = Array.from(uniqMap.values());


        const authTokenIfood = await this.ifoodService.getValidAccessToken();
        const merchantID = await this.ifoodService.getMerchantId(authTokenIfood);

        let items: IfoodItemIngestion[] = [];

        for (const p of uniq) {
            const barcode = (String(p.CODBARRA ?? '').trim() || p.CODBARRAS?.[0] || '').trim();
            const produto = await this.getProdutoInfos(p.CODPROD);
            items.push({
                barcode,
                name: (p.DESCRPROD ?? `PROD ${p.CODPROD}`).toString().slice(0, 120),
                plu: String(p.CODPROD), // normalmente "código externo"
                active: true,
                inventory: { stock: 0 }, // você pode preencher depois com estoque real
                details: {
                    categorization: {
                        department: null,
                        category: p.DESCRGRUPOPROD ?? null,
                        subCategory: null,
                    },
                    brand: (p.MARCA ?? null) as any,
                    unit: produto.AD_UNIDADELV,
                    volume: null,
                    imageUrl: produto.ENDIMAGEM,
                    description: null,
                    nearExpiration: false,
                    family: null,
                },
                prices: {
                    price: 0,
                    promotionPrice: null,
                },
                scalePrices: null,
                multiple: null,
                channels: null,
            }
            );

        }
        console.log(items)
        this.logger.log(`cadastrarProdutosIfood: recebidos=${list.length} válidos=${validos.length} uniq=${uniq.length} envio=${items.length}`);

        // chama iFood
        const resp = await this.ifoodService.sendItemIngestion(authTokenIfood, merchantID, items);
        console.log(resp)

        return {
            message: `Produtos enviados para o iFood: ${items.length}`,
            sent: items.length,
            merchantID,
            response: resp,
        };
    }

    async getProdutoInfos(codProd: number) {
        const token = await this.sankhyaService.login()
        const produto = await this.sankhyaService.getProdutoInfos(codProd, token);
        await this.sankhyaService.logout(token, "getProduto")
        return produto;
    }


    //#endregion

    //#region EletroBet

    async valorRoleta() {
        const value = await this.randomValue(10000,0,Number.MAX_SAFE_INTEGER)
        const lucky = await this.getLucky()
        const finalValue = await this.convertNumber(value, lucky)
        console.log(finalValue)
        return {valor: finalValue};
    }

    async randomValue(total: number, min: number, max: number): Promise<number[]> {
        // Validação básica para evitar erros
        if (min > max) {
            throw new Error("O valor mínimo não pode ser maior que o máximo.");
        }

        const resultado: number[] = [];

        for (let i = 0; i < total; i++) {
            const numero = randomInt(min, 281474976710655);
            resultado.push(numero);
        }

        return resultado;
    }

    async getLucky() {
        return  {
        muitoDificil: 500,
        dificil: 1000,
        razoavel: 3000,
        facil:10000
    }
    }

    async convertNumber(value: number[], lucky: Sorte) {
        const unicos = new Set(value)
        const sorteio = value.length - unicos.size;
        if(sorteio >= lucky.muitoDificil){
            return randomInt(8, 11)
        }
        if(sorteio >= lucky.dificil){
            return randomInt(5, 8)
        }
        if(sorteio >= lucky.razoavel){
            return randomInt(3,5)
        }
        return randomInt(1,3)
    }

    

  
    //#region metodos Cron
    //@Cron('*/5 * * * *', { timeZone: 'America/Sao_Paulo' })
    async criarLocalizacoes() {
    }

    //@Cron('*/1 * * * *', { timeZone: 'America/Sao_Paulo' })
    async deleteLocalizacoes() {
        console.log("delete")
        await this.prismaService.deleteAllLocalizacoes();
    }


    async updateLocalizacoes(items: Localizacoes[]) {
        await this.prismaService.updateLocalizacoes(items)
    }

    async getAllLocalizacoes() {
        return await this.prismaService.getAllLocalizacoes();
    }

    //#endregion

}
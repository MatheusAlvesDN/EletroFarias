import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../Prisma/prisma.service';
import { CrmStatus } from '@prisma/client';
import { CrmGateway } from './crm.gateway';
import { SankhyaService } from '../Sankhya/sankhya.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class CrmService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly sankhya: SankhyaService,
        @Inject(forwardRef(() => CrmGateway))
        private readonly crmGateway: CrmGateway
    ) { }

    // ===================== CLIENTES / LEADS =====================

    async criarCliente(data: { nome: string; email?: string; telefone?: string; documento?: string; codParc?: string }) {
        return this.prisma.crmCliente.create({ data });
    }

    async listarClientes() {
        return this.prisma.crmCliente.findMany({
            orderBy: { createdAt: 'desc' }
        });
    }

    // ===================== FUNIL DE VENDAS =====================

    async criarPedido(userId: string, data: { clienteId: string; observacoes?: string; itens: any[] }) {
        // Cálculo seguro do total do pedido diretamente no backend
        const valorTotal = data.itens.reduce(
            (acc, item) => acc + (item.quantidade * item.precoUnitario),
            0
        );

        const pedido = await this.prisma.crmPedido.create({
            data: {
                userId,
                clienteId: data.clienteId,
                valorTotal,
                observacoes: data.observacoes,
                itens: {
                    create: data.itens.map(item => ({
                        codProd: Number(item.codProd),
                        descricao: item.descricao,
                        quantidade: item.quantidade,
                        precoUnitario: item.precoUnitario,
                        precoTotal: item.quantidade * item.precoUnitario,
                    }))
                }
            },
            include: {
                itens: true,
                cliente: true,
            }
        });

        // Tenta sincronizar com o Sankhya imediatamente
        try {
            await this.enviarOrcamentoParaSankhya(pedido.id);
        } catch (e) {
            console.error(`[CRM] Falha na sincronização automática do pedido ${pedido.id}:`, e.message);
        }

        return pedido;
    }

    async adicionarItem(pedidoId: string, item: { codProd: number; descricao: string; quantidade: number; precoUnitario: number }) {
        // 1. Adiciona o item
        await this.prisma.crmPedidoItem.create({
            data: {
                pedidoId,
                codProd: item.codProd,
                descricao: item.descricao,
                quantidade: item.quantidade,
                precoUnitario: item.precoUnitario,
                precoTotal: item.quantidade * item.precoUnitario,
            }
        });

        // 2. Recalcula o total do pedido
        await this.recalcularTotalPedido(pedidoId);

        // 3. Sincroniza com Sankhya
        return this.enviarOrcamentoParaSankhya(pedidoId);
    }

    async removerItem(pedidoId: string, itemId: string) {
        // 1. Remove o item
        await this.prisma.crmPedidoItem.delete({
            where: { id: itemId }
        });

        // 2. Recalcula o total do pedido
        await this.recalcularTotalPedido(pedidoId);

        // 3. Sincroniza com Sankhya
        return this.enviarOrcamentoParaSankhya(pedidoId);
    }

    private async recalcularTotalPedido(pedidoId: string) {
        const itens = await this.prisma.crmPedidoItem.findMany({
            where: { pedidoId }
        });

        const valorTotal = itens.reduce((acc, item) => acc + Number(item.precoTotal), 0);

        await this.prisma.crmPedido.update({
            where: { id: pedidoId },
            data: { valorTotal }
        });
    }

    async listarFunil(userId?: string) {
        const total = await this.prisma.crmPedido.count();
        console.log(`Total absoluto de pedidos no banco: ${total}`);
        console.log("Chamando listarFunil no banco...");
        try {
            const res = await this.prisma.crmPedido.findMany({
                where: userId ? { userId } : undefined,
                include: {
                    cliente: {
                        select: { nome: true, codParc: true, documento: true }
                    },
                    vendedor: {
                        select: { email: true, role: true }
                    },
                    itens: true
                },
                orderBy: { updatedAt: 'desc' }
            });
            console.log(`Pedidos encontrados no banco: ${res.length}`);
            return res;
        } catch (error: any) {
            console.error("Erro ao buscar funil no banco:", error.message);
            throw error;
        }
    }

    async atualizarStatus(pedidoId: string, status: CrmStatus) {
        // Ideal para o drag-and-drop do Kanban no frontend
        return this.prisma.crmPedido.update({
            where: { id: pedidoId },
            data: { status },
        });
    }

    // ===================== COMENTÁRIOS E AGENDA =====================

    async adicionarComentario(userId: string, pedidoId: string, texto: string) {
        try {
            console.log(`Adicionando comentário: User=${userId}, Pedido=${pedidoId}`);
            const comentario = await this.prisma.crmComentario.create({
                data: {
                    userId,
                    pedidoId,
                    texto
                },
                include: {
                    usuario: { select: { email: true } }
                }
            });

            // Dispara notificação em tempo real
            await this.criarNotificacao(
                userId,
                "Novo Comentário",
                `Você adicionou um comentário no pedido #${pedidoId.slice(-6)}`
            );

            return comentario;
        } catch (error: any) {
            console.error("Erro ao criar comentário no Prisma:", error.message);
            throw error;
        }
    }

    async listarComentarios(pedidoId: string) {
        return this.prisma.crmComentario.findMany({
            where: { pedidoId },
            include: {
                usuario: { select: { email: true } }
            },
            orderBy: { createdAt: 'asc' }
        });
    }

    async adicionarAgenda(userId: string, pedidoId: string, data: { titulo: string; descricao?: string; dataAgendada: any }) {
        try {
            console.log(`Adicionando agenda: User=${userId}, Pedido=${pedidoId}`);
            const agenda = await this.prisma.crmAgenda.create({
                data: {
                    userId,
                    pedidoId,
                    titulo: data.titulo,
                    descricao: data.descricao,
                    dataAgendada: new Date(data.dataAgendada)
                }
            });

            // Notifica
            await this.criarNotificacao(
                userId,
                "Lembrete Agendado",
                `Compromisso: ${data.titulo} para ${new Date(data.dataAgendada).toLocaleString('pt-BR')}`
            );

            return agenda;
        } catch (error: any) {
            console.error("Erro ao criar agenda no Prisma:", error.message);
            throw error;
        }
    }

    async listarAgenda(userId?: string, pedidoId?: string) {
        return this.prisma.crmAgenda.findMany({
            where: {
                userId: userId || undefined,
                pedidoId: pedidoId || undefined
            },
            orderBy: { dataAgendada: 'asc' }
        });
    }

    async marcarAgendaConcluida(agendaId: string) {
        return this.prisma.crmAgenda.update({
            where: { id: agendaId },
            data: { concluido: true }
        });
    }

    // Cron Job: Verifica agenda a cada minuto
    @Cron(CronExpression.EVERY_MINUTE)
    async checkScheduledAgenda() {
        const now = new Date();
        const inOneHour = new Date(now.getTime() + 60 * 60 * 1000);
        
        // 1. Busca tarefas que vencem em 1 hora e não foram notificadas (1h)
        const pending1h = await this.prisma.crmAgenda.findMany({
            where: {
                notificado1h: false,
                concluido: false,
                dataAgendada: {
                    lte: inOneHour,
                    gte: now // Garante que é no futuro
                }
            }
        });

        for (const item of pending1h) {
            try {
                await this.criarNotificacao(
                    item.userId,
                    "Lembrete em 1 Hora",
                    `Seu compromisso "${item.titulo}" começa em 1 hora.`,
                    `/crm/pedido/${item.pedidoId}`
                );
                await this.prisma.crmAgenda.update({
                    where: { id: item.id },
                    data: { notificado1h: true }
                });
            } catch (e) { console.error(e); }
        }

        // 2. Busca tarefas que venceram agora (ou já passaram) e não foram notificadas
        const pendingNow = await this.prisma.crmAgenda.findMany({
            where: {
                notificado: false,
                concluido: false,
                dataAgendada: {
                    lte: now
                }
            }
        });

        for (const item of pendingNow) {
            try {
                await this.criarNotificacao(
                    item.userId,
                    "Lembrete de Compromisso",
                    `Está na hora: ${item.titulo}`,
                    `/crm/pedido/${item.pedidoId}`
                );
                await this.prisma.crmAgenda.update({
                    where: { id: item.id },
                    data: { notificado: true, notificado1h: true } // Marca ambos
                });
            } catch (e) { console.error(e); }
        }
    }

    // ===================== NOTIFICAÇÕES =====================

    async criarNotificacao(userId: string, titulo: string, mensagem: string, link?: string) {
        const notif = await this.prisma.crmNotificacao.create({
            data: { userId, titulo, mensagem, link }
        });

        // Emite via WebSocket
        this.crmGateway.notifyUser(userId, { titulo, mensagem, link });

        return notif;
    }

    async listarNotificacoes(userId: string) {
        return this.prisma.crmNotificacao.findMany({
            where: { userId, lida: false },
            orderBy: { createdAt: 'desc' }
        });
    }

    async marcarNotificacaoLida(id: string) {
        return this.prisma.crmNotificacao.update({
            where: { id },
            data: { lida: true }
        });
    }

    async marcarTodasLidas(userId: string) {
        return this.prisma.crmNotificacao.updateMany({
            where: { userId, lida: false },
            data: { lida: true }
        });
    }

    async enviarResumoDiarioAgenda(userId?: string) {
        const todayStart = new Date();
        todayStart.setUTCHours(0, 0, 0, 0);
        
        const todayEnd = new Date();
        todayEnd.setUTCHours(23, 59, 59, 999);

        const where: any = {
            concluido: false,
            dataAgendada: {
                gte: todayStart,
                lte: todayEnd
            }
        };

        if (userId) {
            // Se for para um usuário específico (login), verifica se já recebeu hoje
            const jaRecebeu = await this.prisma.crmNotificacao.findFirst({
                where: {
                    userId,
                    titulo: "Resumo do Dia",
                    createdAt: { gte: todayStart }
                }
            });
            if (jaRecebeu) return { success: true };

            const count = await this.prisma.crmAgenda.count({ where: { ...where, userId } });
            if (count > 0) {
                await this.criarNotificacao(userId, "Resumo do Dia", `Você tem ${count} compromissos agendados para hoje.`);
            }
        } else {
            // Cron Geral
            const usuariosComAgenda = await this.prisma.crmAgenda.groupBy({
                by: ['userId'],
                where,
                _count: { id: true }
            });

            for (const u of usuariosComAgenda) {
                await this.criarNotificacao(u.userId, "Resumo do Dia", `Bom dia! Você tem ${u._count.id} compromissos agendados para hoje.`);
            }
        }

        return { success: true };
    }

    @Cron('0 10 * * *')
    async cronResumoDiario() {
        return this.enviarResumoDiarioAgenda();
    }

    // ===================== INTEGRACAO SANKHYA - ORÇAMENTO =====================

    async enviarOrcamentoParaSankhya(pedidoId: string) {
        const pedido = await this.prisma.crmPedido.findUnique({
            where: { id: pedidoId },
            include: {
                cliente: true,
                itens: true
            }
        });

        if (!pedido || !pedido.cliente?.codParc) {
            throw new Error("Pedido não encontrado ou cliente sem codParc sincronizado.");
        }

        const token = await this.sankhya.login();
        try {
            // Se já tem nunota, limpa os itens antes de reenviar
            if (pedido.nunota) {
                console.log(`[CRM] Limpando itens da nota ${pedido.nunota} para atualização...`);
                await this.sankhya.limparItensNota(pedido.nunota, token);
            }

            // Utilizando TOP 379 e TPV 11 conforme solicitação
            const payload = {
                cabecalho: {
                    CODPARC: pedido.cliente.codParc,
                    CODTIPOPER: '379',
                    CODTIPVENDA: '11',
                    CODEMP: '1',
                    TIPMOV: 'P',
                    OBSERVACOES: pedido.observacoes ?? undefined,
                    NUNOTA: pedido.nunota ?? undefined
                },
                itens: pedido.itens.map(item => ({
                    CODPROD: item.codProd,
                    QTDNEG: item.quantidade,
                    VLRUNIT: Number(item.precoUnitario),
                    CODLOCAL: '1100' // Local padrão
                }))
            };

            const result = await this.sankhya.incluirNotaCrm(payload, token);

            const nuNota = result?.responseBody?.pk?.NUNOTA?.$;
            if (nuNota && !pedido.nunota) {
                // Salva o nunota no pedido se for uma nova nota
                await this.prisma.crmPedido.update({
                    where: { id: pedidoId },
                    data: { 
                        nunota: Number(nuNota),
                        status: 'ORCAMENTO' // Muda para ORCAMENTO ao sincronizar
                    }
                });
            }

            return result;
        } finally {
            await this.sankhya.logout(token, 'CRM Sankhya Sync');
        }
    }

    // ===================== PRODUTOS CRM (BASE INTERNA) =====================

    async listarProdutosCrm() {
        return this.prisma.crmProduto.findMany({
            where: { ativo: true },
            orderBy: { descricao: 'asc' }
        });
    }

    async adicionarProdutoCrm(data: { codProd: string; descricao?: string; precoVenda?: number; estoque?: number; categoria?: string }) {
        const productCode = String(data.codProd).trim();
        console.log(`[CRM] Iniciando importação do produto ${productCode}...`);

        const token = await this.sankhya.login();
        try {
            const codProdNum = Number(productCode);
            if (isNaN(codProdNum)) {
                throw new Error(`Código de produto inválido: ${productCode}`);
            }

            // 1. Busca informações básicas do produto no Sankhya
            console.log(`[CRM] Buscando informações básicas...`);
            const produtoSankhya = await this.sankhya.getProdutoLoc(codProdNum, token);
            if (!produtoSankhya) {
                console.error(`[CRM] Produto ${productCode} não encontrado no Sankhya.`);
                throw new Error(`Produto ${productCode} não encontrado no Sankhya.`);
            }

            const descricao = data.descricao || produtoSankhya?.DESCRPROD || 'Produto sem descrição';
            const categoria = data.categoria || (produtoSankhya as any)?.DESCRGRUPOPROD || (produtoSankhya as any)?.GrupoProduto_DESCRGRUPOPROD || '';

            // 2. Busca preço da Tabela 0
            console.log(`[CRM] Buscando preço (Tabela 0)...`);
            let precoVenda = data.precoVenda ?? 0;
            try {
                const precos = await this.sankhya.getPrecosProdutosTabelaBatch([codProdNum], 0, token);
                if (precos && precos.length > 0) {
                    precoVenda = Number(precos[0].valor) || 0;
                }
            } catch (e) {
                console.warn(`[CRM] Erro (não fatal) ao buscar preço para ${productCode}:`, e.message);
            }

            // 3. Busca estoque do Local 1100
            console.log(`[CRM] Buscando estoque (Local 1100)...`);
            let estoque = data.estoque ?? 0;
            try {
                const estoques = await this.sankhya.getEstoqueFront(codProdNum, token);
                const estoqueLocal = Array.isArray(estoques) ? estoques.find(e => e.CODLOCAL === 1100) : null;
                if (estoqueLocal) {
                    estoque = Number(estoqueLocal.ESTOQUE) || 0;
                }
            } catch (e) {
                console.warn(`[CRM] Erro (não fatal) ao buscar estoque para ${productCode}:`, e.message);
            }

            console.log(`[CRM] Upserting no Prisma...`);
            try {
                return await this.prisma.crmProduto.upsert({
                    where: { codProd: productCode },
                    update: {
                        descricao,
                        precoVenda: Number(precoVenda) || 0,
                        estoque: Math.floor(Number(estoque) || 0),
                        categoria,
                        ativo: true,
                    },
                    create: {
                        codProd: productCode,
                        descricao,
                        precoVenda: Number(precoVenda) || 0,
                        estoque: Math.floor(Number(estoque) || 0),
                        categoria,
                        ativo: true,
                    },
                });
            } catch (dbError) {
                console.error(`[CRM] Erro no banco de dados para o produto ${productCode}:`, dbError);
                throw new Error(`Falha ao persistir produto: ${dbError.message}`);
            }
        } catch (error) {
            console.error(`[CRM] Erro em adicionarProdutoCrm para ${productCode}:`, error);
            throw error;
        } finally {
            await this.sankhya.logout(token, 'CRM Sync');
        }
    }

    // ===================== INTEGRACAO SANKHYA ISOLADA (CRM) =====================

    async pesquisarNoSankhya(search: string) {
        const token = await this.sankhya.login();
        try {
            const items = await this.sankhya.searchProdutosCrm(search, token);
            return { items: items || [] };
        } finally {
            await this.sankhya.logout(token, 'CRM Search');
        }
    }

    async getProdutoSankhya(codProd: string) {
        const token = await this.sankhya.login();
        try {
            const codProdNum = Number(codProd);

            // 1. Info básica
            const prod = await this.sankhya.getProdutoLoc(codProdNum, token);
            if (!prod) return null;

            // 2. Preço Tabela 0
            let precoVenda = 0;
            try {
                const precos = await this.sankhya.getPrecosProdutosTabelaBatch([codProdNum], 0, token);
                if (precos && precos.length > 0) precoVenda = Number(precos[0].valor) || 0;
            } catch (e) { }

            // 3. Estoque Local 1100
            let estoque = 0;
            try {
                const estoques = await this.sankhya.getEstoqueFront(codProdNum, token);
                const estoqueLocal = Array.isArray(estoques) ? estoques.find(e => e.CODLOCAL === 1100) : null;
                if (estoqueLocal) estoque = Number(estoqueLocal.ESTOQUE) || 0;
            } catch (e) { }

            return {
                ...prod,
                precoVenda,
                estoque,
            };
        } finally {
            await this.sankhya.logout(token, 'CRM Product Detail');
        }
    }
}
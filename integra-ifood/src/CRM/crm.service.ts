import { Injectable } from '@nestjs/common';
import { PrismaService } from '../Prisma/prisma.service';
import { CrmStatus } from '@prisma/client';
import { SankhyaService } from '../Sankhya/sankhya.service';

@Injectable()
export class CrmService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly sankhya: SankhyaService,
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

        return this.prisma.crmPedido.create({
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
    }

    async listarFunil(userId?: string) {
        // Busca os cards do funil. Pode ser filtrado pelo Vendedor (userId)
        return this.prisma.crmPedido.findMany({
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
    }

    async atualizarStatus(pedidoId: string, status: CrmStatus) {
        // Ideal para o drag-and-drop do Kanban no frontend
        return this.prisma.crmPedido.update({
            where: { id: pedidoId },
            data: { status },
        });
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
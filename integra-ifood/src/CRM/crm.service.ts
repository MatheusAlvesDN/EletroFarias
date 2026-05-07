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
    private readonly crmGateway: CrmGateway,
  ) { }

  private isPrivileged(role: string): boolean {
    return role === 'ADMIN' || role === 'MANAGER';
  }

  // ===================== CLIENTES / LEADS =====================

  async criarCliente(data: {
    nome: string;
    email?: string;
    telefone?: string;
    documento?: string;
    codParc?: string;
  }) {
    return this.prisma.crmCliente.create({ data });
  }

  async atualizarCliente(id: string, data: {
    nome?: string;
    email?: string;
    telefone?: string;
    documento?: string;
    codParc?: string;
  }) {
    return this.prisma.crmCliente.update({
      where: { id },
      data,
    });
  }

  async listarClientes(user: { id: string, role: string, crmTags: string[] }, minha: boolean = false) {
    const tagsFilter = !this.isPrivileged(user.role) ? { tag: { in: user.crmTags || [] } } : {};
    const sellerFilter = minha ? { vendedorId: user.id } : {};

    return this.prisma.crmCliente.findMany({
      where: { ...tagsFilter, ...sellerFilter },
      include: {
        vendedor: { select: { email: true } },
        _count: { select: { leads: true, pedidos: true } }
      },
      orderBy: { nome: 'asc' }
    });
  }

  async getHistoricoCliente(clienteId: string) {
    const [leads, pedidos, comentarios] = await Promise.all([
      this.prisma.crmLead.findMany({
        where: { clienteId },
        include: { vendedor: { select: { email: true } } },
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.crmPedido.findMany({
        where: { clienteId },
        include: { itens: true, vendedor: { select: { email: true } } },
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.crmComentario.findMany({
        where: { 
          OR: [
            { lead: { clienteId } },
            { pedido: { clienteId } }
          ]
        },
        include: { usuario: { select: { email: true } } },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    return { leads, pedidos, comentarios };
  }

  async getMetricasConversao(user: { role: string, crmTags: string[] }) {
    // Filtro base de tags (empresas)
    const tagsFilter = !this.isPrivileged(user.role) ? { tag: { in: user.crmTags || [] } } : {};

    const leads = await this.prisma.crmLead.findMany({
      where: tagsFilter,
      include: {
        vendedor: { select: { email: true } },
        _count: { select: { pedidos: true } }
      }
    });

    // Agrupar por vendedor, por tag, faturamento mensal e produtos
    const stats: any = { 
      porVendedor: {}, 
      porTag: {}, 
      total: leads.length, 
      convertidos: 0,
      vendasMensais: {},
      topProdutos: {},
      alertas: { amarelos: 0, vermelhos: 0 }
    };

    const agora = new Date();

    leads.forEach(lead => {
      const vendEmail = lead.vendedor?.email || 'Sem Vendedor';
      const tag = lead.tag || 'Sem Tag';
      const isConverted = lead._count.pedidos > 0;

      if (isConverted) stats.convertidos++;

      // Stats por Vendedor
      if (!stats.porVendedor[vendEmail]) stats.porVendedor[vendEmail] = { total: 0, convertidos: 0 };
      stats.porVendedor[vendEmail].total++;
      if (isConverted) stats.porVendedor[vendEmail].convertidos++;

      // Stats por Tag
      if (!stats.porTag[tag]) stats.porTag[tag] = { total: 0, convertidos: 0 };
      stats.porTag[tag].total++;
      if (isConverted) stats.porTag[tag].convertidos++;

      // Alertas de Inatividade
      const diasInativo = Math.floor((agora.getTime() - lead.updatedAt.getTime()) / (1000 * 60 * 60 * 24));
      if (!isConverted && lead.status !== 'REPROVADO' && lead.status !== 'FATURADO') {
        if (diasInativo >= 5) stats.alertas.vermelhos++;
        else if (diasInativo >= 3) stats.alertas.amarelos++;
      }
    });

    // Buscar faturamento e produtos (últimos 6 meses)
    const seisMesesAtras = new Date();
    seisMesesAtras.setMonth(seisMesesAtras.getMonth() - 6);

    const pedidos = await this.prisma.crmPedido.findMany({
      where: {
        ...tagsFilter,
        createdAt: { gte: seisMesesAtras }
      },
      include: {
        itens: true
      }
    });

    pedidos.forEach(pedido => {
      const mes = pedido.createdAt.toLocaleString('pt-BR', { month: 'short', year: '2-digit' });
      if (!stats.vendasMensais[mes]) stats.vendasMensais[mes] = 0;
      stats.vendasMensais[mes] += Number(pedido.valorTotal);

      pedido.itens.forEach(item => {
        const key = `${item.codProd} - ${item.descricao}`;
        if (!stats.topProdutos[key]) stats.topProdutos[key] = { total: 0, qtd: 0 };
        stats.topProdutos[key].total += Number(item.precoTotal);
        stats.topProdutos[key].qtd += item.quantidade;
      });
    });

    return stats;
  }

  async listarVendedores(user: { id: string, role: string, crmTags: string[] }) {
    if (user.role === 'GERENTE') {
      return this.prisma.user.findMany({
        where: {
          role: 'VENDEDOR',
          crmTags: { hasSome: user.crmTags || [] }
        },
        select: {
          id: true,
          email: true,
          role: true,
          codVend: true,
          crmTags: true
        },
        orderBy: { email: 'asc' }
      });
    }

    return this.prisma.user.findMany({
      where: {
        role: { in: ['VENDEDOR', 'GERENTE', 'MANAGER', 'ADMIN'] }
      },
      select: {
        id: true,
        email: true,
        role: true,
        codVend: true,
        crmTags: true
      },
      orderBy: { email: 'asc' }
    });
  }

  async listarCarteiraGeral(user: { id: string, role: string, crmTags: string[] }) {
    if (user.role === 'GERENTE') {
      return this.prisma.crmCliente.findMany({
        where: {
          OR: [
            { vendedor: { crmTags: { hasSome: user.crmTags || [] } } },
            { vendedorId: null }
          ]
        },
        include: {
          vendedor: {
            select: { id: true, email: true, role: true, crmTags: true }
          }
        },
        orderBy: { nome: 'asc' }
      });
    }

    return this.prisma.crmCliente.findMany({
      include: {
        vendedor: {
          select: { id: true, email: true, role: true, crmTags: true }
        }
      },
      orderBy: { nome: 'asc' }
    });
  }

  // ===================== LEADS =====================

  async criarLead(
    user: { userId: string, role: string, crmTags: string[] },
    data: { clienteId: string; titulo?: string; tag?: string },
  ) {
    // Se não for ADMIN/MANAGER, valida se a tag está entre as permitidas do usuário
    let finalTag = data.tag;
    if (!this.isPrivileged(user.role)) {
      const allowedTags = user.crmTags || [];
      
      if (allowedTags.length === 0) {
        throw new Error('Seu usuário não possui tags (unidades) vinculadas. Entre em contato com o administrador.');
      }

      if (finalTag && !allowedTags.includes(finalTag)) {
        throw new Error(`Você não tem permissão para criar leads na unidade "${finalTag}".`);
      }

      // Se não enviou tag, usa a primeira disponível do usuário
      if (!finalTag) {
        finalTag = allowedTags[0];
      }
    } else {
      // ADMIN/MANAGER pode usar qualquer tag, default para 'LID'
      finalTag = finalTag || 'LID';
    }

    return this.prisma.crmLead.create({
      data: {
        vendedorId: user.userId,
        clienteId: data.clienteId,
        titulo: data.titulo,
        tag: finalTag,
        status: 'PROSPECCAO',
      },
      include: {
        cliente: true,
        vendedor: { select: { email: true } },
      },
    });
  }

  async listarLeads(user: { userId: string, role: string, crmTags: string[] }, clienteId?: string) {
    return this.prisma.crmLead.findMany({
      where: {
        AND: [
          clienteId ? { clienteId } : {},
          // Se não for privilegiado, filtra pelas tags do usuário
          // 1. Filtro de empresa (Tag) para usuários não-privilegiados
          // Ignorado se estiver visualizando histórico de um cliente específico
          (!this.isPrivileged(user.role) && !clienteId) ? {
            tag: { in: user.crmTags || [] }
          } : {},

          // 2. Filtro de Carteira para VENDEDOR e GERENTE
          // Ignorado se estiver visualizando histórico de um cliente específico
          ((user.role === 'VENDEDOR' || user.role === 'GERENTE') && !clienteId) ? {
            OR: user.role === 'VENDEDOR' ? [
              { vendedorId: user.userId },
              { cliente: { vendedorId: user.userId } }
            ] : [
              { vendedorId: user.userId },
              { vendedor: { crmTags: { hasSome: user.crmTags || [] } } },
              { cliente: { vendedorId: user.userId } },
              { cliente: { vendedor: { crmTags: { hasSome: user.crmTags || [] } } } }
            ]
          } : {},
        ]
      },
      include: {
        cliente: true,
        vendedor: { select: { email: true } },
        pedidos: {
          include: { 
            itens: true,
            anexos: true
          },
          orderBy: { createdAt: 'desc' },
        },
        agendas: {
          where: { concluido: false },
          select: {
            id: true,
            titulo: true,
            dataAgendada: true,
            concluido: true,
          },
          orderBy: { dataAgendada: 'asc' },
        },
        anexos: true,
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async atualizarStatusLead(leadId: string, status: CrmStatus, user: { role: string, crmTags: string[] }) {
    // Validação de tag para segurança
    const lead = await this.prisma.crmLead.findUnique({ where: { id: leadId } });
    if (!lead || (!this.isPrivileged(user.role) && !(user.crmTags || []).includes(lead.tag || ''))) {
      throw new Error('Você não tem permissão para acessar este lead.');
    }

    const updateData: any = { status };
    
    // Se o status mudou, atualiza o timestamp de SLA
    if (lead.status !== status) {
      updateData.statusUpdatedAt = new Date();
    }

    return this.prisma.crmLead.update({
      where: { id: leadId },
      data: updateData,
    });
  }

  async atualizarLead(leadId: string, data: { status?: CrmStatus, tag?: string, titulo?: string, motivoPerda?: string, observacaoPerda?: string }, user: { role: string, crmTags: string[] }) {
    const lead = await this.prisma.crmLead.findUnique({ where: { id: leadId } });
    if (!lead || (!this.isPrivileged(user.role) && !(user.crmTags || []).includes(lead.tag || ''))) {
      throw new Error('Você não tem permissão para acessar este lead.');
    }

    const updateData: any = { ...data };
    
    // Se o status mudou, atualiza o timestamp de SLA
    if (data.status && lead.status !== data.status) {
      updateData.statusUpdatedAt = new Date();
    }

    // Se estiver tentando mudar a tag, valida se o usuário pode usar a nova tag
    if (data.tag && !this.isPrivileged(user.role) && !(user.crmTags || []).includes(data.tag)) {
      throw new Error(`Você não tem permissão para usar a tag "${data.tag}".`);
    }

    return this.prisma.crmLead.update({
      where: { id: leadId },
      data,
    });
  }

  async excluirLead(leadId: string, user: { role: string, crmTags: string[] }) {
    const lead = await this.prisma.crmLead.findUnique({ where: { id: leadId } });
    if (!lead || (!this.isPrivileged(user.role) && !(user.crmTags || []).includes(lead.tag || ''))) {
      throw new Error('Você não tem permissão para excluir este lead.');
    }

    return this.prisma.crmLead.delete({
      where: { id: leadId },
    });
  }

  // ===================== FUNIL DE VENDAS =====================

  async criarPedido(
    user: { userId: string, role: string, crmTags: string[] },
    data: {
      clienteId: string;
      leadId?: string;
      observacoes?: string;
      itens: any[];
    },
  ) {
    // Se vinculou um lead, verifica se o usuário tem acesso a ele
    if (data.leadId) {
      const lead = await this.prisma.crmLead.findUnique({ where: { id: data.leadId } });
      if (!lead || (!this.isPrivileged(user.role) && !(user.crmTags || []).includes(lead.tag || ''))) {
        throw new Error('Você não tem permissão para criar pedidos para este lead.');
      }
    }
    // Cálculo seguro do total do pedido diretamente no backend
    const valorTotal = data.itens.reduce(
      (acc, item) => acc + item.quantidade * item.precoUnitario,
      0,
    );

    const pedido = await this.prisma.crmPedido.create({
      data: {
        userId: user.userId,
        clienteId: data.clienteId,
        leadId: data.leadId,
        valorTotal,
        observacoes: data.observacoes,
        itens: {
          create: data.itens.map((item) => ({
            codProd: Number(item.codProd),
            descricao: item.descricao,
            quantidade: item.quantidade,
            precoUnitario: item.precoUnitario,
            precoTotal: item.quantidade * item.precoUnitario,
          })),
        },
      },
      include: {
        itens: true,
        cliente: true,
      },
    });

    // Tenta sincronizar com o Sankhya imediatamente
    try {
      await this.enviarOrcamentoParaSankhya(pedido.id);
    } catch (e) {
      console.error(
        `[CRM] Falha na sincronização automática do pedido ${pedido.id}:`,
        e.message,
      );
    }

    return pedido;
  }

  async adicionarItem(
    pedidoId: string,
    item: {
      codProd: number;
      descricao: string;
      quantidade: number;
      precoUnitario: number;
    },
  ) {
    // 1. Adiciona o item
    await this.prisma.crmPedidoItem.create({
      data: {
        pedidoId,
        codProd: Number(item.codProd),
        descricao: item.descricao,
        quantidade: item.quantidade,
        precoUnitario: item.precoUnitario,
        precoTotal: item.quantidade * item.precoUnitario,
      },
    });

    // 2. Recalcula o total do pedido
    await this.recalcularTotalPedido(pedidoId);

    // 3. Sincroniza com Sankhya (não-bloqueante aqui para não impedir o uso do CRM se o Sankhya falhar)
    try {
      await this.enviarOrcamentoParaSankhya(pedidoId);
    } catch (e) {
      console.error(
        `[CRM] Erro ao sincronizar item adicionado no pedido ${pedidoId}:`,
        e.message,
      );
    }

    return { success: true };
  }

  async removerItem(pedidoId: string, itemId: string) {
    // 1. Remove o item
    await this.prisma.crmPedidoItem.delete({
      where: { id: itemId },
    });

    // 2. Recalcula o total do pedido
    await this.recalcularTotalPedido(pedidoId);

    // 3. Sincroniza com Sankhya
    try {
      await this.enviarOrcamentoParaSankhya(pedidoId);
    } catch (e) {
      console.error(
        `[CRM] Erro ao sincronizar item removido no pedido ${pedidoId}:`,
        e.message,
      );
    }

    return { success: true };
  }

  async recalcularTotalPedido(pedidoId: string) {
    const itens = await this.prisma.crmPedidoItem.findMany({
      where: { pedidoId },
    });

    const valorTotal = itens.reduce(
      (acc, item) => acc + Number(item.precoTotal),
      0,
    );

    await this.prisma.crmPedido.update({
      where: { id: pedidoId },
      data: { valorTotal },
    });
  }

  async buscarPedido(pedidoId: string, user: { role: string, crmTags: string[] }) {
    const pedido = await this.prisma.crmPedido.findUnique({
      where: { id: pedidoId },
      include: {
        cliente: true,
        itens: {},
        anexos: true,
        lead: {
          include: {
            vendedor: { select: { email: true } },
          },
        },
      },
    });

    if (!pedido) return null;

    // Verifica acesso via tag do lead vinculado
    if (pedido.lead && !this.isPrivileged(user.role) && !(user.crmTags || []).includes(pedido.lead.tag || '')) {
      throw new Error('Você não tem permissão para acessar este pedido.');
    }

    return pedido;
  }

  // ===================== ANEXOS =====================

  async adicionarAnexo(pedidoId: string, data: { nome: string; url: string; tipo?: string; tamanho?: number }) {
    return this.prisma.crmPedidoAnexo.create({
      data: {
        pedidoId,
        nome: data.nome,
        url: data.url,
        tipo: data.tipo,
        tamanho: data.tamanho,
      },
    });
  }

  async listarAnexos(pedidoId: string) {
    return this.prisma.crmPedidoAnexo.findMany({
      where: { pedidoId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async removerAnexo(anexoId: string) {
    return this.prisma.crmPedidoAnexo.delete({
      where: { id: anexoId },
    });
  }

  async buscarAnexoPorId(anexoId: string) {
    return this.prisma.crmPedidoAnexo.findUnique({
      where: { id: anexoId },
    });
  }

  // ===================== ANEXOS DE LEAD =====================

  async adicionarAnexoLead(leadId: string, data: { nome: string; url: string; tipo?: string; tamanho?: number }) {
    return this.prisma.crmLeadAnexo.create({
      data: {
        leadId,
        nome: data.nome,
        url: data.url,
        tipo: data.tipo,
        tamanho: data.tamanho,
      },
    });
  }

  async listarAnexosLead(leadId: string) {
    return this.prisma.crmLeadAnexo.findMany({
      where: { leadId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async removerAnexoLead(anexoId: string) {
    return this.prisma.crmLeadAnexo.delete({
      where: { id: anexoId },
    });
  }

  async buscarAnexoLeadPorId(anexoId: string) {
    return this.prisma.crmLeadAnexo.findUnique({
      where: { id: anexoId },
    });
  }


  async listarFunil(user: { userId: string, role: string, crmTags: string[] }) {
    return this.listarLeads(user);
  }

  // ===================== COMENTÁRIOS E AGENDA =====================

  async adicionarComentario(
    user: { userId: string, role: string, crmTags: string[] },
    data: { pedidoId?: string; leadId?: string; texto: string },
  ) {
    // Validação de acesso
    if (data.leadId) {
      const lead = await this.prisma.crmLead.findUnique({ where: { id: data.leadId } });
      if (!lead || (!this.isPrivileged(user.role) && !(user.crmTags || []).includes(lead.tag || ''))) {
        throw new Error('Você não tem permissão para comentar neste lead.');
      }
    } else if (data.pedidoId) {
      const pedido = await this.prisma.crmPedido.findUnique({
        where: { id: data.pedidoId },
        include: { lead: true }
      });
      if (pedido?.lead && !this.isPrivileged(user.role) && !(user.crmTags || []).includes(pedido.lead.tag || '')) {
        throw new Error('Você não tem permissão para comentar neste pedido.');
      }
    }
    try {
      const comentario = await this.prisma.crmComentario.create({
        data: {
          userId: user.userId,
          pedidoId: data.pedidoId,
          leadId: data.leadId,
          texto: data.texto,
        },
        include: {
          usuario: { select: { email: true } },
        },
      });

      return comentario;
    } catch (error: any) {
      console.error('Erro ao criar comentário no Prisma:', error.message);
      throw error;
    }
  }

  async listarComentarios(params: { pedidoId?: string; leadId?: string }) {
    return this.prisma.crmComentario.findMany({
      where: {
        pedidoId: params.pedidoId || undefined,
        leadId: params.leadId || undefined,
      },
      include: {
        usuario: { select: { email: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async adicionarAgenda(
    user: { userId: string, role: string, crmTags: string[] },
    leadId: string,
    data: { titulo: string; descricao?: string; dataAgendada: any },
  ) {
    // Validação de acesso
    const lead = await this.prisma.crmLead.findUnique({ where: { id: leadId } });
    if (!lead || (!this.isPrivileged(user.role) && !(user.crmTags || []).includes(lead.tag || ''))) {
      throw new Error('Você não tem permissão para agendar compromissos para este lead.');
    }
    try {
      const agenda = await this.prisma.crmAgenda.create({
        data: {
          userId: user.userId,
          leadId,
          titulo: data.titulo,
          descricao: data.descricao,
          dataAgendada: new Date(data.dataAgendada),
        },
      });

      // Notifica
      await this.criarNotificacao(
        user.userId,
        'Lembrete Agendado',
        `Compromisso: ${data.titulo} para ${new Date(data.dataAgendada).toLocaleString('pt-BR')}`,
      );

      return agenda;
    } catch (error: any) {
      console.error('Erro ao criar agenda no Prisma:', error.message);
      throw error;
    }
  }

  async listarAgenda(user: { userId: string, role: string, crmTags: string[] }, leadId?: string) {
    return this.prisma.crmAgenda.findMany({
      where: {
        AND: [
          leadId ? { leadId } : {},
          // Filtro por tag do lead
          !this.isPrivileged(user.role) ? {
            lead: {
              tag: { in: user.crmTags || [] }
            }
          } : {},
        ]
      },
      select: {
        id: true,
        leadId: true,
        userId: true,
        titulo: true,
        descricao: true,
        dataAgendada: true,
        concluido: true,
        notificado: true,
        notificado1h: true,
        createdAt: true,
      },
      orderBy: { dataAgendada: 'asc' },
    });
  }

  async marcarAgendaConcluida(agendaId: string) {
    return this.prisma.crmAgenda.update({
      where: { id: agendaId },
      data: { concluido: true },
    });
  }

  // Cron Job: Verifica agenda a cada minuto
  @Cron(CronExpression.EVERY_MINUTE)
  async checkScheduledAgenda() {
    try {
      const now = new Date();
      const inOneHour = new Date(now.getTime() + 60 * 60 * 1000);

      // 1. Busca tarefas que vencem em 1 hora e não foram notificadas (1h)
      const pending1h = await this.prisma.crmAgenda.findMany({
        where: {
          notificado1h: false,
          concluido: false,
          dataAgendada: {
            lte: inOneHour,
            gte: now, // Garante que é no futuro
          },
        },
        select: {
          id: true,
          userId: true,
          titulo: true,
          leadId: true,
        },
      });

      for (const item of pending1h) {
        try {
          await this.criarNotificacao(
            item.userId,
            'Lembrete em 1 Hora',
            `Seu compromisso "${item.titulo}" começa em 1 hora.`,
            `/crm?leadId=${item.leadId}`,
          );
          await this.prisma.crmAgenda.update({
            where: { id: item.id },
            data: { notificado1h: true },
          });
        } catch (e) {
          console.error(e);
        }
      }

      // 2. Busca tarefas que venceram agora (ou já passaram) e não foram notificadas
      const pendingNow = await this.prisma.crmAgenda.findMany({
        where: {
          notificado: false,
          concluido: false,
          dataAgendada: {
            lte: now,
          },
        },
        select: {
          id: true,
          userId: true,
          titulo: true,
          leadId: true,
        },
      });

      for (const item of pendingNow) {
        try {
          await this.criarNotificacao(
            item.userId,
            'Lembrete de Compromisso',
            `Está na hora: ${item.titulo}`,
            `/crm?leadId=${item.leadId}`,
          );
          await this.prisma.crmAgenda.update({
            where: { id: item.id },
            data: { notificado: true, notificado1h: true }, // Marca ambos
          });
        } catch (e) {
          console.error(e);
        }
      }
    } catch (error) {
      console.warn(
        `[CRM Cron] Pulo de execução: Banco de dados indisponível no momento (${error?.message || error})`,
      );
    }
  }

  // ===================== NOTIFICAÇÕES =====================

  async criarNotificacao(
    userId: string,
    titulo: string,
    mensagem: string,
    link?: string,
  ) {
    const notif = await this.prisma.crmNotificacao.create({
      data: { userId, titulo, mensagem, link },
    });

    // Emite via WebSocket
    this.crmGateway.notifyUser(userId, { titulo, mensagem, link });

    return notif;
  }

  async listarNotificacoes(userId: string) {
    return this.prisma.crmNotificacao.findMany({
      where: { userId, lida: false },
      orderBy: { createdAt: 'desc' },
    });
  }

  async marcarNotificacaoLida(id: string) {
    return this.prisma.crmNotificacao.update({
      where: { id },
      data: { lida: true },
    });
  }

  async marcarTodasLidas(userId: string) {
    return this.prisma.crmNotificacao.updateMany({
      where: { userId, lida: false },
      data: { lida: true },
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
        lte: todayEnd,
      },
    };

    if (userId) {
      // Se for para um usuário específico (login), verifica se já recebeu hoje
      const jaRecebeu = await this.prisma.crmNotificacao.findFirst({
        where: {
          userId,
          titulo: 'Resumo do Dia',
          createdAt: { gte: todayStart },
        },
      });
      if (jaRecebeu) return { success: true };

      const count = await this.prisma.crmAgenda.count({
        where: { ...where, userId },
      });
      if (count > 0) {
        await this.criarNotificacao(
          userId,
          'Resumo do Dia',
          `Você tem ${count} compromissos agendados para hoje.`,
        );
      }
    } else {
      // Cron Geral
      const usuariosComAgenda = await this.prisma.crmAgenda.groupBy({
        by: ['userId'],
        where,
        _count: { id: true },
      });

      for (const u of usuariosComAgenda) {
        await this.criarNotificacao(
          u.userId,
          'Resumo do Dia',
          `Bom dia! Você tem ${u._count.id} compromissos agendados para hoje.`,
        );
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
        itens: true,
      },
    });

    if (!pedido || !pedido.cliente?.codParc) {
      throw new Error(
        'Pedido não encontrado ou cliente sem codParc sincronizado.',
      );
    }

    const token = await this.sankhya.login();
    try {
      // Se já tem nunota, limpa os itens antes de reenviar
      if (pedido.nunota) {
        console.log(
          `[CRM] Limpando itens da nota ${pedido.nunota} para atualização...`,
        );
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
          NUNOTA: pedido.nunota ?? undefined,
        },
        itens: pedido.itens.map((item) => ({
          CODPROD: item.codProd,
          QTDNEG: item.quantidade,
          VLRUNIT: Number(item.precoUnitario),
          CODLOCAL: '1100', // Local padrão
        })),
      };

      const result = await this.sankhya.incluirNotaCrm(payload, token);

      const nuNota = result?.responseBody?.pk?.NUNOTA?.$;
      if (nuNota && !pedido.nunota) {
        // Salva o nunota no pedido se for uma nova nota
        await this.prisma.crmPedido.update({
          where: { id: pedidoId },
          data: {
            nunota: Number(nuNota),
            status: 'ORCAMENTO', // Muda para ORCAMENTO ao sincronizar
          },
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
      orderBy: { descricao: 'asc' },
    });
  }

  async adicionarProdutoCrm(data: {
    codProd: string;
    descricao?: string;
    precoVenda?: number;
    estoque?: number;
    categoria?: string;
  }) {
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
      const produtoSankhya = await this.sankhya.getProdutoLoc(
        codProdNum,
        token,
      );
      if (!produtoSankhya) {
        console.error(
          `[CRM] Produto ${productCode} não encontrado no Sankhya.`,
        );
        throw new Error(`Produto ${productCode} não encontrado no Sankhya.`);
      }

      const descricao =
        data.descricao || produtoSankhya?.DESCRPROD || 'Produto sem descrição';
      const categoria =
        data.categoria ||
        (produtoSankhya as any)?.DESCRGRUPOPROD ||
        (produtoSankhya as any)?.GrupoProduto_DESCRGRUPOPROD ||
        '';

      // 2. Busca preço da Tabela 0
      console.log(`[CRM] Buscando preço (Tabela 0)...`);
      let precoVenda = data.precoVenda ?? 0;
      try {
        const precos = await this.sankhya.getPrecosProdutosTabelaBatch(
          [codProdNum],
          0,
          token,
        );
        if (precos && precos.length > 0) {
          precoVenda = Number(precos[0].valor) || 0;
        }
      } catch (e) {
        console.warn(
          `[CRM] Erro (não fatal) ao buscar preço para ${productCode}:`,
          e.message,
        );
      }

      // 3. Busca estoque do Local 1100
      console.log(`[CRM] Buscando estoque (Local 1100)...`);
      let estoque = data.estoque ?? 0;
      try {
        const estoques = await this.sankhya.getEstoqueFront(codProdNum, token);
        const estoqueLocal = Array.isArray(estoques)
          ? estoques.find((e) => e.CODLOCAL === 1100)
          : null;
        if (estoqueLocal) {
          estoque = Number(estoqueLocal.ESTOQUE) || 0;
        }
      } catch (e) {
        console.warn(
          `[CRM] Erro (não fatal) ao buscar estoque para ${productCode}:`,
          e.message,
        );
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
        console.error(
          `[CRM] Erro no banco de dados para o produto ${productCode}:`,
          dbError,
        );
        throw new Error(`Falha ao persistir produto: ${dbError.message}`);
      }
    } catch (error) {
      console.error(
        `[CRM] Erro em adicionarProdutoCrm para ${productCode}:`,
        error,
      );
      throw error;
    } finally {
      await this.sankhya.logout(token, 'CRM Sync');
    }
  }

  // ===================== INTEGRACAO SANKHYA ISOLADA (CRM) =====================

  async pesquisarNoSankhya(search: string, limit: number = 50, offset: number = 0) {
    const token = await this.sankhya.login();
    try {
      const items = await this.sankhya.searchProdutosCrm(search, token, limit, offset);
      return { items: items || [] };
    } catch (error: any) {
      console.error(
        `[CRM] Erro ao pesquisar no Sankhya para "${search}":`,
        error.response?.data || error.message,
      );
      throw error;
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
        const precos = await this.sankhya.getPrecosProdutosTabelaBatch(
          [codProdNum],
          0,
          token,
        );
        if (precos && precos.length > 0)
          precoVenda = Number(precos[0].valor) || 0;
      } catch (e) { }

      // 3. Estoque Local 1100
      let estoque = 0;
      try {
        const estoques = await this.sankhya.getEstoqueFront(codProdNum, token);
        const estoqueLocal = Array.isArray(estoques)
          ? estoques.find((e) => e.CODLOCAL === 1100)
          : null;
        if (estoqueLocal) estoque = Number(estoqueLocal.ESTOQUE) || 0;
      } catch (e) { }

      return {
        ...prod,
        DESCRPROD: prod.AD_NOMEPRDLV, // Mapeia o novo campo para a chave esperada
        precoVenda,
        estoque,
      };
    } finally {
      await this.sankhya.logout(token, 'CRM Product Detail');
    }
  }

  async syncProdutosSankhya() {
    const token = await this.sankhya.login();

    try {
      const produtosSankhya = await this.sankhya.getAllProdutosCrmSync(token);
      console.log(`[CRM Sync] Produtos recebidos do Sankhya: ${produtosSankhya.length}`);

      if (produtosSankhya.length === 0) {
        return { message: 'Nenhum produto encontrado no Sankhya para sincronizar.', count: 0 };
      }

      if (!produtosSankhya.length) {
        return {
          message:
            'Nenhum produto retornado pelo Sankhya. Sincronização cancelada.',
          total: 0,
        };
      }

      // Deduplica por código para não depender de skipDuplicates,
      // sempre mantendo o último valor recebido do Sankhya.
      const produtosPorCodigo = new Map<string, {
        codProd: string;
        descricao: string;
        precoVenda: number;
        estoque: number;
        categoria: string;
        ativo: boolean;
      }>();

      for (const p of produtosSankhya) {
        const codProd = String(p.CODPROD ?? '').trim();
        if (!codProd) continue;

        produtosPorCodigo.set(codProd, {
          codProd,
          descricao: String(p.DESCRPROD || ''),
          precoVenda: Number(p.PRECO) || 0,
          estoque: Number(p.ESTOQUE) || 0,
          categoria: String(p.CODGRUPOPROD || ''),
          ativo: true,
        });
      }

      const data = Array.from(produtosPorCodigo.values());
      console.log(`[CRM Sync] Total de produtos únicos processados: ${data.length}`);

      // Estratégia de sincronização sem deletar (evita erro de chave estrangeira com pedidos)
      // 1. Busca produtos existentes para saber o que é create e o que é update
      const existingProducts = await this.prisma.crmProduto.findMany({
        select: { codProd: true }
      });
      const existingCodProds = new Set(existingProducts.map(p => p.codProd));

      const toCreate = data.filter(p => !existingCodProds.has(p.codProd));
      const toUpdate = data.filter(p => existingCodProds.has(p.codProd));

      console.log(`[CRM Sync] Novos: ${toCreate.length}, Para atualizar: ${toUpdate.length}`);

      // 2. Cria os novos em batches
      const batchSize = 100;
      if (toCreate.length > 0) {
        for (let i = 0; i < toCreate.length; i += 500) {
          const batch = toCreate.slice(i, i + 500);
          await this.prisma.crmProduto.createMany({ data: batch });
        }
      }

      // 3. Atualiza os existentes (em batches menores para não travar o banco)
      // Fazemos isso em paralelo controlado para performance
      if (toUpdate.length > 0) {
        for (let i = 0; i < toUpdate.length; i += batchSize) {
          const batch = toUpdate.slice(i, i + batchSize);
          await Promise.all(
            batch.map(p => this.prisma.crmProduto.update({
              where: { codProd: p.codProd },
              data: {
                descricao: p.descricao,
                precoVenda: p.precoVenda,
                estoque: p.estoque,
                categoria: p.categoria,
                ativo: p.ativo
              }
            }))
          );
        }
      }

      console.log(`[CRM Sync] Sincronização concluída com sucesso.`);
      return { 
        message: 'Sincronização concluída com sucesso!', 
        created: toCreate.length, 
        updated: toUpdate.length 
      };
    } catch (error) {
      console.error('Erro ao sincronizar produtos:', error);
      throw error;
    } finally {
      await this.sankhya.logout(token, 'CRM Sync Produtos');
    }
  }

  async syncClientesSankhya() {
    const token = await this.sankhya.login();
    try {
      const parceiros = await this.sankhya.getAllParceirosCrmSync(token);
      for (const p of parceiros) {
        if (!p.NOMEPARC || !p.CODPARC) continue;
        await this.prisma.crmCliente.upsert({
          where: { codParc: String(p.CODPARC) },
          update: {
            nome: String(p.NOMEPARC),
            email: p.EMAIL ? String(p.EMAIL) : null,
            telefone: p.TELEFONE ? String(p.TELEFONE) : null,
            documento: p.CGC_CPF ? String(p.CGC_CPF) : null,
          },
          create: {
            codParc: String(p.CODPARC),
            nome: String(p.NOMEPARC),
            email: p.EMAIL ? String(p.EMAIL) : null,
            telefone: p.TELEFONE ? String(p.TELEFONE) : null,
            documento: p.CGC_CPF ? String(p.CGC_CPF) : null,
          },
        });
      }
      return { message: 'Clientes sincronizados com sucesso' };
    } finally {
      await this.sankhya.logout(token, 'CRM Sync Clientes');
    }
  }
}

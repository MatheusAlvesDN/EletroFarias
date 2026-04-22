import { Controller, Get, Post, Body, Param, Patch, Request, UseGuards, Query, Delete } from '@nestjs/common';
import { CrmService } from './crm.service';
import { CrmStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('crm')
@UseGuards(JwtAuthGuard)
export class CrmController {
    constructor(private readonly crmService: CrmService) { }

    @Post('clientes')
    async criarCliente(@Body() body: any) {
        return this.crmService.criarCliente(body);
    }

    @Get('clientes')
    async listarClientes() {
        return this.crmService.listarClientes();
    }

    @Post('pedidos')
    async criarPedido(@Request() req, @Body() body: any) {
        return this.crmService.criarPedido(req.user.userId, body);
    }

    @Get('pedidos')
    async listarFunil(@Request() req) {
        // No contexto real, poderíamos filtrar por req.user.id se não fosse admin
        return this.crmService.listarFunil();
    }

    @Patch('pedidos/:id/status')
    async atualizarStatus(
        @Param('id') id: string,
        @Body('status') status: CrmStatus,
    ) {
        return this.crmService.atualizarStatus(id, status);
    }

    @Post('pedidos/:id/itens')
    async adicionarItem(@Param('id') pedidoId: string, @Body() item: any) {
        return this.crmService.adicionarItem(pedidoId, item);
    }

    @Delete('pedidos/:id/itens/:itemId')
    async removerItem(@Param('id') pedidoId: string, @Param('itemId') itemId: string) {
        return this.crmService.removerItem(pedidoId, itemId);
    }

    // ===================== COMENTÁRIOS E AGENDA =====================

    @Post('pedidos/:id/comentarios')
    async adicionarComentario(@Request() req, @Param('id') pedidoId: string, @Body('texto') texto: string) {
        return this.crmService.adicionarComentario(req.user.userId, pedidoId, texto);
    }

    @Get('pedidos/:id/comentarios')
    async listarComentarios(@Param('id') pedidoId: string) {
        return this.crmService.listarComentarios(pedidoId);
    }

    @Post('pedidos/:id/agenda')
    async adicionarAgenda(@Request() req, @Param('id') pedidoId: string, @Body() body: any) {
        return this.crmService.adicionarAgenda(req.user.userId, pedidoId, body);
    }

    @Get('agenda')
    async listarAgenda(@Request() req, @Query('pedidoId') pedidoId?: string) {
        return this.crmService.listarAgenda(req.user.userId, pedidoId);
    }

    @Get('login-check')
    async loginCheck(@Request() req) {
        return this.crmService.enviarResumoDiarioAgenda(req.user.userId);
    }

    @Patch('agenda/:id/concluir')
    async marcarAgendaConcluida(@Param('id') id: string) {
        return this.crmService.marcarAgendaConcluida(id);
    }

    // ===================== NOTIFICAÇÕES =====================

    @Get('notificacoes')
    async listarNotificacoes(@Request() req) {
        return this.crmService.listarNotificacoes(req.user.userId);
    }

    @Patch('notificacoes/lidas-todas')
    async marcarTodasLidas(@Request() req) {
        return this.crmService.marcarTodasLidas(req.user.userId);
    }

    @Patch('notificacoes/:id/lida')
    async marcarNotificacaoLida(@Param('id') id: string) {
        return this.crmService.marcarNotificacaoLida(id);
    }

    // ===================== INTEGRACAO SANKHYA =====================

    @Post('pedidos/:id/sankhya')
    async enviarParaSankhya(@Param('id') id: string) {
        return this.crmService.enviarOrcamentoParaSankhya(id);
    }

    // ===================== PRODUTOS CRM =====================

    @Get('produtos')
    async listarProdutosCrm() {
        return this.crmService.listarProdutosCrm();
    }

    @Post('produtos')
    async adicionarProdutoCrm(@Body() body: any) {
        return this.crmService.adicionarProdutoCrm(body);
    }

    @Get('sankhya/search')
    async pesquisarNoSankhya(@Query('search') search: string) {
        return this.crmService.pesquisarNoSankhya(search);
    }

    @Get('sankhya/product/:id')
    async getProdutoSankhya(@Param('id') id: string) {
        return this.crmService.getProdutoSankhya(id);
    }
}

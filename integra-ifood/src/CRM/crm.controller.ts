import { Controller, Get, Post, Body, Param, Patch, Request, UseGuards, Query, Delete, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs';
import { CrmService } from './crm.service';
import { CrmStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CloudflareR2Service } from '../Cloudflare/r2.service';

@Controller('crm')
@UseGuards(JwtAuthGuard)
export class CrmController {
    constructor(
        private readonly crmService: CrmService,
        private readonly cloudflareR2Service: CloudflareR2Service,
    ) { }

    @Post('clientes')
    async criarCliente(@Body() body: any) {
        return this.crmService.criarCliente(body);
    }

    @Get('clientes')
    async listarClientes() {
        return this.crmService.listarClientes();
    }

    @Post('clientes/sync')
    async syncClientes() {
        return this.crmService.syncClientesSankhya();
    }

    @Post('pedidos')
    async criarPedido(@Request() req, @Body() body: any) {
        return this.crmService.criarPedido(req.user, body);
    }

    @Post('leads')
    async criarLead(@Request() req, @Body() body: any) {
        return this.crmService.criarLead(req.user, body);
    }

    @Get('leads')
    async listarLeads(@Request() req) {
        return this.crmService.listarLeads(req.user);
    }

    @Patch('leads/:id/status')
    async atualizarStatusLead(
        @Request() req,
        @Param('id') id: string,
        @Body('status') status: CrmStatus,
    ) {
        return this.crmService.atualizarStatusLead(id, status, req.user);
    }

    @Patch('leads/:id')
    async atualizarLead(
        @Request() req,
        @Param('id') id: string,
        @Body() body: any,
    ) {
        return this.crmService.atualizarLead(id, body, req.user);
    }

    @Delete('leads/:id')
    async excluirLead(@Request() req, @Param('id') id: string) {
        return this.crmService.excluirLead(id, req.user);
    }

    @Get('pedidos')
    async listarFunil(@Request() req) {
        return this.crmService.listarFunil(req.user);
    }

    @Get('pedidos/:id')
    async buscarPedido(@Request() req, @Param('id') id: string) {
        return this.crmService.buscarPedido(id, req.user);
    }

    @Post('pedidos/:id/itens')
    async adicionarItem(@Param('id') pedidoId: string, @Body() item: any) {
        return this.crmService.adicionarItem(pedidoId, item);
    }

    @Delete('pedidos/:id/itens/:itemId')
    async removerItem(@Param('id') pedidoId: string, @Param('itemId') itemId: string) {
        return this.crmService.removerItem(pedidoId, itemId);
    }

    // ===================== ANEXOS =====================

    @Post('pedidos/:id/anexos')
    @UseInterceptors(FileInterceptor('file'))

    async uploadAnexo(
        @Param('id') pedidoId: string,
        @UploadedFile() file: any,
    ) {
        const publicUrl = await this.cloudflareR2Service.uploadFile(file, 'crm-anexos');

        return this.crmService.adicionarAnexo(pedidoId, {
            nome: file.originalname,
            url: publicUrl,
            tipo: file.mimetype,
            tamanho: file.size,
        });
    }


    @Post('pedidos/:id/anexos/presigned')
    async getPresignedUrl(
        @Param('id') pedidoId: string,
        @Body() body: { fileName: string, contentType: string }
    ) {
        return this.cloudflareR2Service.generatePresignedUrl(body.fileName, body.contentType, 'crm-anexos');
    }

    @Post('pedidos/:id/anexos/confirmar')
    async confirmarAnexo(
        @Param('id') pedidoId: string,
        @Body() body: { nome: string, url: string, tipo: string, tamanho: number }
    ) {
        return this.crmService.adicionarAnexo(pedidoId, body);
    }

    @Get('pedidos/:id/anexos')
    async listarAnexos(@Param('id') pedidoId: string) {
        return this.crmService.listarAnexos(pedidoId);
    }

    @Delete('anexos/:id')
    async removerAnexo(@Param('id') id: string) {
        // Buscar o anexo para pegar a URL antes de deletar do banco
        const anexos = await this.crmService.buscarAnexoPorId(id);
        if (anexos && anexos.url) {
            await this.cloudflareR2Service.deleteFile(anexos.url, 'crm-anexos');
        }
        return this.crmService.removerAnexo(id);
    }



    // ===================== COMENTÁRIOS E AGENDA =====================

    @Post('comentarios')
    async adicionarComentario(@Request() req, @Body() body: { pedidoId?: string; leadId?: string; texto: string }) {
        return this.crmService.adicionarComentario(req.user, body);
    }

    @Get('comentarios')
    async listarComentarios(@Query('pedidoId') pedidoId?: string, @Query('leadId') leadId?: string) {
        return this.crmService.listarComentarios({ pedidoId, leadId });
    }

    @Post('leads/:id/agenda')
    async adicionarAgenda(@Request() req, @Param('id') leadId: string, @Body() body: any) {
        return this.crmService.adicionarAgenda(req.user, leadId, body);
    }

    @Get('agenda')
    async listarAgenda(@Request() req, @Query('leadId') leadId?: string) {
        return this.crmService.listarAgenda(req.user, leadId);
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

    @Post('produtos/sync')
    async syncProdutos() {
        return this.crmService.syncProdutosSankhya();
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

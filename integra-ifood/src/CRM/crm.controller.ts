import { Controller, Get, Post, Body, Param, Patch, Request, UseGuards, Query } from '@nestjs/common';
import { CrmService } from './crm.service';
import { CrmStatus } from '@prisma/client';
// import { JwtAuthGuard } from '../auth/jwt-auth.guard'; // Importe o seu guard de autenticação

@Controller('crm')
// @UseGuards(JwtAuthGuard)
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
        // Prioriza o ID do usuário vindo do Token JWT (se o Guard estiver ativo)
        // Caso contrário, aceita do body (para compatibilidade/testes)
        const userId = req.user?.userId || body.userId;

        if (!userId) {
            throw new Error("O ID do vendedor (userId) é obrigatório.");
        }

        return this.crmService.criarPedido(userId, body);
    }

    @Get('pedidos')
    async listarFunil(@Request() req) {
        // Exemplo de regra de negócio: Se não for ADMIN/MANAGER, vê apenas os próprios pedidos
        // const userId = req.user.role === 'ADMIN' ? undefined : req.user.id;
        return this.crmService.listarFunil();
    }

    @Patch('pedidos/:id/status')
    async atualizarStatus(
        @Param('id') id: string,
        @Body('status') status: CrmStatus,
    ) {
        return this.crmService.atualizarStatus(id, status);
    }

    @Get('produtos')
    async listarProdutosCrm() {
        return this.crmService.listarProdutosCrm();
    }

    @Post('produtos')
    async adicionarProdutoCrm(@Body() body: any) {
        return this.crmService.adicionarProdutoCrm(body);
    }

    // ===================== BUSCAS SANKHYA (ISOLADAS) =====================

    @Get('sankhya/search')
    async pesquisarNoSankhya(@Query('search') search: string) {
        return this.crmService.pesquisarNoSankhya(search);
    }

    @Get('sankhya/product/:id')
    async getProdutoSankhya(@Param('id') id: string) {
        return this.crmService.getProdutoSankhya(id);
    }
}
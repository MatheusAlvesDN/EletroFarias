import {
    Controller,
    Get,
    Post,
    Delete,
    Body,
    Param,
    HttpCode,
    UnauthorizedException,
    HttpStatus,
    Patch
} from '@nestjs/common';
// Importe o seu serviço aqui (ajuste o caminho conforme sua estrutura)
import { EletroClubeService } from './eletroclube.service';
import { TipoNotaClube } from '@prisma/client';

@Controller('eletroclube')
export class EletroClubeController {
    constructor(private readonly eletroclubeService: EletroClubeService) { }

    // ==========================================
    // ROTAS DE CLIENTES
    // ==========================================

    // Rota: POST /eletroclube/clientes
    @Post('clientes')
    async criarCliente(
        @Body() dadosCliente: {
            nome: string;
            cpf: string;
            senha: string;
            codParc: string;
            email: string;
            telefone: string;
        }
    ) {
        return this.eletroclubeService.criarCliente(dadosCliente);
    }

    // Rota: GET /eletroclube/clientes
    @Get('clientes')
    async listarClientes() {
        return this.eletroclubeService.listarClientes();
    }

    // Rota: GET /eletroclube/clientes/:codParc
    @Get('clientes/:codParc')
    async buscarCliente(@Param('codParc') codParc: string) {
        return await this.eletroclubeService.buscarClientePorCodParc(codParc);
    }

    // Rota: DELETE /eletroclube/clientes/:codParc
    @Delete('clientes/:codParc')
    async deletarCliente(@Param('codParc') codParc: string) {
        return this.eletroclubeService.deletarCliente(codParc);
    }

    // ==========================================
    // ROTAS DE RESGATES
    // ==========================================

    // Rota: POST /eletroclube/resgates
    @Post('resgates')
    async criarResgate(
        @Body() dadosResgate: {
            nunota: string;
            pontos: number;
            codParc: string;
            codPremio: string;
            quantidade?: number;
        }
    ) {
        return this.eletroclubeService.resgatePremio(dadosResgate);
    }

    // Rota: POST /eletroclube/resgates/dinheiro
    @Post('resgates/dinheiro')
    async resgatarDinheiro(
        @Body() dados: {
            nunota: string;
            valorReais: number;
            codParc: string;
        }
    ) {
        return this.eletroclubeService.resgateDinheiro(dados);
    }

    // Rota: GET /eletroclube/resgates
    @Get('resgates')
    async listarResgates() {
        return this.eletroclubeService.listarResgates();
    }

    // Rota: GET /eletroclube/resgates/:nunota
    @Get('resgates/:nunota')
    async buscarResgate(@Param('nunota') nunota: string) {
        return this.eletroclubeService.buscarResgatePorNota(nunota);
    }

    // Rota: DELETE /eletroclube/resgates/:nunota
    @Delete('resgates/:nunota')
    async deletarResgate(@Param('nunota') nunota: string) {
        return this.eletroclubeService.deletarResgate(nunota);
    }


    // Rota: POST /eletroclube/notas-pontuadas
    @Post('notas-pontuadas')
    async criarNotaPontuada(
        @Body() dadosNota: {
            codParc: string;
            pontos?: number;
            nunota: string;
            tipo: TipoNotaClube;
        }
    ) {
        return this.eletroclubeService.criarNotaPontuada(dadosNota);
    }

    // Rota: GET /eletroclube/notas-pontuadas
    @Get('notas-pontuadas')
    async listarNotasPontuadas() {
        return this.eletroclubeService.listarNotasPontuadas();
    }

    @Post('lancar-notas-pontuadas')
    async lancarNotasPontuadas(
        @Body() dadosNota: {
            codParc: string;
            pontos: number;
            nunota: string;
            tipo: TipoNotaClube;
        }
    ) {
        return await this.eletroclubeService.ajustePontosCliente(dadosNota.codParc, dadosNota.nunota, dadosNota.pontos, dadosNota.tipo);
    }

    // Rota: GET /eletroclube/notas-pontuadas/:nunota
    @Get('notas-pontuadas/:nunota')
    async buscarNotaPorNunota(@Param('nunota') nunota: string) {
        return this.eletroclubeService.buscarNotaPontuadaPorNunota(nunota);
    }

    // Rota: PATCH /eletroclube/notas-pontuadas/:id
    @Patch('notas-pontuadas/:id')
    async atualizarNota(
        @Param('id') id: string,
        @Body() dadosAtualizacao: { pontos?: number; tipo?: TipoNotaClube }
    ) {
        return this.eletroclubeService.atualizarNotaPontuada(id, dadosAtualizacao);
    }

    // Rota: DELETE /eletroclube/notas-pontuadas/:nunota
    @Delete('notas-pontuadas/:nunota')
    async deletarNota(@Param('nunota') nunota: string) {
        return this.eletroclubeService.deletarNotaPontuada(nunota);
    }

    // ==========================================
    // ROTAS DE PRÊMIOS
    // ==========================================

    // Rota: POST /eletroclube/premios
    @Post('premios')
    async criarPremio(
        @Body() dadosPremio: {
            nome: string;
            codigo: string;
            codProd?: string;
            pontos?: number;
        }
    ) {
        return this.eletroclubeService.criarPremio(dadosPremio);
    }

    // Rota: GET /eletroclube/premios
    @Get('premios')
    async listarPremios() {
        return this.eletroclubeService.listarPremios();
    }

    // Rota: GET /eletroclube/premios/:codigo
    @Get('premios/:codigo')
    async buscarPremio(@Param('codigo') codigo: string) {
        return this.eletroclubeService.buscarPremioPorCodigo(codigo);
    }

    // Rota: PATCH /eletroclube/premios/:id
    @Patch('premios/:id')
    async atualizarPremio(
        @Param('id') id: string,
        @Body() dadosAtualizacao: {
            nome?: string;
            codigo?: string;
            codProd?: string;
            pontos?: number;
        }
    ) {
        return this.eletroclubeService.atualizarPremio(id, dadosAtualizacao);
    }

    // Rota: DELETE /eletroclube/premios/:codigo
    @Delete('premios/:codigo')
    async deletarPremio(@Param('codigo') codigo: string) {
        return this.eletroclubeService.deletarPremio(codigo);
    }


    // Rota: PATCH /eletroclube/alterar-senha
    @Patch('alterar-senha')
    async alterarSenha(
        @Body() body: { codParc: string; senhaAtual: string; novaSenha: string }
    ) {
        return this.eletroclubeService.alterarSenha(body.codParc, body.senhaAtual, body.novaSenha);
    }

    // Rota: PATCH /eletroclube/resetar-senha/:codParc
    @Patch('resetar-senha/:codParc')
    async resetarSenha(@Param('codParc') codParc: string) {
        return this.eletroclubeService.resetarSenha(codParc);
    }

    @Post('login')
    @HttpCode(HttpStatus.OK)
    async login(@Body() body: any) {
        // O frontend está enviando 'username' (que pode ser CPF ou E-mail) e 'password'
        const { username, password } = body;

        if (!username || !password) {
            throw new UnauthorizedException('CPF/E-mail e senha são obrigatórios.');
        }

        return this.eletroclubeService.login(username, password);
    }
}
import {
    Controller,
    Get,
    Post,
    Delete,
    Body,
    Param,
    HttpCode,
    UnauthorizedException,
    HttpStatus
} from '@nestjs/common';
// Importe o seu serviço aqui (ajuste o caminho conforme sua estrutura)
import { EletroClubeService } from './eletroclube.service';

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
        return this.eletroclubeService.buscarClientePorCodParc(codParc);
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
        }
    ) {
        return this.eletroclubeService.criarResgate(dadosResgate);
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
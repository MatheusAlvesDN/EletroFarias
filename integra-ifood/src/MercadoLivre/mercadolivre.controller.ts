import { Body, Controller, Get, Post } from '@nestjs/common';
import { MercadoLivreService, ProdutoML } from './mercadolivre.service';

@Controller('mercadolivre')
export class MercadoLivreController {
  constructor(private readonly mercadoLivreService: MercadoLivreService) {}

  @Get('auth')
  async auth(@Query('code') code: string) {
    if (!code) {
      return {
        erro: 'Parâmetro "code" não informado na query string.',
      };
    }

    return await this.mercadoLivreService.solicitarToken(code);
  }

  // 👇 NOVA ROTA: GET /mercadolivre/produtos
  @Get('produtos')
  async buscarProdutosParaMeli() {
    return await this.mercadoLivreService.getAllProdutos();
  }

  // Rota de envio que já havíamos criado
  @Post('cadastrarProdutos')
  async cadastrarProdutos(@Body('produtos') produtos: ProdutoML[]) {
    return await this.mercadoLivreService.enviarProdutosEmLote(produtos);
  }

  
}
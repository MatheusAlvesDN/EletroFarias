import { Body, Controller, Get, Post } from '@nestjs/common';
import { MercadoLivreService, ProdutoML } from './mercadolivre.service';

@Controller('mercadolivre')
export class MercadoLivreController {
  constructor(private readonly mercadoLivreService: MercadoLivreService) {}

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
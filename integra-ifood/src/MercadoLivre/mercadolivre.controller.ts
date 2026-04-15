import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { MercadoLivreService, ProdutoML } from './mercadolivre.service';

@Controller('mercadolivre')
export class MercadoLivreController {
  constructor(private readonly mercadoLivreService: MercadoLivreService) { }

  @Get('auth')
  async auth(@Query('code') code: string) {
    if (!code) {
      return { erro: 'Parâmetro "code" não informado na query string.' };
    }

    return this.mercadoLivreService.solicitarToken(code);
  }

  @Get('refresh')
  async refresh() {
    return this.mercadoLivreService.renovarToken();
  }

  @Get('me')
  async me() {
    return this.mercadoLivreService.buscarUsuarioMl();
  }

  @Get('produtos')
  async buscarProdutosParaMeli() {
    const retorno = await this.mercadoLivreService.buscarProdutosParaMeli();
    console.log(retorno)
    return retorno;
  }

  @Post('cadastrarProdutos')
  async cadastrarProdutos(@Body('produtos') produtos: ProdutoML[]) {
    return this.mercadoLivreService.cadastrarProdutos(produtos);
  }
}
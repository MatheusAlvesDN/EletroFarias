import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface ProdutoML {
  titulo: string;
  preco: number;
  estoque: number;
}

@Injectable()
export class MercadoLivreService {
  constructor(private readonly httpService: HttpService) {}

  async solicitarToken(code: string) {
    try {
      const body = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.ML_CLIENT_ID || '',
        client_secret: process.env.ML_CLIENT_SECRET || '',
        code,
        redirect_uri: process.env.ML_REDIRECT_URI || '',
      });

      const response = await firstValueFrom(
        this.httpService.post(
          'https://api.mercadolibre.com/oauth/token',
          body.toString(),
          {
            headers: {
              accept: 'application/json',
              'content-type': 'application/x-www-form-urlencoded',
            },
          },
        ),
      );

      return response.data;
    } catch (error: any) {
      throw new HttpException(
        {
          message: 'Erro ao solicitar token do Mercado Livre',
          detalhes: error?.response?.data || error.message,
        },
        error?.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getAllProdutos() {
    return [];
  }

  async enviarProdutosEmLote(produtos: ProdutoML[]) {
    return {
      sucesso: true,
      total: produtos.length,
    };
  }
}
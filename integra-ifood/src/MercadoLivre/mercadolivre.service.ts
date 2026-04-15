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
  constructor(private readonly httpService: HttpService) { }

  async solicitarToken(code: string) {
    const clientId = process.env.ML_CLIENT_ID;
    const clientSecret = process.env.ML_CLIENT_SECRET;
    const redirectUri = process.env.ML_REDIRECT_URI;

console.log('ML_CLIENT_ID?', !!process.env.ML_CLIENT_ID);
console.log('ML_CLIENT_SECRET?', !!process.env.ML_CLIENT_SECRET);
console.log('ML_REDIRECT_URI?', !!process.env.ML_REDIRECT_URI);
console.log('cwd:', process.cwd());

    if (!clientId || !clientSecret || !redirectUri) {
      throw new HttpException(
        'ML_CLIENT_ID, ML_CLIENT_SECRET ou ML_REDIRECT_URI não configurados',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
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
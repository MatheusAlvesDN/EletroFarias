import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AxiosRequestConfig } from 'axios';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../Prisma/prisma.service';

export interface ProdutoML {
  titulo: string;
  preco: number;
  estoque: number;
}

@Injectable()
export class MercadoLivreService {
  constructor(
    private readonly httpService: HttpService,
    private readonly prisma: PrismaService,
  ) {}

  async solicitarToken(code: string) {
    const clientId = process.env.ML_CLIENT_ID;
    const clientSecret = process.env.ML_CLIENT_SECRET;
    const redirectUri = process.env.ML_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      throw new HttpException(
        'ML_CLIENT_ID, ML_CLIENT_SECRET ou ML_REDIRECT_URI não configurados',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    try {
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

      const data = response.data;

      if (!data?.access_token || !data?.refresh_token || !data?.expires_in) {
        throw new HttpException(
          'Resposta do Mercado Livre sem access_token, refresh_token ou expires_in',
          HttpStatus.BAD_GATEWAY,
        );
      }

      const tokenSalvo = await this.prisma.salvarMercadoLivreToken(
        data.access_token,
        data.refresh_token,
        Number(data.expires_in),
      );

      await this.prisma.limparTokensMercadoLivreAntigos(tokenSalvo.id);

      return {
        message: 'Token do Mercado Livre salvo com sucesso.',
        expires_in: data.expires_in,
        user_id: data.user_id,
      };
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

  async renovarToken() {
    const clientId = process.env.ML_CLIENT_ID;
    const clientSecret = process.env.ML_CLIENT_SECRET;
    const tokenAtual = await this.prisma.getUltimoMercadoLivreToken();

    if (!clientId || !clientSecret || !tokenAtual?.refreshToken) {
      throw new HttpException(
        'ML_CLIENT_ID, ML_CLIENT_SECRET ou refresh token não configurados',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    try {
      const body = new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: tokenAtual.refreshToken,
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

      const data = response.data;

      if (!data?.access_token || !data?.refresh_token || !data?.expires_in) {
        throw new HttpException(
          'Resposta do Mercado Livre sem access_token, refresh_token ou expires_in',
          HttpStatus.BAD_GATEWAY,
        );
      }

      const tokenSalvo = await this.prisma.salvarMercadoLivreToken(
        data.access_token,
        data.refresh_token,
        Number(data.expires_in),
      );

      await this.prisma.limparTokensMercadoLivreAntigos(tokenSalvo.id);

      return {
        message: 'Token renovado com sucesso.',
        expires_in: data.expires_in,
        user_id: data.user_id,
      };
    } catch (error: any) {
      throw new HttpException(
        {
          message: 'Erro ao renovar token do Mercado Livre',
          detalhes: error?.response?.data || error.message,
        },
        error?.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private tokenExpirado(createdAt: Date, expiresIn: number): boolean {
    const expiraEm = createdAt.getTime() + expiresIn * 1000;

    // margem de segurança de 60 segundos
    return Date.now() >= expiraEm - 60_000;
  }

  async getAccessTokenValido(): Promise<string> {
    const token = await this.prisma.getUltimoMercadoLivreToken();

    if (!token) {
      throw new HttpException(
        'Nenhum token do Mercado Livre encontrado',
        HttpStatus.NOT_FOUND,
      );
    }

    if (this.tokenExpirado(token.createdAt, token.expiresIn)) {
      await this.renovarToken();

      const novoToken = await this.prisma.getUltimoMercadoLivreToken();

      if (!novoToken?.accessToken) {
        throw new HttpException(
          'Falha ao obter novo token do Mercado Livre',
          HttpStatus.UNAUTHORIZED,
        );
      }

      return novoToken.accessToken;
    }

    return token.accessToken;
  }

  async requestComAutoRefresh<T = any>(config: AxiosRequestConfig): Promise<T> {
    let accessToken = await this.getAccessTokenValido();

    try {
      const response = await firstValueFrom(
        this.httpService.request<T>({
          ...config,
          headers: {
            ...(config.headers ?? {}),
            Authorization: `Bearer ${accessToken}`,
          },
        }),
      );

      return response.data;
    } catch (error: any) {
      const status = error?.response?.status;
      const mlError = error?.response?.data;

      const precisaRenovar =
        status === 400 ||
        status === 401 ||
        status === 403 ||
        mlError?.message === 'invalid_token' ||
        mlError?.error === 'invalid_token';

      if (!precisaRenovar) {
        throw error;
      }

      await this.renovarToken();
      accessToken = await this.getAccessTokenValido();

      const retryResponse = await firstValueFrom(
        this.httpService.request<T>({
          ...config,
          headers: {
            ...(config.headers ?? {}),
            Authorization: `Bearer ${accessToken}`,
          },
        }),
      );

      return retryResponse.data;
    }
  }

  async buscarUsuarioMl() {
    return this.requestComAutoRefresh({
      method: 'GET',
      url: 'https://api.mercadolibre.com/users/me',
    });
  }

  async buscarProdutosParaMeli() {
    return this.requestComAutoRefresh({
      method: 'GET',
      url: 'https://api.mercadolibre.com/users/me',
    });
  }

  async cadastrarProdutos(produtos: ProdutoML[]) {
    if (!Array.isArray(produtos) || produtos.length === 0) {
      throw new HttpException(
        'Lista de produtos vazia.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const resultados: Array<
      | { ok: true; produto: string; response: any }
      | { ok: false; produto: string; erro: any }
    > = [];

    for (const produto of produtos) {
      try {
        const payload = {
          title: produto.titulo,
          price: produto.preco,
          available_quantity: produto.estoque,
          buying_mode: 'buy_it_now',
          condition: 'new',
          listing_type_id: 'gold_special',
          currency_id: 'BRL',
          category_id: 'MLB1055',
          sale_terms: [],
          pictures: [],
          attributes: [],
        };

        const result = await this.requestComAutoRefresh({
          method: 'POST',
          url: 'https://api.mercadolibre.com/items',
          headers: {
            'Content-Type': 'application/json',
          },
          data: payload,
        });

        resultados.push({
          ok: true,
          produto: produto.titulo,
          response: result,
        });
      } catch (error: any) {
        resultados.push({
          ok: false,
          produto: produto.titulo,
          erro: error?.response?.data || error.message,
        });
      }
    }

    return {
      message: 'Processamento finalizado.',
      total: produtos.length,
      resultados,
    };
  }
}
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

      if (!data?.access_token || !data?.refresh_token) {
        throw new HttpException(
          'Resposta do Mercado Livre sem access_token ou refresh_token',
          HttpStatus.BAD_GATEWAY,
        );
      }

      await this.atualizarEnvRender('ML_TOKEN', data.access_token);
      await this.atualizarEnvRender('ML_REFRESH', data.refresh_token);

      process.env.ML_TOKEN = data.access_token;
      process.env.ML_REFRESH = data.refresh_token;

      return {
        message: 'ML_TOKEN e ML_REFRESH atualizados no Render com sucesso.',
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
    const refreshToken = process.env.ML_REFRESH;

    if (!clientId || !clientSecret || !refreshToken) {
      throw new HttpException(
        'ML_CLIENT_ID, ML_CLIENT_SECRET ou ML_REFRESH não configurados',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    try {
      const body = new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
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

      if (!data?.access_token || !data?.refresh_token) {
        throw new HttpException(
          'Resposta do Mercado Livre sem access_token ou refresh_token',
          HttpStatus.BAD_GATEWAY,
        );
      }

      await this.atualizarEnvRender('ML_TOKEN', data.access_token);
      await this.atualizarEnvRender('ML_REFRESH', data.refresh_token);

      process.env.ML_TOKEN = data.access_token;
      process.env.ML_REFRESH = data.refresh_token;

      return {
        message: 'Token renovado e salvo no Render.',
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

  private async atualizarEnvRender(key: string, value: string) {
    const renderApiKey = process.env.RENDER_API_KEY;
    const serviceId = process.env.RENDER_SERVICE_ID;

    if (!renderApiKey || !serviceId) {
      throw new HttpException(
        'RENDER_API_KEY ou RENDER_SERVICE_ID não configurados',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    await firstValueFrom(
      this.httpService.put(
        `https://api.render.com/v1/services/${serviceId}/env-vars/${key}`,
        { value },
        {
          headers: {
            Authorization: `Bearer ${renderApiKey}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
        },
      ),
    );
  }
}
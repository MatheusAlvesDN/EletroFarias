import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TransporteMaisService {
    private readonly token: string;

    constructor(
        private readonly http: HttpService,
        private readonly configService: ConfigService,) {
        this.token = this.configService.get<string>('TOKEN_TRANSPORTEMAIS')!;
    }

    async buscarEntregas() {
        const url =
            'https://api.transportemais.com.br/v1/entregas?data=14%2F08%2F2025&situacao=2';

        const headers = {
            'Content-Type': 'application/json',
            Authorization: this.token, // exemplo: `Bearer ${token}`
        };

        const response = await firstValueFrom(
            this.http.get(url, { headers }),
        );

        return response.data;
    }

    async buscarEntregasWithFilter() {
        const url =
            'https://api.transportemais.com.br/v1/entregas?data=14%2F08%2F2025&situacao=2';

        const headers = {
            'Content-Type': 'application/json',
            Authorization: this.token, // ou `Bearer ${token}`
        };

        const response = await firstValueFrom(
            this.http.get(url, { headers }),
        );

        // Filtrando apenas campos necessários
        const dadosFiltrados = response.data.data.map((item: any) => ({
            id: item.id,
            numero: item.numero,
        }));

        return dadosFiltrados;
    }
}
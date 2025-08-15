import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TransporteMais {
    private readonly token: string;
    constructor(
        private readonly http: HttpService,
        private readonly config: ConfigService,
    ) {
        this.token = this.config.get<string>('TOKEN_TRANSPORTEMAIS')!;
    }

    // retorna um array [{ id, numero }]
    async buscarEntregas(): Promise<Array<{ id: string; numero: number }>> {
        const url = 'https://api.transportemais.com.br/v1/entregas?data=14%2F08%2F2025&situacao=2';
        const headers = {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.token}`,
        };

        const resp = await firstValueFrom(this.http.get(url, { headers }));
        const lista = Array.isArray(resp.data?.data) ? resp.data.data : [];
        return lista.map((item: any) => ({ id: item.id, numero: item.numero }));
    }
}
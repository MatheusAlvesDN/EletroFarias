import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class Fidelimax {
    constructor(private readonly http: HttpService) { }

    async pontuarClienteFidelimax(cpf: string, pontos: number) {
        const url = 'https://api.fidelimax.com.br/api/Integracao/PontuaConsumidor';
        const authToken = 'b87f8264-c3d7-48cd-a01e-cd6d2ff45168-1073'; // ← Substitua pelo seu token real

        // ❗ Aqui você pode verificar se o CPF já está cadastrado no sistema Fidelimax.
        // Se não estiver, implemente uma chamada para cadastrar o cliente antes da pontuação.

        const payload = {
            cpf: cpf,
            pontuacao_reais: pontos,
            tipo_compra: 'Pontos de Pesquisa',
            verificador: 'PontossPesquisa',
            estorno: false,
        };

        try {
            const response = await firstValueFrom(
                this.http.post(url, payload, {
                    headers: {
                        AuthToken: authToken,
                        'Content-Type': 'application/json',
                    },
                }),
            );

            return response.data;
        } catch (error) {
            console.error('Erro ao pontuar cliente na Fidelimax:', error.response?.data || error.message);
            throw error;
        }
    }
}
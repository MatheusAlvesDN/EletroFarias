import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class Fidelimax {
    private readonly token: string;
    constructor(
        private readonly http: HttpService,
        private readonly configService: ConfigService,
    ) {
        this.token = this.configService.get<string>('FIDELIMAX_TOKEN')!;
    }

    async pontuarClienteFidelimax(cpf: string, pontos: number,verificador:string) {
        const url = 'https://api.fidelimax.com.br/api/Integracao/PontuaConsumidor';

        // ❗ Aqui você pode verificar se o CPF já está cadastrado no sistema Fidelimax.
        // Se não estiver, implemente uma chamada para cadastrar o cliente antes da pontuação.

        const payload = {
            cpf: cpf,
            pontuacao_reais: pontos,
            tipo_compra: 'Compra EletroFarias',
            verificador: verificador,
            estorno: false,
        };

        try {
            const response = await firstValueFrom(
                this.http.post(url, payload, {
                    headers: {
                        AuthToken: this.token,
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

    async cadastrarConsumidor(name: string, id: string, gender: string, mail: string, birth: string, telefone: string): Promise<any> {
        const url = 'https://api.fidelimax.com.br/api/Integracao/CadastrarConsumidor';

        const headers = {
            'AuthToken': this.token,
            'Content-Type': 'application/json',
        };

        const data = {
            nome: name,
            cpf: id,
            sexo: gender,
            email: mail,
            nascimento: birth,
            telefone: telefone,
        };

        const response = await firstValueFrom(
            this.http.post(url, data, { headers })
        );

        return response.data;
    }

    async listarConsumidores(skip: number): Promise<any> {
        const url = 'https://api.fidelimax.com.br/api/Integracao/ListarConsumidores';

        const headers = {
            'AuthToken': this.token,
            'Content-Type': 'application/json',
        };

        const body = {
            novos: false,
            skip: 0,
            take: 50,
        };

        try {
            const response = await firstValueFrom(
                this.http.post(url, body, { headers }),
            );
            return response.data;
        } catch (error) {
            console.error('Erro ao listar consumidores da Fidelimax:', error?.response?.data || error.message);
            throw error;
        }
    }

    async listarTodosConsumidores(): Promise<any[]> {
        let todosConsumidores: any[] = [];
        let skip = 0;
        let continuar = true;

        while (continuar) {
            const resultado = await this.listarConsumidores(skip);
            const consumidores = resultado?.Consumidores || [];

            todosConsumidores = todosConsumidores.concat(consumidores);

            if (consumidores.length < 50) {
                continuar = false;
            } else {
                skip += 50;
            }
        }

        return todosConsumidores;
    }

    async pontuarNotasNaFidelimax(notas: Array<{
        NUNOTA: string;
        CODVENDTEC: number;
        DTALTER: string;
        value: number;
        CODPARC: string | null;
        NOMEPARC?: string;
        CLIENTE?: string;
        TELEFONE?: string;
        EMAIL?: string;
        CGC_CPF?: string; // CPF
        DTNASC?: string;
    }>) {
        const consumidores = await this.listarTodosConsumidores();
        const cpfCadastrados = new Set(consumidores.map(c => c.cpf));

        for (const nota of notas) {
            const cpf = nota.CGC_CPF?.replace(/\D/g, '') ?? null; // só números

            if (!cpf) {
                console.warn(`Nota ${nota.NUNOTA} sem CPF válido. Ignorada.`);
                continue;
            }

            // Se não estiver cadastrado, tenta cadastrar
            if (!cpfCadastrados.has(cpf)) {
                try {
                    await this.cadastrarConsumidor(
                        nota.NOMEPARC || 'Nome não informado',
                        cpf,
                        'M', // ou lógica para definir sexo
                        nota.EMAIL || 'sem-email@nao.informado',
                        nota.DTNASC || "01/01/1990", // ou extrair da nota se disponível
                        nota.TELEFONE || '00000000000'
                    );
                    cpfCadastrados.add(cpf); // adiciona ao set após cadastro
                    console.log(`Cliente ${cpf} cadastrado com sucesso.`);
                } catch (error) {
                    console.error(`Erro ao cadastrar cliente ${cpf}:`, error.message || error);
                    continue; // não pontua se não conseguiu cadastrar
                }
            }

            // Tenta pontuar
            try {
                await this.pontuarClienteFidelimax(cpf, nota.value, nota.NUNOTA);
                console.log(`Cliente ${cpf} pontuado com R$ ${nota.value}`);
            } catch (error) {
                console.error(`Erro ao pontuar cliente ${cpf}:`, error.message || error);
            }
        }
    }

}
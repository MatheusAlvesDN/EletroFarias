import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class Fidelimax {
    private readonly token: string;
    constructor(
        private readonly http: HttpService,
        private readonly configService: ConfigService,
    ) {
        this.token = this.configService.get<string>('FIDELIMAX_TOKEN')!;
    }

    async pontuarClienteFidelimax(cpf: string, pontos: number, verificador: string) {
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
        CODVENDTEC: number | null;
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

    async debitarConsumidores(lote: any[]): Promise<any[]> {
        const url = 'https://api.fidelimax.com.br/api/Integracao/DebitarConsumidor';
        const headers = {
            AuthToken: this.token,
            'Content-Type': 'application/json',
        };

        const resultados: any[] = [];
        const registrosParaExcel: any[] = [];

        for (const item of lote) {
            const body = {
                cpf: item.cpf,
                debito_reais: item.debito_reais,
                descricao_estorno: item.descricao_estorno,
                data: item.data,
            };

            try {
                const response = await firstValueFrom(
                    this.http.post(url, body, { headers }),
                );

                const data = response.data;
                const codigoResposta = data?.CodigoResposta;

                resultados.push({ cpf: item.cpf, success: true, data });

                // ✅ se CódigoResposta for diferente de 100, adiciona aos dados do Excel
                if (codigoResposta !== 100) {
                    registrosParaExcel.push({
                        nome: data.nome,
                        documento: data.documento,
                        saldo_pre_estorno: data.saldo_pre_estorno,
                        pontos_estornados: data.pontos_estornados,
                        codigoResposta: data.CodigoResposta,
                        DATANEG: item.data,
                        NUNOTA: item.NUNOTA, // ✅ Adiciona o número da nota
                    });
                }

            } catch (error) {
                resultados.push({
                    cpf: item.cpf,
                    success: false,
                    error: error.response?.data || error.message,
                });
            }
        }

        // ✅ Gera o Excel se houver registros inválidos
        if (registrosParaExcel.length > 0) {
            await this.salvarEmExcel(registrosParaExcel, `registros_invalidos`);
        }

        return resultados;
    }

    async salvarEmExcel(dados: any[], nomeArquivo: string): Promise<void> {
        // Usa a raiz do projeto como base
        const pastaSaida = path.resolve(process.cwd(), 'relatorios');
        const caminhoCompleto = path.join(pastaSaida, `${nomeArquivo}.xlsx`);

        if (!fs.existsSync(pastaSaida)) {
            fs.mkdirSync(pastaSaida, { recursive: true });
        }

        let dadosExistentes: any[] = [];

        if (fs.existsSync(caminhoCompleto)) {
            const workbookExistente = XLSX.readFile(caminhoCompleto);
            const abaExistente = workbookExistente.Sheets[workbookExistente.SheetNames[0]];
            dadosExistentes = XLSX.utils.sheet_to_json(abaExistente, { defval: null });
        }

        const dadosCompletos = [...dadosExistentes, ...dados];

        const novaPlanilha = XLSX.utils.json_to_sheet(dadosCompletos);
        const novoWorkbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(novoWorkbook, novaPlanilha, 'Relatorio');

        XLSX.writeFile(novoWorkbook, caminhoCompleto);

        console.log(`📁 Planilha atualizada com ${dados.length} novos registros: ${caminhoCompleto}`);
    }


    async lerPlanilhaExcel(nomeArquivo: string): Promise<any[]> {
        try {
            const caminhoCompleto = path.resolve(process.cwd(), 'relatorios', `${nomeArquivo}.xlsx`);

            if (!fs.existsSync(caminhoCompleto)) {
                throw new Error(`Arquivo não encontrado: ${caminhoCompleto}`);
            }

            const workbook = XLSX.readFile(caminhoCompleto);
            const primeiraAba = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[primeiraAba];
            const dados = XLSX.utils.sheet_to_json(worksheet, { defval: null });

            console.log(`📄 ${nomeArquivo}.xlsx lido com sucesso. ${dados.length} registros carregados.`);
            return dados;
        } catch (error) {
            console.error('Erro ao ler planilha:', error.message || error);
            return [];
        }
    }

}
import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class Fidelimax {
  private readonly tokenCliente: string;
  private readonly tokenParceiro: string;
  constructor(
    private readonly http: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.tokenCliente = this.configService.get<string>(
      'TOKEN_FIDELIMAX_CLIENTE',
    )!;
    this.tokenParceiro = this.configService.get<string>(
      'TOKEN_FIDELIMAX_PARCEIRO',
    )!;
  }

  async pontuarClienteFidelimax(
    cpf: string,
    pontos: number,
    verificador: string,
  ) {
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
            AuthToken: this.tokenCliente,
            'Content-Type': 'application/json',
          },
        }),
      );

      return response.data;
    } catch (error) {
      console.error(
        'Erro ao pontuar cliente na Fidelimax:',
        error.response?.data || error.message,
      );
      throw error;
    }
  }

  async cadastrarConsumidor(
    name: string,
    id: string,
    gender: string,
    mail: string,
    birth: string,
    telefone: string,
  ): Promise<any> {
    const url =
      'https://api.fidelimax.com.br/api/Integracao/CadastrarConsumidor';

    const headers = {
      AuthToken: this.tokenCliente,
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
      this.http.post(url, data, { headers }),
    );

    return response.data;
  }

  async verificarSeConsumidorExiste(cpf: string): Promise<boolean> {
    const url =
      'https://api.fidelimax.com.br/api/Integracao/RetornaDadosCliente';
    const headers = {
      AuthToken: this.tokenCliente,
      'Content-Type': 'application/json',
    };
    // Remove non-digits to be safe, though caller might already do it.
    const body = { cpf: cpf.replace(/\D/g, ''), endereco: false };

    try {
      const response = await firstValueFrom(
        this.http.post(url, body, { headers }),
      );
      // Assuming CodigoResposta 100 means success/found as per other methods.
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      return response.data?.CodigoResposta === 100;
    } catch {
      return false;
    }
  }

  async pontuarNotasNaFidelimax(
    notas: Array<{
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
    }>,
  ) {
    // Optimized: Avoid fetching all consumers. Check existence individually.
    const cpfProcessadosNesteLote = new Set<string>();

    for (const nota of notas) {
      const cpf = nota.CGC_CPF?.replace(/\D/g, '') ?? null; // só números

      if (!cpf) {
        console.warn(`Nota ${nota.NUNOTA} sem CPF válido. Ignorada.`);
        continue;
      }

      // Check if we already processed this CPF in this batch
      if (cpfProcessadosNesteLote.has(cpf)) {
        // Already checked/registered, just pontuar
      } else {
        // Check if exists in Fidelimax
        const existe = await this.verificarSeConsumidorExiste(cpf);

        if (!existe) {
          try {
            await this.cadastrarConsumidor(
              nota.NOMEPARC || 'Nome não informado',
              cpf,
              'M', // ou lógica para definir sexo
              nota.EMAIL || 'sem-email@nao.informado',
              nota.DTNASC || '01/01/1990', // ou extrair da nota se disponível
              nota.TELEFONE || '00000000000',
            );
            console.log(`Cliente ${cpf} cadastrado com sucesso.`);
          } catch (error) {
            console.error(
              `Erro ao cadastrar cliente ${cpf}:`,
              error.message || error,
            );
            continue; // não pontua se não conseguiu cadastrar
          }
        }
        cpfProcessadosNesteLote.add(cpf);
      }

      // Tenta pontuar
      try {
        await this.pontuarClienteFidelimax(cpf, nota.value, nota.NUNOTA);
        console.log(`Cliente ${cpf} pontuado com R$ ${nota.value}`);
      } catch (error) {
        console.error(
          `Erro ao pontuar cliente ${cpf}:`,
          error.message || error,
        );
      }
    }
  }

  async getEnderecoDoConsumidor(cpf: string) {
    const url =
      'https://api.fidelimax.com.br/api/Integracao/RetornaDadosCliente';
    const headers = {
      AuthToken: this.tokenCliente,
      'Content-Type': 'application/json',
    };
    const body = { cpf, endereco: true };
    const resp = await firstValueFrom(this.http.post(url, body, { headers }));
    return resp.data.endereco; // estado, cidade, cep, rua, bairro, numero, complemento
  }

  async listarConsumidores(
    skip: number,
  ): Promise<{ total: number; Consumidores: any[] }> {
    const url =
      'https://api.fidelimax.com.br/api/Integracao/ListarConsumidores';

    const headers = {
      AuthToken: this.tokenCliente,
      'Content-Type': 'application/json',
    };

    const body = {
      novos: false,
      skip,
      take: 50,
      endereco: false,
    };

    try {
      const response = await firstValueFrom(
        this.http.post(url, body, { headers }),
      );
      // aqui já deixo tipado como o formato que a API manda
      return response.data;
    } catch (error) {
      console.error(
        'Erro ao listar consumidores da Fidelimax:',
        error?.response?.data || error.message,
      );
      throw error;
    }
  }

  async listarTodosConsumidores(): Promise<any[]> {
    const todos: any[] = [];
    const PAGE_SIZE = 50;
    let skip = 0;

    while (true) {
      const pagina = await this.listarConsumidores(skip);
      const consumidores = pagina?.Consumidores ?? [];

      // acumula só o array
      todos.push(...consumidores);

      // se veio menos que o tamanho da página, acabou
      if (consumidores.length < PAGE_SIZE) {
        break;
      }

      // próxima página
      skip += PAGE_SIZE;
    }

    return todos;
  }

  async debitarConsumidores(lote: any[]): Promise<any[]> {
    const url = 'https://api.fidelimax.com.br/api/Integracao/DebitarConsumidor';
    const headers = {
      AuthToken: this.tokenCliente,
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

  async debitarConsumidor(
    cpf: string,
    debito_reais: number,
    descricao_estorno?: string,
  ): Promise<any> {
    const url = 'https://api.fidelimax.com.br/api/Integracao/DebitarConsumidor';
    const headers = {
      AuthToken: this.tokenCliente,
      'Content-Type': 'application/json',
    };

    // (opcional) validações rápidas
    if (!cpf) throw new Error('CPF obrigatório');
    if (typeof debito_reais !== 'number' || isNaN(debito_reais))
      throw new Error('debito_reais inválido');
    const body: any = {
      cpf,
      debito_reais,
    };
    if (descricao_estorno) body.descricao_estorno = descricao_estorno;

    try {
      const response = await firstValueFrom(
        this.http.post(url, body, { headers }),
      );
      return response.data; // { CodigoResposta, ... }
    } catch (error: any) {
      // propaga erro já com payload útil, se existir
      const payload = error?.response?.data ?? error?.message ?? error;
      throw new Error(
        typeof payload === 'string' ? payload : JSON.stringify(payload),
      );
    }
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
      const abaExistente =
        workbookExistente.Sheets[workbookExistente.SheetNames[0]];
      dadosExistentes = XLSX.utils.sheet_to_json(abaExistente, {
        defval: null,
      });
    }

    const dadosCompletos = [...dadosExistentes, ...dados];

    const novaPlanilha = XLSX.utils.json_to_sheet(dadosCompletos);
    const novoWorkbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(novoWorkbook, novaPlanilha, 'Relatorio');

    XLSX.writeFile(novoWorkbook, caminhoCompleto);

    console.log(
      `📁 Planilha atualizada com ${dados.length} novos registros: ${caminhoCompleto}`,
    );
  }

  async lerPlanilhaExcel(nomeArquivo: string): Promise<any[]> {
    try {
      const caminhoCompleto = path.resolve(
        process.cwd(),
        'relatorios',
        `${nomeArquivo}.xlsx`,
      );

      if (!fs.existsSync(caminhoCompleto)) {
        throw new Error(`Arquivo não encontrado: ${caminhoCompleto}`);
      }

      const workbook = XLSX.readFile(caminhoCompleto);
      const primeiraAba = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[primeiraAba];
      const dados = XLSX.utils.sheet_to_json(worksheet, { defval: null });

      console.log(
        `📄 ${nomeArquivo}.xlsx lido com sucesso. ${dados.length} registros carregados.`,
      );
      return dados;
    } catch (error) {
      console.error('Erro ao ler planilha:', error.message || error);
      return [];
    }
  }

  async listarProdutosFidelimax(): Promise<any[]> {
    const url = 'https://api.fidelimax.com.br/api/Integracao/ListaProdutos';
    const headers = {
      AuthToken: this.tokenCliente,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };

    const resp = await firstValueFrom(this.http.get(url, { headers }));
    return resp.data.produtos;
  }
}

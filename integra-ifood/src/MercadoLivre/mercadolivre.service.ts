import { Injectable, Logger } from '@nestjs/common';
import { SankhyaService } from '../Sankhya/sankhya.service'; // 👇 Usando SankhyaService

export interface ProdutoML {
  CODPROD: number;
  DESCRPROD: string;
  CODBARRA?: string;
  MARCA?: string;
  PRECO?: number;
  ESTOQUE?: number;
  CATEGORIA_ML?: string;
  IMAGEM_URL?: string;
}

type ResultadoEnvio = {
  codprod: number;
  status: 'success' | 'error';
  ml_item_id?: string;
  error?: string;
};

@Injectable()
export class MercadoLivreService {
  private readonly logger = new Logger(MercadoLivreService.name);
  private readonly mlApiUrl = 'https://api.mercadolibre.com';
  private readonly accessToken = process.env.MERCADO_LIVRE_ACCESS_TOKEN || 'SEU_TOKEN_AQUI';

  private delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 👇 Injetamos o SankhyaService aqui
  constructor(private readonly sankhyaService: SankhyaService) { }

  async enviarProdutosEmLote(produtos: ProdutoML[]) {
    const resultados: ResultadoEnvio[] = [];
    let sucessos = 0;

    try {
      // 1. Fazemos login no Sankhya APENAS UMA VEZ para todo o lote
      this.logger.log('Iniciando login no Sankhya...');
      const sankhyaToken = await this.sankhyaService.login();

      for (const prod of produtos) {
        try {
          // 2. Busca o Estoque Real usando o método oficial do seu sistema
          const estoques = await this.sankhyaService.getEstoqueFront(prod.CODPROD, sankhyaToken);
          // O getEstoqueFront retorna DISPONIVEL
          const estoqueReal = estoques.length > 0 ? estoques[0].DISPONIVEL : 0;

          // 3. Busca o Preço Real na Tabela 0 usando o método oficial do seu sistema
          const precos = await this.sankhyaService.getPrecosProdutosTabelaBatch([prod.CODPROD], 0, sankhyaToken);
          const precoReal = precos.length > 0 ? precos[0].valor : 0;

          if (precoReal <= 0) {
            throw new Error(`Produto sem preço definido na Tabela 0 do Sankhya.`);
          }

          const payloadMl = {
            title: prod.DESCRPROD.substring(0, 60),
            category_id: prod.CATEGORIA_ML || "MLB3236",
            price: precoReal,
            currency_id: "BRL",
            available_quantity: estoqueReal > 0 ? estoqueReal : 0,
            buying_mode: "buy_it_now",
            condition: "new",
            listing_type_id: "gold_special",
            pictures: [
              { source: prod.IMAGEM_URL || "https://sua-loja.com.br/imagem-padrao.jpg" }
            ],
            attributes: [
              {
                id: "GTIN",
                value_name: prod.CODBARRA ? prod.CODBARRA : "N/A"
              },
              {
                id: "BRAND",
                value_name: prod.MARCA || "Marca Genérica"
              }
            ]
          };

          const response = await fetch(`${this.mlApiUrl}/items`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${this.accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(payloadMl)
          });

          const mlData = await response.json();

          if (!response.ok) {
            throw new Error(mlData.message || JSON.stringify(mlData.cause || mlData));
          }

          sucessos++;
          resultados.push({
            codprod: prod.CODPROD,
            status: 'success',
            ml_item_id: mlData.id
          });

        } catch (error: any) {
          this.logger.error(`Erro ao enviar produto ${prod.CODPROD}: ${error.message}`);
          resultados.push({
            codprod: prod.CODPROD,
            status: 'error',
            error: error.message
          });
        }

        // Aguarda 200ms para não sobrecarregar a API do M.L.
        await this.delay(200);
      }

    } catch (authError: any) {
      this.logger.error('Falha ao autenticar no Sankhya', authError.message);
      throw new Error('Não foi possível conectar ao Sankhya para validar os preços.');
    }

    return {
      message: `${sucessos} de ${produtos.length} produtos processados com sucesso.`,
      detalhes: resultados
    };
  }

  // Se você tiver a função getAllProdutos, pode deixá-la comentada ou retornar apenas um throw Error
  // já que o Frontend pega a lista direto da sua outra rota de Sankhya
  async getAllProdutos() {
    throw new Error("Por favor, busque os produtos pela rota oficial do Sankhya no Frontend.");
  }
}
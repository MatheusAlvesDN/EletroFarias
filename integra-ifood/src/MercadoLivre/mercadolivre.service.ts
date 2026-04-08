import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../Prisma/prisma.service'; // Ajuste o caminho conforme sua estrutura

export interface ProdutoML {
  CODPROD: number;
  DESCRPROD: string;
  CODBARRA?: string;
  MARCA?: string;
  PRECO: number; 
  ESTOQUE: number; 
  CATEGORIA_ML?: string; 
  IMAGEM_URL?: string; 
}

// 1. Criamos uma interface para os dados que vêm do Frontend/Sankhya
export interface ProdutoML {
  CODPROD: number;
  DESCRPROD: string;
  CODBARRA?: string;
  MARCA?: string;
  PRECO: number; // Agora é obrigatório
  ESTOQUE: number; // Agora é obrigatório
  CATEGORIA_ML?: string; // Ex: MLB3236
  IMAGEM_URL?: string; 
}

type ResultadoEnvio = {
  codprod: number;
  status: 'success' | 'error';
  ml_item_id?: string; // Opcional, pois só existe em caso de sucesso
  error?: string;      // Opcional, pois só existe em caso de erro
};

@Injectable()
export class MercadoLivreService {


  private readonly logger = new Logger(MercadoLivreService.name);
  private readonly mlApiUrl = 'https://api.mercadolibre.com';
  
  // ATENÇÃO: O Token deve vir do banco de dados na vida real, pois ele expira a cada 6 horas!
  private readonly accessToken = process.env.MERCADO_LIVRE_ACCESS_TOKEN || 'SEU_TOKEN_AQUI';

  // Função auxiliar para evitar Rate Limit (429) da API do Mercado Livre
  private delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  constructor(private readonly prisma: PrismaService) {}

  async getAllProdutos() {
    try {
      this.logger.log('Buscando produtos do Sankhya para o Mercado Livre...');

      /* ATENÇÃO: Abaixo está um exemplo de query SQL baseada no padrão do Sankhya.
        Você precisará ajustar os JOINs de Preço (TGFEXC) e Estoque (TGFEST) 
        conforme as tabelas de NUTAB (Tabela de Preço) e CODEMP (Empresa) que você usa.
      */
      const produtos = await this.prisma.$queryRaw<any[]>`
        SELECT 
          PROD.CODPROD, 
          PROD.DESCRPROD, 
          PROD.MARCA,
          PROD.CODGRUPOPROD,
          GRUPO.DESCRGRUPOPROD,
          BARRA.CODBARRA,
          NVL(ESTOQUE.ESTOQUE, 0) AS ESTOQUE,
          NVL(PRECO.VLRVENDA, 0) AS PRECO
        FROM TGFPRO PROD
        LEFT JOIN TGFGRU GRUPO ON PROD.CODGRUPOPROD = GRUPO.CODGRUPOPROD
        LEFT JOIN TGFBAR BARRA ON PROD.CODPROD = BARRA.CODPROD
        -- Traz o estoque da empresa principal (Ajuste o CODEMP se necessário)
        LEFT JOIN TGFEST ESTOQUE ON PROD.CODPROD = ESTOQUE.CODPROD AND ESTOQUE.CODEMP = 1 
        -- Traz o preço de venda da tabela 0 (Ajuste o NUTAB conforme a sua tabela do M.L.)
        LEFT JOIN TGFEXC PRECO ON PROD.CODPROD = PRECO.CODPROD AND PRECO.NUTAB = 0
        WHERE PROD.ATIVO = 'S' 
        -- Opcional: ROWNUM para limitar a busca e não travar o sistema
        -- AND ROWNUM <= 3000 
      `;

      // Mapeamos os dados para garantir que os números não venham como BigInt (erro comum no Prisma)
      return produtos.map((p) => ({
        CODPROD: Number(p.CODPROD),
        DESCRPROD: String(p.DESCRPROD),
        MARCA: p.MARCA ? String(p.MARCA) : 'Genérica',
        CODGRUPOPROD: p.CODGRUPOPROD ? Number(p.CODGRUPOPROD) : null,
        DESCRGRUPOPROD: p.DESCRGRUPOPROD ? String(p.DESCRGRUPOPROD) : 'Sem Grupo',
        CODBARRA: p.CODBARRA ? String(p.CODBARRA) : null,
        ESTOQUE: Number(p.ESTOQUE),
        PRECO: Number(p.PRECO),
      }));

    } catch (error: any) {
      this.logger.error(`Erro ao buscar produtos: ${error.message}`);
      throw new Error('Falha ao buscar produtos no banco de dados.');
    }
  }

  // 2. Trocamos o any[] pela interface correta
  async enviarProdutosEmLote(produtos: ProdutoML[]) {
    const resultados: ResultadoEnvio[] = [];
    let sucessos = 0;

    for (const prod of produtos) {
      try {
        // Validação básica antes de tentar enviar
        if (!prod.PRECO || prod.PRECO <= 0) {
            throw new Error('Produto sem preço definido.');
        }

        // 3. Mapeamento com dados dinâmicos do banco
        const payloadMl = {
          title: prod.DESCRPROD.substring(0, 60), // ML limita o título a 60 caracteres
          category_id: prod.CATEGORIA_ML || "MLB3236", // Ideal é ter a categoria mapeada no Sankhya
          price: prod.PRECO,
          currency_id: "BRL",
          available_quantity: prod.ESTOQUE > 0 ? prod.ESTOQUE : 0, 
          buying_mode: "buy_it_now",
          condition: "new",
          listing_type_id: "gold_special", 
          pictures: [
            { 
              // Usa a imagem do produto ou uma genérica da sua loja
              source: prod.IMAGEM_URL || "https://sua-loja.com.br/imagem-padrao.jpg" 
            } 
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

      // 4. Aguarda 200ms entre as requisições para evitar bloqueio da API do Mercado Livre
      await this.delay(200); 
    }

    return { 
      message: `${sucessos} de ${produtos.length} produtos processados com sucesso.`,
      detalhes: resultados 
    };
  }
}
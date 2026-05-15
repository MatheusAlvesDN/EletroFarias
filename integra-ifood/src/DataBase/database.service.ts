import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '../Prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import * as oracledb from 'oracledb';

@Injectable()
export class DataBaseService implements OnModuleDestroy, OnModuleInit {
  private readonly logger = new Logger(DataBaseService.name);
  private pool: oracledb.Pool | null = null;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) { }

  async onModuleInit() {
    const bridgeUrl = this.configService.get<string>('ORACLE_BRIDGE_URL');
    if (bridgeUrl) {
      this.logger.log(`Using Oracle Bridge at: ${bridgeUrl}`);
    } else {
      await this.logPublicIp();
    }
  }

  private async callBridge<T>(path: string, body: any): Promise<T> {
    const bridgeUrl = this.configService.get<string>('ORACLE_BRIDGE_URL');
    const apiKey = this.configService.get<string>('ORACLE_BRIDGE_API_KEY');

    if (!bridgeUrl) throw new Error('ORACLE_BRIDGE_URL not configured');

    const response = await fetch(`${bridgeUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey || '',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Bridge Error (${response.status}): ${errorText}`);
    }

    return await response.json();
  }

  async logPublicIp() {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      this.logger.log(`Backend Server Public IP: ${data.ip}`);
      return data.ip;
    } catch (error) {
      this.logger.warn(`Could not determine public IP: ${error.message}`);
      return '0.0.0.0';
    }
  }

  async onModuleDestroy() {
    if (this.pool) {
      try {
        await this.pool.close(10);
        this.logger.log('Oracle connection pool closed.');
      } catch (err) {
        this.logger.error('Error closing Oracle connection pool', err);
      }
    }
  }

  /**
   * Obtém ou cria o pool de conexões com o Oracle
   */
  private async getPool(): Promise<oracledb.Pool> {
    if (this.pool) return this.pool;

    const user = this.configService.get<string>('DATABASE_ORACLE_USER');
    const password = this.configService.get<string>('DATABASE_ORACLE_PASS');
    const host = this.configService.get<string>('DATABASE_ORACLE_HOST');
    const port = this.configService.get<string>('DATABASE_ORACLE_PORT');
    const sid = this.configService.get<string>('DATABASE_ORACLE_SID');

    if (!user || !password || !host || !port || !sid) {
      throw new Error('Configurações do banco de dados Oracle incompletas no .env');
    }

    try {
      this.pool = await oracledb.createPool({
        user,
        password,
        // Usando formato explícito para garantir que porta e SID sejam respeitados
        connectString: `(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=${host})(PORT=${port}))(CONNECT_DATA=(SID=${sid})))`,
        poolMax: 10,
        poolMin: 1,
        poolIncrement: 1,
      });
      this.logger.log(`Oracle connection pool created successfully on port ${port} (Thin Mode).`);
      return this.pool;
    } catch (err) {
      this.logger.error(`Failed to create Oracle connection pool on ${host}:${port}: ${err.message}`);
      throw err;
    }
  }

  /**
   * Executa uma consulta SQL no banco de dados Oracle
   * @param sql Query SQL
   * @param params Parâmetros da query
   * @param options Opções de execução do oracledb
   */
  async execute<T = any>(
    sql: string,
    params: any[] | Record<string, any> = [],
    options: oracledb.ExecuteOptions = {}
  ): Promise<T[]> {
    const bridgeUrl = this.configService.get<string>('ORACLE_BRIDGE_URL');
    if (bridgeUrl) {
      return this.callBridge<T[]>('/execute', { sql, params, options });
    }

    let connection: oracledb.Connection | null = null;
    try {
      const pool = await this.getPool();
      connection = await pool.getConnection();

      const result = await connection.execute(sql, params, {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
        autoCommit: true,
        ...options,
      });

      return (result.rows as T[]) || [];
    } catch (error) {
      this.logger.error(`Query execution failed: ${error.message}`);
      throw error;
    } finally {
      if (connection) {
        try {
          await connection.close();
        } catch (err) {
          this.logger.error(`Error closing Oracle connection: ${err.message}`);
        }
      }
    }
  }

  async getItems(codProd: string[]) {
    if (!codProd || codProd.length === 0) return [];

    const bridgeUrl = this.configService.get<string>('ORACLE_BRIDGE_URL');
    if (bridgeUrl) {
      return this.callBridge<any[]>('/items', { codProd });
    }

    const binds = codProd.map((_, i) => `:p${i}`);
    const bindObj = codProd.reduce((acc, val, i) => ({ ...acc, [`p${i}`]: val }), {});
    const query = `SELECT * FROM TGFPRO WHERE CODPROD IN (${binds.join(',')})`;
    return await this.execute(query, bindObj);
  }

  async getItemDetailed(codProd: string) {
    const bridgeUrl = this.configService.get<string>('ORACLE_BRIDGE_URL');
    if (bridgeUrl) {
      return this.callBridge<any>('/item', { codProd });
    }

    const codProdNum = Number(codProd);

    // 1. Info básica
    const queryBasic = `SELECT 
        CODPROD, 
        DESCRPROD, 
        MARCA, 
        CODGRUPOPROD, 
        REFFORN as REFERENCIA, 
        CARACTERISTICAS as COMPLEMENTO 
    FROM TGFPRO
    WHERE CODPROD = :codProdNum`;

    const basicResults = await this.execute(queryBasic, { codProdNum });
    if (!basicResults || basicResults.length === 0) return null;
    const item = basicResults[0];

    // 2. Preço
    const priceResults = await this.getPrice(codProdNum);
    const preco = priceResults[0]?.PRECO || 0;

    // 3. Estoque (Local 1100 é o padrão)
    const stockResults = await this.getStock(codProdNum);
    const estoqueLocal1100 = stockResults.find((s: any) => s.CODLOCAL === 1100);
    const estoque = estoqueLocal1100 ? estoqueLocal1100.ESTOQUE : 0;

    return {
      ...item,
      PRECO: preco,
      ESTOQUE: estoque,
      IMAGEM_URL: `https://danilo.nuvemdatacom.com.br:9092/mge/Produto@IMAGEM@CODPROD=${item.CODPROD}.dbimage`
    };
  }


  async searchByName(term: string, tag?: string) {
    if (!term) return [];

    const bridgeUrl = this.configService.get<string>('ORACLE_BRIDGE_URL');
    if (bridgeUrl) {
      return this.callBridge<any[]>('/search-products', { term, tag });
    }

    const words = term.toUpperCase().split(' ').filter(word => word.length > 0);
    const bindParams: Record<string, any> = {};
    const conditions: string[] = [];

    words.forEach((word, index) => {
      const paramName = `word${index}`;
      // Busca em múltiplos campos (removido CODBARRA que não existe na TGFPRO)
      conditions.push(`(UPPER(DESCRPROD) LIKE :${paramName} OR UPPER(REFFORN) LIKE :${paramName} OR UPPER(MARCA) LIKE :${paramName})`);
      bindParams[paramName] = `%${word}%`;
    });

    if (/^\d+$/.test(term)) {
      conditions.push(`CODPROD = :exactCod`);
      bindParams.exactCod = Number(term);
    }

    const whereClause = conditions.length > 1
      ? `(${conditions.slice(0, words.length).join(' AND ')})` + (bindParams.exactCod ? ` OR CODPROD = :exactCod` : '')
      : conditions.join(' OR ');

    // Filtros por Tag (LID / ELETRO)
    let tagFilter = "";
    if (tag === 'ELETRO') {
      tagFilter = "AND P.CODGRUPOPROD > 7100000 AND P.CODGRUPOPROD <= 7199999";
    } else if (tag === 'LID') {
      tagFilter = "AND P.CODGRUPOPROD > 7200000 AND P.CODGRUPOPROD <= 7299999";
    }

    const query = `SELECT 
                      P.CODPROD, 
                      P.DESCRPROD, 
                      P.REFFORN as REFERENCIA, 
                      P.MARCA, 
                      P.CARACTERISTICAS as COMPLEMENTO,
                      NVL((SELECT MAX(VLRVENDA) FROM TGFEXC WHERE CODPROD = P.CODPROD AND VLRVENDA > 0), 0) as PRECO
                   FROM TGFPRO P
                   WHERE ${whereClause}
                   AND P.ATIVO = 'S'
                   AND P.USOPROD = 'R'
                   ${tagFilter}
                   AND ROWNUM <= 50`;

    return await this.execute(query, bindParams);
  }

  async getStock(codProd: number) {
    const bridgeUrl = this.configService.get<string>('ORACLE_BRIDGE_URL');
    if (bridgeUrl) {
      return this.callBridge<any[]>('/stock', { codProd });
    }

    const query = `SELECT 
    e.CODLOCAL,
    l.DESCRLOCAL as NOME_LOCAL,
    e.ESTOQUE, 
    e.RESERVADO, 
    (e.ESTOQUE - e.RESERVADO) as DISPONIVEL 
FROM TGFEST e
JOIN TGFLOC l ON e.CODLOCAL = l.CODLOCAL
WHERE e.CODPROD = :codProd
AND (e.ESTOQUE <> 0 OR e.RESERVADO <> 0)
ORDER BY e.CODLOCAL`;
    return await this.execute(query, { codProd });
  }

  async getPrice(codProd: number) {
    const bridgeUrl = this.configService.get<string>('ORACLE_BRIDGE_URL');
    if (bridgeUrl) {
      return this.callBridge<any[]>('/price', { codProd });
    }

    const query = `
      SELECT 
        COALESCE(MAX(VLRVENDA), 0) AS PRECO,
        'TABELA PADRÃO' AS TABELA
      FROM TGFEXC 
      WHERE CODPROD = :codProd 
        AND VLRVENDA > 0
    `;

    return await this.execute(query, { codProd });
  }

  async searchCustomers(term: string) {
    if (!term) return [];

    const bridgeUrl = this.configService.get<string>('ORACLE_BRIDGE_URL');
    if (bridgeUrl) {
      return this.callBridge<any[]>('/search-customers', { term });
    }

    const words = term.toUpperCase().split(' ').filter(word => word.length > 0);
    const bindParams: Record<string, any> = {};
    const conditions: string[] = [];

    words.forEach((word, index) => {
      const paramName = `word${index}`;
      conditions.push(`(UPPER(RAZAOSOCIAL) LIKE :${paramName} OR CGC_CPF LIKE :${paramName} OR TO_CHAR(CODPARC) = :${paramName})`);
      bindParams[paramName] = `%${word}%`;
    });

    const whereClause = conditions.join(' AND ');

    const query = `SELECT CODPARC as "codParc", RAZAOSOCIAL as "nome", CGC_CPF as "documento", EMAIL as "email", TELEFONE as "telefone"
                   FROM TGFPAR 
                   WHERE ${whereClause}
                   AND ROWNUM <= 20`;

    return await this.execute(query, bindParams);
  }

  async getAllItems() {
    const bridgeUrl = this.configService.get<string>('ORACLE_BRIDGE_URL');
    if (bridgeUrl) {
      return this.callBridge<any[]>('/items/all', {});
    }
    return await this.execute(`SELECT * FROM TGFPRO WHERE ROWNUM <= 100`);
  }

  async getPortalNotas(filters: {
    dataInicio?: string;
    dataFim?: string;
    nota?: string;
    empresa?: string;
    parceiro?: string;
    confirmada?: string;
  }) {
    const bridgeUrl = this.configService.get<string>('ORACLE_BRIDGE_URL');
    if (bridgeUrl) {
      return this.callBridge<any[]>('/portal-notas', { filters });
    }

    const where: string[] = ['NVL(CAB.NUMNOTA, 0) <> 0'];
    const binds: Record<string, any> = {};

    if (filters.dataInicio) {
      where.push(`CAB.DTNEG >= TO_DATE(:dataInicio, 'YYYY-MM-DD')`);
      binds.dataInicio = filters.dataInicio;
    }

    if (filters.dataFim) {
      where.push(`CAB.DTNEG < TO_DATE(:dataFim, 'YYYY-MM-DD') + 1`);
      binds.dataFim = filters.dataFim;
    }

    if (filters.nota) {
      where.push(`TO_CHAR(CAB.NUMNOTA) LIKE :nota`);
      binds.nota = `%${filters.nota}%`;
    }

    if (filters.empresa) {
      where.push(`TO_CHAR(CAB.CODEMP) = :empresa`);
      binds.empresa = filters.empresa;
    }

    if (filters.parceiro) {
      where.push(`UPPER(PARC.RAZAOSOCIAL) LIKE :parceiro`);
      binds.parceiro = `%${filters.parceiro.toUpperCase()}%`;
    }

    if (filters.confirmada === 'Sim') {
      where.push(`CAB.STATUSNOTA = 'L'`);
    }
    if (filters.confirmada === 'Não') {
      where.push(`CAB.STATUSNOTA <> 'L'`);
    }

    const query = `
      SELECT
        CASE WHEN CAB.STATUSNOTA = 'L' THEN 'Sim' ELSE 'Não' END AS CONFIRMADA,
        TO_CHAR(CAB.CODUSUINC) AS CODUSUARIO,
        TO_CHAR(NVL(CAB.PERCDESC, 0), 'FM999G999G990D00') AS DESCONTO,
        NVL(USU.NOMEUSU, '-') AS NOMEUSUARIO,
        CASE WHEN CAB.STATUSNOTA = 'L' THEN 'Aprovado' ELSE 'Pendente' END AS LIBERACAO,
        TO_CHAR(CAB.NUMNOTA) AS NOTA,
        TO_CHAR(CAB.NUNOTA) AS NUNOTA
      FROM TGFCAB CAB
      LEFT JOIN TSIUSU USU ON USU.CODUSU = CAB.CODUSUINC
      LEFT JOIN TGFPAR PARC ON PARC.CODPARC = CAB.CODPARC
      WHERE ${where.join(' AND ')}
      ORDER BY CAB.DTNEG DESC, CAB.NUNOTA DESC
      FETCH FIRST 200 ROWS ONLY`;

    return await this.execute(query, binds);
  }

  async saveEstoqueOrcamento(data: {
    clienteId: string;
    vendedorId: string;
    observacoes?: string;
    itens: Array<{ codProd: number; descricao: string; quantidade: number; precoUnitario: number }>;
  }) {
    const total = data.itens.reduce((acc, item) => acc + (item.quantidade * item.precoUnitario), 0);

    return this.prisma.eletroOrcamento.create({
      data: {
        clienteId: data.clienteId,
        vendedorId: data.vendedorId,
        total,
        observacoes: data.observacoes,
        itens: {
          create: data.itens.map(item => ({
            codProd: item.codProd,
            descricao: item.descricao,
            quantidade: item.quantidade,
            precoUnitario: item.precoUnitario,
          }))
        }
      },
      include: {
        itens: true,
        cliente: true
      }
    });
  }

}

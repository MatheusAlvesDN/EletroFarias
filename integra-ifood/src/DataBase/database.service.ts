import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as oracledb from 'oracledb';

@Injectable()
export class DataBaseService implements OnModuleDestroy, OnModuleInit {
  private readonly logger = new Logger(DataBaseService.name);
  private pool: oracledb.Pool | null = null;

  constructor(private configService: ConfigService) { }

  async onModuleInit() {
    try {
      // Busca o IP público do próprio servidor
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      this.logger.log(`Backend Server Public IP: ${data.ip}`);
    } catch (error) {
      this.logger.warn(`Could not determine public IP: ${error.message}`);
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
    const binds = codProd.map((_, i) => `:p${i}`);
    const bindObj = codProd.reduce((acc, val, i) => ({ ...acc, [`p${i}`]: val }), {});
    const query = `SELECT * FROM TGFPRO WHERE CODPROD IN (${binds.join(',')})`;
    return await this.execute(query, bindObj);
  }

  async getItemDetailed(codProd: string) {
    const query = `SELECT 
    CODPROD, 
    DESCRPROD, 
    CARACTERISTICAS as COMPLEMENTO
FROM TGFPRO
WHERE CODPROD = :codProd`;

    const results = await this.execute(query, { codProd });

    // Adiciona a URL da imagem baseada no padrão do Nuvemdatacom
    return results.map((row: any) => ({
      ...row,
      IMAGEM_URL: `https://danilo.nuvemdatacom.com.br:9092/mge/Produto@IMAGEM@CODPROD=${row.CODPROD}.dbimage`
    }));
  }


  async searchByName(term: string) {
    if (!term) return [];
    
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

    const query = `SELECT CODPROD, DESCRPROD, REFFORN as REFERENCIA, MARCA, CARACTERISTICAS as COMPLEMENTO 
                   FROM TGFPRO 
                   WHERE ${whereClause}
                   AND ATIVO = 'S'
                   AND ROWNUM <= 50`;

    return await this.execute(query, bindParams);
  }

  async getStock(codProd: number) {
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

  async getAllItems() {
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


}

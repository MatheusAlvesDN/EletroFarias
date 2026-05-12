import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as oracledb from 'oracledb';

@Injectable()
export class DataBaseService implements OnModuleDestroy {
  private readonly logger = new Logger(DataBaseService.name);
  private pool: oracledb.Pool | null = null;

  constructor(private configService: ConfigService) { }

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

  async getStock(codProd: number, codLocal: number) {
    const query = `SELECT 
    ESTOQUE, 
    RESERVADO, 
    (ESTOQUE - RESERVADO) as DISPONIVEL 
FROM TGFEST 
WHERE CODPROD = :codProd 
AND CODLOCAL = :codLocal`;
    return await this.execute(query, { codProd, codLocal });
  }

  async getPrice(codProd: number) {
    const query = `SELECT 
    i.VLRVENDA as PRECO,
    t.DESCRTIPPARC as TABELA
FROM TGFITE i
JOIN TGFTAB t ON i.NUTAB = t.NUTAB
WHERE i.CODPROD = :codProd 
AND t.ATIVO = 'S'
AND i.NUTAB = (SELECT MAX(NUTAB) FROM TGFTAB WHERE ATIVO = 'S')`;
    return await this.execute(query, { codProd });
  }

  async getAllItems() {
    return await this.execute(`SELECT * FROM TGFPRO WHERE ROWNUM <= 100`);
  }


}

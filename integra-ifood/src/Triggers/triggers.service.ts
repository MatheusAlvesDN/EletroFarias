import { Injectable } from '@nestjs/common';
import * as oracledb from 'oracledb';
import { DEFAULTS, TriggerConfig, TriggerKey, buildTriggerSql } from './triggers.templates';

@Injectable()
export class TriggersService {
  // ajuste via env
  private readonly dbConfig = {
    user: process.env.SANKHYA_DB_USER!,
    password: process.env.SANKHYA_DB_PASS!,
    connectString: process.env.SANKHYA_DB_CONNECT_STRING!,
  };

  listDefaults() {
    return Object.values(DEFAULTS);
  }

  getDefault(name: TriggerKey) {
    const cfg = DEFAULTS[name];
    if (!cfg) throw new Error('Trigger não mapeado.');
    return cfg;
  }

  previewSql(cfg: TriggerConfig) {
    return buildTriggerSql(cfg);
  }

  async apply(cfg: TriggerConfig) {
    const sql = buildTriggerSql(cfg);

    let conn: oracledb.Connection | null = null;
    try {
      conn = await oracledb.getConnection(this.dbConfig);

      // oracledb não executa "/" como terminador, então removemos e executamos o bloco.
      const sqlNoSlash = sql.replace(/\n\/\s*$/m, '').trim();

      await conn.execute(sqlNoSlash, [], { autoCommit: true });

      return { ok: true, name: cfg.name };
    } finally {
      if (conn) {
        try { await conn.close(); } catch {}
      }
    }
  }
}

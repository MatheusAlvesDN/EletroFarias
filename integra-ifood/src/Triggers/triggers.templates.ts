export type TriggerKey =
  | 'TRG_TGFCAB_UPD_NOTADFARIAS414'
  | 'TRG_TGFCAB_UPD_NOTADFARIAS415'
  | 'TRG_TGFCAB_UPD_NOTADFARIAS416'
  | 'TRG_TGFCAB_UPD_NOTADFARIAS417'
  | 'TRG_TGFCAB_UPD_NOTADFARIAS418'
  | 'TRG_TGFCAB_UPD_NOTADFARIAS419';

export type TriggerConfig = {
  name: TriggerKey;

  // condições
  codTipOper: number;
  codParcDiff?: number;     // "AND :NEW.CODPARC <> X"
  codParcDestIsZero?: boolean; // "AND :NEW.CODPARCDEST = 0"

  // sets
  setCodEmp?: number;
  setSerieNota?: number;
  setCodParc?: number;
  setCodParcDestFromCodParc?: boolean; // :NEW.CODPARCDEST := :NEW.CODPARC
  setCodModDocNota?: number;
  setCodTipVenda?: number;
};

export const DEFAULTS: Record<TriggerKey, TriggerConfig> = {
  TRG_TGFCAB_UPD_NOTADFARIAS414: {
    name: 'TRG_TGFCAB_UPD_NOTADFARIAS414',
    codTipOper: 414,
    codParcDiff: 749,
    setCodEmp: 2,
    setSerieNota: 1,
    setCodParc: 749,
    setCodModDocNota: 55,
  },
  TRG_TGFCAB_UPD_NOTADFARIAS415: {
    name: 'TRG_TGFCAB_UPD_NOTADFARIAS415',
    codTipOper: 415,
    codParcDiff: 749,
    setCodEmp: 2,
  },
  TRG_TGFCAB_UPD_NOTADFARIAS416: {
    name: 'TRG_TGFCAB_UPD_NOTADFARIAS416',
    codTipOper: 416,
    codParcDiff: 1,
    setCodParcDestFromCodParc: true,
    setCodParc: 1,
    setCodEmp: 2,
    setSerieNota: 1,
  },
  TRG_TGFCAB_UPD_NOTADFARIAS417: {
    name: 'TRG_TGFCAB_UPD_NOTADFARIAS417',
    codTipOper: 417,
    codParcDiff: 749,
    setCodParcDestFromCodParc: true,
    setCodParc: 749,
  },
  TRG_TGFCAB_UPD_NOTADFARIAS418: {
    name: 'TRG_TGFCAB_UPD_NOTADFARIAS418',
    codTipOper: 418,
    codParcDestIsZero: true,
    setCodParcDestFromCodParc: true,
    setCodTipVenda: 190,
  },
  TRG_TGFCAB_UPD_NOTADFARIAS419: {
    name: 'TRG_TGFCAB_UPD_NOTADFARIAS419',
    codTipOper: 419,
    codParcDestIsZero: true,
    setCodEmp: 2,
    setCodParcDestFromCodParc: true,
  },
};

export function buildTriggerSql(cfg: TriggerConfig) {
  const conds: string[] = [`:NEW.CODTIPOPER = ${cfg.codTipOper}`];

  if (typeof cfg.codParcDiff === 'number') {
    conds.push(`:NEW.CODPARC <> ${cfg.codParcDiff}`);
  }
  if (cfg.codParcDestIsZero) {
    conds.push(`:NEW.CODPARCDEST = 0`);
  }

  const sets: string[] = [];
  if (typeof cfg.setCodEmp === 'number') sets.push(`:NEW.CODEMP := ${cfg.setCodEmp};`);
  if (typeof cfg.setSerieNota === 'number') sets.push(`:NEW.SERIENOTA := ${cfg.setSerieNota};`);
  if (cfg.setCodParcDestFromCodParc) sets.push(`:NEW.CODPARCDEST := :NEW.CODPARC;`);
  if (typeof cfg.setCodParc === 'number') sets.push(`:NEW.CODPARC := ${cfg.setCodParc};`);
  if (typeof cfg.setCodModDocNota === 'number') sets.push(`:NEW.CODMODDOCNOTA := ${cfg.setCodModDocNota};`);
  if (typeof cfg.setCodTipVenda === 'number') sets.push(`:NEW.CODTIPVENDA := ${cfg.setCodTipVenda};`);

  if (sets.length === 0) {
    throw new Error('Trigger sem SETs. Defina ao menos um campo para setar.');
  }

  return `
CREATE OR REPLACE TRIGGER ${cfg.name}
BEFORE INSERT OR UPDATE ON TGFCAB
FOR EACH ROW
BEGIN
  IF ${conds.join(' AND ')} THEN
    ${sets.join('\n    ')}
  END IF;
END;
/
`.trim();
}

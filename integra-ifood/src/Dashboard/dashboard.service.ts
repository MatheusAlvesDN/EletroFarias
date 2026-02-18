import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { SankhyaService } from '../Sankhya/sankhya.service';
import { firstValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    private readonly sankhyaService: SankhyaService,
    private readonly http: HttpService,
  ) { }

  /**
   * Aceita:
   * - "YYYY-MM"
   * - "YYYY-MM-DD"
   * Retorna Oracle: TO_DATE('YYYY-MM-DD','YYYY-MM-DD') sempre no dia 01 quando vier YYYY-MM.
   */
  private toOracleDate(dtRef: string): string {
    const v = (dtRef ?? '').trim();

    // YYYY-MM
    if (/^\d{4}-\d{2}$/.test(v)) {
      const [y, m] = v.split('-');
      return `TO_DATE('${y}-${m}-01','YYYY-MM-DD')`;
    }

    // YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
      return `TO_DATE('${v}','YYYY-MM-DD')`;
    }

    throw new HttpException('dtRef inválido. Use YYYY-MM ou YYYY-MM-DD.', HttpStatus.BAD_REQUEST);
  }

  private replaceDtRef(sql: string, oracleDate: string) {
    return sql.replaceAll(':P_DTREF', oracleDate);
  }

  private replaceCodParc(sql: string, codParc: number) {
    // Aqui é seguro porque validamos inteiro > 0 no controller
    return sql.replaceAll(':P_CODPARC', String(codParc));
  }

  async getDadosIncentivo(
    visao: 'top' | 'perfil' | 'parceiro' | 'detalhe' | 'entrada',
    dtRef: string,
    codParc?: number,
  ) {
    const token = await this.sankhyaService.login();
    const oracleDate = this.toOracleDate(dtRef);

    try {
      let sql = '';

      if (visao === 'top') {
        sql = `
WITH ITENS AS (
  SELECT
    c.codtipoper,
    c.nunota,
    (CASE WHEN c.codtipoper IN (800,801) THEN -1 ELSE 1 END) * NVL(i.vlrtot,0) AS vlr_assinado,
    CASE
      WHEN NVL(i.basesubstit,0) > 0
        OR NVL(i.vlrsubst,0) > 0
        OR SUBSTR(LPAD(TO_CHAR(NVL(i.codtrib,0)),3,'0'),-2) IN ('10','30','60','70')
      THEN 'ST'
      ELSE 'TRIB'
    END AS tip_trib
  FROM tgfcab c
  JOIN tgfite i ON i.nunota = c.nunota
  WHERE c.codtipoper IN (11,299,700,382,326,383,2005,2002,406,408,800,801)
    AND c.statusnfe = 'A'
    AND NVL(c.numnota,0) <> 0
    AND c.codemp = 1
    AND TRUNC(c.dtneg) BETWEEN ADD_MONTHS(TRUNC(:P_DTREF,'MM'), -1)
                          AND LAST_DAY(ADD_MONTHS(TRUNC(:P_DTREF,'MM'), -1))
),
GRUPO AS (
  SELECT
    CASE
      WHEN codtipoper IN (11,299,700,382)
        THEN '11, 299,700,382'
      WHEN codtipoper IN (326,383,299,700,382)
        THEN '326,383,299,700,382'
      WHEN codtipoper IN (2005,2002,406)
        THEN '2005,2002,406,408'
      WHEN codtipoper IN (408)
        THEN '408'
      WHEN codtipoper IN (800,801)
        THEN '800,801'
    END AS TOPS,
    CASE
      WHEN codtipoper IN (11,299,700,382)
        THEN 'Vendas total - contabil'
      WHEN codtipoper IN (326,383,299,700,382)
        THEN 'Vendas total - icms'
      WHEN codtipoper IN (2005,2002,406)
        THEN 'Ajuste outras saida e reclassificacao'
      WHEN codtipoper IN (408)
        THEN 'Bonificacao'
      WHEN codtipoper IN (800,801)
        THEN 'devolucao de venda'
    END AS DESCRICAO,
    nunota,
    tip_trib,
    vlr_assinado
  FROM ITENS
),
AGG AS (
  SELECT
    TOPS,
    DESCRICAO,
    COUNT(DISTINCT nunota) AS QTD_NOTAS,
    NVL(SUM(CASE WHEN tip_trib='ST'   THEN vlr_assinado ELSE 0 END),0) AS VLR_TOTAL_ST,
    NVL(SUM(CASE WHEN tip_trib='TRIB' THEN vlr_assinado ELSE 0 END),0) AS VLR_TOTAL_TB,
    NVL(SUM(vlr_assinado),0) AS VLR_TOTAL
  FROM GRUPO
  GROUP BY TOPS, DESCRICAO
)
SELECT
  TOPS,
  QTD_NOTAS,
  DESCRICAO,
  VLR_TOTAL_ST,
  VLR_TOTAL_TB,
  VLR_TOTAL
FROM AGG
ORDER BY
  CASE TOPS
    WHEN '11, 299,700,382' THEN 1
    WHEN '326,383,299,700,382' THEN 2
    WHEN '2005,2002,406,408' THEN 3
    WHEN '408' THEN 4
    WHEN '800,801' THEN 5
  END
`;
        sql = this.replaceDtRef(sql, oracleDate);
      }

      if (visao === 'perfil') {
        sql = `
WITH
ITENS AS (
  SELECT
    c.codparc,
    i.codprod,
    CASE
      WHEN NVL(i.basesubstit,0) > 0
        OR NVL(i.vlrsubst,0) > 0
        OR SUBSTR(LPAD(TO_CHAR(NVL(i.codtrib,0)),3,'0'),-2) IN ('10','30','60','70')
      THEN 'ST'
      ELSE 'TRIB'
    END AS tip_trib,
    c.nunota,
    c.codtipoper,
    (CASE WHEN c.codtipoper IN (800,801) THEN -1 ELSE 1 END) * NVL(i.vlrtot,0) AS vlr_liq
  FROM tgfcab c
  JOIN tgfite i ON i.nunota = c.nunota
  WHERE c.codtipoper IN (700, 701, 326, 299, 382, 801, 800)
    AND c.statusnfe = 'A'
    AND NVL(c.numnota,0) <> 0
    AND c.codemp = 1
    AND TRUNC(c.dtneg) BETWEEN TRUNC(:P_DTREF,'MM') AND LAST_DAY(TRUNC(:P_DTREF,'MM'))
),
ULTIMA_ENTRADA_PROD AS (
  SELECT x.codprod, x.ad_indpb
  FROM (
    SELECT
      ite_ent.codprod,
      par_ent.ad_indpb,
      ROW_NUMBER() OVER (PARTITION BY ite_ent.codprod ORDER BY cab_ent.dtneg DESC, cab_ent.nunota DESC) AS rn
    FROM tgfcab cab_ent
    JOIN tgfite ite_ent ON ite_ent.nunota = cab_ent.nunota
    LEFT JOIN tgfpar par_ent ON par_ent.codparc = cab_ent.codparc
    WHERE NVL(cab_ent.numnota,0) <> 0
      AND cab_ent.statusnota = 'L'
      AND cab_ent.codtipoper IN (300,344)
  ) x
  WHERE x.rn = 1
),
MOV AS (
  SELECT
    it.codparc,
    it.tip_trib,
    SUM(it.vlr_liq) AS total_liq,
    SUM(CASE WHEN NVL(ue.ad_indpb,'N') = 'S' THEN it.vlr_liq ELSE 0 END) AS total_liq_indpb
  FROM ITENS it
  LEFT JOIN ULTIMA_ENTRADA_PROD ue ON ue.codprod = it.codprod
  GROUP BY it.codparc, it.tip_trib
),
PIV AS (
  SELECT
    codparc,
    SUM(total_liq) AS total,
    SUM(CASE WHEN tip_trib='ST'   THEN total_liq ELSE 0 END) AS total_st,
    SUM(CASE WHEN tip_trib='TRIB' THEN total_liq ELSE 0 END) AS total_trib,
    SUM(CASE WHEN tip_trib='ST'   THEN total_liq_indpb ELSE 0 END) AS st_ind_pb,
    SUM(CASE WHEN tip_trib='TRIB' THEN total_liq_indpb ELSE 0 END) AS trib_ind_pb
  FROM MOV
  GROUP BY codparc
),
BASE_FATURAMENTO AS (
  SELECT
    CASE
      WHEN NVL(i.basesubstit,0) > 0
        OR NVL(i.vlrsubst,0) > 0
        OR SUBSTR(LPAD(TO_CHAR(NVL(i.codtrib,0)),3,'0'),-2) IN ('10','30','60','70')
      THEN (CASE WHEN c.codtipoper IN (801,800) THEN -1 ELSE 1 END) * NVL(i.vlrtot,0)
      ELSE 0
    END AS vlr_st,
    CASE
      WHEN NOT (
        NVL(i.basesubstit,0) > 0
        OR NVL(i.vlrsubst,0) > 0
        OR SUBSTR(LPAD(TO_CHAR(NVL(i.codtrib,0)),3,'0'),-2) IN ('10','30','60','70')
      )
      THEN (CASE WHEN c.codtipoper IN (801,800) THEN -1 ELSE 1 END) * NVL(i.vlrtot,0)
      ELSE 0
    END AS vlr_trib
  FROM tgfcab c
  JOIN tgfite i ON i.nunota = c.nunota
  WHERE c.codtipoper IN (700, 701, 326, 299, 382, 801, 800)
    AND c.STATUSNFE = 'A'
    AND NVL(c.numnota,0) <> 0
    AND c.CODEMP = 1
    AND TRUNC(c.dtneg) BETWEEN ADD_MONTHS(TRUNC(:P_DTREF,'MM'), -1)
                          AND LAST_DAY(ADD_MONTHS(TRUNC(:P_DTREF,'MM'), -1))
),
T AS (
  SELECT
    NVL(SUM(vlr_st),0)   * 0.07     AS FATOR_ST_7,
    NVL(SUM(vlr_st),0)   * 0.10     AS FATOR_ST_10,
    NVL(SUM(vlr_trib),0) * 0.07     AS FATOR_TRIB_7,
    NVL(SUM(vlr_trib),0) * 0.10     AS FATOR_TRIB_10
  FROM BASE_FATURAMENTO
),
PARC AS (
  SELECT
    pv.*,
    NVL(p.ad_tipoclientefaturar, 5) AS tipo_cli
  FROM PIV pv
  JOIN tgfpar p ON p.codparc = pv.codparc
),
CALC_POR_PARC AS (
  SELECT
    tipo_cli,
    NVL(total,0) AS total_vendas,
    NVL(total_st,0)   AS total_vendas_st,
    NVL(total_trib,0) AS total_vendas_trib,

    (CASE TO_CHAR(NVL(tipo_cli, 5))
      WHEN '1' THEN NVL(t.FATOR_ST_7,0)
      WHEN '4' THEN NVL(t.FATOR_ST_7,0)
      WHEN '5' THEN NVL(t.FATOR_ST_10,0)
      ELSE 0
    END) AS fator_st,

    (CASE TO_CHAR(NVL(tipo_cli, 5))
      WHEN '1' THEN NVL(t.FATOR_TRIB_7,0)
      WHEN '4' THEN NVL(t.FATOR_TRIB_7,0)
      WHEN '5' THEN NVL(t.FATOR_TRIB_10,0)
      ELSE 0
    END) AS fator_trib,

    (CASE TO_CHAR(NVL(tipo_cli, 5))
      WHEN '1' THEN
        CASE
          WHEN NVL(total_trib,0) > NVL(t.FATOR_TRIB_7,0)
            THEN ((NVL(total_trib,0) - NVL(t.FATOR_TRIB_7,0)) * 0.20) + (NVL(t.FATOR_TRIB_7,0) * 0.04)
          ELSE NVL(total_trib,0) * 0.04
        END
      WHEN '2' THEN NVL(total_trib,0) * 0.20
      WHEN '3' THEN NVL(total_trib,0) * 0.20
      WHEN '4' THEN
        CASE
          WHEN NVL(total_trib,0) > NVL(t.FATOR_TRIB_7,0)
            THEN ((NVL(total_trib,0) - NVL(t.FATOR_TRIB_7,0)) * 0.20) + (NVL(t.FATOR_TRIB_7,0) * 0.04)
          ELSE NVL(total_trib,0) * 0.04
        END
      WHEN '5' THEN
        CASE
          WHEN NVL(total_trib,0) > NVL(t.FATOR_TRIB_10,0)
            THEN ((NVL(total_trib,0) - NVL(t.FATOR_TRIB_10,0)) * 0.20) + (NVL(t.FATOR_TRIB_10,0) * 0.04)
          ELSE NVL(total_trib,0) * 0.04
        END
      WHEN '6' THEN NVL(total_trib,0) * 0.01
      WHEN '7' THEN NVL(total_trib,0) * 0.20
      ELSE 0
    END) AS imposto_trib,

    (CASE TO_CHAR(NVL(tipo_cli, 5))
      WHEN '1' THEN
        CASE
          WHEN NVL(total_st,0) > NVL(t.FATOR_ST_7,0)
            THEN (NVL(total_st,0) - NVL(t.FATOR_ST_7,0)) * 0.04
          ELSE 0
        END
      WHEN '2' THEN NVL(total_st,0) * 0.04
      WHEN '3' THEN NVL(total_st,0) * 0.04
      WHEN '4' THEN
        CASE
          WHEN NVL(total_st,0) > NVL(t.FATOR_ST_7,0)
            THEN (NVL(total_st,0) - NVL(t.FATOR_ST_7,0)) * 0.04
          ELSE 0
        END
      WHEN '5' THEN
        CASE
          WHEN NVL(total_st,0) > NVL(t.FATOR_ST_10,0)
            THEN (NVL(total_st,0) - NVL(t.FATOR_ST_10,0)) * 0.04
          ELSE 0
        END
      WHEN '6' THEN 0
      WHEN '7' THEN NVL(total_st,0) * 0.04
      ELSE 0
    END) AS imposto_st,

    NVL(st_ind_pb,0)   AS st_pb,
    NVL(trib_ind_pb,0) AS trib_pb,
    GREATEST(NVL(total_st,0)   - NVL(st_ind_pb,0),   0) AS restante_st,
    GREATEST(NVL(total_trib,0) - NVL(trib_ind_pb,0), 0) AS restante_trib
  FROM PARC
  CROSS JOIN T t
)
SELECT
  TO_CHAR(NVL(tipo_cli, 5)) AS TIPO_COD,
  CASE TO_CHAR(NVL(tipo_cli, 5))
    WHEN '1' THEN 'Construtora'
    WHEN '2' THEN 'Pessoa Física'
    WHEN '3' THEN 'Jurídica sem IE'
    WHEN '4' THEN 'Jurídica com IE'
    WHEN '5' THEN 'Atacadista / Indústria'
    WHEN '6' THEN 'Fora do estado com IE'
    WHEN '7' THEN 'Fora do estado (PF+PJ sem IE+Construtora)'
    ELSE 'ERROR'
  END AS TIPO_DESC,

  MAX(fator_st)   AS FATOR_ST,
  MAX(fator_trib) AS FATOR_TRIB,

  NVL(SUM(total_vendas),0)      AS TOT_VENDAS,
  NVL(SUM(total_vendas_st),0)   AS TOT_VENDAS_ST,
  NVL(SUM(total_vendas_trib),0) AS TOT_VENDAS_TRIB,

  NVL(SUM(imposto_st),0)   AS TOT_IMP_ST,
  NVL(SUM(imposto_trib),0) AS TOT_IMP_TRIB,
  NVL(SUM(imposto_st + imposto_trib),0) AS TOT_IMPOSTOS,

  NVL(SUM(st_pb),0)   AS TOT_ST_PB,
  NVL(SUM(trib_pb),0) AS TOT_TRIB_PB,

  NVL(SUM(restante_st),0)   AS TOT_REST_ST,
  NVL(SUM(restante_trib),0) AS TOT_REST_TRIB
FROM CALC_POR_PARC
GROUP BY
  TO_CHAR(NVL(tipo_cli, 5)),
  CASE TO_CHAR(NVL(tipo_cli, 5))
    WHEN '1' THEN 'Construtora'
    WHEN '2' THEN 'Pessoa Física'
    WHEN '3' THEN 'Jurídica sem IE'
    WHEN '4' THEN 'Jurídica com IE'
    WHEN '5' THEN 'Atacadista / Indústria'
    WHEN '6' THEN 'Fora do estado com IE'
    WHEN '7' THEN 'Fora do estado (PF+PJ sem IE+Construtora)'
    ELSE 'ERROR'
  END
ORDER BY TO_NUMBER(TO_CHAR(NVL(tipo_cli, 5)))
`;
        sql = this.replaceDtRef(sql, oracleDate);
      }

      if (visao === 'parceiro') {
        sql = `
WITH 
BASE_FATURAMENTO AS (
  SELECT
    (CASE WHEN c.codtipoper IN (801,800) THEN -1 ELSE 1 END) * NVL(i.vlrtot,0) AS vlr_assinado,
    CASE
      WHEN NVL(i.basesubstit,0) > 0
        OR NVL(i.vlrsubst,0) > 0
        OR SUBSTR(LPAD(TO_CHAR(NVL(i.codtrib,0)),3,'0'),-2) IN ('10','30','60','70')
      THEN (CASE WHEN c.codtipoper IN (801,800) THEN -1 ELSE 1 END) * NVL(i.vlrtot,0)
      ELSE 0
    END AS vlr_st,
    CASE
      WHEN NOT (
        NVL(i.basesubstit,0) > 0
        OR NVL(i.vlrsubst,0) > 0
        OR SUBSTR(LPAD(TO_CHAR(NVL(i.codtrib,0)),3,'0'),-2) IN ('10','30','60','70')
      )
      THEN (CASE WHEN c.codtipoper IN (801,800) THEN -1 ELSE 1 END) * NVL(i.vlrtot,0)
      ELSE 0
    END AS vlr_trib
  FROM tgfcab c
  JOIN tgfite i ON i.nunota = c.nunota
  WHERE c.codtipoper IN (700, 701, 326, 299, 382, 801, 800)
    AND c.STATUSNFE = 'A'
    AND NVL(c.numnota,0) <> 0
    AND c.CODEMP = 1
    AND TRUNC(c.dtneg) BETWEEN ADD_MONTHS(TRUNC(:P_DTREF,'MM'), -1)
                          AND LAST_DAY(ADD_MONTHS(TRUNC(:P_DTREF,'MM'), -1))
),
TOTALIZADORES AS (
  SELECT
    NVL(SUM(vlr_assinado),0)        AS FATUR_TOTAL,
    NVL(SUM(vlr_assinado),0) * 0.07 AS FATOR_7,
    NVL(SUM(vlr_st),0)   * 0.10     AS FATOR_ST_10,
    NVL(SUM(vlr_st),0)   * 0.07     AS FATOR_ST_7,
    NVL(SUM(vlr_trib),0) * 0.10     AS FATOR_TRIB_10,
    NVL(SUM(vlr_trib),0) * 0.07     AS FATOR_TRIB_7
  FROM BASE_FATURAMENTO
),
ITENS AS (
  SELECT
    c.codparc,
    i.codprod,
    CASE
      WHEN NVL(i.basesubstit,0) > 0
        OR NVL(i.vlrsubst,0) > 0
        OR SUBSTR(LPAD(TO_CHAR(NVL(i.codtrib,0)),3,'0'),-2) IN ('10','30','60','70')
      THEN 'ST'
      ELSE 'TRIB'
    END AS tip_trib,
    c.nunota,
    c.codtipoper,
    (CASE WHEN c.codtipoper IN (800,801) THEN -1 ELSE 1 END) * NVL(i.vlrtot,0) AS vlr_liq
  FROM tgfcab c
  JOIN tgfite i ON i.nunota = c.nunota
  WHERE c.codtipoper IN (700, 701, 326, 299, 382, 801, 800)
    AND c.statusnfe = 'A'
    AND NVL(c.numnota,0) <> 0
    AND c.codemp = 1
    AND TRUNC(c.dtneg) BETWEEN TRUNC(:P_DTREF,'MM')
                          AND LAST_DAY(TRUNC(:P_DTREF,'MM'))
),
ULTIMA_ENTRADA_PROD AS (
  SELECT
    x.codprod,
    x.ad_indpb
  FROM (
    SELECT
      ite_ent.codprod,
      par_ent.ad_indpb AS ad_indpb,
      ROW_NUMBER() OVER (
        PARTITION BY ite_ent.codprod
        ORDER BY cab_ent.dtneg DESC, cab_ent.nunota DESC
      ) AS rn
    FROM tgfcab cab_ent
    JOIN tgfite ite_ent ON ite_ent.nunota = cab_ent.nunota
    LEFT JOIN tgfpar par_ent ON par_ent.codparc = cab_ent.codparc
    WHERE NVL(cab_ent.numnota,0) <> 0
      AND cab_ent.statusnota = 'L'
      AND cab_ent.codtipoper IN (300,344)
  ) x
  WHERE x.rn = 1
),
MOV AS (
  SELECT
    it.codparc,
    it.tip_trib,
    COUNT(DISTINCT it.nunota) AS qtd_notas,
    SUM(CASE WHEN it.codtipoper IN (800,801) THEN 0 ELSE NVL(it.vlr_liq,0) END) AS vlr_vendas,
    SUM(CASE WHEN it.codtipoper IN (800,801) THEN ABS(NVL(it.vlr_liq,0)) ELSE 0 END) AS vlr_devolucao,
    SUM(it.vlr_liq) AS total_liq,
    SUM(CASE WHEN NVL(ue.ad_indpb,'N') = 'S' THEN it.vlr_liq ELSE 0 END) AS total_liq_indpb
  FROM ITENS it
  LEFT JOIN ULTIMA_ENTRADA_PROD ue ON ue.codprod = it.codprod
  GROUP BY it.codparc, it.tip_trib
),
PIV AS (
  SELECT
    codparc,
    SUM(qtd_notas) AS qtd_notas,
    SUM(vlr_vendas)    AS VLR_VENDAS,
    SUM(vlr_devolucao) AS VLR_DEVOLUCAO,
    SUM(total_liq) AS total,
    SUM(CASE WHEN tip_trib='ST'   THEN total_liq ELSE 0 END) AS total_st,
    SUM(CASE WHEN tip_trib='TRIB' THEN total_liq ELSE 0 END) AS total_trib,
    SUM(CASE WHEN tip_trib='ST'   THEN total_liq_indpb ELSE 0 END) AS st_ind_pb,
    SUM(CASE WHEN tip_trib='TRIB' THEN total_liq_indpb ELSE 0 END) AS trib_ind_pb
  FROM MOV
  GROUP BY codparc
)
SELECT
  pv.codparc,
  p.razaosocial AS nomeparc,
  CASE TO_CHAR(NVL(p.ad_tipoclientefaturar, 5))
    WHEN '1' THEN 'Construtora'
    WHEN '2' THEN 'Pessoa Física'
    WHEN '3' THEN 'Jurídica sem IE'
    WHEN '4' THEN 'Jurídica com IE'
    WHEN '5' THEN 'Atacadista / Indústria'
    WHEN '6' THEN 'Fora do estado com IE'
    WHEN '7' THEN 'Fora do estado (PF+PJ sem IE+Construtora)'
    ELSE 'ERROR'
  END AS AD_TIPOCLIENTEFATURAR,
  pv.VLR_VENDAS,
  pv.VLR_DEVOLUCAO,
  (
    /* IMPOSTOTRIB + IMPOSTOST = IMPOSTOS (mesma lógica do gadget) */
    (CASE TO_CHAR(NVL(p.ad_tipoclientefaturar, 5))
      WHEN '1' THEN
        CASE
          WHEN NVL(pv.total_trib,0) > NVL(t.FATOR_TRIB_7,0)
            THEN ((NVL(pv.total_trib,0) - NVL(t.FATOR_TRIB_7,0)) * 0.20) + (NVL(t.FATOR_TRIB_7,0) * 0.04)
          ELSE NVL(pv.total_trib,0) * 0.04
        END
      WHEN '2' THEN NVL(pv.total_trib,0) * 0.20
      WHEN '3' THEN NVL(pv.total_trib,0) * 0.20
      WHEN '4' THEN
        CASE
          WHEN NVL(pv.total_trib,0) > NVL(t.FATOR_TRIB_7,0)
            THEN ((NVL(pv.total_trib,0) - NVL(t.FATOR_TRIB_7,0)) * 0.20) + (NVL(t.FATOR_TRIB_7,0) * 0.04)
          ELSE NVL(pv.total_trib,0) * 0.04
        END
      WHEN '5' THEN
        CASE
          WHEN NVL(pv.total_trib,0) > NVL(t.FATOR_TRIB_10,0)
            THEN ((NVL(pv.total_trib,0) - NVL(t.FATOR_TRIB_10,0)) * 0.20) + (NVL(t.FATOR_TRIB_10,0) * 0.04)
          ELSE NVL(pv.total_trib,0) * 0.04
        END
      WHEN '6' THEN NVL(pv.total_trib,0) * 0.01
      WHEN '7' THEN NVL(pv.total_trib,0) * 0.20
      ELSE 0
    END)
    +
    (CASE TO_CHAR(NVL(p.ad_tipoclientefaturar, 5))
      WHEN '1' THEN
        CASE
          WHEN NVL(pv.total_st,0) > NVL(t.FATOR_ST_7,0)
            THEN (NVL(pv.total_st,0) - NVL(t.FATOR_ST_7,0)) * 0.04
          ELSE 0
        END
      WHEN '2' THEN NVL(pv.total_st,0) * 0.04
      WHEN '3' THEN NVL(pv.total_st,0) * 0.04
      WHEN '4' THEN
        CASE
          WHEN NVL(pv.total_st,0) > NVL(t.FATOR_ST_7,0)
            THEN (NVL(pv.total_st,0) - NVL(t.FATOR_ST_7,0)) * 0.04
          ELSE 0
        END
      WHEN '5' THEN
        CASE
          WHEN NVL(pv.total_st,0) > NVL(t.FATOR_ST_10,0)
            THEN (NVL(pv.total_st,0) - NVL(t.FATOR_ST_10,0)) * 0.04
          ELSE 0
        END
      WHEN '6' THEN 0
      WHEN '7' THEN NVL(pv.total_st,0) * 0.04
      ELSE 0
    END)
  ) AS IMPOSTOS
FROM PIV pv
JOIN tgfpar p ON p.codparc = pv.codparc
CROSS JOIN TOTALIZADORES t
ORDER BY pv.total DESC
`;
        sql = this.replaceDtRef(sql, oracleDate);
      }

      if (visao === 'detalhe') {
        if (!codParc) {
          throw new HttpException('codParc é obrigatório para detalhe.', HttpStatus.BAD_REQUEST);
        }

        sql = `
SELECT
  cab.numnota AS NUMNOTA,
  TRUNC(cab.dtneg) AS DTNEG,
  cab.codtipoper AS CODTIPOPER,
  cab.codparc AS CODPARC,
  par.razaosocial AS NOMEPARC,
  CASE TO_CHAR(NVL(par.ad_tipoclientefaturar, 5))
    WHEN '1' THEN 'Construtora'
    WHEN '2' THEN 'Pessoa Física'
    WHEN '3' THEN 'Jurídica sem IE'
    WHEN '4' THEN 'Jurídica com IE'
    WHEN '5' THEN 'Atacadista / Indústria'
    WHEN '6' THEN 'Fora do estado com IE'
    WHEN '7' THEN 'Fora do estado (PF+PJ sem IE+Construtora)'
    ELSE 'ERROR'
  END AS AD_TIPOCLIENTEFATURAR,
  CASE TO_CHAR(NVL(par.ad_tipoclientefaturar, 5))
    WHEN '2' THEN 0.07
    ELSE 0.10
  END AS IMPOSTOS,
  CASE
    WHEN cab.codtipoper IN (800,801) THEN -NVL(cab.vlrnota,0)
    ELSE NVL(cab.vlrnota,0)
  END AS VLRNOTA_AJUSTADO,
  cab.codemp AS CODEMP
FROM tgfcab cab
JOIN tgfpar par ON par.codparc = cab.codparc
WHERE cab.codparc = :P_CODPARC
  AND cab.codtipoper IN (700, 701, 326, 299, 382, 801, 800)
  AND cab.STATUSNFE = 'A'
  AND NVL(cab.numnota,0) <> 0
  AND cab.codemp = 1
  AND TRUNC(cab.dtneg) BETWEEN TRUNC(:P_DTREF,'MM')
                          AND LAST_DAY(TRUNC(:P_DTREF,'MM'))
ORDER BY cab.dtneg DESC, cab.nunota DESC
`;
        sql = this.replaceDtRef(sql, oracleDate);
        sql = this.replaceCodParc(sql, codParc);
      }
      if (visao === 'entrada') {
        sql = `
WITH ITENS AS (
  SELECT
    c.codtipoper,
    c.nunota,
    (CASE WHEN c.codtipoper IN (400) THEN -1 ELSE 1 END) * NVL(i.vlrtot,0) AS vlr_assinado,
    CASE
      WHEN NVL(i.basesubstit,0) > 0
        OR NVL(i.vlrsubst,0) > 0
        OR SUBSTR(LPAD(TO_CHAR(NVL(i.codtrib,0)),3,'0'),-2) IN ('10','30','60','70')
      THEN 'ST'
      ELSE 'TRIB'
    END AS tip_trib,
    NVL(p.ad_clientepb,'N') AS ad_clientepb
  FROM tgfcab c
  JOIN tgfite i ON i.nunota = c.nunota
  JOIN tgfpar p ON p.codparc = c.codparc
  WHERE c.codtipoper IN (344,300,301,302,2001,407,400)
    AND (
          c.codtipoper IN (344,300,301,302)
          OR c.statusnfe = 'A'
        )
    AND NVL(c.numnota,0) <> 0
    AND c.codemp = 1
    AND TRUNC(c.dtneg) BETWEEN ADD_MONTHS(TRUNC(:P_DTREF,'MM'), -1)
                          AND LAST_DAY(ADD_MONTHS(TRUNC(:P_DTREF,'MM'), -1))
),
GRUPO AS (
  SELECT
    CASE
      WHEN codtipoper IN (344,300,301,302) THEN '344,300,301,302'
      WHEN codtipoper IN (2001,407) THEN '2001,407'
      WHEN codtipoper IN (400) THEN '400'
    END AS TOPS,
    CASE
      WHEN codtipoper IN (344,300,301,302) AND ad_clientepb = 'S'
        THEN 'compra - dentro do estado'
      WHEN codtipoper IN (344,300,301,302) AND ad_clientepb <> 'S'
        THEN 'compra - fora do estado'
      WHEN codtipoper IN (2001,407)
        THEN 'Entrada não especificada e reclassificacao'
      WHEN codtipoper IN (400)
        THEN 'Devolucao de compra'
    END AS DESCRICAO,
    nunota,
    tip_trib,
    vlr_assinado
  FROM ITENS
),
AGG AS (
  SELECT
    TOPS,
    DESCRICAO,
    COUNT(DISTINCT nunota) AS QTD_NOTAS,
    SUM(CASE WHEN tip_trib='ST' THEN vlr_assinado ELSE 0 END) AS VLR_TOTAL_ST,
    SUM(CASE WHEN tip_trib='TRIB' THEN vlr_assinado ELSE 0 END) AS VLR_TOTAL_TB,
    SUM(vlr_assinado) AS VLR_TOTAL
  FROM GRUPO
  GROUP BY TOPS, DESCRICAO
)
SELECT *
FROM AGG
ORDER BY
  CASE
    WHEN DESCRICAO='compra - dentro do estado' THEN 1
    WHEN DESCRICAO='compra - fora do estado' THEN 2
    WHEN TOPS='2001,407' THEN 3
    WHEN TOPS='400' THEN 4
  END
`;
        sql = this.replaceDtRef(sql, oracleDate);
      }


      const result = await this.executeQuery(token, sql);
      const rows = result?.responseBody?.rows || result?.responseBody?.result || [];
      return rows;
    } catch (error) {
      this.logger.error(`Erro no dashboard (${visao})`, error);
      throw new HttpException('Falha ao processar relatório no Sankhya', HttpStatus.BAD_GATEWAY);
    } finally {
      await this.sankhyaService.logout(token, 'DashboardService');
    }
  }

  async executeQuery(authToken: string, sql: string) {
    const url =
      'https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=DbExplorerSP.executeQuery&outputType=json';

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
      Accept: 'application/json',
    };

    const body = {
      serviceName: 'DbExplorerSP.executeQuery',
      requestBody: { sql },
    };

    const resp = await firstValueFrom(
      this.http.post(url, body, {
        headers,
        timeout: 60_000,
        maxBodyLength: Infinity as any,
        maxContentLength: Infinity as any,
      } as any),
    );

    return resp?.data;
  }


  // dash.service.ts (ou onde já está seu relatorioSaidaIncentivoGerencia)

}





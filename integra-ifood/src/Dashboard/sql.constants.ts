const SQL_RESUMO_POR_TOP = `
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
    -- ATENÇÃO: Driver Node usa bind variables (:P_DTREF)
    AND TRUNC(c.dtneg) BETWEEN ADD_MONTHS(TRUNC(:P_DTREF,'MM'), -1)
                          AND LAST_DAY(ADD_MONTHS(TRUNC(:P_DTREF,'MM'), -1))
),
GRUPO AS (
    -- ... (Restante da query do XML para grd_fatur_mes_passado_por_top) ...
    SELECT * FROM ITENS -- Apenas placeholder para o exemplo, use o SQL completo do XML
)
SELECT * FROM GRUPO
`;

const SQL_TOTAIS_POR_TIPO = `... SQL do grid grd_totais_por_tipo ...`;
const SQL_RESUMO_POR_PARC = `... SQL do grid grd_resumo_por_parc ...`;
const SQL_DETALHE_NOTAS = `... SQL do grid grd_detalhe_notas ...`;
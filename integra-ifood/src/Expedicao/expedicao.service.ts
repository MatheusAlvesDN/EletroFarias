import { HttpService } from "@nestjs/axios";
import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { firstValueFrom } from "rxjs";
import { FilaCabosRow, NotaDfariasRow, NotaExpedicaoRow, NotaSeparacaoRow, NotaTVRow, PedidoExpedicao, ItemLoc2Row} from "src/types/expedicao.types";



const API_URL = 'http://localhost:3000/sync/pedidosLid';

export const getPedidosExpedicao = async (): Promise<PedidoExpedicao[]> => {
  const response = await fetch(API_URL);
  if (!response.ok) {
    throw new Error('Falha ao buscar dados do painel.');
  }
  return response.json();
};


@Injectable()
export class ExpedicaoService {


  constructor(private readonly http: HttpService) { }


  async listarNotasTV(authToken: string): Promise<NotaTVRow[]> {
    const url =
      'https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=DbExplorerSP.executeQuery&outputType=json';

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    };

    const sql = `
  WITH BASE AS (
  SELECT
    CAB.NUNOTA,
    CAB.NUMNOTA,
    CAB.CODTIPOPER,
    TOP.DESCROPER,
    CAB.CODPARC,
    PAR.RAZAOSOCIAL AS PARCEIRO,
    CAB.VLRNOTA,

    TRUNC(CAB.DTALTER) AS DTALTER,
    TO_CHAR(CAB.DTALTER, 'HH24:MI:SS') AS HRALTER,

    CAB.CODVEND,
    VEN.APELIDO AS VENDEDOR,

    CAB.AD_TIPODEENTREGA AS AD_TIPODEENTREGA,
    CASE CAB.AD_TIPODEENTREGA
      WHEN 'EI' THEN 'Em Loja'
      WHEN 'RL' THEN 'Vem Pegar'
      WHEN 'EC' THEN 'Entregar'
      ELSE 'Não informado'
    END AS TIPO_ENTREGA,

    CAB.STATUSNOTA AS STATUS_NOTA,
    CASE CAB.STATUSNOTA
      WHEN 'A' THEN 'Atendimento'
      WHEN 'L' THEN 'Liberada'
      WHEN 'P' THEN 'Pendente'
      ELSE 'N/I'
    END AS STATUS_NOTA_DESC,

    MAX(CON.STATUS) AS STATUS_CONFERENCIA_COD,

    CASE
      WHEN MAX(CON.STATUS) IS NULL AND CAB.AD_EMSEPARACAO = 'S' THEN 'Em Separação'
      ELSE MAX(
        CASE CON.STATUS
          WHEN 'A'  THEN 'Em andamento'
          WHEN 'AC' THEN 'Aguardando conferência'
          WHEN 'AL' THEN 'Aguardando liberação p/ conferência'
          WHEN 'C'  THEN 'Aguardando liberação de corte'
          WHEN 'D'  THEN 'Finalizada divergente'
          WHEN 'Z'  THEN 'Aguardando finalização'
          WHEN 'R'  THEN 'Aguardando recontagem'
          WHEN 'RA' THEN 'Recontagem em andamento'
          WHEN 'RD' THEN 'Recontagem finalizada divergente'
          WHEN 'RF' THEN 'Recontagem finalizada OK'
          WHEN 'F'  THEN 'Finalizada OK'
          ELSE ''
        END
      )
    END AS STATUS_CONFERENCIA_DESC,

    COUNT(CON.STATUS) AS QTD_REG_CONFERENCIA

  FROM TGFCAB CAB
  INNER JOIN TGFTOP TOP
    ON TOP.CODTIPOPER = CAB.CODTIPOPER
   AND TOP.DHALTER   = CAB.DHTIPOPER
  LEFT JOIN TGFPAR PAR
    ON PAR.CODPARC = CAB.CODPARC
  INNER JOIN TGFVEN VEN
    ON VEN.CODVEND = CAB.CODVEND
   AND (CAB.CODTIPOPER = 322 OR VEN.AD_TIPOTECNICO = 5)
  LEFT JOIN TGFCON2 CON
    ON CON.NUNOTAORIG = CAB.NUNOTA

  WHERE (
          ((CAB.CODTIPOPER = 601 OR CAB.CODTIPOPER = 325)
            AND CAB.CODTIPVENDA NOT IN (131, 221, 238, 239, 193, 235, 222, 241, 192, 176, 157, 162, 163, 156, 177, 159, 236, 237, 178, 161, 158, 160, 264)
            AND (CAB.AD_LIBERABOLETO = 'S' OR CAB.AD_LIBERACAIXA = 'S')
          )
          OR ((CAB.CODTIPOPER = 601 OR CAB.CODTIPOPER = 325)
            AND CAB.CODTIPVENDA IN (131, 221, 238, 239, 193, 235, 222, 241, 192, 176, 157, 162, 163, 156, 177, 159, 236, 237, 178, 161, 158, 160, 264)
          )
          OR CAB.CODTIPOPER = 322
        )
    AND CAB.CODEMP = 1
    AND CAB.STATUSNOTA IN ('L')
    AND CAB.PENDENTE = 'S'
    AND NOT EXISTS (SELECT 1 FROM TGFVAR VAR WHERE VAR.NUNOTAORIG = CAB.NUNOTA)
    AND NOT EXISTS (
      SELECT 1
      FROM TGFCON2 C2
      WHERE C2.NUNOTAORIG = CAB.NUNOTA
        AND C2.STATUS = 'F'
    )

  GROUP BY
    CAB.NUNOTA,
    CAB.NUMNOTA,
    CAB.CODTIPOPER,
    TOP.DESCROPER,
    CAB.CODPARC,
    PAR.RAZAOSOCIAL,
    CAB.VLRNOTA,
    CAB.DTALTER,
    CAB.CODVEND,
    VEN.APELIDO,
    CAB.AD_TIPODEENTREGA,
    CAB.STATUSNOTA,
    CAB.AD_EMSEPARACAO
),
FINAL AS (
  SELECT
    /* cores */
    CASE
      WHEN CODTIPOPER = 322 THEN '#1565C0'
      WHEN AD_TIPODEENTREGA = 'EI' THEN '#2E7D32'
      WHEN AD_TIPODEENTREGA = 'RL' THEN '#F9A825'
      WHEN AD_TIPODEENTREGA = 'EC' THEN '#C62828'
      ELSE '#9E9E9E'
    END AS BKCOLOR,

    CASE
      WHEN CODTIPOPER = 322 THEN '#FFFFFF'
      WHEN AD_TIPODEENTREGA = 'RL' THEN '#000000'
      ELSE '#FFFFFF'
    END AS FGCOLOR,

    ROW_NUMBER() OVER (
      ORDER BY
        CASE
          WHEN AD_TIPODEENTREGA = 'EI' THEN 1
          WHEN CODTIPOPER = 322 THEN 2
          WHEN AD_TIPODEENTREGA = 'RL' THEN 3
          WHEN AD_TIPODEENTREGA = 'EC' THEN 4
          ELSE 9
        END,
        DTALTER DESC,
        NUNOTA DESC
    ) AS ORDEM_LINHA,

    NUNOTA,
    NUMNOTA,
    CODTIPOPER,
    DESCROPER,
    CODPARC,
    PARCEIRO,
    VLRNOTA,

    DTALTER AS DTNEG,
    HRALTER AS HRNEG,

    CODVEND,
    VENDEDOR,

    AD_TIPODEENTREGA,
    TIPO_ENTREGA,

    STATUS_NOTA,
    STATUS_NOTA_DESC,

    STATUS_CONFERENCIA_COD,
    STATUS_CONFERENCIA_DESC,

    QTD_REG_CONFERENCIA,

    /* para ordenar no SELECT final */
    DTALTER
  FROM BASE
)
SELECT
  NUNOTA,
  ORDEM_LINHA,
  BKCOLOR,
  FGCOLOR,

  DTNEG,
  HRNEG,

  NUMNOTA,
  CODPARC,
  PARCEIRO,

  CODVEND,
  VENDEDOR,

  CODTIPOPER,

  AD_TIPODEENTREGA,
  TIPO_ENTREGA,

  STATUS_NOTA,
  STATUS_NOTA_DESC,

  STATUS_CONFERENCIA_COD,
  STATUS_CONFERENCIA_DESC,

  QTD_REG_CONFERENCIA,

  VLRNOTA
FROM FINAL
ORDER BY
  CASE
    WHEN AD_TIPODEENTREGA = 'EI' THEN 1
    WHEN CODTIPOPER = 322 THEN 2
    WHEN AD_TIPODEENTREGA = 'RL' THEN 3
    WHEN AD_TIPODEENTREGA = 'EC' THEN 4
    ELSE 9
  END,
  DTALTER DESC,
  NUNOTA DESC
`.trim();

    const body = {
      serviceName: 'DbExplorerSP.executeQuery',
      requestBody: { sql },
    };

    const resp = await firstValueFrom(this.http.post(url, body, { headers }));
    const data = resp?.data;

    if (data?.status === '0') {
      const cod = data?.tsError?.tsErrorCode ? ` (${data.tsError.tsErrorCode})` : '';
      const msg = data?.statusMessage || 'Erro desconhecido retornado pelo Sankhya.';
      throw new HttpException(`ERRO NA CONSULTA${cod}: ${msg}`, HttpStatus.BAD_REQUEST);
    }

    const rows: any[] =
      data?.responseBody?.rows ??
      data?.responseBody?.result ??
      data?.rows ??
      [];

    // ordem do SELECT final (mesma ordem do SELECT)
    // 0 NUNOTA
    // 1 ORDEM_LINHA
    // 2 BKCOLOR
    // 3 FGCOLOR
    // 4 DTNEG
    // 5 HRNEG
    // 6 NUMNOTA
    // 7 CODPARC
    // 8 PARCEIRO
    // 9 CODVEND
    // 10 VENDEDOR
    // 11 CODTIPOPER
    // 12 AD_TIPODEENTREGA
    // 13 TIPO_ENTREGA
    // 14 STATUS_NOTA
    // 15 STATUS_NOTA_DESC
    // 16 STATUS_CONFERENCIA_COD
    // 17 STATUS_CONFERENCIA_DESC
    // 18 QTD_REG_CONFERENCIA
    // 19 VLRNOTA

    const safeNum = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : 0);
    const safeStr = (v: any) => (v == null ? '' : String(v));

    return (rows ?? []).map((r: any[]): NotaTVRow => ({
      nunota: safeNum(r?.[0]),
      ordemLinha: safeNum(r?.[1]),

      bkcolor: safeStr(r?.[2]) || '#FFFFFF',
      fgcolor: safeStr(r?.[3]) || '#000000',

      dtneg: safeStr(r?.[4]),
      hrneg: r?.[5] != null ? safeStr(r?.[5]) : null,

      numnota: safeNum(r?.[6]),
      codparc: safeNum(r?.[7]),
      parceiro: safeStr(r?.[8]),

      codvend: safeNum(r?.[9]),
      vendedor: safeStr(r?.[10]),

      codtipoper: safeNum(r?.[11]),

      adTipoDeEntrega: r?.[12] != null ? safeStr(r?.[12]) : null,
      tipoEntrega: safeStr(r?.[13]),

      statusNota: safeStr(r?.[14]),
      statusNotaDesc: safeStr(r?.[15]),

      statusConferenciaCod: r?.[16] != null ? safeStr(r?.[16]) : null,
      statusConferenciaDesc: r?.[17] != null ? safeStr(r?.[17]) : null,

      qtdRegConferencia: safeNum(r?.[18]),
      vlrnota: safeNum(r?.[19]),
    }));
  }

  async listarNotasSeparacao(authToken: string): Promise<NotaSeparacaoRow[]> {
    const url =
      'https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=DbExplorerSP.executeQuery&outputType=json';

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    };

    const sql = `
WITH BASE AS (
  SELECT
    CAB.NUNOTA,
    CAB.NUMNOTA,
    CAB.CODTIPOPER,
    TOP.DESCROPER,
    CAB.CODPARC,
    PAR.RAZAOSOCIAL AS PARCEIRO,
    CAB.VLRNOTA,

    TRUNC(CAB.DTALTER) AS DTALTER,
    TO_CHAR(CAB.DTALTER, 'HH24:MI:SS') AS HRALTER,

    CAB.CODVEND,
    VEN.APELIDO AS VENDEDOR,

    CAB.CODPROJ,
    PRJ.IDENTIFICACAO,

    CAB.CODTIPVENDA,
    TPV.DESCRTIPVENDA AS TIPONEGOCIACAO,

    CAB.AD_TIPODEENTREGA AS AD_TIPODEENTREGA,
    CASE CAB.AD_TIPODEENTREGA
      WHEN 'EI' THEN 'Em Loja'
      WHEN 'RL' THEN 'Vem Pegar'
      WHEN 'EC' THEN 'Entregar'
      ELSE 'Não informado'
    END AS TIPO_ENTREGA,

    CAB.STATUSNOTA AS STATUS_NOTA,
    CASE CAB.STATUSNOTA
      WHEN 'A' THEN 'Atendimento'
      WHEN 'L' THEN 'Liberada'
      WHEN 'P' THEN 'Pendente'
      ELSE 'N/I'
    END AS STATUS_NOTA_DESC,

    CAB.LIBCONF AS LIBCONF,
    CAB.AD_EMSEPARACAO AS AD_SEPARACAO,

    MAX(CON.STATUS) AS STATUS_CONFERENCIA_COD,

    CASE
      WHEN MAX(CON.STATUS) IS NULL AND CAB.AD_EMSEPARACAO = 'S' THEN 'Em Separação'
      ELSE MAX(
        CASE CON.STATUS
          WHEN 'A'  THEN 'Em andamento'
          WHEN 'AC' THEN 'Aguardando conferência'
          WHEN 'AL' THEN 'Aguardando liberação p/ conferência'
          WHEN 'C'  THEN 'Aguardando liberação de corte'
          WHEN 'D'  THEN 'Finalizada divergente'
          WHEN 'Z'  THEN 'Aguardando finalização'
          WHEN 'R'  THEN 'Aguardando recontagem'
          WHEN 'RA' THEN 'Recontagem em andamento'
          WHEN 'RD' THEN 'Recontagem finalizada divergente'
          WHEN 'RF' THEN 'Recontagem finalizada OK'
          WHEN 'F'  THEN 'Finalizada OK'
          ELSE ''
        END
      )
    END AS STATUS_CONFERENCIA_DESC,

    COUNT(CON.STATUS) AS QTD_REG_CONFERENCIA

  FROM TGFCAB CAB
  INNER JOIN TGFTOP TOP
    ON TOP.CODTIPOPER = CAB.CODTIPOPER
   AND TOP.DHALTER   = CAB.DHTIPOPER

  LEFT JOIN TGFPAR PAR
    ON PAR.CODPARC = CAB.CODPARC

  INNER JOIN TGFVEN VEN
    ON VEN.CODVEND = CAB.CODVEND
   AND (CAB.CODTIPOPER = 322 OR VEN.AD_TIPOTECNICO = 5)

  LEFT JOIN TGFTPV TPV
    ON TPV.CODTIPVENDA = CAB.CODTIPVENDA
   AND TPV.DHALTER     = CAB.DHTIPVENDA

  LEFT JOIN TCSPRJ PRJ
    ON PRJ.CODPROJ = CAB.CODPROJ

  LEFT JOIN TGFCON2 CON
    ON CON.NUNOTAORIG = CAB.NUNOTA

  WHERE (
          ((CAB.CODTIPOPER = 601 OR CAB.CODTIPOPER = 325)
            AND CAB.CODTIPVENDA NOT IN (131, 221, 238, 239, 193, 235, 222, 241, 192, 176, 157, 162, 163, 156, 177, 159, 236, 237, 178, 161, 158, 160, 264)
            AND (CAB.AD_LIBERABOLETO = 'S' OR CAB.AD_LIBERACAIXA = 'S')
          )
          OR ((CAB.CODTIPOPER = 601 OR CAB.CODTIPOPER = 325)
            AND CAB.CODTIPVENDA IN (131, 221, 238, 239, 193, 235, 222, 241, 192, 176, 157, 162, 163, 156, 177, 159, 236, 237, 178, 161, 158, 160, 264)
          )
          OR CAB.CODTIPOPER = 322
        )
    AND CAB.CODEMP = 1
    AND CAB.STATUSNOTA IN ('L')
    AND CAB.PENDENTE = 'S'
    AND NOT EXISTS (
      SELECT 1
      FROM TGFVAR VAR
      WHERE VAR.NUNOTAORIG = CAB.NUNOTA
    )
    AND NOT EXISTS (
      SELECT 1
      FROM TGFCON2 C2
      WHERE C2.NUNOTAORIG = CAB.NUNOTA
        AND C2.STATUS = 'F'
    )

  GROUP BY
    CAB.NUNOTA,
    CAB.NUMNOTA,
    CAB.CODTIPOPER,
    TOP.DESCROPER,
    CAB.CODPARC,
    PAR.RAZAOSOCIAL,
    CAB.VLRNOTA,
    CAB.DTALTER,
    CAB.CODVEND,
    VEN.APELIDO,
    CAB.CODPROJ,
    PRJ.IDENTIFICACAO,
    CAB.CODTIPVENDA,
    TPV.DESCRTIPVENDA,
    CAB.AD_TIPODEENTREGA,
    CAB.STATUSNOTA,
    CAB.LIBCONF,
    CAB.AD_EMSEPARACAO
),
FINAL AS (
  SELECT
    CASE
      WHEN CODTIPOPER = 322 THEN '#1565C0'
      WHEN AD_TIPODEENTREGA = 'EI' THEN '#2E7D32'
      WHEN AD_TIPODEENTREGA = 'RL' THEN '#F9A825'
      WHEN AD_TIPODEENTREGA = 'EC' THEN '#C62828'
      ELSE '#9E9E9E'
    END AS BKCOLOR,

    CASE
      WHEN CODTIPOPER = 322 THEN '#FFFFFF'
      WHEN AD_TIPODEENTREGA = 'RL' THEN '#000000'
      ELSE '#FFFFFF'
    END AS FGCOLOR,

    ROW_NUMBER() OVER (
      ORDER BY
        CASE
          WHEN AD_TIPODEENTREGA = 'EI' THEN 1
          WHEN CODTIPOPER = 322 THEN 2
          WHEN AD_TIPODEENTREGA = 'RL' THEN 3
          WHEN AD_TIPODEENTREGA = 'EC' THEN 4
          ELSE 9
        END,
        DTALTER DESC,
        NUNOTA DESC
    ) AS ORDEM_LINHA,

    CODTIPOPER,

    NUNOTA,
    DTALTER AS DTNEG,
    HRALTER AS HRNEG,

    STATUS_NOTA,
    STATUS_NOTA_DESC,

    STATUS_CONFERENCIA_COD,
    STATUS_CONFERENCIA_DESC,
    QTD_REG_CONFERENCIA,

    VLRNOTA,
    AD_TIPODEENTREGA,
    CODVEND,
    VENDEDOR,

    PARCEIRO,

    DTALTER
  FROM BASE
)
SELECT
  NUNOTA,
  ORDEM_LINHA,
  DTNEG,
  HRNEG,
  STATUS_NOTA,
  STATUS_NOTA_DESC,
  STATUS_CONFERENCIA_COD,
  STATUS_CONFERENCIA_DESC,
  QTD_REG_CONFERENCIA,
  BKCOLOR,
  FGCOLOR,
  VLRNOTA,
  AD_TIPODEENTREGA,
  CODVEND,
  VENDEDOR,
  CODTIPOPER,
  PARCEIRO
FROM FINAL
ORDER BY
  CASE
    WHEN AD_TIPODEENTREGA = 'EI' THEN 1
    WHEN CODTIPOPER = 322 THEN 2
    WHEN AD_TIPODEENTREGA = 'RL' THEN 3
    WHEN AD_TIPODEENTREGA = 'EC' THEN 4
    ELSE 9
  END,
  DTALTER DESC,
  NUNOTA DESC
  `.trim();

    const body = {
      serviceName: 'DbExplorerSP.executeQuery',
      requestBody: { sql },
    };

    try {
      const resp = await firstValueFrom(this.http.post(url, body, { headers }));
      const data = resp?.data;

      if (data?.status === '0') {
        const cod = data?.tsError?.tsErrorCode ? ` (${data.tsError.tsErrorCode})` : '';
        const msg = data?.statusMessage || 'Erro desconhecido retornado pelo Sankhya.';
        throw new HttpException(`ERRO NA CONSULTA${cod}: ${msg}`, HttpStatus.BAD_REQUEST);
      }

      const rows: any[] = data?.responseBody?.rows ?? data?.responseBody?.result ?? data?.rows ?? [];

      // ordem do SELECT FINAL:
      // 0  NUNOTA
      // 1  ORDEM_LINHA
      // 2  DTNEG
      // 3  HRNEG
      // 4  STATUS_NOTA
      // 5  STATUS_NOTA_DESC
      // 6  STATUS_CONFERENCIA_COD
      // 7  STATUS_CONFERENCIA_DESC
      // 8  QTD_REG_CONFERENCIA
      // 9  BKCOLOR
      // 10 FGCOLOR
      // 11 VLRNOTA
      // 12 AD_TIPODEENTREGA
      // 13 CODVEND
      // 14 VENDEDOR
      // 15 CODTIPOPER
      // 16 PARCEIRO

      const mapped: NotaSeparacaoRow[] = (rows ?? []).map((r: any[]) => ({
        nunota: Number(r?.[0] ?? 0),
        ordemLinha: Number(r?.[1] ?? 0),

        dtneg: String(r?.[2] ?? ''),
        hrneg: r?.[3] != null && String(r?.[3]).trim() !== '' ? String(r?.[3]) : null,

        statusNota: String(r?.[4] ?? ''),
        statusNotaDesc: String(r?.[5] ?? ''),

        statusConferenciaCod: r?.[6] != null ? String(r?.[6]) : null,
        statusConferenciaDesc: r?.[7] != null ? String(r?.[7]) : null,

        qtdRegConferencia: Number(r?.[8] ?? 0),

        bkcolor: String(r?.[9] ?? ''),
        fgcolor: String(r?.[10] ?? ''),

        vlrnota: Number(r?.[11] ?? 0),

        adTipoDeEntrega: r?.[12] != null ? String(r?.[12]) : null,

        codvend: Number(r?.[13] ?? 0),
        vendedor: String(r?.[14] ?? ''),

        codtipoper: Number(r?.[15] ?? 0),

        parceiro: String(r?.[16] ?? ''),
      }));

      return mapped;
    } catch (err: any) {
      const status = err?.response?.status ?? HttpStatus.BAD_GATEWAY;
      const sankhyaData = err?.response?.data;

      const msg =
        sankhyaData?.statusMessage ||
        sankhyaData?.message ||
        err?.message ||
        'Falha ao chamar o serviço do Sankhya.';

      const cod = sankhyaData?.tsError?.tsErrorCode ? ` (${sankhyaData.tsError.tsErrorCode})` : '';

      throw new HttpException(`ERRO NA REQUISIÇÃO${cod}: ${msg}`, status);
    }
  }

  async listarNotasDfarias(authToken: string): Promise<NotaDfariasRow[]> {
    const url =
      'https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=DbExplorerSP.executeQuery&outputType=json';

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    };

    const sql = `
WITH BASE AS (
  SELECT
    CAB.NUNOTA,
    CAB.CODTIPOPER,
    CAB.CODPARC,
    PAR.RAZAOSOCIAL AS PARCEIRO,
    CAB.VLRNOTA,

    TRUNC(CAB.DTALTER) AS DTALTER,
    TO_CHAR(CAB.DTALTER, 'HH24:MI:SS') AS HRALTER,

    CAB.CODVEND,
    VEN.APELIDO AS VENDEDOR,

    CAB.CODPROJ,
    PRJ.IDENTIFICACAO AS DESCPROJ,

    CAB.AD_TIPODEENTREGA AS AD_TIPODEENTREGA,

    CAB.STATUSNOTA AS STATUS_NOTA,
    CASE CAB.STATUSNOTA
      WHEN 'A' THEN 'Atendimento'
      WHEN 'L' THEN 'Liberada'
      WHEN 'P' THEN 'Pendente'
      ELSE 'N/I'
    END AS STATUS_NOTA_DESC,

    CAB.AD_EMSEPARACAO AS AD_SEPARACAO,

    MAX(CON.STATUS) AS STATUS_CONFERENCIA_COD,

    CASE
      WHEN MAX(CON.STATUS) IS NULL AND CAB.AD_EMSEPARACAO = 'S' THEN 'Em Separação'
      ELSE MAX(
        CASE CON.STATUS
          WHEN 'A'  THEN 'Em andamento'
          WHEN 'AC' THEN 'Aguardando conferência'
          WHEN 'AL' THEN 'Aguardando liberação p/ conferência'
          WHEN 'C'  THEN 'Aguardando liberação de corte'
          WHEN 'D'  THEN 'Finalizada divergente'
          WHEN 'Z'  THEN 'Aguardando finalização'
          WHEN 'R'  THEN 'Aguardando recontagem'
          WHEN 'RA' THEN 'Recontagem em andamento'
          WHEN 'RD' THEN 'Recontagem finalizada divergente'
          WHEN 'RF' THEN 'Recontagem finalizada OK'
          WHEN 'F'  THEN 'Finalizada OK'
          ELSE ''
        END
      )
    END AS STATUS_CONFERENCIA_DESC,

    COUNT(CON.STATUS) AS QTD_REG_CONFERENCIA

  FROM TGFCAB CAB
  INNER JOIN TGFTOP TOP
    ON TOP.CODTIPOPER = CAB.CODTIPOPER
   AND TOP.DHALTER   = CAB.DHTIPOPER

  LEFT JOIN TGFPAR PAR
    ON PAR.CODPARC = CAB.CODPARC

  INNER JOIN TGFVEN VEN
    ON VEN.CODVEND = CAB.CODVEND

  LEFT JOIN TCSPRJ PRJ
    ON PRJ.CODPROJ = CAB.CODPROJ

  LEFT JOIN TGFCON2 CON
    ON CON.NUNOTAORIG = CAB.NUNOTA

  WHERE
        /* mesmos critérios de tipo */
        (
          ((CAB.CODTIPOPER = 601 OR CAB.CODTIPOPER = 325)
            AND CAB.CODTIPVENDA NOT IN (131, 238, 239, 193, 235, 222, 241, 192, 176, 157, 162, 163, 156, 177, 159, 236, 237, 178, 161, 158, 160, 264)
            AND (CAB.AD_LIBERABOLETO = 'S' OR CAB.AD_LIBERACAIXA = 'S')
          )
          OR ((CAB.CODTIPOPER = 601 OR CAB.CODTIPOPER = 325)
            AND CAB.CODTIPVENDA IN (131, 238, 239, 193, 235, 222, 241, 192, 176, 157, 162, 163, 156, 177, 159, 236, 237, 178, 161, 158, 160, 264)
          )
          OR CAB.CODTIPOPER = 322
        )
    AND CAB.CODEMP = 1

    AND (CAB.PENDENTE = 'S')

    AND (
          (CAB.CODTIPOPER IN (601, 325) AND CAB.STATUSNOTA = 'L')
       OR (CAB.CODTIPOPER = 322 AND CAB.STATUSNOTA IN ('A', 'L'))
    )

    /* técnico: 322 passa sempre; demais precisam ser técnico=5 */
    AND (CAB.CODTIPOPER = 322 OR VEN.AD_TIPOTECNICO = 5)

    AND NOT EXISTS (
      SELECT 1
      FROM TGFVAR VAR
      WHERE VAR.NUNOTAORIG = CAB.NUNOTA
    )
    AND NOT EXISTS (
      SELECT 1
      FROM TGFCON2 C2
      WHERE C2.NUNOTAORIG = CAB.NUNOTA
        AND C2.STATUS = 'F'
    )

  GROUP BY
    CAB.NUNOTA,
    CAB.CODTIPOPER,
    CAB.CODPARC,
    PAR.RAZAOSOCIAL,
    CAB.VLRNOTA,
    CAB.DTALTER,
    CAB.CODVEND,
    VEN.APELIDO,
    CAB.CODPROJ,
    PRJ.IDENTIFICACAO,
    CAB.AD_TIPODEENTREGA,
    CAB.STATUSNOTA,
    CAB.AD_EMSEPARACAO
),
FINAL AS (
  SELECT
    CASE
      WHEN CODTIPOPER = 322 THEN '#1565C0'
      WHEN AD_TIPODEENTREGA = 'EI' THEN '#2E7D32'
      WHEN AD_TIPODEENTREGA = 'RL' THEN '#F9A825'
      WHEN AD_TIPODEENTREGA = 'EC' THEN '#C62828'
      ELSE '#9E9E9E'
    END AS BKCOLOR,

    CASE
      WHEN CODTIPOPER = 322 THEN '#FFFFFF'
      WHEN AD_TIPODEENTREGA = 'RL' THEN '#000000'
      ELSE '#FFFFFF'
    END AS FGCOLOR,

    ROW_NUMBER() OVER (
      ORDER BY
        CASE
          WHEN AD_TIPODEENTREGA = 'EI' THEN 1
          WHEN CODTIPOPER = 322 THEN 2
          WHEN AD_TIPODEENTREGA = 'RL' THEN 3
          WHEN AD_TIPODEENTREGA = 'EC' THEN 4
          ELSE 9
        END,
        DTALTER DESC,
        NUNOTA DESC
    ) AS ORDEM_LINHA,

    NUNOTA,
    DTALTER AS DTNEG,
    HRALTER AS HRNEG,

    STATUS_NOTA,
    STATUS_NOTA_DESC,

    STATUS_CONFERENCIA_COD,
    STATUS_CONFERENCIA_DESC,
    QTD_REG_CONFERENCIA,

    VLRNOTA,
    AD_TIPODEENTREGA,

    CODVEND,
    VENDEDOR,

    CODTIPOPER,
    PARCEIRO,

    CODPROJ,
    DESCPROJ,

    DTALTER
  FROM BASE
)
SELECT
  NUNOTA,
  ORDEM_LINHA,
  DTNEG,
  HRNEG,
  STATUS_NOTA,
  STATUS_NOTA_DESC,
  STATUS_CONFERENCIA_COD,
  STATUS_CONFERENCIA_DESC,
  QTD_REG_CONFERENCIA,
  BKCOLOR,
  FGCOLOR,
  VLRNOTA,
  AD_TIPODEENTREGA,
  CODVEND,
  VENDEDOR,
  CODTIPOPER,
  PARCEIRO,
  CODPROJ,
  DESCPROJ
FROM FINAL
ORDER BY
  CASE
    WHEN AD_TIPODEENTREGA = 'EI' THEN 1
    WHEN CODTIPOPER = 322 THEN 2
    WHEN AD_TIPODEENTREGA = 'RL' THEN 3
    WHEN AD_TIPODEENTREGA = 'EC' THEN 4
    ELSE 9
  END,
  DTALTER DESC,
  NUNOTA DESC

  `.trim();

    const body = {
      serviceName: 'DbExplorerSP.executeQuery',
      requestBody: { sql },
    };

    try {
      const resp = await firstValueFrom(this.http.post(url, body, { headers }));
      const data = resp?.data;

      if (data?.status === '0') {
        const cod = data?.tsError?.tsErrorCode ? ` (${data.tsError.tsErrorCode})` : '';
        const msg = data?.statusMessage || 'Erro desconhecido retornado pelo Sankhya.';
        throw new HttpException(`ERRO NA CONSULTA${cod}: ${msg}`, HttpStatus.BAD_REQUEST);
      }

      const rows: any[] = data?.responseBody?.rows ?? data?.responseBody?.result ?? data?.rows ?? [];

      const mapped: NotaDfariasRow[] = (rows ?? []).map((r: any[]) => ({
        nunota: Number(r?.[0] ?? 0),
        ordemLinha: Number(r?.[1] ?? 0),

        dtneg: String(r?.[2] ?? ''),
        hrneg: r?.[3] != null && String(r?.[3]).trim() !== '' ? String(r?.[3]) : null,

        statusNota: String(r?.[4] ?? ''),
        statusNotaDesc: String(r?.[5] ?? ''),

        statusConferenciaCod: r?.[6] != null ? String(r?.[6]) : null,
        statusConferenciaDesc: r?.[7] != null ? String(r?.[7]) : null,

        qtdRegConferencia: Number(r?.[8] ?? 0),

        bkcolor: String(r?.[9] ?? ''),
        fgcolor: String(r?.[10] ?? ''),

        vlrnota: Number(r?.[11] ?? 0),
        adTipoDeEntrega: r?.[12] != null ? String(r?.[12]) : null,

        codvend: Number(r?.[13] ?? 0),
        vendedor: String(r?.[14] ?? ''),

        codtipoper: Number(r?.[15] ?? 0),
        parceiro: String(r?.[16] ?? ''),

        codproj: Number(r?.[17] ?? 0),
        descproj: String(r?.[18] ?? ''),
      }));

      return mapped;
    } catch (err: any) {
      const status = err?.response?.status ?? HttpStatus.BAD_GATEWAY;
      const sankhyaData = err?.response?.data;

      const msg =
        sankhyaData?.statusMessage ||
        sankhyaData?.message ||
        err?.message ||
        'Falha ao chamar o serviço do Sankhya.';

      const cod = sankhyaData?.tsError?.tsErrorCode ? ` (${sankhyaData.tsError.tsErrorCode})` : '';

      throw new HttpException(`ERRO NA REQUISIÇÃO${cod}: ${msg}`, status);
    }
  }

  async listarNotasExpedicao(authToken: string): Promise<NotaExpedicaoRow[]> {
    const url =
      'https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=DbExplorerSP.executeQuery&outputType=json';

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    };

    const sql = `
  WITH BASE AS (
    SELECT
      CAB.NUNOTA,
      CAB.NUMNOTA,
      CAB.CODTIPOPER,
      TOP.DESCROPER,
      CAB.CODPARC,
      PAR.RAZAOSOCIAL AS PARCEIRO,
      CAB.VLRNOTA,

      TRUNC(CAB.DTALTER) AS DTALTER,
      TO_CHAR(CAB.DTALTER, 'HH24:MI:SS') AS HRALTER,

      CAB.CODVEND,
      VEN.APELIDO AS VENDEDOR,

      CAB.CODPROJ,
      PRJ.IDENTIFICACAO,

      CAB.CODTIPVENDA,
      TPV.DESCRTIPVENDA AS TIPONEGOCIACAO,

      CAB.AD_TIPODEENTREGA AS AD_TIPODEENTREGA,
      CASE CAB.AD_TIPODEENTREGA
        WHEN 'EI' THEN 'Em Loja'
        WHEN 'RL' THEN 'Vem Pegar'
        WHEN 'EC' THEN 'Entregar'
        ELSE 'Não informado'
      END AS TIPO_ENTREGA,

      CAB.STATUSNOTA AS STATUS_NOTA,
      CASE CAB.STATUSNOTA
        WHEN 'A' THEN 'Atendimento'
        WHEN 'L' THEN 'Liberada'
        WHEN 'P' THEN 'Pendente'
        ELSE 'N/I'
      END AS STATUS_NOTA_DESC,

      CAB.LIBCONF AS LIBCONF,
      CAB.AD_EMSEPARACAO AS AD_SEPARACAO,

      MAX(CON.STATUS) AS STATUS_CONFERENCIA_COD,

      CASE
        WHEN MAX(CON.STATUS) IS NULL AND CAB.AD_EMSEPARACAO = 'S' THEN 'Em Separação'
        ELSE MAX(
          CASE CON.STATUS
            WHEN 'A'  THEN 'Em andamento'
            WHEN 'AC' THEN 'Aguardando conferência'
            WHEN 'AL' THEN 'Aguardando liberação p/ conferência'
            WHEN 'C'  THEN 'Aguardando liberação de corte'
            WHEN 'D'  THEN 'Finalizada divergente'
            WHEN 'Z'  THEN 'Aguardando finalização'
            WHEN 'R'  THEN 'Aguardando recontagem'
            WHEN 'RA' THEN 'Recontagem em andamento'
            WHEN 'RD' THEN 'Recontagem finalizada divergente'
            WHEN 'RF' THEN 'Recontagem finalizada OK'
            WHEN 'F'  THEN 'Finalizada OK'
            ELSE ''
          END
        )
      END AS STATUS_CONFERENCIA_DESC,

      COUNT(CON.STATUS) AS QTD_REG_CONFERENCIA

    FROM TGFCAB CAB
    INNER JOIN TGFTOP TOP
      ON TOP.CODTIPOPER = CAB.CODTIPOPER
    AND TOP.DHALTER   = CAB.DHTIPOPER

    LEFT JOIN TGFPAR PAR
      ON PAR.CODPARC = CAB.CODPARC

    INNER JOIN TGFVEN VEN
      ON VEN.CODVEND = CAB.CODVEND
    AND (CAB.CODTIPOPER = 322 OR VEN.AD_TIPOTECNICO = 5)

    LEFT JOIN TGFTPV TPV
      ON TPV.CODTIPVENDA = CAB.CODTIPVENDA
    AND TPV.DHALTER     = CAB.DHTIPVENDA

    LEFT JOIN TCSPRJ PRJ
      ON PRJ.CODPROJ = CAB.CODPROJ

    LEFT JOIN TGFCON2 CON
      ON CON.NUNOTAORIG = CAB.NUNOTA

    WHERE (
            ((CAB.CODTIPOPER = 601 OR CAB.CODTIPOPER = 325)
              AND CAB.CODTIPVENDA NOT IN (131, 221, 238, 239, 193, 235, 222, 241, 192, 176, 157, 162, 163, 156, 177, 159, 236, 237, 178, 161, 158, 160, 264)
              AND (CAB.AD_LIBERABOLETO = 'S' OR CAB.AD_LIBERACAIXA = 'S')
            )
            OR ((CAB.CODTIPOPER = 601 OR CAB.CODTIPOPER = 325)
              AND CAB.CODTIPVENDA IN (131, 221, 238, 239, 193, 235, 222, 241, 192, 176, 157, 162, 163, 156, 177, 159, 236, 237, 178, 161, 158, 160, 264)
            )
            OR CAB.CODTIPOPER = 322
          )
      AND CAB.CODEMP = 1
      AND CAB.STATUSNOTA IN ('L')
      AND CAB.PENDENTE = 'S'

      AND NOT EXISTS (
        SELECT 1
        FROM TGFVAR VAR
        WHERE VAR.NUNOTAORIG = CAB.NUNOTA
      )
      AND NOT EXISTS (
        SELECT 1
        FROM TGFCON2 C2
        WHERE C2.NUNOTAORIG = CAB.NUNOTA
          AND C2.STATUS = 'F'
      )

    GROUP BY
      CAB.NUNOTA,
      CAB.NUMNOTA,
      CAB.CODTIPOPER,
      TOP.DESCROPER,
      CAB.CODPARC,
      PAR.RAZAOSOCIAL,
      CAB.VLRNOTA,
      CAB.DTALTER,
      CAB.CODVEND,
      VEN.APELIDO,
      CAB.CODPROJ,
      PRJ.IDENTIFICACAO,
      CAB.CODTIPVENDA,
      TPV.DESCRTIPVENDA,
      CAB.AD_TIPODEENTREGA,
      CAB.STATUSNOTA,
      CAB.LIBCONF,
      CAB.AD_EMSEPARACAO
  ),
  FINAL AS (
    SELECT
      CASE
        WHEN CODTIPOPER = 322 THEN '#1565C0'
        WHEN AD_TIPODEENTREGA = 'EI' THEN '#2E7D32'
        WHEN AD_TIPODEENTREGA = 'RL' THEN '#F9A825'
        WHEN AD_TIPODEENTREGA = 'EC' THEN '#C62828'
        ELSE '#9E9E9E'
      END AS BKCOLOR,

      CASE
        WHEN CODTIPOPER = 322 THEN '#FFFFFF'
        WHEN AD_TIPODEENTREGA = 'RL' THEN '#000000'
        ELSE '#FFFFFF'
      END AS FGCOLOR,

      CASE
        WHEN AD_TIPODEENTREGA = 'EI' THEN 1
        WHEN CODTIPOPER = 322 THEN 2
        WHEN AD_TIPODEENTREGA = 'RL' THEN 3
        WHEN AD_TIPODEENTREGA = 'EC' THEN 4
        ELSE 9
      END AS ORDEM_TIPO_PRI,

      ROW_NUMBER() OVER (
        ORDER BY
          CASE
            WHEN AD_TIPODEENTREGA = 'EI' THEN 1
            WHEN CODTIPOPER = 322 THEN 2
            WHEN AD_TIPODEENTREGA = 'RL' THEN 3
            WHEN AD_TIPODEENTREGA = 'EC' THEN 4
            ELSE 9
          END,
          DTALTER DESC,
          NUNOTA DESC
      ) AS ORDEM_LINHA,

      CODTIPOPER,

      NUNOTA,
      DTALTER AS DTNEG,
      HRALTER AS HRNEG,

      STATUS_NOTA,
      STATUS_NOTA_DESC,

      STATUS_CONFERENCIA_COD,
      QTD_REG_CONFERENCIA,

      VLRNOTA,
      AD_TIPODEENTREGA,
      CODVEND,
      VENDEDOR,

      PARCEIRO,

      /* ✅ mantemos DTALTER apenas para ordenar no SELECT final */
      DTALTER
    FROM BASE
  )
  SELECT
    NUNOTA,
    ORDEM_LINHA,
    DTNEG,
    HRNEG,
    STATUS_NOTA,
    STATUS_NOTA_DESC,
    STATUS_CONFERENCIA_COD,
    QTD_REG_CONFERENCIA,
    BKCOLOR,
    FGCOLOR,
    VLRNOTA,
    AD_TIPODEENTREGA,
    CODVEND,
    VENDEDOR,
    CODTIPOPER,
    PARCEIRO
  FROM FINAL
  ORDER BY
    CASE
      WHEN AD_TIPODEENTREGA = 'EI' THEN 1
      WHEN CODTIPOPER = 322 THEN 2
      WHEN AD_TIPODEENTREGA = 'RL' THEN 3
      WHEN AD_TIPODEENTREGA = 'EC' THEN 4
      ELSE 9
    END,
    DTALTER DESC,
    NUNOTA DESC

    `.trim();

    const body = {
      serviceName: 'DbExplorerSP.executeQuery',
      requestBody: { sql },
    };

    try {
      const resp = await firstValueFrom(this.http.post(url, body, { headers }));
      const data = resp?.data;

      if (data?.status === '0') {
        const cod = data?.tsError?.tsErrorCode ? ` (${data.tsError.tsErrorCode})` : '';
        const msg = data?.statusMessage || 'Erro desconhecido retornado pelo Sankhya.';
        throw new HttpException(`ERRO NA CONSULTA${cod}: ${msg}`, HttpStatus.BAD_REQUEST);
      }

      const rows: any[] =
        data?.responseBody?.rows ??
        data?.responseBody?.result ??
        data?.rows ??
        [];

      // ordem do SELECT FINAL:
      // 0  NUNOTA
      // 1  ORDEM_LINHA
      // 2  DTNEG
      // 3  HRNEG
      // 4  STATUS_NOTA
      // 5  STATUS_NOTA_DESC            ✅ novo
      // 6  STATUS_CONFERENCIA_COD
      // 7  QTD_REG_CONFERENCIA
      // 8  BKCOLOR
      // 9  FGCOLOR
      // 10 VLRNOTA
      // 11 AD_TIPODEENTREGA
      // 12 CODVEND
      // 13 VENDEDOR
      // 14 CODTIPOPER
      // 15 PARCEIRO

      const mapped: NotaExpedicaoRow[] = (rows ?? []).map((r: any[]) => ({
        nunota: Number(r?.[0] ?? 0),
        ordemLinha: Number(r?.[1] ?? 0),

        dtneg: String(r?.[2] ?? ''),
        hrneg: String(r?.[3] ?? ''),

        statusNota: String(r?.[4] ?? ''),
        statusNotaDesc: String(r?.[5] ?? ''), // ✅ novo

        statusConferenciaCod: r?.[6] != null ? String(r?.[6]) : null,
        qtdRegConferencia: Number(r?.[7] ?? 0),

        bkcolor: String(r?.[8] ?? ''),
        fgcolor: String(r?.[9] ?? ''),

        vlrnota: Number(r?.[10] ?? 0),

        adTipoDeEntrega: r?.[11] != null ? String(r?.[11]) : null,

        codvend: Number(r?.[12] ?? 0),
        vendedor: String(r?.[13] ?? ''),

        codtipoper: Number(r?.[14] ?? 0),

        parceiro: String(r?.[15] ?? ''),
      }));

      return mapped;
    } catch (err: any) {
      const status = err?.response?.status ?? HttpStatus.BAD_GATEWAY;
      const sankhyaData = err?.response?.data;

      const msg =
        sankhyaData?.statusMessage ||
        sankhyaData?.message ||
        err?.message ||
        'Falha ao chamar o serviço do Sankhya.';

      const cod = sankhyaData?.tsError?.tsErrorCode ? ` (${sankhyaData.tsError.tsErrorCode})` : '';

      throw new HttpException(`ERRO NA REQUISIÇÃO${cod}: ${msg}`, status);
    }
  }

  async listarFilaCabos(authToken: string): Promise<FilaCabosRow[]> {
    const url =
      'https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=DbExplorerSP.executeQuery&outputType=json';

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    };

    const sql = `
  SELECT
    /* CORES */
    CASE
      WHEN CAB.CODTIPOPER = 322 THEN '#1565C0'
      WHEN CAB.AD_TIPODEENTREGA = 'EI' THEN '#2E7D32'
      WHEN CAB.AD_TIPODEENTREGA = 'RL' THEN '#F9A825'
      WHEN CAB.AD_TIPODEENTREGA = 'EC' THEN '#C62828'
      ELSE '#7F00FF'
    END AS BKCOLOR,
  
    CASE
      WHEN CAB.CODTIPOPER = 322 THEN '#FFFFFF'
      WHEN CAB.AD_TIPODEENTREGA = 'RL' THEN '#000000'
      ELSE '#FFFFFF'
    END AS FGCOLOR,
  
    /* PRIORIDADE */
    CASE
      WHEN CAB.AD_TIPODEENTREGA = 'EI' THEN 1
      WHEN CAB.CODTIPOPER = 322 THEN 2
      WHEN CAB.AD_TIPODEENTREGA = 'RL' THEN 3
      WHEN CAB.AD_TIPODEENTREGA = 'EC' THEN 4
      ELSE 9
    END AS ORDEM_TIPO_PRI,
  
    ROW_NUMBER() OVER (
      PARTITION BY
        CASE
          WHEN CAB.AD_TIPODEENTREGA = 'EI' THEN 'EI'
          WHEN CAB.CODTIPOPER = 322 THEN 'TOP322'
          WHEN CAB.AD_TIPODEENTREGA = 'RL' THEN 'RL'
          WHEN CAB.AD_TIPODEENTREGA = 'EC' THEN 'EC'
          ELSE 'OUT'
        END
      ORDER BY TRUNC(CAB.DTALTER) DESC, CAB.NUNOTA DESC, ITE.SEQUENCIA ASC
    ) AS ORDEM_TIPO,
  
    ROW_NUMBER() OVER (
      ORDER BY
        CASE
          WHEN CAB.AD_TIPODEENTREGA = 'EI' THEN 1
          WHEN CAB.CODTIPOPER = 322 THEN 2
          WHEN CAB.AD_TIPODEENTREGA = 'RL' THEN 3
          WHEN CAB.AD_TIPODEENTREGA = 'EC' THEN 4
          ELSE 9
        END,
        TRUNC(CAB.DTALTER) DESC,
        CAB.NUNOTA DESC,
        ITE.SEQUENCIA ASC
    ) AS ORDEM_GERAL,
  
    CAB.NUNOTA,
    CAB.NUMNOTA,
    CAB.CODTIPOPER,
    TOP.DESCROPER,
  
    TRUNC(CAB.DTALTER) AS DTALTER,
    TO_CHAR(CAB.DTALTER, 'HH24:MI:SS') AS HRALTER,
  
    CAB.CODPARC,
    PAR.RAZAOSOCIAL AS PARCEIRO,
  
    CAB.VLRNOTA,
  
    CAB.CODVEND,
    VEN.APELIDO AS VENDEDOR,
  
    CAB.AD_TIPODEENTREGA,
    CASE CAB.AD_TIPODEENTREGA
      WHEN 'EI' THEN 'Em Loja'
      WHEN 'RL' THEN 'Vem Pegar'
      WHEN 'EC' THEN 'Entregar'
      ELSE 'Não informado'
    END AS TIPO_ENTREGA,
  
    CAB.STATUSNOTA AS STATUS_NOTA,
    CASE CAB.STATUSNOTA
      WHEN 'A' THEN 'Atendimento'
      WHEN 'L' THEN 'Liberada'
      WHEN 'P' THEN 'Pendente'
      ELSE 'N/I'
    END AS STATUS_NOTA_DESC,
  
    CAB.LIBCONF,
  
    /* CONFERÊNCIA (por pedido) */
    MAX(CON.STATUS) AS STATUS_CONFERENCIA_COD,
    MAX(
      CASE CON.STATUS
        WHEN 'A'  THEN 'Em andamento'
        WHEN 'AC' THEN 'Aguardando conferência'
        WHEN 'AL' THEN 'Aguardando liberação p/ conferência'
        WHEN 'C'  THEN 'Aguardando liberação de corte'
        WHEN 'D'  THEN 'Finalizada divergente'
        WHEN 'Z'  THEN 'Aguardando finalização'
        WHEN 'R'  THEN 'Aguardando recontagem'
        WHEN 'RA' THEN 'Recontagem em andamento'
        WHEN 'RD' THEN 'Recontagem finalizada divergente'
        WHEN 'RF' THEN 'Recontagem finalizada OK'
        WHEN 'F'  THEN 'Finalizada OK'
        ELSE ''
      END
    ) AS STATUS_CONFERENCIA_DESC,
    COUNT(CON.STATUS) AS QTD_REG_CONFERENCIA,
  
    /* ITENS */
    ITE.SEQUENCIA,
    ITE.CODPROD,
    PRO.DESCRPROD,
    PRO.CODGRUPOPROD,
    ITE.CODVOL,
    ITE.QTDNEG,
    ITE.VLRUNIT,
    ITE.VLRTOT,
    ITE.AD_IMPRESSO   -- ✅ ADICIONADO
  
  FROM TGFCAB CAB
  JOIN TGFTOP TOP
    ON TOP.CODTIPOPER = CAB.CODTIPOPER
   AND TOP.DHALTER   = CAB.DHTIPOPER
  LEFT JOIN TGFPAR PAR
    ON PAR.CODPARC = CAB.CODPARC
  LEFT JOIN TGFVEN VEN
    ON VEN.CODVEND = CAB.CODVEND
  LEFT JOIN TGFCON2 CON
    ON CON.NUNOTAORIG = CAB.NUNOTA
  
  LEFT JOIN TGFITE ITE
    ON ITE.NUNOTA = CAB.NUNOTA
  LEFT JOIN TGFPRO PRO
    ON PRO.CODPROD = ITE.CODPROD
  
  WHERE (
            ((CAB.CODTIPOPER = 601 OR CAB.CODTIPOPER = 325) AND CAB.CODTIPVENDA NOT IN ( 131, 221, 238, 239, 193, 235, 222, 241, 192, 176, 157, 162, 163, 156, 177, 159, 236, 237, 178, 161, 158, 160) and (CAB.AD_LIBERABOLETO = 'S' OR CAB.AD_LIBERACAIXA = 'S'))
            OR ((CAB.CODTIPOPER = 601 OR CAB.CODTIPOPER = 325) AND CAB.CODTIPVENDA IN ( 131,221, 238, 239, 193, 235, 222, 241, 192, 176, 157, 162, 163, 156, 177, 159, 236, 237, 178, 161, 158, 160))
            OR CAB.CODTIPOPER = 322
          )
    AND CAB.CODEMP = 1
    AND CAB.STATUSNOTA = 'L'
    AND CAB.PENDENTE = 'S'
    AND NOT EXISTS (
      SELECT 1 FROM TGFVAR VAR WHERE VAR.NUNOTAORIG = CAB.NUNOTA
    )
    AND NOT EXISTS (
      SELECT 1 FROM TGFCON2 C2
       WHERE C2.NUNOTAORIG = CAB.NUNOTA
         AND C2.STATUS = 'F'
    )
  
    /* FILTRO DOS GRUPOS DOS ITENS */
    AND PRO.CODGRUPOPROD IN (7101104, 7101115, 7101113, 7101103, 7101102, 7101106, 7101107, 7101112, 7101105, 7101109, 7103605, 7101108, 7105405)
  
  GROUP BY
    CAB.NUNOTA,
    CAB.NUMNOTA,
    CAB.CODTIPOPER,
    TOP.DESCROPER,
    CAB.CODPARC,
    PAR.RAZAOSOCIAL,
    CAB.VLRNOTA,
    CAB.DTALTER,
    CAB.CODVEND,
    VEN.APELIDO,
    CAB.AD_TIPODEENTREGA,
    CAB.STATUSNOTA,
    CAB.LIBCONF,
    ITE.SEQUENCIA,
    ITE.CODPROD,
    PRO.DESCRPROD,
    PRO.CODGRUPOPROD,
    ITE.CODVOL,
    ITE.QTDNEG,
    ITE.VLRUNIT,
    ITE.VLRTOT,
    ITE.AD_IMPRESSO   -- ✅ ADICIONADO
  
  ORDER BY
    ORDEM_TIPO_PRI,
    DTALTER DESC,
    CAB.NUNOTA DESC,
    ITE.SEQUENCIA ASC
  
  
  `.trim();

    const body = {
      serviceName: 'DbExplorerSP.executeQuery',
      requestBody: { sql },
    };

    try {
      const resp = await firstValueFrom(this.http.post(url, body, { headers }));
      const data = resp?.data;

      if (data?.status === '0') {
        const cod = data?.tsError?.tsErrorCode ? ` (${data.tsError.tsErrorCode})` : '';
        const msg = data?.statusMessage || 'Erro desconhecido retornado pelo Sankhya.';
        throw new HttpException(`ERRO NA CONSULTA${cod}: ${msg}`, HttpStatus.BAD_REQUEST);
      }

      const rows: any[] =
        data?.responseBody?.rows ??
        data?.responseBody?.result ??
        data?.rows ??
        [];

      // Ordem do SELECT (índices):
      // 0 BKCOLOR
      // 1 FGCOLOR
      // 2 ORDEM_TIPO_PRI
      // 3 ORDEM_TIPO
      // 4 ORDEM_GERAL
      // 5 NUNOTA
      // 6 NUMNOTA
      // 7 CODTIPOPER
      // 8 DESCROPER
      // 9 DTALTER
      // 10 HRALTER
      // 11 CODPARC
      // 12 PARCEIRO
      // 13 VLRNOTA
      // 14 CODVEND
      // 15 VENDEDOR
      // 16 AD_TIPODEENTREGA
      // 17 TIPO_ENTREGA
      // 18 STATUS_NOTA
      // 19 STATUS_NOTA_DESC
      // 20 LIBCONF
      // 21 STATUS_CONFERENCIA_COD
      // 22 STATUS_CONFERENCIA_DESC
      // 23 QTD_REG_CONFERENCIA
      // 24 SEQUENCIA
      // 25 CODPROD
      // 26 DESCRPROD
      // 27 CODGRUPOPROD
      // 28 CODVOL
      // 29 QTDNEG
      // 30 VLRUNIT
      // 31 VLRTOT
      // 32 AD_IMPRESSO


      const mapped: FilaCabosRow[] = (rows ?? []).map((r: any[]) => ({
        // --- Cores e Ordenação ---
        bkcolor: String(r?.[0] ?? ''),                 // BKCOLOR
        fgcolor: String(r?.[1] ?? ''),                 // FGCOLOR
        ordemTipoPri: Number(r?.[2] ?? 0),             // ORDEM_TIPO_PRI
        ordemTipo: Number(r?.[3] ?? 0),                // ORDEM_TIPO
        ordemLinha: Number(r?.[4] ?? 0),               // ORDEM_GERAL

        // --- Cabeçalho da Nota ---
        nunota: Number(r?.[5] ?? 0),                   // CAB.NUNOTA
        numnota: Number(r?.[6] ?? 0),                  // CAB.NUMNOTA
        codtipoper: Number(r?.[7] ?? 0),               // CAB.CODTIPOPER
        descroper: String(r?.[8] ?? ''),               // TOP.DESCROPER

        dtalter: String(r?.[9] ?? ''),                 // DTALTER (TRUNC)
        hralter: String(r?.[10] ?? ''),                // HRALTER

        codparc: Number(r?.[11] ?? 0),                 // CAB.CODPARC
        parceiro: String(r?.[12] ?? ''),               // PAR.RAZAOSOCIAL
        vlrnota: Number(r?.[13] ?? 0),                 // CAB.VLRNOTA

        codvend: Number(r?.[14] ?? 0),                 // CAB.CODVEND
        vendedor: String(r?.[15] ?? ''),               // VEN.APELIDO

        // --- Logística e Status ---
        adTipoDeEntrega: r?.[16] != null ? String(r?.[16]) : null, // CAB.AD_TIPODEENTREGA
        tipoEntrega: String(r?.[17] ?? ''),            // TIPO_ENTREGA (CASE)

        statusNota: String(r?.[18] ?? ''),             // CAB.STATUSNOTA
        statusNotaDesc: String(r?.[19] ?? ''),         // STATUS_NOTA_DESC (CASE)

        libconf: r?.[20] != null ? String(r?.[20]) : null, // CAB.LIBCONF

        // --- Conferência ---
        statusConferenciaCod: r?.[21] != null ? String(r?.[21]) : null, // STATUS_CONFERENCIA_COD
        statusConferenciaDesc: r?.[22] != null ? String(r?.[22]) : null, // STATUS_CONFERENCIA_DESC
        qtdRegConferencia: Number(r?.[23] ?? 0),       // QTD_REG_CONFERENCIA

        // --- Itens ---
        sequencia: Number(r?.[24] ?? 0),               // ITE.SEQUENCIA
        codprod: Number(r?.[25] ?? 0),                 // ITE.CODPROD
        descrprod: String(r?.[26] ?? ''),              // PRO.DESCRPROD
        codgrupoprod: Number(r?.[27] ?? 0),            // PRO.CODGRUPOPROD
        codvol: String(r?.[28] ?? ''),                 // ITE.CODVOL
        qtdneg: Number(r?.[29] ?? 0),                  // ITE.QTDNEG
        vlrunit: Number(r?.[30] ?? 0),                 // ITE.VLRUNIT
        vlrtot: Number(r?.[31] ?? 0),                  // ITE.VLRTOT
        impresso: String(r?.[32] ?? ''),               // ITE.AD_IMPRESSO
      }));
      //console.log(mapped)
      return mapped;
    } catch (err: any) {
      const status = err?.response?.status ?? HttpStatus.BAD_GATEWAY;
      const sankhyaData = err?.response?.data;

      const msg =
        sankhyaData?.statusMessage ||
        sankhyaData?.message ||
        err?.message ||
        'Falha ao chamar o serviço do Sankhya.';

      const cod = sankhyaData?.tsError?.tsErrorCode ? ` (${sankhyaData.tsError.tsErrorCode})` : '';

      throw new HttpException(`ERRO NA REQUISIÇÃO${cod}: ${msg}`, status);
    }
  }

  async listarItensLid(authToken: string) {
    const url =
      'https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=DbExplorerSP.executeQuery&outputType=json';

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    };

    // Query formatada para o DbExplorer
    const sql = `
WITH CONF AS (
  SELECT
    C2.NUNOTAORIG,
    MAX(C2.STATUS) AS STATUS_CONFERENCIA_COD,
    MAX(
      CASE C2.STATUS
        WHEN 'A'  THEN 'Em andamento'
        WHEN 'AC' THEN 'Aguardando conferência'
        WHEN 'AL' THEN 'Aguardando liberação p/ conferência'
        WHEN 'C'  THEN 'Aguardando liberação de corte'
        WHEN 'D'  THEN 'Finalizada divergente'
        WHEN 'Z'  THEN 'Aguardando finalização'
        WHEN 'R'  THEN 'Aguardando recontagem'
        WHEN 'RA' THEN 'Recontagem em andamento'
        WHEN 'RD' THEN 'Recontagem finalizada divergente'
        WHEN 'RF' THEN 'Recontagem finalizada OK'
        WHEN 'F'  THEN 'Finalizada OK'
        ELSE ''
      END
    ) AS STATUS_CONFERENCIA_DESC,
    COUNT(*) AS QTD_REG_CONFERENCIA
  FROM TGFCON2 C2
  GROUP BY C2.NUNOTAORIG
),
CAB_BASE AS (
  SELECT
    CAB.NUNOTA,
    CAB.NUMNOTA,
    CAB.CODTIPOPER,
    TOP.DESCROPER,
    CAB.CODPARC,
    PAR.RAZAOSOCIAL AS PARCEIRO,
    CAB.VLRNOTA,
    TRUNC(CAB.DTALTER) AS DTALTER,
    TO_CHAR(CAB.DTALTER, 'HH24:MI:SS') AS HRALTER,
    CAB.CODVEND,
    VEN.APELIDO AS VENDEDOR,

    CAB.CODTIPVENDA,
    TPV.DESCRTIPVENDA AS TIPONEGOCIACAO,

    CAB.AD_TIPODEENTREGA,
    CASE CAB.AD_TIPODEENTREGA
      WHEN 'EI' THEN 'Em Loja'
      WHEN 'RL' THEN 'Vem Pegar'
      WHEN 'EC' THEN 'Entregar'
      ELSE 'Não informado'
    END AS TIPO_ENTREGA,

    CAB.STATUSNOTA AS STATUS_NOTA,
    CASE CAB.STATUSNOTA
      WHEN 'A' THEN 'Atendimento'
      WHEN 'L' THEN 'Liberada'
      WHEN 'P' THEN 'Pendente'
      ELSE 'N/I'
    END AS STATUS_NOTA_DESC,

    CAB.LIBCONF,

    NVL(CONF.STATUS_CONFERENCIA_COD, NULL)  AS STATUS_CONFERENCIA_COD,
    NVL(CONF.STATUS_CONFERENCIA_DESC, '')   AS STATUS_CONFERENCIA_DESC,
    NVL(CONF.QTD_REG_CONFERENCIA, 0)        AS QTD_REG_CONFERENCIA

  FROM TGFCAB CAB
  INNER JOIN TGFTOP TOP
    ON TOP.CODTIPOPER = CAB.CODTIPOPER
   AND TOP.DHALTER    = CAB.DHTIPOPER

  LEFT JOIN TGFPAR PAR
    ON PAR.CODPARC = CAB.CODPARC

  INNER JOIN TGFVEN VEN
    ON VEN.CODVEND = CAB.CODVEND
   AND VEN.AD_TIPOTECNICO = 4

  LEFT JOIN TGFTPV TPV
    ON TPV.CODTIPVENDA = CAB.CODTIPVENDA
   AND TPV.DHALTER     = CAB.DHTIPVENDA

  LEFT JOIN CONF
    ON CONF.NUNOTAORIG = CAB.NUNOTA

  WHERE (
          (CAB.CODTIPOPER = 601 AND CAB.CODTIPVENDA NOT IN (131, 221, 238, 239, 193, 235, 222, 241, 192, 176, 157, 162, 163, 156, 177, 159, 236, 237, 178, 161, 158, 160, 264) AND (  CAB.AD_LIBERABOLETO = 'S' OR CAB.AD_LIBERACAIXA = 'S' OR (
  CAB.DTNEG IS NOT NULL
  AND REGEXP_LIKE(CAB.DTNEG, '^\d{2}/\d{2}/\d{4}$')
  AND TO_DATE(CAB.DTNEG, 'DD/MM/YYYY') < DATE '2026-01-10'
)))
          OR (CAB.CODTIPOPER = 601 AND CAB.CODTIPVENDA IN (131, 221, 238, 239, 193, 235, 222, 241, 192, 176, 157, 162, 163, 156, 177, 159, 236, 237, 178, 161, 158, 160, 264))
          OR CAB.CODTIPOPER = 322
          OR (
              CAB.CODTIPOPER = 325
              AND EXISTS (
                SELECT 1
                  FROM TGFITE ITE
                  JOIN TGFEST EST
                    ON EST.CODEMP   = CAB.CODEMP
                   AND EST.CODPROD  = ITE.CODPROD
                   AND EST.CODLOCAL = ITE.CODLOCALORIG
                  WHERE ITE.NUNOTA  = CAB.NUNOTA
                    AND ITE.PENDENTE = 'S'
                    AND NVL(EST.ESTOQUE, 0) > 0
              )
          )
        )
    AND CAB.CODEMP = 1
    AND CAB.STATUSNOTA IN ('L')
    AND (
          (CAB.CODTIPOPER IN (601, 322) AND CAB.PENDENTE = 'S')
          OR (CAB.CODTIPOPER = 325)
        )
    AND NOT EXISTS (SELECT 1 FROM TGFVAR VAR WHERE VAR.NUNOTAORIG = CAB.NUNOTA)
    AND NOT EXISTS (
      SELECT 1
      FROM TGFCON2 C2
      WHERE C2.NUNOTAORIG = CAB.NUNOTA
        AND C2.STATUS = 'F'
    )
),
ITENS AS (
  SELECT
    ITE.NUNOTA,
    ITE.SEQUENCIA,
    ITE.CODPROD,
    PRO.DESCRPROD,
    ITE.CODLOCALORIG,
    LOC.DESCRLOCAL,
    ITE.PENDENTE,
    ITE.QTDNEG,
    ITE.VLRUNIT,
    ITE.VLRTOT,
    NVL(EST.ESTOQUE,0) AS ESTOQUE,
    /* CORREÇÃO AQUI: Garante que se for NULL retorne 'N' */
    NVL(ITE.AD_IMPRESSO, 'N') AS AD_IMPRESSO
  FROM TGFITE ITE
  INNER JOIN TGFCAB CAB
    ON CAB.NUNOTA = ITE.NUNOTA
  LEFT JOIN TGFPRO PRO
    ON PRO.CODPROD = ITE.CODPROD
  LEFT JOIN TGFLOC LOC
    ON LOC.CODLOCAL = ITE.CODLOCALORIG
  INNER JOIN TGFEST EST
    ON EST.CODEMP   = CAB.CODEMP
   AND EST.CODPROD  = ITE.CODPROD
   AND EST.CODLOCAL = ITE.CODLOCALORIG
  WHERE ITE.PENDENTE = 'S'
    AND NVL(EST.ESTOQUE, 0) > 0
)
SELECT
  /* CORES */
  CASE
    WHEN CAB.CODTIPOPER = 322 THEN '#1565C0'
    WHEN CAB.CODTIPOPER = 325 THEN '#D29BFD'
    WHEN CAB.AD_TIPODEENTREGA = 'EI' THEN '#2E7D32'
    WHEN CAB.AD_TIPODEENTREGA = 'RL' THEN '#F9A825'
    WHEN CAB.AD_TIPODEENTREGA = 'EC' THEN '#C62828'
    ELSE '#9E9E9E'
  END AS BKCOLOR,

  CASE
    WHEN CAB.CODTIPOPER IN (322, 325) THEN '#FFFFFF'
    WHEN CAB.AD_TIPODEENTREGA = 'RL' THEN '#000000'
    ELSE '#FFFFFF'
  END AS FGCOLOR,

  /* PRIORIDADE */
  CASE
    WHEN CAB.AD_TIPODEENTREGA = 'EI' THEN 1
    WHEN CAB.CODTIPOPER = 322 THEN 2
    WHEN CAB.CODTIPOPER = 325 THEN 3
    WHEN CAB.AD_TIPODEENTREGA = 'RL' THEN 4
    WHEN CAB.AD_TIPODEENTREGA = 'EC' THEN 5
    ELSE 9
  END AS ORDEM_TIPO_PRI,

  ROW_NUMBER() OVER (
    PARTITION BY
      CASE
        WHEN CAB.AD_TIPODEENTREGA = 'EI' THEN 'EI'
        WHEN CAB.CODTIPOPER = 322 THEN 'TOP322'
        WHEN CAB.CODTIPOPER = 325 THEN 'TOP325'
        WHEN CAB.AD_TIPODEENTREGA = 'RL' THEN 'RL'
        WHEN CAB.AD_TIPODEENTREGA = 'EC' THEN 'EC'
        ELSE 'OUT'
      END
    ORDER BY CAB.DTALTER DESC, CAB.NUNOTA DESC, IT.SEQUENCIA
  ) AS ORDEM_TIPO,

  ROW_NUMBER() OVER (
    ORDER BY
      CASE
        WHEN CAB.AD_TIPODEENTREGA = 'EI' THEN 1
        WHEN CAB.CODTIPOPER = 322 THEN 2
        WHEN CAB.CODTIPOPER = 325 THEN 3
        WHEN CAB.AD_TIPODEENTREGA = 'RL' THEN 4
        WHEN CAB.AD_TIPODEENTREGA = 'EC' THEN 5
        ELSE 9
      END,
      CAB.DTALTER DESC,
      CAB.NUNOTA DESC,
      IT.SEQUENCIA
  ) AS ORDEM_GERAL,

  /* CABEÇALHO */
  CAB.NUNOTA,
  CAB.NUMNOTA,
  CAB.CODTIPOPER,
  CAB.DESCROPER,
  CAB.DTALTER,
  CAB.HRALTER,
  CAB.CODPARC,
  CAB.PARCEIRO,
  CAB.VLRNOTA,
  CAB.CODVEND,
  CAB.VENDEDOR,
  CAB.CODTIPVENDA,
  CAB.TIPONEGOCIACAO,
  CAB.AD_TIPODEENTREGA,
  CAB.TIPO_ENTREGA,
  CAB.STATUS_NOTA,
  CAB.STATUS_NOTA_DESC,
  CAB.LIBCONF,
  CAB.STATUS_CONFERENCIA_COD,
  CAB.STATUS_CONFERENCIA_DESC,
  CAB.QTD_REG_CONFERENCIA,

  /* ITENS */
  IT.SEQUENCIA,
  IT.CODPROD,
  IT.DESCRPROD,
  IT.CODLOCALORIG,
  IT.DESCRLOCAL,
  IT.PENDENTE,
  IT.QTDNEG,
  IT.VLRUNIT,
  IT.VLRTOT,
  IT.ESTOQUE,
  IT.AD_IMPRESSO

FROM CAB_BASE CAB
JOIN ITENS IT
  ON IT.NUNOTA = CAB.NUNOTA

ORDER BY
  ORDEM_TIPO_PRI,
  CAB.DTALTER DESC,
  CAB.NUNOTA DESC,
  IT.SEQUENCIA

  `.trim();

    const body = {
      serviceName: 'DbExplorerSP.executeQuery',
      requestBody: {
        sql,
      },
    };

    try {
      const resp = await firstValueFrom(this.http.post(url, body, { headers }));
      const data = resp?.data;

      // Tratamento de erro de negócio do Sankhya (Status 0)
      if (data?.status === '0') {
        const cod = data?.tsError?.tsErrorCode ? ` (${data.tsError.tsErrorCode})` : '';
        const msg = data?.statusMessage || 'Erro interno no DbExplorer do Sankhya.';
        throw new HttpException(`ERRO NA CONSULTA${cod}: ${msg}`, HttpStatus.BAD_REQUEST);
      }

      // Extração das linhas (rows)
      const rows =
        data?.responseBody?.rows ??
        data?.responseBody?.result ??
        data?.rows ??
        [];

      return rows;

    } catch (err: any) {
      // Se já for uma HttpException lançada acima, repassa ela
      if (err instanceof HttpException) throw err;

      const status = err?.response?.status ?? HttpStatus.BAD_GATEWAY;
      const sankhyaData = err?.response?.data;

      const msg =
        sankhyaData?.statusMessage ||
        sankhyaData?.message ||
        err?.message ||
        'Falha na comunicação com o Gateway Sankhya.';

      const cod = sankhyaData?.tsError?.tsErrorCode ? ` (${sankhyaData.tsError.tsErrorCode})` : '';

      throw new HttpException(`ERRO NA REQUISIÇÃO${cod}: ${msg}`, status);
    }
  }

  async listarPedidosLid(authToken: string) {
    const url =
      'https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=DbExplorerSP.executeQuery&outputType=json';

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    };

    // A Query completa do Painel de Expedição
    const sql = `
  WITH BASE AS (
  SELECT
    CAB.NUNOTA,
    CAB.NUMNOTA,
    CAB.CODTIPOPER,
    TOP.DESCROPER,
    CAB.CODPARC,
    PAR.RAZAOSOCIAL AS PARCEIRO,
    CAB.VLRNOTA,

    TRUNC(CAB.DTALTER) AS DTALTER,
    TO_CHAR(CAB.DTALTER, 'HH24:MI:SS') AS HRALTER,

    CAB.CODVEND,
    VEN.APELIDO AS VENDEDOR,

    /* TIPO DE NEGOCIAÇÃO */
    CAB.CODTIPVENDA,
    TPV.DESCRTIPVENDA AS TIPONEGOCIACAO,

    CAB.AD_TIPODEENTREGA AS AD_TIPODEENTREGA,
    CASE CAB.AD_TIPODEENTREGA
      WHEN 'EI' THEN 'Em Loja'
      WHEN 'RL' THEN 'Vem Pegar'
      WHEN 'EC' THEN 'Entregar'
      ELSE 'Não informado'
    END AS TIPO_ENTREGA,

    CAB.STATUSNOTA AS STATUS_NOTA,
    CASE CAB.STATUSNOTA
      WHEN 'A' THEN 'Atendimento'
      WHEN 'L' THEN 'Liberada'
      WHEN 'P' THEN 'Pendente'
      ELSE 'N/I'
    END AS STATUS_NOTA_DESC,

    CAB.LIBCONF AS LIBCONF,

    MAX(CON.STATUS) AS STATUS_CONFERENCIA_COD,
    MAX(
      CASE CON.STATUS
        WHEN 'A'  THEN 'Em andamento'
        WHEN 'AC' THEN 'Aguardando conferência'
        WHEN 'AL' THEN 'Aguardando liberação p/ conferência'
        WHEN 'C'  THEN 'Aguardando liberação de corte'
        WHEN 'D'  THEN 'Finalizada divergente'
        WHEN 'Z'  THEN 'Aguardando finalização'
        WHEN 'R'  THEN 'Aguardando recontagem'
        WHEN 'RA' THEN 'Recontagem em andamento'
        WHEN 'RD' THEN 'Recontagem finalizada divergente'
        WHEN 'RF' THEN 'Recontagem finalizada OK'
        WHEN 'F'  THEN 'Finalizada OK'
        ELSE ''
      END
    ) AS STATUS_CONFERENCIA_DESC,

    COUNT(CON.STATUS) AS QTD_REG_CONFERENCIA

  FROM TGFCAB CAB
  INNER JOIN TGFTOP TOP
    ON TOP.CODTIPOPER = CAB.CODTIPOPER
   AND TOP.DHALTER   = CAB.DHTIPOPER

  LEFT JOIN TGFPAR PAR
    ON PAR.CODPARC = CAB.CODPARC

  INNER JOIN TGFVEN VEN
    ON VEN.CODVEND = CAB.CODVEND
   AND VEN.AD_TIPOTECNICO = 4

  /* JOIN TIPO DE NEGOCIAÇÃO */
  LEFT JOIN TGFTPV TPV
    ON TPV.CODTIPVENDA = CAB.CODTIPVENDA
   AND TPV.DHALTER     = CAB.DHTIPVENDA

  LEFT JOIN TGFCON2 CON
    ON CON.NUNOTAORIG = CAB.NUNOTA

  WHERE (
          (CAB.CODTIPOPER = 601 AND CAB.CODTIPVENDA NOT IN (131, 221, 238, 239, 193, 235, 222, 241, 192, 176, 157, 162, 163, 156, 177, 159, 236, 237, 178, 161, 158, 160,264) AND (CAB.AD_LIBERABOLETO = 'S' OR CAB.AD_LIBERACAIXA = 'S'))
          OR (CAB.CODTIPOPER = 601 AND CAB.CODTIPVENDA IN (131, 221, 238, 239, 193, 235, 222, 241, 192, 176, 157, 162, 163, 156, 177, 159, 236, 237, 178, 161, 158, 160,264))
          OR CAB.CODTIPOPER = 322
          OR (
              CAB.CODTIPOPER = 325
              AND EXISTS (
                SELECT 1
                  FROM TGFITE ITE
                  JOIN TGFEST EST
                    ON EST.CODEMP   = CAB.CODEMP
                   AND EST.CODPROD  = ITE.CODPROD
                   AND EST.CODLOCAL = ITE.CODLOCALORIG
                 WHERE ITE.NUNOTA   = CAB.NUNOTA
                   AND ITE.PENDENTE = 'S'
                   AND NVL(EST.ESTOQUE, 0) > 0
              )
          )
        )
    AND CAB.CODEMP = 1
    AND CAB.STATUSNOTA IN ('L')

    /* Para 601/322 mantém a regra atual (CAB.PENDENTE='S');
       Para 325 entra pela condição do EXISTS acima (item pendente c/ estoque > 0). */
    AND (
          (CAB.CODTIPOPER IN (601, 322) AND CAB.PENDENTE = 'S')
          OR (CAB.CODTIPOPER = 325)
        )

    AND NOT EXISTS (
      SELECT 1
      FROM TGFVAR VAR
      WHERE VAR.NUNOTAORIG = CAB.NUNOTA
    )
    AND NOT EXISTS (
      SELECT 1
      FROM TGFCON2 C2
      WHERE C2.NUNOTAORIG = CAB.NUNOTA
        AND C2.STATUS = 'F'
    )

  GROUP BY
    CAB.NUNOTA,
    CAB.NUMNOTA,
    CAB.CODTIPOPER,
    TOP.DESCROPER,
    CAB.CODPARC,
    PAR.RAZAOSOCIAL,
    CAB.VLRNOTA,
    CAB.DTALTER,
    CAB.CODVEND,
    VEN.APELIDO,

    CAB.CODTIPVENDA,
    TPV.DESCRTIPVENDA,

    CAB.AD_TIPODEENTREGA,
    CAB.STATUSNOTA,
    CAB.LIBCONF
)

SELECT
  /* CORES */
  CASE
    WHEN CODTIPOPER = 322 THEN '#1565C0'           -- AZUL (TOP 322)
    WHEN CODTIPOPER = 325 THEN '#6A1B9A'           -- ROXO (TOP 325)
    WHEN AD_TIPODEENTREGA = 'EI' THEN '#2E7D32'    -- VERDE
    WHEN AD_TIPODEENTREGA = 'RL' THEN '#F9A825'    -- AMARELO
    WHEN AD_TIPODEENTREGA = 'EC' THEN '#C62828'    -- VERMELHO
    ELSE '#9E9E9E'
  END AS BKCOLOR,

  CASE
    WHEN CODTIPOPER IN (322, 325) THEN '#FFFFFF'   -- TEXTO BRANCO NO AZUL/ROXO
    WHEN AD_TIPODEENTREGA = 'RL' THEN '#000000'
    ELSE '#FFFFFF'
  END AS FGCOLOR,

  /* PRIORIDADE */
  CASE
    WHEN AD_TIPODEENTREGA = 'EI' THEN 1
    WHEN CODTIPOPER = 322 THEN 2
    WHEN CODTIPOPER = 325 THEN 3
    WHEN AD_TIPODEENTREGA = 'RL' THEN 4
    WHEN AD_TIPODEENTREGA = 'EC' THEN 5
    ELSE 9
  END AS ORDEM_TIPO_PRI,

  ROW_NUMBER() OVER (
    PARTITION BY
      CASE
        WHEN AD_TIPODEENTREGA = 'EI' THEN 'EI'
        WHEN CODTIPOPER = 322 THEN 'TOP322'
        WHEN CODTIPOPER = 325 THEN 'TOP325'
        WHEN AD_TIPODEENTREGA = 'RL' THEN 'RL'
        WHEN AD_TIPODEENTREGA = 'EC' THEN 'EC'
        ELSE 'OUT'
      END
    ORDER BY DTALTER DESC, NUNOTA DESC
  ) AS ORDEM_TIPO,

  ROW_NUMBER() OVER (
    ORDER BY
      CASE
        WHEN AD_TIPODEENTREGA = 'EI' THEN 1
        WHEN CODTIPOPER = 322 THEN 2
        WHEN CODTIPOPER = 325 THEN 3
        WHEN AD_TIPODEENTREGA = 'RL' THEN 4
        WHEN AD_TIPODEENTREGA = 'EC' THEN 5
        ELSE 9
      END,
      DTALTER DESC,
      NUNOTA DESC
  ) AS ORDEM_GERAL,

  NUNOTA,
  NUMNOTA,
  CODTIPOPER,
  DESCROPER,
  DTALTER,
  HRALTER,
  CODPARC,
  PARCEIRO,
  VLRNOTA,
  CODVEND,
  VENDEDOR,

  /* TIPO DE NEGOCIAÇÃO */
  CODTIPVENDA,
  TIPONEGOCIACAO,

  AD_TIPODEENTREGA,
  TIPO_ENTREGA,
  STATUS_NOTA,
  STATUS_NOTA_DESC,
  LIBCONF,
  STATUS_CONFERENCIA_COD,
  STATUS_CONFERENCIA_DESC,
  QTD_REG_CONFERENCIA

FROM BASE
ORDER BY
  ORDEM_TIPO_PRI,
  DTALTER DESC,
  NUNOTA DESC
    `.trim();

    const body = {
      serviceName: 'DbExplorerSP.executeQuery',
      requestBody: {
        sql,
      },
    };

    try {
      const resp = await firstValueFrom(this.http.post(url, body, { headers }));
      const data = resp?.data;

      // Tratamento de erro de negócio do Sankhya (Status 0)
      if (data?.status === '0') {
        const cod = data?.tsError?.tsErrorCode ? ` (${data.tsError.tsErrorCode})` : '';
        const msg = data?.statusMessage || 'Erro interno no DbExplorer do Sankhya.';
        throw new HttpException(`ERRO NA CONSULTA${cod}: ${msg}`, HttpStatus.BAD_REQUEST);
      }

      // Extração das linhas (rows)
      // O DbExplorer pode retornar 'rows' como array de objetos (se configurado) ou 'result'
      const rows =
        data?.responseBody?.rows ??
        data?.responseBody?.result ??
        data?.rows ??
        [];

      return rows;

    } catch (err: any) {
      // Se já for uma HttpException lançada acima, repassa ela
      if (err instanceof HttpException) throw err;

      const status = err?.response?.status ?? HttpStatus.BAD_GATEWAY;
      const sankhyaData = err?.response?.data;

      const msg =
        sankhyaData?.statusMessage ||
        sankhyaData?.message ||
        err?.message ||
        'Falha na comunicação com o Gateway Sankhya.';

      const cod = sankhyaData?.tsError?.tsErrorCode ? ` (${sankhyaData.tsError.tsErrorCode})` : '';

      throw new HttpException(`ERRO NA REQUISIÇÃO${cod}: ${msg}`, status);
    }
  }


async listarItensLocalizacao2AR02(authToken: string): Promise<ItemLoc2Row[]> {
  const url =
    'https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=DbExplorerSP.executeQuery&outputType=json';

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${authToken}`,
  };

  const sql = `
SELECT
  /* CORES (de acordo com tipo de entrega) */
  CASE
    WHEN CAB.CODTIPOPER = 322 THEN '#1565C0'
    WHEN CAB.AD_TIPODEENTREGA = 'EI' THEN '#2E7D32'
    WHEN CAB.AD_TIPODEENTREGA = 'RL' THEN '#F9A825'
    WHEN CAB.AD_TIPODEENTREGA = 'EC' THEN '#C62828'
    ELSE '#7F00FF'
  END AS BKCOLOR,

  CASE
    WHEN CAB.CODTIPOPER = 322 THEN '#FFFFFF'
    WHEN CAB.AD_TIPODEENTREGA = 'RL' THEN '#000000'
    ELSE '#FFFFFF'
  END AS FGCOLOR,

  /* tipo entrega */
  CAB.AD_TIPODEENTREGA,
  CASE CAB.AD_TIPODEENTREGA
    WHEN 'EI' THEN 'Em Loja'
    WHEN 'RL' THEN 'Vem Pegar'
    WHEN 'EC' THEN 'Entregar'
    ELSE 'Não informado'
  END AS TIPO_ENTREGA,

  /* dados do item */
  ITE.NUNOTA,
  ITE.SEQUENCIA,

  ITE.CODPROD,
  PRO.DESCRPROD,
  PRO.CODGRUPOPROD,

  ITE.CODVOL,
  ITE.QTDNEG,
  ITE.VLRUNIT,
  ITE.VLRTOT,

  PRO.AD_LOCALIZACAO,

  TRUNC(CAB.DTALTER) AS DTALTER,
  TO_CHAR(CAB.DTALTER, 'HH24:MI:SS') AS HRALTER

FROM TGFITE ITE
JOIN TGFCAB CAB
  ON CAB.NUNOTA = ITE.NUNOTA
JOIN TGFPRO PRO
  ON PRO.CODPROD = ITE.CODPROD

WHERE (
        ((CAB.CODTIPOPER = 601 OR CAB.CODTIPOPER = 325)
          AND CAB.CODTIPVENDA NOT IN (131, 221, 238, 239, 193, 235, 222, 241, 192, 176, 157, 162, 163, 156, 177, 159, 236, 237, 178, 161, 158, 160, 264)
          AND (CAB.AD_LIBERABOLETO = 'S' OR CAB.AD_LIBERACAIXA = 'S')
        )
        OR ((CAB.CODTIPOPER = 601 OR CAB.CODTIPOPER = 325)
          AND CAB.CODTIPVENDA IN (131, 221, 238, 239, 193, 235, 222, 241, 192, 176, 157, 162, 163, 156, 177, 159, 236, 237, 178, 161, 158, 160, 264)
        )
        OR CAB.CODTIPOPER = 322
      )
  AND CAB.CODEMP = 1
  AND CAB.STATUSNOTA = 'L'
  AND CAB.PENDENTE = 'S'

  AND PRO.AD_LOCALIZACAO IS NOT NULL
  AND INSTR(UPPER(PRO.AD_LOCALIZACAO), 'AR 02') > 0

ORDER BY
  TRUNC(CAB.DTALTER) DESC,
  ITE.NUNOTA DESC,
  ITE.SEQUENCIA ASC
  `.trim();

  const body = {
    serviceName: 'DbExplorerSP.executeQuery',
    requestBody: { sql },
  };

  try {
    const resp = await firstValueFrom(this.http.post(url, body, { headers }));
    const data = resp?.data;

    if (data?.status === '0') {
      const cod = data?.tsError?.tsErrorCode ? ` (${data.tsError.tsErrorCode})` : '';
      const msg = data?.statusMessage || 'Erro desconhecido retornado pelo Sankhya.';
      throw new HttpException(`ERRO NA CONSULTA${cod}: ${msg}`, HttpStatus.BAD_REQUEST);
    }

    const rows: any[] =
      data?.responseBody?.rows ??
      data?.responseBody?.result ??
      data?.rows ??
      [];

    // Ordem do SELECT:
    // 0 BKCOLOR
    // 1 FGCOLOR
    // 2 AD_TIPODEENTREGA
    // 3 TIPO_ENTREGA
    // 4 NUNOTA
    // 5 SEQUENCIA
    // 6 CODPROD
    // 7 DESCRPROD
    // 8 CODGRUPOPROD
    // 9 CODVOL
    // 10 QTDNEG
    // 11 VLRUNIT
    // 12 VLRTOT
    // 13 AD_LOCALIZACAO
    // 14 DTALTER
    // 15 HRALTER

    const mapped: ItemLoc2Row[] = (rows ?? []).map((r: any[]) => ({
      bkcolor: String(r?.[0] ?? '#ffffff'),
      fgcolor: String(r?.[1] ?? '#1a1a1a'),

      adTipoDeEntrega: r?.[2] != null ? String(r?.[2]) : null,
      tipoEntrega: String(r?.[3] ?? 'Não informado'),

      nunota: Number(r?.[4] ?? 0),
      sequencia: Number(r?.[5] ?? 0),

      codprod: Number(r?.[6] ?? 0),
      descrprod: String(r?.[7] ?? ''),

      codgrupoprod: Number(r?.[8] ?? 0),
      codvol: String(r?.[9] ?? ''),

      qtdneg: Number(r?.[10] ?? 0),
      vlrunit: Number(r?.[11] ?? 0),
      vlrtot: Number(r?.[12] ?? 0),

      localizacao2: r?.[13] != null ? String(r?.[13]) : null,

      dtalter: String(r?.[14] ?? ''),
      hralter: String(r?.[15] ?? ''),
    }));

    return mapped;
  } catch (err: any) {
    const status = err?.response?.status ?? HttpStatus.BAD_GATEWAY;
    const sankhyaData = err?.response?.data;

    const msg =
      sankhyaData?.statusMessage ||
      sankhyaData?.message ||
      err?.message ||
      'Falha ao chamar o serviço do Sankhya.';

    const cod = sankhyaData?.tsError?.tsErrorCode ? ` (${sankhyaData.tsError.tsErrorCode})` : '';

    throw new HttpException(`ERRO NA REQUISIÇÃO${cod}: ${msg}`, status);
  }
}


}
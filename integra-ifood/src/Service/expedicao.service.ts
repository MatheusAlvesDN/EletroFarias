import { HttpService } from "@nestjs/axios";
import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { firstValueFrom } from "rxjs";

export interface PedidoExpedicao {
  NUNOTA: number;
  NUMNOTA: number;
  PARCEIRO: string;
  VENDEDOR: string;
  DTALTER: string;
  HRALTER: string;
  TIPONEGOCIACAO: string;
  TIPO_ENTREGA: string;
  STATUS_NOTA_DESC: string;
  STATUS_CONFERENCIA_DESC: string;
  BKCOLOR: string;
  FGCOLOR: string;
  ORDEM_TIPO_PRI: number;
}

type NotaConferenciaRow = {
  ordemLinha: number;
  bkcolor: string;
  fgcolor: string;

  nunota: number;
  numnota: number;
  codtipoper: number;
  descroper: string;

  dtneg: string; // vem do oracle como data; pode vir string dependendo do driver
  hrneg: string;
  codparc: number;
  parceiro: string;
  vlrnota: number;

  codvend: number;
  vendedor: string;

  adTipoDeEntrega: string | null;
  tipoEntrega: string;

  statusNota: string;
  statusNotaDesc: string;
  adSeparacao: string;

  libconf: string | null;

  statusConferenciaCod: string | null;
  statusConferenciaDesc: string | null;

  qtdRegConferencia: number;
  codProj?: number;
  descProj?: string | null;
};

export type NotaExpedicaoRow = {
  nunota: number;
  ordemLinha: number;

  dtneg: string;
  hrneg: string;

  statusNota: string;
  statusNotaDesc: string; // ✅ novo

  statusConferenciaCod: string | null;
  qtdRegConferencia: number;

  bkcolor: string;
  fgcolor: string;

  vlrnota: number;
  adTipoDeEntrega: string | null;

  codvend: number;
  vendedor: string;

  codtipoper: number;

  parceiro: string;
};

export type NotaSeparacaoRow = {
  nunota: number;
  ordemLinha: number;

  dtneg: string;
  hrneg: string | null;

  statusNota: string;
  statusNotaDesc: string;

  statusConferenciaCod: string | null;
  statusConferenciaDesc: string | null;

  qtdRegConferencia: number;

  bkcolor: string;
  fgcolor: string;

  vlrnota: number;
  adTipoDeEntrega: string | null;

  codvend: number;
  vendedor: string;

  codtipoper: number;
  parceiro: string;
};


export type NotaDfariasRow = {
  nunota: number;
  ordemLinha: number;

  dtneg: string;
  hrneg: string | null;

  statusNota: string;
  statusNotaDesc: string;

  statusConferenciaCod: string | null;
  statusConferenciaDesc: string | null;

  qtdRegConferencia: number;

  bkcolor: string;
  fgcolor: string;

  vlrnota: number;
  adTipoDeEntrega: string | null;

  codvend: number;
  vendedor: string;

  codtipoper: number;
  parceiro: string;

  codproj: number;
  descproj: string;
};

export type NotaTVRow = {
  nunota: number;
  ordemLinha: number;

  bkcolor: string;
  fgcolor: string;

  dtneg: string;
  hrneg: string | null;

  numnota: number;
  codparc: number;
  parceiro: string;

  codvend: number;
  vendedor: string;

  codtipoper: number;

  adTipoDeEntrega: string | null;
  tipoEntrega: string;

  statusNota: string;
  statusNotaDesc: string;

  statusConferenciaCod: string | null;
  statusConferenciaDesc: string | null;

  qtdRegConferencia: number;
  vlrnota: number;
};





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
            AND CAB.CODTIPVENDA NOT IN (238, 239, 193, 235, 222, 241, 192, 176, 157, 162, 163, 156, 177, 159, 236, 237, 178, 161, 158, 160, 264)
            AND (CAB.AD_LIBERABOLETO = 'S' OR CAB.AD_LIBERACAIXA = 'S')
          )
          OR ((CAB.CODTIPOPER = 601 OR CAB.CODTIPOPER = 325)
            AND CAB.CODTIPVENDA IN (238, 239, 193, 235, 222, 241, 192, 176, 157, 162, 163, 156, 177, 159, 236, 237, 178, 161, 158, 160, 264)
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
            AND CAB.CODTIPVENDA NOT IN (238, 239, 193, 235, 222, 241, 192, 176, 157, 162, 163, 156, 177, 159, 236, 237, 178, 161, 158, 160, 264)
            AND (CAB.AD_LIBERABOLETO = 'S' OR CAB.AD_LIBERACAIXA = 'S')
          )
          OR ((CAB.CODTIPOPER = 601 OR CAB.CODTIPOPER = 325)
            AND CAB.CODTIPVENDA IN (238, 239, 193, 235, 222, 241, 192, 176, 157, 162, 163, 156, 177, 159, 236, 237, 178, 161, 158, 160, 264)
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
   AND (CAB.CODTIPOPER = 322 OR VEN.AD_TIPOTECNICO = 5)

  LEFT JOIN TCSPRJ PRJ
    ON PRJ.CODPROJ = CAB.CODPROJ

  LEFT JOIN TGFCON2 CON
    ON CON.NUNOTAORIG = CAB.NUNOTA

  WHERE (
          ((CAB.CODTIPOPER = 601 OR CAB.CODTIPOPER = 325)
            AND CAB.CODTIPVENDA NOT IN (238, 239, 193, 235, 222, 241, 192, 176, 157, 162, 163, 156, 177, 159, 236, 237, 178, 161, 158, 160, 264)
            AND (CAB.AD_LIBERABOLETO = 'S' OR CAB.AD_LIBERACAIXA = 'S')
          )
          OR ((CAB.CODTIPOPER = 601 OR CAB.CODTIPOPER = 325)
            AND CAB.CODTIPVENDA IN (238, 239, 193, 235, 222, 241, 192, 176, 157, 162, 163, 156, 177, 159, 236, 237, 178, 161, 158, 160, 264)
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
  NUNOTA,                 -- 0
  ORDEM_LINHA,            -- 1
  DTNEG,                  -- 2
  HRNEG,                  -- 3
  STATUS_NOTA,            -- 4
  STATUS_NOTA_DESC,       -- 5
  STATUS_CONFERENCIA_COD, -- 6
  STATUS_CONFERENCIA_DESC,-- 7
  QTD_REG_CONFERENCIA,    -- 8
  BKCOLOR,                -- 9
  FGCOLOR,                -- 10
  VLRNOTA,                -- 11
  AD_TIPODEENTREGA,       -- 12
  CODVEND,                -- 13
  VENDEDOR,               -- 14
  CODTIPOPER,             -- 15
  PARCEIRO,               -- 16
  CODPROJ,                -- 17
  DESCPROJ                -- 18
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
              AND CAB.CODTIPVENDA NOT IN (238, 239, 193, 235, 222, 241, 192, 176, 157, 162, 163, 156, 177, 159, 236, 237, 178, 161, 158, 160, 264)
              AND (CAB.AD_LIBERABOLETO = 'S' OR CAB.AD_LIBERACAIXA = 'S')
            )
            OR ((CAB.CODTIPOPER = 601 OR CAB.CODTIPOPER = 325)
              AND CAB.CODTIPVENDA IN (238, 239, 193, 235, 222, 241, 192, 176, 157, 162, 163, 156, 177, 159, 236, 237, 178, 161, 158, 160, 264)
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




}
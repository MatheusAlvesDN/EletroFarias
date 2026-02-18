'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';

// --- Tipos ---

type AnyObj = Record<string, any>;

type TopRow = {
  TOPS: string;
  QTD_NOTAS: number;
  DESCRICAO: string;
  VLR_TOTAL_ST: number;
  VLR_TOTAL_TB: number;
  VLR_TOTAL: number;
};

type TipoRow = {
  TIPO_COD: string;
  TIPO_DESC: string;

  FATOR_ST: number;
  FATOR_TRIB: number;

  TOT_VENDAS: number;
  TOT_VENDAS_ST: number;
  TOT_VENDAS_TRIB: number;

  TOT_IMP_ST: number;
  TOT_IMP_TRIB: number;
  TOT_IMPOSTOS: number;

  TOT_ST_PB: number;
  TOT_TRIB_PB: number;
  TOT_REST_ST: number;
  TOT_REST_TRIB: number;
};

type ParceiroRow = {
  CODPARC: number;
  NOMEPARC: string;
  AD_TIPOCLIENTEFATURAR: string;

  QTD_NOTAS: number;

  VLR_DEVOLUCAO: number;
  VLR_VENDAS: number;

  TOTAL: number;
  TOTAL_ST: number;
  TOTAL_TRIB: number;

  IMPOSTOST: number;
  IMPOSTOTRIB: number;
  IMPOSTOS: number;

  ST_IND_PB: number;
  TRIB_IND_PB: number;
  RESTANTE_ST: number;
  RESTANTE_TRIB: number;
  VALOR_RESTANTE: number;

  BK_ST?: string;
  FG_ST?: string;
  BK_TRIB?: string;
  FG_TRIB?: string;
};

type DetalheRow = {
  NUMNOTA: number;
  DTNEG: string;
  CODTIPOPER: number;
  VLRNOTA_AJUSTADO: number;
  IMPOSTOS: number; // percentual (0.07 / 0.10)
  CODEMP: number;
};

// --- Helpers ---

function toNumber(v: any): number {
  if (v == null) return 0;
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;

  const s0 = String(v).trim();
  if (!s0) return 0;

  // remove moeda / espaços / qualquer coisa que não seja dígito, sinal, ponto ou vírgula
  const s = s0.replace(/[^\d,.\-]/g, '');
  if (!s) return 0;

  // BR: 1.234.567,89
  if (s.includes(',') && s.includes('.')) {
    const br = s.replace(/\./g, '').replace(',', '.');
    const n = Number(br);
    return Number.isFinite(n) ? n : 0;
  }

  // BR: 1234,56
  if (s.includes(',') && !s.includes('.')) {
    const br = s.replace(',', '.');
    const n = Number(br);
    return Number.isFinite(n) ? n : 0;
  }

  // EN/num: 1234.56
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function normalizeKeysUpper(row: AnyObj): AnyObj {
  const out: AnyObj = {};
  for (const k of Object.keys(row || {})) out[String(k).toUpperCase()] = row[k];
  return out;
}

type Visao = 'top' | 'tipo' | 'parceiro' | 'detalhe';

function extractRows(payload: any, visao: Visao): AnyObj[] {
  if (!payload) return [];

  // 1) array de objetos
  if (Array.isArray(payload) && payload.length && typeof payload[0] === 'object' && !Array.isArray(payload[0])) {
    return payload.map(normalizeKeysUpper);
  }

  // 2) wrappers comuns
  const rb = payload.responseBody ?? payload.RESPONSEBODY ?? null;
  const candidate =
    payload.rows ??
    payload.ROWS ??
    payload.result ??
    payload.RESULT ??
    rb?.rows ??
    rb?.ROWS ??
    rb?.result ??
    rb?.RESULT ??
    payload;

  // 3) se candidate virou array de objetos
  if (Array.isArray(candidate) && candidate.length && typeof candidate[0] === 'object' && !Array.isArray(candidate[0])) {
    return candidate.map(normalizeKeysUpper);
  }

  // 4) Array de arrays (posicional)
  if (Array.isArray(candidate) && candidate.length && Array.isArray(candidate[0])) {
    return candidate.map((row: any[]) => {
      if (visao === 'top') {
        return normalizeKeysUpper({
          TOPS: row[0],
          QTD_NOTAS: row[1],
          DESCRICAO: row[2],
          VLR_TOTAL_ST: row[3],
          VLR_TOTAL_TB: row[4],
          VLR_TOTAL: row[5],
        });
      }

      if (visao === 'tipo') {
        // SELECT: TIPO_COD, TIPO_DESC, FATOR_ST, FATOR_TRIB, TOT_VENDAS,
        //        TOT_VENDAS_ST, TOT_VENDAS_TRIB, TOT_IMP_ST, TOT_IMP_TRIB,
        //        TOT_IMPOSTOS, TOT_ST_PB, TOT_TRIB_PB, TOT_REST_ST, TOT_REST_TRIB
        return normalizeKeysUpper({
          TIPO_COD: row[0],
          TIPO_DESC: row[1],
          FATOR_ST: row[2],
          FATOR_TRIB: row[3],
          TOT_VENDAS: row[4],
          TOT_VENDAS_ST: row[5],
          TOT_VENDAS_TRIB: row[6],
          TOT_IMP_ST: row[7],
          TOT_IMP_TRIB: row[8],
          TOT_IMPOSTOS: row[9],
          TOT_ST_PB: row[10],
          TOT_TRIB_PB: row[11],
          TOT_REST_ST: row[12],
          TOT_REST_TRIB: row[13],
        });
      }

      if (visao === 'parceiro') {
        // SELECT:
        // 0 codparc
        // 1 nomeparc
        // 2 AD_TIPOCLIENTEFATURAR
        // 3 VLR_VENDAS
        // 4 VLR_DEVOLUCAO
        // 5 IMPOSTOTRIB
        // 6 IMPOSTOST
        // 7 IMPOSTOS
        // 8 qtd_notas
        // 9 total
        // 10 total_st
        // 11 total_trib
        // 12 ST_IND_PB
        // 13 TRIB_IND_PB
        // 14 RESTANTE_ST
        // 15 RESTANTE_TRIB
        // 16 VALOR_RESTANTE
        // 17 BK_ST
        // 18 FG_ST
        // 19 BK_TRIB
        // 20 FG_TRIB
        return normalizeKeysUpper({
          CODPARC: row[0],
          NOMEPARC: row[1],
          AD_TIPOCLIENTEFATURAR: row[2],

          VLR_VENDAS: row[3],
          VLR_DEVOLUCAO: row[4],

          IMPOSTOTRIB: row[5],
          IMPOSTOST: row[6],
          IMPOSTOS: row[7],

          QTD_NOTAS: row[8],
          TOTAL: row[9],
          TOTAL_ST: row[10],
          TOTAL_TRIB: row[11],

          ST_IND_PB: row[12],
          TRIB_IND_PB: row[13],
          RESTANTE_ST: row[14],
          RESTANTE_TRIB: row[15],
          VALOR_RESTANTE: row[16],

          BK_ST: row[17],
          FG_ST: row[18],
          BK_TRIB: row[19],
          FG_TRIB: row[20],
        });
      }

      if (visao === 'detalhe') {
        // SELECT: NUMNOTA, DTNEG, CODTIPOPER, CODPARC, NOMEPARC, AD_TIPOCLIENTEFATURAR, IMPOSTOS, VLRNOTA_AJUSTADO, CODEMP
        return normalizeKeysUpper({
          NUMNOTA: row[0],
          DTNEG: row[1],
          CODTIPOPER: row[2],
          IMPOSTOS: row[6],
          VLRNOTA_AJUSTADO: row[7],
          CODEMP: row[8],
        });
      }

      return normalizeKeysUpper({});
    });
  }

  return [];
}

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return String(dateStr);
  return d.toLocaleDateString('pt-BR');
};

const formatPercent = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
    Number.isFinite(v) ? v : 0,
  );

// --- Componente Principal ---

export default function DashboardSankhya() {
  const [dtRef, setDtRef] = useState<string>(new Date().toISOString().slice(0, 7)); // YYYY-MM

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [dataTop, setDataTop] = useState<TopRow[]>([]);
  const [dataTipo, setDataTipo] = useState<TipoRow[]>([]);
  const [dataParc, setDataParc] = useState<ParceiroRow[]>([]);

  const [selectedParc, setSelectedParc] = useState<number | null>(null);
  const [dataDetalhe, setDataDetalhe] = useState<DetalheRow[]>([]);
  const [loadingDetalhe, setLoadingDetalhe] = useState(false);

  const API_BASE = useMemo(() => (process.env.NEXT_PUBLIC_API_URL ?? '').trim(), []);
  const DASH_URL = useMemo(() => {
    if (!API_BASE) return '/dash/relatorioSaidaIncentivoGerencia';
    return `${API_BASE.replace(/\/$/, '')}/dash/relatorioSaidaIncentivoGerencia`;
  }, [API_BASE]);

  const fetchVisao = useCallback(
    async (visao: Visao, codParc?: number) => {
      const params = new URLSearchParams();
      params.set('dtRef', `${dtRef}-01`);

      // mantém compatível com seu backend atual:
      // top => grid fatur mes passado por top
      // tipo => grid totais por tipo
      // parceiro => grid resumo por parc
      // detalhe => grid detalhe
      params.set('visao', visao === 'tipo' ? 'perfil' : visao);

      if (typeof codParc === 'number') params.set('codParc', String(codParc));

      const url = `${DASH_URL}?${params.toString()}`;
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      const text = await res.text();

      let json: any = null;
      try {
        json = JSON.parse(text);
      } catch {
        json = { _notJson: true, text };
      }

      if (!res.ok) throw new Error(`${visao} (Status ${res.status}): Falha ao buscar dados.`);

      return extractRows(json, visao);
    },
    [DASH_URL, dtRef],
  );

  // Load Resumo (Top, Tipo, Parceiros) - ORDEM IGUAL AO GADGET/DASHBOARD
  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);
      setSelectedParc(null);
      setDataDetalhe([]);

      try {
        const [topRaw, tipoRaw, parcRaw] = await Promise.all([
          fetchVisao('top'),
          fetchVisao('tipo'),
          fetchVisao('parceiro'),
        ]);

        setDataTop(
          topRaw.map((r) => ({
            TOPS: String(r.TOPS ?? ''),
            QTD_NOTAS: toNumber(r.QTD_NOTAS),
            DESCRICAO: String(r.DESCRICAO ?? ''),
            VLR_TOTAL_ST: toNumber(r.VLR_TOTAL_ST),
            VLR_TOTAL_TB: toNumber(r.VLR_TOTAL_TB),
            VLR_TOTAL: toNumber(r.VLR_TOTAL),
          })),
        );

        setDataTipo(
          tipoRaw.map((r) => ({
            TIPO_COD: String(r.TIPO_COD ?? ''),
            TIPO_DESC: String(r.TIPO_DESC ?? ''),

            FATOR_ST: toNumber(r.FATOR_ST),
            FATOR_TRIB: toNumber(r.FATOR_TRIB),

            TOT_VENDAS: toNumber(r.TOT_VENDAS),
            TOT_VENDAS_ST: toNumber(r.TOT_VENDAS_ST),
            TOT_VENDAS_TRIB: toNumber(r.TOT_VENDAS_TRIB),

            TOT_IMP_ST: toNumber(r.TOT_IMP_ST),
            TOT_IMP_TRIB: toNumber(r.TOT_IMP_TRIB),
            TOT_IMPOSTOS: toNumber(r.TOT_IMPOSTOS),

            TOT_ST_PB: toNumber(r.TOT_ST_PB),
            TOT_TRIB_PB: toNumber(r.TOT_TRIB_PB),
            TOT_REST_ST: toNumber(r.TOT_REST_ST),
            TOT_REST_TRIB: toNumber(r.TOT_REST_TRIB),
          })),
        );

        setDataParc(
          parcRaw.map((r) => ({
            CODPARC: toNumber(r.CODPARC),
            NOMEPARC: String(r.NOMEPARC ?? ''),
            AD_TIPOCLIENTEFATURAR: String(r.AD_TIPOCLIENTEFATURAR ?? ''),

            QTD_NOTAS: toNumber(r.QTD_NOTAS),

            VLR_DEVOLUCAO: toNumber(r.VLR_DEVOLUCAO),
            VLR_VENDAS: toNumber(r.VLR_VENDAS),

            TOTAL: toNumber(r.TOTAL),
            TOTAL_ST: toNumber(r.TOTAL_ST),
            TOTAL_TRIB: toNumber(r.TOTAL_TRIB),

            IMPOSTOST: toNumber(r.IMPOSTOST),
            IMPOSTOTRIB: toNumber(r.IMPOSTOTRIB),
            IMPOSTOS: toNumber(r.IMPOSTOS),

            ST_IND_PB: toNumber(r.ST_IND_PB),
            TRIB_IND_PB: toNumber(r.TRIB_IND_PB),
            RESTANTE_ST: toNumber(r.RESTANTE_ST),
            RESTANTE_TRIB: toNumber(r.RESTANTE_TRIB),
            VALOR_RESTANTE: toNumber(r.VALOR_RESTANTE),

            BK_ST: String(r.BK_ST ?? ''),
            FG_ST: String(r.FG_ST ?? ''),
            BK_TRIB: String(r.BK_TRIB ?? ''),
            FG_TRIB: String(r.FG_TRIB ?? ''),
          })),
        );
      } catch (e: any) {
        console.error(e);
        setError(e?.message ?? 'Ocorreu um erro ao carregar o painel.');
        setDataTop([]);
        setDataTipo([]);
        setDataParc([]);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [dtRef, fetchVisao]);

  // Load Detalhe
  useEffect(() => {
    if (!selectedParc) return;

    const run = async () => {
      setLoadingDetalhe(true);
      try {
        const detRaw = await fetchVisao('detalhe', selectedParc);
        setDataDetalhe(
          detRaw.map((r) => ({
            NUMNOTA: toNumber(r.NUMNOTA),
            DTNEG: String(r.DTNEG ?? ''),
            CODTIPOPER: toNumber(r.CODTIPOPER),
            IMPOSTOS: toNumber(r.IMPOSTOS),
            VLRNOTA_AJUSTADO: toNumber(r.VLRNOTA_AJUSTADO),
            CODEMP: toNumber(r.CODEMP),
          })),
        );
      } catch (e) {
        console.error(e);
        setDataDetalhe([]);
      } finally {
        setLoadingDetalhe(false);
      }
    };

    run();
  }, [selectedParc, fetchVisao]);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-12">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-indigo-900 tracking-tight">Painel Gerencial</h1>
            <p className="text-sm text-slate-500">Incentivos fiscais e saídas consolidadas</p>
          </div>

          <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-lg border border-slate-200">
            <label className="text-sm font-semibold text-slate-600 uppercase tracking-wider">Competência</label>
            <input
              type="month"
              value={dtRef}
              onChange={(e) => setDtRef(e.target.value)}
              className="bg-transparent text-slate-900 font-medium focus:outline-none cursor-pointer"
            />
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-r shadow-sm">
            <p className="font-bold">Atenção</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col justify-center items-center h-64 space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-200 border-t-indigo-600" />
            <p className="text-slate-500 font-medium animate-pulse">Carregando indicadores...</p>
          </div>
        ) : (
          <>
            {/* 1) FATURAMENTO (MÊS PASSADO) POR TOP  +  2) TOTAIS POR TIPO */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              {/* TOP */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-full">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 rounded-t-xl">
                  <h2 className="text-lg font-bold text-slate-700">Faturamento (Mês Passado) por TOP</h2>
                </div>

                <div className="overflow-auto flex-1">
                  <table className="min-w-full divide-y divide-slate-100">
                    <thead className="bg-slate-50 sticky top-0 z-10">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">TOP</th>
                        <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Qte notas</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Descrição</th>
                        <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Valor total ST</th>
                        <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Valor total TB</th>
                        <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Valor total</th>
                      </tr>
                    </thead>

                    <tbody className="bg-white divide-y divide-slate-100">
                      {dataTop.map((row, idx) => (
                        <tr key={`${row.TOPS}-${idx}`} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-3 text-sm font-medium text-slate-900">{row.TOPS}</td>
                          <td className="px-6 py-3 text-sm text-slate-600 text-right">{row.QTD_NOTAS}</td>
                          <td className="px-6 py-3 text-sm text-slate-600">{row.DESCRICAO}</td>
                          <td className="px-6 py-3 text-sm text-slate-700 text-right">{formatCurrency(row.VLR_TOTAL_ST)}</td>
                          <td className="px-6 py-3 text-sm text-slate-700 text-right">{formatCurrency(row.VLR_TOTAL_TB)}</td>
                          <td className="px-6 py-3 text-sm font-bold text-indigo-700 text-right">{formatCurrency(row.VLR_TOTAL)}</td>
                        </tr>
                      ))}
                      {dataTop.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                            Sem dados.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* TIPO */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-full">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 rounded-t-xl">
                  <h2 className="text-lg font-bold text-slate-700">Totais por Tipo</h2>
                </div>

                <div className="overflow-auto flex-1">
                  <table className="min-w-full divide-y divide-slate-100">
                    <thead className="bg-slate-50 sticky top-0 z-10">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Tipo</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Perfil</th>
                        <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Total ST (R$)</th>
                        <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">
                          Total Tributado (R$)
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">
                          Total Vendas (R$)
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Fator ST (R$)</th>
                        <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">
                          Fator Trib (R$)
                        </th>
                      </tr>
                    </thead>

                    <tbody className="bg-white divide-y divide-slate-100">
                      {dataTipo.map((row, idx) => (
                        <tr key={`${row.TIPO_COD}-${idx}`} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-3 text-sm text-slate-500">{row.TIPO_COD}</td>
                          <td className="px-6 py-3 text-sm text-slate-900 font-medium">{row.TIPO_DESC}</td>
                          <td className="px-6 py-3 text-sm text-slate-700 text-right">{formatCurrency(row.TOT_VENDAS_ST)}</td>
                          <td className="px-6 py-3 text-sm text-slate-700 text-right">{formatCurrency(row.TOT_VENDAS_TRIB)}</td>
                          <td className="px-6 py-3 text-sm font-bold text-indigo-700 text-right">{formatCurrency(row.TOT_VENDAS)}</td>
                          <td className="px-6 py-3 text-sm text-slate-700 text-right">{formatCurrency(row.FATOR_ST)}</td>
                          <td className="px-6 py-3 text-sm text-slate-700 text-right">{formatCurrency(row.FATOR_TRIB)}</td>
                        </tr>
                      ))}
                      {dataTipo.length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                            Sem dados.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* 3) RESUMO POR PARCEIRO (MÊS ATUAL) - ORDEM IGUAL AO GRID DO GADGET */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-bold text-slate-700">Resumo por Parceiro (Mês Atual)</h2>
                  <p className="text-xs text-slate-500 mt-1">Ordem das colunas igual ao dashboard do gadget.</p>
                </div>
                <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
                  Clique na linha para detalhar
                </span>
              </div>

              <div className="overflow-x-auto max-h-[600px]">
                <table className="min-w-full divide-y divide-slate-100">
                  <thead className="bg-slate-50 sticky top-0 shadow-sm z-10">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Cód.</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Parceiro</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Tipo Cliente Faturar
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Qtd. Notas</th>
                      <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Valor Devolução (R$)
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Valor Total Vendas (R$)
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Total Líquido (R$)
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Total ST (R$)</th>
                      <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Total Trib. (R$)
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Imposto ST (R$)
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Imposto Tributado (R$)
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Impostos (R$)</th>
                    </tr>
                  </thead>

                  <tbody className="bg-white divide-y divide-slate-100">
                    {dataParc.map((row) => {
                      const isSelected = selectedParc === row.CODPARC;

                      return (
                        <tr
                          key={row.CODPARC}
                          onClick={() => setSelectedParc(isSelected ? null : row.CODPARC)}
                          className={`cursor-pointer transition-all duration-200 ${
                            isSelected
                              ? 'bg-indigo-50 border-l-4 border-l-indigo-500'
                              : 'hover:bg-slate-50 border-l-4 border-l-transparent'
                          }`}
                        >
                          <td className="px-6 py-3 text-sm text-slate-600">{row.CODPARC}</td>

                          <td className="px-6 py-3">
                            <div className="text-sm font-bold text-slate-900">{row.NOMEPARC}</div>
                          </td>

                          <td className="px-6 py-3 text-sm text-slate-600">{row.AD_TIPOCLIENTEFATURAR}</td>

                          <td className="px-6 py-3 text-sm text-slate-700 text-right">{row.QTD_NOTAS}</td>

                          <td className="px-6 py-3 text-sm text-right text-red-600 font-medium">
                            {formatCurrency(row.VLR_DEVOLUCAO)}
                          </td>

                          <td className="px-6 py-3 text-sm text-right text-green-700 font-medium">
                            {formatCurrency(row.VLR_VENDAS)}
                          </td>

                          <td className="px-6 py-3 text-sm text-right font-bold text-slate-900">
                            {formatCurrency(row.TOTAL)}
                          </td>

                          <td className="px-6 py-3 text-sm text-right text-slate-800">{formatCurrency(row.TOTAL_ST)}</td>
                          <td className="px-6 py-3 text-sm text-right text-slate-800">{formatCurrency(row.TOTAL_TRIB)}</td>

                          <td className="px-6 py-3 text-sm text-right text-slate-800">{formatCurrency(row.IMPOSTOST)}</td>
                          <td className="px-6 py-3 text-sm text-right text-slate-800">{formatCurrency(row.IMPOSTOTRIB)}</td>

                          <td className="px-6 py-3 text-sm text-right font-extrabold text-indigo-700">
                            {formatCurrency(row.IMPOSTOS)}
                          </td>
                        </tr>
                      );
                    })}

                    {dataParc.length === 0 && (
                      <tr>
                        <td colSpan={12} className="px-6 py-12 text-center text-slate-400">
                          Nenhum parceiro encontrado neste período.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 4) DETALHE (SLIDE DOWN) */}
            {selectedParc && (
              <div className="animate-fade-in-up bg-indigo-50 rounded-xl border border-indigo-100 overflow-hidden shadow-inner">
                <div className="px-6 py-4 flex flex-col sm:flex-row justify-between items-center border-b border-indigo-200/50 bg-indigo-100/30">
                  <div className="flex items-center gap-2 mb-2 sm:mb-0">
                    <div className="h-8 w-8 rounded bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                      {selectedParc}
                    </div>
                    <div>
                      <h3 className="text-md font-bold text-indigo-900">Detalhamento de Notas</h3>
                      <p className="text-xs text-indigo-700">Visualizando notas do parceiro selecionado</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedParc(null)}
                    className="text-xs font-semibold px-4 py-2 bg-white text-indigo-600 border border-indigo-200 rounded-lg shadow-sm hover:bg-indigo-50 hover:text-indigo-800 transition-colors"
                  >
                    Fechar Detalhe
                  </button>
                </div>

                {loadingDetalhe ? (
                  <div className="py-12 flex justify-center text-indigo-400">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-indigo-200/50">
                      <thead className="bg-indigo-100/50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-bold text-indigo-800 uppercase tracking-wider">
                            Nº Nota
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-bold text-indigo-800 uppercase tracking-wider">
                            Dt. Neg.
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-bold text-indigo-800 uppercase tracking-wider">
                            TOP
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-bold text-indigo-800 uppercase tracking-wider">
                            Valor Líquido
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-bold text-indigo-800 uppercase tracking-wider">
                            Impostos
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-bold text-indigo-800 uppercase tracking-wider">
                            Empresa
                          </th>
                        </tr>
                      </thead>

                      <tbody className="bg-white divide-y divide-indigo-50">
                        {dataDetalhe.map((nota, idx) => (
                          <tr key={`${nota.NUMNOTA}-${idx}`} className="hover:bg-indigo-50/30 transition-colors">
                            <td className="px-6 py-3 text-sm font-medium text-slate-700">{nota.NUMNOTA}</td>
                            <td className="px-6 py-3 text-sm text-slate-600">{formatDate(nota.DTNEG)}</td>
                            <td className="px-6 py-3 text-sm text-center text-slate-500 bg-slate-50 rounded mx-auto">
                              {nota.CODTIPOPER}
                            </td>
                            <td className="px-6 py-3 text-sm text-slate-900 font-bold text-right">
                              {formatCurrency(nota.VLRNOTA_AJUSTADO)}
                            </td>
                            <td className="px-6 py-3 text-sm text-slate-700 text-right">{formatPercent(nota.IMPOSTOS)}</td>
                            <td className="px-6 py-3 text-sm text-slate-700 text-right">{nota.CODEMP}</td>
                          </tr>
                        ))}

                        {dataDetalhe.length === 0 && (
                          <tr>
                            <td colSpan={6} className="px-6 py-8 text-center text-indigo-400">
                              Nenhuma nota encontrada.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* animação usada no detalhe */}
      <style jsx global>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translate3d(0, 8px, 0);
          }
          to {
            opacity: 1;
            transform: translate3d(0, 0, 0);
          }
        }
        .animate-fade-in-up {
          animation: fadeInUp 180ms ease-out;
        }
      `}</style>
    </div>
  );
}


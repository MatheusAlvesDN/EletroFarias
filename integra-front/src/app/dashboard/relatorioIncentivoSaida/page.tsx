'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';

type AnyObj = Record<string, any>;

type TopRow = {
  TOPS: string;
  QTD_NOTAS: number;
  DESCRICAO: string;
  VLR_TOTAL_ST: number;
  VLR_TOTAL_TB: number;
  VLR_TOTAL: number;
};

type PerfilRow = {
  TIPO_COD: string;
  TIPO_DESC: string;
  TOT_VENDAS: number;
  TOT_IMPOSTOS: number;
};

type ParceiroRow = {
  CODPARC: number;
  NOMEPARC: string;
  AD_TIPOCLIENTEFATURAR: string;
  VLR_VENDAS: number;
  VLR_DEVOLUCAO: number;
  IMPOSTOS: number;
};

type DetalheRow = {
  NUMNOTA: number;
  DTNEG: string;
  CODTIPOPER: number;
  VLRNOTA_AJUSTADO: number;
};

function toNumber(v: any): number {
  if (v == null) return 0;
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  if (typeof v === 'string') {
    const s = v.trim();
    if (!s) return 0;
    const br = s.replace(/\./g, '').replace(',', '.');
    const n1 = Number(br);
    if (Number.isFinite(n1)) return n1;
    const n2 = Number(s);
    return Number.isFinite(n2) ? n2 : 0;
  }
  return 0;
}

function normalizeKeysUpper(row: AnyObj): AnyObj {
  const out: AnyObj = {};
  for (const k of Object.keys(row || {})) out[String(k).toUpperCase()] = row[k];
  return out;
}

/**
 * ✅ Agora suporta o seu caso real: payload vindo como ARRAY DE ARRAYS
 * e mapeia pela ordem exata das colunas do gadget.
 */
function extractRows(payload: any, visao: 'top' | 'perfil' | 'parceiro' | 'detalhe'): AnyObj[] {
  if (!payload) return [];

  // 1) array de objetos
  if (
    Array.isArray(payload) &&
    payload.length &&
    typeof payload[0] === 'object' &&
    !Array.isArray(payload[0])
  ) {
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
  if (
    Array.isArray(candidate) &&
    candidate.length &&
    typeof candidate[0] === 'object' &&
    !Array.isArray(candidate[0])
  ) {
    return candidate.map(normalizeKeysUpper);
  }

  // 4) ✅ SEU CASO: array de arrays (posicional)
  if (Array.isArray(candidate) && candidate.length && Array.isArray(candidate[0])) {
    return candidate.map((row: any[]) => {
      if (visao === 'top') {
        // SELECT: TOPS, QTD_NOTAS, DESCRICAO, VLR_TOTAL_ST, VLR_TOTAL_TB, VLR_TOTAL
        return normalizeKeysUpper({
          TOPS: row[0],
          QTD_NOTAS: row[1],
          DESCRICAO: row[2],
          VLR_TOTAL_ST: row[3],
          VLR_TOTAL_TB: row[4],
          VLR_TOTAL: row[5],
        });
      }

      if (visao === 'perfil') {
        // SELECT final do gadget "grd_totais_por_tipo"
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
        // SELECT do gadget "grd_resumo_por_parc":
        // codparc, nomeparc, ad_tipoclientefaturar, VLR_VENDAS, VLR_DEVOLUCAO, IMPOSTOS, ...
        return normalizeKeysUpper({
          CODPARC: row[0],
          NOMEPARC: row[1],
          AD_TIPOCLIENTEFATURAR: row[2],
          VLR_VENDAS: row[3],
          VLR_DEVOLUCAO: row[4],
          IMPOSTOS: row[5],
        });
      }

      if (visao === 'detalhe') {
        // SELECT do gadget lvl_detalhe:
        // NUMNOTA, DTNEG, CODTIPOPER, CODPARC, NOMEPARC, AD_TIPOCLIENTEFATURAR, IMPOSTOS, VLRNOTA_AJUSTADO, CODEMP
        return normalizeKeysUpper({
          NUMNOTA: row[0],
          DTNEG: row[1],
          CODTIPOPER: row[2],
          VLRNOTA_AJUSTADO: row[7],
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

type DebugInfo = {
  url: string;
  status: number;
  ok: boolean;
  rawPreview: string;
  rowsExtracted: number;
  firstRowKeys: string[];
};

export default function DashboardSankhya() {
  const [dtRef, setDtRef] = useState<string>(new Date().toISOString().slice(0, 7)); // YYYY-MM

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [dataTop, setDataTop] = useState<TopRow[]>([]);
  const [dataPerfil, setDataPerfil] = useState<PerfilRow[]>([]);
  const [dataParc, setDataParc] = useState<ParceiroRow[]>([]);

  const [selectedParc, setSelectedParc] = useState<number | null>(null);
  const [dataDetalhe, setDataDetalhe] = useState<DetalheRow[]>([]);
  const [loadingDetalhe, setLoadingDetalhe] = useState(false);

  // DEBUG
  const [dbgTop, setDbgTop] = useState<DebugInfo | null>(null);
  const [dbgPerfil, setDbgPerfil] = useState<DebugInfo | null>(null);
  const [dbgParc, setDbgParc] = useState<DebugInfo | null>(null);
  const [dbgDet, setDbgDet] = useState<DebugInfo | null>(null);

  const debugCards: Array<readonly ['top' | 'perfil' | 'parceiro', DebugInfo | null]> = [
    ['top', dbgTop],
    ['perfil', dbgPerfil],
    ['parceiro', dbgParc],
  ] as const;

  const API_BASE = useMemo(() => (process.env.NEXT_PUBLIC_API_URL ?? '').trim(), []);
  const DASH_URL = useMemo(() => {
    if (!API_BASE) return '/dash/relatorioSaidaIncentivoGerencia';
    return `${API_BASE.replace(/\/$/, '')}/dash/relatorioSaidaIncentivoGerencia`;
  }, [API_BASE]);

  const fetchVisao = useCallback(
    async (visao: 'top' | 'perfil' | 'parceiro' | 'detalhe', codParc?: number) => {
      const params = new URLSearchParams();
      params.set('dtRef', `${dtRef}-01`);
      params.set('visao', visao);
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

      // ✅ CORREÇÃO: agora passa visao
      const rows = extractRows(json, visao);

      const info: DebugInfo = {
        url,
        status: res.status,
        ok: res.ok,
        rawPreview: text.slice(0, 1200),
        rowsExtracted: rows.length,
        firstRowKeys: rows[0] ? Object.keys(rows[0]) : [],
      };

      if (visao === 'top') setDbgTop(info);
      if (visao === 'perfil') setDbgPerfil(info);
      if (visao === 'parceiro') setDbgParc(info);
      if (visao === 'detalhe') setDbgDet(info);

      if (!res.ok) throw new Error(`${visao} -> ${res.status}: ${info.rawPreview}`);

      return rows;
    },
    [DASH_URL, dtRef],
  );

  // Load resumo
  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);
      setSelectedParc(null);
      setDataDetalhe([]);
      setDbgDet(null);

      try {
        const [topRaw, perfilRaw, parcRaw] = await Promise.all([
          fetchVisao('top'),
          fetchVisao('perfil'),
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

        setDataPerfil(
          perfilRaw.map((r) => ({
            TIPO_COD: String(r.TIPO_COD ?? ''),
            TIPO_DESC: String(r.TIPO_DESC ?? ''),
            TOT_VENDAS: toNumber(r.TOT_VENDAS),
            TOT_IMPOSTOS: toNumber(r.TOT_IMPOSTOS),
          })),
        );

        setDataParc(
          parcRaw.map((r) => ({
            CODPARC: toNumber(r.CODPARC),
            NOMEPARC: String(r.NOMEPARC ?? ''),
            AD_TIPOCLIENTEFATURAR: String(r.AD_TIPOCLIENTEFATURAR ?? ''),
            VLR_VENDAS: toNumber(r.VLR_VENDAS),
            VLR_DEVOLUCAO: toNumber(r.VLR_DEVOLUCAO),
            IMPOSTOS: toNumber(r.IMPOSTOS),
          })),
        );
      } catch (e: any) {
        console.error(e);
        setError(e?.message ?? 'Erro ao carregar dados.');
        setDataTop([]);
        setDataPerfil([]);
        setDataParc([]);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [dtRef, fetchVisao]);

  // Load detalhe
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
            VLRNOTA_AJUSTADO: toNumber(r.VLRNOTA_AJUSTADO),
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
    <div className="min-h-screen bg-gray-50 p-6 font-sans text-gray-800">
      <header className="mb-4 flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div>
          <h1 className="text-2xl font-bold text-blue-900">Painel de Incentivos (Gerência)</h1>
          <p className="text-sm text-gray-500">Visão consolidada de saídas e impostos</p>
        </div>
        <div className="mt-4 md:mt-0 flex items-center gap-2">
          <label className="font-semibold text-gray-700">Competência:</label>
          <input
            type="month"
            value={dtRef}
            onChange={(e) => setDtRef(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
      </header>

      {/* DEBUG BOX */}
      <div className="mb-6 bg-white border border-gray-200 rounded-lg p-4 text-xs">
        <div className="font-bold text-gray-700 mb-2">Debug (o que o backend está devolvendo)</div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {debugCards.map(([name, dbg]) => (
            <div key={name} className="border rounded p-3">
              <div className="font-semibold mb-1">{name}</div>

              {!dbg ? (
                <div className="text-gray-500">sem chamada ainda</div>
              ) : (
                <>
                  <div>
                    <span className="text-gray-500">status:</span> {dbg.status} {dbg.ok ? 'OK' : 'ERRO'}
                  </div>
                  <div>
                    <span className="text-gray-500">rows extraídas:</span> {dbg.rowsExtracted}
                  </div>
                  <div>
                    <span className="text-gray-500">keys 1ª row:</span> {dbg.firstRowKeys.join(', ') || '-'}
                  </div>
                  <div className="mt-2 text-gray-500 break-all">{dbg.url}</div>
                  <pre className="mt-2 whitespace-pre-wrap break-words bg-gray-50 p-2 rounded max-h-40 overflow-auto">
                    {dbg.rawPreview}
                  </pre>
                </>
              )}
            </div>
          ))}
        </div>

        {dbgDet && (
          <div className="mt-3 border rounded p-3">
            <div className="font-semibold mb-1">detalhe</div>
            <div>
              <span className="text-gray-500">status:</span> {dbgDet.status} {dbgDet.ok ? 'OK' : 'ERRO'}
            </div>
            <div>
              <span className="text-gray-500">rows extraídas:</span> {dbgDet.rowsExtracted}
            </div>
            <div>
              <span className="text-gray-500">keys 1ª row:</span> {dbgDet.firstRowKeys.join(', ') || '-'}
            </div>
            <div className="mt-2 text-gray-500 break-all">{dbgDet.url}</div>
            <pre className="mt-2 whitespace-pre-wrap break-words bg-gray-50 p-2 rounded max-h-40 overflow-auto">
              {dbgDet.rawPreview}
            </pre>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6">
          <p className="font-medium">Erro</p>
          <p className="text-sm whitespace-pre-wrap">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* TOP + PERFIL */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* TOP */}
            <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
              <div className="bg-gray-100 px-4 py-3 border-b border-gray-200">
                <h2 className="font-bold text-gray-700">Resumo por TOP (Mês Anterior)</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-gray-600 font-medium">
                    <tr>
                      <th className="px-4 py-2">TOP</th>
                      <th className="px-4 py-2">Descrição</th>
                      <th className="px-4 py-2 text-right">Qtd</th>
                      <th className="px-4 py-2 text-right">ST</th>
                      <th className="px-4 py-2 text-right">TRIB</th>
                      <th className="px-4 py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dataTop.length ? (
                      dataTop.map((row, idx) => (
                        <tr key={idx} className="border-t hover:bg-gray-50">
                          <td className="px-4 py-2">{row.TOPS}</td>
                          <td className="px-4 py-2">{row.DESCRICAO}</td>
                          <td className="px-4 py-2 text-right">{row.QTD_NOTAS}</td>
                          <td className="px-4 py-2 text-right">{formatCurrency(row.VLR_TOTAL_ST)}</td>
                          <td className="px-4 py-2 text-right">{formatCurrency(row.VLR_TOTAL_TB)}</td>
                          <td className="px-4 py-2 text-right font-medium">{formatCurrency(row.VLR_TOTAL)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-4 py-10 text-center text-gray-500">
                          Sem dados para o período.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* PERFIL */}
            <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
              <div className="bg-gray-100 px-4 py-3 border-b border-gray-200">
                <h2 className="font-bold text-gray-700">Totais por Perfil</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-gray-600 font-medium">
                    <tr>
                      <th className="px-4 py-2">Tipo</th>
                      <th className="px-4 py-2">Perfil</th>
                      <th className="px-4 py-2 text-right">Tot. Vendas</th>
                      <th className="px-4 py-2 text-right">Tot. Impostos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dataPerfil.length ? (
                      dataPerfil.map((row, idx) => (
                        <tr key={idx} className="border-t hover:bg-gray-50">
                          <td className="px-4 py-2 text-gray-500">{row.TIPO_COD}</td>
                          <td className="px-4 py-2">{row.TIPO_DESC}</td>
                          <td className="px-4 py-2 text-right">{formatCurrency(row.TOT_VENDAS)}</td>
                          <td className="px-4 py-2 text-right text-red-600 font-medium">
                            {formatCurrency(row.TOT_IMPOSTOS)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-4 py-10 text-center text-gray-500">
                          Sem dados para o período.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* PARCEIROS */}
          <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
            <div className="bg-gray-100 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
              <h2 className="font-bold text-gray-700">Vendas por Parceiro</h2>
              <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                Clique na linha para detalhar
              </span>
            </div>
            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-600 font-medium sticky top-0 shadow-sm z-10">
                  <tr>
                    <th className="px-4 py-2">Cód.</th>
                    <th className="px-4 py-2">Parceiro</th>
                    <th className="px-4 py-2">Perfil</th>
                    <th className="px-4 py-2 text-right">Vlr. Vendas</th>
                    <th className="px-4 py-2 text-right">Vlr. Devolução</th>
                    <th className="px-4 py-2 text-right">Impostos</th>
                  </tr>
                </thead>
                <tbody>
                  {dataParc.length ? (
                    dataParc.map((row) => (
                      <tr
                        key={row.CODPARC}
                        onClick={() => setSelectedParc(row.CODPARC === selectedParc ? null : row.CODPARC)}
                        className={`border-t cursor-pointer transition-colors duration-150 ${
                          selectedParc === row.CODPARC
                            ? 'bg-blue-100 ring-2 ring-inset ring-blue-300'
                            : 'hover:bg-blue-50'
                        }`}
                      >
                        <td className="px-4 py-2 text-gray-500">{row.CODPARC}</td>
                        <td className="px-4 py-2 font-medium text-gray-900">{row.NOMEPARC}</td>
                        <td className="px-4 py-2 text-gray-600">{row.AD_TIPOCLIENTEFATURAR}</td>
                        <td className="px-4 py-2 text-right text-green-700">{formatCurrency(row.VLR_VENDAS)}</td>
                        <td className="px-4 py-2 text-right text-red-500">{formatCurrency(row.VLR_DEVOLUCAO)}</td>
                        <td className="px-4 py-2 text-right font-bold text-gray-800">{formatCurrency(row.IMPOSTOS)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-gray-500">
                        Sem dados para o período.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* DETALHE */}
          {selectedParc && (
            <div className="bg-blue-50 rounded-lg shadow-inner border border-blue-200 p-4">
              <div className="flex justify-between items-center mb-4 border-b border-blue-200 pb-2">
                <h3 className="text-lg font-bold text-blue-900">
                  Detalhe de Notas: <span className="text-blue-600">Cód. {selectedParc}</span>
                </h3>
                <button
                  onClick={() => setSelectedParc(null)}
                  className="text-sm px-3 py-1 rounded bg-white border border-blue-300 text-blue-700 hover:bg-blue-100"
                >
                  Fechar Detalhe
                </button>
              </div>

              {loadingDetalhe ? (
                <div className="py-8 text-center text-blue-800">Carregando notas fiscais...</div>
              ) : (
                <div className="overflow-x-auto bg-white rounded border border-blue-100">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-blue-100 text-blue-900 font-semibold">
                      <tr>
                        <th className="px-4 py-2">Nº Nota</th>
                        <th className="px-4 py-2">Dt. Neg.</th>
                        <th className="px-4 py-2 text-center">TOP</th>
                        <th className="px-4 py-2 text-right">Valor Líquido</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dataDetalhe.length ? (
                        dataDetalhe.map((nota, idx) => (
                          <tr key={idx} className="border-t hover:bg-blue-50">
                            <td className="px-4 py-2">{nota.NUMNOTA}</td>
                            <td className="px-4 py-2">{formatDate(nota.DTNEG)}</td>
                            <td className="px-4 py-2 text-center">{nota.CODTIPOPER}</td>
                            <td className="px-4 py-2 text-right font-medium">
                              {formatCurrency(nota.VLRNOTA_AJUSTADO)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                            Nenhuma nota encontrada para este período.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

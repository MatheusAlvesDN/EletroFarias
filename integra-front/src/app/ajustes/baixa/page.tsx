'use client';
import DashboardLayout from '@/components/DashboardLayout';

import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Menu,
  Server,
  Search,
  Loader2,
  AlertCircle,
  CheckCircle2,
  X,
  RotateCw,
  ListCollapse,
  ChevronDown,
  ChevronUp,
  Check,
  XCircle
} from 'lucide-react';

import SidebarMenu from '@/components/SidebarMenu';
import { usePersistedState } from '@/hooks/userPersistedState';
import { useRequireAuth } from '@/hooks/useRequireAuth';

type SolicitacaoProduto = {
  codProduto: number;
  quantidade: number;
  descricao: string;
};

type SolicitacaoGroup = {
  id: string;
  userRequest: string;
  createdAt: string;
  aprovado: boolean;
  produtos: SolicitacaoProduto[];
  raw?: unknown;
};

const ROWS_PER_PAGE = 10;

const toStringSafe = (v: unknown): string => (v == null ? '' : String(v));

const toNumberSafe = (v: unknown): number => {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const n = Number(v);
    return Number.isFinite(n) ? n : NaN;
  }
  return NaN;
};

const toBoolSafe = (v: unknown): boolean => {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase();
    if (s === 'true' || s === '1' || s === 'sim' || s === 's') return true;
    if (s === 'false' || s === '0' || s === 'nao' || s === 'não' || s === 'n') return false;
  }
  return false;
};

// helper: extrair email do JWT (client-safe)
const getEmailFromJwt = (jwt: string | null): string | null => {
  if (!jwt) return null;
  try {
    const parts = jwt.split('.');
    if (parts.length < 2) return null;

    const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = payloadBase64.padEnd(payloadBase64.length + ((4 - (payloadBase64.length % 4)) % 4), '=');

    const jsonPayload = atob(padded);
    const payload = JSON.parse(jsonPayload) as {
      email?: string;
      userEmail?: string;
      sub?: string;
      [k: string]: unknown;
    };

    const email = (payload.email ?? payload.userEmail ?? payload.sub ?? '') as string;
    const cleaned = String(email).trim();
    return cleaned ? cleaned : null;
  } catch {
    return null;
  }
};

function formatDateTime(iso?: string | null) {
  if (!iso) return '-';
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return String(iso);
  return dt.toLocaleString('pt-BR');
}

/**
 * Normaliza produtos priorizando o novo modelo:
 * solicitacao.itemSolicitacao[] (codProd, quantidade, descricao)
 * mas aceita variações de chave e também o formato antigo "flat".
 */
function normalizeProdutos(rec: Record<string, unknown>): SolicitacaoProduto[] {
  const maybeArray =
    rec.itemSolicitacao ??
    rec.ITEMSOLICITACAO ??
    rec.itemSolicitacoes ??
    rec.ITEMSOLICITACOES ??
    rec.itensSolicitacao ??
    rec.ITENSSOLICITACAO ??
    rec.itens ??
    rec.ITENS ??
    rec.items ??
    rec.ITEMS ??
    rec.produtos ??
    rec.PRODUTOS;

  if (Array.isArray(maybeArray)) {
    return maybeArray
      .map((p) => {
        const obj = p && typeof p === 'object' ? (p as Record<string, unknown>) : {};

        const codProduto = toNumberSafe(
          obj.codProduto ??
            obj.CODPRODUTO ??
            obj.codProd ??
            obj.CODPROD ??
            obj.codigo ??
            obj.CODIGO
        );

        const quantidade = toNumberSafe(
          obj.quantidade ??
            obj.QUANTIDADE ??
            obj.qtd ??
            obj.QTD ??
            obj.count ??
            obj.COUNT
        );

        const descricao = toStringSafe(
          obj.descricao ??
            obj.DESCRICAO ??
            obj.desc ??
            obj.DESC ??
            obj.descrprod ??
            obj.DESCRPROD ??
            ''
        ).trim();

        if (!Number.isFinite(codProduto)) return null;

        return {
          codProduto,
          quantidade: Number.isFinite(quantidade) ? quantidade : 1,
          descricao: descricao || '-',
        } as SolicitacaoProduto;
      })
      .filter((x): x is SolicitacaoProduto => !!x);
  }

  // formato antigo (flat)
  const codProduto = toNumberSafe(
    rec.codProd ??
      rec.CODPROD ??
      rec.codProduto ??
      rec.CODPRODUTO ??
      rec.codigo ??
      rec.CODIGO
  );

  if (!Number.isFinite(codProduto)) return [];

  const quantidade = toNumberSafe(rec.quantidade ?? rec.QUANTIDADE ?? rec.qtd ?? rec.QTD ?? 1);

  const descricao = toStringSafe(
    rec.descricao ??
      rec.DESCRICAO ??
      rec.desc ??
      rec.DESC ??
      rec.descrprod ??
      rec.DESCRPROD ??
      ''
  ).trim();

  return [
    {
      codProduto,
      quantidade: Number.isFinite(quantidade) ? quantidade : 1,
      descricao: descricao || '-',
    },
  ];
}

export default function Page() {
  const { token, ready, hasAccess } = useRequireAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [items, setItems] = useState<SolicitacaoGroup[]>([]);
  const [filtered, setFiltered] = useState<SolicitacaoGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [search, setSearch] = usePersistedState<string>('solicitacoes:search', '');
  const [page, setPage] = useState(0);

  // Toast Customizado
  const [toastState, setToastState] = useState<{ open: boolean; msg: string; type: 'success' | 'error' }>({
    open: false,
    msg: '',
    type: 'success'
  });
  const toastTimeout = useRef<NodeJS.Timeout | null>(null);

  const [actingId, setActingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const t = localStorage.getItem('authToken');
    setUserEmail(getEmailFromJwt(t));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    router.replace('/');
  };

  const API_BASE = useMemo(() => process.env.NEXT_PUBLIC_API_URL ?? '', []);
  const API_TOKEN = useMemo(() => process.env.NEXT_PUBLIC_API_TOKEN ?? '', []);

  const LIST_URL = useMemo(() => (API_BASE ? `${API_BASE}/sync/getSolicitacao` : `/sync/getSolicitacao`), [API_BASE]);

  const APROVAR_URL = useMemo(
    () => (API_BASE ? `${API_BASE}/sync/aprovarSolicitacao` : `/sync/aprovarSolicitacao`),
    [API_BASE]
  );

  const REPROVAR_URL = useMemo(
    () => (API_BASE ? `${API_BASE}/sync/reprovarSolicitacao` : `/sync/reprovarSolicitacao`),
    [API_BASE]
  );

  const getHeaders = useCallback((): Record<string, string> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    else if (API_TOKEN) headers.Authorization = `Bearer ${API_TOKEN}`;
    return headers;
  }, [token, API_TOKEN]);

  const toast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setToastState({ open: true, msg, type });
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    toastTimeout.current = setTimeout(() => {
      setToastState((prev) => ({ ...prev, open: false }));
    }, 4000);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setErro(null);

      const resp = await fetch(LIST_URL, {
        method: 'GET',
        headers: getHeaders(),
        cache: 'no-store',
      });

      if (!resp.ok) {
        const msg = await resp.text();
        throw new Error(msg || `Falha ao buscar solicitações (status ${resp.status})`);
      }

      const raw = (await resp.json()) as unknown;

      const arr: unknown[] = (() => {
        if (Array.isArray(raw)) return raw;

        if (raw && typeof raw === 'object') {
          const obj = raw as Record<string, unknown>;

          const data = obj['data'];
          if (Array.isArray(data)) return data;

          const solicitacoes = obj['solicitacoes'];
          if (Array.isArray(solicitacoes)) return solicitacoes;
        }

        return [];
      })();

      const byId = new Map<string, SolicitacaoGroup>();

      for (const r of arr) {
        const rec = r && typeof r === 'object' ? (r as Record<string, unknown>) : {};

        const id = toStringSafe(
          rec.id ??
            rec.ID ??
            rec.solicitacaoId ??
            rec.SOLICITACAOID ??
            rec.idSolicitacao ??
            rec.IDSOLICITACAO ??
            rec.requestId ??
            rec.REQUESTID ??
            ''
        ).trim();

        const userRequest = toStringSafe(
          rec.userRequest ??
            rec.user_request ??
            rec.userEmail ??
            rec.user_email ??
            rec.userAproved ??
            rec.user_aproved ??
            rec.userApproved ??
            rec.user_approved ??
            rec.usuario ??
            rec.USUARIO ??
            ''
        ).trim();

        const createdAt = toStringSafe(
          rec.createdAt ??
            rec.CREATEDAT ??
            rec.created_at ??
            rec.createAt ??
            rec.CREATEAT ??
            rec.data ??
            rec.DATA ??
            ''
        ).trim();

        const aprovado = toBoolSafe(
          rec.aprovado ??
            rec.APROVADO ??
            rec.aproved ??
            rec.APROVED ??
            rec.approved ??
            rec.APPROVED ??
            false
        );

        const produtos = normalizeProdutos(rec);

        if (!userRequest || !createdAt) continue;

        const groupId = id || `${userRequest}__${createdAt}`;

        const existing = byId.get(groupId);
        if (!existing) {
          byId.set(groupId, {
            id: groupId,
            userRequest,
            createdAt,
            aprovado,
            produtos: [...produtos],
            raw: r,
          });
        } else {
          existing.aprovado = existing.aprovado || aprovado;

          for (const p of produtos) {
            const dup = existing.produtos.some(
              (x) =>
                x.codProduto === p.codProduto &&
                x.quantidade === p.quantidade &&
                (x.descricao ?? '') === (p.descricao ?? '')
            );
            if (!dup) existing.produtos.push(p);
          }
        }
      }

      const normalized = Array.from(byId.values());

      normalized.sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tb - ta;
      });

      setItems(normalized);
      setExpandedId(null);
      setPage(0);
      toast('Lista carregada', 'success');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao buscar solicitações';
      setErro(msg);
      toast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }, [LIST_URL, getHeaders, toast]);

  const doAction = useCallback(
    async (url: string, group: SolicitacaoGroup, successMsg: string) => {
      if (!userEmail) {
        toast('Não foi possível identificar o e-mail do usuário logado.', 'error');
        return;
      }

      const rowId = String(group.id ?? '').trim();
      if (!rowId) {
        toast('Esta solicitação não possui ID.', 'error');
        return;
      }

      if (!group.produtos?.length) {
        toast('Solicitação sem itens.', 'error');
        return;
      }

      setActingId(rowId);
      setErro(null);

      try {
        const produtosPayload = group.produtos.map((p) => {
          if (!Number.isFinite(p.codProduto)) throw new Error('codProduto inválido.');
          if (!Number.isFinite(p.quantidade)) throw new Error('quantidade inválida.');

          return {
            codProduto: p.codProduto,
            quantidade: p.quantidade,
            descricao: (p.descricao ?? '').trim() || '-',
          };
        });

        const payload = {
          id: rowId,
          userEmail,
          produtos: produtosPayload,
        };

        const resp = await fetch(url, {
          method: 'POST',
          headers: getHeaders(),
          cache: 'no-store',
          body: JSON.stringify(payload),
        });

        if (!resp.ok) {
          const msg = await resp.text();
          throw new Error(msg || `Falha (status ${resp.status})`);
        }

        setItems((prev) => prev.filter((x) => String(x.id) !== rowId));
        setExpandedId((prev) => (prev === rowId ? null : prev));
        toast(successMsg, 'success');
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Erro ao processar';
        setErro(msg);
        toast(msg, 'error');
      } finally {
        setActingId(null);
      }
    },
    [getHeaders, toast, userEmail]
  );

  const handleAprovar = useCallback((g: SolicitacaoGroup) => doAction(APROVAR_URL, g, 'Solicitação aprovada!'), [
    APROVAR_URL,
    doAction,
  ]);

  const handleReprovar = useCallback((g: SolicitacaoGroup) => doAction(REPROVAR_URL, g, 'Solicitação reprovada!'), [
    REPROVAR_URL,
    doAction,
  ]);

  useEffect(() => {
    if (!ready || !hasAccess) return;
    if (token || API_TOKEN) fetchData();
  }, [ready, hasAccess, token, API_TOKEN, fetchData]);

  useEffect(() => {
    const q = search.trim().toUpperCase();

    // Filtra para exibir apenas pendentes
    const pendentes = items.filter((it) => it.aprovado === false);

    const result = pendentes.filter((it) => {
      if (!q) return true;

      const matchBase =
        it.userRequest.toUpperCase().includes(q) ||
        it.createdAt.toUpperCase().includes(q) ||
        String(it.id ?? '').toUpperCase().includes(q) ||
        String(it.produtos.length).includes(q);

      if (matchBase) return true;

      return it.produtos.some((p) => {
        const desc = (p.descricao ?? '').toUpperCase();
        return String(p.codProduto).includes(q) || String(p.quantidade).includes(q) || (desc && desc.includes(q));
      });
    });

    setFiltered(result);
    setPage(0);
  }, [items, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const pageRows = filtered.slice(page * ROWS_PER_PAGE, page * ROWS_PER_PAGE + ROWS_PER_PAGE);

  const toggleExpand = (id: string) => setExpandedId((prev) => (prev === id ? null : id));

  if (!ready || !hasAccess) return null;

  return (
    <DashboardLayout subtitle="Aprovação de Solicitações">

      {/* Conteúdo Principal */}
      <main className="flex-1 w-full max-w-6xl mx-auto p-4 md:p-8 animate-fade-in-up">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          
          {/* Cabeçalho do Card */}
          <div className="p-6 border-b border-slate-100 bg-emerald-50/30">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <ListCollapse className="w-6 h-6 text-emerald-600" />
                  <h2 className="text-xl font-bold text-emerald-900">Solicitações (pendentes)</h2>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-500 font-medium ml-8">
                  <span>Total: {filtered.length} pendentes</span>
                </div>
              </div>

              <button
                onClick={fetchData}
                disabled={loading}
                className="w-full sm:w-auto px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCw className="w-4 h-4 text-emerald-600" />}
                Atualizar
              </button>
            </div>

            {/* Barra de Pesquisa */}
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Pesquisar (id / usuário / itens / codProduto / quantidade / descrição / data)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow"
              />
            </div>

            {erro && (
              <div className="mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-sm font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {erro}
              </div>
            )}
          </div>

          {/* Tabela */}
          <div className="p-0 bg-slate-50/50">
            {loading ? (
              <div className="flex flex-col items-center justify-center p-12 text-emerald-600">
                <Loader2 className="w-10 h-10 animate-spin mb-3" />
                <span className="text-sm font-bold">Carregando solicitações...</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-slate-400 border-b border-slate-100">
                <Search className="w-12 h-12 text-slate-300 mb-3" />
                <span className="text-sm font-medium">Nenhuma solicitação pendente encontrada.</span>
              </div>
            ) : (
              <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-emerald-50/80 border-b border-emerald-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-[10px] sm:text-xs font-bold text-emerald-800 uppercase tracking-wider">
                        Usuário
                      </th>
                      <th className="px-4 py-3 text-left text-[10px] sm:text-xs font-bold text-emerald-800 uppercase tracking-wider">
                        ID
                      </th>
                      <th className="px-4 py-3 text-center text-[10px] sm:text-xs font-bold text-emerald-800 uppercase tracking-wider whitespace-nowrap w-20">
                        Itens
                      </th>
                      <th className="px-4 py-3 text-left text-[10px] sm:text-xs font-bold text-emerald-800 uppercase tracking-wider">
                        Resumo
                      </th>
                      <th className="px-4 py-3 text-left text-[10px] sm:text-xs font-bold text-emerald-800 uppercase tracking-wider whitespace-nowrap">
                        Data
                      </th>
                      <th className="px-4 py-3 text-center text-[10px] sm:text-xs font-bold text-emerald-800 uppercase tracking-wider whitespace-nowrap w-24">
                        Detalhes
                      </th>
                      <th className="px-4 py-3 text-center text-[10px] sm:text-xs font-bold text-emerald-800 uppercase tracking-wider whitespace-nowrap w-48">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {pageRows.map((g) => {
                      const isActing = actingId === g.id;
                      const isExpanded = expandedId === g.id;

                      const resumo = (g.produtos ?? [])
                        .slice(0, 2)
                        .map((p) => `${p.codProduto} (${p.quantidade})`)
                        .join(', ');
                      const more = (g.produtos?.length ?? 0) > 2 ? ` +${(g.produtos.length ?? 0) - 2}` : '';

                      return (
                        <React.Fragment key={g.id}>
                          {/* Linha Principal */}
                          <tr className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3 text-sm font-mono text-slate-700">
                              {g.userRequest}
                            </td>
                            <td className="px-4 py-3 text-sm font-mono text-slate-500">
                              {g.id}
                            </td>
                            <td className="px-4 py-3 text-center text-sm font-bold text-slate-700">
                              <span className="bg-slate-100 px-2 py-0.5 rounded-md shadow-sm border border-slate-200 text-xs">
                                {g.produtos?.length ?? 0}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-700 truncate max-w-[200px] font-medium" title={(resumo || '-') + more}>
                              {(resumo || '-') + more}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                              {formatDateTime(g.createdAt)}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => toggleExpand(g.id)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 hover:border-emerald-500 rounded-lg text-xs font-bold text-slate-700 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                              >
                                {isExpanded ? (
                                  <>Fechar <ChevronUp className="w-3.5 h-3.5" /></>
                                ) : (
                                  <>Ver <ChevronDown className="w-3.5 h-3.5" /></>
                                )}
                              </button>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => handleAprovar(g)}
                                  disabled={isActing}
                                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold uppercase tracking-wider transition-colors disabled:opacity-50 disabled:pointer-events-none w-28"
                                >
                                  {isActing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                  {isActing ? 'AGUARDE' : 'Aprovar'}
                                </button>
                                <button
                                  onClick={() => handleReprovar(g)}
                                  disabled={isActing}
                                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[11px] font-bold uppercase tracking-wider transition-colors disabled:opacity-50 disabled:pointer-events-none w-28"
                                >
                                  {isActing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                                  {isActing ? 'AGUARDE' : 'Reprovar'}
                                </button>
                              </div>
                            </td>
                          </tr>

                          {/* Linha Expandida (Detalhes) */}
                          {isExpanded && (
                            <tr>
                              <td colSpan={7} className="p-0 bg-slate-50/80 border-b border-slate-200">
                                <div className="p-4 sm:p-6 animate-fade-in-up">
                                  <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                                    <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                                      <ListCollapse className="w-4 h-4 text-slate-500" />
                                      <h4 className="text-sm font-bold text-slate-800">Itens da Solicitação</h4>
                                    </div>
                                    
                                    {(g.produtos?.length ?? 0) === 0 ? (
                                      <div className="p-4 text-sm text-slate-500 italic">
                                        Nenhum item vinculado a esta solicitação.
                                      </div>
                                    ) : (
                                      <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-slate-100">
                                          <thead className="bg-slate-50/50">
                                            <tr>
                                              <th className="px-4 py-2.5 text-left text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Cód. Produto</th>
                                              <th className="px-4 py-2.5 text-left text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">Descrição</th>
                                              <th className="px-4 py-2.5 text-right text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Qtd</th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-slate-50">
                                            {(g.produtos ?? []).map((p, idx) => (
                                              <tr key={`${g.id}-${p.codProduto}-${idx}`} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-4 py-2.5 text-sm font-bold text-slate-700">{p.codProduto}</td>
                                                <td className="px-4 py-2.5 text-sm text-slate-600">{(p.descricao ?? '').trim() || '-'}</td>
                                                <td className="px-4 py-2.5 text-sm text-right tabular-nums font-semibold text-slate-800">
                                                  {Number.isFinite(p.quantidade) ? p.quantidade : '-'}
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Paginação */}
            {filtered.length > 0 && (
              <div className="px-6 py-4 border-t border-slate-200 bg-white flex items-center justify-between">
                <span className="text-xs sm:text-sm text-slate-500 font-medium">
                  Página {page + 1} de {totalPages}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="px-3 sm:px-4 py-1.5 sm:py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-xs sm:text-sm font-bold transition-colors disabled:opacity-50 disabled:pointer-events-none"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                    className="px-3 sm:px-4 py-1.5 sm:py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-xs sm:text-sm font-bold transition-colors disabled:opacity-50 disabled:pointer-events-none"
                  >
                    Próxima
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Snackbar / Toast Customizado */}
      <div 
        className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] transition-all duration-300 ease-in-out ${
          toastState.open ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'
        }`}
      >
        <div className={`flex items-center gap-3 px-5 py-3 rounded-lg shadow-xl text-white font-medium text-sm ${
          toastState.type === 'success' ? 'bg-emerald-600 border border-emerald-500' : 'bg-rose-600 border border-rose-500'
        }`}>
          {toastState.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {toastState.msg}
          <button 
            onClick={() => setToastState(s => ({ ...s, open: false }))} 
            className="ml-2 hover:opacity-75 transition-opacity"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <style jsx global>{`
        .scrollbar-thin::-webkit-scrollbar { width: 6px; height: 6px; }
        .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 20px; }
        @keyframes fadeInUp { 
          from { transform: translateY(20px); opacity: 0; } 
          to { transform: translateY(0); opacity: 1; } 
        }
        .animate-fade-in-up { 
          animation: fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; 
        }
      `}</style>
    </DashboardLayout>
  );
}
'use client';

import { Search, Filter, Settings, ShoppingCart, FileText, X, Loader2 } from 'lucide-react';
import { useMemo, useState, useEffect, useCallback } from 'react';

type Produto = {
  CODPROD: number;
  DESCRPROD: string;
  REFERENCIA?: string;
  CODBARRA?: string;
  MARCA?: string;
  COMPLEMENTO?: string;
};

type ColunaConfig = {
  key: keyof Produto | 'IMAGEM';
  label: string;
  width: number;
  align?: 'left' | 'center' | 'right';
  searchField?: string;
};

type CardTabela = { titulo: string; colunas: string[]; linhas: string[][] };

type EntradaPendente = {
  NUNOTA?: string | number;
  NUMNOTA?: string | number;
  STATUSPENDENTE?: string;
  PENDENTE?: string;
  DHTIPOPER?: string;
  ATUALIZACAO?: string;
  CODTIPOPER?: string | number;
};

const TODAS_COLUNAS: ColunaConfig[] = [
  { key: 'IMAGEM', label: 'Foto', width: 90, align: 'center' },
  { key: 'CODPROD', label: 'Cód.Produto', width: 140, searchField: 'CODPROD' },
  { key: 'DESCRPROD', label: 'Nome / Descrição', width: 480, searchField: 'DESCRPROD' },
  { key: 'REFERENCIA', label: 'Referência', width: 180, searchField: 'REFERENCIA' },
  { key: 'CODBARRA', label: 'Cód.Barras', width: 180, searchField: 'CODBARRA' },
  { key: 'MARCA', label: 'Marca', width: 180, searchField: 'MARCA' },
  { key: 'COMPLEMENTO', label: 'Complemento', width: 360, searchField: 'COMPLEMENTO' }
];

const keysIniciais: Array<ColunaConfig['key']> = ['IMAGEM', 'CODPROD', 'DESCRPROD', 'REFERENCIA'];

const cards: CardTabela[] = [
  { titulo: 'Detalhes de estoque', colunas: ['Local', 'Nome local', 'Estoque', 'Reservado'], linhas: [['1100', 'TAMBOR', '375', '13']] },
  { titulo: 'Características', colunas: ['Cód.Produto', 'Descrição', 'Complemento'], linhas: [['19869', 'DISJUNTOR MONOFASICO 10A', '-']] },
  { titulo: 'Detalhes de preço', colunas: ['Tipo', 'Valor', 'Preço'], linhas: [['Atacado', '6,75', '6,75']] },
  { titulo: 'Reservas', colunas: ['Nro. Único', 'Dt. Negociação'], linhas: [['503188', '15/04/2026'], ['505772', '27/04/2026']] },
  { titulo: 'Produtos no carrinho', colunas: ['Qtde. Itens', 'Qtde. Total', 'Valor Total'], linhas: [['0', '0,00', '0,00']] }
];


export default function ConsultaProdutosPage() {
  const [busca, setBusca] = useState('');
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null);
  const [entradasPendentes, setEntradasPendentes] = useState<EntradaPendente[]>([]);
  const [loadingEntradasPendentes, setLoadingEntradasPendentes] = useState(false);

  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [alturaInferior, setAlturaInferior] = useState(36);
  const [selectedKeys, setSelectedKeys] = useState<Array<ColunaConfig['key']>>(keysIniciais);

  const colunas = useMemo(
    () => TODAS_COLUNAS.filter((col) => selectedKeys.includes(col.key)),
    [selectedKeys]
  );

  const searchFields = useMemo(
    () => TODAS_COLUNAS.filter((col) => selectedKeys.includes(col.key) && col.searchField).map((col) => col.searchField!),
    [selectedKeys]
  );

  const fetchProdutos = useCallback(async (termo: string) => {
    if (!termo || termo.trim().length < 2) {
      setProdutos([]);
      return;
    }

    setLoading(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const params = new URLSearchParams({ q: termo.trim() });
      if (searchFields.length > 0) params.set('fields', searchFields.join(','));

      const response = await fetch(`${baseUrl}/database/search?${params.toString()}`);
      const data = await response.json();
      setProdutos(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
      setProdutos([]);
    } finally {
      setLoading(false);
    }
  }, [searchFields]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProdutos(busca);
    }, 500);
    return () => clearTimeout(timer);
  }, [busca, fetchProdutos]);


  useEffect(() => {
    if (!produtoSelecionado?.CODPROD) {
      setEntradasPendentes([]);
      return;
    }

    const fetchEntradasPendentes = async () => {
      setLoadingEntradasPendentes(true);
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        const params = new URLSearchParams({
          codProd: String(produtoSelecionado.CODPROD),
          tops: '300,344,442',
          pendente: 'S'
        });

        const response = await fetch(`${baseUrl}/database/pedidos-pendentes-produto?${params.toString()}`);
        const data = await response.json();
        setEntradasPendentes(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Erro ao buscar entradas pendentes:', error);
        setEntradasPendentes([]);
      } finally {
        setLoadingEntradasPendentes(false);
      }
    };

    fetchEntradasPendentes();
  }, [produtoSelecionado]);

  const toggleField = (key: ColunaConfig['key']) => {
    setSelectedKeys((prev) => {
      if (prev.includes(key)) {
        if (prev.length === 1) return prev;
        return prev.filter((k) => k !== key);
      }
      return [...prev, key];
    });
  };

  return (
    <main className="h-screen overflow-hidden bg-[#e9eaec] p-3 text-[#2f3e54]">
      <div className="mx-auto flex h-full max-w-[1900px] flex-col gap-3">
        <header className="rounded border border-[#c7cbd1] bg-[#f3f4f6] p-2">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <button onClick={() => setModalOpen(true)} className="rounded border border-[#b9bfc8] bg-white p-2 hover:bg-gray-50" title="Campos do grid"><Settings size={16} /></button>
            <button className="rounded border border-[#b9bfc8] bg-white p-2"><Filter size={16} /></button>
            <div className="flex min-w-[420px] items-center gap-2 rounded border border-[#aeb4bd] bg-white px-3 py-1 shadow-sm"><span className="text-sm font-semibold">Busca:</span><input value={busca} onChange={(e) => setBusca(e.target.value)} className="w-full border-none bg-transparent font-semibold outline-none" /><span>{loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}</span></div>
            <button className="rounded border border-[#b9bfc8] bg-[#3e495b] px-3 py-1 text-white">Outros Filtros</button>
            <button className="rounded border border-[#b9bfc8] bg-white p-2"><FileText size={16} /></button>
          </div>
          <div className="text-right text-xl font-semibold">Qtde. Itens: {produtos.length} &nbsp; Qtde.Total: 0,00 &nbsp; Valor Total: 0,00</div>
        </header>

        <section className="min-h-0 flex-1 overflow-hidden">
          <div className="h-full" style={{ display: 'grid', gridTemplateRows: `minmax(200px, ${100 - alturaInferior}%) 8px minmax(180px, ${alturaInferior}%)` }}>
            <div className="min-h-0 overflow-auto rounded border border-[#b7bcc5] bg-[#f3f4f6]">
              <table className="text-sm" style={{ minWidth: `${colunas.reduce((acc, c) => acc + c.width, 0)}px` }}>
                <thead className="sticky top-0 z-10 bg-[#eceef1] text-left text-lg">
                  <tr>
                    {colunas.map((col) => (
                      <th key={col.key} className="relative border border-[#c7cbd1] p-1" style={{ width: col.width, minWidth: col.width }}>
                        <div className="pr-8">{col.label}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {!loading && produtos.length === 0 ? (
                    <tr><td colSpan={colunas.length} className="border border-[#d0d3d8] p-5 text-center text-gray-500">Digite ao menos 2 caracteres para buscar produtos.</td></tr>
                  ) : (
                    produtos.map((p, idx) => (
                      <tr key={p.CODPROD} onClick={() => setProdutoSelecionado(p)} className={`cursor-pointer ${produtoSelecionado?.CODPROD === p.CODPROD ? 'bg-blue-100' : idx % 2 === 0 ? 'bg-[#f2f3f5]' : 'bg-white'}`}>
                        {colunas.map((col) => <td key={`${p.CODPROD}-${col.key}`} className="border border-[#d0d3d8] p-1" style={{ textAlign: col.align ?? 'left' }}>{col.key === 'IMAGEM' ? <img src={`https://danilo.nuvemdatacom.com.br:9092/mge/Produto@IMAGEM@CODPROD=${p.CODPROD}.dbimage`} alt="" className="mx-auto h-10 w-10 object-contain" onError={(e) => (e.currentTarget.src = 'https://via.placeholder.com/40?text=?')} /> : (p[col.key as keyof Produto] ?? '-')}</td>)}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="cursor-row-resize bg-[#c4cad3]" onMouseDown={(e) => {
              const startY = e.clientY;
              const start = alturaInferior;
              const onMove = (ev: MouseEvent) => {
                const deltaPct = ((ev.clientY - startY) / window.innerHeight) * 100;
                setAlturaInferior(Math.min(55, Math.max(22, start - deltaPct)));
              };
              const onUp = () => {
                window.removeEventListener('mousemove', onMove);
                window.removeEventListener('mouseup', onUp);
              };
              window.addEventListener('mousemove', onMove);
              window.addEventListener('mouseup', onUp);
            }} />

            <section className="grid min-h-0 grid-cols-1 gap-3 overflow-hidden md:grid-cols-2 xl:grid-cols-6">
              <article className="flex min-h-0 flex-col overflow-hidden rounded border border-[#bcc1c9] bg-[#f4f5f7]">
                <div className="flex items-center justify-between border-b border-[#c8ccd3] p-2 font-semibold">Entradas pendentes<ShoppingCart size={16} /></div>
                <div className="min-h-0 flex-1 overflow-auto p-2">
                  <table className="w-full text-sm">
                    <thead className="bg-[#eceef1]"><tr><th className="border border-[#d0d3d8] p-1 text-left">Pedido</th><th className="border border-[#d0d3d8] p-1 text-left">TOP</th><th className="border border-[#d0d3d8] p-1 text-left">Status</th><th className="border border-[#d0d3d8] p-1 text-left">Atualização</th></tr></thead>
                    <tbody>
                      {loadingEntradasPendentes ? (
                        <tr><td colSpan={4} className="border border-[#d0d3d8] p-2 text-center text-gray-500">Carregando...</td></tr>
                      ) : !produtoSelecionado ? (
                        <tr><td colSpan={4} className="border border-[#d0d3d8] p-2 text-center text-gray-500">Selecione um item no grid central.</td></tr>
                      ) : entradasPendentes.length === 0 ? (
                        <tr><td colSpan={4} className="border border-[#d0d3d8] p-2 text-center text-gray-500">Sem pedidos pendentes (TOP 300, 344, 442).</td></tr>
                      ) : (
                        entradasPendentes.map((item, i) => (
                          <tr key={`${item.NUNOTA ?? item.NUMNOTA ?? 'pedido'}-${i}`}>
                            <td className="border border-[#d0d3d8] p-1">{item.NUNOTA ?? item.NUMNOTA ?? '-'}</td>
                            <td className="border border-[#d0d3d8] p-1">{item.CODTIPOPER ?? '-'}</td>
                            <td className="border border-[#d0d3d8] p-1">{item.STATUSPENDENTE ?? item.PENDENTE ?? '-'}</td>
                            <td className="border border-[#d0d3d8] p-1">{item.DHTIPOPER ?? item.ATUALIZACAO ?? '-'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </article>
              {cards.map((card) => (
                <article key={card.titulo} className="flex min-h-0 flex-col overflow-hidden rounded border border-[#bcc1c9] bg-[#f4f5f7]">
                  <div className="flex items-center justify-between border-b border-[#c8ccd3] p-2 font-semibold">{card.titulo}<ShoppingCart size={16} /></div>
                  <div className="min-h-0 flex-1 overflow-auto p-2">
                    <table className="w-full text-sm">
                      <thead className="bg-[#eceef1]"><tr>{card.colunas.map((col) => <th key={`${card.titulo}-${col}`} className="border border-[#d0d3d8] p-1 text-left">{col}</th>)}</tr></thead>
                      <tbody>{card.linhas.map((linha, i) => <tr key={`${card.titulo}-${i}`}>{linha.map((v, j) => <td key={`${card.titulo}-${i}-${j}`} className="border border-[#d0d3d8] p-1">{v}</td>)}</tr>)}</tbody>
                    </table>
                  </div>
                </article>
              ))}
            </section>
          </div>
        </section>
      </div>

      {modalOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"><div className="w-full max-w-3xl rounded border border-[#b8bec7] bg-white"><div className="flex items-center justify-between border-b border-[#d1d5db] p-3"><h2 className="text-lg font-semibold">Campos exibidos no grid</h2><button onClick={() => setModalOpen(false)} className="rounded border p-1"><X size={16} /></button></div><div className="max-h-[60vh] overflow-auto p-4"><div className="grid grid-cols-1 gap-2 md:grid-cols-2">{TODAS_COLUNAS.map((campo) => <label key={campo.key} className="flex items-center gap-2 rounded border border-[#d8dce2] bg-[#f7f8fa] px-2 py-1 text-sm"><input type="checkbox" className="h-4 w-4" checked={selectedKeys.includes(campo.key)} onChange={() => toggleField(campo.key)} />{campo.label}{campo.searchField ? <span className="ml-auto text-xs text-gray-400">({campo.searchField})</span> : <span className="ml-auto text-xs text-gray-400">(apenas visual)</span>}</label>)}</div></div><div className="flex justify-end gap-2 border-t border-[#d1d5db] p-3"><button onClick={() => setModalOpen(false)} className="rounded border px-3 py-1">Fechar</button></div></div></div>}
    </main>
  );
}

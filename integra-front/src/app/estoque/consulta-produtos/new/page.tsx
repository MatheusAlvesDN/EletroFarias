'use client';

import { Search, Filter, Settings, ShoppingCart, FileText, X, Loader2 } from 'lucide-react';
import { useMemo, useState, useEffect, useCallback } from 'react';

type Produto = {
  CODPROD: number;
  DESCRPROD: string;
  COMPLEMENTO?: string;
  IMAGEM_URL?: string;
};

type Coluna = {
  key: keyof Produto | 'IMAGEM';
  label: string;
  width: number;
  align?: 'left' | 'center' | 'right';
};

const colunasIniciais: Coluna[] = [
  { key: 'IMAGEM', label: 'Foto', width: 80, align: 'center' },
  { key: 'CODPROD', label: 'Cód.Produto', width: 130 },
  { key: 'DESCRPROD', label: 'Nome / Descrição', width: 600 },
];

export default function ConsultaProdutosNewPage() {
  const [busca, setBusca] = useState('');
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null);
  const [loading, setLoading] = useState(false);
  const [colunas, setColunas] = useState<Coluna[]>(colunasIniciais);

  // Estado para controle de redimensionamento
  const [resizing, setResizing] = useState<{ key: string; startX: number; startWidth: number } | null>(null);

  const handleMouseDown = (e: React.MouseEvent, key: string, currentWidth: number) => {
    setResizing({ key, startX: e.pageX, startWidth: currentWidth });
    e.preventDefault();
  };

  useEffect(() => {
    if (!resizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.pageX - resizing.startX;
      setColunas((prev) =>
        prev.map((col) =>
          col.key === resizing.key ? { ...col, width: Math.max(50, resizing.startWidth + delta) } : col
        )
      );
    };

    const handleMouseUp = () => {
      setResizing(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizing]);

  const fetchProdutos = useCallback(async (termo: string) => {
    if (!termo || termo.length < 2) return;
    setLoading(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${baseUrl}/database/search?q=${encodeURIComponent(termo)}`);
      const data = await response.json();
      setProdutos(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProdutos(busca);
    }, 500);
    return () => clearTimeout(timer);
  }, [busca, fetchProdutos]);

  const moveColuna = (dragKey: string, targetKey: string) => {
    if (dragKey === targetKey) return;
    setColunas((prev) => {
      const origem = prev.findIndex((c) => c.key === dragKey);
      const destino = prev.findIndex((c) => c.key === targetKey);
      if (origem < 0 || destino < 0) return prev;
      const next = [...prev];
      const [item] = next.splice(origem, 1);
      next.splice(destino, 0, item);
      return next;
    });
  };

  const [estoque, setEstoque] = useState<{ ESTOQUE: number; RESERVADO: number; DISPONIVEL: number } | null>(null);
  const [loadingEstoque, setLoadingEstoque] = useState(false);

  useEffect(() => {
    if (!produtoSelecionado) {
      setEstoque(null);
      return;
    }

    const fetchEstoque = async () => {
      setLoadingEstoque(true);
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        const response = await fetch(`${baseUrl}/database/stock/${produtoSelecionado.CODPROD}/1100`);
        const data = await response.json();
        setEstoque(data[0] || null);
      } catch (error) {
        console.error('Erro ao buscar estoque:', error);
      } finally {
        setLoadingEstoque(false);
      }
    };

    fetchEstoque();
  }, [produtoSelecionado]);

  return (
    <main className="h-screen overflow-hidden bg-[#e9eaec] p-3 text-[#2f3e54]">
      <div className="mx-auto flex h-full max-w-[1900px] flex-col gap-3">
        <header className="rounded border border-[#c7cbd1] bg-[#f3f4f6] p-2 shadow-sm">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <button className="rounded border border-[#b9bfc8] bg-white p-2 hover:bg-gray-50"><Settings size={16} /></button>
            <button className="rounded border border-[#b9bfc8] bg-white p-2 hover:bg-gray-50"><Filter size={16} /></button>
            <div className="flex min-w-[400px] items-center gap-2 rounded border border-[#b9bfc8] bg-white px-3 py-2 shadow-inner focus-within:border-blue-400 transition-colors">
              <span className="text-sm font-bold text-gray-500">Busca Oracle:</span>
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full border-none bg-transparent font-semibold outline-none text-gray-800"
                placeholder="Digite o nome ou código do produto..."
              />
              {loading ? <Loader2 size={16} className="animate-spin text-blue-500" /> : <Search size={16} className="text-gray-400" />}
            </div>
            <button className="rounded border border-[#b9bfc8] bg-[#3e495b] px-4 py-2 text-white font-medium hover:bg-[#2d3644] transition-colors">
              Filtros Avançados
            </button>
            <button className="rounded border border-[#b9bfc8] bg-white p-2 ml-auto"><FileText size={16} /></button>
          </div>
          <div className="flex justify-between items-center px-1">
            <div className="text-xs text-gray-500 font-medium">Conectado ao Banco Nuvemdatacom</div>
            <div className="text-right text-lg font-bold text-[#3e495b]">
              Itens Encontrados: <span className="text-blue-600">{produtos.length}</span>
            </div>
          </div>
        </header>

        <section className="min-h-0 flex-1 overflow-auto rounded border border-[#bfc3ca] bg-white shadow-inner">
          <table className="w-full text-sm border-collapse" style={{ minWidth: `${colunas.reduce((acc, c) => acc + c.width, 0)}px` }}>
            <thead className="sticky top-0 z-10 bg-[#eceef1] shadow-sm">
              <tr>
                {colunas.map((col) => (
                  <th
                    key={col.key}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData('text/plain', col.key)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => moveColuna(e.dataTransfer.getData('text/plain'), col.key)}
                    className="relative border border-[#c7cbd1] p-2 text-left font-bold text-[#3e495b] select-none"
                    style={{ width: `${col.width}px` }}
                  >
                    <div className="truncate pr-4">{col.label}</div>
                    
                    {/* Resizer Handle */}
                    <div
                      onMouseDown={(e) => handleMouseDown(e, col.key, col.width)}
                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 transition-colors"
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {produtos.length === 0 && !loading && (
                <tr>
                  <td colSpan={colunas.length} className="p-10 text-center text-gray-400 italic bg-gray-50">
                    Nenhum resultado encontrado. Tente buscar por outro termo.
                  </td>
                </tr>
              )}
              {produtos.map((p, idx) => (
                <tr 
                  key={p.CODPROD} 
                  onClick={() => setProdutoSelecionado(p)}
                  className={`cursor-pointer transition-colors ${produtoSelecionado?.CODPROD === p.CODPROD ? 'bg-blue-100' : idx % 2 === 0 ? 'bg-white' : 'bg-[#f8f9fa]'} hover:bg-blue-50`}
                >
                  {colunas.map((col) => (
                    <td
                      key={`${p.CODPROD}-${col.key}`}
                      className="border-x border-[#e2e4e8] p-2"
                      style={{ textAlign: col.align ?? 'left' }}
                    >
                      {col.key === 'IMAGEM' ? (
                        <div className="w-10 h-10 bg-gray-100 rounded border border-gray-200 overflow-hidden flex items-center justify-center mx-auto">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img 
                            src={`https://danilo.nuvemdatacom.com.br:9092/mge/Produto@IMAGEM@CODPROD=${p.CODPROD}.dbimage`}
                            alt=""
                            className="max-w-full max-h-full object-contain"
                            onError={(e) => (e.currentTarget.src = 'https://via.placeholder.com/40?text=?')}
                          />
                        </div>
                      ) : (
                        <span className={col.key === 'CODPROD' ? 'font-mono font-bold text-blue-700' : ''}>
                          {p[col.key as keyof Produto]}
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="grid h-[32vh] grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <article className="flex flex-col overflow-hidden rounded border border-[#bcc1c9] bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-[#c8ccd3] bg-[#eceef1] p-2 font-bold text-[#3e495b]">
              Detalhes do Produto
              <FileText size={16} />
            </div>
            <div className="flex-1 overflow-auto p-3">
              {produtoSelecionado ? (
                <div className="space-y-3">
                  <div className="flex gap-4">
                    <div className="w-24 h-24 bg-gray-50 border rounded flex items-center justify-center overflow-hidden shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={`https://danilo.nuvemdatacom.com.br:9092/mge/Produto@IMAGEM@CODPROD=${produtoSelecionado.CODPROD}.dbimage`}
                        alt=""
                        className="max-w-full max-h-full object-contain"
                        onError={(e) => (e.currentTarget.src = 'https://via.placeholder.com/100?text=S/F')}
                      />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg leading-tight">{produtoSelecionado.DESCRPROD}</h3>
                      <p className="text-sm text-blue-600 font-mono mt-1">Cód: {produtoSelecionado.CODPROD}</p>
                    </div>
                  </div>
                  {produtoSelecionado.COMPLEMENTO && (
                    <div className="p-2 bg-gray-50 rounded border text-xs text-gray-600">
                      <p className="font-bold mb-1 uppercase">Complemento:</p>
                      {produtoSelecionado.COMPLEMENTO}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-400 text-center mt-10 italic">Selecione um produto na tabela para ver detalhes</p>
              )}
            </div>
          </article>

          <article className="flex flex-col overflow-hidden rounded border border-[#bcc1c9] bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-[#c8ccd3] bg-[#eceef1] p-2 font-bold text-[#3e495b]">
              Status de Estoque (Local 1100)
              <ShoppingCart size={16} />
            </div>
            <div className="flex-1 overflow-auto p-3">
              {loadingEstoque ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="animate-spin text-blue-500" />
                </div>
              ) : estoque ? (
                <div className="space-y-2">
                   <div className="flex justify-between border-b pb-1">
                     <span className="text-xs font-semibold text-gray-500 uppercase">Estoque Real</span>
                     <span className="font-bold text-gray-800">{estoque.ESTOQUE}</span>
                   </div>
                   <div className="flex justify-between border-b pb-1">
                     <span className="text-xs font-semibold text-gray-500 uppercase">Reservado</span>
                     <span className="font-bold text-red-500">{estoque.RESERVADO}</span>
                   </div>
                   <div className="flex justify-between items-center pt-1">
                     <span className="text-sm font-bold text-blue-700 uppercase">Disponível</span>
                     <span className="text-xl font-extrabold text-blue-800">{estoque.DISPONIVEL}</span>
                   </div>
                </div>
              ) : produtoSelecionado ? (
                <p className="text-gray-400 text-center mt-10 italic">Sem informação de estoque para este item no local 1100</p>
              ) : (
                <p className="text-gray-400 text-center mt-10 italic">Selecione um produto para ver o estoque</p>
              )}
            </div>
          </article>

          <article className="flex flex-col overflow-hidden rounded border border-[#bcc1c9] bg-white shadow-sm xl:col-span-2">
            <div className="flex items-center justify-between border-b border-[#c8ccd3] bg-[#eceef1] p-2 font-bold text-[#3e495b]">
              Logs de Consulta Oracle
              <Settings size={16} />
            </div>
            <div className="p-3 font-mono text-[10px] text-gray-500 bg-gray-50 flex-1 overflow-auto">
               {loading ? '> Executando query no banco...' : produtoSelecionado ? `> Visualizando produto ${produtoSelecionado.CODPROD}` : '> Aguardando interação...'}
               <br />
               {produtos.length > 0 && `> Result set: ${produtos.length} rows`}
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}

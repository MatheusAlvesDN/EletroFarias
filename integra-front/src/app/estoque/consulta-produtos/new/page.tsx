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
  IMAGEM_URL?: string;
};

type ColunaConfig = {
  key: keyof Produto | 'IMAGEM';
  label: string;
  width: number;
  align?: 'left' | 'center' | 'right';
};

const TODAS_COLUNAS: ColunaConfig[] = [
  { key: 'IMAGEM', label: 'Foto', width: 90, align: 'center' },
  { key: 'CODPROD', label: 'Cód.Produto', width: 140 },
  { key: 'DESCRPROD', label: 'Nome / Descrição', width: 480 },
  { key: 'REFERENCIA', label: 'Referência', width: 180 },
  { key: 'CODBARRA', label: 'Cód.Barras', width: 180 },
  { key: 'MARCA', label: 'Marca', width: 180 },
  { key: 'COMPLEMENTO', label: 'Complemento', width: 360 }
];

const keysIniciais: Array<ColunaConfig['key']> = ['IMAGEM', 'CODPROD', 'DESCRPROD', 'REFERENCIA'];

export default function ConsultaProdutosNewPage() {
  const [busca, setBusca] = useState('');
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [alturaInferior, setAlturaInferior] = useState(32);
  const [selectedKeys, setSelectedKeys] = useState<Array<ColunaConfig['key']>>(keysIniciais);
  
  // Larguras das colunas (para o drag resize horizontal)
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(
    Object.fromEntries(TODAS_COLUNAS.map(c => [c.key, c.width]))
  );

  // Colunas filtradas pelo seletor de campos
  const colunasExibidas = useMemo(
    () => TODAS_COLUNAS.filter((col) => selectedKeys.includes(col.key)).map(col => ({
      ...col,
      width: columnWidths[col.key] || col.width
    })),
    [selectedKeys, columnWidths]
  );

  // Redimensionamento horizontal das colunas
  const [resizing, setResizing] = useState<{ key: string; startX: number; startWidth: number } | null>(null);

  const handleMouseDownResizer = (e: React.MouseEvent, key: string, currentWidth: number) => {
    setResizing({ key, startX: e.pageX, startWidth: currentWidth });
    e.preventDefault();
  };

  useEffect(() => {
    if (!resizing) return;
    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.pageX - resizing.startX;
      setColumnWidths(prev => ({
        ...prev,
        [resizing.key]: Math.max(50, resizing.startWidth + delta)
      }));
    };
    const handleMouseUp = () => setResizing(null);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizing]);

  // Busca Oracle
  const fetchProdutos = useCallback(async (termo: string) => {
    if (!termo || termo.trim().length < 2) {
      setProdutos([]);
      return;
    }
    setLoading(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${baseUrl}/database/search?q=${encodeURIComponent(termo.trim())}`);
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

  // Estoque Geral
  const [estoques, setEstoques] = useState<Array<{ CODLOCAL: number; NOME_LOCAL: string; ESTOQUE: number; RESERVADO: number; DISPONIVEL: number }>>([]);
  const [loadingEstoque, setLoadingEstoque] = useState(false);

  useEffect(() => {
    if (!produtoSelecionado) {
      setEstoques([]);
      return;
    }
    const fetchEstoque = async () => {
      setLoadingEstoque(true);
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        const response = await fetch(`${baseUrl}/database/stock/${produtoSelecionado.CODPROD}`);
        const data = await response.json();
        setEstoques(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Erro ao buscar estoque:', error);
      } finally {
        setLoadingEstoque(false);
      }
    };
    fetchEstoque();
  }, [produtoSelecionado]);

  const [preco, setPreco] = useState<{ PRECO: number; TABELA: string } | null>(null);
  const [loadingPreco, setLoadingPreco] = useState(false);

  useEffect(() => {
    if (!produtoSelecionado) {
      setPreco(null);
      return;
    }
    const fetchPreco = async () => {
      setLoadingPreco(true);
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        const response = await fetch(`${baseUrl}/database/price/${produtoSelecionado.CODPROD}`);
        const data = await response.json();
        setPreco(data[0] || null);
      } catch (error) {
        console.error('Erro ao buscar preço:', error);
      } finally {
        setLoadingPreco(false);
      }
    };
    fetchPreco();
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
        <header className="rounded border border-[#c7cbd1] bg-[#f3f4f6] p-2 shadow-sm">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <button onClick={() => setModalOpen(true)} className="rounded border border-[#b9bfc8] bg-white p-2 hover:bg-gray-50" title="Configurar Colunas">
              <Settings size={16} />
            </button>
            <button className="rounded border border-[#b9bfc8] bg-white p-2 hover:bg-gray-50"><Filter size={16} /></button>
            <div className="flex min-w-[420px] items-center gap-2 rounded border border-[#aeb4bd] bg-white px-3 py-1 shadow-inner focus-within:border-blue-400 transition-colors">
              <span className="text-sm font-bold text-gray-500">Busca Oracle:</span>
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full border-none bg-transparent font-semibold outline-none text-gray-800"
                placeholder="Nome, Código, Ref, Marca ou Cód. Barras..."
              />
              {loading ? <Loader2 size={16} className="animate-spin text-blue-500" /> : <Search size={16} className="text-gray-400" />}
            </div>
            <button className="rounded border border-[#b9bfc8] bg-[#3e495b] px-4 py-1 text-white font-medium hover:bg-[#2d3644] transition-colors shadow-sm">
              Outros Filtros
            </button>
            <button className="rounded border border-[#b9bfc8] bg-white p-2 ml-auto shadow-sm"><FileText size={16} /></button>
          </div>
          <div className="flex justify-between items-center px-1">
            <div className="text-xs text-gray-500 font-medium">Conectado ao Banco Nuvemdatacom</div>
            <div className="text-right text-lg font-bold text-[#3e495b]">
              Itens: <span className="text-blue-600">{produtos.length}</span> &nbsp; 
              <span className="text-sm font-normal text-gray-400">Total: 0,00 | Valor: 0,00</span>
            </div>
          </div>
        </header>

        <section className="min-h-0 flex-1 overflow-hidden">
          <div className="h-full" style={{ display: 'grid', gridTemplateRows: `minmax(150px, ${100 - alturaInferior}%) 8px minmax(150px, ${alturaInferior}%)` }}>
            
            {/* Tabela Principal */}
            <div className="min-h-0 overflow-auto rounded border border-[#b7bcc5] bg-white shadow-inner">
              <table className="w-full text-sm border-collapse" style={{ minWidth: `${colunasExibidas.reduce((acc, c) => acc + c.width, 0)}px` }}>
                <thead className="sticky top-0 z-10 bg-[#eceef1] shadow-sm">
                  <tr>
                    {colunasExibidas.map((col) => (
                      <th
                        key={col.key}
                        className="relative border border-[#c7cbd1] p-2 text-left font-bold text-[#3e495b] select-none"
                        style={{ width: `${col.width}px` }}
                      >
                        <div className="truncate pr-4">{col.label}</div>
                        <div
                          onMouseDown={(e) => handleMouseDownResizer(e, col.key, col.width)}
                          className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 transition-colors"
                        />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {!loading && produtos.length === 0 ? (
                    <tr><td colSpan={colunasExibidas.length} className="p-10 text-center text-gray-400 italic bg-gray-50">Digite ao menos 2 caracteres para buscar no Oracle.</td></tr>
                  ) : (
                    produtos.map((p, idx) => (
                      <tr 
                        key={p.CODPROD} 
                        onClick={() => setProdutoSelecionado(p)}
                        className={`cursor-pointer transition-colors ${produtoSelecionado?.CODPROD === p.CODPROD ? 'bg-blue-100' : idx % 2 === 0 ? 'bg-white' : 'bg-[#f8f9fa]'} hover:bg-blue-50`}
                      >
                        {colunasExibidas.map((col) => (
                          <td key={`${p.CODPROD}-${col.key}`} className="border-x border-[#e2e4e8] p-2" style={{ textAlign: col.align ?? 'left' }}>
                            {col.key === 'IMAGEM' ? (
                              <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded bg-gray-100 mx-auto">
                                <img 
                                  src={`https://danilo.nuvemdatacom.com.br:9092/mge/Produto@IMAGEM@CODPROD=${p.CODPROD}.dbimage`} 
                                  alt="" 
                                  className="h-full w-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/50?text=?';
                                  }}
                                />
                              </div>
                            ) : (
                              <span className={col.key === 'CODPROD' ? 'font-mono font-bold text-blue-700' : ''}>
                                {p[col.key as keyof Produto] ?? '-'}
                              </span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Splitter Vertical */}
            <div className="cursor-row-resize bg-[#c4cad3] hover:bg-blue-300 transition-colors" onMouseDown={(e) => {
              const startY = e.clientY;
              const start = alturaInferior;
              const onMove = (ev: MouseEvent) => {
                const deltaPct = ((ev.clientY - startY) / window.innerHeight) * 100;
                setAlturaInferior(Math.min(60, Math.max(15, start - deltaPct)));
              };
              const onUp = () => {
                window.removeEventListener('mousemove', onMove);
                window.removeEventListener('mouseup', onUp);
              };
              window.addEventListener('mousemove', onMove);
              window.addEventListener('mouseup', onUp);
            }} />

            {/* Cards Inferiores */}
            <section className="grid min-h-0 grid-cols-1 gap-3 overflow-hidden md:grid-cols-2 xl:grid-cols-4">
          {/* Card 1: Detalhes do Produto */}
          <article className="flex flex-col overflow-hidden rounded border border-[#bcc1c9] bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-[#c8ccd3] bg-[#eceef1] p-2 font-bold text-[#3e495b]">
              Detalhes do Produto <FileText size={16} />
            </div>
            <div className="flex-1 overflow-auto p-3">
              {produtoSelecionado ? (
                <div className="space-y-3">
                  <div className="flex gap-4">
                    <div className="w-24 h-24 bg-gray-50 border rounded flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                      <img 
                        src={`https://danilo.nuvemdatacom.com.br:9092/mge/Produto@IMAGEM@CODPROD=${produtoSelecionado.CODPROD}.dbimage`}
                        alt=""
                        className="max-w-full max-h-full object-contain"
                        onError={(e) => (e.currentTarget.src = 'https://via.placeholder.com/100?text=S/F')}
                      />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg leading-tight text-gray-900">{produtoSelecionado.DESCRPROD}</h3>
                      <p className="text-sm text-blue-600 font-mono mt-1">Cód: {produtoSelecionado.CODPROD}</p>
                      {produtoSelecionado.MARCA && <p className="text-xs text-gray-500 mt-1 uppercase font-semibold">Marca: {produtoSelecionado.MARCA}</p>}
                    </div>
                  </div>
                  {produtoSelecionado.COMPLEMENTO && (
                    <div className="p-2 bg-gray-50 rounded border text-xs text-gray-600 shadow-sm">
                      <p className="font-bold mb-1 uppercase text-gray-400">Complemento:</p>
                      {produtoSelecionado.COMPLEMENTO}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-400 text-center mt-10 italic">Selecione um produto para ver detalhes</p>
              )}
            </div>
          </article>

          {/* Card 2: Status de Estoque */}
          <article className="flex flex-col overflow-hidden rounded border border-[#bcc1c9] bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-[#c8ccd3] bg-[#eceef1] p-2 font-bold text-[#3e495b]">
              Status de Estoque (Geral) <ShoppingCart size={16} />
            </div>
            <div className="flex-1 overflow-auto p-0">
              {loadingEstoque ? (
                <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin text-blue-500" /></div>
              ) : estoques.length > 0 ? (
                <table className="w-full text-[10px] border-collapse">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr className="text-gray-500 uppercase">
                      <th className="p-1 border-b text-left">Loc</th>
                      <th className="p-1 border-b text-left">Nome</th>
                      <th className="p-1 border-b text-right">Real</th>
                      <th className="p-1 border-b text-right">Disp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {estoques.map(est => (
                      <tr key={est.CODLOCAL} className="hover:bg-blue-50 transition-colors">
                        <td className="p-1 font-bold text-blue-700">{est.CODLOCAL}</td>
                        <td className="p-1 truncate max-w-[80px]">{est.NOME_LOCAL}</td>
                        <td className="p-1 text-right">{est.ESTOQUE}</td>
                        <td className={`p-1 text-right font-bold ${est.DISPONIVEL > 0 ? 'text-green-600' : 'text-red-500'}`}>{est.DISPONIVEL}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : produtoSelecionado ? (
                <p className="text-gray-400 text-center mt-10 italic p-3">Sem informação de estoque</p>
              ) : (
                <p className="text-gray-400 text-center mt-10 italic p-3">Selecione um produto</p>
              )}
            </div>
          </article>

          {/* Card 3: Detalhes de Preço */}
          <article className="flex flex-col overflow-hidden rounded border border-[#bcc1c9] bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-[#c8ccd3] bg-[#eceef1] p-2 font-bold text-[#3e495b]">
              Detalhes de Preço <ShoppingCart size={16} />
            </div>
            <div className="flex-1 overflow-auto p-3">
              {loadingPreco ? (
                <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin text-blue-500" /></div>
              ) : preco ? (
                <div className="space-y-2">
                   <div className="flex justify-between border-b pb-1">
                     <span className="text-xs font-semibold text-gray-500 uppercase">Tabela</span>
                     <span className="font-bold text-gray-800 text-right">{preco.TABELA}</span>
                   </div>
                   <div className="flex justify-between items-center pt-2">
                     <span className="text-sm font-bold text-green-700 uppercase">Preço Venda</span>
                     <span className="text-2xl font-extrabold text-green-800">
                       {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(preco.PRECO)}
                     </span>
                   </div>
                </div>
              ) : produtoSelecionado ? (
                <p className="text-gray-400 text-center mt-10 italic">Nenhum preço encontrado</p>
              ) : (
                <p className="text-gray-400 text-center mt-10 italic">Selecione um produto</p>
              )}
            </div>
          </article>

          {/* Card 4: Logs / Infos */}
          <article className="flex flex-col overflow-hidden rounded border border-[#bcc1c9] bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-[#c8ccd3] bg-[#eceef1] p-2 font-bold text-[#3e495b]">
              Logs de Consulta Oracle <Settings size={16} />
            </div>
            <div className="p-3 font-mono text-[10px] text-gray-400 bg-gray-50 flex-1 overflow-auto">
               {loading ? '> Executando query multi-word no Oracle...' : produtoSelecionado ? `> Visualizando item ${produtoSelecionado.CODPROD}` : '> Aguardando busca...'}
               <br />
               {produtos.length > 0 && `> Result set: ${produtos.length} registros`}
               <br />
               {preco && `> Preço carregado da tabela: ${preco.TABELA}`}
            </div>
          </article>
        </section>
          </div>
        </section>
      </div>

      {/* Modal de Configuração de Colunas */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded border border-[#b8bec7] bg-white shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-[#d1d5db] p-4">
              <h2 className="text-xl font-bold text-gray-800">Configurar Colunas do Grid</h2>
              <button onClick={() => setModalOpen(false)} className="rounded border p-1.5 hover:bg-gray-100 transition-colors"><X size={18} /></button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {TODAS_COLUNAS.map((campo) => (
                  <label key={campo.key} className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer ${selectedKeys.includes(campo.key) ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                    <input 
                      type="checkbox" 
                      className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" 
                      checked={selectedKeys.includes(campo.key)} 
                      onChange={() => toggleField(campo.key)} 
                    />
                    <span className="font-semibold">{campo.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-[#d1d5db] p-4 bg-gray-50 rounded-b">
              <button onClick={() => setModalOpen(false)} className="rounded bg-[#3e495b] hover:bg-[#2d3644] px-6 py-2 text-white font-bold transition-colors">
                Aplicar e Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

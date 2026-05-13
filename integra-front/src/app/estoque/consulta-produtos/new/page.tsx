'use client';

import { Search, Filter, Settings, ShoppingCart, FileText, X, Loader2, Barcode, Plus, Minus, Trash2, User, CheckCircle, ChevronRight } from 'lucide-react';
import { useMemo, useState, useEffect, useCallback } from 'react';
import { crmService } from '@/lib/crmService';
import { databaseService } from '@/lib/databaseService';
import { useAuth } from '@/hooks/useAuth';

type ItemCarrinho = {
  CODPROD: number;
  DESCRPROD: string;
  quantidade: number;
  precoUnitario: number;
};

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
  key: keyof Produto | 'IMAGEM' | 'ACAO' | 'PRECO';
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
  { key: 'PRECO', label: 'Preço', width: 100 },
  { key: 'ACAO', label: 'Ação', width: 80 },
];

const keysIniciais: Array<ColunaConfig['key']> = ['IMAGEM', 'CODPROD', 'DESCRPROD', 'REFERENCIA', 'ACAO'];

export default function ConsultaProdutosNewPage() {
  const { userId } = useAuth();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(false);
  const [precos, setPrecos] = useState<Record<number, number>>({});
  const [modalInfoOpen, setModalInfoOpen] = useState(false);

  // Estados do Orçamento
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<any>(null);
  const [clientes, setClientes] = useState<any[]>([]);
  const [clienteQuery, setClienteQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (clienteQuery.length > 2) {
      databaseService.searchCustomers(clienteQuery).then(data => {
        setClientes(data);
      });
    }
  }, [clienteQuery]);

  const adicionarAoCarrinho = async (produto: Produto) => {
    let preco = precos[produto.CODPROD];

    if (preco === undefined) {
      try {
        const data = await databaseService.getProductPrice(produto.CODPROD);
        preco = data?.PRECO || 0;
        setPrecos(prev => ({ ...prev, [produto.CODPROD]: preco }));
      } catch (error) {
        console.error('Erro ao buscar preço para o carrinho:', error);
        preco = 0;
      }
    }

    setCarrinho(prev => {
      const exists = prev.find(item => item.CODPROD === produto.CODPROD);
      if (exists) {
        return prev.map(item =>
          item.CODPROD === produto.CODPROD
            ? { ...item, quantidade: item.quantidade + 1 }
            : item
        );
      }
      return [...prev, {
        CODPROD: produto.CODPROD,
        DESCRPROD: produto.DESCRPROD,
        quantidade: 1,
        precoUnitario: preco
      }];
    });
    setCartOpen(true);
  };

  const atualizarQuantidade = (codProd: number, delta: number) => {
    setCarrinho(prev => prev.map(item => {
      if (item.CODPROD === codProd) {
        const novaQtd = Math.max(1, item.quantidade + delta);
        return { ...item, quantidade: novaQtd };
      }
      return item;
    }).filter(item => item.quantidade > 0));
  };

  const removerDoCarrinho = (codProd: number) => {
    setCarrinho(prev => prev.filter(item => item.CODPROD !== codProd));
  };

  const totalCarrinho = carrinho.reduce((acc, item) => acc + (item.quantidade * item.precoUnitario), 0);

  const salvarOrçamento = async () => {
    if (!selectedCliente) {
      alert("Por favor, selecione um cliente.");
      return;
    }
    if (carrinho.length === 0) {
      alert("Adicione pelo menos um produto.");
      return;
    }

    setIsSaving(true);
    try {
      await crmService.saveEstoqueOrcamento({
        clienteId: selectedCliente.id,
        vendedorId: userId || '',
        itens: carrinho.map(item => ({
          codProd: item.CODPROD,
          descricao: item.DESCRPROD,
          quantidade: item.quantidade,
          precoUnitario: item.precoUnitario
        }))
      });
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        setCarrinho([]);
        setSelectedCliente(null);
        setCartOpen(false);
      }, 3000);
    } catch (error) {
      console.error(error);
      alert("Erro ao salvar orçamento.");
    } finally {
      setIsSaving(false);
    }
  };

  const [busca, setBusca] = useState('');
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null);
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
      const data = await databaseService.searchProducts(termo.trim());
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
        const data = await databaseService.getProductStock(produtoSelecionado.CODPROD);
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
        const data = await databaseService.getProductPrice(produtoSelecionado.CODPROD);
        setPreco(data || null);
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
            <button
              onClick={() => setCartOpen(true)}
              className="relative rounded border border-[#b9bfc8] bg-white p-2 ml-auto shadow-sm hover:bg-gray-50 transition-colors"
              title="Ver Orçamento"
            >
              <ShoppingCart size={16} />
              {carrinho.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
                  {carrinho.length}
                </span>
              )}
            </button>
            <button className="rounded border border-[#b9bfc8] bg-white p-2 shadow-sm"><FileText size={16} /></button>
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
                            ) : col.key === 'ACAO' ? (
                              <button
                                onClick={(e) => { e.stopPropagation(); adicionarAoCarrinho(p); }}
                                className="flex items-center gap-1 mx-auto rounded bg-green-500 px-2 py-1 text-xs font-bold text-white hover:bg-green-600 transition-colors shadow-sm"
                              >
                                <Plus size={12} /> ADD
                              </button>
                            ) : col.key === 'PRECO' ? (
                              <span className="font-bold text-green-700">
                                {precos[p.CODPROD] 
                                  ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(precos[p.CODPROD])
                                  : '—'}
                              </span>
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
                  Detalhes do Produto
                  <button
                    onClick={() => setModalInfoOpen(true)}
                    disabled={!produtoSelecionado}
                    className="p-1 hover:bg-gray-200 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Ver dados completos"
                  >
                    <FileText size={16} />
                  </button>
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
                    {campo.label}
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

      {/* Modal de Informações Completas do Produto */}
      {modalInfoOpen && produtoSelecionado && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#2f3e54]/60 backdrop-blur-md p-4">
          <div className="w-full max-w-4xl rounded-2xl border border-[#c8ccd3] bg-white shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden">
            {/* Cabeçalho Premium */}
            <div className="flex items-center justify-between border-b border-[#e2e8f0] bg-gradient-to-r from-[#f8fafc] to-[#f1f5f9] p-5">
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600 shadow-sm">
                  <FileText size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">Dados Técnicos do Produto</h2>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-widest mt-0.5">Consulta Detalhada • Oracle</p>
                </div>
              </div>
              <button
                onClick={() => setModalInfoOpen(false)}
                className="group rounded-full p-2 hover:bg-rose-50 transition-all duration-200"
              >
                <X size={24} className="text-slate-400 group-hover:text-rose-500" />
              </button>
            </div>

            <div className="p-8 max-h-[80vh] overflow-auto bg-[#fafbfc]">
              <div className="flex flex-col lg:flex-row gap-10">
                {/* Lado Esquerdo: Imagem Grande */}
                <div className="w-full lg:w-[320px] shrink-0">
                  <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
                    <div className="relative aspect-square w-full bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-center shadow-md overflow-hidden">
                      <img
                        src={`https://danilo.nuvemdatacom.com.br:9092/mge/Produto@IMAGEM@CODPROD=${produtoSelecionado.CODPROD}.dbimage`}
                        alt={produtoSelecionado.DESCRPROD}
                        className="max-w-full max-h-full object-contain transition-transform duration-500 group-hover:scale-110"
                        onError={(e) => (e.currentTarget.src = 'https://via.placeholder.com/300?text=Sem+Imagem')}
                      />
                    </div>
                  </div>

                  <div className="mt-6 p-4 bg-blue-50/50 rounded-xl border border-blue-100/50">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Código Interno</span>
                      <span className="text-lg font-black text-blue-900 font-mono">#{produtoSelecionado.CODPROD}</span>
                    </div>
                  </div>
                </div>

                {/* Lado Direito: Informações Organizadas */}
                <div className="flex-1 space-y-8">
                  {/* Descrição Principal */}
                  <section>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 block">Descrição do Produto</label>
                    <h3 className="text-2xl font-bold text-slate-800 leading-tight">
                      {produtoSelecionado.DESCRPROD}
                    </h3>
                  </section>

                  {/* Grid de Dados */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Referência de Fábrica</label>
                      <div className="px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 shadow-sm">
                        {produtoSelecionado.REFERENCIA || '—'}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Marca / Fabricante</label>
                      <div className="px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-bold text-indigo-600 uppercase shadow-sm">
                        {produtoSelecionado.MARCA || '—'}
                      </div>
                    </div>

                    <div className="space-y-1 md:col-span-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Código de Barras (EAN)</label>
                      <div className="px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-mono text-slate-600 shadow-sm flex items-center gap-2">
                        <Barcode size={14} className="text-slate-400" />
                        {produtoSelecionado.CODBARRA || 'Nenhum código registrado'}
                      </div>
                    </div>
                  </div>

                  {/* Especificações / Complemento */}
                  <section className="pt-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 block">Especificações e Complemento</label>
                    <div className="p-5 bg-white border border-slate-200 rounded-xl text-sm text-slate-600 leading-relaxed whitespace-pre-wrap shadow-inner min-h-[120px] relative">
                      <div className="absolute top-0 right-0 p-2 opacity-5">
                        <FileText size={60} />
                      </div>
                      <div className="relative z-10">
                        {produtoSelecionado.COMPLEMENTO || 'Nenhuma especificação técnica adicional disponível para este item no momento.'}
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            </div>

            {/* Rodapé com Ações */}
            <div className="flex justify-between items-center border-t border-[#e2e8f0] p-6 bg-slate-50">
              <div className="text-[10px] text-slate-400 font-medium italic">
                Última sincronização: {new Date().toLocaleDateString('pt-BR')}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    adicionarAoCarrinho(produtoSelecionado);
                    setModalInfoOpen(false);
                  }}
                  className="rounded-xl bg-green-600 hover:bg-green-700 px-6 py-3 text-white font-bold transition-all shadow-lg hover:shadow-xl active:scale-95 flex items-center gap-2"
                >
                  <Plus size={18} /> Adicionar ao Orçamento
                </button>
                <button
                  onClick={() => setModalInfoOpen(false)}
                  className="rounded-xl bg-slate-800 hover:bg-slate-900 px-10 py-3 text-white font-bold transition-all shadow-lg hover:shadow-xl active:scale-95"
                >
                  Fechar Detalhes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar do Orçamento */}
      <CartSidebar
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
        items={carrinho}
        onUpdateQtd={atualizarQuantidade}
        onRemove={removerDoCarrinho}
        total={totalCarrinho}
        cliente={selectedCliente}
        onSelectCliente={setSelectedCliente}
        clientes={clientes}
        clienteQuery={clienteQuery}
        onClienteQueryChange={setClienteQuery}
        onSave={salvarOrçamento}
        isSaving={isSaving}
        saveSuccess={saveSuccess}
      />
    </main>
  );
}

function CartSidebar({
  isOpen, onClose, items, onUpdateQtd, onRemove, total,
  cliente, onSelectCliente, clientes, clienteQuery, onClienteQueryChange,
  onSave, isSaving, saveSuccess
}: any) {
  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-[70] bg-black/20 backdrop-blur-sm transition-opacity" onClick={onClose} />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 right-0 z-[80] w-full max-w-md bg-[#f8f9fa] shadow-2xl transition-transform duration-300 ease-in-out transform ${isOpen ? 'translate-x-0' : 'translate-x-full'} border-l border-gray-200 flex flex-col`}>
        <div className="flex items-center justify-between p-4 bg-[#3e495b] text-white">
          <div className="flex items-center gap-2">
            <ShoppingCart size={20} />
            <h2 className="font-bold">Seu Orçamento</h2>
            <span className="bg-blue-500 text-[10px] px-2 py-0.5 rounded-full">{items.length} itens</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded transition-colors"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-6">
          {/* Seleção de Cliente */}
          <section className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Cliente do Orçamento</label>
            {!cliente ? (
              <div className="relative">
                <div className="flex items-center gap-2 bg-white border border-gray-300 rounded-lg px-3 py-2 focus-within:border-blue-500 shadow-sm">
                  <User size={16} className="text-gray-400" />
                  <input
                    value={clienteQuery}
                    onChange={(e) => onClienteQueryChange(e.target.value)}
                    placeholder="Buscar cliente (nome ou CPF/CNPJ)..."
                    className="w-full text-sm outline-none bg-transparent"
                  />
                </div>
                {clientes.length > 0 && clienteQuery.length > 2 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-10 max-h-48 overflow-auto">
                    {clientes.map((c: any) => (
                      <button
                        key={c.id}
                        onClick={() => { onSelectCliente(c); onClienteQueryChange(''); }}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-blue-50 transition-colors border-b last:border-0 border-gray-100"
                      >
                        <p className="font-bold text-gray-800">{c.nome}</p>
                        <p className="text-[10px] text-gray-500">{c.documento || 'Sem documento'}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl p-3 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg text-blue-600"><User size={20} /></div>
                  <div>
                    <p className="text-sm font-bold text-blue-900">{cliente.nome}</p>
                    <p className="text-[10px] text-blue-500 font-medium">{cliente.documento}</p>
                  </div>
                </div>
                <button onClick={() => onSelectCliente(null)} className="text-[10px] font-bold text-blue-400 hover:text-rose-500 transition-colors">ALTERAR</button>
              </div>
            )}
          </section>

          {/* Lista de Itens */}
          <section className="space-y-3">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Produtos Selecionados</label>
            {items.length === 0 ? (
              <div className="py-12 text-center">
                <ShoppingCart size={40} className="mx-auto text-gray-200 mb-3" />
                <p className="text-sm text-gray-400 italic">Nenhum produto adicionado ainda.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((item: any) => (
                  <div key={item.CODPROD} className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm hover:border-gray-300 transition-all">
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-gray-800 truncate">{item.DESCRPROD}</p>
                        <p className="text-[10px] text-gray-400 font-mono">#{item.CODPROD}</p>
                      </div>
                      <button onClick={() => onRemove(item.CODPROD)} className="text-gray-300 hover:text-rose-500 transition-colors"><Trash2 size={14} /></button>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center bg-gray-100 rounded-lg p-1">
                        <button onClick={() => onUpdateQtd(item.CODPROD, -1)} className="p-1 hover:bg-white rounded transition-colors"><Minus size={12} /></button>
                        <span className="w-8 text-center text-xs font-bold">{item.quantidade}</span>
                        <button onClick={() => onUpdateQtd(item.CODPROD, 1)} className="p-1 hover:bg-white rounded transition-colors"><Plus size={12} /></button>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-gray-400 line-through">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.precoUnitario)}
                        </p>
                        <p className="text-xs font-black text-blue-700">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.precoUnitario * item.quantidade)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="p-4 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm font-bold text-gray-500">Valor Total</span>
            <span className="text-xl font-black text-blue-900">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total)}
            </span>
          </div>

          <button
            onClick={onSave}
            disabled={isSaving || items.length === 0 || !cliente}
            className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 ${saveSuccess ? 'bg-green-500 text-white' :
                isSaving ? 'bg-gray-400 text-white cursor-not-allowed' :
                  (!cliente || items.length === 0) ? 'bg-gray-200 text-gray-400 cursor-not-allowed' :
                    'bg-[#3e495b] hover:bg-[#2d3644] text-white hover:shadow-xl'
              }`}
          >
            {saveSuccess ? (
              <><CheckCircle size={20} /> Orçamento Salvo!</>
            ) : isSaving ? (
              <><Loader2 size={20} className="animate-spin" /> Salvando...</>
            ) : (
              <><CheckCircle size={20} /> Gerar Orçamento no Banco</>
            )}
          </button>

          <button className="w-full mt-2 py-2 text-[10px] font-bold text-gray-400 hover:text-blue-600 transition-colors uppercase tracking-widest">
            Exportar como PDF
          </button>
        </div>
      </div>
    </>
  );
}

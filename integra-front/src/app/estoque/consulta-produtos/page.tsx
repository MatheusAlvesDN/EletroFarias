'use client';

import { Search, Filter, Settings, ShoppingCart, FileText, X } from 'lucide-react';
import { useMemo, useState } from 'react';

type Produto = {
  codProduto: number;
  dataCusto: string;
  referencia: string;
  nome: string;
  codigo: number;
  descricao: string;
};

type Coluna = {
  key: keyof Produto;
  label: string;
  width: number;
  align?: 'left' | 'center' | 'right';
};

const produtosMock: Produto[] = [
  { codProduto: 8735, dataCusto: '11/04/2026', referencia: '05121.0010.31', nome: 'DISJUNTOR TRIFASICO 10A CURVA C 3KA', codigo: 8735, descricao: 'DISJUNTOR TRIFASICO 10A CURVA C 3KA' },
  { codProduto: 19869, dataCusto: '11/04/2026', referencia: '05121.7010.11', nome: 'DISJUNTOR MONOFASICO 10A CURVA C 3KA', codigo: 19869, descricao: 'DISJUNTOR MONOFASICO 10A CURVA C 3KA' },
  { codProduto: 19083, dataCusto: '11/04/2026', referencia: '05121.7010.31', nome: 'DISJUNTOR TRIFASICO 10A CURVA C 3KA', codigo: 19083, descricao: 'DISJUNTOR TRIFASICO 10A CURVA C 3KA' },
  { codProduto: 6096, dataCusto: '24/03/2026', referencia: '10076405', nome: 'DISJUNTOR MONOFASICO 10A CURVA C 1,5KA', codigo: 6096, descricao: 'DISJUNTOR MONOFASICO 10A CURVA C 1,5KA' },
  { codProduto: 6105, dataCusto: '22/04/2026', referencia: '10076407', nome: 'DISJUNTOR BIPOLAR 10A CURVA C 3KA', codigo: 6105, descricao: 'DISJUNTOR BIPOLAR 10A CURVA C 3KA' },
  { codProduto: 6612, dataCusto: '22/04/2026', referencia: '12501028', nome: 'DISJUNTOR MOTOR 6,3-10A', codigo: 6612, descricao: 'DISJUNTOR MOTOR 6,3-10A' }
];

const colunasIniciais: Coluna[] = [
  { key: 'codProduto', label: 'Cód.Produto', width: 130 },
  { key: 'dataCusto', label: 'Ult. Data de att. custo', width: 200, align: 'center' },
  { key: 'referencia', label: 'Referência', width: 200 },
  { key: 'nome', label: 'Nome', width: 420 },
  { key: 'codigo', label: 'Código', width: 120, align: 'right' },
  { key: 'descricao', label: 'Descrição', width: 420 }
];

export default function ConsultaProdutosPage() {
  const [busca, setBusca] = useState('disjuntor 10A');
  const [modalOpen, setModalOpen] = useState(false);
  const [colunas, setColunas] = useState<Coluna[]>(colunasIniciais);

  const produtos = useMemo(() => {
    const termo = busca.toLowerCase().trim();
    if (!termo) return produtosMock;

    return produtosMock.filter((p) =>
      [p.nome, p.descricao, p.referencia, String(p.codProduto), String(p.codigo)].some((v) =>
        v.toLowerCase().includes(termo)
      )
    );
  }, [busca]);

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

  const resizeColuna = (key: string, delta: number) => {
    setColunas((prev) =>
      prev.map((col) =>
        col.key === key
          ? {
              ...col,
              width: Math.max(100, col.width + delta)
            }
          : col
      )
    );
  };

  return (
    <main className="h-screen overflow-hidden bg-[#e9eaec] p-3 text-[#2f3e54]">
      <div className="mx-auto flex h-full max-w-[1900px] flex-col gap-3">
        <header className="rounded border border-[#c7cbd1] bg-[#f3f4f6] p-2">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <button className="rounded border border-[#b9bfc8] bg-white p-2"><Settings size={16} /></button>
            <button className="rounded border border-[#b9bfc8] bg-white p-2"><Filter size={16} /></button>
            <div className="flex min-w-[320px] items-center gap-2 rounded border border-[#b9bfc8] bg-white px-3 py-1">
              <span className="text-sm font-semibold">Busca:</span>
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full border-none bg-transparent font-semibold outline-none"
                placeholder="Digite para buscar"
              />
              <Search size={16} />
            </div>
            <button
              onClick={() => setModalOpen(true)}
              className="rounded border border-[#b9bfc8] bg-[#3e495b] px-3 py-1 text-white"
            >
              Outros Filtros
            </button>
            <button className="rounded border border-[#b9bfc8] bg-white p-2"><FileText size={16} /></button>
          </div>
          <div className="text-right text-xl font-semibold">Qtde. Itens: {produtos.length} &nbsp; Qtde.Total: 0,00 &nbsp; Valor Total: 0,00</div>
        </header>

        <section className="min-h-0 flex-1 overflow-auto rounded border border-[#bfc3ca] bg-[#f5f5f6]">
          <table className="text-sm" style={{ minWidth: `${colunas.reduce((acc, c) => acc + c.width, 0)}px` }}>
            <thead className="sticky top-0 z-10 bg-[#eceef1] text-left text-lg">
              <tr>
                {colunas.map((col) => (
                  <th
                    key={col.key}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData('text/plain', col.key)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => moveColuna(e.dataTransfer.getData('text/plain'), col.key)}
                    className="relative border border-[#c7cbd1] p-1"
                    style={{ width: `${col.width}px`, minWidth: `${col.width}px` }}
                  >
                    <div className="pr-3">{col.label}</div>
                    <button
                      onClick={() => resizeColuna(col.key, 20)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-xs"
                    >+
                    </button>
                    <button
                      onClick={() => resizeColuna(col.key, -20)}
                      className="absolute right-1 top-1/2 -translate-y-1/2 text-xs"
                    >-
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {produtos.map((p, idx) => (
                <tr key={p.codProduto} className={idx === 1 ? 'bg-[#a8d8b2]' : 'bg-[#f2f3f5]'}>
                  {colunas.map((col) => (
                    <td
                      key={`${p.codProduto}-${col.key}`}
                      className="border border-[#d0d3d8] p-1"
                      style={{ textAlign: col.align ?? 'left' }}
                    >
                      {p[col.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="grid h-[36vh] grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
          {[
            { titulo: 'Entradas pendentes', linhas: [['Status', 'Sem informação']] },
            { titulo: 'Detalhes de estoque', linhas: [['Local', '1100'], ['Nome local', 'TAMBOR'], ['Estoque', '375'], ['Reservado', '13']] },
            { titulo: 'Características', linhas: [['Cód.Produto', '19869'], ['Descrição', 'DISJUNTOR MONOFASICO 10A'], ['Complemento', '-']] },
            { titulo: 'Detalhes de preço', linhas: [['Tipo', 'Atacado'], ['Valor', '6,75'], ['Preço', '6,75']] },
            { titulo: 'Reservas', linhas: [['Nro. Único', '503188'], ['Dt. Negociação', '15/04/2026'], ['Nro. Único', '505772']] },
            { titulo: 'Produtos no carrinho', linhas: [['Qtde. Itens', '0'], ['Qtde. Total', '0,00'], ['Valor Total', '0,00']] }
          ].map((card) => (
            <article key={card.titulo} className="flex min-h-0 flex-col overflow-hidden rounded border border-[#bcc1c9] bg-[#f4f5f7]">
              <div className="flex items-center justify-between border-b border-[#c8ccd3] p-2 font-semibold">
                {card.titulo}
                <ShoppingCart size={16} />
              </div>
              <div className="min-h-0 flex-1 overflow-auto p-2">
                <table className="w-full text-sm">
                  <tbody>
                    {card.linhas.map(([chave, valor], i) => (
                      <tr key={`${card.titulo}-${chave}-${i}`}>
                        <td className="border border-[#d0d3d8] bg-[#eceef1] p-1 font-semibold">{chave}</td>
                        <td className="border border-[#d0d3d8] p-1">{valor}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          ))}
        </section>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-2xl rounded border border-[#b8bec7] bg-white">
            <div className="flex items-center justify-between border-b border-[#d1d5db] p-3">
              <h2 className="text-lg font-semibold">Outros Filtros para consulta</h2>
              <button onClick={() => setModalOpen(false)} className="rounded border p-1"><X size={16} /></button>
            </div>
            <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2">
              <label className="text-sm font-semibold">Marca<input className="mt-1 w-full rounded border p-2" placeholder="Ex: SOPRANO" /></label>
              <label className="text-sm font-semibold">Curva<input className="mt-1 w-full rounded border p-2" placeholder="Ex: C" /></label>
              <label className="text-sm font-semibold">Faixa de preço<input className="mt-1 w-full rounded border p-2" placeholder="Ex: 0 a 50" /></label>
              <label className="text-sm font-semibold">Somente com estoque<select className="mt-1 w-full rounded border p-2"><option>Sim</option><option>Não</option></select></label>
            </div>
            <div className="flex justify-end gap-2 border-t border-[#d1d5db] p-3">
              <button onClick={() => setModalOpen(false)} className="rounded border px-3 py-1">Cancelar</button>
              <button onClick={() => setModalOpen(false)} className="rounded bg-[#3e495b] px-3 py-1 text-white">Aplicar filtros</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

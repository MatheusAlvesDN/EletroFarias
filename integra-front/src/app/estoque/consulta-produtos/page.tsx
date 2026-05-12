'use client';

import { Search, Filter, Settings, ShoppingCart, FileText, X } from 'lucide-react';
import { useMemo, useState } from 'react';

type Produto = { codProduto: number; dataCusto: string; referencia: string; nome: string; codigo: number; descricao: string };
type Coluna = { key: keyof Produto; label: string; width: number; align?: 'left' | 'center' | 'right' };
type CardTabela = { titulo: string; colunas: string[]; linhas: string[][] };

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

const cards: CardTabela[] = [
  { titulo: 'Entradas pendentes', colunas: ['Status', 'Atualização'], linhas: [['Sem informação', '-']] },
  { titulo: 'Detalhes de estoque', colunas: ['Local', 'Nome local', 'Estoque', 'Reservado'], linhas: [['1100', 'TAMBOR', '375', '13']] },
  { titulo: 'Características', colunas: ['Cód.Produto', 'Descrição', 'Complemento'], linhas: [['19869', 'DISJUNTOR MONOFASICO 10A', '-']] },
  { titulo: 'Detalhes de preço', colunas: ['Tipo', 'Valor', 'Preço'], linhas: [['Atacado', '6,75', '6,75']] },
  { titulo: 'Reservas', colunas: ['Nro. Único', 'Dt. Negociação'], linhas: [['503188', '15/04/2026'], ['505772', '27/04/2026']] },
  { titulo: 'Produtos no carrinho', colunas: ['Qtde. Itens', 'Qtde. Total', 'Valor Total'], linhas: [['0', '0,00', '0,00']] }
];

export default function ConsultaProdutosPage() {
  const [busca, setBusca] = useState('disjuntor 10A');
  const [modalOpen, setModalOpen] = useState(false);
  const [colunas, setColunas] = useState<Coluna[]>(colunasIniciais);
  const [alturaInferior, setAlturaInferior] = useState(36);

  const produtos = useMemo(() => {
    const termo = busca.toLowerCase().trim();
    if (!termo) return produtosMock;
    return produtosMock.filter((p) => [p.nome, p.descricao, p.referencia, String(p.codProduto), String(p.codigo)].some((v) => v.toLowerCase().includes(termo)));
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

  return (
    <main className="h-screen overflow-hidden bg-[#e9eaec] p-3 text-[#2f3e54]">
      <div className="mx-auto flex h-full max-w-[1900px] flex-col gap-3">
        <header className="rounded border border-[#c7cbd1] bg-[#f3f4f6] p-2">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <button className="rounded border border-[#b9bfc8] bg-white p-2"><Settings size={16} /></button>
            <button className="rounded border border-[#b9bfc8] bg-white p-2"><Filter size={16} /></button>
            <div className="flex min-w-[320px] items-center gap-2 rounded border border-[#b9bfc8] bg-white px-3 py-1"><span className="text-sm font-semibold">Busca:</span><input value={busca} onChange={(e) => setBusca(e.target.value)} className="w-full border-none bg-transparent font-semibold outline-none" /><Search size={16} /></div>
            <button onClick={() => setModalOpen(true)} className="rounded border border-[#b9bfc8] bg-[#3e495b] px-3 py-1 text-white">Outros Filtros</button>
            <button className="rounded border border-[#b9bfc8] bg-white p-2"><FileText size={16} /></button>
          </div>
          <div className="text-right text-xl font-semibold">Qtde. Itens: {produtos.length} &nbsp; Qtde.Total: 0,00 &nbsp; Valor Total: 0,00</div>
        </header>

        <section className="min-h-0 flex-1 overflow-hidden">
          <div className="h-full" style={{ display: 'grid', gridTemplateRows: `minmax(200px, ${100 - alturaInferior}%) 8px minmax(180px, ${alturaInferior}%)` }}>
            <div className="min-h-0 overflow-auto rounded border border-[#bfc3ca] bg-[#f5f5f6]">
              <table className="text-sm" style={{ minWidth: `${colunas.reduce((acc, c) => acc + c.width, 0)}px` }}>
                <thead className="sticky top-0 z-10 bg-[#eceef1] text-left text-lg">
                  <tr>
                    {colunas.map((col) => (
                      <th key={col.key} draggable onDragStart={(e) => e.dataTransfer.setData('text/plain', col.key)} onDragOver={(e) => e.preventDefault()} onDrop={(e) => moveColuna(e.dataTransfer.getData('text/plain'), col.key)} className="relative border border-[#c7cbd1] p-1" style={{ width: col.width, minWidth: col.width }}>
                        <div className="pr-8">{col.label}</div>
                        <input type="range" min={100} max={600} value={col.width} onChange={(e) => setColunas((prev) => prev.map((c) => c.key === col.key ? { ...c, width: Number(e.target.value) } : c))} className="absolute bottom-0 right-0 w-20" />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {produtos.map((p, idx) => (
                    <tr key={p.codProduto} className={idx === 1 ? 'bg-[#a8d8b2]' : 'bg-[#f2f3f5]'}>
                      {colunas.map((col) => <td key={`${p.codProduto}-${col.key}`} className="border border-[#d0d3d8] p-1" style={{ textAlign: col.align ?? 'left' }}>{p[col.key]}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="cursor-row-resize bg-[#c4cad3]" onMouseDown={(e) => {
              const startY = e.clientY;
              const start = alturaInferior;
              const onMove = (ev: MouseEvent) => {
                const deltaPct = ((ev.clientY - startY) / window.innerHeight) * 100;
                setAlturaInferior(Math.min(55, Math.max(22, start + deltaPct)));
              };
              const onUp = () => {
                window.removeEventListener('mousemove', onMove);
                window.removeEventListener('mouseup', onUp);
              };
              window.addEventListener('mousemove', onMove);
              window.addEventListener('mouseup', onUp);
            }} />

            <section className="grid min-h-0 grid-cols-1 gap-3 overflow-hidden md:grid-cols-2 xl:grid-cols-6">
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

      {modalOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"><div className="w-full max-w-2xl rounded border border-[#b8bec7] bg-white"><div className="flex items-center justify-between border-b border-[#d1d5db] p-3"><h2 className="text-lg font-semibold">Outros Filtros para consulta</h2><button onClick={() => setModalOpen(false)} className="rounded border p-1"><X size={16} /></button></div><div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2"><label className="text-sm font-semibold">Marca<input className="mt-1 w-full rounded border p-2" placeholder="Ex: SOPRANO" /></label><label className="text-sm font-semibold">Curva<input className="mt-1 w-full rounded border p-2" placeholder="Ex: C" /></label><label className="text-sm font-semibold">Faixa de preço<input className="mt-1 w-full rounded border p-2" placeholder="Ex: 0 a 50" /></label><label className="text-sm font-semibold">Somente com estoque<select className="mt-1 w-full rounded border p-2"><option>Sim</option><option>Não</option></select></label></div><div className="flex justify-end gap-2 border-t border-[#d1d5db] p-3"><button onClick={() => setModalOpen(false)} className="rounded border px-3 py-1">Cancelar</button><button onClick={() => setModalOpen(false)} className="rounded bg-[#3e495b] px-3 py-1 text-white">Aplicar filtros</button></div></div></div>}
    </main>
  );
}

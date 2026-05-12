'use client';

import { Search, Filter, Settings, ShoppingCart, FileText } from 'lucide-react';

type Produto = {
  codProduto: number;
  dataCusto: string;
  referencia: string;
  nome: string;
  codigo: number;
  descricao: string;
};

const produtos: Produto[] = [
  { codProduto: 8735, dataCusto: '11/04/2026', referencia: '05121.0010.31', nome: 'DISJUNTOR TRIFASICO 10A CURVA C 3KA', codigo: 8735, descricao: 'DISJUNTOR TRIFASICO 10A CURVA C 3KA' },
  { codProduto: 19869, dataCusto: '11/04/2026', referencia: '05121.7010.11', nome: 'DISJUNTOR MONOFASICO 10A CURVA C 3KA', codigo: 19869, descricao: 'DISJUNTOR MONOFASICO 10A CURVA C 3KA' },
  { codProduto: 19083, dataCusto: '11/04/2026', referencia: '05121.7010.31', nome: 'DISJUNTOR TRIFASICO 10A CURVA C 3KA', codigo: 19083, descricao: 'DISJUNTOR TRIFASICO 10A CURVA C 3KA' },
  { codProduto: 6096, dataCusto: '24/03/2026', referencia: '10076405', nome: 'DISJUNTOR MONOFASICO 10A CURVA C 1,5KA', codigo: 6096, descricao: 'DISJUNTOR MONOFASICO 10A CURVA C 1,5KA' }
];

const cards = [
  { titulo: 'Entradas pendentes', conteudo: 'Sem informação' },
  { titulo: 'Detalhes de estoque', conteudo: 'Local 1100 · TAMBOR\nEstoque: 375 · Reservado: 13' },
  { titulo: 'Características', conteudo: 'Cód.Produto 19869\nDescrição: DISJUNTOR MONOFASICO 10A' },
  { titulo: 'Detalhes de preço', conteudo: 'Atacado: 6,75\nPreço: 6,75' },
  { titulo: 'Reservas', conteudo: '503188 · 15/04/2026\n505772 · 27/04/2026' },
  { titulo: 'Produtos no carrinho', conteudo: 'Qtde. Itens: 0\nQtde. Total: 0,00\nValor Total: 0,00' }
];

export default function ConsultaProdutosPage() {
  return (
    <main className="min-h-screen bg-[#e9eaec] p-3 text-[#2f3e54]">
      <div className="mx-auto max-w-[1900px] space-y-3">
        <header className="rounded border border-[#c7cbd1] bg-[#f3f4f6] p-2">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <button className="rounded border border-[#b9bfc8] bg-white p-2"><Settings size={16} /></button>
            <button className="rounded border border-[#b9bfc8] bg-white p-2"><Filter size={16} /></button>
            <div className="flex items-center gap-2 rounded border border-[#b9bfc8] bg-white px-3 py-1">
              <span className="text-sm font-semibold">Busca:</span>
              <span className="font-semibold">disjuntor 10A</span>
              <Search size={16} />
            </div>
            <button className="rounded border border-[#b9bfc8] bg-[#3e495b] px-3 py-1 text-white">Outros Filtros</button>
            <button className="rounded border border-[#b9bfc8] bg-white p-2"><FileText size={16} /></button>
          </div>
          <div className="text-right text-xl font-semibold">Qtde. Itens: 0 &nbsp; Qtde.Total: 0,00 &nbsp; Valor Total: 0,00</div>
        </header>

        <section className="overflow-hidden rounded border border-[#bfc3ca] bg-[#f5f5f6]">
          <table className="w-full text-sm">
            <thead className="bg-[#eceef1] text-left text-lg">
              <tr>
                <th className="border border-[#c7cbd1] p-1">Cód.Produto</th>
                <th className="border border-[#c7cbd1] p-1">Ult. Data de att. custo</th>
                <th className="border border-[#c7cbd1] p-1">Referência</th>
                <th className="border border-[#c7cbd1] p-1">Nome</th>
                <th className="border border-[#c7cbd1] p-1">Código</th>
                <th className="border border-[#c7cbd1] p-1">Descrição</th>
              </tr>
            </thead>
            <tbody>
              {produtos.map((p, idx) => (
                <tr key={p.codProduto} className={idx === 1 ? 'bg-[#a8d8b2]' : 'bg-[#f2f3f5]'}>
                  <td className="border border-[#d0d3d8] p-1">{p.codProduto}</td>
                  <td className="border border-[#d0d3d8] p-1 text-center">{p.dataCusto}</td>
                  <td className="border border-[#d0d3d8] p-1">{p.referencia}</td>
                  <td className="border border-[#d0d3d8] p-1">{p.nome}</td>
                  <td className="border border-[#d0d3d8] p-1 text-right">{p.codigo}</td>
                  <td className="border border-[#d0d3d8] p-1">{p.descricao}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
          {cards.map((card) => (
            <article key={card.titulo} className="min-h-[280px] rounded border border-[#bcc1c9] bg-[#f4f5f7]">
              <div className="flex items-center justify-between border-b border-[#c8ccd3] p-2 font-semibold">
                {card.titulo}
                <ShoppingCart size={16} />
              </div>
              <pre className="whitespace-pre-wrap p-3 font-sans text-2xl leading-9 text-[#334155]">{card.conteudo}</pre>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}

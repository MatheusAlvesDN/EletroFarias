import React from 'react';

// Tipos de dados
interface MetricData {
  label: string;
  value: string;
  accent: 'green' | 'red' | 'blue';
}

interface PartnerData {
  code: string;
  name: string;
  type: number;
  notes: number;
  totalLiq: number;
  totalST: number;
  totalTrib: number;
  stPB: number;
  tribPB: number;
  rest: number;
}

// Dados simulados (extraídos do HTML original)
const METRICS: MetricData[] = [
  { label: "Faturamento Total", value: "R$ 2.7M", accent: "green" },
  { label: "Fator 10% (ST)", value: "R$ 245.5K", accent: "red" },
  { label: "Fator 7% (ST)", value: "R$ 171.9K", accent: "red" },
  { label: "Fator 10% (Tributado)", value: "R$ 24.9K", accent: "blue" },
  { label: "Fator 7% (Tributado)", value: "R$ 17.4K", accent: "blue" },
];

const TABLE_DATA: PartnerData[] = [
  { code: "001", name: "CONSTRUTORA ROCHA CAVALCANTE LTDA", type: 1, notes: 187, totalLiq: 180958.96, totalST: 162863.06, totalTrib: 18095.90, stPB: 0.00, tribPB: 0.00, rest: 180958.96 },
  { code: "002", name: "ALPARGATAS S/A", type: 2, notes: 156, totalLiq: 142635.78, totalST: 128371.20, totalTrib: 14264.58, stPB: 2150.00, tribPB: 850.00, rest: 139635.78 },
  { code: "003", name: "DFARIAS INDUSTRIA E ENGENHARIA LTDA", type: 1, notes: 203, totalLiq: 195420.54, totalST: 175878.49, totalTrib: 19542.05, stPB: 3250.00, tribPB: 1200.00, rest: 190970.54 },
  { code: "004", name: "TAUA HOTEL E CONVENTION JOAO PESSOA LTDA", type: 3, notes: 89, totalLiq: 87234.15, totalST: 78510.74, totalTrib: 8723.41, stPB: 1500.00, tribPB: 600.00, rest: 85134.15 },
  { code: "005", name: "VITTA 37", type: 2, notes: 124, totalLiq: 156789.23, totalST: 141110.31, totalTrib: 15678.92, stPB: 0.00, tribPB: 0.00, rest: 156789.23 },
  { code: "006", name: "NELFARMA COMERCIO DE PRODUTOS QUIMICOS LTDA", type: 1, notes: 198, totalLiq: 168445.89, totalST: 151601.30, totalTrib: 16844.59, stPB: 5433.88, tribPB: 2086.49, rest: 160925.52 },
  { code: "007", name: "OUTROS PARCEIROS", type: 2, notes: 487, totalLiq: 972776.21, totalST: 876846.33, totalTrib: 97929.88, stPB: -1000.00, tribPB: 0.00, rest: 972776.21 },
];

// Função auxiliar para formatar moeda
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2
  }).format(value);
};

export default function IncentiveReport() {
  
  // Cálculo dos totais
  const totals = TABLE_DATA.reduce((acc, curr) => ({
    notes: acc.notes + curr.notes,
    totalLiq: acc.totalLiq + curr.totalLiq,
    totalST: acc.totalST + curr.totalST,
    totalTrib: acc.totalTrib + curr.totalTrib,
    stPB: acc.stPB + curr.stPB,
    tribPB: acc.tribPB + curr.tribPB,
    rest: acc.rest + curr.rest,
  }), { notes: 0, totalLiq: 0, totalST: 0, totalTrib: 0, stPB: 0, tribPB: 0, rest: 0 });

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#667eea] to-[#764ba2] p-5 md:p-10 font-sans text-slate-800">
      <div className="max-w-[1600px] mx-auto">
        
        {/* Header Section */}
        <header className="mb-10 animate-[slideDown_0.6s_ease-out]">
          <h1 className="text-white text-3xl md:text-4xl font-extrabold tracking-tight mb-2">
            📊 Incentivo Gerencial
          </h1>
          <p className="text-white/90 text-sm md:text-base font-normal tracking-wide">
            Faturamento consolidado e movimentações por parceiros comerciais
          </p>
        </header>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 mb-10">
          {METRICS.map((metric, index) => (
            <div 
              key={index}
              className={`
                relative bg-white rounded-2xl p-7 shadow-xl overflow-hidden
                transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl
                before:absolute before:top-0 before:left-0 before:right-0 before:h-[3px]
                ${metric.accent === 'green' ? 'before:bg-gradient-to-r before:from-green-400 before:to-green-600' : ''}
                ${metric.accent === 'red' ? 'before:bg-gradient-to-r before:from-red-400 before:to-red-600' : ''}
                ${metric.accent === 'blue' ? 'before:bg-gradient-to-r before:from-blue-400 before:to-blue-600' : ''}
              `}
            >
              <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
                {metric.label}
              </div>
              <p className={`
                text-2xl font-extrabold leading-none
                ${metric.accent === 'green' ? 'text-green-800' : ''}
                ${metric.accent === 'red' ? 'text-red-700' : ''}
                ${metric.accent === 'blue' ? 'text-blue-800' : ''}
              `}>
                {metric.value}
              </p>
            </div>
          ))}
        </div>

        {/* Data Section */}
        <div className="bg-white rounded-[20px] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.12)] animate-[fadeIn_0.8s_ease-out_0.2s_both]">
          <div className="bg-gradient-to-br from-[#667eea] to-[#764ba2] p-8 text-white">
            <h2 className="m-0 text-2xl font-bold tracking-tight">Detalhamento por Parceiro</h2>
            <p className="mt-2 text-sm text-white/85">
              1.544 notas fiscais analisadas (Total calculado: {totals.notes})
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b-2 border-slate-200">
                  <th className="py-4 px-4 text-left font-bold text-slate-600 uppercase text-xs tracking-wider whitespace-nowrap">Cód.</th>
                  <th className="py-4 px-4 text-left font-bold text-slate-600 uppercase text-xs tracking-wider whitespace-nowrap">Parceiro</th>
                  <th className="py-4 px-4 text-left font-bold text-slate-600 uppercase text-xs tracking-wider whitespace-nowrap">Type</th>
                  <th className="py-4 px-4 text-center font-bold text-slate-600 uppercase text-xs tracking-wider whitespace-nowrap">Notas</th>
                  <th className="py-4 px-4 text-right font-bold text-slate-600 uppercase text-xs tracking-wider whitespace-nowrap">Total Líquido</th>
                  <th className="py-4 px-4 text-right font-bold text-slate-600 uppercase text-xs tracking-wider whitespace-nowrap">Total ST</th>
                  <th className="py-4 px-4 text-right font-bold text-slate-600 uppercase text-xs tracking-wider whitespace-nowrap">Total Trib.</th>
                  <th className="py-4 px-4 text-right font-bold text-slate-600 uppercase text-xs tracking-wider whitespace-nowrap">ST PB</th>
                  <th className="py-4 px-4 text-right font-bold text-slate-600 uppercase text-xs tracking-wider whitespace-nowrap">Trib. PB</th>
                  <th className="py-4 px-4 text-right font-bold text-slate-600 uppercase text-xs tracking-wider whitespace-nowrap">Resto</th>
                </tr>
              </thead>
              <tbody>
                {TABLE_DATA.map((row, idx) => (
                  <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-semibold text-[#667eea]">{row.code}</td>
                    <td className="p-4 font-semibold text-slate-800 min-w-[200px]">{row.name}</td>
                    <td className="p-4">
                      <span className={`
                        inline-block px-3 py-1 rounded-lg text-xs font-semibold
                        ${row.type === 1 ? 'bg-[#667eea]/10 text-[#667eea]' : ''}
                        ${row.type === 2 ? 'bg-pink-400/10 text-pink-400' : ''}
                        ${row.type === 3 ? 'bg-green-500/10 text-green-500' : ''}
                      `}>
                        {row.type}
                      </span>
                    </td>
                    <td className="p-4 text-center font-semibold text-slate-600">{row.notes}</td>
                    <td className="p-4 text-right font-mono font-bold text-green-800 text-[13px]">{formatCurrency(row.totalLiq)}</td>
                    <td className="p-4 text-right font-mono font-semibold text-slate-700 text-[13px]">{formatCurrency(row.totalST)}</td>
                    <td className="p-4 text-right font-mono font-semibold text-slate-700 text-[13px]">{formatCurrency(row.totalTrib)}</td>
                    <td className="p-4 text-right font-mono font-semibold text-slate-700 text-[13px]">{formatCurrency(row.stPB)}</td>
                    <td className="p-4 text-right font-mono font-semibold text-slate-700 text-[13px]">{formatCurrency(row.tribPB)}</td>
                    <td className="p-4 text-right font-mono font-semibold text-slate-700 text-[13px]">{formatCurrency(row.rest)}</td>
                  </tr>
                ))}

                {/* Total Row */}
                <tr className="bg-gradient-to-r from-slate-100 to-slate-200 border-y-[3px] border-slate-300 font-bold">
                  <td colSpan={3} className="p-4 text-slate-800 text-right uppercase text-xs tracking-wider">Totais Gerais</td>
                  <td className="p-4 text-center text-slate-800">{totals.notes.toLocaleString('pt-BR')}</td>
                  <td className="p-4 text-right font-mono text-[13px] text-slate-900">{formatCurrency(totals.totalLiq)}</td>
                  <td className="p-4 text-right font-mono text-[13px] text-slate-900">{formatCurrency(totals.totalST)}</td>
                  <td className="p-4 text-right font-mono text-[13px] text-slate-900">{formatCurrency(totals.totalTrib)}</td>
                  <td className="p-4 text-right font-mono text-[13px] text-slate-900">{formatCurrency(totals.stPB)}</td>
                  <td className="p-4 text-right font-mono text-[13px] text-slate-900">{formatCurrency(totals.tribPB)}</td>
                  <td className="p-4 text-right font-mono text-[13px] text-slate-900">{formatCurrency(totals.rest)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      {/* Custom Keyframes for Animations (injected style) */}
      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
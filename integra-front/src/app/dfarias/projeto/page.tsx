'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, FileText, Plus, RotateCcw, Trash2, X } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';

type SlotValue =
  | ''
  | 'M 32'
  | 'M 50'
  | 'M 70'
  | 'B 50'
  | 'B 63'
  | 'B 70'
  | 'T 40'
  | 'T 50'
  | 'T 70'
  | 'T 100'
  | 'T 125';

type Side = 'left' | 'right';
type Family = 'M' | 'B' | 'T';

type Slot = {
  id: string;
  value: SlotValue;
};

type RowData = {
  id: number;
  left: Slot[];
  right: Slot[];
};

type PopoverState = {
  slotId: string;
  top: number;
  left: number;
};

type BudgetRow = {
  product: string;
  qty: number;
  unit: string;
  category: 'CABO' | 'DISJUNTOR';
};

const STORAGE_KEY = 'dfarias-projeto-layout-v6';
const TOTAL_ROWS = 3;
const MAX_POSITIONS_PER_SIDE = 5;

const OPTIONS: SlotValue[] = [
  'M 32',
  'M 50',
  'M 70',
  'B 50',
  'B 63',
  'B 70',
  'T 40',
  'T 50',
  'T 70',
  'T 100',
  'T 125',
];

const OPTION_META: Record<
  Exclude<SlotValue, ''>,
  { family: Family; gauge: number; breakerLabel: string }
> = {
  'M 32': { family: 'M', gauge: 6, breakerLabel: 'DISJUNTOR MONOFASICO DE 32' },
  'M 50': { family: 'M', gauge: 10, breakerLabel: 'DISJUNTOR MONOFASICO DE 50' },
  'M 70': { family: 'M', gauge: 16, breakerLabel: 'DISJUNTOR MONOFASICO DE 70' },
  'B 50': { family: 'B', gauge: 10, breakerLabel: 'DISJUNTOR BIFASICO DE 50' },
  'B 63': { family: 'B', gauge: 10, breakerLabel: 'DISJUNTOR BIFASICO DE 63' },
  'B 70': { family: 'B', gauge: 16, breakerLabel: 'DISJUNTOR BIFASICO DE 70' },
  'T 40': { family: 'T', gauge: 6, breakerLabel: 'DISJUNTOR TRIFASICO DE 40' },
  'T 50': { family: 'T', gauge: 10, breakerLabel: 'DISJUNTOR TRIFASICO DE 50' },
  'T 70': { family: 'T', gauge: 16, breakerLabel: 'DISJUNTOR TRIFASICO DE 70' },
  'T 100': { family: 'T', gauge: 35, breakerLabel: 'DISJUNTOR TRIFASICO DE 100' },
  'T 125': { family: 'T', gauge: 50, breakerLabel: 'DISJUNTOR TRIFASICO DE 125' },
};

const LENGTH_TABLE: Record<
  Family,
  Record<number, { left: number[]; right: number[] }>
> = {
  M: {
    1: { left: [220, 272, 320, 370, 422], right: [210, 262, 314, 366, 418] },
    2: { left: [220, 272, 320, 370, 422], right: [210, 262, 314, 366, 418] },
    3: { left: [292, 344, 400, 452, 502], right: [282, 334, 386, 438, 490] },
  },
  B: {
    1: { left: [220, 272, 320, 370, 422], right: [210, 262, 314, 366, 418] },
    2: { left: [220, 272, 320, 370, 422], right: [210, 262, 314, 366, 418] },
    3: { left: [292, 344, 400, 452, 502], right: [282, 334, 386, 438, 490] },
  },
  T: {
    1: { left: [440, 544, 640, 740, 844], right: [420, 524, 628, 732, 836] },
    2: { left: [440, 544, 640, 740, 844], right: [420, 524, 628, 732, 836] },
    3: { left: [584, 688, 800, 904, 1004], right: [564, 668, 772, 876, 980] },
  },
};

function createSlot(rowId: number, side: Side, index: number): Slot {
  return {
    id: `row-${rowId}-${side}-${index}-${Date.now()}`,
    value: '',
  };
}

function buildDefaultRows(): RowData[] {
  return Array.from({ length: TOTAL_ROWS }, (_, index) => ({
    id: index + 1,
    left: [],
    right: [],
  }));
}

function getLengthForSlot(
  family: Family,
  rowId: number,
  side: Side,
  positionFromCenter: number,
): number {
  const rowTable = LENGTH_TABLE[family][rowId];
  const values = rowTable[side];
  const safeIndex = Math.max(0, Math.min(positionFromCenter - 1, values.length - 1));
  return values[safeIndex];
}

export default function ProjetoDfariasPage() {
  const [rows, setRows] = useState<RowData[]>(buildDefaultRows);
  const [popover, setPopover] = useState<PopoverState | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (!saved) return;

      const parsed = JSON.parse(saved) as RowData[];
      if (!Array.isArray(parsed) || parsed.length !== TOTAL_ROWS) return;
      setRows(parsed);
    } catch {
      // ignora falha de leitura
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  }, [rows]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setPopover(null);
      }
    };

    const handleWindowChange = () => {
      setPopover(null);
    };

    document.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('resize', handleWindowChange);
    window.addEventListener('scroll', handleWindowChange, true);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('resize', handleWindowChange);
      window.removeEventListener('scroll', handleWindowChange, true);
    };
  }, []);

  const totalSlots = useMemo(
    () => rows.reduce((acc, row) => acc + row.left.length + row.right.length, 0),
    [rows],
  );

  const preenchidos = useMemo(
    () =>
      rows.reduce(
        (acc, row) =>
          acc +
          row.left.filter((slot) => slot.value).length +
          row.right.filter((slot) => slot.value).length,
        0,
      ),
    [rows],
  );

  const budgetRows = useMemo(() => {
    const cableMap = new Map<number, number>();
    const breakerMap = new Map<string, number>();

    rows.forEach((row) => {
      row.left.forEach((slot, index) => {
        if (!slot.value) return;

        const meta = OPTION_META[slot.value];
        const positionFromCenter = row.left.length - index;
        const length = getLengthForSlot(meta.family, row.id, 'left', positionFromCenter);

        cableMap.set(meta.gauge, (cableMap.get(meta.gauge) || 0) + length);
        breakerMap.set(meta.breakerLabel, (breakerMap.get(meta.breakerLabel) || 0) + 1);
      });

      row.right.forEach((slot, index) => {
        if (!slot.value) return;

        const meta = OPTION_META[slot.value];
        const positionFromCenter = index + 1;
        const length = getLengthForSlot(meta.family, row.id, 'right', positionFromCenter);

        cableMap.set(meta.gauge, (cableMap.get(meta.gauge) || 0) + length);
        breakerMap.set(meta.breakerLabel, (breakerMap.get(meta.breakerLabel) || 0) + 1);
      });
    });

    const cableRows: BudgetRow[] = Array.from(cableMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([gauge, totalLength]) => ({
        category: 'CABO',
        product: `CABO ${gauge} mm²`,
        qty: totalLength,
        unit: 'mm',
      }));

    const breakerRows: BudgetRow[] = Array.from(breakerMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([product, qty]) => ({
        category: 'DISJUNTOR',
        product,
        qty,
        unit: 'un',
      }));

    return [...cableRows, ...breakerRows];
  }, [rows]);

  const addSlot = (rowId: number, side: Side) => {
    setRows((current) =>
      current.map((row) => {
        if (row.id !== rowId) return row;

        if (side === 'left') {
          if (row.left.length >= MAX_POSITIONS_PER_SIDE) return row;
          const nextSlot = createSlot(rowId, side, row.left.length + 1);
          return { ...row, left: [nextSlot, ...row.left] };
        }

        if (row.right.length >= MAX_POSITIONS_PER_SIDE) return row;
        const nextSlot = createSlot(rowId, side, row.right.length + 1);
        return { ...row, right: [...row.right, nextSlot] };
      }),
    );
  };

  const deleteSlot = (rowId: number, side: Side, slotId: string) => {
    setRows((current) =>
      current.map((row) => {
        if (row.id !== rowId) return row;

        if (side === 'left') {
          return { ...row, left: row.left.filter((slot) => slot.id !== slotId) };
        }

        return { ...row, right: row.right.filter((slot) => slot.id !== slotId) };
      }),
    );

    if (popover?.slotId === slotId) {
      setPopover(null);
    }
  };

  const updateSlotValue = (slotId: string, nextValue: SlotValue) => {
    setRows((current) =>
      current.map((row) => ({
        ...row,
        left: row.left.map((slot) => (slot.id === slotId ? { ...slot, value: nextValue } : slot)),
        right: row.right.map((slot) =>
          slot.id === slotId ? { ...slot, value: nextValue } : slot,
        ),
      })),
    );

    setPopover(null);
  };

  const resetLayout = () => {
    setRows(buildDefaultRows());
    setPopover(null);
  };

  const handlePrintBudget = () => {
    window.print();
  };

  const openPopover = (slotId: string, event: React.MouseEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();

    setPopover((current) =>
      current?.slotId === slotId
        ? null
        : {
            slotId,
            top: rect.bottom + 8,
            left: rect.left + rect.width / 2,
          },
    );
  };

  const renderSlot = (rowId: number, side: Side, slot: Slot) => {
    const isOpen = popover?.slotId === slot.id;

    return (
      <div
        key={slot.id}
        className={`relative flex h-[156px] w-[120px] items-center justify-center border border-slate-300 bg-amber-100 ${
          side === 'left' ? 'border-r-0' : 'border-l-0'
        }`}
      >
        <div className="flex h-full w-full flex-col items-center justify-between p-2">
          <div className="flex w-full justify-end print:hidden">
            <button
              type="button"
              onClick={() => deleteSlot(rowId, side, slot.id)}
              className="inline-flex h-7 w-7 items-center justify-center rounded-full text-red-500 transition hover:bg-red-50"
              title="Excluir quadrado"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={(event) => openPopover(slot.id, event)}
            className="flex min-h-[86px] w-full items-center justify-center rounded-xl border border-amber-300 bg-white px-3 py-2 text-center text-xl font-black text-slate-800 transition hover:bg-slate-50 print:pointer-events-none"
          >
            {slot.value || '--'}
          </button>

          <div className="h-7 print:hidden" />

          {isOpen &&
            createPortal(
              <div
                ref={popoverRef}
                className="fixed z-[1000] w-48 -translate-x-1/2 rounded-xl border border-slate-200 bg-white p-2 shadow-2xl print:hidden"
                style={{
                  top: popover.top,
                  left: popover.left,
                }}
              >
                <div className="mb-1 flex items-center justify-between px-1 py-1">
                  <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                    Opções
                  </span>
                  <button
                    type="button"
                    onClick={() => setPopover(null)}
                    className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="max-h-80 overflow-y-auto pr-1">
                  {OPTIONS.map((option) => {
                    const selected = slot.value === option;

                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => updateSlotValue(slot.id, option)}
                        className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-semibold transition ${
                          selected
                            ? 'bg-slate-900 text-white'
                            : 'text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <span>{option}</span>
                        {selected && <Check className="h-4 w-4" />}
                      </button>
                    );
                  })}
                </div>
              </div>,
              document.body,
            )}
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout title="Projeto Dfarias" subtitle="Mapa editável dos espaços do projeto">
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-5 px-4 py-6 md:px-6 lg:px-8">
        <style jsx global>{`
          @media print {
            body {
              background: white !important;
            }

            .print-hide {
              display: none !important;
            }

            .print-area {
              box-shadow: none !important;
              border-color: #cbd5e1 !important;
            }
          }
        `}</style>

        <section className="print-hide flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-black text-slate-800 md:text-2xl">/dfarias/projeto</h1>
            <p className="mt-1 text-sm text-slate-500">
              Orçamento separado por cabos e disjuntores com impressão em PDF.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
              {preenchidos} / {totalSlots}
            </div>

            <button
              onClick={resetLayout}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <RotateCcw className="h-4 w-4" />
              Restaurar
            </button>

            <button
              onClick={handlePrintBudget}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <FileText className="h-4 w-4" />
              Imprimir orçamento em PDF
            </button>
          </div>
        </section>

        <section className="print-area overflow-visible rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="overflow-x-auto overflow-y-visible pb-6">
            <div className="flex min-w-[900px] flex-col">
              {rows.map((row, index) => (
                <div
                  key={row.id}
                  className={`grid grid-cols-[52px_1fr_132px_1fr_52px] items-stretch ${
                    index > 0 ? '-mt-px' : ''
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => addSlot(row.id, 'left')}
                    disabled={row.left.length >= MAX_POSITIONS_PER_SIDE}
                    className={`print:hidden flex h-[156px] items-center justify-center border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 ${
                      index === 0 ? 'rounded-tl-xl' : ''
                    } ${index === rows.length - 1 ? 'rounded-bl-xl' : ''}`}
                    title="Adicionar à esquerda"
                  >
                    <Plus className="h-5 w-5" />
                  </button>

                  <div className="flex items-stretch justify-end">
                    {row.left.map((slot) => renderSlot(row.id, 'left', slot))}
                  </div>

                  <div className="flex h-[156px] items-center justify-center border border-slate-300 bg-lime-300 px-4 text-center">
                    <span className="text-sm font-black uppercase tracking-[0.18em] text-lime-950">
                      Centro
                    </span>
                  </div>

                  <div className="flex items-stretch justify-start">
                    {row.right.map((slot) => renderSlot(row.id, 'right', slot))}
                  </div>

                  <button
                    type="button"
                    onClick={() => addSlot(row.id, 'right')}
                    disabled={row.right.length >= MAX_POSITIONS_PER_SIDE}
                    className={`print:hidden flex h-[156px] items-center justify-center border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 ${
                      index === 0 ? 'rounded-tr-xl' : ''
                    } ${index === rows.length - 1 ? 'rounded-br-xl' : ''}`}
                    title="Adicionar à direita"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="print-area rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-black text-slate-800">Orçamento</h2>
            <p className="mt-1 text-sm text-slate-500">
              Itens separados entre cabos e disjuntores.
            </p>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[760px]">
              <div className="grid grid-cols-[140px_1fr_140px_120px] rounded-t-xl border border-slate-200 bg-slate-50 text-sm font-bold text-slate-600">
                <div className="border-r border-slate-200 px-4 py-3">Categoria</div>
                <div className="border-r border-slate-200 px-4 py-3">Produto</div>
                <div className="border-r border-slate-200 px-4 py-3">Qtd</div>
                <div className="px-4 py-3">Unidade</div>
              </div>

              {budgetRows.length === 0 ? (
                <div className="rounded-b-xl border border-t-0 border-slate-200 px-4 py-6 text-sm text-slate-500">
                  Nenhum item calculado ainda.
                </div>
              ) : (
                budgetRows.map((item, index) => (
                  <div
                    key={`${item.category}-${item.product}`}
                    className={`grid grid-cols-[140px_1fr_140px_120px] border border-t-0 border-slate-200 text-sm ${
                      index === budgetRows.length - 1 ? 'rounded-b-xl' : ''
                    }`}
                  >
                    <div className="border-r border-slate-200 px-4 py-3 font-bold text-slate-800">
                      {item.category}
                    </div>
                    <div className="border-r border-slate-200 px-4 py-3 text-slate-700">
                      {item.product}
                    </div>
                    <div className="border-r border-slate-200 px-4 py-3 text-slate-700">
                      {item.qty}
                    </div>
                    <div className="px-4 py-3 text-slate-700">{item.unit}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </main>
    </DashboardLayout>
  );
}
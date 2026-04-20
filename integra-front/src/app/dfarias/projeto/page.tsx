'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Pencil, Plus, RotateCcw, X } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';

type SlotValue = '' | 'M 32' | 'M 50' | 'M 70' | 'B 50' | 'B 63' | 'B 70' | 'T 40' | 'T 50' | 'T 70' | 'T 100' | 'T 125';

type Side = 'left' | 'right';

type Slot = {
  id: string;
  value: SlotValue;
};

type RowData = {
  id: number;
  left: Slot[];
  right: Slot[];
};

const STORAGE_KEY = 'dfarias-projeto-layout-v3';
const TOTAL_ROWS = 3;

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

function createSlot(rowId: number, side: Side, index: number): Slot {
  return {
    id: `row-${rowId}-${side}-${index}`,
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

export default function ProjetoDfariasPage() {
  const [rows, setRows] = useState<RowData[]>(buildDefaultRows);
  const [openSlotId, setOpenSlotId] = useState<string | null>(null);
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
        setOpenSlotId(null);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const totalSlots = useMemo(
    () => rows.reduce((acc, row) => acc + row.left.length + row.right.length, 0),
    [rows],
  );

  const preenchidos = useMemo(
    () => rows.reduce(
      (acc, row) =>
        acc + row.left.filter((slot) => slot.value).length + row.right.filter((slot) => slot.value).length,
      0,
    ),
    [rows],
  );

  const addSlot = (rowId: number, side: Side) => {
    setRows((current) =>
      current.map((row) => {
        if (row.id !== rowId) return row;

        const nextIndex = side === 'left' ? row.left.length : row.right.length;
        const nextSlot = createSlot(rowId, side, nextIndex + 1);

        return side === 'left'
          ? { ...row, left: [...row.left, nextSlot] }
          : { ...row, right: [...row.right, nextSlot] };
      }),
    );
  };

  const updateSlotValue = (slotId: string, nextValue: SlotValue) => {
    setRows((current) =>
      current.map((row) => ({
        ...row,
        left: row.left.map((slot) => (slot.id === slotId ? { ...slot, value: nextValue } : slot)),
        right: row.right.map((slot) => (slot.id === slotId ? { ...slot, value: nextValue } : slot)),
      })),
    );
    setOpenSlotId(null);
  };

  const resetLayout = () => {
    setRows(buildDefaultRows());
    setOpenSlotId(null);
  };

  return (
    <DashboardLayout title="Projeto Dfarias" subtitle="Mapa editável dos espaços do projeto">
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-xl font-black text-slate-800 md:text-2xl">/dfarias/projeto</h1>
              <p className="mt-1 text-sm text-slate-500">
                A tela começa só com a coluna central. Use os botões + para adicionar novos quadrados nas laterais.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-600">
                {preenchidos} de {totalSlots} espaços preenchidos
              </div>
              <button
                onClick={resetLayout}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                <RotateCcw className="h-4 w-4" />
                Restaurar padrão
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
          <div className="mb-4 flex flex-wrap items-center gap-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
            <span className="rounded-full bg-yellow-100 px-3 py-1 text-yellow-700">Espaço editável</span>
            <span className="rounded-full bg-lime-200 px-3 py-1 text-lime-800">Coluna central fixa</span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">Expansão por quadrado</span>
          </div>

          <div className="flex flex-col gap-4">
            {rows.map((row) => (
              <div
                key={row.id}
                className="overflow-x-auto rounded-2xl border border-slate-300 bg-slate-100 p-3"
              >
                <div className="flex min-w-max items-stretch gap-0">
                  <div className="flex items-stretch">
                    {[...row.left].reverse().map((slot) => {
                      const isOpen = openSlotId === slot.id;

                      return (
                        <div
                          key={slot.id}
                          className="relative flex min-h-[160px] w-[120px] items-center justify-center border border-r-0 border-slate-300 bg-yellow-300"
                        >
                          <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-3">
                            <button
                              type="button"
                              onClick={() => setOpenSlotId((current) => (current === slot.id ? null : slot.id))}
                              className="flex min-h-[84px] w-full items-center justify-center rounded-2xl border border-yellow-500/70 bg-yellow-200 px-4 py-3 text-center text-2xl font-black text-slate-800 shadow-sm transition hover:scale-[1.01] hover:shadow-md"
                            >
                              {slot.value || '--'}
                            </button>

                            <button
                              type="button"
                              onClick={() => addSlot(row.id, 'left')}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-100"
                            >
                              <Plus className="h-4 w-4" />
                            </button>

                            {isOpen && (
                              <div
                                ref={popoverRef}
                                className="absolute left-1/2 top-1/2 z-20 w-40 -translate-x-1/2 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl"
                              >
                                <div className="mb-1 flex items-center justify-between px-2 py-1">
                                  <span className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
                                    Linha {row.id}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => setOpenSlotId(null)}
                                    className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </div>

                                <div className="max-h-80 overflow-y-auto">
                                  {OPTIONS.map((option) => {
                                    const selected = slot.value === option;
                                    return (
                                      <button
                                        key={option}
                                        type="button"
                                        onClick={() => updateSlotValue(slot.id, option)}
                                        className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-bold transition ${
                                          selected ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
                                        }`}
                                      >
                                        <span>{option}</span>
                                        {selected && <Check className="h-4 w-4" />}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    <button
                      type="button"
                      onClick={() => addSlot(row.id, 'left')}
                      className="flex min-h-[160px] w-[64px] items-center justify-center border border-r-0 border-slate-300 bg-white text-slate-600 transition hover:bg-slate-50"
                    >
                      <Plus className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="flex min-h-[160px] w-[120px] items-center justify-center border border-slate-300 bg-lime-400/85 px-4 text-center text-sm font-black uppercase tracking-[0.25em] text-lime-900/70">
                    Centro
                  </div>

                  <div className="flex items-stretch">
                    <button
                      type="button"
                      onClick={() => addSlot(row.id, 'right')}
                      className="flex min-h-[160px] w-[64px] items-center justify-center border border-l-0 border-slate-300 bg-white text-slate-600 transition hover:bg-slate-50"
                    >
                      <Plus className="h-5 w-5" />
                    </button>

                    {row.right.map((slot) => {
                      const isOpen = openSlotId === slot.id;

                      return (
                        <div
                          key={slot.id}
                          className="relative flex min-h-[160px] w-[120px] items-center justify-center border border-l-0 border-slate-300 bg-yellow-300"
                        >
                          <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-3">
                            <button
                              type="button"
                              onClick={() => setOpenSlotId((current) => (current === slot.id ? null : slot.id))}
                              className="flex min-h-[84px] w-full items-center justify-center rounded-2xl border border-yellow-500/70 bg-yellow-200 px-4 py-3 text-center text-2xl font-black text-slate-800 shadow-sm transition hover:scale-[1.01] hover:shadow-md"
                            >
                              {slot.value || '--'}
                            </button>

                            <button
                              type="button"
                              onClick={() => addSlot(row.id, 'right')}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-100"
                            >
                              <Plus className="h-4 w-4" />
                            </button>

                            {isOpen && (
                              <div
                                ref={popoverRef}
                                className="absolute left-1/2 top-1/2 z-20 w-40 -translate-x-1/2 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl"
                              >
                                <div className="mb-1 flex items-center justify-between px-2 py-1">
                                  <span className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
                                    Linha {row.id}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => setOpenSlotId(null)}
                                    className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </div>

                                <div className="max-h-80 overflow-y-auto">
                                  {OPTIONS.map((option) => {
                                    const selected = slot.value === option;
                                    return (
                                      <button
                                        key={option}
                                        type="button"
                                        onClick={() => updateSlotValue(slot.id, option)}
                                        className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-bold transition ${
                                          selected ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
                                        }`}
                                      >
                                        <span>{option}</span>
                                        {selected && <Check className="h-4 w-4" />}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </DashboardLayout>
  );
}
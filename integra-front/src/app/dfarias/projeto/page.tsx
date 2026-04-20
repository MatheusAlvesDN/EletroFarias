'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Plus, RotateCcw, Trash2, X } from 'lucide-react';
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

  const vazios = totalSlots - preenchidos;

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

  const deleteSlot = (rowId: number, side: Side, slotId: string) => {
    setRows((current) =>
      current.map((row) => {
        if (row.id !== rowId) return row;

        if (side === 'left') {
          return {
            ...row,
            left: row.left.filter((slot) => slot.id !== slotId),
          };
        }

        return {
          ...row,
          right: row.right.filter((slot) => slot.id !== slotId),
        };
      }),
    );

    if (openSlotId === slotId) {
      setOpenSlotId(null);
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
    setOpenSlotId(null);
  };

  const resetLayout = () => {
    setRows(buildDefaultRows());
    setOpenSlotId(null);
  };

  const renderSlot = (rowId: number, side: Side, slot: Slot) => {
    const isOpen = openSlotId === slot.id;

    return (
      <div
        key={slot.id}
        className="relative flex min-h-[178px] w-[132px] items-center justify-center border border-slate-300 bg-gradient-to-br from-amber-200 via-yellow-200 to-amber-300 shadow-sm"
      >
        <div className="flex h-full w-full flex-col items-center justify-between gap-3 p-3">
          <div className="flex w-full items-center justify-between">
            <span className="rounded-full bg-white/70 px-2 py-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-600">
              {side === 'left' ? 'Esq' : 'Dir'}
            </span>

            <button
              type="button"
              onClick={() => deleteSlot(rowId, side, slot.id)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-red-200 bg-white/80 text-red-500 transition hover:bg-red-50 hover:text-red-600"
              title="Excluir quadrado"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setOpenSlotId((current) => (current === slot.id ? null : slot.id))}
            className="flex min-h-[92px] w-full items-center justify-center rounded-2xl border border-amber-500/60 bg-white/70 px-4 py-3 text-center text-2xl font-black text-slate-800 shadow-md backdrop-blur-sm transition hover:-translate-y-0.5 hover:shadow-lg"
          >
            {slot.value || '--'}
          </button>

          <button
            type="button"
            onClick={() => addSlot(rowId, side)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 shadow-sm transition hover:scale-105 hover:bg-slate-50"
            title="Adicionar novo quadrado"
          >
            <Plus className="h-4 w-4" />
          </button>

          {isOpen && (
            <div
              ref={popoverRef}
              className="absolute left-1/2 top-1/2 z-20 w-44 -translate-x-1/2 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl"
            >
              <div className="mb-1 flex items-center justify-between px-2 py-1">
                <span className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
                  Linha {rowId}
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
  };

  return (
    <DashboardLayout title="Projeto Dfarias" subtitle="Mapa editável dos espaços do projeto">
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-5 text-white shadow-lg md:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.22em] text-slate-200">
                Layout do projeto
              </span>
              <h1 className="mt-3 text-2xl font-black md:text-3xl">/dfarias/projeto</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-300 md:text-[15px]">
                A tela começa apenas com a coluna central. Use os botões de adicionar para criar
                novos quadrados e o ícone da lixeira para remover qualquer bloco lateral.
              </p>
            </div>

            <button
              onClick={resetLayout}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/15"
            >
              <RotateCcw className="h-4 w-4" />
              Restaurar padrão
            </button>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
              Total de quadrados
            </p>
            <strong className="mt-2 block text-3xl font-black text-slate-800">{totalSlots}</strong>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-600">
              Preenchidos
            </p>
            <strong className="mt-2 block text-3xl font-black text-emerald-700">
              {preenchidos}
            </strong>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-600">
              Vazios
            </p>
            <strong className="mt-2 block text-3xl font-black text-amber-700">{vazios}</strong>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
          <div className="mb-5 flex flex-wrap items-center gap-3 text-xs font-bold uppercase tracking-[0.18em]">
            <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-700">
              Espaço editável
            </span>
            <span className="rounded-full bg-lime-200 px-3 py-1 text-lime-800">
              Coluna central fixa
            </span>
            <span className="rounded-full bg-rose-100 px-3 py-1 text-rose-700">
              Exclusão por quadrado
            </span>
          </div>

          <div className="flex flex-col gap-5">
            {rows.map((row) => (
              <div
                key={row.id}
                className="overflow-x-auto rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100 p-4 shadow-inner"
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-black uppercase tracking-[0.22em] text-white">
                    Linha {row.id}
                  </span>
                </div>

                <div className="flex min-w-max items-stretch gap-0">
                  <div className="flex items-stretch">
                    {[...row.left].reverse().map((slot) => renderSlot(row.id, 'left', slot))}

                    <button
                      type="button"
                      onClick={() => addSlot(row.id, 'left')}
                      className="flex min-h-[178px] w-[70px] items-center justify-center border border-r-0 border-slate-300 bg-white text-slate-600 transition hover:bg-slate-50"
                      title="Adicionar quadrado à esquerda"
                    >
                      <Plus className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="flex min-h-[178px] w-[132px] items-center justify-center border border-slate-300 bg-gradient-to-br from-lime-300 via-lime-400 to-emerald-400 px-4 text-center shadow-sm">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.24em] text-lime-950/70">
                        Coluna fixa
                      </p>
                      <p className="mt-2 text-lg font-black uppercase tracking-[0.2em] text-lime-950">
                        Centro
                      </p>
                    </div>
                  </div>

                  <div className="flex items-stretch">
                    <button
                      type="button"
                      onClick={() => addSlot(row.id, 'right')}
                      className="flex min-h-[178px] w-[70px] items-center justify-center border border-l-0 border-slate-300 bg-white text-slate-600 transition hover:bg-slate-50"
                      title="Adicionar quadrado à direita"
                    >
                      <Plus className="h-5 w-5" />
                    </button>

                    {row.right.map((slot) => renderSlot(row.id, 'right', slot))}
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
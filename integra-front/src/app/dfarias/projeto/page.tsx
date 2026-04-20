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

const STORAGE_KEY = 'dfarias-projeto-layout-v4';
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

  const addSlot = (rowId: number, side: Side) => {
    setRows((current) =>
      current.map((row) => {
        if (row.id !== rowId) return row;

        if (side === 'left') {
          const nextSlot = createSlot(rowId, side, row.left.length + 1);
          return { ...row, left: [nextSlot, ...row.left] };
        }

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
        className={`relative flex min-h-[156px] w-[120px] items-center justify-center border border-slate-300 bg-amber-100 ${
          side === 'left' ? 'border-r-0' : 'border-l-0'
        }`}
      >
        <div className="flex h-full w-full flex-col items-center justify-between p-2">
          <div className="flex w-full justify-end">
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
            onClick={() => setOpenSlotId((current) => (current === slot.id ? null : slot.id))}
            className="flex min-h-[86px] w-full items-center justify-center rounded-xl border border-amber-300 bg-white px-3 py-2 text-center text-xl font-black text-slate-800 transition hover:bg-slate-50"
          >
            {slot.value || '--'}
          </button>

          <div className="h-7" />

          {isOpen && (
            <div
              ref={popoverRef}
              className="absolute left-1/2 top-full z-50 mt-2 w-44 -translate-x-1/2 rounded-xl border border-slate-200 bg-white p-2 shadow-xl"
            >
              <div className="mb-1 flex items-center justify-between px-1 py-1">
                <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                  Opções
                </span>
                <button
                  type="button"
                  onClick={() => setOpenSlotId(null)}
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
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-5 px-4 py-6 md:px-6 lg:px-8">
        <section className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-black text-slate-800 md:text-2xl">/dfarias/projeto</h1>
            <p className="mt-1 text-sm text-slate-500">
              Layout limpo e contínuo com as 3 linhas dentro do mesmo painel.
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
          </div>
        </section>

        <section className="overflow-visible rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="overflow-x-auto overflow-y-visible pb-24">
            <div className="flex min-w-max flex-col gap-0">
              {rows.map((row, index) => (
                <div
                  key={row.id}
                  className={`${index > 0 ? '-mt-px' : ''} flex items-stretch`}
                >
                  <button
                    type="button"
                    onClick={() => addSlot(row.id, 'left')}
                    className={`flex min-h-[156px] w-[52px] items-center justify-center border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-50 ${
                      index === 0 ? 'rounded-tl-xl' : ''
                    } ${index === rows.length - 1 ? 'rounded-bl-xl' : ''}`}
                    title="Adicionar à esquerda"
                  >
                    <Plus className="h-5 w-5" />
                  </button>

                  <div className="flex items-stretch">
                    {row.left.map((slot) => renderSlot(row.id, 'left', slot))}
                  </div>

                  <div className="flex min-h-[156px] w-[120px] items-center justify-center border border-slate-300 bg-lime-300 px-4 text-center">
                    <span className="text-sm font-black uppercase tracking-[0.18em] text-lime-950">
                      Centro
                    </span>
                  </div>

                  <div className="flex items-stretch">
                    {row.right.map((slot) => renderSlot(row.id, 'right', slot))}
                  </div>

                  <button
                    type="button"
                    onClick={() => addSlot(row.id, 'right')}
                    className={`flex min-h-[156px] w-[52px] items-center justify-center border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-50 ${
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
      </main>
    </DashboardLayout>
  );
}
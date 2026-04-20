'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Pencil, RotateCcw, X } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';

type SlotValue = '' | 'M 32' | 'M 50' | 'M 70' | 'B 50' | 'B 63' | 'B 70' | 'T 40' | 'T 50' | 'T 70' | 'T 100' | 'T 125';

type SlotType = 'slot' | 'blocked';

type Slot = {
  id: string;
  column: string;
  row: number;
  type: SlotType;
  value: SlotValue;
};

const STORAGE_KEY = 'dfarias-projeto-layout';

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

const DEFAULT_SLOTS: Slot[] = [
  { id: 'D1', column: 'D', row: 1, type: 'slot', value: 'T 50' },
  { id: 'E1', column: 'E', row: 1, type: 'slot', value: 'T 50' },
  { id: 'F1', column: 'F', row: 1, type: 'blocked', value: '' },
  { id: 'G1', column: 'G', row: 1, type: 'slot', value: 'T 50' },
  { id: 'H1', column: 'H', row: 1, type: 'slot', value: 'T 50' },
  { id: 'I1', column: 'I', row: 1, type: 'slot', value: '' },

  { id: 'D2', column: 'D', row: 2, type: 'slot', value: 'T 50' },
  { id: 'E2', column: 'E', row: 2, type: 'slot', value: 'T 50' },
  { id: 'F2', column: 'F', row: 2, type: 'blocked', value: '' },
  { id: 'G2', column: 'G', row: 2, type: 'slot', value: 'T 50' },
  { id: 'H2', column: 'H', row: 2, type: 'slot', value: 'T 50' },
  { id: 'I2', column: 'I', row: 2, type: 'slot', value: '' },

  { id: 'D3', column: 'D', row: 3, type: 'slot', value: 'T 50' },
  { id: 'E3', column: 'E', row: 3, type: 'slot', value: 'T 50' },
  { id: 'F3', column: 'F', row: 3, type: 'blocked', value: '' },
  { id: 'G3', column: 'G', row: 3, type: 'slot', value: 'T 50' },
  { id: 'H3', column: 'H', row: 3, type: 'slot', value: 'T 50' },
  { id: 'I3', column: 'I', row: 3, type: 'slot', value: '' },
];

export default function ProjetoDfariasPage() {
  const [slots, setSlots] = useState<Slot[]>(DEFAULT_SLOTS);
  const [openSlotId, setOpenSlotId] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (!saved) return;

      const parsed = JSON.parse(saved) as Slot[];
      if (Array.isArray(parsed) && parsed.length === DEFAULT_SLOTS.length) {
        setSlots(parsed);
      }
    } catch {
      // ignora falha de leitura do localStorage
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(slots));
  }, [slots]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setOpenSlotId(null);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const activeSlots = useMemo(() => slots.filter((slot) => slot.type === 'slot'), [slots]);
  const preenchidos = activeSlots.filter((slot) => slot.value).length;

  const updateSlotValue = (slotId: string, nextValue: SlotValue) => {
    setSlots((current) =>
      current.map((slot) => (slot.id === slotId ? { ...slot, value: nextValue } : slot)),
    );
    setOpenSlotId(null);
  };

  const resetLayout = () => {
    setSlots(DEFAULT_SLOTS);
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
                Clique em um espaço amarelo para trocar a medida usando as opções da referência.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-600">
                {preenchidos} de {activeSlots.length} espaços preenchidos
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
            <span className="rounded-full bg-lime-200 px-3 py-1 text-lime-800">Corredor / bloqueado</span>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[820px] rounded-2xl border border-slate-300 bg-slate-100 p-3">
              <div className="grid grid-cols-6 gap-0 overflow-hidden rounded-xl border border-slate-300 bg-slate-300">
                {['D', 'E', 'F', 'G', 'H', 'I'].map((column) => (
                  <div
                    key={`header-${column}`}
                    className="flex h-12 items-center justify-center border-r border-slate-300 bg-slate-200 text-sm font-bold text-slate-600 last:border-r-0"
                  >
                    {column}
                  </div>
                ))}

                {slots.map((slot) => {
                  const isOpen = openSlotId === slot.id;
                  const isBlocked = slot.type === 'blocked';

                  return (
                    <div
                      key={slot.id}
                      className={`relative flex min-h-[160px] items-center justify-center border-r border-t border-slate-300 last:border-r-0 ${
                        isBlocked ? 'bg-lime-400/85' : 'bg-yellow-300'
                      }`}
                    >
                      {isBlocked ? (
                        <span className="text-sm font-black uppercase tracking-[0.25em] text-lime-900/70">Livre</span>
                      ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-3">
                          <button
                            type="button"
                            onClick={() => setOpenSlotId((current) => (current === slot.id ? null : slot.id))}
                            className="flex min-h-[84px] w-full max-w-[120px] items-center justify-center rounded-2xl border border-yellow-500/70 bg-yellow-200 px-4 py-3 text-center text-2xl font-black text-slate-800 shadow-sm transition hover:scale-[1.01] hover:shadow-md"
                          >
                            {slot.value || '--'}
                          </button>

                          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-600">
                            <span>{slot.id}</span>
                            <Pencil className="h-3.5 w-3.5" />
                          </div>

                          {isOpen && (
                            <div
                              ref={popoverRef}
                              className="absolute left-1/2 top-1/2 z-20 w-40 -translate-x-1/2 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl"
                            >
                              <div className="mb-1 flex items-center justify-between px-2 py-1">
                                <span className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
                                  {slot.id}
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
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      </main>
    </DashboardLayout>
  );
}

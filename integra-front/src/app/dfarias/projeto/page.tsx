'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Minus, Pencil, Plus, RotateCcw, X } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';

type SlotValue = '' | 'M 32' | 'M 50' | 'M 70' | 'B 50' | 'B 63' | 'B 70' | 'T 40' | 'T 50' | 'T 70' | 'T 100' | 'T 125';

type CellType = 'slot' | 'blocked';

type Cell = {
  id: string;
  row: number;
  col: number;
  type: CellType;
  value: SlotValue;
};

const STORAGE_KEY = 'dfarias-projeto-layout-v2';
const TOTAL_ROWS = 3;
const INITIAL_LEFT_COLUMNS = 2;
const INITIAL_RIGHT_COLUMNS = 3;

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

function buildDefaultCells(leftColumns: number, rightColumns: number): Cell[] {
  const cells: Cell[] = [];
  const totalColumns = leftColumns + 1 + rightColumns;
  const blockedColumnIndex = leftColumns;

  for (let row = 0; row < TOTAL_ROWS; row += 1) {
    for (let col = 0; col < totalColumns; col += 1) {
      const isBlocked = col === blockedColumnIndex;
      const isOuterRightColumn = col === totalColumns - 1;

      cells.push({
        id: `r${row + 1}c${col + 1}`,
        row,
        col,
        type: isBlocked ? 'blocked' : 'slot',
        value: isBlocked || isOuterRightColumn ? '' : 'T 50',
      });
    }
  }

  return cells;
}

function rebuildGrid(
  previousCells: Cell[],
  leftColumns: number,
  rightColumns: number,
): Cell[] {
  const map = new Map(previousCells.filter((cell) => cell.type === 'slot').map((cell) => [`${cell.row}-${cell.col}`, cell.value]));
  const totalColumns = leftColumns + 1 + rightColumns;
  const blockedColumnIndex = leftColumns;
  const nextCells: Cell[] = [];

  for (let row = 0; row < TOTAL_ROWS; row += 1) {
    for (let col = 0; col < totalColumns; col += 1) {
      const isBlocked = col === blockedColumnIndex;
      const isOuterRightColumn = col === totalColumns - 1;
      const preservedValue = map.get(`${row}-${col}`) ?? '';

      nextCells.push({
        id: `r${row + 1}c${col + 1}`,
        row,
        col,
        type: isBlocked ? 'blocked' : 'slot',
        value: isBlocked ? '' : preservedValue || (isOuterRightColumn ? '' : 'T 50'),
      });
    }
  }

  return nextCells;
}

export default function ProjetoDfariasPage() {
  const [leftColumns, setLeftColumns] = useState(INITIAL_LEFT_COLUMNS);
  const [rightColumns, setRightColumns] = useState(INITIAL_RIGHT_COLUMNS);
  const [cells, setCells] = useState<Cell[]>(() => buildDefaultCells(INITIAL_LEFT_COLUMNS, INITIAL_RIGHT_COLUMNS));
  const [openCellId, setOpenCellId] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (!saved) return;

      const parsed = JSON.parse(saved) as {
        leftColumns: number;
        rightColumns: number;
        cells: Cell[];
      };

      if (!parsed || !Array.isArray(parsed.cells)) return;
      if (typeof parsed.leftColumns !== 'number' || typeof parsed.rightColumns !== 'number') return;

      setLeftColumns(parsed.leftColumns);
      setRightColumns(parsed.rightColumns);
      setCells(parsed.cells);
    } catch {
      // ignora falha de leitura
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        leftColumns,
        rightColumns,
        cells,
      }),
    );
  }, [leftColumns, rightColumns, cells]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setOpenCellId(null);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const editableCells = useMemo(() => cells.filter((cell) => cell.type === 'slot'), [cells]);
  const preenchidos = editableCells.filter((cell) => cell.value).length;
  const totalColumns = leftColumns + 1 + rightColumns;

  const updateCellValue = (cellId: string, nextValue: SlotValue) => {
    setCells((current) => current.map((cell) => (cell.id === cellId ? { ...cell, value: nextValue } : cell)));
    setOpenCellId(null);
  };

  const applyColumnChange = (nextLeft: number, nextRight: number) => {
    setCells((current) => rebuildGrid(current, nextLeft, nextRight));
    setLeftColumns(nextLeft);
    setRightColumns(nextRight);
    setOpenCellId(null);
  };

  const addLeftColumn = () => applyColumnChange(leftColumns + 1, rightColumns);
  const removeLeftColumn = () => {
    if (leftColumns <= 1) return;
    applyColumnChange(leftColumns - 1, rightColumns);
  };

  const addRightColumn = () => applyColumnChange(leftColumns, rightColumns + 1);
  const removeRightColumn = () => {
    if (rightColumns <= 1) return;
    applyColumnChange(leftColumns, rightColumns - 1);
  };

  const resetLayout = () => {
    const defaultCells = buildDefaultCells(INITIAL_LEFT_COLUMNS, INITIAL_RIGHT_COLUMNS);
    setLeftColumns(INITIAL_LEFT_COLUMNS);
    setRightColumns(INITIAL_RIGHT_COLUMNS);
    setCells(defaultCells);
    setOpenCellId(null);
  };

  return (
    <DashboardLayout title="Projeto Dfarias" subtitle="Mapa editável dos espaços do projeto">
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h1 className="text-xl font-black text-slate-800 md:text-2xl">/dfarias/projeto</h1>
              <p className="mt-1 text-sm text-slate-500">
                Sem nomeação de colunas e com expansão lateral mantendo a coluna central fixa.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-600">
                {preenchidos} de {editableCells.length} espaços preenchidos
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
          </div>

          <div className="mb-5 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <div className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-slate-400">Lado esquerdo</div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={removeLeftColumn}
                  disabled={leftColumns <= 1}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <div className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2 text-center text-sm font-black text-slate-700">
                  {leftColumns} colunas
                </div>
                <button
                  type="button"
                  onClick={addLeftColumn}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-100"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-lime-300 bg-lime-100 p-3">
              <div className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-lime-700">Centro</div>
              <div className="rounded-xl border border-lime-300 bg-white px-4 py-2 text-center text-sm font-black text-lime-800">
                1 coluna fixa
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <div className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-slate-400">Lado direito</div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={removeRightColumn}
                  disabled={rightColumns <= 1}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <div className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2 text-center text-sm font-black text-slate-700">
                  {rightColumns} colunas
                </div>
                <button
                  type="button"
                  onClick={addRightColumn}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-100"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <div className="rounded-2xl border border-slate-300 bg-slate-100 p-3">
              <div
                className="grid gap-0 overflow-hidden rounded-xl border border-slate-300 bg-slate-300"
                style={{ gridTemplateColumns: `repeat(${totalColumns}, minmax(120px, 1fr))` }}
              >
                {cells.map((cell) => {
                  const isOpen = openCellId === cell.id;
                  const isBlocked = cell.type === 'blocked';

                  return (
                    <div
                      key={cell.id}
                      className={`relative flex min-h-[160px] items-center justify-center border-r border-t border-slate-300 ${
                        isBlocked ? 'bg-lime-400/85' : 'bg-yellow-300'
                      }`}
                    >
                      {isBlocked ? (
                        <span className="text-sm font-black uppercase tracking-[0.25em] text-lime-900/70">Centro</span>
                      ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-3">
                          <button
                            type="button"
                            onClick={() => setOpenCellId((current) => (current === cell.id ? null : cell.id))}
                            className="flex min-h-[84px] w-full max-w-[120px] items-center justify-center rounded-2xl border border-yellow-500/70 bg-yellow-200 px-4 py-3 text-center text-2xl font-black text-slate-800 shadow-sm transition hover:scale-[1.01] hover:shadow-md"
                          >
                            {cell.value || '--'}
                          </button>

                          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-600">
                            <span>Linha {cell.row + 1}</span>
                            <Pencil className="h-3.5 w-3.5" />
                          </div>

                          {isOpen && (
                            <div
                              ref={popoverRef}
                              className="absolute left-1/2 top-1/2 z-20 w-40 -translate-x-1/2 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl"
                            >
                              <div className="mb-1 flex items-center justify-between px-2 py-1">
                                <span className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
                                  Linha {cell.row + 1}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setOpenCellId(null)}
                                  className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>

                              <div className="max-h-80 overflow-y-auto">
                                {OPTIONS.map((option) => {
                                  const selected = cell.value === option;
                                  return (
                                    <button
                                      key={option}
                                      type="button"
                                      onClick={() => updateCellValue(cell.id, option)}
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
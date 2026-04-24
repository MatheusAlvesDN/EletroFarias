'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import {
  Check,
  FileText,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  X,
} from 'lucide-react';
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
  kind: 'slot' | 'center-bottom';
  slotId?: string;
  top: number;
  left: number;
};

type BudgetRow = {
  product: string;
  qty: number;
  unit: string;
  category: string;
};

type SavedBudget = {
  id: string | number;
  nome: string;
  totalItens: number;
  totalPreenchidos: number;
  totalQuadros?: number;
  criadoEm?: string;
  prazoEntrega?: number | null;
  layout?:
    | RowData[]
    | {
        id: number;
        nome?: string;
        tipo?: string;
        layout: RowData[];
      }[];
  quadros?: {
    id: number;
    nome: string;
    tipo?: string;
    layout: RowData[];
  }[];
  orcamentoEstruturado?: {
    totalQuadros: number;
    totalItens: number;
    totalPreenchidos: number;
    quadros: {
      id: number;
      nome: string;
      tipo?: string;
      totalItens: number;
      totalPreenchidos: number;
      itens: BudgetRow[];
      layout: RowData[];
    }[];
  };
};

type QuadroState = {
  id: number;
  nome: string;
  tipo: string;
  layout: RowData[];
  centerBottomValue?: CenterBottomValue;
};

type CenterBottomValue = '' | 'T 40' | 'T 50' | 'T 70' | 'T 100' | 'T 125';

const STORAGE_KEY = 'dfarias-projeto-layout-v9';
const TOTAL_ROWS = 3;
const MAX_POSITIONS_PER_SIDE = 5;

const OPTIONS: SlotValue[] = [
  'M 32',
  'M 50',
  'M 70',
  'T 40',
  'T 50',
  'T 70',
  'T 100',
  'T 125',
];

const CENTER_BOTTOM_OPTIONS: CenterBottomValue[] = ['T 40', 'T 50', 'T 70', 'T 100', 'T 125'];

const CABLE_CATEGORY_BY_GAUGE: Record<number, string> = {
  6: '18956',
  10: '22259',
  16: '22254',
  35: '22249',
  50: '22261',
};

const QUADRO_TYPE_OPTIONS = [
  'QUADRO PADRÃO ENERGIA',
  'QUADRO BARRAMENTO',
  'QUADRO MEDIÇÃO AGRUPADA',
  'QUADRO DISTRIBUIÇÃO',
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

function normalizeQuadros(rawQuadros: Partial<QuadroState>[]): QuadroState[] {
  return rawQuadros
    .filter((quadro) => Array.isArray(quadro.layout) && quadro.layout.length === TOTAL_ROWS)
    .map((quadro, index) => ({
      id: typeof quadro.id === 'number' ? quadro.id : index + 1,
      nome: quadro.nome?.trim() || `Quadro ${index + 1}`,
      tipo: quadro.tipo?.trim() || 'QUADRO PADRÃO ENERGIA',
      layout: quadro.layout as RowData[],
      centerBottomValue:
        quadro.centerBottomValue && CENTER_BOTTOM_OPTIONS.includes(quadro.centerBottomValue)
          ? quadro.centerBottomValue
          : '',
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
  const [quadros, setQuadros] = useState<QuadroState[]>([
    {
      id: 1,
      nome: 'Quadro padrão energia 1',
      tipo: 'QUADRO PADRÃO ENERGIA',
      layout: buildDefaultRows(),
      centerBottomValue: '',
    },
  ]);
  const [activeQuadroId, setActiveQuadroId] = useState(1);
  const [prazoEntrega, setPrazoEntrega] = useState<number | ''>('');
  const [popover, setPopover] = useState<PopoverState | null>(null);
  const [savedBudgets, setSavedBudgets] = useState<SavedBudget[]>([]);
  const [loadingBudgets, setLoadingBudgets] = useState(false);
  const [savingBudget, setSavingBudget] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveBudgetName, setSaveBudgetName] = useState('');
  const [showAddQuadroModal, setShowAddQuadroModal] = useState(false);
  const [newQuadroName, setNewQuadroName] = useState('');
  const [newQuadroType, setNewQuadroType] = useState(QUADRO_TYPE_OPTIONS[0]);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (!saved) return;

      const parsed = JSON.parse(saved) as QuadroState[];
      if (!Array.isArray(parsed) || parsed.length === 0) return;

      const normalized = normalizeQuadros(parsed);

      if (normalized.length === 0) return;
      setQuadros(normalized);
      setActiveQuadroId(normalized[0].id);
    } catch {
      // ignora falha de leitura
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(quadros));
  }, [quadros]);

  const activeQuadro = useMemo(
    () => quadros.find((quadro) => quadro.id === activeQuadroId) ?? quadros[0],
    [quadros, activeQuadroId],
  );

  const rows = activeQuadro?.layout ?? buildDefaultRows();

  const updateActiveRows = (updater: (current: RowData[]) => RowData[]) => {
    setQuadros((current) =>
      current.map((quadro) =>
        quadro.id === (activeQuadro?.id ?? activeQuadroId)
          ? { ...quadro, layout: updater(quadro.layout) }
          : quadro,
      ),
    );
  };

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setPopover(null);
      }
    };

    const handleWindowChange = (event: Event) => {
      if (popoverRef.current && event.target instanceof Node && popoverRef.current.contains(event.target)) {
        return;
      }
      setPopover(null);
    };

    document.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('resize', handleWindowChange);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('resize', handleWindowChange);
    };
  }, []);

  const buildBudgetRowsForLayout = (
    layoutRows: RowData[],
    centerBottom: CenterBottomValue = '',
  ) => {
    const cableMap = new Map<number, number>();
    const breakerMap = new Map<string, number>();
    const totalSlotsLayout = layoutRows.reduce(
      (acc, row) => acc + row.left.length + row.right.length,
      0,
    );
    const preenchidosLayout = layoutRows.reduce(
      (acc, row) =>
        acc + row.left.filter((slot) => slot.value).length + row.right.filter((slot) => slot.value).length,
      0,
    );

    layoutRows.forEach((row) => {
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
        category: CABLE_CATEGORY_BY_GAUGE[gauge] || 'CABO',
        product: `CABO ${gauge} mm²`,
        qty: totalLength,
        unit: 'cm',
      }));

    const breakerRows: BudgetRow[] = Array.from(breakerMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([product, qty]) => ({
        category: 'DISJUNTOR',
        product,
        qty,
        unit: 'un',
      }));

    const caixasAdicionadas = preenchidosLayout;

    const defaultRows: BudgetRow[] = [
      {
        category: '10235',
        qty: 1,
        product: 'CAIXA DE MEDIÇÃO AGRUPADA DISJUNTOR GERAL',
        unit: 'un',
      },
      {
        category: '10234',
        qty: 2,
        product: 'CAIXA DE MEDIÇÃO AGRUPADA BARRAMENTO',
        unit: 'un',
      },
    ];

    if (caixasAdicionadas > 0) {
      defaultRows.push(
        {
          category: '5894',
          qty: caixasAdicionadas,
          product: 'CURVA BOX 1.1/2"',
          unit: 'un',
        },
        {
          category: '10233',
          qty: caixasAdicionadas,
          product: 'CAIXA MEDIDOR AGRUPADA CMA 01',
          unit: 'un',
        },
      );
    }

    if (['T 40', 'T 50', 'T 70'].includes(centerBottom)) {
      defaultRows.push({
        category: '22458',
        qty: 1,
        product: 'BARRA COBRE CHATA 3 METROS 3/4" X 3/16" - 210A',
        unit: 'un',
      });
    }

    if (['T 100', 'T 125'].includes(centerBottom)) {
      defaultRows.push({
        category: '22486',
        qty: 1,
        product: 'BARRA COBRE CHATA 3 METROS 1" X 1/4" - 359A',
        unit: 'un',
      });
    }

    return {
      items: [...defaultRows, ...cableRows, ...breakerRows],
      totalSlots: totalSlotsLayout,
      preenchidos: preenchidosLayout,
    };
  };

  const quadroBudgets = useMemo(
    () =>
      quadros.map((quadro) => ({
        id: quadro.id,
        nome: quadro.nome,
        ...buildBudgetRowsForLayout(quadro.layout, quadro.centerBottomValue ?? ''),
      })),
    [quadros],
  );

  const budgetRows = useMemo(
    () => quadroBudgets.flatMap((quadro) => quadro.items),
    [quadroBudgets],
  );

  const totalSlotsAll = useMemo(
    () => quadroBudgets.reduce((acc, quadro) => acc + quadro.totalSlots, 0),
    [quadroBudgets],
  );

  const preenchidosAll = useMemo(
    () => quadroBudgets.reduce((acc, quadro) => acc + quadro.preenchidos, 0),
    [quadroBudgets],
  );

  const loadSavedBudgets = async () => {
    try {
      setLoadingBudgets(true);

      const response = await fetch('/api/dfarias/orcamentos', {
        method: 'GET',
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error('Erro ao buscar orçamentos');
      }

      const data = await response.json();
      setSavedBudgets(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      alert('Não foi possível carregar os orçamentos salvos.');
    } finally {
      setLoadingBudgets(false);
    }
  };

  useEffect(() => {
    loadSavedBudgets();
  }, []);

  const executeSaveBudget = async (nome: string) => {
    if (!nome.trim()) return;

    try {
      setSavingBudget(true);

      const response = await fetch('/api/dfarias/orcamentos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nome: nome.trim(),
          layout: quadros.map((quadro) => ({
            id: quadro.id,
            nome: quadro.nome,
            tipo: quadro.tipo,
            layout: quadro.layout,
          })),
          quadros,
          itens: budgetRows,
          itensPorQuadro: quadroBudgets.map((quadro) => ({
            id: quadro.id,
            nome: quadro.nome,
            itens: quadro.items,
          })),
          totalItens: totalSlotsAll,
          totalPreenchidos: preenchidosAll,
          totalQuadros: quadros.length,
          prazoEntrega: prazoEntrega === '' ? null : prazoEntrega,
          orcamentoEstruturado: {
            totalQuadros: quadros.length,
            totalItens: totalSlotsAll,
            totalPreenchidos: preenchidosAll,
            quadros: quadroBudgets.map((quadro) => ({
              id: quadro.id,
              nome: quadro.nome,
              tipo: quadros.find((item) => item.id === quadro.id)?.tipo ?? 'QUADRO PADRÃO ENERGIA',
              totalItens: quadro.totalSlots,
              totalPreenchidos: quadro.preenchidos,
              itens: quadro.items,
              layout: quadros.find((item) => item.id === quadro.id)?.layout ?? buildDefaultRows(),
            })),
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao salvar orçamento');
      }

      await loadSavedBudgets();
      alert('Orçamento salvo com sucesso.');
      setShowSaveModal(false);
      setSaveBudgetName('');
    } catch (error) {
      console.error(error);
      alert('Não foi possível salvar o orçamento.');
    } finally {
      setSavingBudget(false);
    }
  };

  const handleSaveBudget = () => {
    setSaveBudgetName(`Orçamento ${new Date().toLocaleString('pt-BR')}`);
    setShowSaveModal(true);
  };

  const handleLoadBudget = (budget: SavedBudget) => {
    const structuredQuadros = budget.orcamentoEstruturado?.quadros?.map((quadro) => ({
      id: quadro.id,
      nome: quadro.nome,
      tipo: quadro.tipo || 'QUADRO PADRÃO ENERGIA',
      layout: quadro.layout,
    }));

    if (Array.isArray(structuredQuadros) && structuredQuadros.length > 0) {
      const normalized = normalizeQuadros(structuredQuadros);
      if (normalized.length > 0) {
        setQuadros(normalized);
        setActiveQuadroId(normalized[0].id);
      }
    } else if (Array.isArray(budget.quadros) && budget.quadros.length > 0) {
      const normalized = normalizeQuadros(budget.quadros);

      if (normalized.length > 0) {
        setQuadros(normalized);
        setActiveQuadroId(normalized[0].id);
      }
    } else if (
      Array.isArray(budget.layout) &&
      budget.layout.length > 0 &&
      budget.layout.every(
        (item) =>
          item &&
          typeof item === 'object' &&
          'layout' in item &&
          Array.isArray((item as { layout?: unknown }).layout),
      )
    ) {
      const normalized = normalizeQuadros(
        budget.layout as {
          id?: number;
          nome?: string;
          tipo?: string;
          layout?: RowData[];
        }[],
      );

      if (normalized.length > 0) {
        setQuadros(normalized);
        setActiveQuadroId(normalized[0].id);
      }
    } else if (Array.isArray(budget.layout) && budget.layout.length === TOTAL_ROWS) {
      setQuadros([
        {
          id: 1,
          nome: 'Quadro padrão energia 1',
          tipo: 'QUADRO PADRÃO ENERGIA',
          layout: budget.layout as RowData[],
        },
      ]);
      setActiveQuadroId(1);
    }

    setPrazoEntrega(typeof budget.prazoEntrega === 'number' ? budget.prazoEntrega : '');
    setPopover(null);
  };

  const handleAddQuadro = () => {
    setNewQuadroName(`Quadro ${quadros.length + 1}`);
    setNewQuadroType(QUADRO_TYPE_OPTIONS[0]);
    setShowAddQuadroModal(true);
  };

  const handleConfirmAddQuadro = () => {
    if (!newQuadroName.trim() || !newQuadroType.trim()) return;
    setQuadros((current) => {
      const nextId = current.length > 0 ? Math.max(...current.map((quadro) => quadro.id)) + 1 : 1;
      const next = [
        ...current,
        {
          id: nextId,
          nome: newQuadroName.trim(),
          tipo: newQuadroType,
          layout: buildDefaultRows(),
        },
      ];
      setActiveQuadroId(nextId);
      return next;
    });
    setShowAddQuadroModal(false);
    setNewQuadroName('');
  };

  const handleDeleteQuadro = (quadroId: number) => {
    if (quadros.length <= 1) {
      alert('É necessário manter pelo menos um quadro.');
      return;
    }

    if (!window.confirm('Deseja realmente excluir este quadro?')) return;

    setQuadros((current) => {
      const filtered = current.filter((quadro) => quadro.id !== quadroId);
      if (activeQuadroId === quadroId && filtered.length > 0) {
        setActiveQuadroId(filtered[0].id);
      }
      return filtered;
    });
  };

  const addSlot = (rowId: number, side: Side) => {
    updateActiveRows((current) =>
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
    updateActiveRows((current) =>
      current.map((row) => {
        if (row.id !== rowId) return row;

        if (side === 'left') {
          return { ...row, left: row.left.filter((slot) => slot.id !== slotId) };
        }

        return { ...row, right: row.right.filter((slot) => slot.id !== slotId) };
      }),
    );

    if (popover?.kind === 'slot' && popover.slotId === slotId) {
      setPopover(null);
    }
  };

  const updateSlotValue = (slotId: string, nextValue: SlotValue) => {
    updateActiveRows((current) =>
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
    updateActiveRows(() => buildDefaultRows());
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
            kind: 'slot',
            slotId,
            top: rect.bottom + 8,
            left: rect.left + rect.width / 2,
          },
    );
  };

  const centerBottomValue = activeQuadro?.centerBottomValue ?? '';

  const openCenterBottomPopover = (event: React.MouseEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setPopover((current) =>
      current?.kind === 'center-bottom'
        ? null
        : {
            kind: 'center-bottom',
            top: rect.bottom + 8,
            left: rect.left + rect.width / 2,
          },
    );
  };

  const updateCenterBottomValue = (nextValue: CenterBottomValue) => {
    setQuadros((current) =>
      current.map((quadro) =>
        quadro.id === (activeQuadro?.id ?? activeQuadroId) ? { ...quadro, centerBottomValue: nextValue } : quadro,
      ),
    );
    setPopover(null);
  };

  const renderSlot = (rowId: number, side: Side, slot: Slot) => {
    const isOpen = popover?.kind === 'slot' && popover.slotId === slot.id;

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
      <main className="mx-auto grid w-full max-w-[1700px] grid-cols-1 gap-5 px-4 py-6 md:px-6 xl:grid-cols-[minmax(0,1fr)_300px] lg:px-8">
        <style jsx global>{`
          @media print {
            body {
              background: #ffffff !important;
            }

            .print-hide {
              display: none !important;
            }

            .print-only {
              display: block !important;
            }

            .screen-only {
              display: none !important;
            }

            .print-page {
              padding: 0 !important;
              margin: 0 !important;
              max-width: 100% !important;
            }

            .print-budget-card {
              border: 1px solid #cbd5e1 !important;
              box-shadow: none !important;
              border-radius: 14px !important;
              padding: 16px !important;
              background: white !important;
            }

            .print-budget-table {
              width: 100% !important;
              border-collapse: collapse !important;
              margin-top: 8px !important;
            }

            .print-budget-table th,
            .print-budget-table td {
              border: 1px solid #cbd5e1 !important;
              padding: 10px 12px !important;
              font-size: 12px !important;
              text-align: left !important;
            }

            .print-budget-table th {
              background: #f8fafc !important;
              font-size: 11px !important;
              text-transform: uppercase !important;
              letter-spacing: 0.05em !important;
            }

            .print-budget-table tbody tr:nth-child(even) {
              background: #f8fafc !important;
            }

            .print-logo-wrap {
              display: flex !important;
              justify-content: center !important;
              margin-bottom: 8px !important;
            }

            .print-top-meta {
              display: grid !important;
              grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
              gap: 8px !important;
              margin-bottom: 12px !important;
            }

            .print-meta-card {
              border: 1px solid #cbd5e1 !important;
              border-radius: 8px !important;
              padding: 8px 10px !important;
              font-size: 11px !important;
            }

            .print-meta-label {
              display: block !important;
              font-size: 10px !important;
              font-weight: 700 !important;
              text-transform: uppercase !important;
              letter-spacing: 0.08em !important;
              color: #64748b !important;
            }

            .print-summary {
              margin: 10px 0 14px !important;
              border: 1px solid #e2e8f0 !important;
              border-radius: 10px !important;
              padding: 8px 10px !important;
              display: grid !important;
              grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
              gap: 6px !important;
              font-size: 11px !important;
            }

            .print-summary strong {
              font-size: 12px !important;
            }

            .print-quadro-card {
              border: 1px solid #e2e8f0 !important;
              border-radius: 10px !important;
              padding: 10px !important;
              margin-bottom: 12px !important;
              break-inside: avoid !important;
            }
          }

          @media screen {
            .print-only {
              display: none !important;
            }
          }
        `}</style>

        <div className="flex min-w-0 flex-col gap-5">
          <section className="screen-only flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-xl font-black text-slate-800 md:text-2xl">/dfarias/projeto</h1>
              <p className="mt-1 text-sm text-slate-500">
                Orçamento separado por cabos e disjuntores com impressão limpa.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
                {quadroBudgets.find((quadro) => quadro.id === activeQuadro?.id)?.preenchidos ?? 0} /{' '}
                {quadroBudgets.find((quadro) => quadro.id === activeQuadro?.id)?.totalSlots ?? 0}
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

          <section className="screen-only rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              {quadros.map((quadro) => (
                <div
                  key={quadro.id}
                  className={`flex items-center gap-1 rounded-lg border px-2 py-1.5 ${
                    quadro.id === activeQuadro?.id
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-300 bg-white text-slate-700'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setActiveQuadroId(quadro.id)}
                    className="px-1.5 py-1 text-left"
                    title={quadro.tipo}
                  >
                    <span className="block text-sm font-bold">{quadro.nome}</span>
                    <span
                      className={`block text-[10px] font-semibold uppercase tracking-[0.08em] ${
                        quadro.id === activeQuadro?.id ? 'text-slate-300' : 'text-slate-500'
                      }`}
                    >
                      {quadro.tipo}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteQuadro(quadro.id)}
                    className={`rounded-md p-1 transition ${
                      quadro.id === activeQuadro?.id
                        ? 'hover:bg-slate-700'
                        : 'text-red-500 hover:bg-red-50'
                    }`}
                    title="Excluir quadro"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={handleAddQuadro}
                className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700 transition hover:bg-emerald-100"
              >
                <Plus className="h-4 w-4" />
                Novo quadro
              </button>
            </div>
          </section>

          <section className="screen-only overflow-visible rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
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
                      className={`flex h-[156px] items-center justify-center border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 ${
                        index === 0 ? 'rounded-tl-xl' : ''
                      } ${index === rows.length - 1 ? 'rounded-bl-xl' : ''}`}
                    >
                      <Plus className="h-5 w-5" />
                    </button>

                    <div className="flex items-stretch justify-end">
                      {row.left.map((slot) => renderSlot(row.id, 'left', slot))}
                    </div>

                    <div className="flex h-[156px] items-center justify-center border border-slate-300 bg-lime-300 px-4 text-center">
                      {index === rows.length - 1 ? (
                        <button
                          type="button"
                          onClick={openCenterBottomPopover}
                          className="w-full rounded-xl border border-lime-500/70 bg-white/90 px-3 py-2 text-center text-sm font-black uppercase tracking-[0.14em] text-lime-950 transition hover:bg-white"
                        >
                          {centerBottomValue || 'Barramento'}
                        </button>
                      ) : (
                        <span className="text-sm font-black uppercase tracking-[0.18em] text-lime-950">
                          Barramento
                        </span>
                      )}
                    </div>

                    <div className="flex items-stretch justify-start">
                      {row.right.map((slot) => renderSlot(row.id, 'right', slot))}
                    </div>

                    <button
                      type="button"
                      onClick={() => addSlot(row.id, 'right')}
                      disabled={row.right.length >= MAX_POSITIONS_PER_SIDE}
                      className={`flex h-[156px] items-center justify-center border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 ${
                        index === 0 ? 'rounded-tr-xl' : ''
                      } ${index === rows.length - 1 ? 'rounded-br-xl' : ''}`}
                    >
                      <Plus className="h-5 w-5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="screen-only rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4">
              <h2 className="text-lg font-black text-slate-800">Orçamento</h2>
              <p className="mt-1 text-sm text-slate-500">
                Itens separados entre cabos e disjuntores.
              </p>
            </div>

            <div className="mb-4 grid gap-2 sm:grid-cols-[220px_1fr] sm:items-end">
              <label className="text-sm font-semibold text-slate-700" htmlFor="prazo-entrega">
                Prazo de entrega (dias)
              </label>
              <input
                id="prazo-entrega"
                type="number"
                min={0}
                step={1}
                value={prazoEntrega}
                onChange={(event) => {
                  const raw = event.target.value;
                  if (raw === '') {
                    setPrazoEntrega('');
                    return;
                  }

                  const nextValue = Number.parseInt(raw, 10);
                  if (Number.isNaN(nextValue)) return;
                  setPrazoEntrega(Math.max(0, nextValue));
                }}
                className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                placeholder="Ex: 15"
              />
            </div>

            <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <span className="font-bold">Prazo de entrega:</span>{' '}
              {prazoEntrega === '' ? '--' : `${prazoEntrega} dia(s)`}
            </div>

            <div className="space-y-6">
              {quadroBudgets.map((quadro) => (
                <div key={`orcamento-quadro-${quadro.id}`} className="overflow-x-auto">
                  <h3 className="mb-2 text-sm font-black uppercase tracking-[0.12em] text-slate-500">
                    {quadro.nome} · {quadros.find((item) => item.id === quadro.id)?.tipo || 'QUADRO PADRÃO ENERGIA'}
                  </h3>
                  <div className="min-w-[760px]">
                    <div className="grid grid-cols-[140px_1fr_140px_120px] rounded-t-xl border border-slate-200 bg-slate-50 text-sm font-bold text-slate-600">
                      <div className="border-r border-slate-200 px-4 py-3">Categoria</div>
                      <div className="border-r border-slate-200 px-4 py-3">Produto</div>
                      <div className="border-r border-slate-200 px-4 py-3">Qtd</div>
                      <div className="px-4 py-3">Unidade</div>
                    </div>

                    {quadro.items.length === 0 ? (
                      <div className="rounded-b-xl border border-t-0 border-slate-200 px-4 py-6 text-sm text-slate-500">
                        Nenhum item calculado ainda.
                      </div>
                    ) : (
                      quadro.items.map((item, index) => (
                        <div
                          key={`${quadro.id}-${item.category}-${item.product}`}
                          className={`grid grid-cols-[140px_1fr_140px_120px] border border-t-0 border-slate-200 text-sm ${
                            index === quadro.items.length - 1 ? 'rounded-b-xl' : ''
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
              ))}
            </div>
          </section>

          <section className="print-only print-page">
            <div className="print-logo-wrap">
              <Image
                src="/dfarias-logo.png"
                alt="DFarias Engenharia e Automação"
                width={160}
                height={160}
                priority
              />
            </div>

            <div className="mb-6 text-center">
              <h1 className="text-2xl font-black text-slate-900">Orçamento de Materiais</h1>
              <p className="mt-2 text-sm text-slate-600">DFarias Engenharia e Automação</p>
            </div>

            <div className="print-budget-card">
              <div className="print-top-meta">
                <div className="print-meta-card">
                  <span className="print-meta-label">Data</span>
                  {new Date().toLocaleDateString('pt-BR')}
                </div>
                <div className="print-meta-card">
                  <span className="print-meta-label">Prazo de entrega</span>
                  {prazoEntrega === '' ? '--' : `${prazoEntrega} dia(s)`}
                </div>
                <div className="print-meta-card">
                  <span className="print-meta-label">Total de quadros</span>
                  {quadros.length}
                </div>
              </div>

              <div className="print-summary">
                <div>
                  Total de posições: <strong>{totalSlotsAll}</strong>
                </div>
                <div>
                  Total preenchido: <strong>{preenchidosAll}</strong>
                </div>
              </div>

              {quadroBudgets.map((quadro) => (
                <div key={`print-quadro-${quadro.id}`} className="print-quadro-card">
                  <h3 className="text-sm font-black uppercase tracking-[0.12em] text-slate-500">
                    {quadro.nome} · {quadros.find((item) => item.id === quadro.id)?.tipo || 'QUADRO PADRÃO ENERGIA'}
                  </h3>
                  <table className="print-budget-table">
                    <thead>
                      <tr>
                        <th>Categoria</th>
                        <th>Produto</th>
                        <th>Qtd</th>
                        <th>Unidade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {quadro.items.length === 0 ? (
                        <tr>
                          <td colSpan={4}>Nenhum item calculado ainda.</td>
                        </tr>
                      ) : (
                        quadro.items.map((item) => (
                          <tr key={`print-${quadro.id}-${item.category}-${item.product}`}>
                            <td>{item.category}</td>
                            <td>{item.product}</td>
                            <td>{item.qty}</td>
                            <td>{item.unit}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="screen-only rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-black text-slate-800">Orçamentos salvos</h2>
            <p className="mt-1 text-sm text-slate-500">
              Salve e recarregue orçamentos desta tela.
            </p>
          </div>

          <button
            type="button"
            onClick={handleSaveBudget}
            disabled={savingBudget}
            className="mb-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {savingBudget ? 'Salvando...' : 'Salvar orçamento'}
          </button>

          <div className="space-y-3">
            {loadingBudgets ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-500">
                Carregando orçamentos...
              </div>
            ) : savedBudgets.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-500">
                Nenhum orçamento salvo.
              </div>
            ) : (
              savedBudgets.map((budget) => (
                <div
                  key={budget.id}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3"
                >
                  <div className="mb-2">
                    <h3 className="text-sm font-bold text-slate-800">{budget.nome}</h3>
                    {budget.criadoEm && (
                      <p className="text-xs text-slate-500">{budget.criadoEm}</p>
                    )}
                    {typeof budget.prazoEntrega === 'number' && (
                      <p className="text-xs font-semibold text-slate-600">
                        Prazo: {budget.prazoEntrega} dia(s)
                      </p>
                    )}
                  </div>

                  <div className="mb-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
                    <div className="rounded-lg bg-white px-2 py-2">
                      Itens: <strong>{budget.totalItens}</strong>
                    </div>
                    <div className="rounded-lg bg-white px-2 py-2">
                      Preenchidos: <strong>{budget.totalPreenchidos}</strong>
                    </div>
                    {typeof budget.totalQuadros === 'number' && (
                      <div className="col-span-2 rounded-lg bg-white px-2 py-2">
                        Quadros: <strong>{budget.totalQuadros}</strong>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleLoadBudget(budget)}
                    className="inline-flex w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                  >
                    Carregar
                  </button>
                </div>
              ))
            )}
          </div>
        </aside>
      </main>

      {showSaveModal &&
        createPortal(
          <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-slate-950/40 px-4">
            <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
              <h3 className="text-lg font-black text-slate-800">Salvar orçamento</h3>
              <p className="mt-1 text-sm text-slate-500">Defina o nome do orçamento.</p>

              <div className="mt-4">
                <label htmlFor="nome-orcamento" className="mb-1 block text-sm font-semibold text-slate-700">
                  Nome do orçamento
                </label>
                <input
                  id="nome-orcamento"
                  value={saveBudgetName}
                  onChange={(event) => setSaveBudgetName(event.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                  placeholder="Ex: Orçamento cliente XPTO"
                />
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowSaveModal(false)}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => executeSaveBudget(saveBudgetName.trim())}
                  disabled={savingBudget || !saveBudgetName.trim()}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingBudget ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {showAddQuadroModal &&
        createPortal(
          <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-slate-950/40 px-4">
            <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
              <h3 className="text-lg font-black text-slate-800">Novo quadro</h3>
              <p className="mt-1 text-sm text-slate-500">
                Escolha o nome do quadro e o tipo (tipo aparece abaixo do nome).
              </p>

              <div className="mt-4">
                <label htmlFor="nome-quadro" className="mb-1 block text-sm font-semibold text-slate-700">
                  Nome do quadro
                </label>
                <input
                  id="nome-quadro"
                  value={newQuadroName}
                  onChange={(event) => setNewQuadroName(event.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                  placeholder="Ex: Quadro área externa"
                />
              </div>

              <div className="mt-3">
                <label htmlFor="tipo-quadro" className="mb-1 block text-sm font-semibold text-slate-700">
                  Tipo do quadro
                </label>
                <select
                  id="tipo-quadro"
                  value={newQuadroType}
                  onChange={(event) => setNewQuadroType(event.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                >
                  {QUADRO_TYPE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddQuadroModal(false)}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAddQuadro}
                  disabled={!newQuadroName.trim()}
                  className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Adicionar quadro
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {popover?.kind === 'center-bottom' &&
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
                Centro inferior
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
              {CENTER_BOTTOM_OPTIONS.map((option) => {
                const selected = centerBottomValue === option;

                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => updateCenterBottomValue(option)}
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
          </div>,
          document.body,
        )}
    </DashboardLayout>
  );
}

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { getAuthHeaders } from '@/lib/auth';

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
  | 'T 125'
  | 'T CX 100'
  | 'T CX 125'
  | 'T CX 150'
  | 'T CX 160'
  | 'T CX 175'
  | 'T CX 200'
  | 'T CX 225'
  | 'T CX 250'
  | 'T CX 300'
  | 'T CX 400'
  | 'T CX 500';

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
  rightQty?: 1 | 2 | 3;
};

type PopoverState = {
  kind: 'slot' | 'center-top' | 'center-bottom';
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
    centerTopValue?: CenterTopValue;
    centerBottomValue?: CenterBottomValue;
  }[];
  quadros?: {
    id: number;
    nome: string;
    tipo?: string;
    layout: RowData[];
    centerTopValue?: CenterTopValue;
    centerBottomValue?: CenterBottomValue;
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
      centerTopValue?: CenterTopValue;
      centerBottomValue?: CenterBottomValue;
    }[];
  };
};

type QuadroState = {
  id: number;
  nome: string;
  tipo: string;
  layout: RowData[];
  centerTopValue?: CenterTopValue;
  centerBottomValue?: CenterBottomValue;
};

type CenterTopValue = '' | 'Sim' | 'Não';
type CenterBottomValue =
  | ''
  | 'T 40'
  | 'T 50'
  | 'T 70'
  | 'T 100'
  | 'T 125'
  | 'T CX 125'
  | 'T CX 150'
  | 'T CX 160'
  | 'T CX 175'
  | 'T CX 200'
  | 'T CX 225'
  | 'T CX 250'
  | 'T CX 300'
  | 'T CX 400'
  | 'T CX 500';

const STORAGE_KEY = 'dfarias-projeto-layout-v10';
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
  'T CX 100',
  'T CX 125',
  'T CX 150',
  'T CX 160',
  'T CX 175',
  'T CX 200',
  'T CX 225',
  'T CX 250',
  'T CX 300',
  'T CX 400',
  'T CX 500',
];
const OPTIONS_WITHOUT_CX = OPTIONS.filter((option) => !option.includes('CX')) as SlotValue[];
const OPTIONS_ONLY_T_AND_T_CX = OPTIONS.filter((option) => option.startsWith('T ')) as SlotValue[];

const CENTER_TOP_OPTIONS: CenterTopValue[] = ['Sim', 'Não'];
const CENTER_BOTTOM_OPTIONS: CenterBottomValue[] = ['T 40', 'T 50', 'T 70', 'T 100', 'T 125'];
const CENTER_BOTTOM_OPTIONS_250A: CenterBottomValue[] = [
  'T CX 125',
  'T CX 150',
  'T CX 160',
  'T CX 175',
  'T CX 200',
  'T CX 225',
  'T CX 250',
];
const CENTER_BOTTOM_OPTIONS_500A: CenterBottomValue[] = ['T CX 300', 'T CX 400', 'T CX 500'];
const ALL_CENTER_BOTTOM_OPTIONS = [
  ...CENTER_BOTTOM_OPTIONS,
  ...CENTER_BOTTOM_OPTIONS_250A,
  ...CENTER_BOTTOM_OPTIONS_500A,
] as CenterBottomValue[];

const CABLE_CATEGORY_BY_GAUGE: Record<number, string> = {
  6: '18956',
  10: '22259',
  16: '22254',
  35: '22249',
  50: '22261',
};

const QUADRO_TYPE_OPTIONS = [
  'QUADRO PADRÃO ENERGISA',
  'QUADRO GERAL 55X55 250A',
  'QUADRO GERAL 55X55 500A',
  'QUADRO GERAL 72X36 250A',
];
const FIXED_LAYOUT_QUADRO_TYPES = new Set(['QUADRO GERAL 55X55 250A', 'QUADRO GERAL 55X55 500A', 'QUADRO GERAL 72X36 250A']);
const QUADRO_GERAL_ZERO_TOTAL_CATEGORIES = new Set(['21511', '21512', '21513', '21514', '21515']);

const OPTION_META: Record<
  Exclude<SlotValue, ''>,
  { family: Family; gauge: number; breakerLabel: string; breakerCategory: string; order: number }
> = {
  'M 32': { family: 'M', gauge: 6, breakerLabel: 'DISJUNTOR MONO 32A', breakerCategory: '19086', order: 1 },
  'M 50': { family: 'M', gauge: 10, breakerLabel: 'DISJUNTOR MONO 50A', breakerCategory: '19870', order: 2 },
  'M 70': { family: 'M', gauge: 16, breakerLabel: 'DISJUNTOR MONO 70A', breakerCategory: '23502', order: 3 },
  'B 50': { family: 'B', gauge: 10, breakerLabel: 'DISJUNTOR MONO 50A', breakerCategory: '19870', order: 2 },
  'B 63': { family: 'B', gauge: 10, breakerLabel: 'DISJUNTOR MONO 70A', breakerCategory: '20499', order: 3 },
  'B 70': { family: 'B', gauge: 16, breakerLabel: 'DISJUNTOR MONO 70A', breakerCategory: '20499', order: 3 },
  'T 40': { family: 'T', gauge: 6, breakerLabel: 'DISJUNTOR TRI 40A', breakerCategory: '19087', order: 4 },
  'T 50': { family: 'T', gauge: 10, breakerLabel: 'DISJUNTOR TRI 50A', breakerCategory: '18989', order: 5 },
  'T 70': { family: 'T', gauge: 16, breakerLabel: 'DISJUNTOR TRI 70A', breakerCategory: '18990', order: 6 },
  'T 100': { family: 'T', gauge: 35, breakerLabel: 'DISJUNTOR TRI 100A', breakerCategory: '8745', order: 7 },
  'T CX 100': { family: 'T', gauge: 35, breakerLabel: 'DISJUNTOR CX TRI 100A', breakerCategory: '15760', order: 7 },
  'T 125': { family: 'T', gauge: 50, breakerLabel: 'DISJUNTOR TRI 125A', breakerCategory: '8746', order: 8 },
  'T CX 125': { family: 'T', gauge: 50, breakerLabel: 'DISJUNTOR CX TRI 125A', breakerCategory: '15772', order: 8 },
  'T CX 150': { family: 'T', gauge: 50, breakerLabel: 'DISJUNTOR CX TRI 150A', breakerCategory: '15763', order: 9 },
  'T CX 160': { family: 'T', gauge: 50, breakerLabel: 'DISJUNTOR CX TRI 160A', breakerCategory: '15764', order: 10 },
  'T CX 175': { family: 'T', gauge: 50, breakerLabel: 'DISJUNTOR CX TRI 175A', breakerCategory: '15765', order: 11 },
  'T CX 200': { family: 'T', gauge: 50, breakerLabel: 'DISJUNTOR CX TRI 200A', breakerCategory: '15766', order: 12 },
  'T CX 225': { family: 'T', gauge: 50, breakerLabel: 'DISJUNTOR CX TRI 225A', breakerCategory: '15767', order: 13 },
  'T CX 250': { family: 'T', gauge: 50, breakerLabel: 'DISJUNTOR CX TRI 250A', breakerCategory: '15768', order: 14 },
  'T CX 300': { family: 'T', gauge: 50, breakerLabel: 'DISJUNTOR CX TRI 300A', breakerCategory: '19080', order: 15 },
  'T CX 400': { family: 'T', gauge: 50, breakerLabel: 'DISJUNTOR CX TRI 400A', breakerCategory: '17159', order: 16 },
  'T CX 500': { family: 'T', gauge: 50, breakerLabel: 'DISJUNTOR CX TRI 500A', breakerCategory: '6765', order: 17 },
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
    rightQty: 1,
  }));
}

function buildFixedRows(): RowData[] {
  return [
    {
      id: 1,
      left: [createSlot(1, 'left', 1)],
      right: [createSlot(1, 'right', 1)],
      rightQty: 1,
    },
  ];
}

function normalizeQuadros(rawQuadros: Partial<QuadroState>[]): QuadroState[] {
  return rawQuadros
    .filter((quadro) => Array.isArray(quadro.layout) && quadro.layout.length > 0)
    .map((quadro, index) => ({
      id: typeof quadro.id === 'number' ? quadro.id : index + 1,
      nome: quadro.nome?.trim() || `Quadro ${index + 1}`,
      tipo: quadro.tipo?.trim() || 'QUADRO PADRÃO ENERGISA',
      layout: quadro.layout as RowData[],
      centerTopValue:
        quadro.centerTopValue && CENTER_TOP_OPTIONS.includes(quadro.centerTopValue)
          ? quadro.centerTopValue
          : '',
      centerBottomValue:
        quadro.centerBottomValue && ALL_CENTER_BOTTOM_OPTIONS.includes(quadro.centerBottomValue)
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
  const rowTable = LENGTH_TABLE[family][rowId] || LENGTH_TABLE[family][3];
  const values = rowTable[side];
  const safeIndex = Math.max(0, Math.min(positionFromCenter - 1, values.length - 1));
  return values[safeIndex];
}

export default function ProjetoDfariasPage() {
  const [quadros, setQuadros] = useState<QuadroState[]>([
    {
      id: 1,
      nome: 'Quadro padrão Energisa 1',
      tipo: 'QUADRO PADRÃO ENERGISA',
      layout: buildDefaultRows(),
      centerTopValue: '',
      centerBottomValue: '',
    },
  ]);
  const [activeQuadroId, setActiveQuadroId] = useState(1);
  const [prazoEntrega, setPrazoEntrega] = useState<number | ''>('');
  const [popover, setPopover] = useState<PopoverState | null>(null);
  const [savedBudgets, setSavedBudgets] = useState<SavedBudget[]>([]);
  const [loadingBudgets, setLoadingBudgets] = useState(false);
  const [savingBudget, setSavingBudget] = useState(false);
  const [printingBudget, setPrintingBudget] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveBudgetName, setSaveBudgetName] = useState('');
  const [showAddQuadroModal, setShowAddQuadroModal] = useState(false);
  const [newQuadroName, setNewQuadroName] = useState('');
  const [newQuadroType, setNewQuadroType] = useState(QUADRO_TYPE_OPTIONS[0]);
  const [priceByCodprod, setPriceByCodprod] = useState<Record<string, number>>({});
  const [loadingPrices, setLoadingPrices] = useState(false);
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

  const parseSankhyaPrice = useCallback((rawValue: unknown): number => {
    if (typeof rawValue === 'number') return Number.isFinite(rawValue) ? rawValue : 0;
    if (typeof rawValue !== 'string') return 0;

    const normalized = rawValue.trim();
    if (!normalized) return 0;

    const converted = normalized.replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
    const parsed = Number.parseFloat(converted);
    return Number.isFinite(parsed) ? parsed : 0;
  }, []);

  const fetchPricesByCodes = useCallback(async (codes: string[]) => {
    if (codes.length === 0) return {} as Record<string, number>;

    try {
      const response = await fetch('/api/dfarias/precos', {
        method: 'POST',
        headers: getAuthHeaders(),
        cache: 'no-store',
        body: JSON.stringify({ codes }),
      });

      if (!response.ok) {
        return Object.fromEntries(codes.map((codprod) => [codprod, 0])) as Record<string, number>;
      }

      const data = await response.json();
      const rawPrices = data?.prices && typeof data.prices === 'object' ? data.prices : {};

      return Object.fromEntries(
        codes.map((codprod) => {
          const unitPrice = parseSankhyaPrice(rawPrices[codprod]);
          return [codprod, Number.isFinite(unitPrice) ? unitPrice : 0];
        }),
      ) as Record<string, number>;
    } catch {
      return Object.fromEntries(codes.map((codprod) => [codprod, 0])) as Record<string, number>;
    }
  }, [parseSankhyaPrice]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(quadros));
  }, [quadros]);

  const activeQuadro = useMemo(
    () => quadros.find((quadro) => quadro.id === activeQuadroId) ?? quadros[0],
    [quadros, activeQuadroId],
  );

  const rows = activeQuadro?.layout ?? buildDefaultRows();
  const isFixedLayoutQuadro = FIXED_LAYOUT_QUADRO_TYPES.has(activeQuadro?.tipo ?? '');
  const shouldShowCenterFrames = !isFixedLayoutQuadro;
  const slotOptions = useMemo(() => {
    if (activeQuadro?.tipo === 'QUADRO PADRÃO ENERGISA') {
      return OPTIONS_WITHOUT_CX;
    }

    if (isFixedLayoutQuadro) {
      return OPTIONS_ONLY_T_AND_T_CX;
    }

    return OPTIONS;
  }, [activeQuadro?.tipo, isFixedLayoutQuadro]);
  const centerBottomOptionsForActiveQuadro = useMemo<CenterBottomValue[]>(() => {
    if (activeQuadro?.tipo === 'QUADRO GERAL 55X55 500A') {
      return CENTER_BOTTOM_OPTIONS_500A;
    }

    if (isFixedLayoutQuadro) {
      return CENTER_BOTTOM_OPTIONS_250A;
    }

    return CENTER_BOTTOM_OPTIONS;
  }, [activeQuadro?.tipo, isFixedLayoutQuadro]);

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
    window.addEventListener('scroll', handleWindowChange, true);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('resize', handleWindowChange);
      window.removeEventListener('scroll', handleWindowChange, true);
    };
  }, []);

  useEffect(() => {
    if (isFixedLayoutQuadro) {
      setPopover(null);
    }
  }, [isFixedLayoutQuadro]);

  const buildBudgetRowsForLayout = (
    layoutRows: RowData[],
    quadroType: string,
    centerTop: CenterTopValue = '',
    centerBottom: CenterBottomValue = '',
  ) => {
    const cableMap = new Map<number, number>();
    const breakerMap = new Map<string, { qty: number; category: string; order: number }>();
    const totalSlotsLayout = layoutRows.reduce(
      (acc, row) => acc + row.left.length + row.right.length,
      0,
    );
    const preenchidosLayout = layoutRows.reduce(
      (acc, row) =>
        acc + row.left.filter((slot) => slot.value).length + row.right.filter((slot) => slot.value).length,
      0,
    );

    layoutRows.forEach((row, rowIndex) => {
      const isFixedLayoutType = FIXED_LAYOUT_QUADRO_TYPES.has(quadroType);
      const isBottomFixedRow = isFixedLayoutType && rowIndex === layoutRows.length - 1;

      row.left.forEach((slot, index) => {
        if (isFixedLayoutType && !isBottomFixedRow) return;
        if (!slot.value) return;

        const meta = OPTION_META[slot.value];
        const positionFromCenter = row.left.length - index;
        const length = getLengthForSlot(meta.family, row.id, 'left', positionFromCenter);

        cableMap.set(meta.gauge, (cableMap.get(meta.gauge) || 0) + length);
        const currentBreaker = breakerMap.get(meta.breakerLabel);
        breakerMap.set(meta.breakerLabel, {
          qty: (currentBreaker?.qty ?? 0) + 1,
          category: meta.breakerCategory,
          order: meta.order,
        });
      });

      row.right.forEach((slot, index) => {
        if (isBottomFixedRow) return;
        if (!slot.value) return;

        const meta = OPTION_META[slot.value];
        const positionFromCenter = index + 1;
        const length = getLengthForSlot(meta.family, row.id, 'right', positionFromCenter);
        const qtyMultiplier = isFixedLayoutType ? row.rightQty ?? 1 : 1;

        cableMap.set(meta.gauge, (cableMap.get(meta.gauge) || 0) + (length * qtyMultiplier));
        const currentBreaker = breakerMap.get(meta.breakerLabel);
        breakerMap.set(meta.breakerLabel, {
          qty: (currentBreaker?.qty ?? 0) + qtyMultiplier,
          category: meta.breakerCategory,
          order: meta.order,
        });
      });
    });

    if (centerBottom) {
      const meta = OPTION_META[centerBottom];
      const currentBreaker = breakerMap.get(meta.breakerLabel);
      breakerMap.set(meta.breakerLabel, {
        qty: (currentBreaker?.qty ?? 0) + 1,
        category: meta.breakerCategory,
        order: meta.order,
      });
    }

    const cableRows: BudgetRow[] = Array.from(cableMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([gauge, totalLength]) => ({
        category: CABLE_CATEGORY_BY_GAUGE[gauge] || 'CABO',
        product: `CABO ${gauge} mm²`,
        qty: Math.ceil(totalLength / 100),
        unit: 'm',
      }));

    const breakerRows: BudgetRow[] = Array.from(breakerMap.entries())
      .sort((a, b) => a[1].order - b[1].order)
      .map(([product, data]) => ({
        category: data.category,
        product,
        qty: data.qty,
        unit: 'un',
      }));

    const defaultRows: BudgetRow[] = [];
    const isFixedLayoutType = FIXED_LAYOUT_QUADRO_TYPES.has(quadroType);

    if (isFixedLayoutType) {
      const categoriaGeral = quadroType === 'QUADRO GERAL 55X55 500A' ? '21513' : '21512';
      const produtoGeral =
        quadroType === 'QUADRO GERAL 55X55 500A'
          ? 'CAIXA 55X55 DISJUNTOR GERAL 500A'
          : 'CAIXA 55X55 DISJUNTOR GERAL 250A';

      defaultRows.push(
        {
          category: categoriaGeral,
          qty: 1,
          product: produtoGeral,
          unit: 'un',
        },
      );

      if (quadroType === 'QUADRO GERAL 55X55 250A') {
        defaultRows.push({
          category: '21511',
          qty: 1,
          product: 'CAIXA 55X55 VAZIA',
          unit: 'un',
        });
      }

      if (centerTop === 'Sim') {
        defaultRows.push({
          category: '9459',
          qty: 4,
          product: 'DPS 1P 275V 20KA',
          unit: 'un',
        });
      }

      const linhasSuperiores = layoutRows.slice(0, -1);
      const caixasSubida = linhasSuperiores.length;
      const caixasDireita02 = linhasSuperiores.filter((row) => (row.rightQty ?? 1) <= 2).length;
      const caixasDireita03 = linhasSuperiores.filter((row) => (row.rightQty ?? 1) === 3).length;

      if (caixasSubida > 0) {
        defaultRows.push(
          {
            category: '21511',
            qty: caixasSubida,
            product: 'CAIXA 55X55 VAZIA',
            unit: 'un',
          },
        );
        if (caixasDireita02 > 0) {
          defaultRows.push({
            category: '21514',
            qty: caixasDireita02,
            product: 'CAIXA 55X55 DISJUNTOR 02 250',
            unit: 'un',
          });
        }
        if (caixasDireita03 > 0) {
          defaultRows.push({
            category: '21515',
            qty: caixasDireita03,
            product: 'CAIXA 55X55 DISJUNTOR 03 250',
            unit: 'un',
          });
        }
      }

      const totalLinhasQuadro = layoutRows.length;
      const barramentoQty = totalLinhasQuadro >= 3 ? 2 : 1;
      if (quadroType === 'QUADRO GERAL 55X55 500A') {
        defaultRows.push({
          category: '22487',
          qty: barramentoQty,
          product: 'BARRA COBRE CHATA 3 METROS 1" X 1/2" - 657A',
          unit: 'un',
        });
      } else {
        defaultRows.push({
          category: '22490',
          qty: barramentoQty,
          product: 'BARRA COBRE CHATA 3 METROS 1.1/4" X 3/16" - 351A',
          unit: 'un',
        });
      }
    } else {
      const caixasAdicionadas = preenchidosLayout;
      defaultRows.push(
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
      );

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

      if (centerTop === 'Sim') {
        defaultRows.push({
          category: '9459',
          qty: 4,
          product: 'PRODUTO DPS 1P 275V 20KA',
          unit: 'un',
        });
      }
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
      items: [...defaultRows, ...(isFixedLayoutType ? [] : cableRows), ...breakerRows],
      totalSlots: totalSlotsLayout,
      preenchidos: preenchidosLayout,
    };
  };

  const quadroBudgets = useMemo(
    () =>
      quadros.map((quadro) => ({
        id: quadro.id,
        nome: quadro.nome,
        ...buildBudgetRowsForLayout(
          quadro.layout,
          quadro.tipo,
          quadro.centerTopValue ?? '',
          quadro.centerBottomValue ?? '',
        ),
      })),
    [quadros],
  );

  const productCodes = useMemo(
    () =>
      Array.from(
        new Set(
          quadroBudgets
            .flatMap((quadro) => quadro.items.map((item) => item.category))
            .filter((category) => /^\d+$/.test(category)),
        ),
      ),
    [quadroBudgets],
  );

  useEffect(() => {
    let ignore = false;

    const fetchPrices = async () => {
      if (productCodes.length === 0) {
        setPriceByCodprod({});
        setLoadingPrices(false);
        return;
      }

      setLoadingPrices(true);
      const prices = await fetchPricesByCodes(productCodes);

      if (!ignore) {
        setPriceByCodprod(prices);
        setLoadingPrices(false);
      }
    };

    fetchPrices();

    return () => {
      ignore = true;
    };
  }, [fetchPricesByCodes, productCodes]);

  const formatCurrency = (value: number) =>
    value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });

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
            centerTopValue: quadro.centerTopValue ?? '',
            centerBottomValue: quadro.centerBottomValue ?? '',
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
              tipo: quadros.find((item) => item.id === quadro.id)?.tipo ?? 'QUADRO PADRÃO ENERGISA',
              centerTopValue: quadros.find((item) => item.id === quadro.id)?.centerTopValue ?? '',
              centerBottomValue: quadros.find((item) => item.id === quadro.id)?.centerBottomValue ?? '',
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
      tipo: quadro.tipo || 'QUADRO PADRÃO ENERGISA',
      layout: quadro.layout,
      centerTopValue: (quadro as { centerTopValue?: CenterTopValue }).centerTopValue ?? '',
      centerBottomValue: (quadro as { centerBottomValue?: CenterBottomValue }).centerBottomValue ?? '',
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
          centerTopValue?: CenterTopValue;
          centerBottomValue?: CenterBottomValue;
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
          nome: 'Quadro padrão Energisa 1',
          tipo: 'QUADRO PADRÃO ENERGISA',
          layout: budget.layout as RowData[],
          centerTopValue: '' as CenterTopValue,
          centerBottomValue: '' as CenterBottomValue,
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
      const isFixedLayoutType = FIXED_LAYOUT_QUADRO_TYPES.has(newQuadroType);
      const next = [
        ...current,
        {
          id: nextId,
          nome: newQuadroName.trim(),
          tipo: newQuadroType,
          layout: isFixedLayoutType ? buildFixedRows() : buildDefaultRows(),
          centerTopValue: '' as CenterTopValue,
          centerBottomValue: '' as CenterBottomValue,
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

  const addFixedLayoutLevel = () => {
    updateActiveRows((current) => {
      if (current.length >= 4) return current;
      const nextId = current.length > 0 ? Math.max(...current.map((row) => row.id)) + 1 : 1;
      const newRow: RowData = {
        id: nextId,
        left: [createSlot(nextId, 'left', 1)],
        right: [createSlot(nextId, 'right', 1)],
        rightQty: 1,
      };
      return [newRow, ...current];
    });
  };

  const deleteFixedLayoutLevel = (rowId: number) => {
    updateActiveRows((current) => {
      if (current.length <= 1) return current;
      return current.filter((row) => row.id !== rowId);
    });
  };

  const updateFixedRowQty = (rowId: number, qty: 1 | 2 | 3) => {
    updateActiveRows((current) => current.map((row) => (row.id === rowId ? { ...row, rightQty: qty } : row)));
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
    updateActiveRows(() => (isFixedLayoutQuadro ? buildFixedRows() : buildDefaultRows()));
    setPopover(null);
  };

  const handlePrintBudget = async () => {
    if (quadroBudgets.length === 0) {
      alert('Não há itens para gerar o orçamento.');
      return;
    }

    setPrintingBudget(true);
    try {
      const currentProductCodes = Array.from(
        new Set(
          quadroBudgets
            .flatMap((quadro) => quadro.items.map((item) => item.category))
            .filter((category) => /^\d+$/.test(category)),
        ),
      );

      const resolvedPrices = await fetchPricesByCodes(currentProductCodes);
      setPriceByCodprod(resolvedPrices);

      const payload = {
        budgetName: saveBudgetName || 'ORÇAMENTO DFARIAS',
        projectName: activeQuadro?.nome || 'HOSPITAL',
        coverPage: {
          title: 'PROPOSTA\nCOMERCIAL',
        },
        secondPageHeader: [
          'DFarias Engenharia e Automação',
          'CNPJ: 24.000.965/0001-42',
          '(083) 96383277',
          'CAMPINA GRANDE - 100',
        ],
        prazoEntrega: typeof prazoEntrega === 'number' ? prazoEntrega : null,
        quadros: quadroBudgets.map((quadro) => {
          const tipo = quadros.find((item) => item.id === quadro.id)?.tipo || 'QUADRO PADRÃO ENERGISA';
          const shouldIgnoreBoxValueOnTotal = FIXED_LAYOUT_QUADRO_TYPES.has(tipo);
          const items = quadro.items.map((item) => {
            const resolvedUnitPrice = resolvedPrices[item.category] ?? 0;
            const unitPrice =
              shouldIgnoreBoxValueOnTotal && QUADRO_GERAL_ZERO_TOTAL_CATEGORIES.has(item.category)
                ? 0
                : resolvedUnitPrice;
            return {
              codprod: item.category,
              product: item.product,
              description: item.product,
              qty: item.qty,
              unit: item.unit,
              unitPrice,
              totalPrice: unitPrice * item.qty,
            };
          });

          return {
            id: quadro.id,
            nome: quadro.nome,
            tipo,
            totalPrice: items.reduce((acc, item) => acc + item.totalPrice, 0),
            items,
          };
        }),
      };

      setSaveBudgetName(payload.budgetName);

      const response = await fetch('/api/print/orcamento-dfarias', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const contentType = response.headers.get('content-type') || '';

      if (!response.ok || !contentType.toLowerCase().includes('application/pdf')) {
        const errorMessage = contentType.toLowerCase().includes('application/json')
          ? (await response.json().catch(() => null))?.error
          : await response.text().catch(() => '');

        throw new Error(errorMessage || 'O serviço de impressão não retornou um PDF válido.');
      }

      const pdfBlob = await response.blob();
      const pdfUrl = URL.createObjectURL(pdfBlob);
      const printWindow = window.open(pdfUrl, '_blank', 'noopener,noreferrer');

      if (!printWindow) {
        URL.revokeObjectURL(pdfUrl);
        throw new Error('Pop-up bloqueado. Permita pop-ups para visualizar o PDF.');
      }

      const releaseObjectUrl = () => {
        setTimeout(() => {
          URL.revokeObjectURL(pdfUrl);
        }, 60_000);
      };

      printWindow.addEventListener('load', releaseObjectUrl, { once: true });
      setTimeout(releaseObjectUrl, 5_000);
    } catch (error) {
      console.error(error);
      alert(
        error instanceof Error
          ? error.message
          : 'Não foi possível preparar a impressão do orçamento no momento.',
      );
    } finally {
      setPrintingBudget(false);
    }
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

  const centerTopValue = activeQuadro?.centerTopValue ?? '';
  const centerBottomValue = activeQuadro?.centerBottomValue ?? '';

  const openCenterTopPopover = (event: React.MouseEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setPopover((current) =>
      current?.kind === 'center-top'
        ? null
        : {
          kind: 'center-top',
          top: rect.bottom + 8,
          left: rect.left + rect.width / 2,
        },
    );
  };

  const updateCenterTopValue = (nextValue: CenterTopValue) => {
    setQuadros((current) =>
      current.map((quadro) =>
        quadro.id === (activeQuadro?.id ?? activeQuadroId) ? { ...quadro, centerTopValue: nextValue } : quadro,
      ),
    );
    setPopover(null);
  };

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

  const showCenterTopPopover = popover?.kind === 'center-top';
  const showCenterBottomPopover = popover?.kind === 'center-bottom';

  const updateCenterBottomValue = (nextValue: CenterBottomValue) => {
    setQuadros((current) =>
      current.map((quadro) =>
        quadro.id === (activeQuadro?.id ?? activeQuadroId) ? { ...quadro, centerBottomValue: nextValue } : quadro,
      ),
    );
    setPopover(null);
  };

  const renderSlot = (rowId: number, side: Side, slot: Slot, isBottomRow: boolean) => {
    const isFixedBottomLeftGeralSlot = isFixedLayoutQuadro && isBottomRow && side === 'left';
    const isFixedBottomRightDpsSlot = isFixedLayoutQuadro && isBottomRow && side === 'right';
    const isFixedUpperLeftVazia = isFixedLayoutQuadro && !isBottomRow && side === 'left';
    const isFixedUpperRightConfig = isFixedLayoutQuadro && !isBottomRow && side === 'right';
    const isOpen = popover?.kind === 'slot' && popover.slotId === slot.id;

    if (isFixedBottomLeftGeralSlot) {
      const selectedGeralAmp = centerBottomValue.replace('T CX ', '');

      return (
        <div
          key={slot.id}
          className="relative flex h-[156px] w-[120px] items-center justify-center border border-slate-300 bg-white border-r-0"
        >
          <button
            type="button"
            onClick={openCenterBottomPopover}
            className="flex min-h-[86px] w-[calc(100%-16px)] flex-col items-center justify-center rounded-xl border border-lime-500/70 bg-white px-3 py-2 text-center transition hover:bg-slate-50 print:pointer-events-none"
          >
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-lime-950">GERAL</span>
            <span className="mt-1 text-lg font-black text-lime-950">{selectedGeralAmp || '--'}</span>
          </button>
        </div>
      );
    }

    if (isFixedBottomRightDpsSlot) {
      return (
        <div
          key={slot.id}
          className="relative flex h-[156px] w-[120px] items-center justify-center border border-slate-300 bg-white border-l-0"
        >
          <button
            type="button"
            onClick={openCenterTopPopover}
            className="flex min-h-[86px] w-[calc(100%-16px)] flex-col items-center justify-center rounded-xl border border-lime-500/70 bg-white px-3 py-2 text-center transition hover:bg-slate-50 print:pointer-events-none"
          >
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-lime-950">DPS</span>
            <span className="mt-1 text-sm font-black uppercase tracking-[0.14em] text-lime-950">
              {centerTopValue || '--'}
            </span>
          </button>
        </div>
      );
    }

    if (isFixedUpperLeftVazia) {
      return (
        <div
          key={slot.id}
          className="relative flex h-[156px] w-[120px] items-center justify-center border border-slate-300 bg-white border-r-0"
        >
          <div className="flex min-h-[86px] w-[calc(100%-16px)] flex-col items-center justify-center rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-center">
            <span className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">CAIXA</span>
            <span className="mt-1 text-sm font-black uppercase tracking-[0.1em] text-slate-700">VAZIA</span>
          </div>
        </div>
      );
    }

    if (isFixedUpperRightConfig) {
      const row = rows.find((item) => item.id === rowId);
      const rowQty = row?.rightQty ?? 1;
      const breakerOptions =
        activeQuadro?.tipo === 'QUADRO GERAL 55X55 500A'
          ? (['T CX 300', 'T CX 400', 'T CX 500'] as SlotValue[])
          : ([
            'T 40',
            'T 50',
            'T 70',
            'T 100',
            'T 125',
            'T CX 125',
            'T CX 150',
            'T CX 160',
            'T CX 175',
            'T CX 200',
            'T CX 225',
            'T CX 250',
          ] as SlotValue[]);

      return (
        <div
          key={slot.id}
          className="relative flex h-[156px] w-[120px] items-center justify-center border border-slate-300 bg-white border-l-0"
        >
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-2">
            <select
              value={rowQty}
              onChange={(event) => updateFixedRowQty(rowId, Number(event.target.value) as 1 | 2 | 3)}
              className="h-8 w-full rounded-lg border border-slate-300 bg-white px-2 text-xs font-bold text-slate-700"
            >
              <option value={1}>QTD 1</option>
              <option value={2}>QTD 2</option>
              <option value={3}>QTD 3</option>
            </select>
            <select
              value={slot.value}
              onChange={(event) => updateSlotValue(slot.id, event.target.value as SlotValue)}
              className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2 text-xs font-bold text-slate-700"
            >
              <option value="">DISJ.</option>
              {breakerOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </div>
      );
    }

    return (
      <div
        key={slot.id}
        className={`relative flex h-[156px] w-[120px] items-center justify-center border border-slate-300 bg-amber-100 ${side === 'left' ? 'border-r-0' : 'border-l-0'
          }`}
      >
        <div className="flex h-full w-full flex-col items-center justify-between p-2">
          <div className="flex w-full justify-end print:hidden">
            {!isFixedLayoutQuadro && (
              <button
                type="button"
                onClick={() => deleteSlot(rowId, side, slot.id)}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full text-red-500 transition hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
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
                {slotOptions.map((option) => {
                    const selected = slot.value === option;

                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => updateSlotValue(slot.id, option)}
                        className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-semibold transition ${selected
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
    <DashboardLayout title="DFarias" subtitle="Projeto">
      <main className="mx-auto grid w-full max-w-[1700px] grid-cols-1 gap-5 px-4 py-6 md:px-6 xl:grid-cols-[minmax(0,1fr)_300px] lg:px-8">
        <style jsx global>{`
          @media print {
            @page {
              size: A4 portrait;
              margin: 0;
            }

            body {
              background: #fff !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }

            .screen-only,
            .print-hide {
              display: none !important;
            }

            .print-only {
              display: block !important;
            }

            .proposal-page {
              width: 210mm;
              min-height: 297mm;
              position: relative;
              padding: 12mm 10mm 18mm;
              page-break-after: always;
              font-family: Arial, Helvetica, sans-serif;
              color: #3f3f46;
              background: #fff;
            }

            .proposal-header {
              display: flex;
              align-items: flex-start;
              gap: 12px;
              margin-left: 5mm;
              margin-bottom: 18mm;
            }

            .proposal-logo {
              width: 26mm;
              height: 26mm;
              object-fit: contain;
            }

            .proposal-company {
              font-size: 11px;
              line-height: 1.55;
              color: #7a7a7a;
              font-weight: 700;
            }

            .proposal-company strong {
              display: block;
              color: #43305f;
              font-size: 12px;
            }

            .proposal-title {
              color: #351b4f;
              font-size: 15px;
              font-weight: 800;
              margin: 0 0 4px;
            }

            .proposal-text {
              font-size: 11.2px;
              line-height: 1.45;
              margin: 0 0 8px;
            }

            .proposal-list {
              margin: 6px 0 12px 16px;
              padding: 0;
              font-size: 11.2px;
              line-height: 1.45;
            }

            .proposal-table {
              width: 100%;
              border-collapse: collapse;
              font-size: 8.5px;
              margin-top: 6px;
            }

            .proposal-table th,
            .proposal-table td {
              border: 1px solid #111;
              padding: 3px 5px;
            }

            .proposal-table thead tr:first-child th {
              background: #13a9d4 !important;
              color: #111;
              font-weight: 800;
              text-align: center;
            }

            .proposal-table thead tr:nth-child(2) th {
              background: #fff !important;
              font-weight: 700;
            }

            .proposal-table .center {
              text-align: center;
            }

            .proposal-table .right {
              text-align: right;
            }

            .proposal-footer {
              position: absolute;
              left: 0;
              right: 0;
              bottom: 0;
              height: 13mm;
              border-bottom: 5mm solid #351b4f;
              background: linear-gradient(to right, #351b4f 0 29%, #e5e5e5 29% 100%);
              text-align: center;
              font-size: 10px;
              padding-top: 3mm;
              color: #555;
            }

            .cover-page {
              background: #f3f3f3;
              color: #351b4f;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              padding: 22mm 20mm;
            }

            .cover-brand {
              display: flex;
              justify-content: center;
              margin-top: 25mm;
            }

            .cover-meta {
              margin-bottom: 30mm;
            }

            .cover-page h1 {
              font-size: 18mm;
              line-height: 1.08;
              margin: 0 0 6mm;
              font-weight: 800;
            }

            .cover-page h2 {
              font-size: 7mm;
              margin: 0;
              font-weight: 500;
              color: #9b9b9b;
            }

            .institutional-page {
              background: #f3f3f3;
            }

            .institutional-top {
              display: flex;
              align-items: center;
              gap: 4mm;
              margin: 0 0 4mm;
            }

            .institutional-bar {
              display: grid;
              grid-template-columns: 50mm 1fr;
              margin-bottom: 4mm;
            }

            .institutional-date {
              background: #351b4f;
              color: #fff;
              text-align: center;
              font-size: 11px;
              font-weight: 700;
              padding: 2mm 1mm;
            }

            .institutional-proposal {
              background: #e7e7e7;
              color: #949494;
              text-align: right;
              font-size: 11px;
              padding: 2mm 4mm;
            }

            .institutional-section-title {
              font-size: 12px;
              font-weight: 800;
              margin: 2mm 0 1mm;
            }

            .institutional-text {
              font-size: 11px;
              line-height: 1.45;
              margin: 0 0 2mm;
            }
          }

          @media screen {
            .print-only {
              display: none !important;
            }
          }
        `}</style>

        <div className="flex min-w-0 flex-col gap-5">
          <section className="screen-only flex flex-wrap items-center justify-end gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
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
                disabled={printingBudget}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <FileText className="h-4 w-4" />
                {printingBudget ? 'Preparando impressão...' : 'Imprimir orçamento'}
              </button>
            </div>
          </section>

          <section className="screen-only rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              {quadros.map((quadro) => (
                <div
                  key={quadro.id}
                  className={`flex items-center gap-1 rounded-lg border px-2 py-1.5 ${quadro.id === activeQuadro?.id
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
                      className={`block text-[10px] font-semibold uppercase tracking-[0.08em] ${quadro.id === activeQuadro?.id ? 'text-slate-300' : 'text-slate-500'
                        }`}
                    >
                      {quadro.tipo}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteQuadro(quadro.id)}
                    className={`rounded-md p-1 transition ${quadro.id === activeQuadro?.id
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
                    className={`grid ${shouldShowCenterFrames ? 'grid-cols-[52px_1fr_132px_1fr_52px]' : 'grid-cols-[52px_1fr_1fr_52px]'} items-stretch ${index > 0 ? '-mt-px' : ''
                      }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        if (isFixedLayoutQuadro && index !== rows.length - 1) {
                          deleteFixedLayoutLevel(row.id);
                          return;
                        }
                        if (isFixedLayoutQuadro) {
                          addFixedLayoutLevel();
                          return;
                        }
                        addSlot(row.id, 'left');
                      }}
                      disabled={
                        isFixedLayoutQuadro
                          ? index === rows.length - 1 && rows.length >= 4
                          : row.left.length >= MAX_POSITIONS_PER_SIDE
                      }
                      className={`flex h-[156px] items-center justify-center border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 ${index === 0 ? 'rounded-tl-xl' : ''
                        } ${index === rows.length - 1 ? 'rounded-bl-xl' : ''}`}
                    >
                      {isFixedLayoutQuadro && index !== rows.length - 1 ? <Trash2 className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                    </button>

                    <div className="flex items-stretch justify-end">
                      {row.left.map((slot) => renderSlot(row.id, 'left', slot, index === rows.length - 1))}
                    </div>

                    {shouldShowCenterFrames && (
                      <div className="flex h-[156px] items-center justify-center border border-slate-300 bg-lime-300 px-4 text-center">
                        {index === 0 ? (
                          <button
                            type="button"
                            onClick={openCenterTopPopover}
                            className="w-full rounded-xl border border-lime-500/70 bg-white/90 px-3 py-2 text-center text-sm font-black uppercase tracking-[0.14em] text-lime-950 transition hover:bg-white"
                          >
                            {centerTopValue ? (
                              <span className="flex flex-col leading-tight">
                                <span className="text-[10px] tracking-[0.2em]">DPS</span>
                                <span className="mt-1">{centerTopValue}</span>
                              </span>
                            ) : (
                              'DPS'
                            )}
                          </button>
                        ) : index === rows.length - 1 ? (
                          <button
                            type="button"
                            onClick={openCenterBottomPopover}
                            className="w-full rounded-xl border border-lime-500/70 bg-white/90 px-3 py-2 text-center text-sm font-black uppercase tracking-[0.14em] text-lime-950 transition hover:bg-white"
                          >
                            {centerBottomValue || 'geral'}
                          </button>
                        ) : (
                          <span className="text-sm font-black uppercase tracking-[0.18em] text-lime-950">
                            barra.
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex items-stretch justify-start">
                      {row.right.map((slot) => renderSlot(row.id, 'right', slot, index === rows.length - 1))}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (isFixedLayoutQuadro && index !== rows.length - 1) {
                          deleteFixedLayoutLevel(row.id);
                          return;
                        }
                        if (isFixedLayoutQuadro) {
                          addFixedLayoutLevel();
                          return;
                        }
                        addSlot(row.id, 'right');
                      }}
                      disabled={
                        isFixedLayoutQuadro
                          ? index === rows.length - 1 && rows.length >= 4
                          : row.right.length >= MAX_POSITIONS_PER_SIDE
                      }
                      className={`flex h-[156px] items-center justify-center border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 ${index === 0 ? 'rounded-tr-xl' : ''
                        } ${index === rows.length - 1 ? 'rounded-br-xl' : ''}`}
                    >
                      {isFixedLayoutQuadro && index !== rows.length - 1 ? <Trash2 className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {((shouldShowCenterFrames || isFixedLayoutQuadro) && showCenterTopPopover) &&
            createPortal(
              <div
                ref={popoverRef}
                className="fixed z-[1000] w-40 -translate-x-1/2 rounded-xl border border-slate-200 bg-white p-2 shadow-2xl print:hidden"
                style={{ top: popover?.top ?? 0, left: popover?.left ?? 0 }}
              >
                {CENTER_TOP_OPTIONS.map((option) => {
                  const selected = centerTopValue === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => updateCenterTopValue(option)}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-semibold transition ${selected ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
                        }`}
                    >
                      <span>{option}</span>
                      {selected && <Check className="h-4 w-4" />}
                    </button>
                  );
                })}
              </div>,
              document.body,
            )}

          {(showCenterBottomPopover && (shouldShowCenterFrames || isFixedLayoutQuadro)) &&
            createPortal(
              <div
                ref={popoverRef}
                className="fixed z-[1000] w-44 -translate-x-1/2 rounded-xl border border-slate-200 bg-white p-2 shadow-2xl print:hidden"
                style={{ top: popover?.top ?? 0, left: popover?.left ?? 0 }}
              >
                {centerBottomOptionsForActiveQuadro.map((option) => {
                  const selected = centerBottomValue === option;
                  const optionLabel = option.replace('T CX ', '');
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => updateCenterBottomValue(option)}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-semibold transition ${selected ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
                        }`}
                    >
                      <span>{isFixedLayoutQuadro ? optionLabel : option}</span>
                      {selected && <Check className="h-4 w-4" />}
                    </button>
                  );
                })}
              </div>,
              document.body,
            )}

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
                    {quadro.nome} · {quadros.find((item) => item.id === quadro.id)?.tipo || 'QUADRO PADRÃO ENERGISA'}
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
                          className={`grid grid-cols-[140px_1fr_140px_120px] border border-t-0 border-slate-200 text-sm ${index === quadro.items.length - 1 ? 'rounded-b-xl' : ''
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

          <section className="print-only">
            <div className="proposal-page cover-page">
              <div className="cover-brand">
                <Image
                  src="/eletro_farias.png"
                  alt="DFarias Engenharia e Automação"
                  width={280}
                  height={140}
                  priority
                />
              </div>
              <div className="cover-meta">
                <h1>
                  PROPOSTA
                  <br />
                  COMERCIAL
                </h1>
                <h2>{saveBudgetName || 'CONSÓRCIO HCCG - COMTERMICA'}</h2>
              </div>
            </div>

            <div className="proposal-page institutional-page">
              <header className="institutional-top">
                <Image
                  src="/eletro_farias.png"
                  alt="DFarias Engenharia e Automação"
                  width={86}
                  height={86}
                />
                <div className="proposal-company">
                  <strong>DFarias Engenharia e Automação</strong>
                  CNPJ: 24.000.965/0001-42
                  <br />
                  (83) 98889-4729
                  <br />
                  CAMPINA GRANDE - PB
                </div>
              </header>

              <div className="institutional-bar">
                <div className="institutional-date">{new Date().toLocaleDateString('pt-BR')}</div>
                <div className="institutional-proposal">
                  Proposta nº {String(Date.now()).slice(-4)}
                </div>
              </div>

              <section>
                <h2 className="institutional-section-title">Quem somos</h2>
                <p className="institutional-text">
                  Há mais de dez anos na região da Paraíba atuando no mercado de service e fabricação de
                  painéis e quadros elétricos.
                </p>
                <h2 className="institutional-section-title">Certificações</h2>
                <p className="institutional-text">
                  • Especialista em fornecimento de produtos em Média Tensão da Schneider Electric, Weg e
                  Siemens.
                </p>
                <p className="institutional-text">
                  • Especialista em fornecimento e instalação de produtos elétricos dos fabricantes da
                  Schneider Electric, Weg e Siemens.
                </p>
                <h2 className="institutional-section-title">Certificações e ensaios de Painéis e Quadro</h2>
                <p className="institutional-text">
                  • Ensaios de fabricação conforme a NBR-5410. • Fabricação de quadros e Painéis e quadros
                  elétricos de acordo com projeto elétrico.
                </p>
                <p className="institutional-text">
                  • Ensaios de tipo PTTA de acordo com normas ABNT NBR 60439-1 e IEC 616439-1&2.
                </p>
                <h2 className="institutional-section-title">Service</h2>
                <p className="institutional-text">
                  • Fornecimento e documentações atualizadas da equipe - PCMSO, PGR, LTCAT, RELATORIO ANUAL
                  DE NR10, NR35 E NR18.
                </p>
              </section>
            </div>

            <div className="proposal-page">
              <header className="proposal-header">
                <Image
                  src="/eletro_farias.png"
                  alt="DFarias Engenharia e Automação"
                  width={98}
                  height={98}
                  className="proposal-logo"
                  priority
                />

                <div className="proposal-company">
                  <strong>DFarias Engenharia e Automação</strong>
                  CNPJ: 24.000.965/0001-42
                  <br />
                  (083) 96383277
                  <br />
                  CAMPINA GRANDE - PB
                </div>
              </header>

              <section>
                <h2 className="proposal-title">Projeto: {activeQuadro?.nome || 'HOSPITAL'}</h2>
                <h2 className="proposal-title">Escopo:</h2>

                <p className="proposal-text">
                  A presente proposta tem por objetivo formalizar o fornecimento e a integração de painéis e
                  quadros elétricos industrializados, em total conformidade com o projeto e a solicitação
                  recebida.
                </p>

                <p className="proposal-text">
                  <strong>Lista de painéis e materiais:</strong>
                </p>

                {loadingPrices && (
                  <p className="proposal-text">
                    Carregando valores de referência dos produtos no Sankhya...
                  </p>
                )}

                {quadroBudgets.map((quadro) => (
                  <div key={`print-${quadro.id}`} className="mt-3 rounded-md border border-[#111] p-1">
                    <table className="proposal-table !mt-0">
                      <thead>
                        <tr>
                          <th colSpan={4}>
                            {quadros.find((item) => item.id === quadro.id)?.tipo || 'QUADRO PADRÃO ENERGISA'} -{' '}
                            {quadro.nome}
                          </th>
                          <th className="right">
                            {formatCurrency(
                              quadro.items.reduce((acc, item) => {
                                const unitPrice = priceByCodprod[item.category] ?? 0;
                                return acc + unitPrice * item.qty;
                              }, 0),
                            )}
                          </th>
                        </tr>
                        <tr>
                          <th>Item</th>
                          <th>Qtde</th>
                          <th>Descrição</th>
                          <th>Valor unit.</th>
                          <th>Valor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {quadro.items.map((item, index) => {
                          const unitPrice = priceByCodprod[item.category] ?? 0;
                          const itemTotal = unitPrice * item.qty;

                          return (
                            <tr key={`${quadro.id}-${item.category}-${item.product}`}>
                              <td className="center">{index + 1}</td>
                              <td className="center">{item.qty}</td>
                              <td>
                                {item.product}
                                <br />
                                <span style={{ fontSize: '7px', color: '#666' }}>
                                  CODPROD: {item.category}
                                </span>
                              </td>
                              <td className="right">{formatCurrency(unitPrice)}</td>
                              <td className="right">{formatCurrency(itemTotal)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ))}
              </section>

              <footer className="proposal-footer">
                DFarias Engenharia e Automação / Pedro Silva, Tambor / www.dfarias.com.br
              </footer>
            </div>

            <div className="proposal-page">
              <header className="proposal-header">
                <Image
                  src="/eletro_farias.png"
                  alt="DFarias"
                  width={98}
                  height={98}
                  className="proposal-logo"
                />
                <div className="proposal-company">
                  <strong>DFarias Engenharia e Automação</strong>
                  CNPJ: 24.000.965/0001-42
                  <br />
                  (083) 96383277
                  <br />
                  CAMPINA GRANDE - PB
                </div>
              </header>

              <h2 className="proposal-title">Condições Gerais:</h2>

              <p className="proposal-text">
                <strong>Preços:</strong> Os preços propostos são válidos por 30 dias.
              </p>
              <p className="proposal-text">
                <strong>Tributos:</strong> Qualquer tributo ou encargo que venha existir ou seja alterado será
                repassado ao preço contratado.
              </p>
              <p className="proposal-text">
                <strong>Aceitação do Pedido:</strong> A proposta será considerada aceita após o recebimento da
                ordem de compra.
              </p>

              <h2 className="proposal-title">
                Prazo de Entrega – {prazoEntrega === '' ? '30 A 60 DIAS' : `${prazoEntrega} DIAS`}
              </h2>

              <footer className="proposal-footer">
                DFarias Engenharia e Automação / Pedro Silva, Tambor / www.dfarias.com.br
              </footer>
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

    </DashboardLayout>
  );
}

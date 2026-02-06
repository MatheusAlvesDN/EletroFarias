'use client';
import React, { useState } from 'react';
import {
  Map,
  ArrowRight,
  ArrowLeft,
  Box,
  Layers,
  LayoutGrid,
  Info,
  ChevronRight,
  Home,
  Database,
  Package,
  Footprints,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Ban
} from 'lucide-react';
import { randomInt } from 'crypto';

// --- TYPE DEFINITIONS ---

interface RackDimension {
  h: number;
  d: number;
  w: number;
  weight: number;
}

interface RackConfig {
  rua: number;
  face: 'LD' | 'LE';
  racks: number;
  levels: number;
  apts: number;
  dims: RackDimension;
}

interface Aisle {
  id: number;
  name: string;
  direction: '->' | '<-';
  top: RackConfig | null;
  bottom: RackConfig | null;
}

interface Area {
  id: string;
  name: string;
  description: string;
  aisles: Aisle[];
}

interface WarehouseData {
  areas: Area[];
}

type CellStatus = 'LIVRE' | 'OCUPADO' | 'PARCIAL' | 'BLOQUEADO';

// --- MOCK DATA ---
const WAREHOUSE_DATA: WarehouseData = {
  areas: [
    {
      id: 'area1',
      name: 'Área 1 - Área Nova',
      description: 'Armazenamento Principal',
      aisles: [
        {
          id: 1,
          name: 'Rua 1',
          direction: '->',
          top: { rua: 1, face: 'LD', racks: 11, levels: 4, apts: 5, dims: { h: 0.42, d: 0.6, w: 0.36, weight: 50 } },
          bottom: null
        },
        {
          id: 2,
          name: 'Rua 2',
          direction: '<-',
          top: { rua: 2, face: 'LD', racks: 11, levels: 4, apts: 5, dims: { h: 0.42, d: 0.6, w: 0.36, weight: 50 } },
          bottom: { rua: 2, face: 'LE', racks: 11, levels: 4, apts: 5, dims: { h: 0.42, d: 0.6, w: 0.36, weight: 50 } }
        },
        {
          id: 3,
          name: 'Rua 3',
          direction: '->',
          top: { rua: 3, face: 'LD', racks: 11, levels: 4, apts: 5, dims: { h: 0.42, d: 0.6, w: 0.36, weight: 50 } },
          bottom: { rua: 3, face: 'LE', racks: 11, levels: 4, apts: 5, dims: { h: 0.42, d: 0.6, w: 0.36, weight: 50 } }
        },
        {
          id: 4,
          name: 'Rua 4',
          direction: '<-',
          top: { rua: 4, face: 'LD', racks: 11, levels: 4, apts: 5, dims: { h: 0.42, d: 0.6, w: 0.36, weight: 50 } },
          bottom: { rua: 4, face: 'LE', racks: 11, levels: 4, apts: 5, dims: { h: 0.42, d: 0.6, w: 0.36, weight: 50 } }
        },
        {
          id: 5,
          name: 'Rua 5',
          direction: '->',
          top: { rua: 5, face: 'LD', racks: 11, levels: 6, apts: 8, dims: { h: 0.21, d: 0.6, w: 0.21, weight: 25 } },
          bottom: { rua: 5, face: 'LE', racks: 11, levels: 6, apts: 8, dims: { h: 0.21, d: 0.6, w: 0.21, weight: 25 } }
        },
        {
          id: 6,
          name: 'Rua 6',
          direction: '<-',
          top: null,
          bottom: { rua: 6, face: 'LE', racks: 11, levels: 6, apts: 8, dims: { h: 0.21, d: 0.6, w: 0.21, weight: 25 } }
        }
      ]
    },
    {
      id: 'area2',
      name: 'Área 2 - Expansão',
      description: 'Expansão Lateral',
      aisles: [
        {
          id: 1,
          name: 'Rua 1',
          direction: '->',
          top: { rua: 1, face: 'LE', racks: 11, levels: 4, apts: 5, dims: { h: 0.4, d: 0.5, w: 0.5, weight: 50 } },
          bottom: null
        },
      ]
    }
  ]
};

// --- HELPERS ---

// Simula um status vindo do backend baseado na posição
const getMockStatus = (rack: number, level: number, apt: number): CellStatus => {
//const int = (randomInt(0, rack+1) * 7 + randomInt(0,level+1) * 3 + randomInt(apt+1) ) % 10
  const hash = (rack * 7 + level * 3 + apt) % 10;
  if (hash === 0) return 'BLOQUEADO';
  if (hash < 4) return 'OCUPADO';
  if (hash < 7) return 'PARCIAL';
  return 'LIVRE';
};

const getStatusColor = (status: CellStatus, isSelected: boolean) => {
  if (isSelected) return 'bg-white ring-2 ring-emerald-600 ring-offset-2 z-10 text-emerald-700 font-bold border-emerald-600';
  
  switch (status) {
    case 'LIVRE': return 'bg-emerald-100 text-emerald-600 border-emerald-200 hover:bg-emerald-200';
    case 'OCUPADO': return 'bg-red-100 text-red-600 border-red-200 hover:bg-red-200';
    case 'PARCIAL': return 'bg-amber-100 text-amber-600 border-amber-200 hover:bg-amber-200';
    case 'BLOQUEADO': return 'bg-stone-200 text-stone-400 border-stone-300 pattern-diagonal-lines cursor-not-allowed';
    default: return 'bg-white border-stone-200';
  }
};

// --- COMPONENTS ---

interface AisleRowProps {
  aisle: Aisle;
  onSelectFace: (aisle: Aisle, position: 'top' | 'bottom') => void;
}

const AisleRow: React.FC<AisleRowProps> = ({ aisle, onSelectFace }) => {
  const getLabel = (face: 'LD' | 'LE') => face === 'LD' ? 'Lado Direito' : 'Lado Esquerdo';

  return (
    <div className="flex flex-col mb-8 relative group">
      {/* HEADER DA RUA */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-3">
          <div className="bg-stone-200 p-1.5 rounded text-stone-600">
            <Footprints size={16} />
          </div>
          <div>
            <span className="block font-bold text-stone-700 text-sm uppercase tracking-wide">{aisle.name}</span>
          </div>
        </div>

        <div className={`flex items-center gap-2 text-xs font-medium text-stone-400 bg-stone-100 px-3 py-1 rounded-full border border-stone-200 ${aisle.direction === '<-' ? 'flex-row-reverse' : ''}`}>
          <span>FLUXO</span>
          {aisle.direction === '->' ? <ArrowRight size={14} /> : <ArrowLeft size={14} />}
        </div>
      </div>

      <div className="flex flex-col gap-2 pl-4 ml-3 border-l-2 border-dashed border-stone-200 hover:border-emerald-300 transition-colors">
        {/* Top Rack */}
        {aisle.top ? (
          <button
            onClick={() => onSelectFace(aisle, 'top')}
            className="h-14 bg-white border border-stone-200 rounded-lg relative hover:bg-emerald-50 hover:border-emerald-400 hover:shadow-md transition-all flex items-center justify-between px-6 shadow-sm group/btn"
          >
            <div className="flex flex-col items-start">
              <span className="font-bold text-stone-700 text-sm group-hover/btn:text-emerald-700">{getLabel(aisle.top.face)}</span>
            </div>
            <div className="flex gap-4 text-xs text-stone-400">
              <span className="flex items-center gap-1"><Layers size={12}/> {aisle.top.levels} Níveis</span>
              <span className="flex items-center gap-1"><LayoutGrid size={12}/> {aisle.top.racks} Prédios</span>
              <ChevronRight size={16} className="text-stone-300 group-hover/btn:text-emerald-500" />
            </div>
          </button>
        ) : (
          <div className="h-14 border border-transparent rounded-lg flex items-center px-6 opacity-30"><span className="text-xs text-stone-300 italic">-- Sem Rack deste lado --</span></div>
        )}

        {/* Bottom Rack */}
        {aisle.bottom ? (
          <button
            onClick={() => onSelectFace(aisle, 'bottom')}
            className="h-14 bg-white border border-stone-200 rounded-lg relative hover:bg-emerald-50 hover:border-emerald-400 hover:shadow-md transition-all flex items-center justify-between px-6 shadow-sm group/btn"
          >
            <div className="flex flex-col items-start">
              <span className="font-bold text-stone-700 text-sm group-hover/btn:text-emerald-700">{getLabel(aisle.bottom.face)}</span>
            </div>
            <div className="flex gap-4 text-xs text-stone-400">
               <span className="flex items-center gap-1"><Layers size={12}/> {aisle.bottom.levels} Níveis</span>
               <span className="flex items-center gap-1"><LayoutGrid size={12}/> {aisle.bottom.racks} Prédios</span>
              <ChevronRight size={16} className="text-stone-300 group-hover/btn:text-emerald-500" />
            </div>
          </button>
        ) : (
          <div className="h-14 border border-transparent rounded-lg flex items-center px-6 opacity-30"><span className="text-xs text-stone-300 italic">-- Sem Rack deste lado --</span></div>
        )}
      </div>
    </div>
  );
};

interface RackViewProps {
  areaName: string;
  areaId: string; // ID da Área para formatação do endereço
  streetId: number;
  face: 'LD' | 'LE';
  config: RackConfig;
  dims: RackDimension;
  onBack: () => void;
}

interface SelectedCell {
  rack: number;
  level: number;
  apt: number;
  status: CellStatus;
}

const RackView: React.FC<RackViewProps> = ({ areaName, areaId, streetId, face, config, dims, onBack }) => {
  // LÓGICA DE PARES/ÍMPARES
  const racks = Array.from({ length: config.racks }, (_, i) => {
    if (face === 'LD') return (i + 1) * 2; // Pares: 2, 4, 6...
    return (i * 2) + 1; // Ímpares: 1, 3, 5...
  });

  const levels = Array.from({ length: config.levels }, (_, i) => config.levels - i);
  const sideLabel = face === 'LD' ? 'Lado Direito' : 'Lado Esquerdo';

  const [selectedCell, setSelectedCell] = useState<SelectedCell | null>(null);

  // Helper para formatar endereço: AR 1 - R 1 - P 2 - N 1 - A 1
  const getFormattedAddress = () => {
    if (!selectedCell) return '';
    // Remove qualquer coisa que não seja número do ID da área (ex: 'area1' vira '1')
    const areaNum = areaId.replace(/\D/g, ''); 
    
    return `AR ${areaNum} - R ${streetId} - P ${selectedCell.rack} - N ${selectedCell.level} - A ${selectedCell.apt}`;
  };

  return (
    <div className="animate-fade-in flex flex-col h-full">
      {/* BREADCRUMBS & HEADER */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-xs font-medium text-stone-400 mb-2">
            <button onClick={onBack} className="hover:text-emerald-600 transition-colors flex items-center gap-1"><Home size={12}/> Início</button>
            <ChevronRight size={12} />
            <span className="truncate max-w-[100px]">{areaName}</span>
            <ChevronRight size={12} />
            <span className="text-emerald-600">Rua {streetId} ({sideLabel})</span>
        </div>
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold text-emerald-950 flex items-center gap-2">
              Rua {streetId} 
              <span className="text-lg font-normal text-stone-400">|</span>
              <span className="text-lg font-normal text-stone-500">{sideLabel}</span>
            </h2>
            <p className="text-sm text-stone-500 mt-1">
              Visualizando apenas prédios <span className="font-bold text-emerald-700">{face === 'LD' ? 'PARES' : 'ÍMPARES'}</span>
            </p>
          </div>
          
          {/* LEGENDA RÁPIDA */}
          <div className="hidden sm:flex gap-3 text-[10px] font-medium bg-white px-3 py-2 rounded-lg border border-stone-200 shadow-sm">
            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Livre</div>
            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-500"></div> Parcial</div>
            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500"></div> Ocupado</div>
            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-stone-300"></div> Bloq.</div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-4 gap-6 items-start">
        {/* GRIDS (ESTANTE) */}
        <div className="lg:col-span-3 bg-stone-100/50 p-1 rounded-xl border border-stone-200 shadow-inner relative overflow-hidden">
            
            {/* Scroll Container com SNAP */}
            <div className="overflow-x-auto pb-4 pt-2 px-2 snap-x snap-mandatory scroll-smooth">
            <div className="min-w-max flex gap-4">
              {racks.map(rack => (
                <div key={rack} className="flex flex-col snap-center group">
                  {/* Label Prédio */}
                  <div className="text-center text-xs font-bold text-stone-400 mb-1 group-hover:text-emerald-600 transition-colors">P-{rack}</div>
                  
                  {/* Estrutura Prédio */}
                  <div className="border-x-2 border-t-2 border-stone-300 bg-stone-200/50 p-1 flex flex-col gap-1 rounded-t shadow-sm relative">
                    {levels.map(level => (
                      <div key={level} className="flex gap-1">
                        {Array.from({ length: config.apts }, (_, i) => i + 1).map(apt => {
                          const status = getMockStatus(rack, level, apt);
                          const isSelected = selectedCell?.rack === rack && selectedCell?.level === level && selectedCell?.apt === apt;
                          
                          return (
                            <button
                              key={`${rack}-${level}-${apt}`}
                              onClick={() => setSelectedCell({ rack, level, apt, status })}
                              className={`
                                w-7 h-7 sm:w-9 sm:h-9 border rounded text-[10px] flex items-center justify-center transition-all relative
                                ${getStatusColor(status, isSelected)}
                              `}
                              title={`P${rack}-N${level}-A${apt} (${status})`}
                            >
                              {apt}
                              {/* Indicador sutil de seleção */}
                              {isSelected && <div className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-600 rounded-full border border-white"></div>}
                            </button>
                          );
                        })}
                      </div>
                    ))}
                  </div>

                  {/* Pé do Rack (Visual de Chão/Estrada) */}
                  <div className="h-4 bg-stone-300 border-x-2 border-stone-400 flex justify-between px-1 relative overflow-hidden">
                     {/* Listras de segurança */}
                     <div className="absolute inset-0 opacity-10 bg-[repeating-linear-gradient(45deg,transparent,transparent_5px,#000_5px,#000_10px)]"></div>
                  </div>
                  
                  {/* Visual de Pista */}
                  <div className="h-6 w-full bg-stone-800 mt-0 flex items-center justify-center relative overflow-hidden rounded-b-lg opacity-80">
                      <div className="w-full h-[1px] bg-stone-500 border-t border-dashed border-stone-400"></div>
                      <span className="absolute text-[8px] text-stone-500 bottom-0.5 right-1 font-mono">
                          {face === 'LD' ? 'R' : 'L'}
                      </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-stone-400 py-2 italic text-center flex items-center justify-center gap-2">
             <ArrowLeft size={12}/> Deslize para navegar pelos prédios <ArrowRight size={12}/>
          </p>
        </div>

        {/* SIDEBAR DETALHES */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-stone-200 p-0 rounded-xl shadow-lg sticky top-6 overflow-hidden">
            <div className="bg-emerald-900 text-white p-4">
                 <h3 className="font-bold flex items-center gap-2 text-emerald-100">
                <Info size={18} /> Detalhes da Posição
                </h3>
            </div>

            {selectedCell ? (
              <div className="p-5 space-y-5">
                {/* Endereço Principal Formatado */}
                <div>
                    <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">Endereço Completo</span>
                    <div className="mt-2 bg-stone-50 border border-stone-200 p-3 rounded-lg text-center shadow-inner">
                        <span className="text-lg sm:text-xl font-mono font-bold text-emerald-900 block tracking-tight">
                            {getFormattedAddress()}
                        </span>
                    </div>
                </div>

                {/* Status Badge */}
                <div className={`
                    p-3 rounded-lg border flex items-center gap-3
                    ${selectedCell.status === 'LIVRE' ? 'bg-emerald-50 border-emerald-200' : ''}
                    ${selectedCell.status === 'OCUPADO' ? 'bg-red-50 border-red-200' : ''}
                    ${selectedCell.status === 'PARCIAL' ? 'bg-amber-50 border-amber-200' : ''}
                    ${selectedCell.status === 'BLOQUEADO' ? 'bg-stone-100 border-stone-200' : ''}
                `}>
                    {selectedCell.status === 'LIVRE' && <CheckCircle2 className="text-emerald-600" />}
                    {selectedCell.status === 'OCUPADO' && <XCircle className="text-red-600" />}
                    {selectedCell.status === 'PARCIAL' && <AlertCircle className="text-amber-600" />}
                    {selectedCell.status === 'BLOQUEADO' && <Ban className="text-stone-500" />}
                    
                    <div>
                        <span className="block text-xs font-bold opacity-60 uppercase">Status Atual</span>
                        <span className="font-bold text-stone-800">{selectedCell.status}</span>
                    </div>
                </div>

                {/* Grid de Infos Técnicas */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="bg-stone-50 p-2.5 rounded border border-stone-100">
                    <span className="block text-[10px] text-stone-400 uppercase font-bold">Dimensão</span>
                    <span className="font-mono text-xs font-medium text-stone-700">{dims.h}x{dims.w}x{dims.d}m</span>
                  </div>
                   <div className="bg-stone-50 p-2.5 rounded border border-stone-100">
                    <span className="block text-[10px] text-stone-400 uppercase font-bold">Tipo Rack</span>
                    <span className="font-mono text-xs font-medium text-stone-700">Padrão</span>
                  </div>
                </div>

                {/* Capacidade */}
                <div className="border-t border-stone-100 pt-4">
                  <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-semibold text-stone-500">Capacidade de Peso</span>
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">{dims.weight}kg MAX</span>
                  </div>
                  <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${selectedCell.status === 'LIVRE' ? 'bg-emerald-400 w-0' : 'bg-emerald-500 w-3/4'}`}
                      ></div>
                  </div>
                  <p className="text-[10px] text-stone-400 mt-1 text-right">
                      {selectedCell.status === 'LIVRE' ? '0kg utilizado' : 'Aprox. 75% utilizado'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 px-6 text-stone-400">
                <Box size={48} className="mx-auto mb-4 opacity-20" />
                <p className="text-sm">Toque em um apartamento na estante para ver detalhes técnicos, status e conteúdo.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

interface SelectedContext {
  areaName: string;
  areaId: string;
  streetId: number;
  face: 'LD' | 'LE';
  config: RackConfig;
  dims: RackDimension;
}

export default function App() {
  const [activeAreaId, setActiveAreaId] = useState<string>('area1');
  const [viewMode, setViewMode] = useState<'map' | 'rack'>('map');
  const [selectedContext, setSelectedContext] = useState<SelectedContext | null>(null);

  const activeArea = WAREHOUSE_DATA.areas.find(a => a.id === activeAreaId);

  const handleSelectFace = (aisle: Aisle, position: 'top' | 'bottom') => {
    const data = position === 'top' ? aisle.top : aisle.bottom;

    if (data && activeArea) {
      setSelectedContext({
        areaName: activeArea.name,
        areaId: activeArea.id, // ID da Área passado aqui
        streetId: data.rua,
        face: data.face,
        config: data,
        dims: data.dims
      });
      setViewMode('rack');
    }
  };

  const handleBackToMap = () => {
    setViewMode('map');
    setSelectedContext(null);
  };

  if (!activeArea) return <div>Área não encontrada</div>;

  return (
    <div className="min-h-screen bg-stone-100 font-sans text-stone-900 pb-10">
      {/* Header */}
      <header className="bg-emerald-900 text-white shadow-lg border-b border-emerald-800 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-lg flex items-center justify-center overflow-hidden shadow-inner shrink-0">
              <img src="/eletro_farias.png" alt="Girar" />
            </div>
            <div>
              <h1 className="font-bold text-lg sm:text-xl leading-tight text-emerald-50 tracking-tight">Eletro Farias</h1>
              <p className="text-[10px] sm:text-xs text-emerald-300/80 font-medium uppercase tracking-wider">WMS • Gestão de Estoque</p>
            </div>
          </div>

          <div className="hidden sm:flex flex-col sm:flex-row gap-2 sm:gap-6 text-xs sm:text-sm text-emerald-200/80">
            <div className="flex items-center gap-2"><Home size={16} className="text-emerald-400" /> {WAREHOUSE_DATA.areas.length} Áreas</div>
            <div className="flex items-center gap-2"><Database size={16} className="text-emerald-400" /> v1.2 Beta</div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">

        {/* Area Tabs (Só mostra no mapa) */}
        {viewMode === 'map' && (
             <div className="flex overflow-x-auto gap-2 mb-8 pb-2 border-b border-stone-200 no-scrollbar">
             {WAREHOUSE_DATA.areas.map(area => (
               <button
                 key={area.id}
                 onClick={() => { setActiveAreaId(area.id); setViewMode('map'); }}
                 className={`
                   px-5 py-2.5 rounded-t-lg font-medium transition-colors whitespace-nowrap border-t border-x text-sm sm:text-base
                   ${activeAreaId === area.id
                     ? 'bg-white text-emerald-800 border-stone-200 border-b-white shadow-[0_-2px_4px_rgba(0,0,0,0.02)] -mb-px z-10 font-bold'
                     : 'text-stone-500 bg-stone-50 border-transparent hover:text-emerald-700 hover:bg-emerald-50/50'}
                 `}
               >
                 {area.name}
               </button>
             ))}
           </div>
        )}

        {/* View Container */}
        {viewMode === 'map' ? (
          <div className="animate-fade-in">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-emerald-950">{activeArea.name}</h2>
              <p className="text-stone-500 text-sm">{activeArea.description} - Visão Geral da Planta</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main List */}
              <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-stone-200">
                <div className="flex items-center justify-between mb-8 pb-4 border-b border-stone-100">
                  <h3 className="font-bold text-emerald-900 flex items-center gap-2">
                    <Map size={20} className="text-emerald-600" /> Layout dos Corredores
                  </h3>
                  <div className="hidden sm:flex gap-3 text-[10px] text-stone-500 font-mono">
                    <span className="flex items-center gap-1"><div className="w-3 h-3 bg-white border border-stone-300 rounded-sm"></div> DISPONÍVEL</span>
                    <span className="flex items-center gap-1"><div className="w-3 h-3 border border-stone-200 bg-stone-100 text-stone-300 flex items-center justify-center text-[8px]">x</div> VAZIO</span>
                  </div>
                </div>

                {/* Render Aisles */}
                <div className="pl-2 sm:pl-6 border-l-2 border-dashed border-stone-200 sm:ml-4">
                  {activeArea.aisles.map(aisle => (
                    <AisleRow
                      key={aisle.id}
                      aisle={aisle}
                      onSelectFace={handleSelectFace}
                    />
                  ))}
                </div>
              </div>

              {/* Legend / Stats */}
              <div className="space-y-6">
                <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-xl">
                  <h3 className="font-bold text-emerald-900 mb-4 text-sm uppercase tracking-wide">Como Navegar</h3>
                  <p className="text-xs text-stone-600 mb-4 leading-relaxed">
                    Selecione um lado do corredor para visualizar a estante frontalmente. O sistema divide automaticamente entre prédios <strong className="text-emerald-700">Pares (Direita)</strong> e <strong className="text-emerald-700">Ímpares (Esquerda)</strong>.
                  </p>
                  
                  <div className="space-y-2 bg-white p-3 rounded-lg border border-emerald-100/50">
                    <div className="flex items-center gap-3">
                      <div className="h-6 w-12 bg-stone-800 rounded flex items-center justify-center text-[10px] text-emerald-400 font-mono">{'->'}</div>
                      <span className="text-xs text-stone-600">Sentido Obrigatório</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-stone-200">
                  <h3 className="font-bold text-stone-700 mb-4 text-sm">Resumo da Área</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-stone-50 rounded-lg text-center border border-stone-100">
                      <div className="text-xl font-bold text-emerald-700">{activeArea.aisles.length}</div>
                      <div className="text-[10px] text-stone-400 uppercase font-bold tracking-wide">Corredores</div>
                    </div>
                    <div className="p-3 bg-stone-50 rounded-lg text-center border border-stone-100">
                      <div className="text-xl font-bold text-emerald-700">
                        {activeArea.aisles.reduce((acc, a) => acc + (a.top?.racks || 0) + (a.bottom?.racks || 0), 0)}
                      </div>
                      <div className="text-[10px] text-stone-400 uppercase font-bold tracking-wide">Total Prédios</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          selectedContext ? (
            <RackView
              areaName={selectedContext.areaName}
              areaId={selectedContext.areaId}
              streetId={selectedContext.streetId}
              face={selectedContext.face}
              config={selectedContext.config}
              dims={selectedContext.dims}
              onBack={handleBackToMap}
            />
          ) : <div>Erro ao carregar estante</div>
        )}
      </main>
    </div>
  );
}
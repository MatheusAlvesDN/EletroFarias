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
  Footprints
} from 'lucide-react';

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

// --- MOCK DATA BASED ON USER CSV FILES ---
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
          // EXCEÇÃO: Apenas Lado Direito (LD)
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
          // EXCEÇÃO: Apenas Lado Esquerdo (LE)
          top: null,
          bottom: { rua: 6, face: 'LE', racks: 11, levels: 6, apts: 8, dims: { h: 0.21, d: 0.6, w: 0.21, weight: 25 } }
        }
      ]
    },
    {
      id: 'area2',
      name: 'Área 2 - ou B',
      description: 'Expansão Lateral',
      aisles: [
        {
          id: 1,
          name: 'Rua 1',
          direction: '->',
          // EXCEÇÃO: Apenas Lado Esquerdo (LE)
          top: { rua: 1, face: 'LE', racks: 11, levels: 4, apts: 5, dims: { h: 0.4, d: 0.5, w: 0.5, weight: 50 } },
          bottom: null
        },
        {
          id: 2,
          name: 'Rua 2',
          direction: '<-',
          top: { rua: 2, face: 'LE', racks: 11, levels: 4, apts: 5, dims: { h: 0.4, d: 0.5, w: 0.5, weight: 50 } },
          bottom: { rua: 2, face: 'LD', racks: 11, levels: 4, apts: 5, dims: { h: 0.4, d: 0.5, w: 0.5, weight: 50 } }
        },
        {
          id: 3,
          name: 'Rua 3',
          direction: '->',
          top: { rua: 3, face: 'LE', racks: 11, levels: 4, apts: 5, dims: { h: 0.4, d: 0.5, w: 0.5, weight: 50 } },
          bottom: { rua: 3, face: 'LD', racks: 11, levels: 4, apts: 5, dims: { h: 0.4, d: 0.5, w: 0.5, weight: 50 } }
        },
        {
          id: 4,
          name: 'Rua 4',
          direction: '<-',
          // EXCEÇÃO: Apenas Lado Direito (LD)
          top: null,
          bottom: { rua: 4, face: 'LD', racks: 11, levels: 4, apts: 5, dims: { h: 0.4, d: 0.5, w: 0.5, weight: 50 } }
        },
      ]
    },
    {
      id: 'area3',
      name: 'Área 3 - ou C',
      description: 'Tubulações e Especial',
      aisles: [
        {
          id: 1,
          name: 'Rua 1',
          direction: '->',
          top: { rua: 1, face: 'LD', racks: 8, levels: 3, apts: 4, dims: { h: 0.5, d: 0.8, w: 0.5, weight: 80 } },
          bottom: { rua: 2, face: 'LE', racks: 8, levels: 3, apts: 4, dims: { h: 0.5, d: 0.8, w: 0.5, weight: 80 } }
        }
      ]
    }
  ]
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

        {/* Indicador de Fluxo */}
        <div className={`flex items-center gap-2 text-xs font-medium text-stone-400 bg-stone-100 px-3 py-1 rounded-full border border-stone-200 ${aisle.direction === '<-' ? 'flex-row-reverse' : ''}`}>
          <span>FLUXO</span>
          {aisle.direction === '->' ? <ArrowRight size={14} /> : <ArrowLeft size={14} />}
        </div>
      </div>

      {/* RACKS GROUP */}
      <div className="flex flex-col gap-2 pl-4 ml-3 border-l-2 border-dashed border-stone-200 hover:border-emerald-300 transition-colors">

        {/* Top Rack (Condicional) */}
        {aisle.top ? (
          <button
            onClick={() => onSelectFace(aisle, 'top')}
            className="
              h-14 bg-white border border-stone-200 rounded-lg relative 
              hover:bg-emerald-50 hover:border-emerald-400 hover:shadow-md transition-all flex items-center justify-between px-6
              shadow-sm group/btn
            "
          >
            <div className="flex flex-col items-start">
              <span className="font-bold text-stone-700 text-sm group-hover/btn:text-emerald-700">
                {getLabel(aisle.top.face)}
              </span>
            </div>
            <div className="flex gap-4 text-xs text-stone-400">
              <span>{aisle.top.racks} Prédios</span>
              <ChevronRight size={16} className="text-stone-300 group-hover/btn:text-emerald-500" />
            </div>
          </button>
        ) : (
          <div className="h-14 border border-transparent rounded-lg flex items-center px-6 opacity-30">
            <span className="text-xs text-stone-300 italic">-- Sem Rack deste lado --</span>
          </div>
        )}

        {/* Bottom Rack (Condicional) */}
        {aisle.bottom ? (
          <button
            onClick={() => onSelectFace(aisle, 'bottom')}
            className="
              h-14 bg-white border border-stone-200 rounded-lg relative 
              hover:bg-emerald-50 hover:border-emerald-400 hover:shadow-md transition-all flex items-center justify-between px-6
              shadow-sm group/btn
            "
          >
            <div className="flex flex-col items-start">
              <span className="font-bold text-stone-700 text-sm group-hover/btn:text-emerald-700">
                {getLabel(aisle.bottom.face)}
              </span>
            </div>
            <div className="flex gap-4 text-xs text-stone-400">
              <span>{aisle.bottom.racks} Prédios</span>
              <ChevronRight size={16} className="text-stone-300 group-hover/btn:text-emerald-500" />
            </div>
          </button>
        ) : (
          <div className="h-14 border border-transparent rounded-lg flex items-center px-6 opacity-30">
            <span className="text-xs text-stone-300 italic">-- Sem Rack deste lado --</span>
          </div>
        )}
      </div>

    </div>
  );
};

interface RackViewProps {
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
}

const RackView: React.FC<RackViewProps> = ({ streetId, face, config, dims, onBack }) => {
  const racks = Array.from({ length: config.racks }, (_, i) => i + 1);
  const levels = Array.from({ length: config.levels }, (_, i) => config.levels - i);
  const sideLabel = face === 'LD' ? 'Lado Direito' : 'Lado Esquerdo';

  const [selectedCell, setSelectedCell] = useState<SelectedCell | null>(null);

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          className="flex items-center text-stone-600 hover:text-emerald-700 font-medium transition-colors"
        >
          <ChevronRight className="rotate-180 mr-1" /> Voltar para Mapa
        </button>
        <div className="text-right">
          <h2 className="text-xl font-bold text-emerald-900">Rua {streetId} - {sideLabel}</h2>
          <p className="text-sm text-stone-500">Vista Frontal da Estante</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 overflow-x-auto bg-white p-4 rounded-xl border border-stone-200 shadow-sm">
          <div className="min-w-max">
            <div className="flex gap-4 pb-2">
              {racks.map(rack => (
                <div key={rack} className="flex flex-col">
                  <div className="text-center text-xs font-bold text-stone-400 mb-1">Prédio {rack}</div>
                  <div className="border-x border-t border-stone-300 bg-stone-50 p-1 flex flex-col gap-1">
                    {levels.map(level => (
                      <div key={level} className="flex gap-1">
                        {Array.from({ length: config.apts }, (_, i) => i + 1).map(apt => (
                          <div
                            key={`${rack}-${level}-${apt}`}
                            onClick={() => setSelectedCell({ rack, level, apt })}
                            className={`
                               w-6 h-6 sm:w-8 sm:h-8 border rounded text-[10px] flex items-center justify-center cursor-pointer transition-colors
                               ${selectedCell?.rack === rack && selectedCell?.level === level && selectedCell?.apt === apt
                                ? 'bg-emerald-600 text-white border-emerald-700'
                                : 'bg-white border-stone-300 text-stone-400 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-600'}
                             `}
                            title={`P${rack}-N${level}-A${apt}`}
                          >
                            {apt}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between px-1">
                    <div className="w-1 h-3 bg-stone-400"></div>
                    <div className="w-1 h-3 bg-stone-400"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-stone-400 mt-2 italic text-center">Role horizontalmente para ver todos os prédios</p>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-emerald-900 text-white p-6 rounded-xl shadow-lg sticky top-6">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-emerald-100">
              <Info size={18} /> Detalhes
            </h3>

            {selectedCell ? (
              <div className="space-y-4">
                <div className="bg-emerald-800 p-4 rounded-lg border border-emerald-700">
                  <span className="block text-xs uppercase tracking-wider text-emerald-300/80">Endereço Completo</span>
                  <span className="text-2xl font-mono text-white">
                    R{streetId}-{face}-P{String(selectedCell.rack).padStart(2, '0')}-N{String(selectedCell.level).padStart(2, '0')}-A{String(selectedCell.apt).padStart(2, '0')}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-emerald-800/50 p-3 rounded border border-emerald-700/50">
                    <span className="block text-xs text-emerald-300">Prédio</span>
                    <span className="font-bold">{selectedCell.rack}</span>
                  </div>
                  <div className="bg-emerald-800/50 p-3 rounded border border-emerald-700/50">
                    <span className="block text-xs text-emerald-300">Nível</span>
                    <span className="font-bold">{selectedCell.level}</span>
                  </div>
                  <div className="bg-emerald-800/50 p-3 rounded border border-emerald-700/50">
                    <span className="block text-xs text-emerald-300">Apt.</span>
                    <span className="font-bold">{selectedCell.apt}</span>
                  </div>
                  <div className="bg-emerald-800/50 p-3 rounded border border-emerald-700/50">
                    <span className="block text-xs text-emerald-300">Dimensão</span>
                    <span className="font-bold text-xs truncate">{dims.h}x{dims.w}x{dims.d}m</span>
                  </div>
                </div>

                <div className="border-t border-emerald-700 pt-4 mt-2">
                  <h4 className="text-sm font-semibold mb-2 text-emerald-200">Capacidade</h4>
                  <div className="flex items-center gap-2 text-yellow-300">
                    <Package size={20} />
                    <span className="font-bold text-lg">{dims.weight} Kg</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-emerald-400/50">
                <Box size={48} className="mx-auto mb-3" />
                <p>Selecione um apartamento na grade para ver os detalhes técnicos.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

interface SelectedContext {
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

    if (data) {
      setSelectedContext({
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
    <div className="min-h-screen bg-stone-100 font-sans text-stone-900">
      {/* Header */}
      <header className="bg-emerald-900 text-white shadow-lg border-b border-emerald-800">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-lg flex items-center justify-center overflow-hidden shadow-inner shrink-0">
              <img src="/eletro_farias.png" alt="Girar" />
            </div>
            <div>
              <h1 className="font-bold text-xl leading-tight text-emerald-50 tracking-tight">Eletro Farias</h1>
              <p className="text-xs text-emerald-300/80 font-medium">Gestão de Estoque</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:gap-6 text-xs sm:text-sm text-emerald-200/80">
            <div className="flex items-center gap-2"><Home size={16} className="text-emerald-400" /> {WAREHOUSE_DATA.areas.length} Áreas</div>
            <div className="flex items-center gap-2"><Database size={16} className="text-emerald-400" /> Base Atualizada</div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">

        {/* Area Tabs */}
        <div className="flex overflow-x-auto gap-2 mb-8 pb-2 border-b border-stone-200">
          {WAREHOUSE_DATA.areas.map(area => (
            <button
              key={area.id}
              onClick={() => { setActiveAreaId(area.id); setViewMode('map'); }}
              className={`
                px-6 py-3 rounded-t-lg font-medium transition-colors whitespace-nowrap border-t border-x
                ${activeAreaId === area.id
                  ? 'bg-white text-emerald-800 border-stone-200 border-b-white shadow-[0_-2px_4px_rgba(0,0,0,0.02)] -mb-px z-10'
                  : 'text-stone-500 bg-stone-50 border-transparent hover:text-emerald-700 hover:bg-emerald-50/50'}
              `}
            >
              {area.name}
            </button>
          ))}
        </div>

        {/* View Container */}
        {viewMode === 'map' ? (
          <div className="animate-fade-in">
            <div className="mb-6 flex items-end justify-between">
              <div>
                <h2 className="text-2xl font-bold text-emerald-950">{activeArea.name}</h2>
                <p className="text-stone-500">{activeArea.description} - Planta Baixa</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main List */}
              <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-stone-200">
                <div className="flex items-center justify-between mb-8 pb-4 border-b border-stone-100">
                  <h3 className="font-bold text-emerald-900 flex items-center gap-2">
                    <Map size={20} className="text-emerald-600" /> Layout dos Corredores
                  </h3>
                  <div className="flex gap-2 text-[10px] text-stone-500 font-mono">
                    <span className="flex items-center gap-1"><div className="w-3 h-3 bg-stone-100 border border-stone-300"></div> LADOS</span>
                    <span className="flex items-center gap-1"><div className="w-3 h-3 bg-stone-800"></div> CORREDOR</span>
                  </div>
                </div>

                {/* Render Aisles */}
                <div className="pl-6 border-l-2 border-dashed border-stone-200 ml-4">
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
                  <h3 className="font-bold text-emerald-900 mb-4">Entenda o Mapa</h3>
                  <p className="text-sm text-stone-600 mb-4">
                    O armazém é organizado por <strong>Corredores Compartilhados</strong>. Ao entrar em um corredor, você tem acesso a duas faces (lados) diferentes.
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-20 bg-stone-100 border-2 border-stone-300 border-b-0 rounded-t flex items-center justify-center text-[10px] font-bold text-stone-500">Lado Direito</div>
                      <span className="text-sm text-stone-600">Lado Direito da Rua</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="h-6 w-12 bg-stone-800 rounded flex items-center justify-center text-[10px] text-emerald-400">{'->'}</div>
                      <span className="text-sm text-stone-600">Sentido do Fluxo</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-20 bg-stone-100 border-2 border-stone-300 border-t-0 rounded-b flex items-center justify-center text-[10px] font-bold text-stone-500">Lado Esquerdo</div>
                      <span className="text-sm text-stone-600">Lado Esquerdo da Rua</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-stone-200">
                  <h3 className="font-bold text-stone-700 mb-4">Resumo da Área</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-stone-50 rounded-lg text-center border border-stone-100">
                      <div className="text-2xl font-bold text-emerald-700">{activeArea.aisles.length}</div>
                      <div className="text-[10px] text-stone-400 uppercase font-bold tracking-wide">Corredores</div>
                    </div>
                    <div className="p-4 bg-stone-50 rounded-lg text-center border border-stone-100">
                      <div className="text-2xl font-bold text-emerald-700">
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
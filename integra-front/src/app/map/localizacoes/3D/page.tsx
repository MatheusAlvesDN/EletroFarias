'use client';

import React, { useState, useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { 
  PointerLockControls, 
  Text, 
  Html, 
  Environment, 
  KeyboardControls,
  useKeyboardControls
} from '@react-three/drei';
import * as THREE from 'three';
import {
  Info,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Ban,
  Move3d,
  Keyboard,
  MousePointer2,
  Maximize
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

const getMockStatus = (rack: number, level: number, apt: number): CellStatus => {
  const hash = (rack * 7 + level * 3 + apt) % 10;
  if (hash === 0) return 'BLOQUEADO';
  if (hash < 4) return 'OCUPADO';
  if (hash < 7) return 'PARCIAL';
  return 'LIVRE';
};

const getStatusMaterialColor = (status: CellStatus, isSelected: boolean) => {
  if (isSelected) return '#10b981'; 
  switch (status) {
    case 'LIVRE': return '#065f46';
    case 'OCUPADO': return '#991b1b';
    case 'PARCIAL': return '#92400e';
    case 'BLOQUEADO': return '#44403c';
    default: return '#525252';
  }
};

const getStatusBorderColor = (status: CellStatus, isSelected: boolean) => {
    if (isSelected) return '#ffffff';
    switch (status) {
      case 'LIVRE': return '#34d399'; 
      case 'OCUPADO': return '#f87171'; 
      case 'PARCIAL': return '#fbbf24'; 
      case 'BLOQUEADO': return '#a8a29e'; 
      default: return '#737373';
    }
  };

// --- 3D COMPONENTS ---

// Componente para Paredes e Teto
const WarehouseShell = ({ width, depth, height = 8 }: { width: number, depth: number, height?: number }) => {
    // Calculando centro
    const centerX = width / 2 - 4; // Ajuste fino baseado no espaçamento de corredores
    const centerZ = -15; // Centro da rua definido nos outros componentes
    
    return (
        <group>
            {/* Parede Esquerda */}
            <mesh position={[-6, height/2, centerZ]} receiveShadow>
                <boxGeometry args={[1, height, depth]} />
                <meshStandardMaterial color="#262626" roughness={0.8} />
            </mesh>
            
            {/* Parede Direita */}
            <mesh position={[width, height/2, centerZ]} receiveShadow>
                <boxGeometry args={[1, height, depth]} />
                <meshStandardMaterial color="#262626" roughness={0.8} />
            </mesh>
            
            {/* Parede Fundo */}
            <mesh position={[centerX, height/2, centerZ - depth/2]} receiveShadow>
                <boxGeometry args={[width + 8, height, 1]} />
                <meshStandardMaterial color="#171717" roughness={0.9} />
            </mesh>
            
            {/* Parede Frente (com abertura virtual) */}
            <mesh position={[centerX, height/2, centerZ + depth/2]} receiveShadow>
                <boxGeometry args={[width + 8, height, 1]} />
                <meshStandardMaterial color="#171717" roughness={0.9} />
            </mesh>

            {/* Teto */}
            <mesh position={[centerX, height, centerZ]} receiveShadow>
                <boxGeometry args={[width + 8, 0.5, depth]} />
                <meshStandardMaterial color="#404040" roughness={0.5} metalness={0.5} />
            </mesh>

            {/* Luminárias Industriais */}
            {Array.from({ length: 4 }).map((_, i) => (
                <group key={i} position={[centerX, height - 0.5, centerZ - depth/2 + 10 + (i * 10)]}>
                     <mesh rotation={[0, 0, Math.PI/2]}>
                        <cylinderGeometry args={[0.2, 0.2, width, 8]} />
                        <meshBasicMaterial color="#ffffff" />
                     </mesh>
                     {/* Luz da luminária */}
                     <pointLight intensity={0.5} distance={15} decay={2} color="#ffffff" />
                </group>
            ))}
            
            {/* Chão Geral (base preta para evitar vácuo) */}
             <mesh position={[centerX, -0.1, centerZ]} rotation={[-Math.PI/2, 0, 0]}>
                <planeGeometry args={[width + 20, depth + 20]} />
                <meshBasicMaterial color="#0a0a0a" />
            </mesh>
        </group>
    );
};

const Cell3D: React.FC<Cell3DProps> = React.memo(({ position, dims, status, rackId, levelId, aptId, isSelected, onSelect }) => {
  const [hovered, setHovered] = useState(false);
  const color = getStatusMaterialColor(status, isSelected);
  const borderColor = getStatusBorderColor(status, isSelected);
  const scale = hovered || isSelected ? 0.96 : 0.92;
  const opacity = status === 'LIVRE' ? 0.3 : 0.9;
  
  return (
    <group position={position}>
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          onSelect({ rackId, levelId, aptId, status });
        }}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <boxGeometry args={[dims.w * scale, dims.h * scale, dims.d * scale]} />
        <meshStandardMaterial 
            color={hovered ? '#34d399' : color} 
            transparent 
            opacity={hovered ? 0.8 : opacity}
            roughness={0.2}
            metalness={0.1}
        />
        {(hovered || isSelected) && (
            <lineSegments>
                <edgesGeometry args={[new THREE.BoxGeometry(dims.w * scale, dims.h * scale, dims.d * scale)]} />
                <lineBasicMaterial color={borderColor} opacity={1} transparent />
            </lineSegments>
        )}
      </mesh>
      {(hovered || isSelected) && (
        <Html position={[0, 0, dims.d/2]} center transform sprite zIndexRange={[100, 0]}>
            <div className={`
                text-[8px] font-bold px-1.5 py-0.5 rounded pointer-events-none select-none whitespace-nowrap border
                ${isSelected ? 'bg-emerald-600 text-white border-white' : 'bg-black/80 text-white border-stone-500'}
            `}>
                P{rackId} N{levelId} A{aptId}
            </div>
        </Html>
      )}
    </group>
  );
});

interface RackStack3DProps {
  config: RackConfig;
  position: [number, number, number];
  rotation: [number, number, number];
  onCellSelect: (data: any) => void;
  selectedCell: any;
}

const RackStack3D: React.FC<RackStack3DProps> = ({ config, position, rotation, onCellSelect, selectedCell }) => {
  const cells = [];
  const { racks, levels, apts, dims } = config;
  const RACK_GAP = 0.2; 
  const RACK_WIDTH = apts * dims.w; 
  const totalRowLength = (racks * RACK_WIDTH) + ((racks - 1) * RACK_GAP);

  for (let r = 0; r < racks; r++) {
    const rackRealId = config.face === 'LD' ? (r + 1) * 2 : (r * 2) + 1;
    const rackStartX = (r * (RACK_WIDTH + RACK_GAP));

    for (let l = 0; l < levels; l++) {
      const levelRealId = l + 1;
      const y = (l * dims.h) + (dims.h / 2);

      for (let a = 0; a < apts; a++) {
        const aptRealId = a + 1;
        const status = getMockStatus(rackRealId, levelRealId, aptRealId);
        const isSelected = selectedCell && selectedCell.rack === rackRealId && selectedCell.level === levelRealId && selectedCell.apt === aptRealId;
        const x = rackStartX + (a * dims.w) + (dims.w / 2) - (totalRowLength / 2);
        cells.push(
          <Cell3D
            key={`${rackRealId}-${levelRealId}-${aptRealId}`}
            position={[x, y, 0]}
            dims={dims}
            status={status}
            rackId={rackRealId}
            levelId={levelRealId}
            aptId={aptRealId}
            isSelected={isSelected}
            onSelect={(data) => onCellSelect({ ...data, config })}
          />
        );
      }
    }
    const labelX = rackStartX + (RACK_WIDTH / 2) - (totalRowLength / 2);
    cells.push(
        <Text
            key={`label-${rackRealId}`}
            position={[labelX, 0.01, (dims.d/2) + 0.6]}
            rotation={[-Math.PI / 2, 0, 0]}
            fontSize={0.4}
            color="#4ade80" 
            anchorX="center"
            anchorY="middle"
        >
            P-{rackRealId}
        </Text>
    );
  }
  return <group position={position} rotation={rotation}>{cells}</group>;
};

interface WarehouseSceneProps {
    area: Area;
    onCellSelect: (data: any) => void;
    selectedCell: any;
}

const WarehouseScene: React.FC<WarehouseSceneProps> = ({ area, onCellSelect, selectedCell }) => {
    const AISLE_SPACING = 8; 

    // Calcula largura total da cena para passar pro Shell
    const totalWidth = area.aisles.length * AISLE_SPACING;

    return (
        <group>
            <WarehouseShell width={totalWidth} depth={40} />

            {area.aisles.map((aisle, index) => {
                const aisleX = index * AISLE_SPACING;
                
                return (
                    <group key={aisle.id} position={[aisleX, 0, 0]}>
                        {/* Chão da Rua */}
                        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, -15]} receiveShadow>
                            <planeGeometry args={[4, 40]} />
                            <meshStandardMaterial color="#1c1917" roughness={0.9} />
                        </mesh>
                        
                        {/* TRILHOS NO CHÃO (VISUAL) */}
                        {/* Trilho Esquerdo */}
                        <mesh rotation={[Math.PI / 2, 0, 0]} position={[-1.8, 0.02, -15]}>
                            <cylinderGeometry args={[0.05, 0.05, 40, 8]} />
                            <meshStandardMaterial color="#f59e0b" metalness={0.8} roughness={0.2} />
                        </mesh>
                        {/* Trilho Direito */}
                        <mesh rotation={[Math.PI / 2, 0, 0]} position={[1.8, 0.02, -15]}>
                            <cylinderGeometry args={[0.05, 0.05, 40, 8]} />
                            <meshStandardMaterial color="#f59e0b" metalness={0.8} roughness={0.2} />
                        </mesh>

                        {/* Linhas de Marcação Transversais */}
                        {Array.from({length: 10}).map((_, i) => (
                             <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, -34 + (i * 4)]}>
                                <planeGeometry args={[3.8, 0.1]} />
                                <meshBasicMaterial color="#333" />
                             </mesh>
                        ))}

                        <Text
                            position={[0, 3, 4]} 
                            rotation={[0, Math.PI, 0]} 
                            fontSize={1}
                            color="#34d399"
                            anchorX="center"
                            anchorY="middle"
                            outlineWidth={0.05}
                            outlineColor="#000000"
                        >
                            {aisle.name}
                        </Text>
                        
                        {aisle.top && <RackStack3D config={aisle.top} position={[2.5, 0, -15]} rotation={[0, -Math.PI / 2, 0]} onCellSelect={onCellSelect} selectedCell={selectedCell} />}
                        {aisle.bottom && <RackStack3D config={aisle.bottom} position={[-2.5, 0, -15]} rotation={[0, Math.PI / 2, 0]} onCellSelect={onCellSelect} selectedCell={selectedCell} />}
                    </group>
                );
            })}
        </group>
    );
};

// --- CONTROLS SYSTEM ---

const Controls = ({ aislesCount }: { aislesCount: number }) => {
  const [, get] = useKeyboardControls();
  const { camera } = useThree();
  const walkSpeed = 10;
  
  // Parâmetros de Colisão / "Trilhos"
  const AISLE_SPACING = 8;
  const AISLE_WIDTH_LIMIT = 1.6; // Metade da largura caminhável do corredor
  const MIN_Z = -34; // Fundo do corredor
  const MAX_Z = 4; // Frente do corredor
  const CROSS_DOCK_Z = 4; // Z onde é permitido trocar de corredor

  useFrame((state, delta) => {
    const { forward, backward, left, right } = get();
    
    // Vetor de direção desejado
    const direction = new THREE.Vector3();
    const frontVector = new THREE.Vector3(0, 0, Number(backward) - Number(forward));
    const sideVector = new THREE.Vector3(Number(left) - Number(right), 0, 0);

    direction
      .subVectors(frontVector, sideVector)
      .normalize()
      .multiplyScalar(walkSpeed * delta)
      .applyEuler(camera.rotation);

    // Nova posição candidata
    const nextX = camera.position.x + direction.x;
    const nextZ = camera.position.z + direction.z;

    // LÓGICA DE TRILHOS / COLISÃO
    // 1. Permitir movimento livre na área de Cross-Dock (Frente dos corredores)
    if (nextZ > CROSS_DOCK_Z - 1) {
        // Área livre na frente, mas limitar laterais totais
        const minTotalX = -2;
        const maxTotalX = (aislesCount - 1) * AISLE_SPACING + 2;
        
        if (nextX >= minTotalX && nextX <= maxTotalX) {
            camera.position.x = nextX;
        }
        // Limitar o quanto pode ir pra trás (em direção à camera)
        if (nextZ < 8) { // Limite frontal visual
            camera.position.z = nextZ;
        }
    } 
    else {
        // 2. Entrando nos corredores (Z < 4) - Movimento restrito aos "trilhos"
        // Descobrir em qual corredor estamos "alinhados"
        const nearestAisleIndex = Math.round(nextX / AISLE_SPACING);
        const aisleCenterX = nearestAisleIndex * AISLE_SPACING;
        
        // Verificar se estamos dentro da largura permitida desse corredor
        const distFromCenter = Math.abs(nextX - aisleCenterX);
        
        // Se estivermos alinhados com um corredor, permitimos entrar/mover em Z
        if (distFromCenter < AISLE_WIDTH_LIMIT) {
             // Movimento Z permitido dentro dos limites de profundidade
             if (nextZ >= MIN_Z && nextZ <= MAX_Z) {
                 camera.position.z = nextZ;
             }
             
             // Movimento X permitido apenas para ajuste fino dentro do corredor (não atravessa parede)
             // Se tentar sair do trilho, prende no limite
             if (distFromCenter < AISLE_WIDTH_LIMIT) {
                 camera.position.x = nextX;
             } else {
                 // Clamp X no limite do trilho
                 if (nextX > aisleCenterX) camera.position.x = aisleCenterX + AISLE_WIDTH_LIMIT - 0.1;
                 else camera.position.x = aisleCenterX - AISLE_WIDTH_LIMIT + 0.1;
             }
        } else {
            // Se tentar mover X para fora do corredor estando fundo no Z, bloqueia X
            // Mas permite Z se não colidir (geralmente Z colide se X não muda)
            // Aqui simplificamos: se não está no trilho, não move X.
            // O usuário tem que voltar para Z > 4 para trocar de rua.
            if (nextZ > camera.position.z) {
                // Permitir voltar pra frente
                camera.position.z = nextZ;
            }
        }
    }
    
    // Trava altura
    camera.position.y = 1.7; 
  });

  return <PointerLockControls makeDefault pointerSpeed={0.5} />;
};

// --- UI COMPONENTS ---

const DetailPanel = ({ selectedCell, onClose }: { selectedCell: any, onClose: () => void }) => {
    if (!selectedCell) return null;
    const { status, rack, level, apt, config } = selectedCell;
    const dims = config?.dims || { h:0, w:0, d:0, weight:0 };

    return (
        <div className="absolute right-4 top-20 bottom-4 w-80 bg-stone-900/95 backdrop-blur-md border border-stone-700 rounded-xl shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300 z-10 flex flex-col text-stone-200">
            <div className="bg-emerald-900/50 border-b border-emerald-800 p-4 flex justify-between items-center sticky top-0 z-20">
                <h3 className="font-bold flex items-center gap-2 text-emerald-400">
                    <Info size={18} /> Detalhes
                </h3>
                <button onClick={onClose} className="hover:bg-white/10 p-1 rounded transition-colors text-stone-400 hover:text-white">
                   <XCircle size={18} />
                </button>
            </div>
            <div className="p-5 space-y-5 flex-1">
                 <div>
                    <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Endereço</span>
                    <div className="mt-2 bg-black/40 border border-stone-700 p-3 rounded-lg text-center shadow-inner">
                        <span className="text-lg font-mono font-bold text-emerald-400 block tracking-tight">R{config.rua} - P{rack} - N{level} - A{apt}</span>
                    </div>
                </div>
                <div className={`p-3 rounded-lg border flex items-center gap-3 ${status === 'LIVRE' ? 'bg-emerald-900/20 border-emerald-800' : ''} ${status === 'OCUPADO' ? 'bg-red-900/20 border-red-800' : ''} ${status === 'PARCIAL' ? 'bg-amber-900/20 border-amber-800' : ''} ${status === 'BLOQUEADO' ? 'bg-stone-800 border-stone-600' : ''}`}>
                    {status === 'LIVRE' && <CheckCircle2 className="text-emerald-500" />}
                    {status === 'OCUPADO' && <XCircle className="text-red-500" />}
                    {status === 'PARCIAL' && <AlertCircle className="text-amber-500" />}
                    {status === 'BLOQUEADO' && <Ban className="text-stone-400" />}
                    <div><span className="block text-xs font-bold opacity-60 uppercase text-stone-400">Status</span><span className="font-bold text-stone-100">{status}</span></div>
                </div>
                 <div className="border-t border-stone-700 pt-4">
                  <div className="flex justify-between items-center mb-2"><span className="text-xs font-semibold text-stone-500">Peso Suportado</span><span className="text-xs font-bold text-emerald-400 bg-emerald-900/30 px-2 py-0.5 rounded-full border border-emerald-900">{dims.weight}kg</span></div>
                  <div className="w-full bg-stone-800 rounded-full h-2 overflow-hidden border border-stone-700"><div className={`h-full rounded-full transition-all duration-500 ${status === 'LIVRE' ? 'bg-emerald-500 w-0' : 'bg-emerald-500 w-3/4'}`}></div></div>
                </div>
            </div>
        </div>
    );
};

// --- MAIN APP COMPONENT ---

export default function App() {
  const [activeAreaId, setActiveAreaId] = useState<string>('area1');
  const [selectedCell, setSelectedCell] = useState<any>(null);

  const activeArea = WAREHOUSE_DATA.areas.find(a => a.id === activeAreaId) || WAREHOUSE_DATA.areas[0];

  const handleCellSelect = (data: any) => {
      setSelectedCell({
          rack: data.rackId,
          level: data.levelId,
          apt: data.aptId,
          status: data.status,
          config: data.config
      });
  };

  return (
    <div className="h-screen w-full bg-stone-950 font-sans text-stone-200 flex flex-col overflow-hidden">
      <header className="bg-stone-900 text-white shadow-xl border-b border-stone-800 shrink-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 bg-emerald-500/10 rounded-lg flex items-center justify-center border border-emerald-500/20">
              <Move3d className="text-emerald-400" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight text-white">Eletro Farias 3D</h1>
              <p className="text-[10px] text-emerald-400/80 font-medium uppercase tracking-wider">Street View Mode</p>
            </div>
          </div>
          <div className="flex gap-2 text-xs">
            {WAREHOUSE_DATA.areas.map(area => (
                <button
                  key={area.id}
                  onClick={() => { setActiveAreaId(area.id); setSelectedCell(null); }}
                  className={`px-3 py-1.5 rounded-full transition-all border ${activeAreaId === area.id ? 'bg-emerald-600 border-emerald-500 text-white font-bold shadow-lg shadow-emerald-900/50' : 'bg-stone-800 border-stone-700 text-stone-400 hover:bg-stone-700'}`}
                >
                  {area.name}
                </button>
            ))}
          </div>
        </div>
      </header>

      <div className="flex-1 relative">
        <div className="absolute top-4 left-4 z-10 bg-stone-900/80 backdrop-blur px-4 py-3 rounded-xl shadow-lg border border-stone-700 text-xs font-medium pointer-events-none">
            <div className="flex flex-col gap-2 mb-3 pb-3 border-b border-stone-700">
                <div className="flex items-center gap-2 text-stone-300"><MousePointer2 size={14}/> Clique na tela para andar</div>
                <div className="flex items-center gap-2 text-stone-300"><Keyboard size={14}/> W A S D para mover</div>
                <div className="text-[10px] text-stone-500">ESC para sair do modo imersivo</div>
            </div>
            <div className="flex items-center gap-2 mb-1"><div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div> Livre</div>
            <div className="flex items-center gap-2 mb-1"><div className="w-2 h-2 rounded-full bg-red-500"></div> Ocupado</div>
            <div className="flex items-center gap-2 mb-1"><div className="w-2 h-2 rounded-full bg-amber-500"></div> Parcial</div>
        </div>

        <KeyboardControls
          map={[
            { name: 'forward', keys: ['ArrowUp', 'w', 'W'] },
            { name: 'backward', keys: ['ArrowDown', 's', 'S'] },
            { name: 'left', keys: ['ArrowLeft', 'a', 'A'] },
            { name: 'right', keys: ['ArrowRight', 'd', 'D'] },
          ]}
        >
            <Canvas 
                shadows 
                dpr={[1, 2]} 
                camera={{ position: [0, 1.7, 8], fov: 60 }} 
            >
                <color attach="background" args={['#101010']} />
                {/* Nevoeiro para esconder os limites do mapa */}
                <fog attach="fog" args={['#101010', 5, 45]} />

                <ambientLight intensity={0.3} />
                {/* Luz ambiente central */}
                <pointLight position={[10, 10, -5]} intensity={0.5} distance={30} decay={2} />
                
                <Controls aislesCount={activeArea.aisles.length} />

                <group position={[0, -1.7, 0]}>
                    <WarehouseScene 
                        area={activeArea} 
                        onCellSelect={handleCellSelect} 
                        selectedCell={selectedCell}
                    />
                </group>
            </Canvas>
        </KeyboardControls>

        <DetailPanel selectedCell={selectedCell} onClose={() => setSelectedCell(null)} />
      </div>
    </div>
  );
}
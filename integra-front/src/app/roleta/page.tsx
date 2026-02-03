'use client';
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Gift, Lock, RefreshCw, Volume2, VolumeX, RotateCcw } from 'lucide-react';

// --- Interfaces para TypeScript ---
interface Segment {
  id: number;
  option: string;
  color: string;
  textColor: string;
  image: string;
}

interface CustomWheelProps {
  segments: Segment[];
  mustSpin: boolean;
  prizeNumber: number;
  onStopSpinning: () => void;
  spinDurationMs?: number;
}

interface Particle {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  speedY: number;
  speedX: number;
  rotation: number;
  rotationSpeed: number;
}

// ✅ retorno do backend: { ok: boolean, msg: string }
type ValidarCodigoResponse = { ok: boolean; msg?: string };

// --- Configuration Data ---
const SEGMENTS: Segment[] = [
  { id: 10, option: 'Caixinha Bluetooth', color: '#004d00', textColor: '#FFFFFF', image: 'https://placehold.co/400x400/png?text=Bluetooth' },
  { id: 8, option: 'Celular', color: '#FFFFFF', textColor: '#004d00', image: 'https://placehold.co/400x400/png?text=Celular' },
  { id: 2, option: 'Voucher 10%', color: '#004d00', textColor: '#FFFFFF', image: 'https://placehold.co/400x400/png?text=Voucher+10' },
  { id: 22, option: 'Voucher 10%', color: '#FFFFFF', textColor: '#004d00', image: 'https://placehold.co/400x400/png?text=Voucher+10' },
  { id: 7, option: 'Parafusadeira', color: '#004d00', textColor: '#FFFFFF', image: 'https://placehold.co/400x400/png?text=Parafusadeira' },
  { id: 6, option: 'Projetor', color: '#FFFFFF', textColor: '#004d00', image: 'https://placehold.co/400x400/png?text=Projetor' },
  { id: 0, option: 'JOGUE NOVAMENTE', color: '#9B111E', textColor: '#FFFFFF', image: 'https://placehold.co/400x400/png?text=Jogue+Novamente' },
  { id: 5, option: 'Amperímetro', color: '#004d00', textColor: '#FFFFFF', image: 'https://placehold.co/400x400/png?text=Amperimetro' },
  { id: 4, option: 'Squeeze', color: '#FFFFFF', textColor: '#004d00', image: 'https://placehold.co/400x400/png?text=Squeeze' },
  { id: 1, option: 'Voucher 5%', color: '#004d00', textColor: '#FFFFFF', image: 'https://placehold.co/400x400/png?text=Voucher+5' },
  { id: 9, option: 'Parafusadeira', color: '#FFFFFF', textColor: '#004d00', image: 'https://placehold.co/400x400/png?text=Parafusadeira' },
  { id: 3, option: 'Kit Ferramentas', color: '#004d00', textColor: '#FFFFFF', image: 'https://placehold.co/400x400/png?text=Ferramentas' },
  { id: 11, option: 'Voucher 5%', color: '#FFFFFF', textColor: '#004d00', image: 'https://placehold.co/400x400/png?text=Voucher+5' },
  { id: 30, option: 'JOGUE NOVAMENTE', color: '#9B111E', textColor: '#FFFFFF', image: 'https://placehold.co/400x400/png?text=Jogue+Novamente' },
];

// --- IMAGENS ---
const MASCOTE_URL = '/eletro_farias.png';
const CENTER_LOGO_URL = '/eletro_farias.png';

// --- ÁUDIOS (troque pelos seus arquivos, ex: '/audio/bg.mp3') ---
const AUDIO_BG_URL = '/audio/bg.mp3';
const AUDIO_SPIN_URL = '/sounds/spin.mp3';
const AUDIO_WIN_URL = '/sounds/win.wav';

// --- Custom Confetti Component ---
const Confetti: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const particles: Particle[] = [];
    const colors = ['#f2c94c', '#1b5e20', '#ff3e3e', '#ffffff', '#FFD700', '#00ff00'];

    for (let i = 0; i < 150; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height - canvas.height,
        w: Math.random() * 10 + 5,
        h: Math.random() * 8 + 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        speedY: Math.random() * 3 + 2,
        speedX: Math.random() * 2 - 1,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 5,
      });
    }

    let animationId: ReturnType<typeof requestAnimationFrame> | null = null;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p) => {
        p.y += p.speedY;
        p.x += p.speedX;
        p.rotation += p.rotationSpeed;

        if (p.y > canvas.height) {
          p.y = -20;
          p.x = Math.random() * canvas.width;
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 z-[100] pointer-events-none" />;
};

// --- Custom Canvas Wheel Component ---
const CustomWheel: React.FC<CustomWheelProps> = ({
  segments,
  mustSpin,
  prizeNumber,
  onStopSpinning,
  spinDurationMs = 4500,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const rotationRef = useRef(0);
  const [rotation, setRotation] = useState(0);

  const size = 600;
  const norm360 = (deg: number) => ((deg % 360) + 360) % 360;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = canvas.width / 2 - 10;
    const arc = (2 * Math.PI) / segments.length;

    const startAngle = -Math.PI / 2;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    segments.forEach((segment, i) => {
      const a0 = startAngle + i * arc;
      const a1 = a0 + arc;

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, a0, a1);
      ctx.closePath();

      ctx.fillStyle = segment.color;
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.15)';
      ctx.stroke();

      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(a0 + arc / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = segment.textColor;
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText(segment.option, radius - 30, 6);
      ctx.restore();
    });
  }, [segments]);

  useEffect(() => {
    if (!mustSpin) return;

    const segCount = segments.length;
    const arcDeg = 360 / segCount;

    const POINTER_DEG = 270;
    const centerDeg = -90 + (prizeNumber + 0.5) * arcDeg;

    const safeMargin = arcDeg * 0.18;
    const jitter = (Math.random() * 2 - 1) * safeMargin;

    const current = norm360(rotationRef.current);
    const desired = norm360(POINTER_DEG - (centerDeg + jitter));
    const delta = norm360(desired - current);

    const fullSpins = 6;
    const target = rotationRef.current + fullSpins * 360 + delta;

    rotationRef.current = target;
    setRotation(target);

    const t = window.setTimeout(() => onStopSpinning(), spinDurationMs);
    return () => window.clearTimeout(t);
  }, [mustSpin, prizeNumber, segments.length, onStopSpinning, spinDurationMs]);

  return (
    <div
      style={{
        transform: `rotate(${rotation}deg)`,
        transition: mustSpin ? `transform ${spinDurationMs}ms cubic-bezier(0.2, 0.8, 0.3, 1)` : 'none',
      }}
      className="rounded-full overflow-hidden w-[320px] h-[320px] md:w-[600px] md:h-[600px]"
    >
      <canvas ref={canvasRef} width={size} height={size} className="w-full h-full" />
    </div>
  );
};

export default function App() {
  const API_BASE = useMemo(() => process.env.NEXT_PUBLIC_API_URL ?? '', []);
  const API_TOKEN = useMemo(() => process.env.NEXT_PUBLIC_API_TOKEN ?? '', []);

  const VALIDAR_CODIGO_URL = useMemo(
    () => (API_BASE ? `${API_BASE}/sync/validarCodigoRoleta` : `/sync/validarCodigoRoleta`),
    [API_BASE],
  );

  const VALOR_ROLETA_URL = useMemo(
    () => (API_BASE ? `${API_BASE}/sync/valorRoleta` : `/sync/valorRoleta`),
    [API_BASE],
  );

  // ✅ NOVO: endpoint para usar código
  const USAR_CODIGO_URL = useMemo(
    () => (API_BASE ? `${API_BASE}/sync/usarCodigoRoleta` : `/sync/usarCodigoRoleta`),
    [API_BASE],
  );

  const STORAGE_KEY = 'roleta_codigo';

  const [mustSpin, setMustSpin] = useState(false);
  const [prizeNumber, setPrizeNumber] = useState(0);

  const [codigo, setCodigo] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem(STORAGE_KEY) ?? '';
  });

  const [isAuthorized, setIsAuthorized] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // ✅ mensagem de erro (exibir no overlay)
  const [loginError, setLoginError] = useState<string | null>(null);

  // ✅ (opcional) status do POST ao abrir modal
  const [usarCodigoError, setUsarCodigoError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, codigo ?? '');
  }, [codigo]);

  const bgAudioRef = useRef<HTMLAudioElement | null>(null);
  const spinAudioRef = useRef<HTMLAudioElement | null>(null);
  const winAudioRef = useRef<HTMLAudioElement | null>(null);

  const safePlay = useCallback(async (el: HTMLAudioElement | null) => {
    if (!el) return;
    try {
      const p = el.play();
      if (p && typeof (p as any).then === 'function') await p;
    } catch {}
  }, []);

  const safeStop = useCallback((el: HTMLAudioElement | null, resetTo0 = true) => {
    if (!el) return;
    try {
      el.pause();
      if (resetTo0) el.currentTime = 0;
    } catch {}
  }, []);

  useEffect(() => {
    if (!isAuthorized) return;
    if (!soundEnabled) return;

    const bg = bgAudioRef.current;
    if (!bg) return;

    bg.loop = true;
    bg.volume = 0.35;
    safePlay(bg);
  }, [isAuthorized, soundEnabled, safePlay]);

  useEffect(() => {
    const bg = bgAudioRef.current;
    const sp = spinAudioRef.current;
    const win = winAudioRef.current;

    if (!soundEnabled) {
      safeStop(bg, false);
      safeStop(sp, true);
      safeStop(win, true);
      return;
    }

    if (isAuthorized) {
      if (bg) {
        bg.loop = true;
        bg.volume = 0.35;
        safePlay(bg);
      }
    }
  }, [soundEnabled, isAuthorized, safePlay, safeStop]);

  const getAuthHeaders = useCallback((): Record<string, string> => {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (API_TOKEN) h.Authorization = `Bearer ${API_TOKEN}`;
    return h;
  }, [API_TOKEN]);

  // ✅ agora o backend retorna { ok: boolean, msg: string }
  const handleValidarCodigo = async () => {
    const c = (codigo ?? '').trim();
    if (!c) return;

    setLoading(true);
    setLoginError(null);

    try {
      const response = await fetch(`${VALIDAR_CODIGO_URL}?codigo=${encodeURIComponent(c)}`, {
        method: 'GET',
        headers: API_TOKEN ? { Authorization: `Bearer ${API_TOKEN}` } : undefined,
      });

      if (!response.ok) {
        const txt = await response.text().catch(() => '');
        throw new Error(txt || 'Falha na requisição');
      }

      const data = (await response.json()) as ValidarCodigoResponse;

      if (data?.ok === true) {
        setIsAuthorized(true);
        setLoginError(null);

        if (soundEnabled) {
          const bg = bgAudioRef.current;
          if (bg) {
            bg.loop = true;
            bg.volume = 0.35;
            safePlay(bg);
          }
        }
      } else {
        const msg = data?.msg || 'Código inválido ou já utilizado.';
        setLoginError(msg);
      }
    } catch (error: any) {
      console.error('Erro na validação:', error);
      setLoginError(error?.message || 'Erro ao validar código. Verifique sua conexão.');
    } finally {
      setLoading(false);
    }
  };

  const handleSpinClick = async () => {
    if (mustSpin || !isAuthorized) return;

    const codigoAtual = (codigo ?? '').trim();
    if (!codigoAtual) {
      setLoginError('Informe o código antes de girar.');
      return;
    }

    try {
      setUsarCodigoError(null);

      if (soundEnabled) {
        const sp = spinAudioRef.current;
        if (sp) {
          sp.loop = true;
          sp.volume = 0.95;
          sp.currentTime = 0;
          safePlay(sp);
        }
      }

      const url = `${VALOR_ROLETA_URL}?codigo=${encodeURIComponent(codigoAtual)}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: API_TOKEN ? { Authorization: `Bearer ${API_TOKEN}` } : undefined,
      });

      if (!response.ok) throw new Error('Falha ao obter prêmio');

      const result = await response.json();
      const prizeId = result.valor;

      const index = SEGMENTS.findIndex((item) => item.id === prizeId);

      if (index !== -1) {
        setPrizeNumber(index);
        setMustSpin(true);
      } else {
        safeStop(spinAudioRef.current, true);
        alert('Erro: O prêmio sorteado não foi encontrado na lista.');
      }
    } catch (error) {
      console.error('Erro no sorteio:', error);
      safeStop(spinAudioRef.current, true);
      alert('Não foi possível sortear o prêmio. Tente novamente.');
    }
  };

  // ✅ NOVO: chama POST /sync/usarCodigoRoleta quando abrir o modal
  const usarCodigoRoleta = useCallback(
    async (codigoAtual: string) => {
      const resp = await fetch(USAR_CODIGO_URL, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ codigo: codigoAtual }),
      });

      if (!resp.ok) {
        const txt = await resp.text().catch(() => '');
        throw new Error(txt || `Falha ao usar código (status ${resp.status})`);
      }

      return true;
    },
    [USAR_CODIGO_URL, getAuthHeaders],
  );

  const handleStopSpinning = useCallback(() => {
    setMustSpin(false);
    setShowModal(true);

    safeStop(spinAudioRef.current, true);

    if (soundEnabled) {
      const win = winAudioRef.current;
      if (win) {
        win.loop = false;
        win.volume = 0.75;
        win.currentTime = 0;
        safePlay(win);
      }
    }
  }, [safePlay, safeStop, soundEnabled]);

  // ✅ EFEITO: ao abrir o modal, consome o código via POST
  useEffect(() => {
    if (!showModal) return;

    const codigoAtual = (codigo ?? '').trim();
    if (!codigoAtual) return;

    let cancelled = false;

    (async () => {
      try {
        setUsarCodigoError(null);
        await usarCodigoRoleta(codigoAtual);
      } catch (e: any) {
        if (cancelled) return;
        setUsarCodigoError(e?.message || 'Falha ao consumir código.');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [showModal, codigo, usarCodigoRoleta]);

  const resetGame = () => {
    setShowModal(false);
    setIsAuthorized(false);
    setLoginError(null);
    setUsarCodigoError(null);

    safeStop(spinAudioRef.current, true);
    safeStop(winAudioRef.current, true);
    safeStop(bgAudioRef.current, false);
  };

  const playAgain = () => {
    setShowModal(false);
    setUsarCodigoError(null);
    safeStop(winAudioRef.current, true);
  };

  const isReplayPrize = SEGMENTS[prizeNumber]?.id === 0;

  return (
    <div className="min-h-screen bg-[#1b5e20] font-sans flex flex-col items-center justify-center overflow-hidden relative selection:bg-yellow-400">
      <audio ref={bgAudioRef} src={AUDIO_BG_URL} preload="auto" />
      <audio ref={spinAudioRef} src={AUDIO_SPIN_URL} preload="auto" />
      <audio ref={winAudioRef} src={AUDIO_WIN_URL} preload="auto" />

      <button
        onClick={() => setSoundEnabled(!soundEnabled)}
        className="absolute top-5 right-5 z-50 bg-white/20 p-2 rounded-full hover:bg-white/30 text-white transition-colors"
      >
        {soundEnabled ? <Volume2 size={24} /> : <VolumeX size={24} />}
      </button>

      <div
        className="absolute inset-0 pointer-events-none opacity-10"
        style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/cubes.png')" }}
      />

      <div className="fixed bottom-0 left-5 h-40 md:h-56 z-10 pointer-events-none opacity-90 transition-opacity">
        <img src={MASCOTE_URL} alt="Mascote Eletro Farias" className="h-full w-auto object-contain drop-shadow-xl" />
      </div>

      <div
        className={`
          relative flex justify-center items-center bg-[#f2c94c] p-3 rounded-full 
          shadow-[0_0_50px_rgba(0,0,0,0.5)] transition-all duration-500 transform z-10
          ${isAuthorized ? 'scale-100 filter-none' : 'scale-90 blur-sm brightness-50'}
        `}
      >
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 z-20 w-0 h-0 border-l-[25px] border-l-transparent border-r-[25px] border-r-transparent border-t-[50px] border-t-[#ff3e3e] drop-shadow-md" />

        <CustomWheel segments={SEGMENTS} mustSpin={mustSpin} prizeNumber={prizeNumber} onStopSpinning={handleStopSpinning} spinDurationMs={4500} />

        <button
          onClick={handleSpinClick}
          disabled={!isAuthorized || mustSpin}
          className="absolute w-24 h-24 md:w-32 md:h-32 bg-white rounded-full z-20 flex items-center justify-center border-4 border-[#f2c94c] shadow-lg hover:scale-105 active:scale-95 transition-transform disabled:cursor-not-allowed overflow-hidden p-0"
        >
          <img src={CENTER_LOGO_URL} alt="Girar" className={`w-full h-full object-cover ${mustSpin ? 'opacity-50' : 'opacity-100'}`} />
        </button>
      </div>

      {!isAuthorized && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white p-8 md:p-10 rounded-2xl flex flex-col items-center gap-4 shadow-2xl border-4 border-[#f2c94c] w-full max-w-md">
            <div className="bg-[#1b5e20] p-3 rounded-full">
              <Lock className="text-white" size={32} />
            </div>

            <h2 className="text-[#1b5e20] font-bold text-2xl text-center leading-tight">
              Bem-vindo!<br />
              <span className="text-lg font-normal text-gray-600">Digite seu código para girar</span>
            </h2>

            <input
              type="text"
              placeholder="CÓDIGO"
              value={codigo}
              onChange={(e) => {
                setCodigo(e.target.value);
                if (loginError) setLoginError(null);
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleValidarCodigo()}
              className="w-full p-4 text-center text-xl font-bold tracking-widest text-[#1b5e20] border-2 border-[#1b5e20] rounded-xl focus:outline-none focus:ring-4 focus:ring-[#1b5e20]/20 placeholder:text-gray-300 transition-all uppercase bg-white"
            />

            {loginError && (
              <div className="w-full rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">
                {loginError}
              </div>
            )}

            <button
              onClick={handleValidarCodigo}
              disabled={loading}
              className="w-full bg-[#1b5e20] text-white py-4 px-6 rounded-xl font-bold text-lg hover:bg-[#2e7d32] transition-colors shadow-lg active:translate-y-0.5 disabled:opacity-70 disabled:cursor-wait"
            >
              {loading ? 'VALIDANDO...' : 'VALIDAR CÓDIGO'}
            </button>
          </div>
        </div>
      )}

      {showModal && !isReplayPrize && <Confetti />}

      {showModal && (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-md z-[60] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white p-8 md:p-12 rounded-2xl text-center max-w-sm w-full border-8 border-[#f2c94c] shadow-2xl animate-in zoom-in duration-300 z-[70]">
            <h2 className="text-[#1b5e20] text-3xl font-extrabold mb-2">
              {isReplayPrize ? '🔄 TENTE DE NOVO! 🔄' : '🎉 PARABÉNS! 🎉'}
            </h2>

            <p className="text-gray-600 text-lg mb-4">{isReplayPrize ? 'A roleta diz para você:' : 'Você ganhou:'}</p>

            {/* ✅ se falhar ao consumir o código */}
            {usarCodigoError && (
              <div className="w-full rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm mb-4">
                {usarCodigoError}
              </div>
            )}

            <div
              className={`p-6 rounded-xl border-2 border-dashed mb-8 ${
                isReplayPrize ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'
              }`}
            >
              {/* ✅ REMOVIDO: imagem do prêmio no modal */}
              {isReplayPrize ? (
                <RotateCcw className="mx-auto text-[#9B111E] mb-2" size={48} />
              ) : (
                <Gift className="mx-auto text-[#f2c94c] mb-2" size={48} />
              )}

              <h1
                className={`${
                  isReplayPrize ? 'text-[#9B111E]' : 'text-[#1b5e20]'
                } text-2xl md:text-3xl font-black uppercase leading-tight`}
              >
                {SEGMENTS[prizeNumber].option}
              </h1>
            </div>

            {isReplayPrize ? (
              <button
                onClick={playAgain}
                className="w-full bg-[#9B111E] text-white py-3 px-6 rounded-xl font-bold text-lg hover:bg-[#7a0d17] transition-all flex items-center justify-center gap-2 group"
              >
                <RefreshCw className="group-hover:rotate-180 transition-transform duration-500" size={20} />
                GIRAR NOVAMENTE
              </button>
            ) : (
              <button
                onClick={resetGame}
                className="w-full bg-[#1b5e20] text-white py-3 px-6 rounded-xl font-bold text-lg hover:bg-[#2e7d32] transition-all flex items-center justify-center gap-2 group"
              >
                <RefreshCw className="group-hover:rotate-180 transition-transform duration-500" size={20} />
                JOGAR NOVAMENTE
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

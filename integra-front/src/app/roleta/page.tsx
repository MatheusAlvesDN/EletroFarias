'use client';
import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import dynamic from "next/dynamic";

const Wheel = dynamic(
  () => import("react-custom-roulette").then((m) => m.Wheel),
  { ssr: false }
);

const TRANSPARENT_PIXEL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

// Dados da roleta
const data = [
  { id: 1, option: 'Amperímetro', style: { backgroundColor: '#FFFFFF', textColor: '#004d00' } },
  { id: 2, option: 'Garrafa de Água', style: { backgroundColor: '#004d00', textColor: '#FFFFFF' } },
  { id: 9, option: 'Parafusadeira (21267)', style: { backgroundColor: '#FFFFFF', textColor: '#004d00' } },
  { id: 4, option: 'Voucher 10%', style: { backgroundColor: '#004d00', textColor: '#FFFFFF' } },
  { id: 5, option: 'Kit Ferramentas', style: { backgroundColor: '#FFFFFF', textColor: '#004d00' } },
  { id: 6, option: 'Projetor Clube', style: { backgroundColor: '#004d00', textColor: '#FFFFFF' } },
  { id: 7, option: 'Celular Clube', style: { backgroundColor: '#FFFFFF', textColor: '#004d00' } },
  { id: 8, option: 'Parafusadeira (21190)', style: { backgroundColor: '#004d00', textColor: '#FFFFFF' } },
  { id: 3, option: 'Voucher 5%', style: { backgroundColor: '#FFFFFF', textColor: '#004d00' } },
  { id: 0, option: 'Caixinha Bluetooth', style: { backgroundColor: '#004d00', textColor: '#FFFFFF' } },
];

// 2. ALTERAÇÃO DE FUNDO: Cor ajustada para verde
const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background-color: #1b5e20; /* Verde escuro institucional */
  font-family: sans-serif;
  overflow: hidden; 
  position: relative; /* Necessário para posicionar elementos absolutos/fixos dentro se necessário */
`;

// 3. NOVO COMPONENTE: Personagem no canto esquerdo
const Mascote = styled.img`
  position: fixed;
  bottom: 0;
  left: -50px; /* Leve ajuste para esquerda se necessário */
  height: 90vh; /* Altura grande para ocupar a lateral */
  z-index: 5;
  pointer-events: none; /* Garante que cliques passem através dele se sobrepor algo */
  
  @media (max-width: 1000px) {
    height: 50vh; /* Ajuste para telas menores */
    left: -20px;
  }
`;

const WheelWrapper = styled.div`
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #f2c94c; 
  padding: 10px;
  border-radius: 50%;
  box-shadow: 0 0 50px rgba(0,0,0,0.5);
  transform: scale(1.6); 
  z-index: 10; /* Garante que fique acima do mascote se houver sobreposição */
`;

const RotateContainer = styled.div`
  transform: rotate(-45deg);
  display: flex;
  justify-content: center;
  align-items: center;
`;

const CenterLogo = styled.div`
  position: absolute;
  width: 100px; 
  height: 100px;
  background: white;
  border-radius: 50%;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 4px solid #f2c94c;
  cursor: pointer;
  box-shadow: 0 4px 10px rgba(0,0,0,0.3);
  transition: transform 0.2s ease;

  &:active { transform: scale(0.95); }

  img {
    width: 80%;
    object-fit: contain;
  }
`;

const Seta = styled.div`
  position: absolute;
  top: -20px; 
  left: 50%;
  transform: translateX(-50%);
  z-index: 20;
  width: 0;
  height: 0;
  border-left: 20px solid transparent;
  border-right: 20px solid transparent;
  border-top: 40px solid #ff3e3e; 
  filter: drop-shadow(0px 4px 4px rgba(0,0,0,0.5));
  pointer-events: none; 
`;

export default function RoletaEletroFarias() {
  const [mustSpin, setMustSpin] = useState(false);
  const [prizeNumber, setPrizeNumber] = useState(0);

  // --- Refs para os Áudios ---
  const bgAudioRef = useRef<HTMLAudioElement | null>(null);
  const spinAudioRef = useRef<HTMLAudioElement | null>(null);
  const winAudioRef = useRef<HTMLAudioElement | null>(null);

  // Inicializa os sons
  useEffect(() => {
    bgAudioRef.current = new Audio('/sounds/background.mp3');
    bgAudioRef.current.loop = true;
    bgAudioRef.current.volume = 0.4;

    spinAudioRef.current = new Audio('/sounds/spin.mp3');
    spinAudioRef.current.loop = true;
    spinAudioRef.current.volume = 0.8;

    winAudioRef.current = new Audio('/sounds/win.wav');
    winAudioRef.current.volume = 1.0;

    const playBg = async () => {
      try {
        await bgAudioRef.current?.play();
      } catch (e) {
        console.log("Autoplay bloqueado pelo navegador.");
      }
    };
    playBg();

    return () => {
      bgAudioRef.current?.pause();
      spinAudioRef.current?.pause();
      winAudioRef.current?.pause();
    }
  }, []);

  const ensureAudioContext = () => {
    if (bgAudioRef.current && bgAudioRef.current.paused && !mustSpin) {
      bgAudioRef.current.play().catch(e => console.log(e));
    }
  };

  const handleSpinClick = async () => {
    ensureAudioContext();

    if (mustSpin) return;

    try {
      // 1. LÓGICA CORRIGIDA: useMemo removido daqui (proibido em hooks).
      // Definição direta da URL
      const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '';
      const ROLETA_URL = API_BASE ? `${API_BASE}/sync/valorRoleta` : `/valorRoleta`;

      const response = await fetch(ROLETA_URL);
      const result = await response.json();
      
      // Encontra o index baseado no ID retornado
      const index = data.findIndex(item => item.id === result.valor);

      if (index !== -1) {
        setPrizeNumber(index); // Define o prêmio ANTES de girar

        // --- INICIO DO GIRO ---
        bgAudioRef.current?.pause();

        if (spinAudioRef.current) {
          spinAudioRef.current.currentTime = 0;
          spinAudioRef.current?.play();
        }

        setMustSpin(true);
      } else {
        console.error("ID retornado pela API não existe na roleta.");
        alert("Erro: Item sorteado não encontrado.");
      }
    } catch (error) {
      console.error("Erro na API:", error);
      // Fallback (apenas para teste, em produção você pode querer remover)
      const randomIndex = Math.floor(Math.random() * data.length);
      setPrizeNumber(randomIndex);

      bgAudioRef.current?.pause();
      if (spinAudioRef.current) {
        spinAudioRef.current.currentTime = 0;
        spinAudioRef.current.play();
      }
      setMustSpin(true);
    }
  };

  const handleStopSpinning = () => {
    setMustSpin(false);

    spinAudioRef.current?.pause();

    if (winAudioRef.current) {
      winAudioRef.current.currentTime = 0;
      winAudioRef.current.play();
    }

    setTimeout(() => {
      alert(`Sorteado: ${data[prizeNumber].option}`);
      bgAudioRef.current?.play();
    }, 500);
  };

  return (
    <Container onClick={ensureAudioContext}>
      
      {/* 3. INSERÇÃO DO PERSONAGEM: Certifique-se de salvar a imagem cortada como 'mascote.png' na pasta public
         <Mascote src="/mascote.png" alt="Mascote Eletro Farias" />
      */}
     

      <WheelWrapper>
        <Seta />
        <RotateContainer>
          <Wheel
            mustStartSpinning={mustSpin}
            prizeNumber={prizeNumber}
            data={data}
            onStopSpinning={handleStopSpinning}
            innerRadius={10}
            outerBorderWidth={0}
            radiusLineColor="#dedede"
            radiusLineWidth={1}
            fontSize={12}
            textDistance={60}
            pointerProps={{
              src: TRANSPARENT_PIXEL,
              style: { width: '1px', height: '1px' }
            }}
          />
        </RotateContainer>

        <CenterLogo onClick={(e) => { e.stopPropagation(); handleSpinClick(); }}>
          <img src="/eletro_farias.png" alt="Girar" />
        </CenterLogo>
      </WheelWrapper>

      <h2 style={{ color: 'white', marginTop: '150px', fontSize: '24px', zIndex: 10 }}>
        Toque no centro para girar!
      </h2>
    </Container>
  );
}
'use client';
import React, { useState, useEffect, useRef } from 'react';
import { Wheel } from 'react-custom-roulette';
import styled from 'styled-components';

const TRANSPARENT_PIXEL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

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

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background-color: #051a14;
  font-family: sans-serif;
  overflow: hidden; 
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
    // 1. Música de Fundo (Loop infinito, volume mais baixo)
    bgAudioRef.current = new Audio('/sounds/background.mp3');
    bgAudioRef.current.loop = true;
    bgAudioRef.current.volume = 0.4;

    // 2. Som Girando (Loop enquanto gira)
    spinAudioRef.current = new Audio('/sounds/spin.aiff');
    spinAudioRef.current.loop = true;
    spinAudioRef.current.volume = 0.8;

    // 3. Som Vitória (Toca uma vez)
    winAudioRef.current = new Audio('/sounds/win.wav');
    winAudioRef.current.volume = 1.0;

    // Tenta iniciar a música de fundo automaticamente
    const playBg = async () => {
      try {
        await bgAudioRef.current?.play();
      } catch (e) {
        console.log("Autoplay bloqueado pelo navegador. Som iniciará no primeiro clique.");
      }
    };
    playBg();

    return () => {
      // Limpeza ao sair da página
      bgAudioRef.current?.pause();
      spinAudioRef.current?.pause();
      winAudioRef.current?.pause();
    }
  }, []);

  // Função auxiliar para garantir que o som comece se o autoplay falhou
  const ensureAudioContext = () => {
    if (bgAudioRef.current && bgAudioRef.current.paused && !mustSpin) {
      bgAudioRef.current.play().catch(e => console.log(e));
    }
  };

  const handleSpinClick = async () => {
    // Garante que o áudio de fundo toque se estava pausado
    ensureAudioContext();

    if (mustSpin) return;

    try {
      const response = await fetch('http://localhost:3001/sync/valorRoleta');
      const result = await response.json();
      const index = data.findIndex(item => item.id === result.valor);

      if (index !== -1) {
        setPrizeNumber(index);

        // --- INICIO DO GIRO ---
        // 1. Pausa musica fundo
        bgAudioRef.current?.pause();

        // 2. Toca som de giro (reinicia o tempo para 0 caso já tenha tocado)
        if (spinAudioRef.current) {
          spinAudioRef.current.currentTime = 0;
          spinAudioRef.current.play();
        }

        setMustSpin(true);
      }
    } catch (error) {
      console.error("Erro na API:", error);
      // Fallback para teste
      const randomIndex = Math.floor(Math.random() * data.length);
      setPrizeNumber(randomIndex);

      // Lógica de som para o fallback também
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

    // --- FIM DO GIRO ---
    // 1. Para som de giro
    spinAudioRef.current?.pause();

    // 2. Toca som de vitória
    if (winAudioRef.current) {
      winAudioRef.current.currentTime = 0;
      winAudioRef.current.play();
    }

    // Delay para mostrar o alerta, para dar tempo de ouvir o "Tcharam!"
    setTimeout(() => {
      alert(`Sorteado: ${data[prizeNumber].option}`);

      // 3. (Opcional) Retomar música de fundo após fechar o alerta
      bgAudioRef.current?.play();
    }, 500);
  };

  return (
    <Container onClick={ensureAudioContext}>
      {/* O onClick no Container ajuda a desbloquear o áudio se o usuário clicar fora da roleta */}

      <WheelWrapper>
        <Seta />
        <RotateContainer>
          <Wheel
            mustStartSpinning={mustSpin}
            prizeNumber={prizeNumber}
            data={data}
            onStopSpinning={handleStopSpinning} // Usando a nova função com áudio

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

      <h2 style={{ color: 'white', marginTop: '150px', fontSize: '24px' }}>
        Toque no centro para girar!
      </h2>
    </Container>
  );
}
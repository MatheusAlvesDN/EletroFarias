'use client';
import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import dynamic from "next/dynamic";

const Wheel = dynamic(
  () => import("react-custom-roulette").then((m) => m.Wheel),
  { ssr: false }
);

const TRANSPARENT_PIXEL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

// --- Estilos de Overlay e Modais ---

const OverlayContainer = styled.div`
  position: absolute;
  top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50; /* Acima da roleta */
  backdrop-filter: blur(4px); /* Suave desfoque no fundo */
`;

const LoginBox = styled.div`
  background: white;
  padding: 40px;
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.5);
  border: 4px solid #f2c94c;
  
  h2 { color: #1b5e20; margin: 0; font-size: 24px; text-align: center; }
  
  input { 
    padding: 15px; 
    color: #000000; /* CORRIGIDO AQUI: de font-color para color */
    border: 2px solid #1b5e20; 
    border-radius: 10px; 
    font-size: 18px; 
    text-align: center;
    width: 200px;
    letter-spacing: 2px;
    background-color: #ffffff; /* Garante fundo branco para contraste */
  }

  button { 
    background: #1b5e20; 
    color: white; 
    padding: 12px 30px; 
    border: none; 
    border-radius: 10px; 
    cursor: pointer; 
    font-weight: bold; 
    font-size: 16px; 
    transition: background 0.2s;
    &:hover { background: #2e7d32; }
  }
`;

const ModalContent = styled.div`
  background: white;
  padding: 40px;
  border-radius: 20px;
  text-align: center;
  max-width: 400px;
  border: 6px solid #f2c94c;
  animation: popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);

  @keyframes popIn {
    from { transform: scale(0.8); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
  }

  h2 { color: #1b5e20; margin-bottom: 10px; font-size: 28px; }
  p { font-size: 18px; color: #000000; margin-bottom: 5px;}
  h1 { color: #1b5e20; margin: 10px 0 30px 0; font-size: 32px; text-transform: uppercase; }
  
  button { 
    background: #1b5e20; color: white; border: none; 
    padding: 12px 40px; border-radius: 10px; cursor: pointer; 
    font-weight: bold; font-size: 16px;
  }
`;

// --- Dados e Estrutura Base ---
const data = [
  { id: 10, option: 'Caixinha Bluetooth', style: { backgroundColor: '#FFFFFF', textColor: '#004d00' } },
  { id: 9, option: 'Parafusadeira (21190)', style: { backgroundColor: '#004d00', textColor: '#FFFFFF' } },
  { id: 8, option: 'Celular', style: { backgroundColor: '#FFFFFF', textColor: '#004d00' } },  
  { id: 7, option: 'Parafusadeira (21267)', style: { backgroundColor: '#004d00', textColor: '#FFFFFF' } },
  { id: 6, option: 'Projetor', style: { backgroundColor: '#FFFFFF', textColor: '#004d00'  } },
  { id: 5, option: 'Amperímetro', style: { backgroundColor: '#004d00', textColor: '#FFFFFF' } },
  { id: 4, option: 'Squeeze', style:{ backgroundColor: '#FFFFFF', textColor: '#004d00' } },
  { id: 3, option: 'Kit Ferramentas', style: { backgroundColor: '#004d00', textColor: '#FFFFFF' }},
  { id: 2, option: 'Voucher 10%', style: { backgroundColor: '#FFFFFF', textColor: '#004d00' } },
  { id: 1, option: 'Voucher 5%', style: { backgroundColor: '#004d00', textColor: '#FFFFFF' }},
];

const Container = styled.div`
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  min-height: 100vh; background-color: #1b5e20; font-family: sans-serif; overflow: hidden; position: relative;
`;

const Mascote = styled.img`
  position: fixed; bottom: 0; left: 20px; height: 30vh; width: auto; z-index: 5; pointer-events: none;
  @media (max-width: 1000px) { height: 20vh; }
`;

const WheelWrapper = styled.div<{ blur?: boolean }>`
  position: relative; display: flex; justify-content: center; align-items: center;
  background-color: #f2c94c; padding: 10px; border-radius: 50%;
  box-shadow: 0 0 50px rgba(0,0,0,0.5); transform: scale(1.4); 
  z-index: 10;
  filter: ${props => props.blur ? 'blur(5px)' : 'none'};
  transition: filter 0.3s ease;
`;

const RotateContainer = styled.div` transform: rotate(-45deg); display: flex; justify-content: center; align-items: center; `;

const CenterLogo = styled.div`
  position: absolute; width: 80px; height: 80px; background: white; border-radius: 50%;
  z-index: 11; display: flex; align-items: center; justify-content: center;
  border: 4px solid #f2c94c; cursor: pointer; box-shadow: 0 4px 10px rgba(0,0,0,0.3);
  transition: transform 0.2s ease;
  &:active { transform: scale(0.95); }
  img { width: 80%; object-fit: contain; }
`;

const Seta = styled.div`
  position: absolute; top: -20px; left: 50%; transform: translateX(-50%);
  z-index: 20; width: 0; height: 0; border-left: 20px solid transparent;
  border-right: 20px solid transparent; border-top: 40px solid #ff3e3e;
  filter: drop-shadow(0px 4px 4px rgba(0,0,0,0.5)); pointer-events: none; 
`;

export default function RoletaEletroFarias() {
  const [mustSpin, setMustSpin] = useState(false);
  const [prizeNumber, setPrizeNumber] = useState(0);
  const [codigo, setCodigo] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const bgAudioRef = useRef<HTMLAudioElement | null>(null);
  const spinAudioRef = useRef<HTMLAudioElement | null>(null);
  const winAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    bgAudioRef.current = new Audio('/sounds/background.mp3');
    bgAudioRef.current.loop = true;
    bgAudioRef.current.volume = 0.4;
    spinAudioRef.current = new Audio('/sounds/spin.mp3');
    spinAudioRef.current.loop = true;
    winAudioRef.current = new Audio('/sounds/win.wav');
    
    return () => {
      bgAudioRef.current?.pause();
      spinAudioRef.current?.pause();
    };
  }, []);

  const handleValidarCodigo = async () => {
    if (!codigo) return;
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '';
      const response = await fetch(`${API_BASE}/sync/validarCodigoRoleta?codigo=${codigo}`);
      const isValid = await response.json();

      if (isValid === true) {
        setIsAuthorized(true);
        bgAudioRef.current?.play().catch(() => {});
      } else {
        alert("Código inválido ou já utilizado.");
      }
    } catch (error) {
      console.error("Erro ao validar:", error);
      alert("Erro na conexão com o servidor.");
    }
  };

  const handleSpinClick = async () => {
    if (mustSpin || !isAuthorized) return;

    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '';
      const response = await fetch(`${API_BASE}/sync/valorRoleta`);
      const result = await response.json();
      const index = data.findIndex(item => item.id === result.valor);

      if (index !== -1) {
        setPrizeNumber(index);
        bgAudioRef.current?.pause();
        if (spinAudioRef.current) {
          spinAudioRef.current.currentTime = 0;
          spinAudioRef.current.play();
        }
        setMustSpin(true);
      }
    } catch (error) {
      setPrizeNumber(Math.floor(Math.random() * data.length));
      setMustSpin(true);
    }
  };

  const handleStopSpinning = () => {
    setMustSpin(false);
    spinAudioRef.current?.pause();
    winAudioRef.current?.play();
    setShowModal(true);
  };

  return (
    <Container>
      <Mascote src="/eletro_farias.png" alt="Mascote Eletro Farias" />

      {/* A roleta fica sempre aqui, mas recebe o prop 'blur' se não autorizado */}
      <WheelWrapper blur={!isAuthorized}>
        <Seta />
        <RotateContainer>
          <Wheel
            mustStartSpinning={mustSpin}
            prizeNumber={prizeNumber}
            data={data}
            onStopSpinning={handleStopSpinning}
            outerBorderWidth={0}
            radiusLineColor="#dedede"
            fontSize={12}
            pointerProps={{ src: TRANSPARENT_PIXEL, style: { width: '1px' } }}
          />
        </RotateContainer>
        <CenterLogo onClick={handleSpinClick}>
          <img src="/eletro_farias.png" alt="Girar" />
        </CenterLogo>
      </WheelWrapper>

      {/* Camada de Login (Aparece por cima enquanto não autorizado) */}
      {!isAuthorized && (
        <OverlayContainer>
          <LoginBox>
            <h2>Bem-vindo! <br/> Digite seu código para girar</h2>
            <input 
              type="text" 
              placeholder="Código" 
              value={codigo} 
              onChange={(e) => setCodigo(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleValidarCodigo()}
            />
            <button onClick={handleValidarCodigo}>VALIDAR CÓDIGO</button>
          </LoginBox>
        </OverlayContainer>
      )}

      {/* Modal de Resultado (Aparece após o giro) */}
      {showModal && (
        <OverlayContainer>
          <ModalContent>
            <h2>🎉 PARABÉNS! 🎉</h2>
            <p>Você ganhou:</p>
            <h1>{data[prizeNumber].option}</h1>
            <button onClick={() => { 
              setShowModal(false); 
              setIsAuthorized(false); 
              setCodigo(''); 
            }}>
              JOGAR NOVAMENTE
            </button>
          </ModalContent>
        </OverlayContainer>
      )}
    </Container>
  );
}
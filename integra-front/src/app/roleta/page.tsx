'use client';
import React, { useState } from 'react';
import { Wheel } from 'react-custom-roulette';
import styled from 'styled-components';

// Pixel transparente para esconder a seta padrão da biblioteca e usar a nossa customizada
const TRANSPARENT_PIXEL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

const data = [
  { id: 1, option: 'Amperímetro', style: { backgroundColor: '#FFFFFF', textColor: '#004d00' } },
  { id: 2, option: 'Garrafa de Água', style: { backgroundColor: '#004d00', textColor: '#FFFFFF' } },
  { id: 3, option: 'Voucher 5%', style: { backgroundColor: '#FFFFFF', textColor: '#004d00' } },
  { id: 4, option: 'Voucher 10%', style: { backgroundColor: '#004d00', textColor: '#FFFFFF' } },
  { id: 5, option: 'Kit Ferramentas', style: { backgroundColor: '#FFFFFF', textColor: '#004d00' } },
  { id: 6, option: 'Projetor Clube', style: { backgroundColor: '#004d00', textColor: '#FFFFFF' } },
  { id: 7, option: 'Celular Clube', style: { backgroundColor: '#FFFFFF', textColor: '#004d00' } },
  { id: 8, option: 'Parafusadeira (21190)', style: { backgroundColor: '#004d00', textColor: '#FFFFFF' } },
  { id: 9, option: 'Parafusadeira (21267)', style: { backgroundColor: '#FFFFFF', textColor: '#004d00' } },
];

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background-color: #051a14;
  font-family: sans-serif;
  overflow: hidden; /* Evita barras de rolagem se a roleta for muito grande */
`;

const WheelWrapper = styled.div`
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #f2c94c; 
  padding: 15px; /* Aumentei um pouco a borda dourada */
  border-radius: 50%;
  box-shadow: 0 0 50px rgba(0,0,0,0.5);
`;

const CenterLogo = styled.div`
  position: absolute;
  width: 140px; /* Aumentado para acompanhar a roleta */
  height: 140px;
  background: white;
  border-radius: 50%;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 5px solid #f2c94c;
  cursor: pointer;
  box-shadow: 0 4px 10px rgba(0,0,0,0.3);
  transition: transform 0.2s ease;

  &:active { transform: scale(0.95); }

  img {
    width: 80%;
    object-fit: contain;
  }
`;

// Criação de uma Seta Customizada para garantir alinhamento perfeito
const Seta = styled.div`
  position: absolute;
  top: -25px; /* Posiciona para sobrepor a borda */
  z-index: 20;
  width: 0;
  height: 0;
  border-left: 25px solid transparent;
  border-right: 25px solid transparent;
  border-top: 50px solid #ff3e3e; /* Cor da seta (Vermelho vibrante) */
  filter: drop-shadow(0px 4px 4px rgba(0,0,0,0.5));
  pointer-events: none; /* Deixa o clique passar para a roleta se necessário */
`;

export default function RoletaEletroFarias() {
  const [mustSpin, setMustSpin] = useState(false);
  const [prizeNumber, setPrizeNumber] = useState(0);

  const handleSpinClick = async () => {
    if (mustSpin) return;
    try {
      // Exemplo de chamada API
      const response = await fetch('http://localhost:3001/sync/valorRoleta');
      const result = await response.json(); 
      const index = data.findIndex(item => item.id === result.valor);
      
      if (index !== -1) {
        setPrizeNumber(index);
        setMustSpin(true);
      }
    } catch (error) {
      console.error("Erro na API:", error);
      // Fallback para teste caso a API falhe (remove em produção se quiser)
      const randomIndex = Math.floor(Math.random() * data.length);
      setPrizeNumber(randomIndex);
      setMustSpin(true);
    }
  };

  return (
    <Container>
      <WheelWrapper>
        {/* Seta Customizada posicionada no topo do Wrapper */}
        <Seta />

        <Wheel
          mustStartSpinning={mustSpin}
          prizeNumber={prizeNumber}
          data={data}
          onStopSpinning={() => {
            setMustSpin(false);
            alert(`Sorteado: ${data[prizeNumber].option}`);
          }}
          
          // --- Configurações de Tamanho ---
          //radius={300}        // Aumenta drasticamente o tamanho (Raio 300 = Diâmetro 600px)
          innerRadius={20}    // Pequeno furo no meio (coberto pela logo)
          
          // --- Configurações Visuais ---
          outerBorderWidth={0}
          radiusLineColor="#dedede"
          radiusLineWidth={1}
          fontSize={22}       // Aumentei a fonte para combinar com a roleta grande
          textDistance={85}   // Distância do texto em relação ao centro
          
          // --- Truque para esconder a seta padrão da biblioteca ---
          pointerProps={{
            src: TRANSPARENT_PIXEL,
            style: { width: '1px', height: '1px' } // Garante que não ocupe espaço visual
          }}
        />

        <CenterLogo onClick={handleSpinClick}>
          <img src="/eletro_farias.png" alt="Girar" />
        </CenterLogo>
      </WheelWrapper>
      
      <h2 style={{ color: 'white', marginTop: '40px', fontSize: '24px' }}>
        Toque no centro para girar!
      </h2>
    </Container>
  );
}
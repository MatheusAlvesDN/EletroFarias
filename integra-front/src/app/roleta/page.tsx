'use client';
import React, { useState } from 'react';
import { Wheel } from 'react-custom-roulette';
import styled from 'styled-components';

// Definição dos itens da roleta conforme sua lista
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
  background-color: #0b2b22; /* Fundo verde escuro */
  font-family: sans-serif;
`;

const WheelContainer = styled.div`
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  border: 15px solid #f2c94c; /* Borda amarela da roleta */
  border-radius: 50%;
  box-shadow: 0 0 30px rgba(0,0,0,0.5);
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
  transition: transform 0.1s active;

  &:active {
    transform: scale(0.95);
  }

  img {
    width: 80%;
    object-fit: contain;
  }
`;

const Arrow = styled.div`
  position: absolute;
  top: -35px;
  width: 0;
  height: 0;
  border-left: 20px solid transparent;
  border-right: 20px solid transparent;
  border-top: 40px solid #ff0000; /* Seta vermelha */
  z-index: 20;
`;

export default function RoletaEletroFarias() {
  const [mustSpin, setMustSpin] = useState(false);
  const [prizeNumber, setPrizeNumber] = useState(0);

  const handleSpinClick = async () => {
    if (mustSpin) return;

    try {
      // Chamada ao seu serviço NestJS
      const response = await fetch('http://localhost:3001/sync/valorRoleta');
      const result = await response.json(); 
      
      // Encontra o índice baseado no ID retornado (1 a 9)
      const newPrizeNumber = data.findIndex(item => item.id === result.valor);
      
      if (newPrizeNumber !== -1) {
        setPrizeNumber(newPrizeNumber);
        setMustSpin(true);
      }
    } catch (error) {
      console.error("Erro ao buscar valor:", error);
      alert("Erro ao girar a roleta. Tente novamente.");
    }
  };

  return (
    <Container>
      <WheelContainer>
        <Arrow />
        <Wheel
          mustStartSpinning={mustSpin}
          prizeNumber={prizeNumber}
          data={data}
          onStopSpinning={() => {
            setMustSpin(false);
            alert(`Sorteado: ${data[prizeNumber].option}`);
          }}
          outerBorderWidth={0}
          radiusLineColor="#ccc"
          radiusLineWidth={1}
          innerRadius={20}
        />
        <CenterLogo onClick={handleSpinClick}>
          <img src="/eletro_farias.png" alt="Logo" />
        </CenterLogo>
      </WheelContainer>
      <h2 style={{ color: 'white', marginTop: '30px' }}>Toque no centro para girar!</h2>
    </Container>
  );
}
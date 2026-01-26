'use client';
import React, { useState } from 'react';
import { Wheel } from 'react-custom-roulette';
import styled from 'styled-components';

const data = [
  { id: 1, option: 'Amperímetro', style: { backgroundColor: '#FFFFFF', textColor: '#004d00' } },
  { id: 2, option: 'Garrafa de Água', style: { backgroundColor: '#004d00', textColor: '#FFFFFF' } },
  { id: 3, option: 'Voucher 5%', style: { backgroundColor: '#FFFFFF', textColor: '#004d00' } },
  { id: 4, option: 'Voucher 10%', style: { backgroundColor: '#004d00', textColor: '#FFFFFF' } },
  { id: 5, option: 'Kit Ferramentas', style: { backgroundColor: '#FFFFFF', textColor: '#004d00' } },
  { id: 6, option: 'Projetor Clube', style: { backgroundColor: '#004d00', textColor: '#FFFFFF' } },
  { id: 7, option: 'Celular Clube', style: { backgroundColor: '#FFFFFF', textColor: '#004d00' } },
  { id: 8, option: 'Parafusadeira', style: { backgroundColor: '#004d00', textColor: '#FFFFFF' } },
  { id: 9, option: 'Parafusadeira', style: { backgroundColor: '#FFFFFF', textColor: '#004d00' } },
];

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background-color: #0b2b22;
  font-family: sans-serif;
`;

const WheelContainer = styled.div`
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  /* Borda amarela aumentada proporcionalmente */
  border: 20px solid #f2c94c; 
  border-radius: 50%;
  box-shadow: 0 0 50px rgba(0,0,0,0.6);
  
  /* Container da roleta maior */
  width: 600px; 
  height: 600px;
`;

const CenterLogo = styled.div`
  position: absolute;
  width: 120px; /* Aumentado de 100px para 120px */
  height: 120px;
  background: white;
  border-radius: 50%;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 5px solid #f2c94c;
  cursor: pointer;
  box-shadow: 0 4px 10px rgba(0,0,0,0.3);
  transition: transform 0.1s ease;

  &:active {
    transform: scale(0.92);
  }

  img {
    width: 85%;
    object-fit: contain;
  }
`;

const Arrow = styled.div`
  position: absolute;
  top: -45px; /* Ajustado para o novo tamanho */
  width: 0;
  height: 0;
  border-left: 25px solid transparent;
  border-right: 25px solid transparent;
  border-top: 50px solid #ff0000;
  z-index: 20;
`;

export default function RoletaEletroFarias() {
  const [mustSpin, setMustSpin] = useState(false);
  const [prizeNumber, setPrizeNumber] = useState(0);

  const handleSpinClick = async () => {
    if (mustSpin) return;

    try {
      const response = await fetch('http://localhost:3001/sync/valorRoleta');
      const result = await response.json(); 
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
          // Ajustes de tamanho e remoção da seta duplicada
          //width={600} 
          //height={600}
          pointerProps={{ style: { display: 'none' } }} 
          
          outerBorderWidth={0}
          radiusLineColor="#ccc"
          radiusLineWidth={1}
          innerRadius={20}
          fontSize={16} // Aumentado para melhor leitura
          textDistance={85}
        />
        <CenterLogo onClick={handleSpinClick}>
          <img src="/eletro_farias.png" alt="Logo" />
        </CenterLogo>
      </WheelContainer>
      <h2 style={{ color: 'white', marginTop: '40px', fontSize: '24px' }}>
        Toque no centro para girar!
      </h2>
    </Container>
  );
}
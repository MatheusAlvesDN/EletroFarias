export interface PedidoExpedicao {
  NUNOTA: number;
  NUMNOTA: number;
  PARCEIRO: string;
  VENDEDOR: string;
  DTALTER: string;
  HRALTER: string;
  TIPONEGOCIACAO: string;
  TIPO_ENTREGA: string;
  STATUS_NOTA_DESC: string;
  STATUS_CONFERENCIA_DESC: string;
  BKCOLOR: string;
  FGCOLOR: string;
  ORDEM_TIPO_PRI: number;
}

const API_URL = 'http://localhost:3000/sync/pedidosLid';

export const getPedidosExpedicao = async (): Promise<PedidoExpedicao[]> => {
  const response = await fetch(API_URL);
  if (!response.ok) {
    throw new Error('Falha ao buscar dados do painel.');
  }
  return response.json();
};
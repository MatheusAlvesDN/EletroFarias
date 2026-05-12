const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export type EntradaPendente = {
  NUNOTA?: string | number;
  NUMNOTA?: string | number;
  STATUSPENDENTE?: string;
  PENDENTE?: string;
  DHTIPOPER?: string;
  ATUALIZACAO?: string;
  CODTIPOPER?: string | number;
};

export const estoqueService = {
  async getPedidosPendentesProduto(codProd: number) {
    const params = new URLSearchParams({
      codProd: String(codProd),
      tops: '300,344,442',
      pendente: 'S'
    });

    const response = await fetch(`${API_BASE}/database/pedidos-pendentes-produto?${params.toString()}`);
    if (!response.ok) throw new Error('Erro ao buscar pedidos pendentes do produto');

    const data = await response.json();
    return Array.isArray(data) ? (data as EntradaPendente[]) : [];
  }
};

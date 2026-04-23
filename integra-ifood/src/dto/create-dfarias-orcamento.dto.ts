export type RowData = {
  id: number;
  left: { id: string; value: string }[];
  right: { id: string; value: string }[];
};

export type OrcamentoItemDto = {
  category: 'CABO' | 'DISJUNTOR';
  product: string;
  qty: number;
  unit: string;
};

export class CreateDfariasOrcamentoDto {
  nome!: string;
  layout!: RowData[];
  quadros?: {
    id: number;
    nome: string;
    tipo?: string;
    layout: RowData[];
  }[];
  orcamentoEstruturado?: {
    totalQuadros: number;
    totalItens: number;
    totalPreenchidos: number;
    quadros: {
      id: number;
      nome: string;
      tipo?: string;
      totalItens: number;
      totalPreenchidos: number;
      itens: OrcamentoItemDto[];
      layout: RowData[];
    }[];
  };
  itens!: OrcamentoItemDto[];
  totalItens!: number;
  totalPreenchidos!: number;
  totalQuadros?: number;
  prazoEntrega?: number | null;
}

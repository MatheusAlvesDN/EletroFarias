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
  itens!: OrcamentoItemDto[];
  totalItens!: number;
  totalPreenchidos!: number;
}
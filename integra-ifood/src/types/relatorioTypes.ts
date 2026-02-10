
export interface ItemImpostoIncentivo {
  SEQUENCIA: number;
  NUNOTA: number;
  NUMNOTA: number;
  PRODUTO: string; // Concatenação COD - DESC
  NCM: string;
  DTNEG: string; // Ou Date, dependendo de como seu parser trata
  DTENTSAI: string;
  CODCFO: number;
  CODIMP: number;
  BASE: number;
  ALIQUOTA: number;
  VALOR: number;
  CST: number;
}
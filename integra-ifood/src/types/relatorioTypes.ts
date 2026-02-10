
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


export interface IncentivoResumoParceiro {
  CODPARC: number;
  NOMEPARC: string;
  AD_TIPOCLIENTEFATURAR: string; // Descrição textual (Construtora, Pessoa Física, etc.)
  QTD_NOTAS: number;
  TOTAL: number;          // Faturamento Líquido Total
  TOTAL_ST: number;       // Parte do total que é ST
  TOTAL_TRIB: number;     // Parte do total que é Tributado
  ST_IND_PB: number;      // Parte do ST que é Indústria PB
  TRIB_IND_PB: number;    // Parte do Trib que é Indústria PB
  VALOR_RESTANTE: number; // O que sobra (Não PB)
  
  // Campos de cor do Gadget (Opcionais, úteis se for pintar o front)
  BK_ST?: string;
  FG_ST?: string;
  BK_TRIB?: string;
  FG_TRIB?: string;
}

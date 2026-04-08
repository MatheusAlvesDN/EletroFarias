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

export type NotaConferenciaRow = {
  ordemLinha: number;
  bkcolor: string;
  fgcolor: string;

  nunota: number;
  numnota: number;
  codtipoper: number;
  descroper: string;

  dtneg: string;
  hrneg: string;
  codparc: number;
  parceiro: string;
  vlrnota: number;

  codvend: number;
  vendedor: string;

  adTipoDeEntrega: string | null;
  tipoEntrega: string;

  statusNota: string;
  statusNotaDesc: string;
  adSeparacao: string;

  libconf: string | null;

  statusConferenciaCod: string | null;
  statusConferenciaDesc: string | null;

  qtdRegConferencia: number;
  codProj?: number;
  descProj?: string | null;
};

export type NotaExpedicaoRow = {
  nunota: number;
  ordemLinha: number;

  dtneg: string;
  hrneg: string;

  statusNota: string;
  statusNotaDesc: string;

  statusConferenciaCod: string | null;
  qtdRegConferencia: number;

  bkcolor: string;
  fgcolor: string;

  vlrnota: number;
  adTipoDeEntrega: string | null;

  codvend: number;
  vendedor: string;

  codtipoper: number;

  parceiro: string;

  adSeparacaoLoc2: string | null;
};

export type NotaSeparacaoRow = {
  nunota: number;
  ordemLinha: number;

  dtneg: string;
  hrneg: string | null;

  statusNota: string;
  statusNotaDesc: string;

  statusConferenciaCod: string | null;
  statusConferenciaDesc: string | null;

  qtdRegConferencia: number;

  bkcolor: string;
  fgcolor: string;

  vlrnota: number;
  adTipoDeEntrega: string | null;

  codvend: number;
  vendedor: string;

  codtipoper: number;
  parceiro: string;
};

export type NotaDfariasRow = {
  nunota: number;
  ordemLinha: number;

  dtneg: string;
  hrneg: string | null;

  statusNota: string;
  statusNotaDesc: string;

  statusConferenciaCod: string | null;
  statusConferenciaDesc: string | null;

  qtdRegConferencia: number;

  bkcolor: string;
  fgcolor: string;

  vlrnota: number;
  adTipoDeEntrega: string | null;

  codvend: number;
  vendedor: string;

  codtipoper: number;
  parceiro: string;

  codproj: number;
  descproj: string;
};

export type NotaTVRow = {
  nunota: number;
  ordemLinha: number;

  bkcolor: string;
  fgcolor: string;

  dtneg: string;
  hrneg: string | null;

  numnota: number;
  codparc: number;
  parceiro: string;

  codvend: number;
  vendedor: string;

  codtipoper: number;

  adTipoDeEntrega: string | null;
  tipoEntrega: string;

  statusNota: string;
  statusNotaDesc: string;

  statusConferenciaCod: string | null;
  statusConferenciaDesc: string | null;

  qtdRegConferencia: number;
  vlrnota: number;
};

export type ItemLoc2Row = {
  bkcolor: string;
  fgcolor: string;

  adTipoDeEntrega: string | null;
  tipoEntrega: string;

  nunota: number;
  sequencia: number;

  codprod: number;
  descrprod: string;
  codgrupoprod: number;

  codvol: string;
  qtdneg: number;
  vlrunit: number;
  vlrtot: number;

  localizacao2: string | null;
  adSeparacaoLoc2: string | null;
  dtalter: string;
  hralter: string;
  referencia?: string | null;

};

//#region Cabos

export type FilaCabosRow = {
  // ordem/cores
  ordemLinha: number;       // ORDEM_GERAL
  bkcolor: string;          // BKCOLOR
  fgcolor: string;          // FGCOLOR
  ordemTipoPri: number;     // ORDEM_TIPO_PRI
  ordemTipo: number;        // ORDEM_TIPO

  // cabeçalho/pedido
  nunota: number;
  numnota: number;
  codtipoper: number;
  descroper: string;

  dtalter: string;          // DTALTER (TRUNC)
  hralter: string;          // HRALTER (HH24:MI:SS)

  codparc: number;
  parceiro: string;

  vlrnota: number;

  codvend: number;
  vendedor: string;

  adTipoDeEntrega: string | null; // CAB.AD_TIPODEENTREGA
  tipoEntrega: string;

  statusNota: string;       // CAB.STATUSNOTA
  statusNotaDesc: string;

  libconf: string | null;

  // conferência
  statusConferenciaCod: string | null;  // MAX(CON.STATUS)
  statusConferenciaDesc: string | null;
  qtdRegConferencia: number;

  // item
  sequencia: number;
  codprod: number;
  descrprod: string;
  codgrupoprod: number;
  codvol: string;
  qtdneg: number;
  vlrunit: number;
  vlrtot: number;
  impresso: string;
  localizacao: string;
  ad_localizacao: string;
};

//#endregion

//#region Lid

export type PendenciaEstoque = {
  nunota: number;
  numnota: number;
  descroper: string;
  dtalter: string;
  hralter: string;
  parceiro: string;
  vendedor: string;
  descrprod: string;
  estoque_atual: number;
  qtd_negociada: number;
  qtd_pendente_calc: number;
  codprod: number;
  sequencia: number;
  adimpresso: string;
  bkcolor?: string;
  fgcolor?: string;
};

//#endregion



export interface FilaVirtualRow {
  nunota: number;
  numnota: number;
  codparc: number;
  cliente: string;
  celular: string; // Essencial para o disparo do link
  vendedor: string;
  tipoEntrega: string;
  statusFila: 'FILA' | 'SEPARANDO' | 'CONFERENCIA';
  dtneg: string;
  hrneg: string | null;
}

export interface NotaPendenteRow {
  nunota: number;
  numnota: number;
  dtneg: string;
  dtprevent: string;
  codemp: number;
  codparc: number;
  razaosocial: string;
  codtipoper: number;
  vlrnota: number;
}

export interface SalesNoteWithCustoRow {
  nunota: number;
  numnota: number;
  dtneg: string;
  codemp: number;
  codparc: number;
  razaosocial: string;
  codtipoper: number;
  codvend: number;
  vendedor: string;
  codgerente: number;
  gerente: string;
  vlrnota: number;
  vlrdesctot: number;
  vlrnota_liq: number;
  vlrcusto: number;
  margem_valor: number;
  custos_fixos: number;
  lucro: number;
}

export interface ProdutoGiroRow {
    codprod: number;
    descrprod: string;
    estoqueAtual: number;
    vendasPeriodo: number;
    mediaDiaria: number;
    diasRestantes: number | null;
    tempoReposicao: number | null;
    statusEstoque: 'CRITICO' | 'ATENCAO' | 'SEGURO' | 'SEM_SAIDA';
    totalPedidos: number;
    mediaPorPedido: number;
    qtdPedidaPendente: number;
}

export interface PedidoProdutoRow {
  numnota: number;
  dtneg: string;
  cliente: string;
  qtd: number;
}
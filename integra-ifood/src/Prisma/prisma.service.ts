import { Injectable, OnModuleInit, OnModuleDestroy, BadRequestException } from '@nestjs/common';
import { Prisma, PrismaClient, Role, AndamentoDemanda } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const RESET_DATE = '1987-11-23T14:01:48.190Z';
const ALT_DATE = '1981-11-23T14:01:48.190Z';

type ItemSolicitacao = {
  codProduto: number;
  quantidade: number;
  descricao: string;
};

type Localizacoes = {
  Rua: string;
  Predio: string;
  Nivel: string;
  Apartamento: string;
  Endereco: string;
  Armazenamento: string;
};

function toRole(value: unknown): Role {
  const v = String(value).toUpperCase();
  if (v in Role) return Role[v as keyof typeof Role];
  throw new Error('Role inválida');
}

function toAndamentoDemanda(v: string): AndamentoDemanda {
  const raw = String(v ?? '').trim();

  if ((Object.values(AndamentoDemanda) as string[]).includes(raw)) {
    return raw as AndamentoDemanda;
  }

  const map: Record<string, AndamentoDemanda> = {
    'aberto': 'Aberto',
    'em andamento': 'EmAndamento',
    'emandamento': 'EmAndamento',
    'finalizado': 'Finalizado',
    'abandonado': 'Abandonado',
    'pausado': 'Pausado',
  };

  const key = raw.toLowerCase();
  const converted = map[key];
  if (!converted) throw new Error(`Andamento inválido: ${v}`);

  return converted;
}

// 1. EXTENDER PRISMA CLIENT PARA GERENCIAR A CONEXÃO E MEMÓRIA CORRETAMENTE
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {

  
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async createUser(email: string, password: string) {
    const passwordHash = await bcrypt.hash(password, 12);
    return this.user.create({ data: { email, passwordHash } });
  }

  async findByEmail(email: string) {
    return this.user.findUnique({ where: { email } });
  }

  async createRegisterReward(idVoucher: string, cpf: string, value_r: number | Prisma.Decimal) {
    const valueDec = value_r instanceof Prisma.Decimal ? value_r : new Prisma.Decimal(value_r);
    return this.rewardsFidelimax.create({
      data: { idVoucher, cpf, value: valueDec },
    });
  }

  async deleteReward(idVoucher: string) {
    return this.rewardsFidelimax.delete({ where: { idVoucher } });
  }

  async findReward(idVoucher: string) {
    return this.rewardsFidelimax.findUnique({ where: { idVoucher } });
  }

  async registerDebit(cpf: string, value: number, desc: string, nomeParc: string, nunota: string) {
    return this.debitInvalidLog.create({
      data: {
        cpf,
        debitoReais: value,
        descricaoEstorno: desc,
        nome: nomeParc,
        nunota,
        dataMov: new Date(),
      },
    });
  }

  async findDebit(cpf: string) {
    return this.debitInvalidLog.findFirst({
      where: cpf ? { cpf } : undefined,
      orderBy: { dataMov: 'desc' },
    });
  }

  async addDebit(id: string, addValue: number) {
    return this.debitInvalidLog.update({
      where: { id },
      data: { debitoReais: { increment: addValue } },
    });
  }

  async deleteDebit(id: string) {
    return this.debitInvalidLog.delete({ where: { id } });
  }

  async reduceDebit(id: string, removeValue: number) {
    const value = Number(removeValue);
    if (isNaN(value)) throw new Error('removeValue inválido');

    return this.debitInvalidLog.update({
      where: { id },
      data: { debitoReais: { increment: -value } },
    });
  }

  //#region Inventory
  async addCount(codProd: number, count: number, inStock: number, userEmail: string, descricao: string, localizacao: string) {
    this.updateCount(localizacao, codProd);
    return this.inventory.create({
      data: { codProd, count, inStock, inplantedDate: RESET_DATE, descricao, userEmail, localizacao },
    });
  }

  async addCount2(codProd: number, count: number, inStock: number, userEmail: string, descricao: string, localizacao: string, reservado: number) {
    return this.inventory.create({
      data: { codProd, count, inStock, inplantedDate: RESET_DATE, descricao, userEmail, localizacao, reservado },
    });
  }

  async getInventoryWhere(codProd: number) {
    return this.inventory.findMany({ where: { codProd } });
  }

  async getInventory(id: string) {
    return this.inventory.findUnique({ where: { id } });
  }

  async getInventoryList() {
    return this.inventory.findMany();
  }

  async getProductsByLocation(localizacao: string) {
    return this.inventory.findMany({ where: { localizacao } });
  }

  async updateInventoryDate(id: string, inplantedDate: string, userEmail: string) {
    return this.$transaction(async (tx) => {
      const inventory = await tx.inventory.findUnique({ where: { id } });

      if (!inventory) {
        await this.createLogSync("Tentativa de ajuste de contagem", "FALHA", `Inventory com id=${id} não encontrado`, userEmail);
        throw new Error('Inventory não encontrado');
      }

      const itemsToCheck = await tx.inventory.findMany({
        where: {
          codProd: inventory.codProd,
          inplantedDate: RESET_DATE,
        },
      });

      const idsToUpdate = itemsToCheck
        .filter((item) => item.count !== item.inStock)
        .map((item) => item.id);

      if (idsToUpdate.length > 0) {
        await tx.inventory.updateMany({
          where: { id: { in: idsToUpdate } },
          data: { inplantedDate: ALT_DATE },
        });

        await this.createLogSync("Tentativa de ajuste de contagem", "FINALIZADO", `Inventory com id=${id} atualizado com inplantedDate=${inplantedDate}. Também atualizados IDs: ${idsToUpdate.join(', ')}`, userEmail);
        return tx.inventory.update({
          where: { id },
          data: { inplantedDate },
        });
      }
    });
  }

  async addNewCount(codProd: number, count: number, inStock: number, userEmail: string, descricao: string, localizacao: string, reservado: number) {
    return this.inventory.create({
      data: { codProd, count, inStock, inplantedDate: RESET_DATE, descricao, userEmail, localizacao, reservado, recontagem: true },
    });
  }

  async getCurvas() {
    return this.curvaProduto.findMany();
  }

  async getCurvaById(codProd: number) {
    return this.curvaProduto.findUnique({ where: { codProd } });
  }

  async updateCurva(codProd: number, curva: string, descricao: string) {
    return this.curvaProduto.upsert({
      where: { codProd },
      create: { codProd, descricao, curvaProduto: curva },
      update: { curvaProduto: curva },
    });
  }
  //#endregion

  //#region Estoque
  async createErroEstoque(userEmail: string, codProd: number, descricao: string) {
    return this.erroEstoque.create({ data: { userCreate: userEmail, descricao, codProd } });
  }

  async getAllErroEstoque() {
    return this.erroEstoque.findMany();
  }

  async correcaoErroEstoque() {
    return null;
  }

  async finalizarErroEstoque(id: string, descricao: string, userEmail: string) {
    return this.erroEstoque.update({
      where: { id },
      data: { resolvido: true, resposta: descricao, userResolve: userEmail, resolvedAt: new Date() },
    });
  }
  //#endregion

  //#region Auditoria
  async createAuditoria(codProd: number, count: number, inStock: number, reservado: number, userEmail: string, descricao: string) {
    return this.auditoria.create({
      data: { codProd, count, inStock, reservado, descricao, userEmail, diferenca: count - inStock  },
    });
  }

  async getAllAuditorias() {
    return this.auditoria.findMany();
  }

  async getAuditoriasByDate() {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return this.auditoria.findMany({
      where: { createdAt: { gte: since } },
      select: { codProd: true, createdAt: true },
    });
  }
  //#endregion

  //#region NotFound 
  async createNotFound(localizacao: string, produtosFaltando: number[], produtosContados: number[]) {
    return this.notFound.create({
      data: { localizacao, codProdContados: produtosContados, codProdFaltando: produtosFaltando }
    });
  }

  async updateNotFoundList(localizacao: string, produtosFaltando: number[], produtosContados: number[]) {
    return this.notFound.update({
      where: { localizacao },
      data: { codProdFaltando: { set: produtosFaltando }, codProdContados: { set: produtosContados } },
    });
  }

  async updateCount(localizacao: string, codProd: number) {
    return this.$transaction(async (tx) => {
      let notFound = await tx.notFound.findUnique({ where: { localizacao } });

      if (!notFound) {
        const produtosDaLocalizacao = await tx.inventory.findMany({
          where: { localizacao },
          select: { codProd: true },
        });

        const todosCods = Array.from(new Set(produtosDaLocalizacao.map((p) => p.codProd)));
        notFound = await tx.notFound.create({
          data: { localizacao, codProdFaltando: todosCods, codProdContados: [] },
        });
      }

      const faltandoSet = new Set(notFound.codProdFaltando);
      const contadosSet = new Set(notFound.codProdContados);

      faltandoSet.delete(codProd);
      contadosSet.add(codProd);

      return tx.notFound.update({
        where: { localizacao },
        data: {
          codProdFaltando: { set: Array.from(faltandoSet) },
          codProdContados: { set: Array.from(contadosSet) },
        },
      });
    });
  }

  async updateNotFound(items: number[], localizacao: string, codProd: number) {
    const notFound = await this.notFound.findUnique({ where: { localizacao } });
    const faltandoSet = notFound ? new Set(notFound.codProdFaltando) : new Set(items);
    const contadosSet = notFound ? new Set(notFound.codProdContados) : new Set<number>();

    faltandoSet.delete(codProd);
    contadosSet.add(codProd);

    const data = {
      codProdFaltando: { set: Array.from(faltandoSet) },
      codProdContados: { set: Array.from(contadosSet) },
    };

    if (!notFound) {
      return this.notFound.create({ data: { localizacao, ...data } });
    }
    return this.notFound.update({ where: { localizacao }, data });
  }

  async getNotFound(localizacao: string) {
    return this.notFound.findUnique({ where: { localizacao } });
  }

  async getNotFoundList() {
    return this.notFound.findMany();
  }

  async getMultiLocation() {
    return this.getInventoryList();
  }
  //#endregion

  //#region Login/Logout 
  async loginSession(userEmail: string) {
    const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000);
    const sessionExists = await this.session.findFirst({ where: { userEmail } });

    if (!sessionExists) {
      return this.session.create({ data: { userEmail, expiresAt } });
    } else {
      return this.session.updateMany({
        where: { userEmail },
        data: { active: true, expiresAt, lastSeen: new Date() },
      });
    }
  }

  async logoutSession(userEmail: string) {
    return this.session.updateMany({
      where: { userEmail },
      data: { active: false },
    });
  }

  async alterarSenha(email: string, senha: string) {
    const novaSenha = await bcrypt.hash(senha, 12);
    return this.user.update({
      where: { email },
      data: { passwordHash: { set: novaSenha } },
    });
  }

  async getLogins() {
    return this.session.findMany();
  }
  //#endregion

  //#region Triagem 
  async getSeparadores() {
    // 2. CORRIGIDO VAZAMENTO DE MEMÓRIA AQUI: Buscar apenas os separadores necessários (sem puxar todos os usuários à toa)
    const separadores = await this.user.findMany({
      where: { role: 'SEPARADOR' },
      select: { email: true } // Seleciona só o email para não entupir a memória
    });

    if (separadores.length === 0) return [];
    const emails = separadores.map((separador) => separador.email);

    return this.session.findMany({
      where: { active: true, userEmail: { in: emails } },
    });
  }

  async getPedidoSeparador(userEmail: string) {
    return this.pedidoSeparador.findMany({ where: { separador: userEmail } });
  }

  async adicionarSeparador(userEmail: string, region: string) {
    const estoque = await this.estoque.findUnique({ where: { region } });
    if (!estoque) throw new Error(`Estoque não encontrado para region=${region}`);

    const separadores = new Set(estoque.separadores);
    separadores.add(userEmail);

    return this.estoque.update({
      where: { region },
      data: { separadores: { set: Array.from(separadores) } },
    });
  }

  async removerSeparador(userEmail: string, region: string) {
    const estoque = await this.estoque.findUnique({ where: { region } });
    if (!estoque) throw new Error(`Estoque não encontrado para region=${region}`);

    const separadores = new Set(estoque.separadores);
    separadores.delete(userEmail);

    return this.estoque.update({
      where: { region },
      data: { separadores: { set: Array.from(separadores) } },
    });
  }

  async getEstoqueById(region: string) {
    if (!region) throw new Error('region é obrigatório');
    const estoque = await this.estoque.findUnique({ where: { region } });
    if (!estoque) throw new Error(`Estoque não encontrado para region=${region}`);
    return estoque.separadores;
  }

  async getEstoque() {
    return this.estoque.findMany();
  }
  //#endregion

  //#region Admin 
  async getUsuarios() {
    return this.user.findMany();
  }

  async changeRole(userEmail: string, role: string) {
    return this.user.update({
      where: { email: userEmail },
      data: { role: { set: toRole(role) } },
    });
  }

  async resetSenha(userEmail: string) {
    return this.user.update({
      where: { email: userEmail },
      data: { passwordHash: { set: await bcrypt.hash('123456', 12) } },
    });
  }

  async deleteUsuario(userEmail: string) {
    return this.user.delete({ where: { email: userEmail } });
  }
  //#endregion

  //#region Ajustes e Lançamentos de Notas

  // 3. CORRIGIDO VAZAMENTO DE MEMÓRIA NAS NOTAS: Filtramos o inNote direto no DB
  async getNotaPositiva() {
    const list = await this.inventory.findMany({
      where: {
        inNote: false, // Filtra direto no Banco!
        inplantedDate: { notIn: [new Date(ALT_DATE), new Date(RESET_DATE)], not: null },
      },
    });
    return list.filter((p) => (p.count + (p.reservado ?? 0)) > p.inStock);
  }

  async getNotaNegativa() {
    const list = await this.inventory.findMany({
      where: {
        inNote: false, // Filtra direto no Banco!
        inplantedDate: { notIn: [new Date(ALT_DATE), new Date(RESET_DATE)], not: null },
      },
    });
    return list.filter((p) => (p.count + (p.reservado ?? 0)) < p.inStock);
  }

  async getNotaPositivaCorrecao() {
    const list = await this.inventory.findMany({
      where: {
        inNote: true, // Filtra direto no Banco!
        inplantedDate: { notIn: [new Date(ALT_DATE), new Date(RESET_DATE)], not: null },
      },
    });
    return list.filter((p) => (p.count + (p.reservado ?? 0)) > p.inStock);
  }

  async getNotaNegativaCorrecao() {
    const list = await this.inventory.findMany({
      where: {
        inNote: true, // Filtra direto no Banco!
        inplantedDate: { notIn: [new Date(ALT_DATE), new Date(RESET_DATE)], not: null },
      },
    });
    return list.filter((p) => (p.count + (p.reservado ?? 0)) < p.inStock);
  }

  async incluirNota(produtos: { codProd: number; diference: number }[]) {
    if (!Array.isArray(produtos) || produtos.length === 0) {
      throw new BadRequestException('Lista de produtos vazia.');
    }

    const codProds = Array.from(new Set(produtos.map(p => Number(p?.codProd)).filter(c => Number.isFinite(c) && c > 0)));

    if (codProds.length === 0) throw new BadRequestException('Nenhum CODPROD válido para atualizar.');

    return this.inventory.updateMany({
      where: { codProd: { in: codProds } },
      data: { inNote: true },
    });
  }

  // 4. ELIMINADO LOOP DE CONSULTAS MASSIVAS
  async retornarProdutos(codProds: number[]) {
    // Isso substitui dezenas de idas e vindas ao banco de dados por apenas 1 comando.
    return this.inventory.updateMany({
      where: { codProd: { in: codProds } },
      data: { inNote: false }
    });
  }

  async resetInventoryAjust(id: string, inplantedDate: string) {
    return this.inventory.update({ where: { id }, data: { inNote: false } });
  }

  async resetInventoryDate(id: string, inplantedDate: string) {
    return this.inventory.update({ where: { id }, data: { inplantedDate } });
  }
  //#endregion

  //#region Solicitar Produtos 
  async solicitaProduto(userEmail: string, items: ItemSolicitacao[]) {
    if (!userEmail?.trim()) throw new BadRequestException('userEmail é obrigatório');
    if (!Array.isArray(items) || items.length === 0) throw new BadRequestException('items precisa ter ao menos 1 item');

    for (const [i, it] of items.entries()) {
      if (!Number.isFinite(it.codProduto)) throw new BadRequestException(`items[${i}].codProduto inválido`);
      if (!Number.isFinite(it.quantidade) || it.quantidade <= 0) throw new BadRequestException(`items[${i}].quantidade inválida`);
      if (!String(it.descricao ?? '').trim()) throw new BadRequestException(`items[${i}].descricao é obrigatória`);
    }

    return this.solicitacao.create({
      data: {
        userRequest: userEmail,
        items: {
          create: items.map((p) => ({
            codProd: p.codProduto,
            quantidade: p.quantidade,
            descricao: p.descricao,
          })),
        },
      },
      include: { items: true },
    });
  }

  // 5. CORRIGIDO: Puxar só as não aprovadas direto do banco (antes puxava TODAS do sistema e filtrava no JavaScript)
  async getSolicitacao() {
    return this.solicitacao.findMany({
      where: { aprovado: false }, // ✅ Filtro de Banco de Dados!
      include: { items: true }
    });
  }

  async getSolicitacaoUsuario(userEmail: string) {
    return this.solicitacao.findMany({
      where: { userRequest: userEmail },
      include: { items: true }
    });
  }

  async baixaSolicitacao(id: string, userEmail: string) {
    return this.solicitacao.update({
      where: { id },
      data: { aprovado: true, userAproved: userEmail, aprovedAt: new Date(), resposta: true },
    });
  }

  async reprovarSolicitacao(id: string, userEmail: string) {
    return this.solicitacao.update({
      where: { id },
      data: { aprovado: true, userAproved: userEmail, aprovedAt: new Date(), resposta: false },
    });
  }
  //#endregion

  //#region Log Sync
  async createLogSync(syncType: string, status: string, message: string, userEmail: string) {
    return this.logSync.create({ data: { syncType, status, message, userEmail } });
  }

  async createLocalizacoes(localizacao: Localizacoes) {
    return this.localizacoes.create({ data: localizacao });
  }

  async getAllLocalizacoes() {
    return this.localizacoes.findMany();
  }

  async deleteLocalizacoes(Id: string) {
    return this.localizacoes.delete({ where: { Id } });
  }

  async deleteAllLocalizacoes() {
    return this.localizacoes.deleteMany();
  }

  async updateLocalizacoes(items: Localizacoes[]) {
    const validos = (items ?? [])
      .map((i) => ({
        Rua: String(i.Rua ?? '').trim(),
        Predio: String(i.Predio ?? '').trim(),
        Nivel: String(i.Nivel ?? '').trim(),
        Apartamento: String(i.Apartamento ?? '').trim(),
        Endereco: String(i.Endereco ?? '').trim(),
        Armazenamento: String(i.Armazenamento ?? '').trim(),
      }))
      .filter((i) => i.Endereco);

    const results = await this.$transaction(
      validos.map((item) =>
        this.localizacoes.upsert({
          where: { Endereco: item.Endereco },
          create: item,
          update: item,
        }),
      ),
    );

    return { count: results.length };
  }
  //#endregion

  //#region DemandasTI
  async createSolicitacaoTI(solicitacao: string, descricao: string) {
    return this.demandasTI.create({ data: { solicitacao, descricao } });
  }

  async getDemandasTI() {
    return this.demandasTI.findMany({
      where: { andamento: { in: [AndamentoDemanda.Aberto, AndamentoDemanda.EmAndamento, AndamentoDemanda.Pausado] } },
      orderBy: [{ dataAbertura: 'desc' }],
    });
  }

  async getAllDemandasTI() {
    return this.demandasTI.findMany();
  }

  async updateDemandaTI(id: number, comentario: string | null, status: string) {
    return this.demandasTI.update({
      where: { id },
      data: { comentario, andamento: toAndamentoDemanda(status), dataAlteracao: new Date() },
    });
  }

  async criarCodigoRoleta(codigo: string) { }

  async usarCodigoRoleta(codigo: string) {
    return this.codigosRoleta.create({ data: { codigo } });
  }

  async verificarCodigoRoleta(codigo: string) {
    const nota = await this.codigosRoleta.findUnique({ where: { codigo } });
    return !!nota;
  }
  //#endregion

  async updateAcessos(userEmail: string, acessos: string[]) {
    return this.user.update({
      where: { email: userEmail },
      data: { acessos: { set: acessos } }
    });
  }


//#region Acompanhamento Pedido
  async registrarStatusAcompanhamento(nunota: string, status: string) {
    const updateData: any = { status };
    const now = new Date();

    // Identifica qual coluna de data deve ser preenchida/atualizada
    if (status === 'FILA') updateData.fila = now;
    if (status === 'SEPARANDO') updateData.separacao = now;
    if (status === 'CONFERENCIA') updateData.conferencia = now;
    if (status === 'LIBERADO') updateData.liberado = now;

    // upsert: atualiza se o nunota já existir, ou cria um novo registro se não existir
    return this.acompanhamentoPedido.upsert({
      where: { nunota },
      update: updateData,
      create: {
        nunota,
        status,
        ...updateData,
      },
    });
  }
 
  async buscarAcompanhamentoTempo(nunota: string) {
    return this.acompanhamentoPedido.findUnique({
      where: { nunota },
    });
  }

  //#endregion


  //#region Regras de Alíquota

  async getAllRegras() {
    return this.regrasAliquota.findMany();
  }

 async criarRegra(
    cfop: string, 
    tributacao: string, 
    aliquota?: string, 
    descricao?: string, 
    aliquotaICMS?: string,
    baseICMS?: string
  ) {
    return this.regrasAliquota.create({ 
      data: {
        cfop,
        tributacao,
        aliquota: aliquota || '',
        descricao: descricao || '',
        aliquotaICMS: aliquotaICMS || '',
        baseICMS: baseICMS || ''
      },
    });
  }

  async alterarRegra(
    id: number, 
    cfop: string, 
    tributacao: string, 
    aliquota?: string, 
    descricao?: string, 
    aliquotaICMS?: string,
    baseICMS?: string
  ) {
    return this.regrasAliquota.update({ 
      where: { id: Number(id) },
      data: {
        cfop,
        tributacao,
        aliquota: aliquota || '',
        descricao: descricao || '',
        aliquotaICMS: aliquotaICMS || '',
        baseICMS: baseICMS || ''
      },
    });
  }

  async excluirRegra(id: number) {
    return this.regrasAliquota.delete({
      where: { id: Number(id) },
    });
  }
  //#endregion





}
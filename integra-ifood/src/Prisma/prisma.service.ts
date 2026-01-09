// users.service.ts
//import { Inventory } from '@mui/icons-material';
import { Injectable } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { Role } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';
//import { Decimal } from '@prisma/client/runtime/library';
import * as bcrypt from 'bcrypt';


const prisma = new PrismaClient();

const RESET_DATE = '1987-11-23T14:01:48.190Z';
const ALT_DATE = '1981-11-23T14:01:48.190Z';

type ItemSolicitacao = {
    codProduto: number; 
    quantidade: number;
    descricao : string;
};


function toRole(value: unknown): Role {
  const v = String(value).toUpperCase();
  if (v in Role) return Role[v as keyof typeof Role];
  throw new Error('Role inválida');
}

@Injectable()
export class PrismaService {
prisma: any;

async createUser(email: string, password: string) {
  const passwordHash = await bcrypt.hash(password, 12);
  return prisma.user.create({ data: { email, passwordHash } });
}

async findByEmail(email: string) {
  return prisma.user.findUnique({ where: { email } });
}

async createRegisterReward(
    idVoucher: string,
    cpf: string,
    value_r: number | Prisma.Decimal,
  ) {
    const valueDec = value_r instanceof Prisma.Decimal ? value_r : new Prisma.Decimal(value_r);

    return prisma.rewardsFidelimax.create({
      data: { idVoucher, cpf, value: valueDec }, // <- chaves corretas
    });
}

async findReward(idVoucher: string) {
    return prisma.rewardsFidelimax.findUnique({ where: { idVoucher } });
}

async registerDebit(
    cpf: string,
    value: number,
    desc: string,
    nomeParc: string,
    nunota: string
  ) {
    return await prisma.debitInvalidLog.create({
      data: {
        cpf,
        debitoReais: value,          // nome correto
        descricaoEstorno: desc,      // nome correto
        nome: nomeParc,              // nome correto
        nunota,
        dataMov: new Date(),         // campo obrigatório
      },
    })
}

async findDebit(
    cpf: string
  ) {


    return await prisma.debitInvalidLog.findFirst({
      where: cpf ? { cpf } : undefined,
      orderBy: { dataMov: 'desc' }
    });
}

async addDebit(id: string, addValue) {
    return await prisma.debitInvalidLog.update({
      where: { id },
      data: { debitoReais: { increment: addValue } },
    });

}

async deleteDebit(id: string) {
    return prisma.debitInvalidLog.delete({ where: { id } });
}

async reduceDebit(id: string, removeValue: number) {
    const value = Number(removeValue);
    if (isNaN(value)) {
      throw new Error('removeValue inválido');
    }

    return prisma.debitInvalidLog.update({
      where: { id },
      data: {
        debitoReais: {
          increment: -value, // subtrai
        },
      },
    });
}


// ...


//#region Inventory

//adiciona contagem
async addCount(
    codProd: number,
    count: number,
    inStock: number,
    userEmail: string,
    descricao: string,
    localizacao: string,
  ) {
    this.updateCount(localizacao, codProd)
    return prisma.inventory.create({
      data: {
        codProd,
        count,
        inStock,
        inplantedDate: RESET_DATE,
        descricao,
        userEmail,
        localizacao
      },
    });
}

//adiciona contagem(com reservado)
async addCount2(
    codProd: number,
    count: number,
    inStock: number,
    userEmail: string,
    descricao: string,
    localizacao: string,
    reservado : number
  ) {
     console.log(reservado)

    return prisma.inventory.create({
      data: {
        codProd,
        count,
        inStock,
        inplantedDate: RESET_DATE,
        descricao,
        userEmail,
        localizacao,
        reservado
      },
    });
}

//retorna as contagens realizadas de um produto(codProd)
async getInventoryWhere(codProd: number) {
    return prisma.inventory.findMany({
      where: { codProd },
    });
}

//retorna a contagem realizada pelo id
async getInventory(id: string) {
    return prisma.inventory.findUnique({
      where: { id },
    });
}

//retorna todas as contagens realizadas
async getInventoryList() {
    return prisma.inventory.findMany();
}

//retorna os produtos de uma localização
async getProductsByLocation(localizacao: string) {
    return prisma.inventory.findMany({
      where: { localizacao }
    });
}

//Altera a flag inplantedDate para os produtos que foram ajustados e bloqueia nova alteração em contagens do mesmo produto
async updateInventoryDate(id: string, inplantedDate: string, userEmail: string) {
  return prisma.$transaction(async (tx) => {
    // 1) Busca o registro pelo ID
    const inventory = await tx.inventory.findUnique({
      where: { id },
    });

    if (!inventory) {
      this.createLogSync("Tentativa de ajuste de contagem", "FALHA", `Inventory com id=${id} não encontrado`, userEmail);
      throw new Error('Inventory não encontrado');
    } 

    const cod = inventory.codProd;

    const itemsToCheck = await tx.inventory.findMany({
      where: {
        codProd: cod,
        inplantedDate: RESET_DATE,
      },
    });

    // só mantém os que têm diferença entre count e inStock
    const idsToUpdate = itemsToCheck
      .filter((item) => item.count !== item.inStock)
      .map((item) => item.id);

    if (idsToUpdate.length > 0) {
      await tx.inventory.updateMany({
        where: {
          id: { in: idsToUpdate },
        },
        data: {
          inplantedDate: ALT_DATE,
        },
      });

    // 3) Seta a data nova só para o ID clicado
    this.createLogSync("Tentativa de ajuste de contagem", "FINALIZADO", `Inventory com id=${id} atualizado com inplantedDate=${inplantedDate}. Também atualizados IDs: ${idsToUpdate.join(', ')}`, userEmail);
    return tx.inventory.update({
      where: { id },
      data: { inplantedDate },
    });
  }});
}

//adiciona recontagem
async addNewCount(
    codProd: number,
    count: number,
    inStock: number,
    userEmail: string,
    descricao: string,
    localizacao: string,
    reservado : number
  ) {
    console.log(reservado)
    //const recontagem  = true
    return prisma.inventory.create({
      data: {
        codProd,
        count,
        inStock,
        inplantedDate: RESET_DATE,
        descricao,
        userEmail,
        localizacao,
        reservado,
        recontagem : true
      },
    });
}

//retorna curva de saida de todos os produtos
async getCurvas(){
    return prisma.curvaProduto.findMany();
}

//retorna a curva de saída do produto
async getCurvaById(codProd: number) {
    const curva = await prisma.curvaProduto.findUnique({ where: { codProd } });
    console.log(curva)
    return curva ?? null;
}

//Atualiza ou cria a curva de saida do produto
async updateCurva(codProd: number, curva: string, descricao : string){
    return prisma.curvaProduto.upsert({
        where: { codProd: codProd },
        create: { codProd: codProd, descricao: descricao, curvaProduto: curva },
        update: { curvaProduto: curva },
        });
}


//#endregion

//#region Estoque



//#endregion

//#region NotFound 

//Cria a lista de produtos não encontrados
async createNotFound(localizacao: string, produtosFaltando: number[], produtosContados: number[]){
    return prisma.notFound.create({
            data: {
                localizacao,
                codProdContados: produtosContados,
                codProdFaltando: produtosFaltando,
        }})
}

//Atualiza a lista de produtos não encontrados
async updateNotFoundList(localizacao: string, produtosFaltando: number[], produtosContados: number[]){
    return prisma.notFound.update({
        where: { localizacao },
        data: {
        codProdFaltando: { set: produtosFaltando },
        codProdContados: { set: produtosContados },
      },});
}

//verifica se aquela localização já possui produtos contados ou não localizados e atualiza a lista | METODO REDUNDANTE, NECESSÁRIO VERIFICAR USOS PRA EVENTUAL DESCARTE
async updateCount(localizacao : string, codProd : number){
  return prisma.$transaction(async (tx) => {
      // 1) Verifica se já existe NotFound para a localização
      let notFound = await tx.notFound.findUnique({
        where: { localizacao },
      });

      // 1.a) Se NÃO existe → cria com TODOS os produtos da localização em codProdFaltando
      if (!notFound) {
        const produtosDaLocalizacao = await tx.inventory.findMany({
          where: { localizacao },
          select: { codProd: true },
        });

        // tira duplicados
        const todosCods = Array.from(
          new Set(produtosDaLocalizacao.map((p) => p.codProd)),
        );

        notFound = await tx.notFound.create({
          data: {
            localizacao,
            codProdFaltando: todosCods,
            codProdContados: [],
          },
        });
      }

      // 2) Remove o codProd de Faltando (se ainda estiver lá)
      //    e adiciona em Contados (se ainda não estiver lá)
      const faltandoSet = new Set(notFound.codProdFaltando);
      const contadosSet = new Set(notFound.codProdContados);

      faltandoSet.delete(codProd);  // remove se existir
      contadosSet.add(codProd);     // garante que está em contados

      const novoCodProdFaltando = Array.from(faltandoSet);
      const novoCodProdContados = Array.from(contadosSet);

      // 3) Atualiza o registro
      const atualizado = await tx.notFound.update({
        where: { localizacao },
        data: {
          codProdFaltando: { set: novoCodProdFaltando },
          codProdContados: { set: novoCodProdContados },
        },
      });

      return atualizado;
    });
}


//verifica se aquela localização já possui produtos contados ou não localizados e atualiza a lista | METODO REDUNDANTE, NECESSÁRIO VERIFICAR USOS PRA EVENTUAL DESCARTE
async updateNotFound(items : number [], localizacao: string,  codProd : number){
  const notFound = await prisma.notFound.findUnique({
    where: { localizacao },
  });

  if (!notFound) {
    //const inventarios = await  this.getProductsByLocation(localizacao)
    const codigos: number[] = [];
    const codProduto: number[] = [];
    codProduto.push(codProd)
    for (const codigo of items){
      codigos.push(codigo)
    }
    const faltandoSet = new Set(codigos);
    const contadosSet = new Set(codProduto);

    faltandoSet.delete(codProd);  // remove se existir
    contadosSet.add(codProd);

    const novoCodProdFaltando = Array.from(faltandoSet);
    const novoCodProdContados = Array.from(contadosSet);

    
    return prisma.notFound.create({
      data: {
        localizacao,
        codProdContados: novoCodProdContados,
        codProdFaltando: novoCodProdFaltando,
  }})
  }else{
     const faltandoSet = new Set(notFound.codProdFaltando);
      const contadosSet = new Set(notFound.codProdContados);

      faltandoSet.delete(codProd);  // remove se existir
      contadosSet.add(codProd);     // garante que está em contados

      const novoCodProdFaltando = Array.from(faltandoSet);
      const novoCodProdContados = Array.from(contadosSet);

      return prisma.notFound.update({
        where: { localizacao },
        data: {
          codProdFaltando: { set: novoCodProdFaltando },
          codProdContados: { set: novoCodProdContados },
        },
      });
  }
}

//retorna a lista de produtos não localizados de uma localização
async getNotFound(localizacao : string){  
  return prisma.notFound.findUnique({
    where: { localizacao },
  });
}

//retorna a lista completa de produtos não localizados de todas as localizações
async getNotFoundList(){ 
  return prisma.notFound.findMany();
}


//retorna a lista completa de produtos com mais de uma localização
async getMultiLocation() {
  return this.getInventoryList();
}

//#endregion


//#region Login/Logout 
async loginSession(userEmail : string){
  const sessions = await prisma.session.findMany({
      where: { userEmail},
    });
  const expiresHoursMs = 4 * 60 * 60 * 1000;
  const expiresAt = new Date(Date.now() + expiresHoursMs);
  console.log("create session: userEmail = " + userEmail)
  console.log("create session: sessions.length = " + sessions.length)
  console.log("create session: sessions = " + sessions);
  if(sessions.length === 0){
    return await prisma.session.create({
      data: {
        userEmail: String(userEmail),
        expiresAt: expiresAt
      },
    });
  } else {
    const email = String(userEmail);
    return await prisma.session.updateMany({
      where: { userEmail },
      data: {
        active: true,
        expiresAt: expiresAt,
        lastSeen : new Date()
      },
    });

  }

}

async logoutSession(userEmail : string){
  console.log("delete session: userEmail = " + userEmail)
  return await prisma.session.updateMany({
    where: { userEmail },
    data: {
      active: false,
    },
  });
}
  
async alterarSenha(email : string, senha : string){
  const novaSenha = await bcrypt.hash(senha, 12);
  return prisma.user.update({
        where: {  email  },
        data: {
          passwordHash: { set: novaSenha },
        },
    })
}

async getLogins(){
  return prisma.session.findMany();
}

//#endregion


//#region Triagem 


async getSeparadores(){

  const usuarios = await prisma.user.findMany()
  console.log("usuarios.length: " + usuarios.length)
  const u = usuarios.filter((u) => u.role === 'SEPARADOR')
  console.log("u.length: " + u.length)


  const separadores = await prisma.user.findMany({
    where: { role: 'SEPARADOR' },
  });
  console.log("separadores.length: " + separadores.length )

  if (separadores.length === 0) return [];

  const emails = separadores.map((separador) => separador.email);

  console.log("emails.length: " + emails.length)
  return await prisma.session.findMany({
    where: {
      active: true,
      userEmail: { in: emails },
    },
  })

}

async getPedidoSeparador(userEmail : string){
    console.log('prismaService/getPedidoSeparador: userEmail = ' + userEmail)
    return await prisma.pedidoSeparador.findMany({where : { separador : userEmail }, });
    //return await prisma.pedidoSeparador.findmany();
}

async adicionarSeparador(userEmail : string, region : string){
  const estoque = await prisma.estoque.findUnique({where : {region}})
  //const separadores = estoque.separadores.push(userEmail)

  if (!estoque) {
    throw new Error(`Estoque não encontrado para region=${region}`);
  }

  const separadores = new Set(estoque.separadores)
  separadores.add(userEmail)
  const novoSeparadores = Array.from(separadores)

  return await prisma.estoque.update({
        where: { region },
        data: {
          separadores : { set: novoSeparadores },
          
        },
      })

}

async removerSeparador(userEmail : string, region : string){
  console.log("prisma service")
  console.log("userEmail: " + userEmail)
  console.log("estoque: " + region)
  const estoque = await prisma.estoque.findUnique({where : {region}})
  //const separadores = estoque.separadores.push(userEmail)

  if (!estoque) {
    throw new Error(`Estoque não encontrado para region=${region}`);
  }

  const separadores = new Set(estoque.separadores)
  separadores.delete(userEmail)
  const novoSeparadores = Array.from(separadores)

  return await prisma.estoque.update({
        where: { region },
        data: {
          separadores : { set: novoSeparadores },
        },
      })

}

async getEstoqueById(region : string){
  
  if (!region) {
    throw new Error('region é obrigatório');
  }
  

  const estoque = await prisma.estoque.findUnique({where : {region}})
  //const separadores = estoque.separadores.push(userEmail)

  if (!estoque) {
    throw new Error(`Estoque não encontrado para region=${region}`);
  }

  console.log(estoque.separadores)

  return estoque.separadores;
}

async getEstoque(){
  return await prisma.estoque.findMany();
}

//#endregion


//#region Admin 

//retorna todos os usuarios cadastrados no sistema
async getUsuarios(){
  return prisma.user.findMany();
}

//Altera a role do usuário
async changeRole(userEmail : string, role : string){
  const newRole = toRole(role)
  return prisma.user.update({
        where: { email : userEmail },
        data: {
          role: { set: newRole },
        },
    })
}

//reseta senha do usuario, passando userEmail como paramentro
async resetSenha(userEmail: string) {
  return prisma.user
        .update({
        where: { email : userEmail },
        data: {
          passwordHash: { set: await bcrypt.hash('123456', 12) },
        },
      })
}

//deleta usuario passando userEmail como paramentro
async deleteUsuario(userEmail: string) {
  return prisma.user.delete({ where: { email : userEmail } });
}

//#endregion


//#region Ajustes e Lançamentos de Notas

//Lista de produtos para lançamento de nota positiva/nota de compra
async getNotaPositiva() {
  const altDate = new Date(ALT_DATE);
  const resetDate = new Date(RESET_DATE);

  const list = await prisma.inventory.findMany({
    where: {
      inplantedDate: {
        notIn: [altDate, resetDate],
        not: null,
      },
    },
  });

  return list.filter((p) => (p.count + (p.reservado ?? 0)) > p.inStock && !p.inNote);
}

//Lista de produtos para lançamento de nota negativa/nota de venda
async getNotaNegativa() {
  const altDate = new Date(ALT_DATE);
  const resetDate = new Date(RESET_DATE);

  const list = await prisma.inventory.findMany({
    where: {
      inplantedDate: {
        notIn: [altDate, resetDate],
        not: null,
      },
    },
  });

  return list.filter((p) => (p.count + (p.reservado ?? 0)) < p.inStock && !p.inNote);
}

//Lista de produtos para correção de nota positiva/nota de compra
async getNotaPositivaCorrecao() {
  const altDate = new Date(ALT_DATE);
  const resetDate = new Date(RESET_DATE);

  const list = await prisma.inventory.findMany({
    where: {
      inplantedDate: {
        notIn: [altDate, resetDate],
        not: null,
      },
    },
  });

  return list.filter((p) => (p.count + (p.reservado ?? 0)) > p.inStock && p.inNote);
}

//Lista de produtos para correção de nota negativa/nota de venda
async getNotaNegativaCorrecao() {
  const altDate = new Date(ALT_DATE);
  const resetDate = new Date(RESET_DATE);

  const list = await prisma.inventory.findMany({
    where: {
      inplantedDate: {
        notIn: [altDate, resetDate],
        not: null,
      },
    },
  });

  return list.filter((p) => (p.count + (p.reservado ?? 0)) < p.inStock && p.inNote);
}

//Atualiza a flag inNote para os produtos que tiveram nota lançada
async incluirNota(produtos: { codProd: number; diference: number }[]){
  
  if (!Array.isArray(produtos) || produtos.length === 0) {
    throw new BadRequestException('Lista de produtos vazia.');
  }

  // pega só os códigos, remove inválidos e duplicados
  const codProds = Array.from(
    new Set(
      produtos
        .map(p => Number(p?.codProd))
        .filter(c => Number.isFinite(c) && c > 0),
    ),
  );

  if (codProds.length === 0) {
    throw new BadRequestException('Nenhum CODPROD válido para atualizar.');
  }

  const result = await prisma.inventory.updateMany({
    where: { codProd: { in: codProds } },
    data: { inNote: true },
  });

  // result.count = quantos registros foram atualizados
  return result;
}

//Retorna os produtos que já foram ajustados mas não tiveram nota lançada
async retornarProdutos(codProds: number[]){
  for(const codigo of codProds){
    const produtos = await prisma.inventory.findMany({ where: { codProd: codigo },});  
    for(const produto of produtos){
      this.resetInventoryAjust(produto.id, RESET_DATE);
    }
  }
}

//resta as flags inplantedDate e inNote
async resetInventoryAjust(id: string, inplantedDate: string) {
    return prisma.inventory.update({
      where: { id },
      data: { inplantedDate, inNote : false},
    });
};

//resta a flag inplantedDate
async resetInventoryDate(id: string, inplantedDate: string) {
    return prisma.inventory.update({
      where: { id },
      data: { inplantedDate },
    });
};

//#endregion


//#region Solicitar Produtos 

//Abertura de solicitação de produtos pelo usuario
async solicitaProduto(userEmail: string, items: ItemSolicitacao[]) {
    if (!userEmail?.trim()) {
      throw new BadRequestException('userEmail é obrigatório');
    }

    if (!Array.isArray(items) || items.length === 0) {
      throw new BadRequestException('items precisa ter ao menos 1 item');
    }

    // validação básica
    for (const [i, it] of items.entries()) {
      if (!Number.isFinite(it.codProduto)) {
        throw new BadRequestException(`items[${i}].codProduto inválido`);
      }
      if (!Number.isFinite(it.quantidade) || it.quantidade <= 0) {
        throw new BadRequestException(`items[${i}].quantidade inválida`);
      }
      if (!String(it.descricao ?? '').trim()) {
        throw new BadRequestException(`items[${i}].descricao é obrigatória`);
      }
    }

    // cria Solicitacao + ItemSolicitacao (nested)
    return prisma.solicitacao.create({
        data: {
          userRequest: userEmail,
          items: {
            create: items.map((p) => ({
              codProd: p.codProduto,     // se o DTO vier como codProduto
              quantidade: p.quantidade,
              descricao: p.descricao,
            })),
          },
        },
        include: { items: true },
      });

}

//Listar todas as solicitações pendentes de aprovação
async getSolicitacao(){
  const get = (await prisma.solicitacao.findMany({include: {
      items: true, // ✅ aqui
    }})).filter((s) => s.aprovado === false);
  console.log(get)
  return get;
}

//Listar todas as solicitações de um usuário
async getSolicitacaoUsuario(userEmail : string){
  const get = (await prisma.solicitacao.findMany({ where: { userRequest : userEmail}, include: {
      items: true, 
    }}));
  console.log(get)
  return get;
}

//Aprovar solicitação de produtos
async baixaSolicitacao(id: string, userEmail : string) {
  console.log(id)
  console.log(userEmail)
  return prisma.solicitacao.update({
    where: { id },
      data: {  
        aprovado : true ,
        userAproved : userEmail,
        aprovedAt : new Date(),
      },
  });
}

//Reprovar solicitação de produtos
async reprovarSolicitacao(id: string, userEmail: string){
    console.log(id)
    console.log(userEmail)
    return prisma.solicitacao.update({
      where: { id },
        data: {  
          aprovado : true ,
          userAproved : userEmail,
        },
    });
}

//#endregion

//#region Log Sync

//cria log a partir de registros passados pelo SyncService
async createLogSync(syncType: string, status: string, message: string, userEmail: string){
  return prisma.logSync.create({
          data: {
              syncType,
              status,
              message,
              userEmail,
      }});
}



//#endregion
  
}

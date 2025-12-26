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

//#region INVENTORY

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

async getInventoryWhere(codProd: number) {
    return prisma.inventory.findMany({
      where: { codProd },
    });
}

async getInventory(id: string) {
    return prisma.inventory.findUnique({
      where: { id },
    });
}

async getInventoryList() {
    return prisma.inventory.findMany();
}

async getProductsByLocation(localizacao: string) {
    return prisma.inventory.findMany({
      where: { localizacao }
    });
}

async updateInventoryDate(id: string, inplantedDate: string) {
  return prisma.$transaction(async (tx) => {
    // 1) Busca o registro pelo ID
    const inventory = await tx.inventory.findUnique({
      where: { id },
    });

    if (!inventory) {
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
    return tx.inventory.update({
      where: { id },
      data: { inplantedDate },
    });
  }});
}

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

//#endregion

//#region PAGINA DE PRODUTOS NÃO LOCALIZADOS 
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

async getNotFound(localizacao : string){  
  return prisma.notFound.findUnique({
    where: { localizacao },
  });
}

async getNotFoundList(){ 
  return prisma.notFound.findMany();
}

async notFoundListFull(){
  const inventoryList = await this.getInventoryList(); // Await the promise
  for(const inventario of inventoryList){ // Iterate over the array
    //const codProduto: number[] = [];
    await this.updateNotFound2(inventario.localizacao, inventario.codProd); // Await the promise
  }
  return prisma.notFound.findMany(); 
}



async updateNotFound2(localizacao: string,  codProd : number){
  const notFound = await prisma.notFound.findUnique({
    where: { localizacao },
  });

  if (!notFound) {
    const codigos: number[] = [];
    const codProduto: number[] = [];
    codProduto.push(codProd)
    const itens = await this.getProductsByLocation(localizacao);
    for (const codigo of itens){
      codigos.push(codigo.codProd)
    }
    const faltandoSet = new Set(codigos);
    const contadosSet = new Set(codProduto);

    faltandoSet.delete(codProd);  
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

    faltandoSet.delete(codProd); 
    contadosSet.add(codProd);    

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

/*async getRoles(userEmail: string){
  return prisma.user.findUnique({ where: { email : userEmail } }).role;
}*/
async getUsuarios(){
  return prisma.user.findMany();
}

async changeRole(userEmail : string, role : string){
  const newRole = toRole(role)
  return prisma.user.update({
        where: { email : userEmail },
        data: {
          role: { set: newRole },
        },
    })
}


//#REGION NOTAS

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

/*async incluirNota(produtos: { codProd: number; diference: number }[]){
  return await prisma.debitInvalidLog.update({
      where: { codProd: in produtos={.codProd} },
      data: { debitoReais: { increment: addValue } },
    })
}/*/

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

async createNotFound(localizacao: string, produtosFaltando: number[], produtosContados: number[]){
    return prisma.notFound.create({
            data: {
                localizacao,
                codProdContados: produtosContados,
                codProdFaltando: produtosFaltando,
        }})
}

async updateNotFoundList(localizacao: string, produtosFaltando: number[], produtosContados: number[]){
    return prisma.notFound.update({
        where: { localizacao },
        data: {
        codProdFaltando: { set: produtosFaltando },
        codProdContados: { set: produtosContados },
      },});
}

async retornarProdutos(codProds: number[]){
  for(const codigo of codProds){
    const produtos = await prisma.inventory.findMany({ where: { codProd: codigo },});  
    for(const produto of produtos){
      this.resetInventoryDate(produto.id, RESET_DATE);
    }
  }
}

async resetInventoryDate(id: string, inplantedDate: string) {
    return prisma.inventory.update({
      where: { id },
      data: { inplantedDate },
    });
};

 async solicitaProduto(codProd: number, quantidade: number, email: string, descricao: string){
    return  prisma.solicitacao.create({ data: { userRequest: email, codProd : codProd, quantidade : quantidade, descricao : descricao} });
 }

 async getSolicitacao(){
    return (await prisma.solicitacao.findMany()).filter((s) => s.aprovado === false);
 }

  async baixaSolicitacao(id: string, userEmail : string) {
    console.log(id)
    console.log(userEmail)
    return prisma.solicitacao.update({
      where: { id },
        data: {  
          aprovado : true ,
          userAproved : userEmail,
        },
    });
  };

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


  
  /*catch (e: any) {
    console.error('Erro no /sync/multiLocation:', e);
    return Response.json(
      { error: e.message || 'Erro ao gerar lista multi-localização.' },
      { status: 500 }
    );
  }*/

 

}

// users.service.ts
//import { Inventory } from '@mui/icons-material';
import { Injectable } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
//mport { Decimal } from '@prisma/client/runtime/library';
import * as bcrypt from 'bcrypt';


const prisma = new PrismaClient();

const RESET_DATE = '1987-11-23T14:01:48.190Z';
const ALT_DATE = '1981-11-23T14:01:48.190Z';

@Injectable()
export class PrismaService {

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

  //#region
  async addCount(
    codProd: number,
    count: number,
    inStock: number,
    userEmail: string,
    descricao: string,
    localizacao: string,
  ) {
    
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

  async getInventory(codProd: number) {
    return prisma.inventory.findMany();
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
     const recontagem  = true
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
        recontagem
      },
    });
  }

  //#endregion

}
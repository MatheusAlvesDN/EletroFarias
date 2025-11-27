// users.service.ts
import { Inventory } from '@mui/icons-material';
import { Injectable } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import * as bcrypt from 'bcrypt';


const prisma = new PrismaClient();

@Injectable()
export class UsersService {

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



  async addCount(codProd: number, count: number, inStock: number, userEmail: string) {
    
    return prisma.inventory.create({
      data: {
        codProd,
        count,
        inStock,
        inplantedDate: new Date(),
        descricao: 'teste',
        userEmail,
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

  async getInventoryList(){
    return prisma.inventory.findMany();
  }


}
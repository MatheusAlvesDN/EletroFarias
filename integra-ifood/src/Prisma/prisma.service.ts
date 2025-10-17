// users.service.ts
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

  async createRegisterReward(idVoucher_r: string, cpf_r: number | string | bigint, value_r: number | Prisma.Decimal) {
    const cpfBig = BigInt(String(cpf_r).replace(/\D/g, '')); // garante BigInt
    const valueDec = value_r instanceof Prisma.Decimal ? value_r : new Prisma.Decimal(value_r);
    return prisma.rewardsFidelimax.create({
      data: { idVoucher: idVoucher_r, cpf: cpfBig, value: valueDec },
    });
  }

  async findReward(idVoucher: string) {
    return prisma.rewardsFidelimax.findUnique({ where: { idVoucher } });
  }

}
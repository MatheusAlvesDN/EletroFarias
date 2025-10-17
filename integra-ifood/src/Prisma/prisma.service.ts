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

}
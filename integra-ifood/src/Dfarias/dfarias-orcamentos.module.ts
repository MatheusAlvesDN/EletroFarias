import { Module } from '@nestjs/common';
import { PrismaService } from '../Prisma/prisma.service';
import { DfariasOrcamentosController } from './dfarias-orcamentos.controller';
import { DfariasOrcamentosService } from './dfarias-orcamentos.service';

@Module({
  controllers: [DfariasOrcamentosController],
  providers: [DfariasOrcamentosService],
})
export class DfariasOrcamentosModule {}

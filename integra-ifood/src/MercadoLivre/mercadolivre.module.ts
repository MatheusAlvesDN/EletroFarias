import { Module } from '@nestjs/common';
import { MercadoLivreController } from './mercadolivre.controller';
import { MercadoLivreService } from './mercadolivre.service';
import { PrismaService } from '../Prisma/prisma.service'; // Ajuste o caminho se necessário
import { SankhyaModule } from '../Sankhya/sankhya.module'; // Importa o Módulo todo!

@Module({
  imports: [SankhyaModule],
  controllers: [MercadoLivreController],
  providers: [MercadoLivreService, PrismaService],
  exports: [MercadoLivreService],
})
export class MercadoLivreModule { }
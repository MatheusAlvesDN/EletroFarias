import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MercadoLivreController } from './mercadolivre.controller';
import { MercadoLivreService } from './mercadolivre.service';
import { PrismaService } from '../Prisma/prisma.service';
import { SankhyaModule } from '../Sankhya/sankhya.module';

@Module({
  imports: [HttpModule, SankhyaModule],
  controllers: [MercadoLivreController],
  providers: [MercadoLivreService],
  exports: [MercadoLivreService],
})
export class MercadoLivreModule {}
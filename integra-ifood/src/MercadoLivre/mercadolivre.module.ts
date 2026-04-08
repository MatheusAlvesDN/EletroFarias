import { Module } from '@nestjs/common';
import { MercadoLivreController } from './mercadolivre.controller';
import { MercadoLivreService } from './mercadolivre.service';
import { PrismaService } from 'src/Prisma/prisma.service';
// Importe o PrismaModule ou SankhyaModule se precisar buscar mais dados do ERP
// import { PrismaModule } from '../Prisma/prisma.module'; 

@Module({
  // imports: [PrismaModule],
  controllers: [MercadoLivreController],
  providers: [MercadoLivreService,
    PrismaService
  ],
  exports: [MercadoLivreService],
})
export class MercadoLivreModule {}
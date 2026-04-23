import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { SankhyaService } from './sankhya.service';
import { SankhyaController } from './sankhya.controller';
import { PrismaService } from '../Prisma/prisma.service';

@Module({
    imports: [HttpModule],
    controllers: [SankhyaController],
    providers: [SankhyaService],
    exports: [SankhyaService],
})
export class SankhyaModule { }
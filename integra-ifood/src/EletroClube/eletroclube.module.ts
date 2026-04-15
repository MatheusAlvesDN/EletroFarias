import { Module } from '@nestjs/common';
import { EletroClubeController } from './eletroclube.controller';
import { EletroClubeService } from './eletroclube.service';
import { PrismaService } from '../Prisma/prisma.service';
import { HttpModule } from '@nestjs/axios';
import { SankhyaService } from '../Sankhya/sankhya.service';
import { JwtModule } from '@nestjs/jwt';

@Module({
    imports: [
        JwtModule.register({
            secret: process.env.JWT_SECRET || 'sua-chave-secreta-super-segura',
            signOptions: { expiresIn: '7d' },
        }),
        HttpModule,
    ],
    controllers: [EletroClubeController],
    providers: [EletroClubeService, PrismaService, SankhyaService],
})
export class EletroClubeModule { }
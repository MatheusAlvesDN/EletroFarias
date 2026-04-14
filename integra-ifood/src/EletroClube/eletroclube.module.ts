import { Module } from '@nestjs/common';
import { EletroClubeController } from './eletroclube.controller';
import { EletroClubeService } from './eletroclube.service';
import { PrismaService } from '../Prisma/prisma.service';
import { JwtModule } from '@nestjs/jwt';

@Module({
    imports: [
        // Reutilizando as mesmas chaves de JWT do seu sistema de Auth principal
        JwtModule.register({
            secret: process.env.JWT_SECRET || 'sua-chave-secreta-super-segura',
            signOptions: { expiresIn: '7d' }, // Token válido por 7 dias (ideal para apps de pontos)
        }),
    ],
    controllers: [EletroClubeController],
    providers: [EletroClubeService, PrismaService],
})
export class EletroClubeModule { }
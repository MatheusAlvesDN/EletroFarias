import { Module } from '@nestjs/common';
import { CrmController } from './crm.controller';
import { CrmService } from './crm.service';
import { PrismaService } from '../Prisma/prisma.service';
import { SankhyaModule } from '../Sankhya/sankhya.module';
import { CrmGateway } from './crm.gateway';
import { CrmCarteiraService } from './crm-carteira.service';

@Module({
    imports: [SankhyaModule],
    controllers: [CrmController],
    providers: [
        CrmService,
        CrmGateway,
        CrmCarteiraService
    ],
})
export class CrmModule { }
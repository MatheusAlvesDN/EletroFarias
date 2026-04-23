// app.module.ts
import { Module } from '@nestjs/common';
import { SankhyaService } from './Sankhya/sankhya.service';
import { IfoodService } from './Ifood/ifood.service';
import { Fidelimax } from './Fidelimax/fidelimax.service';
import { SyncService } from './Sync/sync.service';
import { TransporteMais } from './Transporte+/transport.service'
import { HttpModule } from '@nestjs/axios';
import { SyncController } from './Sync/sync.controller';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './auth/auth.module';
import { SankhyaController } from './Sankhya/sankhya.controller';
import { InicioController } from './inicio/inicio.controller';
import { PrismaService } from './Prisma/prisma.service'
import { PrintService } from './Print/print.service'
import { ExpedicaoService } from './Expedicao/expedicao.service'
import { PrintController } from './Print/print.controller';
import { DashController } from './Dashboard/dashboard.controller';
import { DashboardService } from './Dashboard/dashboard.service';
import { ExpedicaoController } from './Expedicao/expedicao.controller';
import * as https from 'https';
import { TriggersController } from './Triggers/triggers.controller';
import { TriggersService } from './Triggers/triggers.service';
import { PrismaController } from './Prisma/prisma.controller';
import { WhatsappService } from './WhatsApp/whatsapp.service';
import { MercadoLivreModule } from './MercadoLivre/mercadolivre.module';
import { MercadoLivreController } from './MercadoLivre/mercadolivre.controller';
import { MercadoLivreService } from './MercadoLivre/mercadolivre.service';
import { SankhyaModule } from './Sankhya/sankhya.module';
import { IfoodController } from './Ifood/ifood.controller';
import { EletroClubeModule } from './EletroClube/eletroclube.module';
import { EletroClubeService } from './EletroClube/eletroclube.service';
import { CrmModule } from './CRM/crm.module';
import { EletroClubeController } from './EletroClube/eletroclube.controller';
import { JwtModule } from '@nestjs/jwt';
import { DfariasOrcamentosModule } from './Dfarias/dfarias-orcamentos.module';
import { UsersModule } from './Prisma/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env',
      isGlobal: true,
    }),
    JwtModule.register({
      secret: 'sua_chave_secreta',
      signOptions: { expiresIn: '1d' },
    }),
    HttpModule,
    MercadoLivreModule,
    SankhyaModule,
    EletroClubeModule,
    CrmModule,
    DfariasOrcamentosModule,
    ScheduleModule.forRoot(),
    AuthModule,
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 0,
      httpsAgent: new https.Agent({
        keepAlive: false,
      }),
    }),
    UsersModule,
  ],
  controllers: [
    SyncController,
    InicioController,
    SankhyaController,
    PrintController,
    ExpedicaoController,
    PrismaController,
    IfoodController,
    DashController,
    EletroClubeController,
    MercadoLivreController,
    TriggersController,
  ],
  providers: [SankhyaService, IfoodService, EletroClubeService, MercadoLivreService, SyncService, Fidelimax, TransporteMais, PrintService, ExpedicaoService, WhatsappService, TriggersService, DashboardService],
})
export class AppModule {}

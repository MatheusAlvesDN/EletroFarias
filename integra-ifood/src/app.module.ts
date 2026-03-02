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
import { ExpedicaoService} from './Expedicao/expedicao.service'
import { PrintController } from './Print/print.controller';
import { DashController} from './Dashboard/dashboard.controller';
import { DashboardService} from './Dashboard/dashboard.service';
import { ExpedicaoController } from './Expedicao/expedicao.controller';
import * as https from 'https';
import { TriggersController } from './Triggers/triggers.controller';
import { TriggersService } from './Triggers/triggers.service';




@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env',
      isGlobal: true,
    }),
    HttpModule,
    ScheduleModule.forRoot(),
    AuthModule,
      HttpModule.register({
      timeout: 30000,
      maxRedirects: 0,
      httpsAgent: new https.Agent({
        keepAlive: false, // <- evita socket reutilizado travar
      }),
    }),

  ],
  controllers: [
    SyncController,
    InicioController,     
    SankhyaController,   
    PrintController,
    ExpedicaoController,
    DashController,
    TriggersController,
  ],
  providers: [SankhyaService, IfoodService, SyncService, Fidelimax, TransporteMais, PrismaService, PrintService, ExpedicaoService, TriggersService, DashboardService],
})
export class AppModule {}


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
import { InicioController } from './inicio/inicio.controller'; // <-- novo
import { UsersService } from './Prisma/prisma.service'

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env',
      isGlobal: true,
    }),
    HttpModule,
    ScheduleModule.forRoot(),
    AuthModule,
  ],
  controllers: [
    SyncController,
    InicioController,     // <-- novo (GET / protegido)
    SankhyaController,    // (GET /sankhya protegido)
  ],
  providers: [SankhyaService, IfoodService, SyncService, Fidelimax, TransporteMais, UsersService],
})
export class AppModule {}

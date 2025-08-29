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
import { UsersModule } from './Users/users.module';
import { AuthModule } from './auth/auth.module';


@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env',
      isGlobal: true,
    }),
    HttpModule,
    ScheduleModule.forRoot(),
    UsersModule,
    AuthModule, // <-- Adiciona o módulo de agendamento
  ],
  controllers: [SyncController],
  providers: [SankhyaService, IfoodService, SyncService, Fidelimax,TransporteMais],
})
export class AppModule {}
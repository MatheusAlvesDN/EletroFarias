import { Module } from '@nestjs/common';
import { SankhyaService } from './Sankhya/sankhya.service';
import { IfoodService } from './Ifood/ifood.service';
import { SyncService } from './Sync/sync.service';
import { HttpModule } from '@nestjs/axios'
import { SyncController } from './Sync/sync.controller';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule.forRoot({
      envFilePath: '.env',
      isGlobal: true, // Faz com que as variáveis estejam disponíveis globalmente
    }),
    HttpModule,],
  controllers: [SyncController],
  providers: [SankhyaService, IfoodService, SyncService],
})
export class AppModule {}
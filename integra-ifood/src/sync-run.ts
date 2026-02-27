import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module'; // ajuste o caminho conforme seu projeto
import { SyncService } from './Sync/sync.service'; // ajuste o caminho para o SyncService
import * as dotenv from 'dotenv';
import { join } from 'path';
import { IfoodService } from './Ifood/ifood.service';

// Força o carregamento do .env na raiz do projeto
dotenv.config({ path: join(__dirname, '..', '.env') });

async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(AppModule);

  const syncService = appContext.get(SyncService);

  try {
    const produto = await syncService.updateInventory();
    console.log('Produto retornado:', produto);
  } catch (error) {
    console.error('Erro:', error);
  } finally {
    await appContext.close();
  }
}

bootstrap();

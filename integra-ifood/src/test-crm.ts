import { NestFactory } from '@nestjs/core';
import { CrmModule } from './CRM/crm.module';
import { CrmService } from './CRM/crm.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(CrmModule);
  const crmService = app.get(CrmService);

  try {
    console.log('--- Testing listarFunil ---');
    const funnel = await crmService.listarFunil();
    console.log('Result length:', funnel.length);
    if (funnel.length > 0) {
      console.log('First item structure:', JSON.stringify(funnel[0], null, 2));
    } else {
      console.log('Funnel is empty.');
    }
  } catch (error) {
    console.error('Error in listarFunil:', error);
  } finally {
    await app.close();
  }
}

bootstrap();

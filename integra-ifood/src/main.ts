// main.ts do seu projeto NestJS
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Habilita o CORS
  app.enableCors({
    origin: 'http://localhost:3001', // Permita requisições apenas do seu frontend Next.js
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE', // Permita os métodos que você usa
    credentials: true, // Se você usar cookies ou tokens com credenciais
  });

  // Se você não souber a porta exata do seu Next.js ou quiser ser mais flexível em dev:
  // app.enableCors(); // Isso permite qualquer origem (NÃO RECOMENDADO EM PRODUÇÃO!)

  await app.listen(3000); // Certifique-se de que esta é a porta correta do seu NestJS
}
bootstrap();
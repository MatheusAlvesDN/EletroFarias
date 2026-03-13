// main.ts
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as bodyParser from 'body-parser';



async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ✅ CORS: libere local e produção (dev/prod)
  app.enableCors({
    origin: [
      'https://intgr-frontend.onrender.com',
      'https://eletrofarias.app.br',
      'https://www.eletrofarias.app.br',
      'https://local.eletrofarias.app.br',
      'https://eletrosistema.eletrofarias.app.br',
      'http://192.168.32.148:3000', //frontend rede local
      'http://192.168.32.148:3001', //backend rede local
      'http://localhost:3000',
      'http://localhost:3001',
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    exposedHeaders: ['Content-Type', 'Content-Disposition'], 
  });

  app.use(bodyParser.json({ limit: '20mb' }));
  app.use(bodyParser.urlencoded({ extended: true, limit: '20mb' }));



  // ✅ debug pra confirmar env em runtime
  console.log('PORT:', process.env.PORT);
  console.log('DATABASE_URL exists?', !!process.env.DATABASE_URL);

  const port = Number(process.env.PORT);
  await app.listen(port, '0.0.0.0');
}
bootstrap();

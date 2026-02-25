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
      'http://192.168.20.56:3000', //frontend rede local
      'http://192.168.20.56:3001', //backend rede local
      'http://localhost:3000',
      'http://localhost:3001',
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
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

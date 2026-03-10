// main.ts
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ✅ Security: Add Helmet middleware for security headers
  app.use(helmet());

  // ✅ CORS: libere local e produção (dev/prod)
  app.enableCors({
    origin: [
      'https://intgr-frontend.onrender.com',
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // ✅ debug pra confirmar env em runtime
  console.log('PORT:', process.env.PORT);
  console.log('DATABASE_URL exists?', !!process.env.DATABASE_URL);

  await app.listen(Number(process.env.PORT) || 3000);
}
bootstrap();

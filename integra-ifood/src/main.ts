// main.ts
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as bodyParser from 'body-parser';

function normalizeDatabaseUrl() {
  const rawValue = process.env.DATABASE_URL;
  if (!rawValue) return;

  const firstLineOnly = rawValue.split('\\n')[0].trim();
  const unquoted = firstLineOnly.replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');

  try {
    const parsed = new URL(unquoted);
    const isRenderPostgres = parsed.hostname.includes('render.com');

    if (process.env.RENDER === 'true' && isRenderPostgres) {
      // Convert external Render URL to internal URL for stability and speed
      parsed.hostname = parsed.hostname.split('.')[0];
      parsed.searchParams.delete('sslmode');
    } else if (isRenderPostgres && !parsed.searchParams.has('sslmode')) {
      parsed.searchParams.set('sslmode', 'require');
    }

    // Set connection limit to prevent exhausting Render's free tier
    if (!parsed.searchParams.has('connection_limit')) {
      parsed.searchParams.set('connection_limit', '5');
      parsed.searchParams.set('pool_timeout', '20');
    }

    process.env.DATABASE_URL = parsed.toString();
  } catch {
    process.env.DATABASE_URL = unquoted;
  }
}



async function bootstrap() {
  normalizeDatabaseUrl();
  const app = await NestFactory.create(AppModule);

  // ✅ CORS: libere local e produção (dev/prod)
  app.enableCors({
    origin: [
      'https://intgr-frontend.onrender.com',
      'https://eletrofarias.app.br',
      'https://www.eletrofarias.app.br',
      'https://clube.eletrofarias.app.br',
      'https://www.clube.eletrofarias.app.br',
      'https://local.eletrofarias.app.br',
      'http://local.eletrofarias.app.br',
      'https://eletrosistema.eletrofarias.app.br',
      'http://192.168.32.148:3000',
      'http://192.168.32.148:3001',
      'http://192.168.32.1:80',
      'http://177.10.203.42',
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost',
      'https://localhost',
      'capacitor://localhost',
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

  const port = Number(process.env.PORT || 3000);
  await app.listen(port, '0.0.0.0');
}
bootstrap();

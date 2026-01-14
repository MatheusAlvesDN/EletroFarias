import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Se o frontend vai acessar via navegador, habilite CORS
 app.enableCors({
  origin: [
    'http://192.168.20.56:3000', // se seu front estiver nessa porta (exemplo)
    'http://192.168.20.56:3001', // IP do outro PC se ele serve o front
    'http://localhost:3000',
    'http://localhost:3001',
  ],
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
});

  const port = process.env.PORT ? Number(process.env.PORT) : 3000;

  // IMPORTANTE: 0.0.0.0 permite acesso por outros PCs na rede
  await app.listen(port, '0.0.0.0');

  console.log(`API: http://localhost:${port}`);
}
bootstrap();
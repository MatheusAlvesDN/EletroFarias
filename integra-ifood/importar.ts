import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { SankhyaService } from './src/Sankhya/sankhya.service';
import * as fs from 'fs';
import * as path from 'path';

async function bootstrap() {
  console.log('Iniciando script de importação...');
  const app = await NestFactory.createApplicationContext(AppModule);
  const sankhyaService = app.get(SankhyaService);

  const tsvPath = path.join(__dirname, 'produtos.tsv');
  
  if (!fs.existsSync(tsvPath)) {
    console.error('Arquivo produtos.tsv não encontrado em', tsvPath);
    process.exit(1);
  }

  const rawData = fs.readFileSync(tsvPath, 'utf8');

  // Transforma o TSV em ProdutoNotaDTO
  // Pula a primeira linha (cabeçalho)
  const lines = rawData.split('\n').filter(l => l.trim() !== '');
  const headers = lines[0].split('\t').map(h => h.trim());
  
  const idxProd = headers.indexOf('{CODPROD}');

  if (idxProd === -1) {
    console.error('Cabeçalho inválido. Certifique-se de que {CODPROD} está presente.');
    process.exit(1);
  }

  const produtosFormatados: number[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split('\t');
    if (cols.length <= idxProd) continue;

    let codProd = parseInt(cols[idxProd], 10);

    if (!isNaN(codProd)) {
      produtosFormatados.push(codProd);
    }
  }

  console.log(`Lidos ${produtosFormatados.length} produtos.`);

  try {
    console.log('Autenticando no Sankhya...');
    const token = await sankhyaService.login();
    
    console.log('Enviando requisição de inclusão de nota...');
    const resp = await sankhyaService.incluirNotaEmLote(
      1, // CODPARC
      314, // CODTIPOPER
      40, // CODTIPVENDA
      produtosFormatados,
      token
    );

    console.log('Resposta do Sankhya:', JSON.stringify(resp, null, 2));
    
  } catch (error) {
    console.error('Erro na importação:', error?.response?.data || error.message);
  } finally {
    await app.close();
  }
}

bootstrap();

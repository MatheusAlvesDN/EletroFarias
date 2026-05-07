import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { SankhyaService } from './src/Sankhya/sankhya.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const sankhya = app.get(SankhyaService);
  const token = await sankhya.login();
  console.log("Token obitdo!");
  const sql = `
      SELECT * FROM (
        SELECT a.*, ROWNUM r__ FROM (
          SELECT 
            P.CODPROD, 
            P.AD_NOMEPRDLV AS DESCRPROD, 
            COALESCE((
              SELECT MAX(X.VLRVENDA) 
              FROM TGFEXC X 
              WHERE X.CODPROD = P.CODPROD 
                AND X.VLRVENDA > 0
                AND X.NUTAB = 0
            ), 0) AS PRECO
          FROM TGFPRO P
          WHERE P.ATIVO = 'S'
            AND ROWNUM <= 10
          ORDER BY P.CODPROD
        ) a 
      )
  `;
  const data = await sankhya['executeQuery'](token, sql);
  const rows = sankhya['normalizeRows'](data);
  console.log(rows);
  await app.close();
}
bootstrap();

import axios from 'axios';
import * as dotenv from 'dotenv';
dotenv.config();

async function run() {
  const token = process.env.SANKHYA_TOKEN;
  const appkey = process.env.SANKHYA_APPKEY;
  const username = process.env.SANKHYA_USERNAME;
  const password = process.env.SANKHYA_PASSWORD;

  // 1. Login
  const loginRes = await axios.post('https://api.sankhya.com.br/login', null, {
    headers: { token, appkey, username, password }
  });
  const bearer = loginRes.data.bearerToken;
  console.log("Logged in:", !!bearer);

  // 2. Query
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
            ), 0) AS MAX_PRECO_EXC,
            COALESCE((
              SELECT MAX(X.NUTAB) 
              FROM TGFEXC X 
              WHERE X.CODPROD = P.CODPROD 
                AND X.VLRVENDA > 0
            ), 0) AS MAX_NUTAB,
            P.MARCA
          FROM TGFPRO P
          WHERE P.ATIVO = 'S'
          ORDER BY P.CODPROD
        ) a WHERE ROWNUM <= 10
      )
  `;

  const body = {
    serviceName: 'DbExplorerSP.executeQuery',
    requestBody: { sql }
  };

  const res = await axios.post('https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=DbExplorerSP.executeQuery&outputType=json', body, {
    headers: { Authorization: `Bearer ${bearer}`, appkey }
  });

  const fields = res.data.responseBody.fieldsMetadata;
  const rows = res.data.responseBody.rows;
  
  const mapped = rows.map((r: any) => {
    const obj: any = {};
    fields.forEach((f: any, i: number) => {
      obj[f.name] = r[i];
    });
    return obj;
  });

  console.log("SQL Results (Limit 10):", mapped);

  // 3. Consulta API Tabela 0 para o produto 24
  const precoRes = await axios.get('https://api.sankhya.com.br/v1/precos/produto/24/tabela/0', {
    headers: { Authorization: `Bearer ${bearer}`, appkey }
  });
  console.log("API Preco Tabela 0 (Prod 24):", precoRes.data);
}

run().catch(console.error);

const axios = require('axios');
require('dotenv').config();

async function test() {
  const loginRes = await axios.post('https://api.sankhya.com.br/login', null, {
    headers: {
      token: process.env.SANKHYA_TOKEN,
      appkey: process.env.SANKHYA_APPKEY,
      username: process.env.SANKHYA_USERNAME,
      password: process.env.SANKHYA_PASSWORD
    }
  });
  const token = loginRes.data.bearerToken;
  
  const sql = `SELECT * FROM TGFEXC WHERE CODPROD = 20282`;
  
  const body = {
    serviceName: 'DbExplorerSP.executeQuery',
    requestBody: { sql }
  };
  
  const res = await axios.post('https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=DbExplorerSP.executeQuery&outputType=json', body, {
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }
  });
  console.log(JSON.stringify(res.data, null, 2));
}

test().catch(e => console.error(e.response?.data || e.message));

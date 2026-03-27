require('dotenv').config();
const axios = require('axios');

async function testQuery() {
  const loginUrl = 'https://api.sankhya.com.br/gateway/v1/mge/mge/service.sbr?serviceName=MobileLoginSP.login';
  const loginBody = { serviceName: 'MobileLoginSP.login', requestBody: { NOMUSU: process.env.SANKHYA_USER, INTERNO: process.env.SANKHYA_PASSWORD } };
  
  const loginRes = await axios.post(loginUrl, loginBody, { headers: { appkey: process.env.SANKHYA_APPKEY } });
  const token = loginRes.headers['bearer'];
  
  const url = 'https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=DbExplorerSP.executeQuery&outputType=json';
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const sql1 = `SELECT NUNOTA, NUMNOTA, (SELECT XML FROM TGFIXN WHERE NUNOTA = CAB.NUNOTA AND ROWNUM = 1) AS XML_NUNOTA FROM TGFCAB CAB WHERE NUMNOTA = 27229 AND ROWNUM = 1`;
  const sql2 = `SELECT NUNOTA, NUMNOTA, (SELECT XML FROM TGFIXN WHERE NUMNOTA = CAB.NUMNOTA AND ROWNUM = 1) AS XML_NUMNOTA FROM TGFCAB CAB WHERE NUMNOTA = 27229 AND ROWNUM = 1`;
  const sql3 = `SELECT NUNOTA, NUMNOTA, CHAVENFE, (SELECT XML FROM TGFIXN WHERE CHAVENFE = CAB.CHAVENFE AND ROWNUM = 1) AS XML_CHAVE FROM TGFCAB CAB WHERE NUMNOTA = 27229 AND ROWNUM = 1`;

  try {
    const res1 = await axios.post(url, { serviceName: 'DbExplorerSP.executeQuery', requestBody: { sql: sql1 } }, { headers });
    console.log("SQL 1 Result:", res1.data.responseBody.rows);
  } catch(e) { console.log(e.response?.data); }

  try {
    const res2 = await axios.post(url, { serviceName: 'DbExplorerSP.executeQuery', requestBody: { sql: sql2 } }, { headers });
    console.log("SQL 2 Result:", res2.data.responseBody.rows);
  } catch(e) { console.log(e.response?.data); }

}

testQuery().catch(console.error);

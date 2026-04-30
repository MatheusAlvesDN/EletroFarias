const fs = require('fs');
const content = fs.readFileSync('c:\\Users\\eletr\\VSCode\\Intgr\\integra-front\\src\\app\\admin\\acessos\\page.tsx', 'utf8');
console.log('Line 28 HEX:', Buffer.from(content.split('\n')[27]).toString('hex'));
console.log('Full content line endings:', content.includes('\r\n') ? 'CRLF' : 'LF');

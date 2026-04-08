import { PrintService } from './src/Print/print.service';
import * as fs from 'fs';

async function test() {
  const service = new PrintService();
  const itens = [
    {
      codprod: 1234,
      codbarra: '1234567890123',
      descrprod: 'TEST PRODUCT 1',
      localizacao2: 'B01',
      qtdneg: 10,
      referencia: 'REF-1234'
    },
    {
      codprod: 9999,
      codbarra: '9999999999',
      descrprod: 'TEST PRODUCT 2 (SAME REF)',
      localizacao2: 'B02',
      qtdneg: 5,
      referencia: '9999'
    }
  ];

  try {
    const pdfBuffer = await service.gerarMapaSeparacaoLoc2(1001, itens);
    fs.writeFileSync('test_mapa.pdf', pdfBuffer);
    console.log('PDF saved correctly!');
  } catch(e) {
    console.error(e);
  }
}

test();

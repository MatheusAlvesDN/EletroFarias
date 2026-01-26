// print.service.ts
import * as PDFDocument from 'pdfkit';
import * as bwipjs from 'bwip-js';

export type EtiquetaCabo = {
  nunota: number;
  parceiro: string;
  vendedor: string;
  codprod: number;
  descrprod: string;
  qtdneg: number;
  codbarras: string;
};

function mmToPt(mm: number) {
  return (mm * 72) / 25.4;
}

function truncateToWidth(doc: PDFKit.PDFDocument, text: string, maxWidth: number) {
  const ellipsis = '…';
  if (!text) return '';
  if (doc.widthOfString(text) <= maxWidth) return text;

  let t = text;
  while (t.length > 0 && doc.widthOfString(t + ellipsis) > maxWidth) {
    t = t.slice(0, -1);
  }
  return t.length ? t + ellipsis : ellipsis;
}

export class PrintService {

  async gerarEtiquetaPdf(label: EtiquetaCabo): Promise<Buffer> {
  
    const barcodeText = String(label.codprod);
    const barcodePng: Buffer = await bwipjs.toBuffer({
      bcid: 'code128',
      text: barcodeText,
      scale: 2,          
      height: 8,         
      includetext: false 
      // includetext: true,
      // textsize: 8,
    });

    return new Promise<Buffer>((resolve, reject) => {
      const pageSize = mmToPt(40);     
      const margin = mmToPt(2);        

      const doc = new PDFDocument({
        size: [pageSize, pageSize],
        margins: { top: margin, left: margin, right: margin, bottom: margin },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const contentWidth = pageSize - margin * 2;

      doc.font('Helvetica');

      doc.fontSize(7);
      doc.text(`NUNOTA: ${label.nunota}`, { width: contentWidth, lineBreak: false });

      doc.moveDown(0.15);

      doc.fontSize(7);
      //const prodLine = truncateToWidth(doc, `Produto: ${label.descrprod}`, contentWidth);
      //doc.text(prodLine, { width: contentWidth });
      doc.text(`Produto: ${label.descrprod}`)

      doc.moveDown(0.1);

      doc.fontSize(7);
      const infoLine = truncateToWidth(
        doc,
        `Qtd: ${label.qtdneg}m  Cod: ${label.codprod}`,
        contentWidth,
      );
      doc.text(infoLine, { width: contentWidth });

   
      const yAfterText = doc.y + mmToPt(1);
      const availableHeight = pageSize - margin - yAfterText;

      const barcodeWidth = contentWidth;
      const barcodeHeight = Math.max(mmToPt(12), Math.min(availableHeight, mmToPt(18)));

      const x = margin;
      const y = pageSize - margin - barcodeHeight;

      doc.image(barcodePng, x, y, { width: barcodeWidth, height: barcodeHeight });

      doc.end();
    });




  }
  
  async gerarEtiquetaCaboPdf(label: EtiquetaCabo): Promise<Buffer> {
    const barcodeText = String(label.codprod);
    const barcodePng: Buffer = await bwipjs.toBuffer({
      bcid: 'code128',
      text: barcodeText,
      scale: 2,          
      height: 8,         
      includetext: false 
      //includetext: true,
      //textsize: 8,
    });

    return new Promise<Buffer>((resolve, reject) => {
      const pageSize = mmToPt(40);    
      const margin = mmToPt(2);        

      const doc = new PDFDocument({
        size: [pageSize, pageSize],
        margins: { top: margin, left: margin, right: margin, bottom: margin },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const contentWidth = pageSize - margin * 2;

      doc.font('Helvetica');

      doc.fontSize(7);
      doc.text(`NUNOTA: ${label.nunota}`, { width: contentWidth, lineBreak: false });

      doc.moveDown(0.15);

      doc.fontSize(7);
      //const prodLine = truncateToWidth(doc, `Produto: ${label.descrprod}`, contentWidth);
      //doc.text(prodLine, { width: contentWidth });
      doc.text(`Produto: ${label.descrprod}`)

      doc.moveDown(0.1);

      doc.fontSize(7);
      const infoLine = truncateToWidth(
        doc,
        `Qtd: ${label.qtdneg}m  Cod: ${label.codprod}`,
        contentWidth,
      );
      doc.text(infoLine, { width: contentWidth });

      
      const yAfterText = doc.y + mmToPt(1);
      const availableHeight = pageSize - margin - yAfterText;

      const barcodeWidth = contentWidth;
      const barcodeHeight = Math.max(mmToPt(12), Math.min(availableHeight, mmToPt(18)));

      const x = margin;
      const y = pageSize - margin - barcodeHeight;

      doc.image(barcodePng, x, y, { width: barcodeWidth, height: barcodeHeight });

      doc.end();
    });
  }

  async gerarEtiquetaLocPDF(localizacao: string, endereco: string ): Promise<Buffer> {
   
    const barcodeText = String(localizacao ?? '');
    const barcodePng: Buffer = await bwipjs.toBuffer({
      bcid: 'code128',
      text: barcodeText,
      scale: 2,          
      height: 8,         
      includetext: false 
      // includetext: true,
      // textsize: 8,
    });

    return new Promise<Buffer>((resolve, reject) => {
      const pageSize = mmToPt(40);     
      const margin = mmToPt(2);        

      const doc = new PDFDocument({
        size: [pageSize, pageSize],
        margins: { top: margin, left: margin, right: margin, bottom: margin },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const contentWidth = pageSize - margin * 2;

      doc.font('Helvetica');

      doc.fontSize(7);

      doc.moveDown(0.01);

      doc.fontSize(7);
      doc.text(`Localização: ${endereco}`)
      doc.text(`_________________________`)


    
      const yAfterText = doc.y + mmToPt(1);
      const availableHeight = pageSize - margin - yAfterText;

      const barcodeWidth = contentWidth;
      const barcodeHeight = Math.max(mmToPt(12), Math.min(availableHeight, mmToPt(18)));

      const x = margin;
      const y = pageSize - margin - barcodeHeight;

      // Se o texto crescer demais, ainda força o barcode pro rodapé
      doc.image(barcodePng, x, y, { width: barcodeWidth, height: barcodeHeight });

      doc.end();
    });
  }

async gerarEtiquetaLocPDFMulti(
  items: Array<{ localizacao: string; endereco: string }>
): Promise<Buffer> {
  let pages = 0;
  return new Promise<Buffer>(async (resolve, reject) => {
    try {
      const pageSize = mmToPt(40);
      const margin = mmToPt(2);

      const doc = new PDFDocument({
        size: [pageSize, pageSize],
        margins: { top: margin, left: margin, right: margin, bottom: margin },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const contentWidth = pageSize - margin * 2;

      for (let idx = 0; idx < items.length; idx++) {
        const it = items[idx];

        if (idx > 0) doc.addPage();

        const barcodeText = String(it.endereco ?? '');
        const barcodePng: Buffer = await bwipjs.toBuffer({
          bcid: 'code128',
          text: barcodeText,
          scale: 2,
          height: 8,
          includetext: false,
        });

        doc.font('Helvetica');
        doc.fontSize(7);

        doc.text(`           Eletro Farias`)
        doc.moveDown(0.15);
        doc.fontSize(8);
        doc.text(`______________________`);
        doc.text(`${String(it.localizacao ?? '')}`);
        doc.moveDown(0.15);
        const yAfterText = doc.y + mmToPt(1);
        const availableHeight = pageSize - margin - yAfterText;

        const barcodeWidth = contentWidth;
        const barcodeHeight = Math.max(mmToPt(12), Math.min(availableHeight, mmToPt(18)));

        const x = margin;
        const y = pageSize - margin - barcodeHeight;

        doc.image(barcodePng, x, y, { width: barcodeWidth, height: barcodeHeight });
        pages+=1
        console.log("PAGINAS: " + pages)
      }

      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}

async gerarEtiquetaLocQRCodeMulti(
  items: Array<{ localizacao: string; endereco: string }>
): Promise<Buffer> {
  let pages = 0;
  return new Promise<Buffer>(async (resolve, reject) => {
    try {
      const pageSize = mmToPt(40);
      const margin = mmToPt(2);

      const doc = new PDFDocument({
        size: [pageSize, pageSize],
        margins: { top: margin, left: margin, right: margin, bottom: margin },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const contentWidth = pageSize - margin * 2;

      for (let idx = 0; idx < items.length; idx++) {
        const it = items[idx];

        // nova página a partir do 2º item
        if (idx > 0) doc.addPage();

        const barcodeText = String(it.endereco ?? '');
        const barcodePng: Buffer = await bwipjs.toBuffer({
            bcid: 'qrcode',
            text: String(barcodeText ?? ''),
            scale: 4,       
            includetext: false,
       });

        doc.font('Helvetica');
        doc.fontSize(9);

        // topo
        doc.text(`           Eletro Farias`)
        doc.moveDown(0.15);
        doc.fontSize(8);
        doc.text(`______________________`);
        doc.text(`${String(it.localizacao ?? '')}`);
        doc.moveDown(0.15);
        // calcula área pro barcode no rodapé
        const yAfterText = doc.y + mmToPt(1);
        const availableHeight = pageSize - margin - yAfterText;

        const barcodeWidth = contentWidth;
        const barcodeHeight = Math.max(mmToPt(25), Math.min(availableHeight, mmToPt(30)));

        const x = margin;
        const y = pageSize - margin - barcodeHeight;

        doc.image(barcodePng, x, y, { width: barcodeWidth, height: barcodeHeight });
        pages+=1
        console.log("PAGINAS: " + pages)
      }

      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}

async gerarEtiquetaTeste(): Promise<Buffer> {
    
    return new Promise<Buffer>((resolve, reject) => {
      const pageSize = mmToPt(40);     
      const margin = mmToPt(2);        

      const doc = new PDFDocument({
        size: [pageSize, pageSize],
        margins: { top: margin, left: margin, right: margin, bottom: margin },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const contentWidth = pageSize - margin * 2;

      doc.font('Helvetica');

      doc.fontSize(7);

      doc.moveDown(0.01);

      doc.fontSize(7);
      doc.text(`ETIQUETA DE TESTE DE IMPRESSÃO`)
      doc.text(`_________________________`)


      const yAfterText = doc.y + mmToPt(1);
      const availableHeight = pageSize - margin - yAfterText;

      const barcodeWidth = contentWidth;
      const barcodeHeight = Math.max(mmToPt(12), Math.min(availableHeight, mmToPt(18)));

      const x = margin;
      const y = pageSize - margin - barcodeHeight;

      doc.end();
    });
}

}

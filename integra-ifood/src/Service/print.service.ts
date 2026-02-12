// print.service.ts
import * as PDFDocument from 'pdfkit';
import * as bwipjs from 'bwip-js';
import * as fsPromises from 'fs/promises';
import * as path from 'path';


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
        doc.moveDown(0.15);
      }

      

      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}

async gerarEtiquetaLocQRCodeMultiBig(
  items: Array<{ localizacao: string; endereco: string }>
): Promise<Buffer> {
  let pages = 0;
  return new Promise<Buffer>(async (resolve, reject) => {
    try {
      const pageSize = mmToPt(200);
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

        const barcodeWidth = contentWidth;
        const barcodeHeight = contentWidth;

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

async gerarEtiquetaLocMultiPalette(
  items: Array<{ localizacao: string; endereco: string }>
): Promise<Buffer> {
  let pages = 0;

  return new Promise<Buffer>(async (resolve, reject) => {
    try {
      const pageSize = mmToPt(100);
      const margin = mmToPt(2);
      const gap = mmToPt(3); // Pequeno espaço entre texto e barras
      
      const doc = new PDFDocument({
        size: [pageSize, pageSize],
        margins: { top: margin, left: margin, right: margin, bottom: margin },
        autoFirstPage: false,
      });

      const chunks: Buffer[] = [];
      doc.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      if (items.length > 0) doc.addPage();

      const contentWidth = pageSize - margin * 2;
      const centerY = pageSize / 2; // Centro vertical da página

      for (let idx = 0; idx < items.length; idx++) {
        const it = items[idx];
        if (idx > 0) doc.addPage();

        const endereco = String(it.endereco ?? '');
        const localizacao = String(it.localizacao ?? '');

        // ---------------------------------------------------------
        // 1. CONFIGURAÇÃO DO CÓDIGO DE BARRAS
        // ---------------------------------------------------------
        // Definimos uma altura fixa para evitar esticamento bizarro, 
        // mas grande o suficiente para leitura (ex: 30mm)
        const barcodeHeight = mmToPt(50); 
        const barcodeWidth = contentWidth * 0.95; // Largura quase total

        // Calcula posição Y do código para que fique EXATAMENTE no centro vertical
        const barcodeY = centerY - (barcodeHeight / 2);
        const barcodeX = margin + (contentWidth - barcodeWidth) / 2;

        const barcodePng: Buffer = await bwipjs.toBuffer({
          bcid: 'code128',
          text: endereco,
          scale: 4,
          height: 15, // Altura relativa das barras no desenho do buffer
          includetext: false,
          textxalign: 'center',
        });

        doc.font('Helvetica');

        // ---------------------------------------------------------
        // 2. CÁLCULO DAS POSIÇÕES DE TEXTO (Relativo ao Código)
        // ---------------------------------------------------------
        
        // TOPO: Medimos a altura que o texto vai ocupar para saber onde começar
        doc.fontSize(26);
        const topTextHeight = doc.heightOfString(endereco, {
          width: contentWidth,
          align: 'center',
        });

        // O Y do topo deve ser: Onde começa o código - gap - altura do texto
        const topTextY = barcodeY - gap - topTextHeight;

        // RODAPÉ: O Y deve ser: Onde termina o código + gap
        const bottomTextY = barcodeY + barcodeHeight + gap;

        // ---------------------------------------------------------
        // 3. RENDERIZAÇÃO
        // ---------------------------------------------------------

        // A. Texto Topo (Endereço)
        doc.text(endereco, margin, topTextY, {
          width: contentWidth,
          align: 'center',
        });

        // B. Código de Barras (Centralizado)
        doc.image(barcodePng, barcodeX, barcodeY, {
          width: barcodeWidth,
          height: barcodeHeight,
          align: 'center',
          valign: 'center', 
        });

        // C. Texto Rodapé (Localização)
        doc.fontSize(14);
        doc.text(localizacao, margin, bottomTextY, {
          width: contentWidth,
          align: 'center',
        });

        pages += 1;
        console.log('PAGINAS: ' + pages);
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

async gerarEtiquetaLidPdfB(
  nunota: number,
  parceiro: string,
  vendedor: string,
  codprod: number,
  descrprod: string,
  qtd_negociada: number,
): Promise<Buffer> {
  const logoPath = path.join(process.cwd(), 'public', 'images', 'logo-lid.png');
  const logoPng = await fsPromises.readFile(logoPath);

  return new Promise<Buffer>((resolve, reject) => {
    const pageSize = mmToPt(100);
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

    // =========================================================
    // ✅ HEADER: logo ocupando toda a parte superior
    // =========================================================
    const headerHeight = mmToPt(12); // <<< "parte superior" (aumente/diminua aqui)
    const headerX = margin;
    const headerY = margin;

    // Desenha a logo dentro de um "banner" (largura toda)
    doc.image(logoPng, headerX, headerY, {
      fit: [contentWidth, headerHeight], // ocupa a largura toda, altura do header
      align: 'center',
    });

    // Cursor começa depois do header (garante que texto não invade a logo)
    let yCursor = headerY + headerHeight + mmToPt(1);

    const bottomLimit = pageSize - margin;

    // =========================================================
    // TEXTO (abaixo do header)
    // =========================================================
    doc.fontSize(7);

    const writeLine = (text: string) => {
      if (yCursor >= bottomLimit) return;
      doc.text(text, margin, yCursor, { width: contentWidth, lineBreak: true });
      yCursor = doc.y + mmToPt(0.6);
    };

    writeLine(`Produto: ${descrprod} | Nunota: ${nunota}`);
    writeLine(`Codigo: ${codprod} | Quantidade: ${qtd_negociada}`);
    writeLine(`Parceiro: ${parceiro} | Vendedor: ${vendedor}`);

    doc.end();
  });
}

async gerarEtiquetaLidPdf(
  nunota: number,
  parceiro: string,
  vendedor: string,
  codprod: number,
  descrprod: string,
  qtd_negociada: number,
): Promise<Buffer> {
  const logoPath = path.join(process.cwd(), 'public', 'images', 'logo-lid.png');
  // Se certifique que o arquivo existe, ou trate o erro caso a imagem falhe
  const logoPng = await fsPromises.readFile(logoPath);

  return new Promise<Buffer>((resolve, reject) => {
    // Definição de tamanhos
    const pageSize = mmToPt(40);
    const halfSize = mmToPt(20); // Metade da etiqueta (20mm)
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
    
    // =========================================================
    // 1. IMAGEM (Metade Superior)
    // =========================================================
    // A imagem vai ser desenhada dentro da caixa de 0 a 20mm (halfSize)
    // Usamos valign: 'center' para ela ficar centralizada verticalmente nesse espaço
    doc.image(logoPng, margin, margin, {
      fit: [contentWidth, halfSize - (margin * 2)], // Desconta margem para não colar na borda
      align: 'center',
      valign: 'center'
    });

    // =========================================================
    // 2. TEXTO (Metade Inferior)
    // =========================================================
    
    // Move o cursor para o início da metade de baixo + um pequeno respiro
    doc.y = halfSize + mmToPt(1);

    // --- Linha 1: CODPROD (Negrito e Centralizado) ---
    doc.font('Helvetica-Bold').fontSize(11);
    doc.text(String(codprod), margin, doc.y, {
      width: contentWidth,
      align: 'center',
      lineGap: 2
    });

    // --- Linha 2: Descrição e Quantidade ---
    // Voltamos para fonte normal e tamanho menor para caber
    doc.font('Helvetica').fontSize(8);
    
    // Descrição (limitada a 1 linha com ... se for muito grande, ou 2 linhas se preferir)
    doc.text(descrprod, {
      width: contentWidth,
      align: 'center',
      lineGap: 2,
      height: mmToPt(8), // Limita altura para não estourar
      ellipsis: true     // Coloca "..." se o texto for maior que o espaço
    });

    doc.font('Helvetica-Bold');
    doc.text(`Qtd: ${qtd_negociada}`, {
      width: contentWidth,
      align: 'center'
    });

    doc.end();
  });
}

}

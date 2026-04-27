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

type OrcamentoDfariasItem = {
  category: string;
  product: string;
  qty: number;
  unit: string;
  unitPrice?: number;
  totalPrice?: number;
};

type OrcamentoDfariasQuadro = {
  id: number;
  nome: string;
  tipo: string;
  totalPrice?: number;
  items: OrcamentoDfariasItem[];
};

type OrcamentoDfariasPayload = {
  budgetName: string;
  projectName: string;
  prazoEntrega?: number | null;
  quadros: OrcamentoDfariasQuadro[];
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
  async gerarOrcamentoDfariasPdf(payload: OrcamentoDfariasPayload): Promise<Buffer> {
    const logoPath = path.join(process.cwd(), 'public', 'images', 'eletro_farias.png');

    return new Promise<Buffer>(async (resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 0, // We'll handle margins manually for backgrounds
        });

        const chunks: Buffer[] = [];
        doc.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        const pageWidth = doc.page.width;
        const pageHeight = doc.page.height;
        const brandColor = '#351B4F';
        const brandColorLight = '#F3F4F6';
        const textColor = '#374151';
        const margin = 40;
        const contentWidth = pageWidth - margin * 2;

        const drawFooter = () => {
          doc.save();
          doc.rect(0, pageHeight - 20, pageWidth, 20).fill(brandColor);
          doc.fillColor('#FFFFFF').font('Helvetica').fontSize(8).text(
            'DFarias Engenharia e Automação / Pedro Silva, Tambor / www.dfarias.com.br',
            0,
            pageHeight - 14,
            { width: pageWidth, align: 'center' },
          );
          doc.restore();
        };

        const ensureSpace = (heightNeeded: number) => {
          if (doc.y + heightNeeded <= pageHeight - 60) return;
          drawFooter();
          doc.addPage({ size: 'A4', margin: 40 });
          doc.y = 40;
        };

        // --- PAGE 1: COVER ---
        doc.rect(0, 0, pageWidth, pageHeight).fill('#FFFFFF');

        try {
          doc.image(logoPath, (pageWidth - 200) / 2, 150, { width: 200 });
        } catch (e) {
          console.warn('Logo not found at:', logoPath);
        }

        doc.fillColor(brandColor).font('Helvetica-Bold').fontSize(32).text('PROPOSTA', 0, 350, { align: 'center' });
        doc.text('COMERCIAL', { align: 'center' });

        doc.moveDown(2);
        doc.fillColor('#9CA3AF').font('Helvetica').fontSize(16).text(payload.budgetName || 'ORÇAMENTO DFARIAS', { align: 'center' });

        doc.addPage({ size: 'A4', margin: 40 });

        // --- PAGE 2: INSTITUTIONAL ---
        doc.rect(0, 0, pageWidth, pageHeight).fill(brandColorLight);

        // Institutional Header
        try {
          doc.image(logoPath, 40, 40, { width: 60 });
        } catch (e) {}

        doc.fillColor(textColor).font('Helvetica-Bold').fontSize(12).text('DFarias Engenharia e Automação', 110, 45);
        doc.font('Helvetica').fontSize(9).text('CNPJ: 24.000.965/0001-42', 110, 60);
        doc.text('(83) 98889-4729', 110, 72);
        doc.text('CAMPINA GRANDE - PB', 110, 84);

        // Date Bar
        doc.rect(40, 110, 120, 24).fill(brandColor);
        doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(10).text(new Date().toLocaleDateString('pt-BR'), 40, 117, { width: 120, align: 'center' });

        doc.rect(160, 110, contentWidth - 120, 24).fill('#E5E7EB');
        doc.fillColor('#9CA3AF').font('Helvetica').fontSize(10).text(`Proposta nº ${String(Date.now()).slice(-4)}`, 170, 117);

        doc.y = 160;
        doc.fillColor(brandColor).font('Helvetica-Bold').fontSize(12).text('Quem somos');
        doc.moveDown(0.5);
        doc.fillColor(textColor).font('Helvetica').fontSize(10).text('Há mais de dez anos na região da Paraíba atuando no mercado de service e fabricação de painéis e quadros elétricos.');

        doc.moveDown(1.5);
        doc.fillColor(brandColor).font('Helvetica-Bold').fontSize(12).text('Certificações');
        doc.moveDown(0.5);
        doc.fillColor(textColor).font('Helvetica').fontSize(10).text('• Especialista em fornecimento de produtos em Média Tensão da Schneider Electric, Weg e Siemens.');
        doc.moveDown(0.3);
        doc.text('• Especialista em fornecimento e instalação de produtos elétricos dos fabricantes da Schneider Electric, Weg e Siemens.');

        doc.moveDown(1.5);
        doc.fillColor(brandColor).font('Helvetica-Bold').fontSize(12).text('Certificações e ensaios de Painéis e Quadro');
        doc.moveDown(0.5);
        doc.fillColor(textColor).font('Helvetica').fontSize(10).text('• Ensaios de fabricação conforme a NBR-5410. • Fabricação de quadros e Painéis e quadros elétricos de acordo com projeto elétrico.');
        doc.moveDown(0.3);
        doc.text('• Ensaios de tipo PTTA de acordo com normas ABNT NBR 60439-1 e IEC 616439-1&2.');

        doc.moveDown(1.5);
        doc.fillColor(brandColor).font('Helvetica-Bold').fontSize(12).text('Service');
        doc.moveDown(0.5);
        doc.fillColor(textColor).font('Helvetica').fontSize(10).text('• Fornecimento e documentações atualizadas da equipe - PCMSO, PGR, LTCAT, RELATORIO ANUAL DE NR10, NR35 E NR18.');

        doc.addPage({ size: 'A4', margin: 40 });

        // --- PAGE 3+: ITEMS ---
        // Header (smaller logo)
        try {
          doc.image(logoPath, 40, 40, { width: 50 });
        } catch (e) {}

        doc.fillColor(textColor).font('Helvetica-Bold').fontSize(10).text('DFarias Engenharia e Automação', 100, 42);
        doc.font('Helvetica').fontSize(8).text('CNPJ: 24.000.965/0001-42', 100, 54);
        doc.text('(083) 96383277', 100, 64);
        doc.text('CAMPINA GRANDE - PB', 100, 74);

        doc.y = 100;
        doc.font('Helvetica-Bold').fontSize(14).fillColor(brandColor).text(`Projeto: ${payload.projectName || 'HOSPITAL'}`);
        doc.moveDown(0.5);
        doc.font('Helvetica-Bold').fontSize(12).text('Escopo:');
        doc.font('Helvetica').fontSize(10).fillColor(textColor).text('A presente proposta tem por objetivo formalizar o fornecimento e a integração de painéis e quadros elétricos industrializados, em total conformidade com o projeto e a solicitação recebida.');

        doc.moveDown(1);
        doc.font('Helvetica-Bold').text('Lista de painéis e materiais:');
        doc.moveDown(0.5);

        let grandTotal = 0;

        for (const quadro of payload.quadros ?? []) {
          const quadroTotal = typeof quadro.totalPrice === 'number'
            ? quadro.totalPrice
            : (quadro.items ?? []).reduce((acc, item) => acc + (item.totalPrice ?? 0), 0);
          grandTotal += quadroTotal;

          ensureSpace(60);

          // Quadro Header Table
          const startY = doc.y;
          doc.rect(40, startY, contentWidth, 20).fill(brandColor);
          doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(9);
          doc.text(`${quadro.tipo || 'QUADRO PADRÃO ENERGISA'} - ${quadro.nome || 'Quadro'}`, 45, startY + 6);
          doc.text(`R$ ${quadroTotal.toFixed(2)}`, 40, startY + 6, { width: contentWidth - 5, align: 'right' });

          doc.y = startY + 20;

          // Table Columns
          const colItem = 40;
          const colQtd = 80;
          const colDescr = 120;
          const colUnit = 400;
          const colTot = 480;

          doc.rect(40, doc.y, contentWidth, 18).fill('#E5E7EB');
          doc.fillColor(brandColor).font('Helvetica-Bold').fontSize(8);
          doc.text('Item', colItem + 4, doc.y + 5, { width: 36 });
          doc.text('Qtde', colQtd + 4, doc.y + 5, { width: 36 });
          doc.text('Descrição', colDescr + 4, doc.y + 5, { width: 270 });
          doc.text('Valor unit.', colUnit, doc.y + 5, { width: 75, align: 'right' });
          doc.text('Valor', colTot, doc.y + 5, { width: 75, align: 'right' });

          doc.y += 18;
          doc.fillColor(textColor).font('Helvetica').fontSize(8);

          for (let index = 0; index < (quadro.items ?? []).length; index += 1) {
            const item = quadro.items[index];
            const description = `${item.product}${item.category ? ` (CODPROD: ${item.category})` : ''}`;
            const rowHeight = Math.max(16, doc.heightOfString(description, { width: 270 }) + 6);

            ensureSpace(rowHeight);

            const rowY = doc.y;
            doc.text(String(index + 1), colItem + 4, rowY + 4);
            doc.text(`${item.qty}`, colQtd + 4, rowY + 4);
            doc.text(description, colDescr + 4, rowY + 4, { width: 270 });
            doc.text(`R$ ${(item.unitPrice ?? 0).toFixed(2)}`, colUnit, rowY + 4, { width: 75, align: 'right' });
            doc.text(`R$ ${(item.totalPrice ?? 0).toFixed(2)}`, colTot, rowY + 4, { width: 75, align: 'right' });

            doc.moveTo(40, rowY + rowHeight).lineTo(pageWidth - 40, rowY + rowHeight).strokeColor('#F3F4F6').lineWidth(0.5).stroke();
            doc.y = rowY + rowHeight;
          }

          doc.moveDown(1);
        }

        ensureSpace(40);
        doc.font('Helvetica-Bold').fontSize(12).fillColor(brandColor).text(`Valor total da proposta: R$ ${grandTotal.toFixed(2)}`, {
          align: 'right',
        });

        // --- FINAL PAGE: CONDITIONS ---
        doc.addPage({ size: 'A4', margin: 40 });

        // Header
        try {
          doc.image(logoPath, 40, 40, { width: 60 });
        } catch (e) {}
        doc.fillColor(textColor).font('Helvetica-Bold').fontSize(12).text('DFarias Engenharia e Automação', 110, 45);
        doc.font('Helvetica').fontSize(9).text('CNPJ: 24.000.965/0001-42', 110, 60);
        doc.text('(083) 96383277', 110, 72);
        doc.text('CAMPINA GRANDE - PB', 110, 84);

        doc.y = 140;
        doc.fillColor(brandColor).font('Helvetica-Bold').fontSize(14).text('Condições Gerais:');
        doc.moveDown(1);

        doc.fillColor(textColor).font('Helvetica-Bold').fontSize(11).text('Preços:');
        doc.font('Helvetica').fontSize(10).text('Os preços propostos são válidos por 30 dias.');
        doc.moveDown(0.8);

        doc.font('Helvetica-Bold').fontSize(11).text('Tributos:');
        doc.font('Helvetica').fontSize(10).text('Qualquer tributo ou encargo que venha existir ou seja alterado será repassado ao preço contratado.');
        doc.moveDown(0.8);

        doc.font('Helvetica-Bold').fontSize(11).text('Aceitação do Pedido:');
        doc.font('Helvetica').fontSize(10).text('A proposta será considerada aceita após o recebimento da ordem de compra.');
        doc.moveDown(1.5);

        doc.font('Helvetica-Bold').fontSize(14).fillColor(brandColor).text(`Prazo de Entrega – ${typeof payload.prazoEntrega === 'number' ? `${payload.prazoEntrega} DIAS` : '30 A 60 DIAS'}`);

        drawFooter();
        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  async gerarEtiquetaPdf(
    label: EtiquetaCabo): Promise<Buffer> {

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

  async gerarEtiquetaCaboPdf(
    label: EtiquetaCabo): Promise<Buffer> {
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

  async gerarEtiquetaLocPDF(
    localizacao: string, endereco: string): Promise<Buffer> {

    const barcodeText = String(localizacao ?? '');
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
          pages += 1
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

          doc.text(`           Eletro Farias`)
          doc.moveDown(0.15);
          doc.fontSize(8);
          doc.text(`______________________`);
          doc.text(`${String(it.localizacao ?? '')}`);
          doc.moveDown(0.15);
          const yAfterText = doc.y + mmToPt(1);
          const availableHeight = pageSize - margin - yAfterText;

          const barcodeWidth = contentWidth;
          const barcodeHeight = Math.max(mmToPt(25), Math.min(availableHeight, mmToPt(30)));

          const x = margin;
          const y = pageSize - margin - barcodeHeight;

          doc.image(barcodePng, x, y, { width: barcodeWidth, height: barcodeHeight });
          pages += 1
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
          pages += 1
          console.log("PAGINAS: " + pages)
        }

        doc.end();
      } catch (e) {
        reject(e);
      }
    });
  }

  async gerarEtiquetaLocMultiPaletteBarCode(
    items: Array<{ localizacao: string; endereco: string }>
  ): Promise<Buffer> {
    let pages = 0;

    return new Promise<Buffer>(async (resolve, reject) => {
      try {
        const pageSize = mmToPt(100);
        const margin = mmToPt(2);
        const gap = mmToPt(3);

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
        const centerY = pageSize / 2;

        for (let idx = 0; idx < items.length; idx++) {
          const it = items[idx];
          if (idx > 0) doc.addPage();

          const endereco = String(it.endereco ?? '');
          const localizacao = String(it.localizacao ?? '');

          const barcodeHeight = mmToPt(50);
          const barcodeWidth = contentWidth * 0.95;

          const barcodeY = centerY - (barcodeHeight / 2);
          const barcodeX = margin + (contentWidth - barcodeWidth) / 2;

          const barcodePng: Buffer = await bwipjs.toBuffer({
            bcid: 'qrcode',
            text: endereco,
            scale: 4,
            height: 15,
            includetext: false,
            textxalign: 'center',
          });

          doc.font('Helvetica');

          doc.fontSize(26);
          const topTextHeight = doc.heightOfString(endereco, {
            width: contentWidth,
            align: 'center',
          });

          const topTextY = barcodeY - gap - topTextHeight;
          const bottomTextY = barcodeY + barcodeHeight + gap;

          doc.text(endereco, margin, topTextY, {
            width: contentWidth,
            align: 'center',
          });

          doc.image(barcodePng, barcodeX, barcodeY, {
            width: barcodeWidth,
            height: barcodeHeight,
            align: 'center',
            valign: 'center',
          });

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

  async gerarEtiquetaLocMultiPaletteQrCode(
    items: Array<{ localizacao: string; endereco: string }>
  ): Promise<Buffer> {
    let pages = 0;

    return new Promise<Buffer>(async (resolve, reject) => {
      try {
        const pageSize = mmToPt(100);
        const margin = mmToPt(2);
        const gap = mmToPt(1);
        const safetyPadding = 2;

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

        for (let idx = 0; idx < items.length; idx++) {
          const it = items[idx];
          if (idx > 0) doc.addPage();

          const endereco = String(it.endereco ?? '');
          const localizacao = String(it.localizacao ?? '');

          const barcodePng: Buffer = await bwipjs.toBuffer({
            bcid: 'qrcode',
            text: endereco,
            scale: 4,
            height: 15,
            includetext: false,
            textxalign: 'center',
          });

          doc.font('Helvetica');

          doc.fontSize(18);
          doc.text(localizacao, margin, margin, {
            width: contentWidth,
            align: 'center',
          });

          const yEndTop = doc.y;

          doc.fontSize(14);
          const bottomTextHeight = doc.heightOfString(localizacao, {
            width: contentWidth,
            align: 'center'
          });

          const yStartBottom = pageSize - margin - bottomTextHeight - safetyPadding;
          const availableHeight = yStartBottom - yEndTop - (gap * 2);

          if (availableHeight > 0) {
            const maxBarHeight = availableHeight;
            const targetBarWidth = contentWidth * 0.95;
            const centerY = yEndTop + gap + (availableHeight / 2);
            const yBar = centerY - (maxBarHeight / 2);
            const xBar = margin + (contentWidth - targetBarWidth) / 2;

            doc.image(barcodePng, xBar, yBar, {
              width: targetBarWidth,
              height: maxBarHeight,
              align: 'center',
              valign: 'center'
            });
          }

          doc.text(endereco, margin, yStartBottom, {
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

  async gerarEtiquetaLocCabosSetas(
    items: Array<{ localizacao: string; endereco: string; andar: number; seta: string }>
  ): Promise<Buffer> {
    const normalizarSeta = (raw: string) => {
      const s = (raw ?? '').trim().toUpperCase();

      if (s === 'DIR' || s === 'D' || s.includes('DIREIT') || s.includes('>')) return '>>>>';
      if (s === 'ESQ' || s === 'E' || s.includes('ESQUER') || s.includes('<')) return '<<<<';
      if (s === 'CIMA' || s === 'UP' || s.includes('^')) return '^^^^^^';
      if (s === 'BAIXO' || s === 'DOWN' || s.includes('V')) return 'vvvvvv';

      return '>>>>';
    };

    return new Promise<Buffer>(async (resolve, reject) => {
      try {
        const width = mmToPt(70);
        const height = mmToPt(100);
        const margin = mmToPt(5);

        const doc = new PDFDocument({
          size: [width, height],
          margins: { top: margin, left: margin, right: margin, bottom: margin },
          autoFirstPage: false,
        });

        const chunks: Buffer[] = [];
        doc.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
        doc.on('end', () => resolve(Buffer.concat(chunks)));

        for (const it of items) {
          doc.addPage();

          let textColor = '#FFFFFF';

          doc.rect(0, 0, width, height).fill('#FFFFFF');

          if (it.andar === 1) doc.rect(0, 0, width, height).fill('#FF0000');
          if (it.andar === 2) doc.rect(0, 0, width, height).fill('#0000FF');
          if (it.andar === 3) doc.rect(0, 0, width, height).fill('#1b5e20');

          doc.fillColor(textColor);

          const mascaraY = margin + mmToPt(2);
          doc
            .font('Helvetica-Bold')
            .fontSize(15)
            .text(it.localizacao, 0, mascaraY, {
              width,
              align: 'center',
            });

          const barcodePng = await bwipjs.toBuffer({
            bcid: 'code128',
            text: it.endereco,
            scale: 3,
            height: 15,
            includetext: false,
          });

          const barWidth = mmToPt(60);
          const barHeight = mmToPt(22);

          const barX = (width - barWidth) / 2;
          const gapMascaraBarcode = mmToPt(4);
          const barY = mascaraY + mmToPt(10) + gapMascaraBarcode;

          const padding = mmToPt(3);
          doc.rect(barX - padding, barY - padding, barWidth + (padding * 2), barHeight + (padding * 2)).fill('#FFFFFF');

          doc.image(barcodePng, barX, barY, {
            width: barWidth,
            height: barHeight,
          });

          const setaTexto = normalizarSeta(it.seta);

          const setaFont = 78;
          const gap = mmToPt(2);
          const setaAlturaAprox = mmToPt(28);
          const nivelAlturaAprox = mmToPt(8);
          const blocoAltura = setaAlturaAprox + gap + nivelAlturaAprox;

          const blocoTopY = height - margin - blocoAltura;

          doc
            .fillColor(textColor)
            .font('Helvetica-Bold')
            .fontSize(setaFont)
            .text(setaTexto, 0, blocoTopY, {
              width,
              align: 'center',
            });

          doc
            .fillColor(textColor)
            .font('Helvetica-Bold')
            .fontSize(15)
            .text(`NÍVEL ${it.andar}`, 0, blocoTopY + setaAlturaAprox + gap, {
              width,
              align: 'center',
            });
        }

        doc.end();
      } catch (e) {
        reject(e);
      }
    });
  }

  async gerarEtiquetaArea01(
    items: Array<{ rua: string; predio: string; andar: number; endereco: string }>
  ): Promise<Buffer> {
    return new Promise<Buffer>(async (resolve, reject) => {
      try {
        const width = mmToPt(70);
        const height = mmToPt(100);

        const doc = new PDFDocument({
          size: [width, height],
          margins: { top: 0, left: 0, right: 0, bottom: 0 },
          autoFirstPage: false,
        });

        const chunks: Buffer[] = [];
        doc.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
        doc.on('end', () => resolve(Buffer.concat(chunks)));

        for (const it of items) {
          doc.addPage();

          const colors = [
            '#FF0000',
            '#0000FF',
            '#1b5e20',
            '#FF8C00',
            '#8B008B',
            '#2F4F4F',
          ];
          const color = colors[it.andar - 1] || '#000000';

          doc.rect(0, 0, width, height).fill(color);
          doc.fillColor('#FFFFFF');

          const R = String(it.rua).padStart(2, '0');
          const P = String(it.predio).padStart(3, '0');
          const A = String(it.andar).padStart(2, '0');

          const mascara = `AR03 R${R} P${P} N${A}`;

          doc.font('Helvetica-Bold').fontSize(16).text(mascara, 0, mmToPt(8), {
            width,
            align: 'center',
          });

          const barcodePng = await bwipjs.toBuffer({
            bcid: 'code128',
            text: it.endereco,
            scale: 3,
            height: 15,
            includetext: false,
          });

          const barWidth = mmToPt(60);
          const barHeight = mmToPt(25);
          const barX = (width - barWidth) / 2;
          const barY = mmToPt(22);

          const padding = mmToPt(3);

          doc.rect(barX - padding, barY - padding, barWidth + padding * 2, barHeight + padding * 2).fill('#FFFFFF');
          doc.image(barcodePng, barX, barY, { width: barWidth, height: barHeight });

          doc.fillColor('#FFFFFF');
          doc.font('Helvetica-Bold').fontSize(45).text('>>>>', 0, mmToPt(58), {
            width,
            align: 'center',
          });

          doc.fontSize(16).text(`NÍVEL ${it.andar}`, 0, mmToPt(85), {
            width,
            align: 'center',
          });
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

      const headerHeight = mmToPt(12);
      const headerX = margin;
      const headerY = margin;

      doc.image(logoPng, headerX, headerY, {
        fit: [contentWidth, headerHeight],
        align: 'center',
      });

      let yCursor = headerY + headerHeight + mmToPt(1);
      const bottomLimit = pageSize - margin;

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
    const logoPng = await fsPromises.readFile(logoPath);

    return new Promise<Buffer>((resolve, reject) => {
      const pageSize = mmToPt(40);
      const halfSize = mmToPt(20);
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

      doc.image(logoPng, margin, margin, {
        fit: [contentWidth, halfSize - (margin * 2)],
        align: 'center',
        valign: 'center'
      });

      doc.y = halfSize + mmToPt(1);

      doc.font('Helvetica-Bold').fontSize(11);
      doc.text(String(codprod), margin, doc.y, {
        width: contentWidth,
        align: 'center',
        lineGap: 2
      });

      doc.font('Helvetica').fontSize(8);

      doc.text(descrprod, {
        width: contentWidth,
        align: 'center',
        lineGap: 2,
        height: mmToPt(8),
        ellipsis: true
      });

      doc.font('Helvetica-Bold');
      doc.text(`Qtd: ${qtd_negociada}`, {
        width: contentWidth,
        align: 'center'
      });

      doc.end();
    });
  }

  async gerarMapaSeparacaoLoc2(nunota: number, itens: any[]): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margins: { top: 50, bottom: 50, left: 50, right: 50 },
          bufferPages: false,
          compress: true,
        });

        const chunks: Buffer[] = [];
        doc.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        const startX = 50;
        const usableWidth = 495;
        const pageBottom = 780;

        const widthImg = 60;
        const widthCod = 40;
        const widthBarra = 95;
        const widthDesc = 155;
        const widthLoc = 110;
        const widthQtd = 35;

        const colImg = startX;
        const colCod = colImg + widthImg;
        const colBarra = colCod + widthCod;
        const colDesc = colBarra + widthBarra;
        const colLoc = colDesc + widthDesc;
        const colQtd = colLoc + widthLoc;

        let currentY = 50;

        const printHeader = () => {
          doc.font('Helvetica-Bold').fontSize(16);
          doc.text(`MAPA DE SEPARAÇÃO - NÚNICO: ${nunota}`, startX, currentY, {
            align: 'center',
            width: usableWidth,
          });
          currentY += 25;

          doc.fontSize(10).text(`Total de itens: ${itens.length}`, startX, currentY, {
            align: 'center',
            width: usableWidth,
          });
          currentY += 25;

          doc.font('Helvetica-Bold').fontSize(9);
          doc.text('IMG', colImg, currentY, { width: widthImg, align: 'center' });
          doc.text('CÓDIGO', colCod, currentY, { width: widthCod });
          doc.text('C. BARRAS', colBarra, currentY, { width: widthBarra, align: 'center' });
          doc.text('PRODUTO', colDesc, currentY, { width: widthDesc });
          doc.text('LOCAL 2', colLoc, currentY, { width: widthLoc });
          doc.text('QTD', colQtd, currentY, { width: widthQtd, align: 'right' });

          currentY += 15;
          doc
            .lineWidth(1)
            .strokeColor('#000000')
            .moveTo(startX, currentY)
            .lineTo(startX + usableWidth, currentY)
            .stroke();

          currentY += 10;
        };

        const drawRowDivider = (y: number) => {
          doc
            .lineWidth(0.5)
            .strokeColor('#cccccc')
            .moveTo(startX, y)
            .lineTo(startX + usableWidth, y)
            .stroke();

          doc.strokeColor('#000000').lineWidth(1);
        };

        printHeader();

        doc.font('Helvetica').fontSize(8);

        for (const item of itens) {
          const cod = String(item.codprod || '-');
          const codbarra = String(item.codbarra || '-');
          const descr = String(item.descrprod || '-');
          const loc = String(item.localizacao2 || '-');
          const qtd = String(item.qtdneg || 0);
          const ref = String(item.referencia || '-');

          let descrText = descr;
          if (ref && ref !== '-' && ref !== 'undefined') {
            descrText += `\nRef: ${ref}`;
          }

          const textHeight = doc.heightOfString(descrText, { width: widthDesc });
          const rowHeight = Math.max(textHeight, 55);

          if (currentY + rowHeight > pageBottom) {
            doc.addPage();
            currentY = 50;
            printHeader();
            doc.font('Helvetica').fontSize(8);
          }

          const textY = currentY + 6;

          doc.text(cod, colCod, textY, { width: widthCod });
          doc.text(descrText, colDesc, textY, { width: widthDesc });
          doc.text(loc, colLoc, textY, { width: widthLoc, lineBreak: false });

          doc.font('Helvetica-Bold');
          doc.text(qtd, colQtd, textY, { width: widthQtd, align: 'right' });
          doc.font('Helvetica');

          if (item.imagemBuffer) {
            try {
              doc.image(item.imagemBuffer, colImg, currentY, {
                fit: [50, 50],
                align: 'center',
                valign: 'center',
              });
            } catch {
              doc.fontSize(6).text('Erro Img', colImg, textY, {
                width: widthImg,
                align: 'center',
              });
              doc.fontSize(8);
            }
          } else {
            doc.fontSize(6).text('Sem Img', colImg, textY, {
              width: widthImg,
              align: 'center',
            });
            doc.fontSize(8);
          }

          if (item.barcodeBuffer) {
            try {
              doc.image(item.barcodeBuffer, colBarra, currentY + 2, {
                fit: [85, 45],
                align: 'center',
                valign: 'center',
              });
            } catch {
              doc.text(codbarra, colBarra, textY, {
                width: widthBarra,
                align: 'center',
              });
            }
          } else {
            doc.text(codbarra, colBarra, textY, {
              width: widthBarra,
              align: 'center',
            });
          }

          currentY += rowHeight + 12;
          drawRowDivider(currentY - 4);
        }

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }
}

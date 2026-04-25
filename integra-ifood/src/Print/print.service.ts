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
  const logoPath = path.join(process.cwd(), 'public', 'images', 'logo-dfarias.png');
  const logoPng = await fsPromises.readFile(logoPath);

  return new Promise<Buffer>((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 40 });

      const chunks: Buffer[] = [];
      doc.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;
      const margin = 40;
      const contentWidth = pageWidth - margin * 2;
      const lineHeight = 16;

      const formatMoney = (value: number) =>
        value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

      const drawFooter = () => {
        doc.save();
        doc.rect(0, pageHeight - 26, pageWidth, 26).fill('#351B4F');
        doc.fillColor('#FFFFFF').font('Helvetica').fontSize(9).text(
          'DFarias Engenharia e Automação',
          margin,
          pageHeight - 18,
          { width: contentWidth, align: 'center' },
        );
        doc.restore();
      };

      const ensureSpace = (heightNeeded: number) => {
        if (doc.y + heightNeeded <= pageHeight - 60) return;
        drawFooter();
        doc.addPage();
        doc.y = margin;
      };

      // Cabeçalho
      doc.image(logoPng, margin, 28, {
        fit: [105, 55],
        align: 'center',
      });

      doc
        .font('Helvetica-Bold')
        .fontSize(22)
        .fillColor('#351B4F')
        .text('PROPOSTA COMERCIAL', margin + 130, 38, {
          width: contentWidth - 130,
          align: 'right',
        });

      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor('#6B7280')
        .text('DFarias Engenharia e Automação', margin + 130, 65, {
          width: contentWidth - 130,
          align: 'right',
        });

      doc.moveTo(margin, 95).lineTo(pageWidth - margin, 95).strokeColor('#351B4F').lineWidth(1.5).stroke();

      doc.y = 115;

      // Bloco de informações
      doc
        .roundedRect(margin, doc.y, contentWidth, 92, 8)
        .fill('#F3F4F6');

      const infoY = doc.y + 14;

      doc.fillColor('#111827').font('Helvetica-Bold').fontSize(13)
        .text(payload.budgetName || 'ORÇAMENTO DFARIAS', margin + 16, infoY);

      doc.font('Helvetica').fontSize(10).fillColor('#374151')
        .text('CNPJ: 24.000.965/0001-42', margin + 16, infoY + 22)
        .text('Campina Grande - PB', margin + 16, infoY + 38)
        .text('Contato: (083) 96383-277', margin + 16, infoY + 54);

      doc.font('Helvetica-Bold').fontSize(10).fillColor('#111827')
        .text(`Projeto: ${payload.projectName || 'HOSPITAL'}`, margin + 310, infoY + 22, {
          width: contentWidth - 326,
          align: 'right',
        })
        .text(
          `Prazo: ${
            typeof payload.prazoEntrega === 'number'
              ? `${payload.prazoEntrega} dia(s)`
              : '30 a 60 dias'
          }`,
          margin + 310,
          infoY + 42,
          {
            width: contentWidth - 326,
            align: 'right',
          },
        );

      doc.y = infoY + 88;

      let grandTotal = 0;

      for (const quadro of payload.quadros ?? []) {
        const quadroTotal =
          typeof quadro.totalPrice === 'number'
            ? quadro.totalPrice
            : (quadro.items ?? []).reduce((acc, item) => acc + (item.totalPrice ?? 0), 0);

        grandTotal += quadroTotal;

        ensureSpace(70);

        doc
          .font('Helvetica-Bold')
          .fontSize(12)
          .fillColor('#351B4F')
          .text(`${quadro.tipo || 'QUADRO'} - ${quadro.nome || 'Quadro'}`);

        doc
          .font('Helvetica')
          .fontSize(10)
          .fillColor('#374151')
          .text(`Total do quadro: ${formatMoney(quadroTotal)}`);

        doc.moveDown(0.5);

        const colItem = margin;
        const colQtd = colItem + 42;
        const colDescr = colQtd + 46;
        const colUnit = colDescr + 230;
        const colTot = colUnit + 72;

        ensureSpace(24);

        const headerY = doc.y;

        doc.roundedRect(colItem, headerY, contentWidth, 20, 4).fill('#351B4F');

        doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(9);
        doc.text('Item', colItem + 4, headerY + 6, { width: 36 });
        doc.text('Qtd', colQtd + 4, headerY + 6, { width: 38 });
        doc.text('Descrição', colDescr + 4, headerY + 6, { width: 220 });
        doc.text('Valor unit.', colUnit + 4, headerY + 6, { width: 64, align: 'right' });
        doc.text('Valor', colTot + 4, headerY + 6, { width: 64, align: 'right' });

        doc.y = headerY + 26;

        doc.font('Helvetica').fontSize(9).fillColor('#111827');

        for (let index = 0; index < (quadro.items ?? []).length; index += 1) {
          const item = quadro.items[index];

          const description = `${item.product}${
            item.category ? ` (CODPROD: ${item.category})` : ''
          }`;

          const rowHeight = Math.max(
            lineHeight,
            doc.heightOfString(description, { width: 220 }) + 8,
          );

          ensureSpace(rowHeight + 8);

          const startY = doc.y;

          doc.text(String(index + 1), colItem + 4, startY, { width: 36 });
          doc.text(`${item.qty}`, colQtd + 4, startY, { width: 38 });
          doc.text(description, colDescr + 4, startY, { width: 220 });
          doc.text(formatMoney(item.unitPrice ?? 0), colUnit + 4, startY, {
            width: 64,
            align: 'right',
          });
          doc.text(formatMoney(item.totalPrice ?? 0), colTot + 4, startY, {
            width: 64,
            align: 'right',
          });

          doc
            .moveTo(colItem, startY + rowHeight)
            .lineTo(colItem + contentWidth, startY + rowHeight)
            .strokeColor('#E5E7EB')
            .lineWidth(1)
            .stroke();

          doc.y = startY + rowHeight + 5;
        }

        doc.moveDown(0.8);
      }

      ensureSpace(55);

      const totalBoxY = doc.y + 6;

      doc.roundedRect(margin, totalBoxY, contentWidth, 42, 8).fill('#351B4F');

      doc
        .fillColor('#FFFFFF')
        .font('Helvetica-Bold')
        .fontSize(14)
        .text(`Valor total da proposta: ${formatMoney(grandTotal)}`, margin + 16, totalBoxY + 13, {
          width: contentWidth - 32,
          align: 'right',
        });

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

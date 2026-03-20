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

  async gerarEtiquetaCaboPdf(
    label: EtiquetaCabo): Promise<Buffer> {
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

  async gerarEtiquetaLocPDF(
    localizacao: string, endereco: string): Promise<Buffer> {

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
            bcid: 'qrcode',
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

  async gerarEtiquetaLocMultiPaletteQrCode(
    items: Array<{ localizacao: string; endereco: string }>
  ): Promise<Buffer> {
    let pages = 0;

    return new Promise<Buffer>(async (resolve, reject) => {
      try {
        const pageSize = mmToPt(100);
        const margin = mmToPt(2);

        // ✅ AJUSTE 1: Reduzi o gap para 1mm (mínimo respiro)
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

          // ---------------------------------------------------------
          // GERAÇÃO DO CÓDIGO DE BARRAS
          // ---------------------------------------------------------
          const barcodePng: Buffer = await bwipjs.toBuffer({
            bcid: 'qrcode',
            text: endereco,
            scale: 4,
            height: 15,           // Altura base (será esticada no PDF)
            includetext: false,
            textxalign: 'center',
          });

          doc.font('Helvetica');

          // --- 1. TOPO: Endereço ---
          doc.fontSize(18);
          doc.text(localizacao, margin, margin, {
            width: contentWidth,
            align: 'center',
          });

          const yEndTop = doc.y;

          // --- 2. RODAPÉ: Localização ---
          doc.fontSize(14);
          const bottomTextHeight = doc.heightOfString(localizacao, {
            width: contentWidth,
            align: 'center'
          });

          const yStartBottom = pageSize - margin - bottomTextHeight - safetyPadding;

          // --- 3. MEIO: Código de Barras (Esticado) ---

          // Calcula o espaço exato entre o fim do texto de cima e o começo do de baixo
          // descontando apenas o gap mínimo (1mm de cada lado)
          const availableHeight = yStartBottom - yEndTop - (gap * 2);

          if (availableHeight > 0) {

            // ✅ AJUSTE 2: Removida a limitação de 35mm. 
            // O código vai ocupar toda a altura disponível, aproximando-se visualmente dos textos.
            const maxBarHeight = availableHeight;

            // Largura alvo: ocupa 95% da largura da página
            const targetBarWidth = contentWidth * 0.95;

            // Centraliza verticalmente no espaço vazio
            const centerY = yEndTop + gap + (availableHeight / 2);
            const yBar = centerY - (maxBarHeight / 2);

            const xBar = margin + (contentWidth - targetBarWidth) / 2;

            // O doc.image vai esticar a imagem para preencher o rect definido
            doc.image(barcodePng, xBar, yBar, {
              width: targetBarWidth,
              height: maxBarHeight, // Força a altura máxima
              align: 'center',
              valign: 'center'
            });
          }

          // --- 4. Renderiza Rodapé ---

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

          // Fundo branco
          // Cor por andar
          let textColor = '#FFFFFF';

          doc.rect(0, 0, width, height).fill('#FFFFFF');


          if (it.andar === 1) doc.rect(0, 0, width, height).fill('#FF0000');
          if (it.andar === 2) doc.rect(0, 0, width, height).fill('#0000FF');
          if (it.andar === 3) doc.rect(0, 0, width, height).fill('#1b5e20');

          // =========================
          // 1) MÁSCARA NO TOPO
          // =========================
          doc.fillColor(textColor);

          const mascaraY = margin + mmToPt(2);
          doc
            .font('Helvetica-Bold')
            .fontSize(15)
            .text(it.localizacao, 0, mascaraY, {
              width,
              align: 'center',
            });

          // =========================
          // 2) CÓDIGO DE BARRAS ABAIXO DA MÁSCARA (MAIS PERTO DO TOPO)
          // =========================
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

          // Desenha o quadrado branco atrás do código de barras
          // Adicionando um "padding" (respiro) de 3mm para o scanner conseguir ler
          const padding = mmToPt(3);
          doc.rect(barX - padding, barY - padding, barWidth + (padding * 2), barHeight + (padding * 2)).fill('#FFFFFF');

          // Desenha o código de barras por cima do quadrado branco
          doc.image(barcodePng, barX, barY, {
            width: barWidth,
            height: barHeight,
          });
          // =========================
          // 3) SETA + NÍVEL (NÍVEL ABAIXO DA SETA) NO RODAPÉ
          // =========================
          const setaTexto = normalizarSeta(it.seta);

          const setaFont = 78;
          const nivelFont = 20;

          const gap = mmToPt(2);
          const setaAlturaAprox = mmToPt(28);
          const nivelAlturaAprox = mmToPt(8);
          const blocoAltura = setaAlturaAprox + gap + nivelAlturaAprox;

          const blocoTopY = height - margin - blocoAltura;

          // Seta
          doc
            .fillColor(textColor)
            .font('Helvetica-Bold')
            .fontSize(setaFont)
            .text(setaTexto, 0, blocoTopY, {
              width,
              align: 'center',
            });

          // Nível abaixo da seta
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
        const width = mmToPt(125);
        const height = mmToPt(75);
        const margin = mmToPt(5);

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

          // Cores por nível
          const colors = [
            '#FF0000', // 1: Red
            '#0000FF', // 2: Blue
            '#1b5e20', // 3: Green
            '#FF8C00', // 4: Orange
            '#8B008B', // 5: Magenta
            '#2F4F4F', // 6: Slate
          ];
          const color = colors[it.andar - 1] || '#000000';

          doc.rect(0, 0, width, height).fill(color);
          doc.fillColor('#FFFFFF');

          // =========================
          // 1) CÓDIGO NO TOPO (Mascara)
          // =========================
          const R = it.rua;
          const P = it.predio;
          const A = String(it.andar).padStart(2, '0');
          const mascara = `AR01 R${R} P${P} N${A}`;

          doc.font('Helvetica-Bold').fontSize(20).text(mascara, 0, mmToPt(7), {
            width,
            align: 'center',
          });

          // =========================
          // 2) CÓDIGO DE BARRAS CENTRAL (EM CAIXA BRANCA)
          // =========================
          const barcodePng = await bwipjs.toBuffer({
            bcid: 'code128',
            text: it.endereco,
            scale: 3,
            height: 15,
            includetext: false,
          });

          const barWidth = mmToPt(90);
          const barHeight = mmToPt(18);
          const barX = (width - barWidth) / 2;
          const barY = mmToPt(22); 

          const padding = mmToPt(3);
          doc.rect(barX - padding, barY - padding, barWidth + padding * 2, barHeight + padding * 2).fill('#FFFFFF');
          doc.image(barcodePng, barX, barY, { width: barWidth, height: barHeight });

          // =========================
          // 3) SETAS GRANDES ABAIXO
          // =========================
          doc.fillColor('#FFFFFF');
          doc.font('Helvetica-Bold').fontSize(50).text('>>>>', 0, mmToPt(48), {
            width,
            align: 'center',
          });

          // =========================
          // 4) NÍVEL NO RODAPÉ
          // =========================
          doc.fontSize(18).text(`NÍVEL ${it.andar}`, 0, mmToPt(65), {
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

          const textHeight = doc.heightOfString(descr, { width: widthDesc });
          const rowHeight = Math.max(textHeight, 55);

          if (currentY + rowHeight > pageBottom) {
            doc.addPage();
            currentY = 50;
            printHeader();
            doc.font('Helvetica').fontSize(8);
          }

          const textY = currentY + 6;

          doc.text(cod, colCod, textY, { width: widthCod });
          doc.text(descr, colDesc, textY, { width: widthDesc });
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

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

// Trunca string para caber na largura atual (aprox. confiável no PDFKit)
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
    // Para 40x40mm, recomendo reduzir o barcode e, se precisar do texto embaixo,
    // deixar bem pequeno.
    const barcodeText = String(label.codprod);
    const barcodePng: Buffer = await bwipjs.toBuffer({
      bcid: 'code128',
      text: barcodeText,
      scale: 2,          // menor que 3 pra caber melhor
      height: 8,         // altura do barcode (bwip "mm-ish")
      includetext: false // true só se realmente precisar; em 40x40 costuma estourar
      // se quiser o texto:
      // includetext: true,
      // textsize: 8,
    });

    return new Promise<Buffer>((resolve, reject) => {
      const pageSize = mmToPt(40);     // 40mm em pontos
      const margin = mmToPt(2);        // margem pequena (2mm)

      const doc = new PDFDocument({
        size: [pageSize, pageSize],
        margins: { top: margin, left: margin, right: margin, bottom: margin },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const contentWidth = pageSize - margin * 2;

      // --- Cabeçalho bem compacto
      doc.font('Helvetica');

      doc.fontSize(7);
      doc.text(`NUNOTA: ${label.nunota}`, { width: contentWidth, lineBreak: false });

      doc.moveDown(0.15);

      doc.fontSize(7);
      const prodLine = truncateToWidth(doc, `Produto: ${label.descrprod}`, contentWidth);
      doc.text(prodLine, { width: contentWidth });

      doc.moveDown(0.1);

      doc.fontSize(7);
      const infoLine = truncateToWidth(
        doc,
        `Qtd: ${label.qtdneg}m  Cod: ${label.codprod}`,
        contentWidth,
      );
      doc.text(infoLine, { width: contentWidth });

      // --- Barcode no rodapé: ocupa o espaço restante
      // Calcula espaço livre até o fim da página
      const yAfterText = doc.y + mmToPt(1);
      const availableHeight = pageSize - margin - yAfterText;

      // Reserva uma altura mínima pro barcode (se ficar muito pouco, ainda tenta)
      const barcodeWidth = contentWidth;
      const barcodeHeight = Math.max(mmToPt(12), Math.min(availableHeight, mmToPt(18)));

      const x = margin;
      const y = pageSize - margin - barcodeHeight;

      // Se o texto crescer demais, ainda força o barcode pro rodapé
      doc.image(barcodePng, x, y, { width: barcodeWidth, height: barcodeHeight });

      doc.end();
    });
  }
}

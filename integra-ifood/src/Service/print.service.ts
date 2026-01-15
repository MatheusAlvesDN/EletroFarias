// label-pdf.service.ts
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

export async function gerarBarcodePng(valor: string): Promise<Buffer> {
  // valor pode ser "123456789" etc (string é melhor pra preservar zeros à esquerda)
  return await bwipjs.toBuffer({
    bcid: 'code128',     // tipo do barcode
    text: valor,
    scale: 3,
    height: 10,
    includetext: false,  // true se quiser o número embaixo
    textxalign: 'center',
  });
}

export class PrintService {
  /**
   * Etiqueta default: 100x50mm
   */
  async gerarEtiquetaPdf(label: EtiquetaCabo): Promise<Buffer> {
    //const barcode = await gerarBarcodePng(String(label.codprod))
    const barcodeText = String(label.codprod); // ou outro campo
    const barcodePng: Buffer = await bwipjs.toBuffer({
      bcid: 'code128',      // code128 é ótimo pra números/strings
      text: barcodeText,
      scale: 3,             // tamanho
      height: 10,           // altura do barcode (mm-ish)
      includetext: true,    // imprime o texto abaixo
      textxalign: 'center',
    });

    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({
        size: [226.77, 141.73], // ~ 80x50mm (ajuste se quiser)
        margin: 10,
      });

      const chunks: Buffer[] = [];
      doc.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // ---- layout simples (ajuste como quiser)
      doc.fontSize(10).text(`NUNOTA: ${label.nunota}`);
      doc.text(`Produto: ${label.descrprod}`, { width: 200 });
      doc.text(`Quantidade: ${label.qtdneg}m | Codigo: ${label.codprod}`);
   
      doc.moveDown(0.5);

      const x = 10;
      const y = doc.y + 5;
      doc.image(barcodePng, x, y, { width: 220 });

      doc.end();
    });
  }


}





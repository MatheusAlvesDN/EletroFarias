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


  async gerarOrcamentoDfariasPdf(payload: any): Promise<Buffer> {
    return new Promise<Buffer>(async (resolve, reject) => {
      try {
        const pageWidth = 595.28; // A4 width
        const pageHeight = 841.89; // A4 height
        const margin = 40;
        const contentWidth = pageWidth - margin * 2;

        const doc = new PDFDocument({
          size: 'A4',
          // A margem inferior (bottom) AGORA É 0 para impedir o PDFKit de criar páginas em branco
          margins: { top: margin, left: margin, right: margin, bottom: 0 },
          autoFirstPage: false,
        });

        const chunks: Buffer[] = [];
        doc.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // ==========================================
        // CARREGAMENTO DO LOGO (ROBUSTO)
        // ==========================================
        let logoPng: Buffer | null = null;

        const imgPaths = [
          path.join(process.cwd(), 'public', 'images', 'LOGO-DFARIAS-AZUL.png'),
          path.join(process.cwd(), 'public', 'LOGO-DFARIAS-AZUL.png'),
          path.join(process.cwd(), 'assets', 'LOGO-DFARIAS-AZUL.png'),
          path.join(process.cwd(), 'src', 'public', 'images', 'LOGO-DFARIAS-AZUL.png'),
          path.join(__dirname, '..', 'public', 'images', 'LOGO-DFARIAS-AZUL.png'),
          path.join(__dirname, '..', '..', 'public', 'images', 'LOGO-DFARIAS-AZUL.png')
        ];

        for (const p of imgPaths) {
          try {
            logoPng = await fsPromises.readFile(p);
            break;
          } catch (e) {
            // Arquivo não encontrado neste caminho, tenta o próximo
          }
        }

        if (!logoPng) {
          console.warn('⚠️ AVISO: O logo não foi encontrado. O PDF será gerado sem imagens.');
          console.warn('Diretório de execução (process.cwd()):', process.cwd());
        }

        // Paleta de Cores
        const primaryColor = '#351B4F'; // Roxo escuro
        const tableBlue = '#005C8A'; // Azul escuro da tabela de condições
        const textDark = '#111111';
        const textGray = '#555555';

        const formatCurrency = (val: number) =>
          `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

        // ==========================================
        // COMPONENTES FIXOS DO LAYOUT
        // ==========================================
        let pageNumber = 1;

        const drawFooter = () => {
          const footerHeight = 35;
          const footerY = pageHeight - footerHeight;

          // Desenha o fundo: 30% roxo, 70% branco
          const grad = doc.linearGradient(0, footerY, pageWidth, footerY);
          grad.stop(0, primaryColor).stop(0.3, primaryColor).stop(0.3, '#FFFFFF').stop(1, '#FFFFFF');
          doc.rect(0, footerY, pageWidth, footerHeight).fill(grad);

          // Linha sutil no topo da parte branca para delimitar o rodapé
          doc.moveTo(pageWidth * 0.3, footerY).lineTo(pageWidth, footerY).strokeColor('#E5E5E5').lineWidth(1).stroke();

          // Textos do rodapé com { lineBreak: false } para impedir quebra de página acidental
          doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(9)
            .text(String(pageNumber), 15, footerY + 12, { width: pageWidth * 0.3 - 30, align: 'center', lineBreak: false });

          doc.fillColor('#555555').font('Helvetica').fontSize(8)
            .text('DFarias Engenharia e Automação / Pedro Silva, Tambor / www.dfarias.com.br', pageWidth * 0.3, footerY + 12, { align: 'center', width: pageWidth * 0.7, lineBreak: false });

          pageNumber++;
        };

        const drawHeader = () => {
          doc.x = margin;
          doc.y = margin;

          if (logoPng) {
            doc.image(logoPng, margin, margin, { width: 120 });
          }

          doc.font('Helvetica-Bold').fontSize(12).fillColor(primaryColor)
            .text('DFarias Engenharia e Automação', margin + 140, margin + 5, { lineBreak: false });
          doc.font('Helvetica').fontSize(9).fillColor(textGray)
            .text('CNPJ: 24.000.965/0001-42', margin + 140, margin + 20, { lineBreak: false })
            .text('(083) 98889-4729', margin + 140, margin + 32, { lineBreak: false })
            .text('CAMPINA GRANDE - PB', margin + 140, margin + 44, { lineBreak: false });

          doc.y = margin + 80;
          doc.x = margin;
        };

        const ensureSpace = (heightNeeded: number) => {
          if (doc.y + heightNeeded > pageHeight - 80) {
            drawFooter();
            doc.addPage();
            drawHeader();
            return true;
          }
          return false;
        };

        // ==========================================
        // PÁGINA 1: CAPA
        // ==========================================
        doc.addPage();

        if (logoPng) {
          doc.image(logoPng, margin + 20, 150, { width: 250 });
        }

        doc.font('Helvetica-Bold').fontSize(36).fillColor(primaryColor)
          .text('PROPOSTA\nCOMERCIAL', margin + 20, 320);

        // Cliente padrão alterado para espaços em branco conforme solicitado
        doc.font('Helvetica-Bold').fontSize(16).fillColor(textDark)
          .text(payload.clientName || '                  ', margin + 20, 450);

        drawFooter();

        // ==========================================
        // PÁGINA 2: INSTITUCIONAL
        // ==========================================
        doc.addPage();
        drawHeader();

        const dataAtual = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
        doc.fillColor(textDark).font('Helvetica-Bold').fontSize(10)
          .text(dataAtual, margin, doc.y, { align: 'right' });
        doc.moveDown(2);

        doc.font('Helvetica-Bold').fontSize(14).fillColor(primaryColor).text('Quem somos', margin, doc.y);
        doc.font('Helvetica').fontSize(10).fillColor(textDark)
          .text('Há mais de dez anos na região da Paraíba atuando no mercado de service e fabricação de painéis e quadros elétricos.', margin, doc.y, { width: contentWidth, align: 'justify' });
        doc.moveDown(1);

        // Linha de proposta mantida comentada
        // doc.font('Helvetica-Bold').fillColor(textGray).text(`Proposta nº ${payload.proposalNumber || '1.0001'}`);

        doc.font('Helvetica').fillColor('#13A9D4').text(`Acesse o link do vídeo institucional: https://youtu.be/IV_5DoEIOhQ?si=L2q_uH3sLhug0X_k`, { link: 'https://youtu.be/IV_5DoEIOhQ?si=L2q_uH3sLhug0X_k', underline: true });
        doc.moveDown(1.5);

        doc.font('Helvetica-Bold').fontSize(14).fillColor(primaryColor).text('Certificações', margin, doc.y);
        doc.font('Helvetica').fontSize(10).fillColor(textDark)
          .text('• Especialista em fornecimento de produtos em Média Tensão da Schneider Electric, Weg e Siemens;', margin, doc.y)
          .text('• Especialista em fornecimento e instalação de produtos elétricos dos fabricantes da Schneider Electric, Weg e Siemens;');
        doc.moveDown(1.5);

        doc.font('Helvetica-Bold').fontSize(14).fillColor(primaryColor).text('Certificações e ensaios de Painéis e Quadros', margin, doc.y);
        doc.font('Helvetica').fontSize(10).fillColor(textDark)
          .text('• Ensaios de fabricação conforme a NBR-5410;', margin, doc.y)
          .text('• Fabricação de quadros e Painéis e quadros elétricos de acordo com projeto elétrico;', margin, doc.y)
          .text('• Ensaios do tipo PTTA de acordo com normas ABNT NBR 60439-1 e IEC 616439-1&2;', margin, doc.y)
          .text('• Ensaios de propriedades dielétricas, eficácia do circuito de proteção, distâncias de isolamento e escoamento, funcionamento mecânico, grau de proteção.', margin, doc.y, { width: contentWidth });
        doc.moveDown(1.5);

        doc.font('Helvetica-Bold').fontSize(14).fillColor(primaryColor).text('Service', margin, doc.y);
        doc.font('Helvetica').fontSize(10).fillColor(textDark)
          .text('• Fornecimento e documentações atualizadas da equipe - PCMSO, PGR, LTCAT, RELATÓRIO ANUAL DE NR10, NR35 E NR18;', margin, doc.y, { width: contentWidth });

        drawFooter();

        // ==========================================
        // PÁGINA 3 EM DIANTE: ESCOPO E TABELAS
        // ==========================================
        doc.addPage();
        drawHeader();

        ensureSpace(120);
        doc.font('Helvetica-Bold').fontSize(10).fillColor(textDark);
        doc.text(`A/C: ${payload.contactName || 'DIEGO'}`, margin, doc.y);
        doc.text(`E-mail: ${payload.email || ''}`, margin, doc.y);
        doc.text(`Projeto: ${payload.projectName || 'HOSPITAL'}`, margin, doc.y);
        doc.moveDown(1.5);

        doc.font('Helvetica-Bold').fontSize(12).fillColor(primaryColor).text('Escopo:', margin, doc.y);
        doc.font('Helvetica').fontSize(10).fillColor(textDark)
          .text('A presente proposta tem por objetivo formalizar o fornecimento e a integração de painéis e quadros elétricos industrializados, em total conformidade com o projeto e a solicitação recebida.', margin, doc.y, { width: contentWidth, align: 'justify' })
          .moveDown(0.5)
          .text('Este documento estabelece, em carácter contratual, as obrigações da Contratada, detalhando os preços acordados, as condições de pagamento e o prazo de execução para a entrega dos equipamentos.', margin, doc.y, { width: contentWidth, align: 'justify' });
        doc.moveDown(1);

        doc.font('Helvetica-Bold').fillColor(primaryColor).text('Características Técnicas e Escopo de Fornecimento:', margin, doc.y);
        doc.font('Helvetica').fillColor(textDark)
          .text('• Normatização: Todos os painéis serão fabricados em estrita conformidade com a Norma Regulamentadora NR-10.', margin, doc.y, { width: contentWidth })
          .text('• Proteção de Barramentos: Implementação de isolamento por termoencolhível e aplicação de nitrato de prata.', margin, doc.y, { width: contentWidth })
          .text('• Conforto Operacional: Instalação de sistema de ventilação forçada e iluminação interna.', margin, doc.y, { width: contentWidth })
          .text('• Identificação e Documentação: Fornecimento de plaquetas de acrílico para identificação durável do painel e de todos os circuitos internos, além da inclusão do Projeto Elétrico completo em formato QR Code afixado na porta do painel.', margin, doc.y, { width: contentWidth, align: 'justify' });
        doc.moveDown(1.5);

        let grandTotal = 0;

        const wItem = 30;
        const wQtd = 35;
        const wUnit = 75;
        const wTot = 85;
        const wDescr = contentWidth - wItem - wQtd - wUnit - wTot;

        const colItem = margin;
        const colQtd = colItem + wItem;
        const colDescr = colQtd + wQtd;
        const colUnit = colDescr + wDescr;
        const colTot = colUnit + wUnit;

        const drawTableHeader = (title: string, subtotal: number) => {
          ensureSpace(50);
          const startY = doc.y;

          doc.x = margin;

          doc.rect(margin, startY, contentWidth - wTot, 18).fill('#E0E0E0');
          doc.rect(margin, startY, contentWidth - wTot, 18).strokeColor('#333333').lineWidth(0.5).stroke();

          doc.rect(colTot, startY, wTot, 18).fill('#E0E0E0');
          doc.rect(colTot, startY, wTot, 18).strokeColor('#333333').lineWidth(0.5).stroke();

          doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(9);
          doc.text(title, margin + 5, startY + 5, { width: contentWidth - wTot - 10 });
          if (subtotal >= 0) {
            doc.text(formatCurrency(subtotal), colTot + 5, startY + 5, { width: wTot - 10, align: 'right' });
          }

          const headerY = startY + 18;
          doc.rect(colItem, headerY, wItem, 18).fill('#FFFFFF').stroke();
          doc.rect(colQtd, headerY, wQtd, 18).fill('#FFFFFF').stroke();
          doc.rect(colDescr, headerY, wDescr, 18).fill('#FFFFFF').stroke();
          doc.rect(colUnit, headerY, wUnit, 18).fill('#FFFFFF').stroke();
          doc.rect(colTot, headerY, wTot, 18).fill('#FFFFFF').stroke();

          doc.fillColor('#111111').text('Item', colItem + 5, headerY + 5, { width: wItem - 10 });
          doc.text('Qtde', colQtd + 2, headerY + 5, { width: wQtd - 4, align: 'center' });
          doc.text('Descrição', colDescr + 5, headerY + 5, { width: wDescr - 10 });
          doc.text('Valor unit.', colUnit + 5, headerY + 5, { width: wUnit - 10, align: 'right' });
          doc.text('Valor', colTot + 5, headerY + 5, { width: wTot - 10, align: 'right' });

          doc.y = headerY + 18;
          doc.x = margin;
        };

        for (const quadro of payload.quadros ?? []) {
          const quadroTotal = typeof quadro.totalPrice === 'number'
            ? quadro.totalPrice
            : (quadro.items ?? []).reduce((acc: number, item: any) => acc + ((item.unitPrice || 0) * item.qty), 0);
          grandTotal += quadroTotal;

          const title = `${quadro.nome || 'QUADRO GERAL DE BAIXA TENSAO'} - ${quadro.tipo || 'QGBT1'}`;
          drawTableHeader(title, quadroTotal);

          for (let index = 0; index < (quadro.items ?? []).length; index += 1) {
            const item = quadro.items[index];
            const unitPrice = item.unitPrice || 0;
            const itemTotal = unitPrice * item.qty;

            const textHeight = doc.font('Helvetica').fontSize(8).heightOfString(item.product, { width: wDescr - 10 });
            const rowHeight = Math.max(18, textHeight + 8);

            if (ensureSpace(rowHeight)) {
              drawTableHeader(title + ' (continuação)', -1);
            }

            const startY = doc.y;
            doc.x = margin;

            doc.font('Helvetica').fontSize(8).fillColor('#333333');

            doc.text(String(index + 1), colItem + 5, startY + 5, { width: wItem - 10 });
            doc.text(String(item.qty), colQtd + 2, startY + 5, { width: wQtd - 4, align: 'center' });
            doc.text(item.product, colDescr + 5, startY + 5, { width: wDescr - 10 });
            doc.text(formatCurrency(unitPrice), colUnit + 5, startY + 5, { width: wUnit - 10, align: 'right' });
            doc.text(formatCurrency(itemTotal), colTot + 5, startY + 5, { width: wTot - 10, align: 'right' });

            doc.rect(colItem, startY, wItem, rowHeight).strokeColor('#CCCCCC').lineWidth(0.5).stroke();
            doc.rect(colQtd, startY, wQtd, rowHeight).stroke();
            doc.rect(colDescr, startY, wDescr, rowHeight).stroke();
            doc.rect(colUnit, startY, wUnit, rowHeight).stroke();
            doc.rect(colTot, startY, wTot, rowHeight).stroke();

            doc.y = startY + rowHeight;
            doc.x = margin;
          }
          doc.moveDown(1.5);
        }

        // ==========================================
        // TABELA FINAL (Condições e Impostos)
        // ==========================================
        ensureSpace(200);
        doc.font('Helvetica-Bold').fontSize(14).fillColor(primaryColor).text('Seguem condições da proposta comercial:', margin, doc.y);
        doc.moveDown(0.5);

        const summaryStartY = doc.y;

        // Definição exata das larguras para totalizar a largura da página (contentWidth)
        const sumColWidths = [30, 60, 165, 25, 25, 35, 25, 75, 75];
        let sumX = [margin];
        for (let i = 0; i < sumColWidths.length; i++) {
          sumX.push(sumX[i] + sumColWidths[i]);
        }

        // Fundo Azul do Cabeçalho
        doc.rect(margin, summaryStartY, contentWidth, 18).fill(tableBlue);

        doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(8);
        const headers = ['Item', 'Código NCM', 'Descrição', 'Qtd', 'Un', 'ICMS', 'IPI', 'Vl. Unit', 'Vl. Total'];

        // Escreve os textos e traça as linhas verticais brancas do cabeçalho
        for (let i = 0; i < headers.length; i++) {
          doc.text(headers[i], sumX[i], summaryStartY + 5, { width: sumColWidths[i], align: 'center' });
          doc.moveTo(sumX[i], summaryStartY).lineTo(sumX[i], summaryStartY + 18).strokeColor('#FFFFFF').lineWidth(0.5).stroke();
        }
        doc.moveTo(sumX[9], summaryStartY).lineTo(sumX[9], summaryStartY + 18).stroke();

        // Linha 1 de Conteúdo (Material e Mão de Obra)
        const rowY = summaryStartY + 18;

        // Pega o nome de todos os quadros para a descrição da tabela
        const nomesQuadros = (payload.quadros && payload.quadros.length > 0)
          ? payload.quadros.map((q: any) => q.nome || 'QUADRO').join(' / ')
          : 'Material e mão de obra';

        const summaryDesc = payload.summaryDesc || nomesQuadros;
        const hRow = Math.max(25, doc.heightOfString(summaryDesc, { width: sumColWidths[2] - 10 }) + 10);

        doc.rect(margin, rowY, contentWidth, hRow).fill('#FFFFFF');

        // Multiplica o total acumulado por 1.7 conforme solicitado
        const valorCondicoes = grandTotal * 1.7;

        const rowData = ['1', '8538.1000', summaryDesc, '1', '', '20%', '', formatCurrency(valorCondicoes), formatCurrency(valorCondicoes)];

        for (let i = 0; i < rowData.length; i++) {
          const align = i === 2 ? 'left' : 'center';
          const padX = i === 2 ? 5 : 0;
          doc.font(i >= 7 ? 'Helvetica-Bold' : 'Helvetica').fillColor(textDark);

          // Centralização vertical do texto
          const textH = doc.heightOfString(rowData[i], { width: sumColWidths[i] - (padX * 2) });
          const textY = rowY + (hRow / 2) - (textH / 2);

          doc.text(rowData[i], sumX[i] + padX, textY, { width: sumColWidths[i] - (padX * 2), align: align as any });

          // Linhas verticais separadoras (param aqui para as próximas linhas serem contínuas)
          doc.moveTo(sumX[i], rowY).lineTo(sumX[i], rowY + hRow).strokeColor('#CCCCCC').lineWidth(0.5).stroke();
        }
        doc.moveTo(sumX[9], rowY).lineTo(sumX[9], rowY + hRow).stroke();

        let currentY = rowY + hRow;

        // Sublinhas de Totais (Frete, Total, Desconto)
        const freteVal = payload.frete || 0;
        const totalComDesconto = payload.discountedTotal || valorCondicoes;

        const drawSubRow = (label: string, value: string, isYellow: boolean = false) => {
          const rowH = 20;

          // Linha horizontal completa
          doc.moveTo(margin, currentY).lineTo(margin + contentWidth, currentY).strokeColor('#999999').lineWidth(0.5).stroke();

          doc.fillColor(textDark).font(isYellow || label === 'Total' ? 'Helvetica-Bold' : 'Helvetica').fontSize(9);

          if (isYellow) {
            // Background amarelo
            doc.font('Helvetica-Bold');
            const labelW = doc.widthOfString(label) + 6;
            const valW = doc.widthOfString(value) + 6;

            doc.rect(sumX[8] - labelW - 5, currentY + 3, labelW, 14).fill('#FFFF00');
            doc.rect(sumX[9] - valW - 5, currentY + 3, valW, 14).fill('#FFFF00');
          }

          doc.fillColor(textDark);
          doc.text(label, margin, currentY + 5, { width: sumX[8] - margin - 10, align: 'right' });

          doc.font('Helvetica-Bold');
          doc.text(value, sumX[8], currentY + 5, { width: sumColWidths[8] - 5, align: 'right' });

          currentY += rowH;
        };

        // Aplica o valor de 1.7x nas linhas de total geral
        drawSubRow('Frete', formatCurrency(freteVal), false);
        drawSubRow('Total', formatCurrency(valorCondicoes + freteVal), false);
        drawSubRow('VALOR TOTAL COM DESCONTO', formatCurrency(totalComDesconto), true);

        // Linha final da tabela
        doc.moveTo(margin, currentY).lineTo(margin + contentWidth, currentY).strokeColor('#999999').lineWidth(0.5).stroke();

        currentY += 5; // Espaço antes da caixa de observação

        // Caixa Cinza de Observação
        const obsText = 'Obs: cliente recebe crédito de ICMS de 20% destacado na nota fiscal, nossa empresa tem incentivo fiscal para industrialização desse produto';
        doc.font('Helvetica-Oblique').fontSize(8);
        const obsHeight = doc.heightOfString(obsText, { width: contentWidth - 10 }) + 10;

        doc.rect(margin, currentY, contentWidth, obsHeight).fill('#EAEAEA');
        doc.fillColor(textGray).text(obsText, margin + 5, currentY + 5, { width: contentWidth - 10 });

        // Atualiza a posição do cursor vertical global após a área customizada
        doc.y = currentY + obsHeight + 15;
        doc.x = margin;

        // ==========================================
        // FORMAS DE PAGAMENTO E CONDIÇÕES
        // ==========================================
        doc.font('Helvetica-Bold').fontSize(10).fillColor(textDark)
          .text('Forma de Pagamento - ', margin, doc.y, { continued: true })
          .font('Helvetica').text(payload.formaPagamento || '28 – NO PEDIDO');
        doc.moveDown(0.5);

        doc.font('Helvetica-Bold').text('Prazo de Entrega - ', margin, doc.y, { continued: true })
          .font('Helvetica').text(`${payload.prazoEntrega || '30 A 60'} DIAS`);
        doc.moveDown(1.5);

        ensureSpace(200);
        doc.font('Helvetica-Bold').fontSize(12).fillColor(primaryColor)
          .text('Condições Gerais:', margin, doc.y, { width: contentWidth });
        doc.moveDown(0.5);

        const conditions = [
          '• Reajuste: As condições ora apresentadas são baseadas na atual política vigente no país. Caso o governo federal venha autorizar a aplicação de reajuste de preços, este será procedido de maneira a compensar a perda inflacionária;',
          '• Reajuste anual: O índice de reajuste anual sobre a proposta, após aprovação do pedido será o IGP-M;',
          '• Preços: Os preços propostos são validados em 30 dias.',
          '• Tributos: Qualquer tributo ou encargo que venha existir, ou seja alterado para mais ou para menos em sua alíquota, será repassado ao preço contrato.',
          '• Aceitação do Pedido: A proposta será considerada como aceita após o recebimento da ordem de compra/execução técnica e comercialmente esclarecida;',
          '• Atrasos de pagamento: Em caso de atraso no pagamento de algum evento, será apresentada pela contratada a cobrança de reajuste complementar de acordo com a variação do INPC, desde o dia previsto para pagamento até o recebimento efetivo, acrescido de 1% ao dia, sujeito a alterações conforme taxas vigentes no período. A ocorrência de atrasos nos pagamentos poderá gerar reformulações nos prazos de entrega/execução contratados.',
          '• Cancelamento: O cancelamento do fornecimento por iniciativa da CONTRATANTE implicará no faturamento imediato dos seguintes valores:\n  - Das parcelas faltantes dos trabalhos já executados;\n  - De todas as despesas que o cancelamento possa provocar, tais como encargos e indenizações, e taxa de compensação de 5% do valor restante a ser pago.'
        ];

        for (const cond of conditions) {
          doc.x = margin;
          const h = doc.font('Helvetica').fontSize(10).heightOfString(cond, { width: contentWidth, align: 'justify' });
          ensureSpace(h + 10);

          doc.x = margin;
          doc.fillColor(textDark).text(cond, margin, doc.y, { width: contentWidth, align: 'justify' });
          doc.moveDown(0.5);
        }

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
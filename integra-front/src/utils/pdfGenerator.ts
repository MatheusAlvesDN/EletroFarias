import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface OrderPdfData {
  orderNumber: string;
  date: string;
  customerName: string;
  customerDocument?: string;
  sellerName: string;
  items: {
    codProd: string;
    descricao: string;
    quantidade: number;
    precoUnitario: number;
  }[];
  total: number;
  observacoes?: string;
  tag?: string;
}

export const generateOrderPdf = (data: OrderPdfData) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Cabeçalho - Empresa
  doc.setFontSize(20);
  doc.setTextColor(33, 150, 243); // Azul Primário
  doc.text('Integra CRM', 14, 22);
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text('Proposta Comercial de Venda', 14, 28);
  
  // Linha Decorativa
  doc.setDrawColor(33, 150, 243);
  doc.setLineWidth(0.5);
  doc.line(14, 32, pageWidth - 14, 32);

  // Informações do Orçamento (Topo Direita)
  doc.setFontSize(10);
  doc.setTextColor(0);
  doc.text(`Orçamento: #${data.orderNumber}`, pageWidth - 14, 22, { align: 'right' });
  doc.text(`Data: ${data.date}`, pageWidth - 14, 28, { align: 'right' });

  // Dados do Cliente e Vendedor
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Informações Gerais', 14, 45);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Cliente: ${data.customerName}`, 14, 52);
  if (data.customerDocument) {
    doc.text(`CPF/CNPJ: ${data.customerDocument}`, 14, 57);
  }
  doc.text(`Vendedor: ${data.sellerName}`, 14, 62);

  const tableRows: any[] = [];
  const isLid = data.tag === 'LID';

  if (isLid) {
    // Tabela de Itens (Agrupados por Área)
    const groupedItems = data.items.reduce((acc: any, item: any) => {
      const area = item.area || 'Geral';
      if (!acc[area]) acc[area] = [];
      acc[area].push(item);
      return acc;
    }, {});

    Object.entries(groupedItems).forEach(([areaName, itemsInArea]: any) => {
      // Linha de agrupamento (Área)
      tableRows.push([
        {
          content: areaName.toUpperCase(),
          colSpan: 5,
          styles: { fillColor: [230, 230, 230], textColor: [33, 150, 243], fontStyle: 'bold', halign: 'left' }
        }
      ]);

      // Itens da Área
      itemsInArea.forEach((item: any) => {
        tableRows.push([
          item.codProd,
          item.descricao,
          item.quantidade.toString(),
          item.precoUnitario.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
          (item.quantidade * item.precoUnitario).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
        ]);
      });
    });
  } else {
    // Tabela de Itens (Lista Simples)
    data.items.forEach((item: any) => {
      tableRows.push([
        item.codProd,
        item.descricao,
        item.quantidade.toString(),
        item.precoUnitario.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
        (item.quantidade * item.precoUnitario).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
      ]);
    });
  }

  autoTable(doc, {
    startY: 75,
    head: [['Cód', 'Descrição', 'Qtd', 'Unitário', 'Subtotal']],
    body: tableRows,
    headStyles: { fillColor: [33, 150, 243], textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    margin: { left: 14, right: 14 },
    styles: { fontSize: 9 },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 15, halign: 'center' },
      3: { cellWidth: 30, halign: 'right' },
      4: { cellWidth: 30, halign: 'right' },
    }
  });

  // Resumo Financeiro
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Resumo do Pedido', pageWidth - 14, finalY, { align: 'right' });
  
  doc.setFontSize(14);
  doc.setTextColor(33, 150, 243);
  doc.text(`TOTAL: ${data.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`, pageWidth - 14, finalY + 8, { align: 'right' });

  // Observações
  if (data.observacoes) {
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.setFont('helvetica', 'bold');
    doc.text('Observações:', 14, finalY + 20);
    doc.setFont('helvetica', 'normal');
    const splitObs = doc.splitTextToSize(data.observacoes, pageWidth - 28);
    doc.text(splitObs, 14, finalY + 26);
  }

  // Rodapé
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Página ${i} de ${pageCount} - Gerado em ${new Date().toLocaleString()}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }

  // Salvar
  doc.save(`Orcamento_${data.orderNumber}_${data.customerName.replace(/\s+/g, '_')}.pdf`);
};

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type HAlignType = "left" | "center" | "right";

interface PDFOptions {
  title: string;
  subtitle?: string;
  orientation?: "portrait" | "landscape";
  columns: { header: string; dataKey: string; halign?: "left" | "center" | "right" }[];
  rows: Record<string, string | number>[];
  groups?: { label: string; rows: Record<string, string | number>[]; subtotalLabel: string; subtotalValue: string }[];
  totals?: { label: string; value: string }[];
  compact?: boolean;
}

export function generatePDF(options: PDFOptions) {
  const { title, subtitle, orientation = "landscape", columns, rows, groups, totals, compact = true } = options;

  const doc = new jsPDF({ orientation, unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header (compact layout)
  if (compact) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Anjos da Vida Saúde", pageWidth / 2, 12, { align: "center" });

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(title, pageWidth / 2, 17, { align: "center" });

    if (subtitle) {
      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text(subtitle, pageWidth / 2, 21, { align: "center" });
      doc.setTextColor(0);
    }

    var startY = subtitle ? 24 : 20;
  } else {
    // default (non-compact)
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Anjos da Vida Saúde", pageWidth / 2, 15, { align: "center" });

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(title, pageWidth / 2, 22, { align: "center" });

    if (subtitle) {
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(subtitle, pageWidth / 2, 28, { align: "center" });
      doc.setTextColor(0);
    }

    var startY = subtitle ? 34 : 28;
  }

  const marginLR = compact ? 8 : 14;

  if (groups && groups.length > 0) {
    let currentY = startY;

    groups.forEach((group) => {
      // Group header
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(group.label, 14, currentY);
      currentY += 6;

      autoTable(doc, {
        startY: currentY,
        tableWidth: 'auto',
        head: [columns.map((c) => ({
          content: c.header,
          styles: { halign: (c.halign || 'left') as HAlignType },
        }))],
        body: [
          ...group.rows.map((row) => columns.map((c) => String(row[c.dataKey] ?? ""))),
          // Subtotal row
          columns.map((c, i) => {
            if (i === 0) return group.subtotalLabel;
            if (i === columns.length - 1) return group.subtotalValue;
            return "";
          }),
        ],
        styles: { fontSize: compact ? 7 : 8, cellPadding: compact ? 1 : 2, halign: 'left' as HAlignType, fillColor: [255, 255, 255], lineColor: [100, 100, 100], lineWidth: compact ? 0.12 : 0.1 },
        headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: "bold", fontSize: compact ? 7 : 8 },
        columnStyles: columns.reduce((acc, col, i) => {
          acc[i] = { halign: (col.halign || 'left') as HAlignType };
          return acc;
        }, {} as Record<number, { halign: HAlignType }>),
        didParseCell: (data: any) => {
          // Style subtotal row: bold and add a thin top border
          if (data.row.index === group.rows.length && data.section === "body") {
            data.cell.styles.fontStyle = "bold";
            data.cell.styles.fillColor = [255, 255, 255];
            data.cell.styles.lineWidth = compact ? 0.2 : 0.3;
            data.cell.styles.lineColor = [80, 80, 80];
          }
        },
        margin: { left: marginLR, right: marginLR },
      });

      currentY = (doc as any).lastAutoTable.finalY + 8;
    });

    // Grand total
    if (totals) {
      totals.forEach((total) => {
        doc.setFontSize(compact ? 9 : 12);
        doc.setFont("helvetica", "bold");
        doc.text(`${total.label}: ${total.value}`, pageWidth - 14, currentY, { align: "right" });
        currentY += 7;
      });
    }
  } else {
    autoTable(doc, {
      startY,
      tableWidth: 'auto',
      head: [columns.map((c) => ({
        content: c.header,
        styles: { halign: (c.halign || 'left') as HAlignType },
      }))],
      body: rows.map((row) => columns.map((c) => String(row[c.dataKey] ?? ""))),
      styles: { fontSize: compact ? 7 : 8, cellPadding: compact ? 1 : 2, halign: 'left' as HAlignType, fillColor: [255, 255, 255], lineColor: [100, 100, 100], lineWidth: compact ? 0.12 : 0.1 },
      headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: "bold", fontSize: compact ? 7 : 8 },
      columnStyles: columns.reduce((acc, col, i) => {
        acc[i] = { halign: (col.halign || 'left') as HAlignType };
        return acc;
      }, {} as Record<number, { halign: HAlignType }>),
      margin: { left: marginLR, right: marginLR },
    });

    if (totals) {
      const finalY = (doc as any).lastAutoTable.finalY + 6;
      totals.forEach((total, i) => {
        doc.setFontSize(compact ? 9 : 11);
        doc.setFont("helvetica", "bold");
        doc.text(`${total.label}: ${total.value}`, pageWidth - 14, finalY + i * 7, { align: "right" });
      });
    }
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(compact ? 7 : 8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(120);
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.text(
      `Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} — Página ${i}/${pageCount}`,
      pageWidth / 2,
      pageHeight - 8,
      { align: "center" }
    );
  }

  doc.save(`${title.replace(/\s+/g, "_").toLowerCase()}.pdf`);
}

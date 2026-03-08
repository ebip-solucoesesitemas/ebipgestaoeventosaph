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
}

export function generatePDF(options: PDFOptions) {
  const { title, subtitle, orientation = "landscape", columns, rows, groups, totals } = options;

  const doc = new jsPDF({ orientation, unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
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

  const startY = subtitle ? 34 : 28;

  if (groups && groups.length > 0) {
    let currentY = startY;

    groups.forEach((group) => {
      // Group header
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(group.label, 14, currentY);
      currentY += 2;

      autoTable(doc, {
        startY: currentY,
        head: [columns.map((c) => c.header)],
        body: [
          ...group.rows.map((row) => columns.map((c) => String(row[c.dataKey] ?? ""))),
          // Subtotal row
          columns.map((c, i) => {
            if (i === 0) return group.subtotalLabel;
            if (i === columns.length - 1) return group.subtotalValue;
            return "";
          }),
        ],
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [229, 231, 235], textColor: [0, 0, 0], fontStyle: "bold", fontSize: 7 },
        columnStyles: columns.reduce((acc, col, i) => {
          if (col.halign) acc[i] = { halign: col.halign as HAlignType };
          return acc;
        }, {} as Record<number, { halign: HAlignType }>),
        didParseCell: (data: any) => {
          // Style subtotal row
          if (data.row.index === group.rows.length && data.section === "body") {
            data.cell.styles.fontStyle = "bold";
            data.cell.styles.fillColor = [240, 240, 240];
          }
        },
        margin: { left: 14, right: 14 },
      });

      currentY = (doc as any).lastAutoTable.finalY + 8;
    });

    // Grand total
    if (totals) {
      totals.forEach((total) => {
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text(`${total.label}: ${total.value}`, pageWidth - 14, currentY, { align: "right" });
        currentY += 7;
      });
    }
  } else {
    autoTable(doc, {
      startY,
      head: [columns.map((c) => c.header)],
      body: rows.map((row) => columns.map((c) => String(row[c.dataKey] ?? ""))),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [229, 231, 235], textColor: [0, 0, 0], fontStyle: "bold", fontSize: 7 },
      columnStyles: columns.reduce((acc, col, i) => {
        if (col.halign) acc[i] = { halign: col.halign as HAlignType };
        return acc;
      }, {} as Record<number, { halign: HAlignType }>),
      margin: { left: 14, right: 14 },
    });

    if (totals) {
      const finalY = (doc as any).lastAutoTable.finalY + 8;
      totals.forEach((total, i) => {
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text(`${total.label}: ${total.value}`, pageWidth - 14, finalY + i * 7, { align: "right" });
      });
    }
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(150);
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

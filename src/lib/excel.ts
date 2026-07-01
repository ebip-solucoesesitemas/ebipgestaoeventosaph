import * as XLSX from "xlsx";

export interface ExcelColumn {
  header: string;
  dataKey: string;
  halign?: "left" | "center" | "right";
}

export function buildExcelData(columns: ExcelColumn[], rows: Record<string, string | number>[]) {
  const headers = columns.map((column) => column.header);
  const data = rows.map((row) => columns.map((column) => row[column.dataKey] ?? ""));
  return [headers, ...data] as Array<Array<string | number>>;
}

export function downloadExcelFile(
  columns: ExcelColumn[],
  rows: Record<string, string | number>[],
  fileName: string,
  sheetName = "Relatório",
) {
  const worksheet = XLSX.utils.aoa_to_sheet(buildExcelData(columns, rows));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const blob = new Blob([excelBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${fileName}.xlsx`;
  link.click();
  window.URL.revokeObjectURL(url);
}

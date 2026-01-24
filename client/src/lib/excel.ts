import * as XLSX from "xlsx";

export type WorksheetRows = (string | number | null)[][];

const normalizeRows = (rows: any[][]): WorksheetRows => {
  return rows.map((row) =>
    row.map((cell) => (cell === undefined || cell === null ? "" : cell))
  );
};

export const readWorksheetFromFile = async (file: File): Promise<WorksheetRows> => {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return [];
  }
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<any[]>(sheet, {
    header: 1,
    blankrows: false,
    raw: true,
  });
  return normalizeRows(rows);
};

export const downloadWorksheet = (
  rows: WorksheetRows,
  fileName: string,
  sheetName = "Sheet1"
) => {
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, fileName);
};

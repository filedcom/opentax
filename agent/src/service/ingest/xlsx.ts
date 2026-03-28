import * as XLSX from "xlsx";

/**
 * Returns one Markdown string per sheet. Empty sheets are skipped.
 * Each string includes a `## SheetName` heading followed by the table.
 */
export async function xlsxToSheets(filePath: string): Promise<string[]> {
  const data = await Deno.readFile(filePath);
  return xlsxBytesToSheets(data);
}

/** Exported for unit testing without the filesystem. */
export function xlsxBytesToSheets(data: Uint8Array): string[] {
  const workbook = XLSX.read(data, { type: "buffer" });
  const sheets: string[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 });
    const table = rowsToMarkdownTable(rows);
    if (!table) continue;
    sheets.push(`## ${sheetName}\n\n${table}`);
  }

  return sheets;
}

function rowsToMarkdownTable(rows: string[][]): string {
  const nonEmpty = rows.filter((r) => r.some((cell) => cell != null && cell !== ""));
  if (nonEmpty.length === 0) return "";

  const [header, ...body] = nonEmpty;
  const width = Math.max(...nonEmpty.map((r) => r.length));
  const pad = (row: string[]): string[] =>
    Array.from({ length: width }, (_, i) => String(row[i] ?? ""));

  const separator = Array.from({ length: width }, () => "---");
  return [
    `| ${pad(header).join(" | ")} |`,
    `| ${separator.join(" | ")} |`,
    ...body.map((row) => `| ${pad(row).join(" | ")} |`),
  ].join("\n");
}

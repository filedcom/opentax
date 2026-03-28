import { extname } from "@std/path";
import { docxToPages } from "./docx.ts";
import { csvToMarkdown } from "./csv.ts";
import { imageToJpeg } from "./image.ts";
import { pdfToImages } from "./pdf.ts";
import { textToMarkdown } from "./text.ts";
import { PageJpg, PageMd, ParsedDocument } from "./types.ts";
import { xlsxToSheets } from "./xlsx.ts";

const IMAGE_EXTS = new Set([
  ".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp", ".tiff", ".tif",
]);

const SUPPORTED_EXTS = new Set([
  ".pdf", ".docx", ".csv", ".xlsx", ".xls", ".txt", ".md",
  ...IMAGE_EXTS,
]);

export function isSupportedFormat(filePath: string): boolean {
  return SUPPORTED_EXTS.has(extname(filePath).toLowerCase());
}

/**
 * Ingests a document and returns a ParsedDocument.
 * - PDF → one PageJpg per page
 * - Image → one PageJpg
 * - DOCX → one PageMd per Word page (split on page breaks)
 * - XLSX/XLS → one PageMd per sheet
 * - CSV, TXT, MD → one PageMd
 */
export async function ingest(filePath: string): Promise<ParsedDocument> {
  const ext = extname(filePath).toLowerCase();

  if (ext === ".pdf") {
    const jpegs = await pdfToImages(filePath);
    return new ParsedDocument(filePath, jpegs.map((jpeg, i) => new PageJpg(i, jpeg)));
  }

  if (IMAGE_EXTS.has(ext)) {
    const jpeg = await imageToJpeg(filePath);
    return new ParsedDocument(filePath, [new PageJpg(0, jpeg)]);
  }

  if (ext === ".docx") {
    const pages = await docxToPages(filePath);
    return new ParsedDocument(filePath, pages.map((content, i) => new PageMd(i, content)));
  }

  if (ext === ".xlsx" || ext === ".xls") {
    const sheets = await xlsxToSheets(filePath);
    return new ParsedDocument(filePath, sheets.map((content, i) => new PageMd(i, content)));
  }

  if (ext === ".csv") {
    return new ParsedDocument(filePath, [new PageMd(0, await csvToMarkdown(filePath))]);
  }

  if (ext === ".txt" || ext === ".md") {
    return new ParsedDocument(filePath, [new PageMd(0, await textToMarkdown(filePath))]);
  }

  throw new Error(
    `Unsupported file format: "${ext}". Supported: ${[...SUPPORTED_EXTS].join(", ")}`,
  );
}

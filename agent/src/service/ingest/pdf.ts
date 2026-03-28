import mupdf from "mupdf";
import { JPEG_QUALITY } from "./types.ts";

// 150 DPI: mupdf works in 72 DPI units, so scale = 150/72
const RENDER_SCALE = 150 / 72;
const RENDER_MATRIX: [number, number, number, number, number, number] = [
  RENDER_SCALE, 0, 0, RENDER_SCALE, 0, 0,
];

/**
 * Converts a PDF to one JPEG per page.
 * Uses mupdf (WASM) — no system dependencies required.
 */
export async function pdfToImages(filePath: string): Promise<Uint8Array[]> {
  const data = await Deno.readFile(filePath);
  const doc = mupdf.Document.openDocument(data, "application/pdf");
  const pageCount = doc.countPages();

  const pages: Uint8Array[] = [];
  for (let i = 0; i < pageCount; i++) {
    const page = doc.loadPage(i);
    const pixmap = page.toPixmap(RENDER_MATRIX, mupdf.ColorSpace.DeviceRGB, false);
    pages.push(pixmap.asJPEG(JPEG_QUALITY));
  }
  return pages;
}

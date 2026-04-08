import { PDFDocument } from "pdf-lib";
import { join } from "@std/path";
import { normalizeAllPending } from "../pending.ts";
import { ALL_PDF_FORMS } from "./forms/index.ts";
import type { PdfFormDescriptor } from "./form-descriptor.ts";

/**
 * Fetch an IRS PDF and cache it under cacheDir keyed by a sanitized URL slug.
 * Returns raw bytes.
 */
async function fetchWithCache(url: string, cacheDir: string): Promise<Uint8Array> {
  const slug = url.replace(/[^a-zA-Z0-9]/g, "_").replace(/_+/g, "_");
  const cachePath = join(cacheDir, `${slug}.pdf`);

  try {
    const cached = await Deno.readFile(cachePath);
    return cached;
  } catch {
    // Not cached — fetch from IRS
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to fetch IRS PDF: ${url} (${res.status})`);
    }
    const bytes = new Uint8Array(await res.arrayBuffer());
    await Deno.mkdir(cacheDir, { recursive: true });
    await Deno.writeFile(cachePath, bytes);
    return bytes;
  }
}

/**
 * Fill a single IRS AcroForm PDF with the pending fields for that form.
 * Returns undefined if there are no matching populated fields.
 */
async function fillFormPdf(
  descriptor: PdfFormDescriptor,
  fields: Record<string, unknown>,
  cacheDir: string,
): Promise<Uint8Array | undefined> {
  // Check if any mapped field has a value before fetching the PDF
  const hasData = descriptor.PDF_FIELD_MAP.some(([key]) => {
    const v = fields[key];
    return v !== undefined && v !== null;
  });
  if (!hasData) return undefined;

  const pdfBytes = await fetchWithCache(descriptor.pdfUrl, cacheDir);

  // pdf-lib will warn that XFA is stripped — this is expected for IRS fillable PDFs.
  // The AcroForm widget layer is preserved and can be filled normally.
  const doc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const form = doc.getForm();

  for (const [domainKey, pdfFieldName] of descriptor.PDF_FIELD_MAP) {
    const value = fields[domainKey];
    if (value === undefined || value === null) continue;

    try {
      const field = form.getTextField(pdfFieldName);
      // Format numbers as integers (IRS forms show whole dollar amounts)
      const text = typeof value === "number"
        ? Math.round(value).toString()
        : String(value);
      field.setText(text);
    } catch {
      // Field not found in this PDF version — skip silently
    }
  }

  form.flatten();
  return doc.save();
}

/**
 * Build a merged PDF from all applicable IRS forms filled with the computed
 * return data.
 *
 * @param pending   Raw executor pending dict (all form keys)
 * @param cacheDir  Directory to cache downloaded IRS PDFs (default: .pdf-cache)
 */
export async function buildPdfBytes(
  pending: Record<string, unknown>,
  cacheDir = ".pdf-cache",
): Promise<Uint8Array> {
  const normalized = normalizeAllPending(pending);
  const merged = await PDFDocument.create();

  for (const descriptor of ALL_PDF_FORMS) {
    const fields = normalized[descriptor.pendingKey];
    if (!fields) continue;

    const filledBytes = await fillFormPdf(descriptor, fields, cacheDir);
    if (!filledBytes) continue;

    const filledDoc = await PDFDocument.load(filledBytes);
    const pageIndices = filledDoc.getPageIndices();
    const copiedPages = await merged.copyPages(filledDoc, pageIndices);
    for (const page of copiedPages) {
      merged.addPage(page);
    }
  }

  if (merged.getPageCount() === 0) {
    throw new Error("No PDF forms were generated — return may have no computed data.");
  }

  return merged.save();
}

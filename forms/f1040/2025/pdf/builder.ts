import { PDFDocument, StandardFonts } from "pdf-lib";
import { join } from "@std/path";
import { normalizeAllPending } from "../pending.ts";
import { ALL_PDF_FORMS } from "./forms/index.ts";
import type { PdfFieldEntry, PdfFormDescriptor } from "./form-descriptor.ts";
import type { FilerIdentity } from "../../mef/header.ts";

async function fetchWithCache(url: string, cacheDir: string): Promise<Uint8Array> {
  const slug = url.replace(/[^a-zA-Z0-9]/g, "_").replace(/_+/g, "_");
  const cachePath = join(cacheDir, `${slug}.pdf`);
  try {
    return await Deno.readFile(cachePath);
  } catch {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch IRS PDF: ${url} (${res.status})`);
    const bytes = new Uint8Array(await res.arrayBuffer());
    await Deno.mkdir(cacheDir, { recursive: true });
    await Deno.writeFile(cachePath, bytes);
    return bytes;
  }
}

/** Resolves dot-notation paths like "address.line1" against a nested object. */
function resolvePath(obj: Record<string, unknown>, path: string): unknown {
  let current: unknown = obj;
  for (const part of path.split(".")) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function fillEntry(
  form: ReturnType<PDFDocument["getForm"]>,
  entry: PdfFieldEntry,
  value: unknown,
  formKey: string,
): void {
  try {
    if (entry.kind === "text") {
      // IRS convention: leave numeric fields blank when value is zero —
      // unless the descriptor marks the line as printZero (explicit "0").
      if (
        typeof value === "number" && Math.round(value) === 0 &&
        !("printZero" in entry && entry.printZero)
      ) return;
      const text = typeof value === "number"
        ? Math.round(value).toString()
        : String(value);
      form.getTextField(entry.pdfField).setText(text);
    } else if (entry.kind === "checkbox") {
      const box = form.getCheckBox(entry.pdfField);
      value ? box.check() : box.uncheck();
    } else if (entry.kind === "checkboxWhen") {
      if (String(value) === entry.whenValue) form.getCheckBox(entry.pdfField).check();
    } else if (entry.kind === "radio") {
      const mapped = entry.valueMap[String(value)];
      if (mapped) form.getRadioGroup(entry.pdfField).select(mapped);
    }
    // Fill any additional PDF fields that share the same domain value
    if ("extraPdfFields" in entry && entry.extraPdfFields) {
      for (const extraField of entry.extraPdfFields) {
        try {
          if (entry.kind === "text") {
            if (typeof value === "number" && Math.round(value) === 0) continue;
            const text = typeof value === "number"
              ? Math.round(value).toString()
              : String(value);
            form.getTextField(extraField).setText(text);
          } else if (entry.kind === "checkbox") {
            const box = form.getCheckBox(extraField);
            value ? box.check() : box.uncheck();
          }
        } catch (extraErr) {
          console.error(
            `[PDF] ${formKey}: failed to fill extra field "${extraField}" (${entry.kind}) — ${extraErr}`,
          );
        }
      }
    }
  } catch (err) {
    console.error(
      `[PDF] ${formKey}: failed to fill field "${entry.pdfField}" (${entry.kind}) — ${err}`,
    );
  }
}

async function fillFormPdf(
  descriptor: PdfFormDescriptor,
  fields: Record<string, unknown>,
  filer: FilerIdentity | undefined,
  cacheDir: string,
  allPending?: Record<string, Record<string, unknown>>,
): Promise<Uint8Array | undefined> {
  if (descriptor.presenceKey !== undefined) {
    const gate = fields[descriptor.presenceKey];
    if (gate === undefined || gate === null) return undefined;
  }

  // A form is only emitted when it carries at least one *meaningful* value:
  // a number that doesn't round to zero, a true boolean, or a nonempty string.
  // Merely-defined zeros previously caused blank Schedule A / EIC / SE / 6251 /
  // 8959 / 8960 / 8962 pages to be included in the export.
  const isMeaningful = (v: unknown): boolean => {
    if (v === undefined || v === null) return false;
    if (typeof v === "number") return Math.round(v) !== 0;
    if (typeof v === "boolean") return v;
    if (typeof v === "string") return v.length > 0;
    return false;
  };
  const hasData =
    descriptor.fields.some(({ domainKey }) => isMeaningful(fields[domainKey])) ||
    (descriptor.rows !== undefined &&
      Array.isArray(fields[descriptor.rows.domainKey]) &&
      (fields[descriptor.rows.domainKey] as unknown[]).length > 0);

  if (!hasData) return undefined;
  if (descriptor.includeWhen !== undefined && !descriptor.includeWhen(fields, allPending)) {
    return undefined;
  }

  const pdfBytes = await fetchWithCache(descriptor.pdfUrl, cacheDir);
  const doc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const form = doc.getForm();

  // Fill computed fields
  for (const entry of descriptor.fields) {
    const value = fields[entry.domainKey];
    if (value === undefined || value === null) continue;
    fillEntry(form, entry, value, descriptor.pendingKey);
  }

  // Fill filer identity fields (domainKey supports dot-notation, e.g. "address.line1")
  if (filer !== undefined) {
    const filerObj = filer as unknown as Record<string, unknown>;
    for (const entry of descriptor.filerFields ?? []) {
      const value = resolvePath(filerObj, entry.domainKey);
      if (value === undefined || value === null) continue;
      fillEntry(form, entry, value, descriptor.pendingKey);
    }

    // pdf-lib strips the IRS XFA layer, but the 2025 filing-status checkboxes
    // also exist in AcroForm and are filled by the Form 1040 descriptor.
  }

  // Fill row arrays (Form 8949-style)
  if (descriptor.rows) {
    const items = fields[descriptor.rows.domainKey];
    if (Array.isArray(items)) {
      for (let i = 0; i < Math.min(items.length, descriptor.rows.maxRows); i++) {
        const row = items[i] as Record<string, unknown>;
        for (const rf of descriptor.rows.rowFields) {
          let pdfField = rf.pdfFieldPattern.replace("{row}", String(i + 1));
          if (rf.fieldNumBase !== undefined && descriptor.rows.rowStride !== undefined) {
            const fieldNum = rf.fieldNumBase + i * descriptor.rows.rowStride;
            pdfField = pdfField.replace("{field_num}", String(fieldNum).padStart(2, "0"));
          }
          const value = row[rf.domainKey];
          if (value === undefined || value === null) continue;
          try {
            if (rf.kind === "checkbox") {
              const box = form.getCheckBox(pdfField);
              value ? box.check() : box.uncheck();
            } else {
              form.getTextField(pdfField).setText(
                typeof value === "number" ? Math.round(value).toString() : String(value),
              );
            }
          } catch (err) {
            console.error(
              `[PDF] ${descriptor.pendingKey}: row ${i + 1} field "${pdfField}" — ${err}`,
            );
          }
        }
      }
    }
  }

  // IRS PDFs reference non-embedded fonts (e.g. HelveticaLTStd-Bold) in their
  // field DA strings. pdf-lib cannot synthesize these, so form.flatten() would
  // produce invisible content. Regenerating appearances with a standard embedded
  // font ensures all field values render correctly after flattening.
  const font = await doc.embedFont(StandardFonts.Helvetica);
  form.updateFieldAppearances(font);
  form.flatten();
  return doc.save();
}

/**
 * Build a merged PDF from all applicable IRS forms filled with the computed
 * return data and filer identity.
 *
 * @param pending   Raw executor pending dict (all form keys)
 * @param filer     Filer identity (name, SSN, address)
 * @param cacheDir  Directory to cache downloaded IRS PDFs (default: .pdf-cache)
 */
export async function buildPdfBytes(
  pending: Record<string, unknown>,
  filer: FilerIdentity | undefined,
  cacheDir = ".pdf-cache",
): Promise<Uint8Array> {
  const normalized = normalizeAllPending(pending);
  const merged = await PDFDocument.create();

  for (const descriptor of ALL_PDF_FORMS) {
    const fields = (normalized[descriptor.pendingKey] ?? {}) as Record<string, unknown>;

    const effectiveFields = descriptor.rows
      ? {
        ...fields,
        [descriptor.rows.domainKey]: pending[descriptor.rows.domainKey] ??
          fields[descriptor.rows.domainKey],
      }
      : fields;

    const instances = descriptor.instances?.(effectiveFields) ?? [effectiveFields];
    for (const instance of instances) {
      const filledBytes = await fillFormPdf(descriptor, instance, filer, cacheDir, normalized);
      if (!filledBytes) continue;

      const filledDoc = await PDFDocument.load(filledBytes);
      const pageIndices = filledDoc.getPageIndices();
      const copiedPages = await merged.copyPages(filledDoc, pageIndices);
      for (const page of copiedPages) {
        merged.addPage(page);
      }
    }
  }

  if (merged.getPageCount() === 0) {
    throw new Error("No PDF forms were generated — return may have no computed data.");
  }

  return merged.save();
}

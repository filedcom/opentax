import { PDFDocument, StandardFonts } from "pdf-lib";
import type { PdfFieldEntry } from "../../pdf/form-descriptor.ts";
import { irs1040Pdf2026 } from "./forms/f1040.ts";

const pinnedDraft = new URL(
  "../../../../docs/ty2026/corpus/draft/f1040.pdf",
  import.meta.url,
);
const pinnedDraftSha256 =
  "e044e765ace334c76bda7910bd3193fc813c7789d06340124359b885c98d58d0";

function fillField(
  form: ReturnType<PDFDocument["getForm"]>,
  entry: PdfFieldEntry,
  value: unknown,
): void {
  if (value === undefined || value === null) return;
  if (entry.kind === "text") {
    if (
      typeof value === "number" && Math.round(value) === 0 && !entry.printZero
    ) {
      return;
    }
    const text = typeof value === "number"
      ? Math.round(value).toString()
      : String(value);
    form.getTextField(entry.pdfField).setText(text);
  } else if (entry.kind === "checkbox") {
    if (value === true) form.getCheckBox(entry.pdfField).check();
  } else if (entry.kind === "checkboxWhen") {
    if (String(value) === entry.whenValue) {
      form.getCheckBox(entry.pdfField).check();
    }
  } else if (entry.kind === "radio") {
    const selected = entry.valueMap[String(value)];
    if (selected !== undefined) {
      form.getRadioGroup(entry.pdfField).select(selected);
    }
  }
}

/** Fill the pinned TY2026 draft Form 1040; this is one component of the future PDF bundle. */
export async function buildF1040PdfBytes2026(
  rawFields: Record<string, unknown>,
): Promise<Uint8Array> {
  const fields = irs1040Pdf2026.projectFields!(rawFields, { f1040: rawFields });
  const source = await Deno.readFile(pinnedDraft);
  const hash = [
    ...new Uint8Array(await crypto.subtle.digest("SHA-256", source)),
  ]
    .map((byte) => byte.toString(16).padStart(2, "0")).join("");
  if (hash !== pinnedDraftSha256) {
    throw new Error("Pinned TY2026 draft Form 1040 hash changed");
  }
  const filled = await PDFDocument.load(source, { ignoreEncryption: true });
  const form = filled.getForm();
  for (const entry of irs1040Pdf2026.fields) {
    fillField(form, entry, fields[entry.domainKey]);
  }
  const font = await filled.embedFont(StandardFonts.Helvetica);
  form.updateFieldAppearances(font);
  form.flatten();

  const document = await PDFDocument.create();
  const pages = await document.copyPages(
    filled,
    [...irs1040Pdf2026.pageIndices!(fields)],
  );
  for (const page of pages) document.addPage(page);
  return document.save();
}

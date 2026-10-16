import * as fs from "node:fs/promises";
import * as sys from "../../../../../../scripts/support/sys.ts";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { w2gPdf } from "../../../pdf/forms/income/other/w2g.ts";

/** Constructed source on the real recipient template; not payer authentication. */
export async function w2gPayerCopyFixture(
  projected: Record<string, unknown>,
): Promise<Uint8Array> {
  const cache = `.pdf-cache/${
    w2gPdf.pdfUrl.replace(/[^a-zA-Z0-9]/g, "_").replace(/_+/g, "_")
  }.pdf`;
  let bytes: Uint8Array;
  try {
    bytes = await sys.readBytes(cache);
  } catch (error) {
    if (!(sys.isNotFound(error))) throw error;
    const response = await fetch(w2gPdf.pdfUrl);
    if (!response.ok) {
      throw new Error(`W-2G official template: ${response.status}`);
    }
    bytes = new Uint8Array(await response.arrayBuffer());
    await fs.mkdir(".pdf-cache", { recursive: true });
    await fs.writeFile(cache, bytes);
  }
  const pdf = await PDFDocument.load(bytes, { updateMetadata: false });
  const form = pdf.getForm();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  form.updateFieldAppearances(font);
  for (const field of form.getFields()) {
    if (!field.getName().startsWith("topmostSubform[0].CopyB[0].")) {
      form.removeField(field);
    }
  }
  for (const field of w2gPdf.fields) {
    if (field.kind !== "text" || field.domainKey === "payer_phone") continue;
    form.getTextField(field.pdfField).setText(
      String(projected[field.domainKey] ?? ""),
    );
  }
  form.updateFieldAppearances(font);
  for (let index = pdf.getPageCount() - 1; index >= 0; index--) {
    if (index !== 2) pdf.removePage(index);
  }
  return pdf.save({ updateFieldAppearances: false });
}

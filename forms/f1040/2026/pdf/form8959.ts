import {
  PDFDocument,
  PDFName,
  rgb,
  StandardFonts,
  TextAlignment,
} from "pdf-lib";
import {
  calculateForm8959_2026,
  type Form8959Input2026,
} from "../nodes/form8959.ts";
import { loadPinnedDraft2026 } from "./source.ts";

/** Static return-bundle component using the revised 2026 line meanings. */
export async function buildForm8959PdfBytes2026(
  raw: Form8959Input2026,
  destinations: {
    schedule2_line17b: number;
    schedule2_line11: number;
    form8959_withholding_component: number;
  },
  filer: { name: string; ssn: string },
): Promise<Uint8Array> {
  const result = calculateForm8959_2026(raw);
  if (!result.file_form8959) {
    throw new Error("Form 8959 has no filing trigger or withholding credit");
  }
  if (
    !filer.name.trim() ||
    filer.ssn.replaceAll("-", "") !== raw.taxpayer_ssn.replaceAll("-", "")
  ) throw new Error("Form 8959 PDF needs matching filer identity");
  const lines = result.lines;
  if (
    destinations.schedule2_line17b !== lines.line12 ||
    destinations.schedule2_line11 !== lines.line18 ||
    destinations.form8959_withholding_component !== lines.line24
  ) {
    throw new Error(
      "Form 8959 PDF destinations disagree with calculated sources",
    );
  }
  const bytes = await loadPinnedDraft2026(
    new URL("../../../../docs/ty2026/corpus/draft/f8959.pdf", import.meta.url),
    "https://www.irs.gov/pub/irs-dft/f8959--dft.pdf",
    "8f663b2ca3dd052537a4d8aea4ae9aada0606b0f7dc7711fa8948489ef870d2f",
  );
  const draft = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const form = draft.getForm();
  if (form.getFields().length !== 26 || draft.getPageCount() !== 2) {
    throw new Error("Form 8959 template field inventory changed");
  }
  const font = await draft.embedFont(StandardFonts.Helvetica);
  const fill = (index: number, value: string | number) => {
    const field = form.getTextField(
      `topmostSubform[0].Page1[0].f1_${index}[0]`,
    );
    const rect = field.acroField.getWidgets()[0].getRectangle();
    const text = String(value);
    const size = Math.min(
      9,
      9 * (rect.width - 4) / Math.max(1, font.widthOfTextAtSize(text, 9)),
    );
    if (size < 6) throw new Error("Form 8959 text exceeds its printable field");
    field.setFontSize(size);
    if (typeof value === "number") field.setAlignment(TextAlignment.Right);
    field.setText(text);
  };
  fill(1, filer.name);
  fill(2, filer.ssn);
  const print = (first: number, last: number) => {
    for (let line = first; line <= last; line++) {
      fill(line + 2, lines[`line${line}` as keyof typeof lines]);
    }
  };
  // Inapplicable parts remain blank, as directed on the form.
  if (result.has_medicare_wages) print(1, 7);
  if (result.has_rrta) print(8, 11);
  if (result.has_medicare_wages || result.has_rrta) print(12, 12);
  if (result.has_self_employment) print(13, 18);
  if (result.has_withholding) print(19, 24);
  form.updateFieldAppearances(font);
  form.flatten();
  const doc = await PDFDocument.create();
  const [page] = await doc.copyPages(draft, [1]);
  doc.addPage(page);
  const footer = await doc.embedFont(StandardFonts.Helvetica);
  page.drawText("DRAFT - NOT FOR FILING", {
    x: 36,
    y: 12,
    font: footer,
    size: 8,
    color: rgb(0.4, 0.1, 0.1),
    opacity: 1,
  });
  page.node.delete(PDFName.of("Annots"));
  doc.catalog.delete(PDFName.of("AcroForm"));
  return doc.save({ updateFieldAppearances: false });
}

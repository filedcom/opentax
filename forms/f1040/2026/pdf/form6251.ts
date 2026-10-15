import {
  PDFDocument,
  PDFName,
  rgb,
  StandardFonts,
  TextAlignment,
} from "pdf-lib";
import {
  calculateForm6251_2026,
  type Form6251Input2026,
} from "../nodes/form6251.ts";
import { loadPinnedDraft2026 } from "./source.ts";

export interface Form6251Destinations2026 {
  form1040_line11b: number;
  form1040_line2a?: number;
  form1040_line3a?: number;
  form1040_line7a?: number;
  form1040_line12e: number;
  form1040_line14: number;
  form1040_line15: number;
  form1040_line16: number;
  schedule1a_line43: number;
  schedule_a_line7?: number;
  schedule2_line2: number;
}

/** Static draft component; the complete attachment-selecting bundle is separate. */
export async function buildForm6251PdfBytes2026(
  raw: Form6251Input2026,
  destinations: Form6251Destinations2026,
  filer: { name: string; ssn: string },
): Promise<Uint8Array> {
  const result = calculateForm6251_2026(raw);
  const input = result.source_input;
  if (
    !filer.name.trim() ||
    filer.ssn.replaceAll("-", "") !== input.taxpayer_ssn.replaceAll("-", "")
  ) {
    throw new Error("Form 6251 PDF needs matching filer identity");
  }
  const d = destinations;
  if (
    Object.values(d).some((n) => !Number.isSafeInteger(n)) ||
    d.schedule1a_line43 < 0 || d.schedule1a_line43 > d.form1040_line14 ||
    result.lines.line1a !== d.form1040_line14 - d.schedule1a_line43 ||
    result.lines.line1b !== d.form1040_line11b - result.lines.line1a ||
    result.lines.line2a !==
      (input.taking_standard_deduction
        ? d.form1040_line12e
        : d.schedule_a_line7) ||
    input.regular_taxable_income !== d.form1040_line15 ||
    input.regular_tax !== d.form1040_line16 ||
    result.lines.line11 !== d.schedule2_line2 ||
    (result.investment &&
      (result.investment.lines.line2a !== d.form1040_line2a ||
        result.investment.lines.line3a !== d.form1040_line3a ||
        result.investment.lines.capital_gain_distributions !==
          d.form1040_line7a))
  ) {
    throw new Error(
      "Form 6251 PDF destinations disagree with calculated sources",
    );
  }
  if (!result.file_form6251) {
    throw new Error("This calculation does not require Form 6251 attachment");
  }
  const bytes = await loadPinnedDraft2026(
    new URL("../../../../docs/ty2026/corpus/draft/f6251.pdf", import.meta.url),
    "https://www.irs.gov/pub/irs-dft/f6251--dft.pdf",
    "a547fc9d629e1f04bdc30e088214c716667b88cb1b45447c580c0ae33095b5cc",
  );
  const draft = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const form = draft.getForm();
  const key = (page: number, field: number) =>
    `topmostSubform[0].Page${page}[0].f${page}_${field}[0]`;
  const expected = [
    ...Array.from({ length: 33 }, (_, i) => key(1, i + 1)),
    ...Array.from({ length: 29 }, (_, i) => key(2, i + 1)),
  ];
  if (
    draft.getPageCount() !== 3 || form.getFields().length !== 62 ||
    form.getFields().some((f) =>
      !expected.includes(f.getName()) || f.acroField.getWidgets().length !== 1
    )
  ) {
    throw new Error("Form 6251 template field inventory changed");
  }
  const font = await draft.embedFont(StandardFonts.Helvetica);
  const fill = (page: number, index: number, value: string | number) => {
    const field = form.getTextField(key(page, index));
    const rect = field.acroField.getWidgets()[0].getRectangle();
    const text = String(value);
    const size = Math.min(
      9,
      9 * (rect.width - 4) / Math.max(1, font.widthOfTextAtSize(text, 9)),
    );
    if (size < 6) throw new Error("Form 6251 text exceeds its printable field");
    field.setFontSize(size);
    if (typeof value === "number") field.setAlignment(TextAlignment.Right);
    field.setText(text);
  };
  fill(1, 1, filer.name);
  fill(1, 2, filer.ssn);
  // Canonical widget map reviewed against the pinned form and CSV inventory.
  const firstPage: Record<string, number> = {
    line1a: 3,
    line1b: 4,
    line2a: 5,
    line2g: 11,
    line2i: 13,
    line4: 26,
    line5: 27,
    line6: 28,
    line7: 29,
    line9: 31,
    line10: 32,
    line11: 33,
  };
  for (const [line, value] of Object.entries(result.lines)) {
    const index = firstPage[line];
    if (index !== undefined) fill(1, index, value);
    else {
      const lineNumber = Number(line.slice(4));
      if (!Number.isInteger(lineNumber) || lineNumber < 12 || lineNumber > 40) {
        throw new Error(`Form 6251 has an unmapped calculated line: ${line}`);
      }
      fill(2, lineNumber - 11, value);
    }
  }
  form.updateFieldAppearances(font);
  form.flatten();
  const doc = await PDFDocument.create();
  const footer = await doc.embedFont(StandardFonts.Helvetica);
  for (const page of await doc.copyPages(draft, [1, 2])) {
    doc.addPage(page);
    page.drawText("DRAFT - NOT FOR FILING", {
      x: 36,
      y: 12,
      font: footer,
      size: 8,
      color: rgb(.4, .1, .1),
    });
    page.node.delete(PDFName.of("Annots"));
  }
  doc.catalog.delete(PDFName.of("AcroForm"));
  return doc.save({ updateFieldAppearances: false });
}

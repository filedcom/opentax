import {
  PDFDocument,
  PDFName,
  rgb,
  StandardFonts,
  TextAlignment,
} from "pdf-lib";
import {
  calculateChildCredit2026,
  type ChildCreditInput2026,
} from "../nodes/f8812.ts";
import { loadPinnedDraft2026 } from "./source.ts";
/** Replays the joint energy/child-credit resolution, attachment sequence 75. */
export async function buildForm5695PdfBytes2026(
  raw: ChildCreditInput2026,
  destinations: {
    form1040_line18: number;
    form1040_line19: number;
    schedule3_line5a: number;
  },
  filer: { name: string; ssn: string },
) {
  const result = calculateChildCredit2026(raw), energy = result.energy_credit;
  if (
    !energy || !filer.name.trim() ||
    filer.ssn.replaceAll("-", "") !== energy.source_input.taxpayer_ssn ||
    destinations.form1040_line18 !== energy.tax_limit_worksheet.line1 ||
    destinations.form1040_line19 !== (result.lines?.line14 ?? 0) ||
    destinations.schedule3_line5a !== energy.lines.line3
  ) {
    throw new Error(
      "Form 5695 PDF needs matching owner and calculated credit destinations",
    );
  }
  const bytes = await loadPinnedDraft2026(
    new URL("../../../../docs/ty2026/corpus/draft/f5695.pdf", import.meta.url),
    "https://www.irs.gov/pub/irs-dft/f5695--dft.pdf",
    "f01a8e0555c804f5fd9460ba9e19172549f8c311661ab8d0107bd560f63ea586",
  );
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true }),
    form = doc.getForm();
  if (
    doc.getPageCount() !== 2 || form.getFields().length !== 6 ||
    form.getFields().some((f) => f.acroField.getWidgets().length !== 1)
  ) throw new Error("Form 5695 template inventory changed");
  const font = await doc.embedFont(StandardFonts.Helvetica);
  function fill(index: string, value: string | number) {
    const field = form.getTextField(
        `topmostSubform[0].Page1[0].f1_${index}[0]`,
      ),
      rect = field.acroField.getWidgets()[0].getRectangle(),
      text = String(value);
    const size = Math.min(
      9,
      9 * (rect.width - 4) / Math.max(1, font.widthOfTextAtSize(text, 9)),
    );
    if (size < 6) throw new Error("Form 5695 text exceeds printable field");
    field.setFontSize(size);
    if (typeof value === "number") field.setAlignment(TextAlignment.Right);
    field.setText(text);
  }
  fill("01", filer.name);
  fill("02", filer.ssn);
  fill("3", energy.lines.line1);
  fill("4", energy.lines.line2);
  fill("5", energy.lines.line3);
  if (energy.lines.line4 > 0) fill("6", energy.lines.line4);
  form.updateFieldAppearances(font);
  form.flatten();
  doc.removePage(0);
  doc.catalog.delete(PDFName.of("AcroForm"));
  for (const page of doc.getPages()) {
    page.node.delete(PDFName.of("Annots"));
    page.drawText("DRAFT - NOT FOR FILING", {
      x: 36,
      y: 12,
      size: 8,
      font,
      color: rgb(.4, .1, .1),
    });
  }
  return doc.save({ updateFieldAppearances: false });
}

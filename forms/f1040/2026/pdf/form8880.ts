import {
  PDFDocument,
  PDFName,
  rgb,
  StandardFonts,
  TextAlignment,
} from "pdf-lib";
import {
  calculateSaversCredit2026,
  type SaversCreditSource2026,
} from "../inputs/savers-credit-source.ts";
import { loadPinnedDraft2026 } from "./source.ts";

/** Source-reconciled static development attachment, sequence 54. */
export async function buildForm8880PdfBytes2026(
  raw: SaversCreditSource2026,
  destinations: {
    form1040_line11a: number;
    form1040_line18: number;
    schedule3_line1: number;
    schedule3_line2: number;
    schedule3_line3: number;
    schedule3_line4: number;
    schedule3_line6d: number;
    schedule3_line6l: number;
  },
  filer: { name: string; ssn: string },
): Promise<Uint8Array> {
  const r = calculateSaversCredit2026(raw), tax = r.source_input.finalized_tax;
  if (!r.file_form8880) throw Error("Form 8880 has no credit to attach");
  if (
    !filer.name.trim() ||
    filer.ssn.replaceAll("-", "") !== r.source_input.taxpayer_ssn ||
    destinations.form1040_line11a !== r.lines.line8 ||
    destinations.form1040_line18 !== tax.line18 ||
    destinations.schedule3_line4 !== r.lines.line12 ||
    ([
      "schedule3_line1",
      "schedule3_line2",
      "schedule3_line3",
      "schedule3_line6d",
      "schedule3_line6l",
    ] as const)
      .some((key) => destinations[key] !== tax[key])
  ) {
    throw Error(
      "Form 8880 PDF needs matching owner and calculated credit destinations",
    );
  }
  const bytes = await loadPinnedDraft2026(
    new URL("../../../../docs/ty2026/corpus/draft/f8880.pdf", import.meta.url),
    "https://www.irs.gov/pub/irs-dft/f8880--dft.pdf",
    "97a6b5b3df449310dbfb1f9574edb06dd2009f1b04d86261bb1c88fc087c9e01",
  );
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true }),
    form = doc.getForm();
  if (
    doc.getPageCount() !== 3 || form.getFields().length !== 23 ||
    form.getFields().some((f) => f.acroField.getWidgets().length !== 1)
  ) {
    throw Error("Form 8880 template inventory changed");
  }
  const font = await doc.embedFont(StandardFonts.Helvetica);
  function fill(index: number, value: string | number, row?: number) {
    const field = form.getTextField(
      `topmostSubform[0].Page1[0].${
        row ? `Table_Ln1-6[0].BodyRow${row}[0].` : ""
      }f1_${index}[0]`,
    );
    const rect = field.acroField.getWidgets()[0].getRectangle(),
      text = String(value);
    const size = Math.min(
      9,
      9 * (rect.width - 4) / Math.max(1, font.widthOfTextAtSize(text, 9)),
    );
    if (size < 6) throw Error("Form 8880 text exceeds printable field");
    field.setFontSize(size);
    if (typeof value === "number") field.setAlignment(TextAlignment.Right);
    field.setText(text);
  }
  fill(1, filer.name);
  fill(2, filer.ssn);
  r.columns.forEach((column, col) => {
    for (const row of [1, 2, 3, 4, 5, 6] as const) {
      fill(1 + row * 2 + col, column[`line${row}`], row);
    }
  });
  fill(15, r.lines.line7);
  fill(16, r.lines.line8);
  // The template prints "0 ." outside the decimal field.
  fill(17, String(r.lines.line9).split(".")[1]);
  fill(18, r.lines.line10);
  fill(19, r.lines.line11);
  fill(20, r.lines.line12);
  form.updateFieldAppearances(font);
  form.flatten();
  doc.removePage(2); // Instructions and the retained workpaper are not return attachments.
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

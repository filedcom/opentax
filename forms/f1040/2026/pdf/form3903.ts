import {
  PDFDocument,
  PDFName,
  rgb,
  StandardFonts,
  TextAlignment,
} from "pdf-lib";
import {
  calculateMovingSources2026,
  type MovingSource2026,
} from "../inputs/moving-source.ts";
import { loadPinnedDraft2026 } from "./source.ts";

/** Static draft attachment: one page per move, excluding Schedule 1 storage-only claims. */
export async function buildForm3903PdfBytes2026(
  raw: MovingSource2026,
  destinations: {
    schedule1_line14: number;
    schedule1_storage_fees: boolean;
    f1040_line1h_moving_component: number;
  },
  filer: { name: string; ssn: string },
): Promise<Uint8Array> {
  const result = calculateMovingSources2026(raw);
  if (
    !filer.name.trim() ||
    filer.ssn.replaceAll("-", "") !== raw.taxpayer_ssn.replaceAll("-", "")
  ) throw new Error("Form 3903 PDF needs matching filer identity");
  if (
    destinations.schedule1_line14 !== result.schedule1Line14 ||
    destinations.schedule1_storage_fees !== result.schedule1StorageFees ||
    destinations.f1040_line1h_moving_component !== result.f1040Line1h
  ) {
    throw new Error(
      "Form 3903 PDF destinations disagree with calculated sources",
    );
  }
  const moves = result.moves.filter((m) => m.file_form3903);
  if (!moves.length) {
    throw new Error("Storage-only claims do not file Form 3903");
  }
  const bytes = await loadPinnedDraft2026(
    new URL("../../../../docs/ty2026/corpus/draft/f3903.pdf", import.meta.url),
    "https://www.irs.gov/pub/irs-dft/f3903--dft.pdf",
    "589d204b50c9962bf6c69acdf9b95981bb75a83fb9c4bca19e01d0e984b31a8d",
  );
  const doc = await PDFDocument.create();
  const footer = await doc.embedFont(StandardFonts.Helvetica);
  for (const move of moves) {
    const draft = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const form = draft.getForm();
    const prefix = "topmostSubform[0].Page1[0].";
    const expected = [
      "f1_1[0]",
      "f1_2[0]",
      "c1_1[0]",
      "f1_3[0]",
      "f1_4[0]",
      "f1_5[0]",
      "f1_6[0]",
      "c1_2[0]",
      "c1_2[1]",
      "f1_7[0]",
    ].map((n) => prefix + n);
    const fields = form.getFields();
    if (
      draft.getPageCount() !== 2 || fields.length !== expected.length ||
      fields.some((f) =>
        !expected.includes(f.getName()) || f.acroField.getWidgets().length !== 1
      )
    ) throw new Error("Form 3903 template field inventory changed");
    const font = await draft.embedFont(StandardFonts.Helvetica);
    const fill = (index: number, value: string | number) => {
      const field = form.getTextField(`${prefix}f1_${index}[0]`);
      const rect = field.acroField.getWidgets()[0].getRectangle();
      const text = String(value);
      const size = Math.min(
        9,
        9 * (rect.width - 4) / Math.max(1, font.widthOfTextAtSize(text, 9)),
      );
      if (size < 6) {
        throw new Error("Form 3903 text exceeds its printable field");
      }
      field.setFontSize(size);
      if (typeof value === "number") field.setAlignment(TextAlignment.Right);
      field.setText(text);
    };
    fill(1, filer.name);
    fill(2, filer.ssn);
    form.getCheckBox(`${prefix}c1_1[0]`).check();
    fill(3, move.lines.line1);
    fill(4, move.lines.line2);
    fill(5, move.lines.line3);
    fill(6, move.lines.line4);
    const hasDeduction = move.lines.line3 > move.lines.line4;
    form.getCheckBox(`${prefix}c1_2[${hasDeduction ? 1 : 0}]`).check();
    if (hasDeduction) fill(7, move.lines.line5);
    form.updateFieldAppearances(font);
    form.flatten();
    const [page] = await doc.copyPages(draft, [1]);
    doc.addPage(page);
    page.drawText("DRAFT - NOT FOR FILING", {
      x: 36,
      y: 12,
      font: footer,
      size: 8,
      color: rgb(0.4, 0.1, 0.1),
    });
    page.node.delete(PDFName.of("Annots"));
  }
  doc.catalog.delete(PDFName.of("AcroForm"));
  return doc.save({ updateFieldAppearances: false });
}

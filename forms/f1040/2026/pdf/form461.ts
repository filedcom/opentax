import {
  PDFDocument,
  PDFName,
  rgb,
  StandardFonts,
  TextAlignment,
} from "pdf-lib";
import {
  type BusinessLossSource2026,
  calculateBusinessLoss2026,
} from "../inputs/business-loss-source.ts";
import { loadPinnedDraft2026 } from "./source.ts";

/** Internal static draft component; full graph/attribution registration follows. */
export async function buildForm461PdfBytes2026(
  raw: BusinessLossSource2026,
  destinations: {
    schedule1_line3: number;
    form1040_line7a: number;
    schedule1_line4: number;
    schedule1_line15: number;
    schedule1_line8p: number;
    excess_loss_origin_2026: number;
  },
  filer: { name: string; ssn: string },
) {
  const r = calculateBusinessLoss2026(raw), d = destinations;
  if (
    !filer.name.trim() ||
    filer.ssn.replaceAll("-", "") !== r.source_input.taxpayer_ssn
  ) {
    throw new Error("Form 461 PDF needs matching filer identity");
  }
  if (
    Object.values(d).some((n) => !Number.isSafeInteger(n)) ||
    d.schedule1_line3 !== r.lines.line2 ||
    d.form1040_line7a !== r.lines.line3 ||
    d.schedule1_line4 !== r.lines.line4 ||
    d.schedule1_line15 !== -r.lines.line8 ||
    d.schedule1_line8p !== r.schedule1_line8p ||
    d.excess_loss_origin_2026 !== (r.carryforward?.amount ?? 0)
  ) {
    throw new Error(
      "Form 461 PDF destinations disagree with source-derived losses",
    );
  }
  if (!r.file_form461) throw new Error("These sources do not require Form 461");
  const bytes = await loadPinnedDraft2026(
    new URL("../../../../docs/ty2026/corpus/draft/f461.pdf", import.meta.url),
    "https://www.irs.gov/pub/irs-dft/f461--dft.pdf",
    "0acb9c3dd8b016a3458f60097733f3da0b5b460853d3e867fc2aa27c1bc8780b",
  );
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true }),
    form = doc.getForm();
  const key = (i: number) => `topmostSubform[0].Page1[0].f1_${i}[0]`;
  const expected = Array.from({ length: 18 }, (_, i) => key(i + 1));
  if (
    doc.getPageCount() !== 2 || form.getFields().length !== 18 ||
    form.getFields().some((f) =>
      !expected.includes(f.getName()) || f.acroField.getWidgets().length !== 1
    )
  ) {
    throw new Error("Form 461 template inventory changed");
  }
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fill = (i: number, value: string | number) => {
    const f = form.getTextField(key(i)),
      rect = f.acroField.getWidgets()[0].getRectangle();
    const text = typeof value === "number" && value < 0
      ? `(${Math.abs(value)})`
      : String(value);
    const size = Math.min(
      9,
      9 * (rect.width - 4) / Math.max(1, font.widthOfTextAtSize(text, 9)),
    );
    if (size < 6) throw new Error("Form 461 text exceeds its printable field");
    f.setFontSize(size);
    if (typeof value === "number") f.setAlignment(TextAlignment.Right);
    f.setText(text);
  };
  fill(1, filer.name);
  fill(2, filer.ssn);
  for (
    const line of [2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13, 14, 15, 16] as const
  ) {
    fill(line + 2, r.lines[`line${line}`]);
  }
  // Reserved lines 1 and 7 intentionally remain blank.
  form.updateFieldAppearances(font);
  form.flatten();
  doc.getPage(1).drawText("DRAFT - NOT FOR FILING", {
    x: 36,
    y: 12,
    size: 8,
    font,
    color: rgb(.4, .1, .1),
  });
  for (const p of doc.getPages()) p.node.delete(PDFName.of("Annots"));
  doc.catalog.delete(PDFName.of("AcroForm"));
  const out = await PDFDocument.create();
  const [page] = await out.copyPages(doc, [1]);
  out.addPage(page);
  out.catalog.delete(PDFName.of("AcroForm"));
  return out.save({ updateFieldAppearances: false });
}

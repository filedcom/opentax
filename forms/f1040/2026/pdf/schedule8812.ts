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

/** Source-reconciled static development attachment, sequence 47. */
export async function buildSchedule8812PdfBytes2026(
  raw: ChildCreditInput2026,
  destinations: {
    form1040_line11b: number;
    form1040_line18: number;
    form1040_line19: number;
    form1040_line28: number;
    qualifying_children: number;
    other_dependents: number;
    declines_actc: boolean;
  },
  filer: { name: string; ssn: string },
): Promise<Uint8Array> {
  const result = calculateChildCredit2026(raw);
  const lines = result.lines;
  if (!result.file_schedule8812 || !lines) {
    throw new Error("Schedule 8812 has no credit to attach");
  }
  if (!filer.name.trim() || !/^\d{3}-?\d{2}-?\d{4}$/.test(filer.ssn)) {
    throw new Error("Schedule 8812 PDF needs filer identity");
  }
  if (
    lines.line1 !== destinations.form1040_line11b ||
    lines.line18Tax !== destinations.form1040_line18 ||
    lines.line14 !== destinations.form1040_line19 ||
    lines.line27 !== destinations.form1040_line28 ||
    lines.line4 !== destinations.qualifying_children ||
    lines.line6 !== destinations.other_dependents ||
    result.do_not_claim_actc !== destinations.declines_actc
  ) {
    throw new Error(
      "Schedule 8812 PDF destinations disagree with calculated sources",
    );
  }
  const bytes = await loadPinnedDraft2026(
    new URL(
      "../../../../docs/ty2026/corpus/draft/f1040s8.pdf",
      import.meta.url,
    ),
    "https://www.irs.gov/pub/irs-dft/f1040s8--dft.pdf",
    "0638b2863bdaeadfd3fccee12a9145bf92a442d8de156584c5602cc7e3881422",
  );
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const form = doc.getForm();
  if (doc.getPageCount() !== 2 || form.getFields().length !== 41) {
    throw new Error("Schedule 8812 template field inventory changed");
  }
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const root = (page: number) => `topmostSubform[0].Page${page}[0].`;
  const fill = (page: number, index: number, value: string | number) => {
    const field = form.getTextField(
      `${root(page)}${
        page === 1 && index === 11 ? "Line6ReadOrder[0]." : ""
      }f${page}_${index}[0]`,
    );
    const rect = field.acroField.getWidgets()[0].getRectangle();
    const text = String(value);
    const size = Math.min(
      9,
      9 * (rect.width - 4) / Math.max(1, font.widthOfTextAtSize(text, 9)),
    );
    if (size < 6) {
      throw new Error("Schedule 8812 text exceeds its printable field");
    }
    field.setFontSize(size);
    if (typeof value === "number") field.setAlignment(TextAlignment.Right);
    field.setText(text);
  };
  const check = (page: number, name: string) =>
    form.getCheckBox(`${root(page)}${name}`).check();
  fill(1, 1, filer.name);
  fill(1, 2, filer.ssn);
  [
    lines.line1,
    lines.line2a,
    lines.line2b,
    lines.line2c,
    lines.line2d,
    lines.line3,
    lines.line4,
    lines.line5,
    lines.line6,
    lines.line7,
    lines.line8,
    lines.line9,
    lines.line10,
    lines.line11,
    lines.line12,
    lines.line13,
    lines.line14,
  ].forEach((value, i) => fill(1, i + 3, value));
  check(1, "c1_1[1]");
  // Reserved line 15 stays blank. The pinned 2026 Form 1040 has no ACTC
  // opt-out checkbox; its c2_14 is the unrelated Form 8888 refund checkbox.
  if (!result.do_not_claim_actc) {
    fill(2, 2, lines.line16a);
    if (lines.line16a > 0) {
      fill(2, 3, lines.line4);
      fill(2, 4, lines.line16b);
      if (lines.line16b > 0) {
        fill(2, 5, lines.line17);
        fill(2, 6, lines.line18a);
        fill(2, 7, lines.line18b);
        check(2, lines.line18a > 2500 ? "c2_1[1]" : "c2_1[0]");
        if (lines.line18a > 2500) fill(2, 8, lines.line19);
        fill(2, 9, lines.line20);
        check(2, lines.line16b >= 5100 ? "c2_2[1]" : "c2_2[0]");
        if (lines.partIIBLines) {
          [
            lines.partIIBLines.line21,
            lines.partIIBLines.line22,
            lines.partIIBLines.line23,
            lines.partIIBLines.line24,
            lines.partIIBLines.line25,
            lines.partIIBLines.line26,
          ].forEach((value, i) => fill(2, i + 10, value));
        }
        fill(2, 16, lines.line27);
      }
    }
  }
  form.updateFieldAppearances(font);
  form.flatten();
  for (const page of doc.getPages()) {
    page.drawText("DRAFT - NOT FOR FILING", {
      x: 36,
      y: 12,
      size: 8,
      font,
      color: rgb(.4, .1, .1),
    });
    page.node.delete(PDFName.of("Annots"));
  }
  doc.catalog.delete(PDFName.of("AcroForm"));
  return doc.save({ updateFieldAppearances: false });
}

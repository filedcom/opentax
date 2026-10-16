import {
  PDFDocument,
  PDFName,
  rgb,
  StandardFonts,
  TextAlignment,
} from "pdf-lib";
import {
  calculateScheduleR2026,
  type ScheduleRSource2026,
} from "../inputs/schedule-r-source.ts";
import { loadPinnedDraft2026 } from "./source.ts";

/** Replay the reviewed sources and print the two static Schedule R pages. */
export async function buildScheduleRPdfBytes2026(
  raw: ScheduleRSource2026,
  destinations: {
    form1040_line11b: number;
    form1040_line18: number;
    schedule3_line2: number;
    schedule3_line6d: number;
  },
  filer: { name: string; ssn: string },
) {
  const r = calculateScheduleR2026(raw), lines = r.lines;
  if (!r.file_schedule_r || !lines || !r.box) {
    throw Error("Schedule R has no credit to attach");
  }
  if (
    !filer.name.trim() ||
    filer.ssn.replaceAll("-", "") !== r.source_input.taxpayer_ssn
  ) throw Error("Schedule R needs matching filer identity");
  if (
    raw.agi !== destinations.form1040_line11b ||
    raw.regular_tax + raw.schedule2_part1_tax !==
      destinations.form1040_line18 ||
    raw.finalized_dependent_care_credit !== destinations.schedule3_line2 ||
    lines.line22 !== destinations.schedule3_line6d
  ) throw Error("Schedule R draft destinations disagree with reviewed sources");
  const bytes = await loadPinnedDraft2026(
    new URL(
      "../../../../docs/ty2026/corpus/draft/f1040sr.pdf",
      import.meta.url,
    ),
    "https://www.irs.gov/pub/irs-dft/f1040sr--dft.pdf",
    "0fcbd9fe296b470b2a0ceadc497380159f7d872f7aa11d86ae856bbd2234f5b6",
  );
  const doc = await PDFDocument.load(bytes),
    form = doc.getForm(),
    font = await doc.embedFont(StandardFonts.Helvetica);
  if (doc.getPageCount() !== 3 || form.getFields().length !== 27) {
    throw Error("Schedule R draft inventory changed");
  }
  const fill = (page: number, n: number, value: string | number) => {
    const field = form.getTextField(
        `topmostSubform[0].Page${page}[0].f${page}_${n}[0]`,
      ),
      text = String(value);
    const width = field.acroField.getWidgets()[0].getRectangle().width - 4;
    const size = Math.min(
      9,
      width * 9 / Math.max(1, font.widthOfTextAtSize(text, 9)),
    );
    if (size < 6) throw Error("Schedule R value exceeds its printable field");
    field.setFontSize(size);
    if (typeof value === "number") field.setAlignment(TextAlignment.Right);
    field.setText(text);
  };
  fill(1, 1, filer.name);
  fill(1, 2, filer.ssn);
  const b = r.box,
    group = b < 3 ? "" : b < 8 ? "Married[0]." : "MarriedSeparate[0].";
  const index = b < 3 ? b - 1 : b < 8 ? b - 3 : b - 8;
  form.getCheckBox(`topmostSubform[0].Page1[0].${group}c1_1[${index}]`).check();
  if (r.prior_statement_names.length) {
    form.getCheckBox("topmostSubform[0].Page1[0].c1_2[0]").check();
  }
  const values = [
    lines.line10,
    [2, 4, 5, 6, 9].includes(b) ? lines.line11 : undefined,
    lines.line12,
    lines.line13a || undefined,
    lines.line13b || undefined,
    lines.line13c,
    lines.line14,
    lines.line15,
    lines.line16,
    lines.line17,
    lines.line18,
    lines.line19,
    lines.line20,
    lines.line21,
    lines.line22,
  ];
  values.forEach((v, i) => {
    if (v !== undefined) fill(2, i + 1, v);
  });
  form.updateFieldAppearances(font);
  form.flatten();
  const out = await PDFDocument.create();
  for (const p of await out.copyPages(doc, [1, 2])) {
    p.node.delete(PDFName.of("Annots"));
    out.addPage(p);
  }
  const footer = await out.embedFont(StandardFonts.Helvetica);
  if ([4, 5, 6].includes(b) && r.prior_statement_names.length) {
    const text = r.prior_statement_names.join(" & ");
    const size = Math.min(
      8,
      170 * 8 / Math.max(1, footer.widthOfTextAtSize(text, 8)),
    );
    if (size < 6) {
      throw Error("Schedule R prior-statement names exceed available space");
    }
    out.getPage(0).drawText(text, { x: 375, y: 159, size, font: footer });
  }
  for (const page of out.getPages()) {
    page.drawText("DRAFT - NOT FOR FILING", {
      x: 36,
      y: 2,
      size: 8,
      font: footer,
      color: rgb(.4, .1, .1),
    });
    page.drawText("INCOMPLETE 2026 IMPLEMENTATION", {
      x: 350,
      y: 2,
      size: 8,
      font: footer,
      color: rgb(.4, .1, .1),
    });
    page.node.delete(PDFName.of("Annots"));
  }
  out.catalog.delete(PDFName.of("AcroForm"));
  return out.save({ updateFieldAppearances: false });
}

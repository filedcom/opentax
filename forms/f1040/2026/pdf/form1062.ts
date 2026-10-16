import {
  PDFDocument,
  PDFName,
  rgb,
  StandardFonts,
  TextAlignment,
} from "pdf-lib";
import type { SourceDocumentBytes } from "../../../../core/runtime/source-documents.ts";
import {
  calculateForm1062Tax2026,
  type Form1062TaxSource2026,
} from "../inputs/form1062-tax.ts";
import { buildForm1062Schedules2026 } from "./form1062-schedule-a.ts";
import { loadPinnedDraft2026 } from "./source.ts";

/** Internal draft component: main form + Schedule A components + original covenants. */
export async function buildForm1062Draft2026(
  raw: Form1062TaxSource2026,
  documents: readonly SourceDocumentBytes[],
  destinations: { schedule3_line13e: number; form1040_line24b: number },
  filer: { name: string; ssn: string },
) {
  const calculation = calculateForm1062Tax2026(raw);
  if (
    destinations.schedule3_line13e !== calculation.lines.line14 ||
    destinations.form1040_line24b !== calculation.lines.line15
  ) {
    throw new Error(
      "Form 1062 PDF destinations disagree with recomputed tax and installment",
    );
  }
  // The main election draft cannot be generated without the exact Schedule A
  // covenant copies; signed originals remain separate and byte-identical.
  const attachments = await buildForm1062Schedules2026(
    calculation.qualification.source_input.land,
    calculation.source_input.election,
    documents,
    filer,
  );
  const bytes = await loadPinnedDraft2026(
    new URL("../../../../docs/ty2026/corpus/draft/f1062.pdf", import.meta.url),
    "https://www.irs.gov/pub/irs-dft/f1062--dft.pdf",
    "c0fd780deeeced1dabbc2298ebcedbf2ebdd44261c5afe33b5fca7b28ffc4165",
  );
  const doc = await PDFDocument.load(bytes), form = doc.getForm();
  const key = (i: number) => `topmostSubform[0].Page1[0].f1_${i}[0]`;
  const expected = Array.from({ length: 26 }, (_, i) => key(i + 1));
  if (
    doc.getPageCount() !== 2 || form.getFields().length !== 26 ||
    form.getFields().some((f) =>
      !expected.includes(f.getName()) || f.acroField.getWidgets().length !== 1
    )
  ) {
    throw new Error("Form 1062 template inventory changed");
  }
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fill = (i: number, value: string | number) => {
    const field = form.getTextField(key(i)),
      rect = field.acroField.getWidgets()[0].getRectangle();
    const text = typeof value === "number" && value < 0
      ? `(${Math.abs(value)})`
      : String(value);
    const size = Math.min(
      9,
      9 * (rect.width - 4) / Math.max(1, font.widthOfTextAtSize(text, 9)),
    );
    if (size < 6) throw new Error("Form 1062 text exceeds its printable field");
    field.setFontSize(size);
    if (typeof value === "number") field.setAlignment(TextAlignment.Right);
    field.setText(text);
  };
  fill(1, filer.name);
  fill(2, filer.ssn);
  fill(3, calculation.qualification.schedule_count);
  const lines = [
    "line1",
    "line2",
    "line3",
    "line4a",
    "line4b",
    "line4c",
    "line4d",
    "line4z",
    "line5",
    "line6",
    "line7",
    "line8",
    "line9",
    "line10",
    "line11",
    "line12a",
    "line12b",
    "line12c",
    "line12d",
    "line12z",
    "line13",
    "line14",
    "line15",
  ] as const;
  lines.forEach((line, i) => fill(i + 4, calculation.lines[line]));
  form.updateFieldAppearances(font);
  form.flatten();
  doc.catalog.delete(PDFName.of("AcroForm"));
  for (const page of doc.getPages()) page.node.delete(PDFName.of("Annots"));
  doc.getPage(1).drawText(
    "DRAFT - NOT FOR FILING / INCOMPLETE 2026 IMPLEMENTATION",
    {
      x: 36,
      y: 18,
      size: 8,
      font,
      color: rgb(.65, .1, .1),
    },
  );
  const out = await PDFDocument.create();
  const [page] = await out.copyPages(doc, [1]);
  out.addPage(page);
  out.catalog.delete(PDFName.of("AcroForm"));
  return {
    calculation,
    bytes: await out.save(),
    attachment_sequence: 106 as const,
    schedule_a_attachment_sequence: "106A" as const,
    schedules: attachments.schedules,
    covenants: attachments.covenants,
    filing_ready: false as const,
  };
}

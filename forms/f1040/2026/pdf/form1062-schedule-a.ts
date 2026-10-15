import {
  PDFDocument,
  PDFName,
  rgb,
  StandardFonts,
  TextAlignment,
} from "pdf-lib";
import type { SourceDocumentBytes } from "../../../../core/runtime/source-documents.ts";
import { Form1062Covenants2026 } from "../inputs/form1062-documents.ts";
import {
  type Form1062Election2026,
  resolveForm1062Sources2026,
} from "../inputs/form1062-source.ts";
import type { LandDispositionSource2026 } from "../inputs/land-disposition-source.ts";
import { loadPinnedDraft2026 } from "./source.ts";

/** Covenant originals remain byte-for-byte separate, preserving any signatures. */
export async function buildForm1062Schedules2026(
  land: LandDispositionSource2026,
  election: Form1062Election2026,
  documents: readonly SourceDocumentBytes[],
  filer: { name: string; ssn: string },
) {
  const calculation = resolveForm1062Sources2026(land, election);
  if (
    !filer.name.trim() ||
    filer.ssn.replaceAll("-", "") !== calculation.source_input.land.taxpayer_ssn
  ) {
    throw new Error("Form 1062 Schedule A needs matching filer identity");
  }
  const verified = await Form1062Covenants2026.verify(
    calculation.covenant_claims,
    documents,
  );
  const covenants = verified.originals();
  const template = await loadPinnedDraft2026(
    new URL(
      "../../../../docs/ty2026/corpus/continuous/f1062sa.pdf",
      import.meta.url,
    ),
    "https://www.irs.gov/pub/irs-pdf/f1062sa.pdf",
    "dc50ba9b52db27a01492962b7349b71070812956c56feff376928dcd17a4953d",
  );
  const schedules = [];
  const prefix = "topmostSubform[0].Page1[0].";
  for (const schedule of calculation.schedules) {
    const doc = await PDFDocument.load(template), form = doc.getForm();
    const textKey = (i: number) => `${prefix}f1_${i}[0]`;
    const boxKey = (i: number, answer = 0) => `${prefix}c1_${i}[${answer}]`;
    const expected = [
      ...Array.from({ length: 11 }, (_, i) => textKey(i + 1)),
      ...Array.from({ length: 6 }, (_, i) => boxKey(i + 1)),
      ...Array.from({ length: 5 }, (_, i) => [boxKey(i + 7), boxKey(i + 7, 1)])
        .flat(),
    ];
    if (
      doc.getPageCount() !== 1 || form.getFields().length !== 27 ||
      form.getFields().some((f) =>
        !expected.includes(f.getName()) || f.acroField.getWidgets().length !== 1
      )
    ) {
      throw new Error("Form 1062 Schedule A template inventory changed");
    }
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const size = (index: number, value: string) =>
      Math.min(
        9,
        9 *
          (form.getTextField(textKey(index)).acroField.getWidgets()[0]
            .getRectangle().width - 4) /
          Math.max(1, font.widthOfTextAtSize(value, 9)),
      );
    const fill = (index: number, value: string | number) => {
      const field = form.getTextField(textKey(index)),
        str = String(value),
        fontSize = size(index, str);
      if (fontSize < 6) {
        throw new Error(
          "Form 1062 Schedule A text exceeds its printable field",
        );
      }
      field.setFontSize(fontSize);
      if (typeof value === "number") field.setAlignment(TextAlignment.Right);
      field.setText(str);
    };
    fill(1, filer.name);
    fill(2, filer.ssn);
    const description = schedule.sale.source.description;
    const continuation = size(5, description) < 6;
    fill(5, continuation ? "See attached property description" : description);
    const [year, month, day] = schedule.sale.source.closing.settled_on.split(
      "-",
    );
    fill(6, `${month}/${day}/${year}`);
    // The continuous-use template prints MM/DD/YYYY beneath its date widget.
    // Clear that placeholder before flattening the actual date appearance.
    doc.getPage(0).drawRectangle({
      ...form.getTextField(textKey(6)).acroField.getWidgets()[0].getRectangle(),
      color: rgb(1, 1, 1),
    });
    form.getCheckBox(boxKey(6)).check(); // Direct sale, not exchange or installment.
    for (let i = 7; i <= 11; i++) form.getCheckBox(boxKey(i)).check();
    Object.values(schedule.lines).forEach((value, i) => fill(i + 7, value));
    form.updateFieldAppearances(font);
    form.flatten();
    doc.catalog.delete(PDFName.of("AcroForm"));
    for (const p of doc.getPages()) p.node.delete(PDFName.of("Annots"));
    if (continuation) {
      const text =
        `Sale: ${schedule.sale.source.sale_reference}\nProperty: ${schedule.sale.source.property_reference}\n${description}`;
      let page = doc.addPage([612, 792]), y = 710;
      const header = () => {
        page.drawText("Schedule A (Form 1062) - property description", {
          x: 36,
          y: 750,
          font,
          size: 12,
        });
        page.drawText(`${filer.name} / ${filer.ssn}`, {
          x: 36,
          y: 732,
          font,
          size: 9,
        });
      };
      header();
      const printLine = (line: string) => {
        if (y < 50) {
          page = doc.addPage([612, 792]);
          y = 710;
          header();
        }
        page.drawText(line, { x: 36, y, font, size: 10 });
        y -= 14;
      };
      // Split oversized tokens too; property/legal references can lack spaces.
      for (const paragraph of text.split("\n")) {
        let line = "";
        for (const word of paragraph.split(" ")) {
          if (line && font.widthOfTextAtSize(`${line} ${word}`, 10) > 540) {
            printLine(line);
            line = "";
          }
          if (font.widthOfTextAtSize(word, 10) > 540) {
            for (const char of word) {
              if (font.widthOfTextAtSize(line + char, 10) > 540) {
                printLine(line);
                line = "";
              }
              line += char;
            }
          } else line += `${line ? " " : ""}${word}`;
        }
        printLine(line);
        y -= 4;
      }
    }
    for (const page of doc.getPages()) {
      page.node.delete(PDFName.of("Annots"));
      page.drawText("DRAFT - NOT FOR FILING", {
        x: 36,
        y: 16,
        size: 8,
        font,
        color: rgb(.65, .1, .1),
      });
      page.drawText("INCOMPLETE 2026 IMPLEMENTATION", {
        x: 350,
        y: 16,
        size: 8,
        font,
        color: rgb(.65, .1, .1),
      });
    }
    schedules.push({
      sale_reference: schedule.sale.source.sale_reference,
      covenant_reference: schedule.election.covenant.document_reference,
      bytes: await doc.save(),
      official_pages: 1,
    });
  }
  return { calculation, schedules, covenants, filing_ready: false as const };
}

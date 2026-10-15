import {
  PDFDocument,
  PDFName,
  rgb,
  StandardFonts,
  TextAlignment,
} from "pdf-lib";
import {
  calculateEducationCredit2026,
  type EducationInput2026,
} from "../nodes/f8863.ts";
import { loadPinnedDraft2026 } from "./source.ts";

/** Source-reconciled development attachment, sequence 50; never for filing. */
export async function buildForm8863PdfBytes2026(
  raw: EducationInput2026,
  destinations: {
    form1040_line11b: number;
    form1040_line18: number;
    form1040_line29: number;
    schedule3_line2: number;
    schedule3_line3: number;
  },
  filer: { name: string; ssn: string },
): Promise<Uint8Array> {
  const result = calculateEducationCredit2026(raw), lines = result.lines;
  if (!result.file_form8863 || !lines) {
    throw new Error("Form 8863 has no credit to attach");
  }
  if (!filer.name.trim() || !/^\d{3}-?\d{2}-?\d{4}$/.test(filer.ssn)) {
    throw new Error("Form 8863 PDF needs filer identity");
  }
  if (
    raw.agi !== destinations.form1040_line11b ||
    raw.regular_tax + raw.schedule2_part1_tax !==
      destinations.form1040_line18 ||
    raw.finalized_dependent_care_credit !== destinations.schedule3_line2 ||
    lines.line8 !== destinations.form1040_line29 ||
    lines.line19 !== destinations.schedule3_line3
  ) {
    throw new Error(
      "Form 8863 PDF destinations disagree with calculated sources",
    );
  }
  const template = await loadPinnedDraft2026(
    new URL("../../../../docs/ty2026/corpus/draft/f8863.pdf", import.meta.url),
    "https://www.irs.gov/pub/irs-dft/f8863--dft.pdf",
    "b037225d76b74a73740398c3ea757d2cde892d4fc1cfe65da35659de8bbddd90",
  );
  const output = await PDFDocument.create();
  async function page(
    part: 1 | 2,
    student?: typeof result.students[number],
    offset = 0,
  ) {
    const doc = await PDFDocument.load(template, { ignoreEncryption: true }),
      form = doc.getForm();
    if (doc.getPageCount() !== 3 || form.getFields().length !== 77) {
      throw new Error("Form 8863 template field inventory changed");
    }
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const fieldName = (leaf: string) => {
      const names = form.getFields().map((f) => f.getName()).filter((n) =>
        n.endsWith(`.${leaf}`)
      );
      if (names.length !== 1) {
        throw new Error(`Form 8863 field mapping changed: ${leaf}`);
      }
      return names[0];
    };
    const fill = (index: number, value: string | number) => {
      const f = form.getTextField(fieldName(`f${part}_${index}[0]`));
      const rect = f.acroField.getWidgets()[0].getRectangle(),
        text = String(value);
      const size = Math.min(
        9,
        9 * (rect.width - 3) / Math.max(1, font.widthOfTextAtSize(text, 9)),
      );
      if (size < 6) {
        throw new Error("Form 8863 text exceeds its printable field");
      }
      f.setFontSize(size);
      if (typeof value === "number") f.setAlignment(TextAlignment.Right);
      f.setText(text);
    };
    const check = (index: number, yes: boolean) =>
      form.getCheckBox(fieldName(`c${part}_${index}[${yes ? 0 : 1}]`)).check();
    const ssn = (first: number, value: string) => {
      const digits = value.replaceAll("-", "");
      [digits.slice(0, 3), digits.slice(3, 5), digits.slice(5)].forEach((
        v,
        i,
      ) => fill(first + i, v));
    };
    fill(1, filer.name);
    ssn(2, filer.ssn);
    if (part === 1) {
      [lines!.line1, lines!.line2, lines!.line3, lines!.line4, lines!.line5]
        .forEach((v, i) => fill(i + 5, v));
      const ratio = (index: number, value: number) => {
        const [whole, fraction] = value.toFixed(3).split(".");
        fill(index, whole);
        fill(index + 1, fraction);
      };
      ratio(10, lines!.line6);
      [
        lines!.line7,
        lines!.line8,
        lines!.line9,
        lines!.line10,
        lines!.line11,
        lines!.line12,
        lines!.line13,
        lines!.line14,
        lines!.line15,
        lines!.line16,
      ].forEach((v, i) => {
        if (
          (i !== 1 || !result.under24_nonrefundable) &&
          (i < 4 || lines!.line10 > 0)
        ) fill(i + 12, v);
      });
      if (lines!.line10 > 0) ratio(22, lines!.line17);
      fill(24, lines!.line18);
      fill(25, lines!.line19);
      if (result.under24_nonrefundable) {
        form.getCheckBox(fieldName("c1_1[0]")).check();
      }
    } else if (student) {
      fill(5, student.name);
      ssn(6, student.student_tin);
      student.schools.slice(offset, offset + 2).forEach((s, i) => {
        const start = i === 0 ? 9 : 20;
        fill(start, s.name);
        const a = s.address;
        fill(
          start + 1,
          [a.line1, a.line2, `${a.city}, ${a.state} ${a.zip}`].filter(Boolean)
            .join(", "),
        );
        check(i * 2 + 1, s.current_1098t_received);
        check(i * 2 + 2, s.prior_1098t_box7);
        // Institution EIN boxes are required for AOTC and optional for LLC.
        if (s.ein) {
          [...s.ein.replaceAll("-", "")].forEach((d, j) =>
            fill(start + 2 + j, d)
          );
        }
      });
      // Additional school pages stop at line 22; never duplicate student expenses.
      if (offset === 0) {
        if (student.aotc_lines) {
          check(5, false);
          check(6, true);
          check(7, false);
          check(8, false);
          [
            student.aotc_lines.line27,
            student.aotc_lines.line28,
            student.aotc_lines.line29,
            student.aotc_lines.line30,
          ].forEach((v, i) => fill(i + 31, v));
        } else fill(35, student.adjusted_expenses);
      }
    }
    form.updateFieldAppearances(font);
    form.flatten();
    const selected = doc.getPage(part);
    selected.drawText("DRAFT - NOT FOR FILING", {
      x: 36,
      y: 12,
      size: 8,
      font,
      color: rgb(.4, .1, .1),
    });
    for (const p of doc.getPages()) p.node.delete(PDFName.of("Annots"));
    doc.catalog.delete(PDFName.of("AcroForm"));
    const [copied] = await output.copyPages(doc, [part]);
    output.addPage(copied);
  }
  await page(1);
  for (const student of result.students) {
    for (let offset = 0; offset < student.schools.length; offset += 2) {
      await page(2, student, offset);
    }
  }
  output.catalog.delete(PDFName.of("AcroForm"));
  return output.save({ updateFieldAppearances: false });
}

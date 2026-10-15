import {
  PDFDocument,
  PDFName,
  rgb,
  StandardFonts,
  TextAlignment,
} from "pdf-lib";
import type { z } from "zod";
import { inputSchema, schedule1_2026 } from "../nodes/schedule1.ts";
import { loadPinnedDraft2026 } from "./source.ts";

export type Schedule1Input2026 = z.input<typeof inputSchema>;
const prefix = (page: number) => `topmostSubform[0].Page${page}[0].`;
function key(page: number, index: number) {
  const nested = page === 1
    ? ({
      11: "Line7_ReadOrder",
      13: "Line8a_ReadOrder",
      35: "Line8z_ReadOrder",
    } as Record<number, string>)[index]
    : ({
      10: "Line19b_CombField",
      16: "Line24_ReadOrder",
      27: "Line24z_ReadOrder",
    } as Record<number, string>)[index];
  return `${prefix(page)}${nested ? `${nested}[0].` : ""}f${page}_${
    String(index).padStart(2, "0")
  }[0]`;
}
function checkbox(page: number, index: number) {
  return `${prefix(page)}${
    page === 1 && index === 3 ? "Line7_ReadOrder[0]." : ""
  }c${page}_${index}[0]`;
}

/** Draft print component for the current Schedule 1 sink, not a public income input. */
export async function buildSchedule1PdfBytes2026(
  raw: Schedule1Input2026,
  destinations: { form1040_line8: number; form1040_line10: number },
  filer: { name: string; ssn: string },
): Promise<Uint8Array> {
  const source = inputSchema.parse(raw);
  const calculated =
    schedule1_2026.compute({ taxYear: 2026, formType: "f1040" }, source)
      .outputs[0];
  if (!calculated) {
    throw new Error("This calculation does not require Schedule 1 attachment");
  }
  const fields = calculated.fields;
  if (!filer.name.trim() || !/^\d{3}-?\d{2}-?\d{4}$/.test(filer.ssn)) {
    throw new Error("Schedule 1 PDF needs filer identity");
  }
  if (
    destinations.form1040_line8 !== fields.line10_total_additional_income ||
    destinations.form1040_line10 !== fields.line26_total_adjustments
  ) {
    throw new Error(
      "Schedule 1 PDF destinations disagree with calculated sources",
    );
  }
  if (
    (source.line2a_alimony_received ?? 0) !== 0 &&
    !source.line2b_alimony_agreement_date
  ) {
    throw new Error(
      "Schedule 1 alimony printing needs the original agreement date",
    );
  }
  if (
    (source.line4_other_gains ?? 0) !== 0 &&
    (source.line4_from_form4797 === undefined ||
      source.line4_from_form4684 === undefined)
  ) throw new Error("Schedule 1 other gains need both source-form answers");
  if (
    (source.line20_ira_deduction ?? 0) !== 0 &&
    source.line20_mfs_lived_apart_all_year === undefined
  ) throw new Error("Schedule 1 IRA printing needs the MFS lived-apart answer");
  const bytes = await loadPinnedDraft2026(
    new URL(
      "../../../../docs/ty2026/corpus/draft/f1040s1.pdf",
      import.meta.url,
    ),
    "https://www.irs.gov/pub/irs-dft/f1040s1--dft.pdf",
    "a017a1b717d1c70ff8d831ef8b73c730e5b24f147c394c37f792035a9df22fad",
  );
  const draft = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const form = draft.getForm();
  const expected = [
    ...Array.from({ length: 38 }, (_, i) => key(1, i + 1)),
    ...Array.from({ length: 30 }, (_, i) => key(2, i + 1)),
    ...[1, 2, 3].map((i) => checkbox(1, i)),
    ...[1, 2].map((i) => checkbox(2, i)),
  ];
  if (
    draft.getPageCount() !== 3 || form.getFields().length !== 73 ||
    form.getFields().some((f) =>
      !expected.includes(f.getName()) || f.acroField.getWidgets().length !== 1
    )
  ) throw new Error("Schedule 1 template field inventory changed");
  const font = await draft.embedFont(StandardFonts.Helvetica);
  const fit = (text: string, width: number) => {
    const size = Math.min(
      9,
      9 * width / Math.max(1, font.widthOfTextAtSize(text, 9)),
    );
    if (size < 6) {
      throw new Error("Schedule 1 text exceeds its printable field");
    }
    return size;
  };
  const fill = (page: number, index: number, value: string | number) => {
    const field = form.getTextField(key(page, index));
    // Lines 8a/8d already have printed parentheses on the IRS form.
    const text = typeof value === "number" && value < 0
      ? (page === 1 && [13, 16].includes(index)
        ? String(-value)
        : `(${-value})`)
      : String(value);
    field.setFontSize(
      fit(text, field.acroField.getWidgets()[0].getRectangle().width - 4),
    );
    if (typeof value === "number") field.setAlignment(TextAlignment.Right);
    field.setText(text);
  };
  fill(1, 1, filer.name);
  fill(1, 2, filer.ssn);
  const mapping: Record<string, [number, number]> = {
    line1_state_refund: [1, 4],
    line2a_alimony_received: [1, 5],
    line3_schedule_c: [1, 7],
    line4_other_gains: [1, 8],
    line5_schedule_e: [1, 9],
    line6_schedule_f: [1, 10],
    line7_repaid: [1, 11],
    line7_unemployment: [1, 12],
    line8a_nol_deduction: [1, 13],
    line8c_cod_income: [1, 15],
    line8d_foreign_earned_income_exclusion: [1, 16],
    line8e_archer_msa_dist: [1, 17],
    line8i_prizes_awards: [1, 21],
    line8p_excess_business_loss: [1, 28],
    line8z_total: [1, 36],
    line9_total_other_income: [1, 37],
    line10_total_additional_income: [1, 38],
    line11_educator_expenses: [2, 1],
    line12_business_expenses: [2, 2],
    line13_hsa_deduction: [2, 3],
    line14_moving_expenses: [2, 4],
    line15_se_deduction: [2, 5],
    line16_sep_simple: [2, 6],
    line17_se_health_insurance: [2, 7],
    line18_early_withdrawal: [2, 8],
    line20_ira_deduction: [2, 12],
    line21_student_loan_interest: [2, 13],
    line23_archer_msa_deduction: [2, 15],
    line24f_501c18d: [2, 21],
    line25_total_other_adjustments: [2, 29],
    line26_total_adjustments: [2, 30],
  };
  for (const [line, [page, index]] of Object.entries(mapping)) {
    const value = (fields as Record<string, unknown>)[line];
    if (value === undefined) continue;
    if (typeof value !== "number" || !Number.isSafeInteger(value)) {
      throw new Error(`Schedule 1 has an invalid printed amount: ${line}`);
    }
    if (
      value !== 0 ||
      ["line10_total_additional_income", "line26_total_adjustments"].includes(
        line,
      )
    ) fill(page, index, value);
  }
  if (source.line2b_alimony_agreement_date) {
    fill(1, 6, source.line2b_alimony_agreement_date);
  }
  if (source.line4_from_form4797) form.getCheckBox(checkbox(1, 1)).check();
  if (source.line4_from_form4684) form.getCheckBox(checkbox(1, 2)).check();
  if ((fields.line7_repaid ?? 0) > 0) form.getCheckBox(checkbox(1, 3)).check();
  if (source.line14_storage_fees) form.getCheckBox(checkbox(2, 1)).check();
  if (source.line20_mfs_lived_apart_all_year) {
    form.getCheckBox(checkbox(2, 2)).check();
  }
  // One overlong type also needs a statement; never shrink it below readable size.
  const description = fields.line8z_print_description?.replace(/\s+/g, " ")
    .trim();
  let statement = fields.line8z_statement_rows;
  if (
    description && !statement && font.widthOfTextAtSize(description, 6) > 300
  ) statement = [{ description, amount: fields.line8z_total }];
  if (description) {
    fill(1, 35, statement ? "See attached statement" : description);
  }
  form.updateFieldAppearances(font);
  form.flatten();
  const doc = await PDFDocument.create();
  for (const page of await doc.copyPages(draft, [1, 2])) doc.addPage(page);
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  if (statement) {
    if (
      statement.reduce((total, row) => total + row.amount, 0) !==
        fields.line8z_total
    ) throw new Error("Schedule 1 other-income statement does not reconcile");
    const wrap = (value: string): string[] => {
      const lines: string[] = [];
      let line = "";
      for (const word of value.trim().split(/\s+/)) {
        if (line && regular.widthOfTextAtSize(`${line} ${word}`, 9) > 420) {
          lines.push(line);
          line = "";
        }
        if (line) line += " ";
        for (const char of word) {
          if (regular.widthOfTextAtSize(line + char, 9) > 420) {
            lines.push(line);
            line = "";
          }
          line += char;
        }
      }
      if (line) lines.push(line);
      return lines;
    };
    const newPage = () => {
      const page = doc.addPage([612, 792]);
      page.drawText("Schedule 1 (Form 1040) 2026 - Line 8z Other Income", {
        x: 36,
        y: 748,
        size: 11,
        font: regular,
      });
      page.drawText(filer.name, {
        x: 36,
        y: 726,
        size: fit(filer.name, 540),
        font: regular,
      });
      page.drawText(`SSN: ${filer.ssn}`, {
        x: 36,
        y: 710,
        size: 9,
        font: regular,
      });
      page.drawText(
        `Total included on Schedule 1 line 8z: ${fields.line8z_total}`,
        { x: 36, y: 64, size: 9, font: regular },
      );
      return page;
    };
    let page = newPage();
    let y = 678;
    for (const row of statement) {
      const lines = wrap(row.description);
      for (let i = 0; i < lines.length; i++) {
        if (y < 100) {
          page = newPage();
          y = 678;
        }
        page.drawText(lines[i], { x: 36, y, size: 9, font: regular });
        if (i === 0) {
          const value = row.amount < 0
            ? `(${-row.amount})`
            : String(row.amount);
          const size = fit(value, 106);
          page.drawText(value, {
            x: 576 - regular.widthOfTextAtSize(value, size),
            y,
            size,
            font: regular,
          });
        }
        y -= 16;
      }
      y -= 8;
    }
  }
  for (const page of doc.getPages()) {
    page.drawText("DRAFT - NOT FOR FILING", {
      x: 36,
      y: 12,
      size: 8,
      font: regular,
      color: rgb(.4, .1, .1),
    });
    page.node.delete(PDFName.of("Annots"));
  }
  doc.catalog.delete(PDFName.of("AcroForm"));
  return doc.save({ updateFieldAppearances: false });
}

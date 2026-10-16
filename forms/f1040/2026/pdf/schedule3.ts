import {
  PDFDocument,
  PDFName,
  rgb,
  StandardFonts,
  TextAlignment,
} from "pdf-lib";
import type { z } from "zod";
import {
  calculateSchedule3_2026,
  type Schedule3Input2026,
} from "../schedule3.ts";
import { type inputSchema as w2Schema, w2_2026 } from "../inputs/w2.ts";
import { loadPinnedDraft2026 } from "./source.ts";

/** Internal component; the public bundle supplies only registered finalized sources. */
export async function buildSchedule3PdfBytes2026(
  raw: Schedule3Input2026,
  destinations: { form1040_line20: number; form1040_line31: number },
  filer: { name: string; ssn: string },
  wageSources?: z.input<typeof w2Schema>,
) {
  const result = calculateSchedule3_2026(raw);
  if (!result.file_schedule3) {
    throw new Error("Schedule 3 has no credits or payments to attach");
  }
  if (!filer.name.trim() || !/^\d{3}-?\d{2}-?\d{4}$/.test(filer.ssn)) {
    throw new Error("Schedule 3 needs filer identity");
  }
  if (
    result.lines.line8_total !== destinations.form1040_line20 ||
    result.lines.line15_total !== destinations.form1040_line31
  ) {
    throw new Error(
      "Schedule 3 PDF destinations disagree with calculated lines",
    );
  }
  if (wageSources || (result.input.line11_excess_ss ?? 0) > 0) {
    if (
      !wageSources ||
      wageSources.taxpayer_ssn.replaceAll("-", "") !==
        filer.ssn.replaceAll("-", "")
    ) throw new Error("Schedule 3 line 11 needs matching W-2 source identity");
    const replay = w2_2026.compute(
      { taxYear: 2026, formType: "f1040" },
      wageSources,
    );
    const expected = replay.outputs.filter((o) => o.nodeType === "schedule3")
      .reduce((n, o) => n + Number(o.fields.line11_excess_ss ?? 0), 0);
    if (expected !== (result.input.line11_excess_ss ?? 0)) {
      throw new Error("Schedule 3 line 11 differs from W-2 source withholding");
    }
  }
  const bytes = await loadPinnedDraft2026(
    new URL(
      "../../../../docs/ty2026/corpus/draft/f1040s3.pdf",
      import.meta.url,
    ),
    "https://www.irs.gov/pub/irs-dft/f1040s3--dft.pdf",
    "5feb6f8d0f08191a2da153573d195fc354f385e26915b99b57d4588893b7cef0",
  );
  const draft = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const form = draft.getForm();
  if (draft.getPageCount() !== 2 || form.getFields().length !== 38) {
    throw new Error("Schedule 3 template inventory changed");
  }
  const font = await draft.embedFont(StandardFonts.Helvetica);
  const prefix = "topmostSubform[0].Page1[0].";
  const fill = (
    index: number,
    value: string | number,
    path = "",
    widgetPrefix = "f1",
  ) => {
    const f = form.getTextField(
      `${prefix}${path}${widgetPrefix}_${String(index).padStart(2, "0")}[0]`,
    );
    const rect = f.acroField.getWidgets()[0].getRectangle();
    const text = String(value);
    const size = Math.min(
      9,
      9 * (rect.width - 4) / Math.max(1, font.widthOfTextAtSize(text, 9)),
    );
    if (size < 6) throw new Error("Schedule 3 text exceeds its printed field");
    f.setFontSize(size);
    if (typeof value === "number") f.setAlignment(TextAlignment.Right);
    f.setText(text);
  };
  fill(1, filer.name);
  fill(2, filer.ssn);
  const i = result.input, l = result.lines;
  const amount = (index: number, value: number | undefined, path = "") => {
    if (value !== undefined && value > 0) fill(index, value, path);
  };
  amount(3, l.line1_total);
  amount(4, i.line2_childcare_credit);
  amount(5, i.line3_education_credit);
  amount(6, i.line4_retirement_savings_credit);
  amount(7, i.line5a_residential_clean_energy);
  amount(9, l.line6a_total, "Line6a_ReadOrder[0].");
  amount(10, i.line6b_prior_year_min_tax_credit);
  amount(11, i.line6c_adoption_credit);
  amount(12, i.line6d_elderly_disabled_credit);
  amount(14, l.line6f_total);
  amount(15, i.line6g_mortgage_interest_credit);
  amount(16, i.line6h_dc_homebuyer_credit);
  amount(17, i.line6i_qualified_electric_vehicle_credit);
  amount(18, i.line6j_alt_fuel_vehicle_refueling);
  amount(19, i.line6k_tax_credit_bonds);
  amount(20, i.line6l_form8978_credit);
  amount(21, l.line6m_total);
  amount(23, l.line6z_total);
  amount(24, l.line7_total);
  amount(25, l.line8_total);
  amount(26, i.line9_premium_tax_credit);
  amount(27, i.line10_amount_paid_extension);
  amount(28, i.line11_excess_ss);
  amount(29, i.line12_fuel_tax_credit);
  amount(30, l.line13a_total, "Line13_ReadOrder[0].");
  amount(31, i.line13b_section1341_credit);
  amount(32, i.line13c_elective_payment);
  amount(33, i.line13d_deferred_section965);
  amount(34, i.line13e_section1062_tax);
  amount(36, l.line13z_total);
  amount(37, l.line14_total);
  amount(38, l.line15_total);
  const statements: {
    line: string;
    rows: NonNullable<Schedule3Input2026["line6z_other_credits"]>;
  }[] = [];
  for (
    const [line, rows, index, path, widget] of [
      ["6z", i.line6z_other_credits, 22, "Line6z_ReadOrder[0].", "f2"],
      ["13z", i.line13z_other_payments, 35, "Line13z_ReadOrder[0].", "f1"],
    ] as const
  ) {
    if (!rows?.length) continue;
    const text = rows.map((r) => `${r.description}: ${r.amount.toFixed(2)}`)
      .join("; ");
    if (rows.length === 1 && font.widthOfTextAtSize(text, 8) <= 310) {
      fill(index, text, path, widget);
    } else {
      fill(index, "See attached statement", path, widget);
      statements.push({ line, rows });
    }
  }
  form.updateFieldAppearances(font);
  form.flatten();
  const doc = await PDFDocument.create();
  const [page] = await doc.copyPages(draft, [1]);
  doc.addPage(page);
  const outputFont = await doc.embedFont(StandardFonts.Helvetica);
  for (const statement of statements) {
    let p = doc.addPage([612, 792]), y = 710;
    const header = () => {
      p.drawText(`Schedule 3 line ${statement.line} - continuation`, {
        x: 36,
        y: 754,
        font: outputFont,
        size: 12,
      });
      p.drawText(`${filer.name}   SSN ${filer.ssn}`, {
        x: 36,
        y: 735,
        font: outputFont,
        size: 9,
      });
    };
    header();
    for (const row of statement.rows) {
      const words = `${row.description} - $${row.amount.toFixed(2)}`.split(
        /\s+/,
      );
      let text = "";
      const write = () => {
        if (y < 52) {
          p = doc.addPage([612, 792]);
          y = 710;
          header();
        }
        p.drawText(text, { x: 36, y, font: outputFont, size: 10 });
        y -= 14;
        text = "";
      };
      for (const word of words) {
        if (outputFont.widthOfTextAtSize(word, 10) > 540) {
          throw new Error("Schedule 3 statement word exceeds page width");
        }
        const next = text ? `${text} ${word}` : word;
        if (outputFont.widthOfTextAtSize(next, 10) > 540) write();
        text = text ? `${text} ${word}` : word;
      }
      if (text) write();
      y -= 4;
    }
  }
  for (const p of doc.getPages()) {
    p.drawText("DRAFT - NOT FOR FILING", {
      x: 36,
      y: 12,
      font: outputFont,
      size: 8,
      color: rgb(.4, .1, .1),
    });
    p.node.delete(PDFName.of("Annots"));
  }
  doc.catalog.delete(PDFName.of("AcroForm"));
  return doc.save({ updateFieldAppearances: false });
}

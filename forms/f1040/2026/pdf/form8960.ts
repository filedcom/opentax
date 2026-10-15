import {
  PDFDocument,
  PDFName,
  rgb,
  StandardFonts,
  TextAlignment,
} from "pdf-lib";
import {
  calculateForm8960_2026,
  type Form8960Input2026,
} from "../nodes/form8960.ts";
import { loadPinnedDraft2026 } from "./source.ts";
export interface Form8960Destinations2026 {
  form1040_line2b: number;
  form1040_line3b: number;
  form1040_line7a: number;
  form1040_line11b: number;
  form1040_line12e: number;
  schedule1_line18: number;
  schedule_a_line5d?: number;
  schedule_a_line7?: number;
  schedule2_line6: number;
}
/** Static individual draft component; foreign elections and trusts are not enabled. */
export async function buildForm8960PdfBytes2026(
  raw: Form8960Input2026,
  destinations: Form8960Destinations2026,
  filer: { name: string; ssn: string },
): Promise<Uint8Array> {
  const result = calculateForm8960_2026(raw);
  const input = result.source_input;
  if (
    !filer.name.trim() || filer.ssn.replaceAll("-", "") !== input.taxpayer_ssn
  ) throw new Error("Form 8960 PDF needs matching filer identity");
  const d = destinations;
  if (
    Object.values(d).some((n) => !Number.isSafeInteger(n)) ||
    d.form1040_line2b !== input.taxable_interest_from_agi ||
    d.form1040_line3b !== input.ordinary_dividends_from_agi ||
    d.form1040_line7a !== input.capital_gain_from_agi ||
    d.form1040_line11b !== input.magi ||
    (!input.taking_standard_deduction &&
      d.form1040_line12e !== input.itemized_after_overall_limit) ||
    d.schedule1_line18 !== input.early_withdrawal_penalty_from_agi ||
    d.schedule2_line6 !== result.tax ||
    (input.schedule_a_tax_facts &&
      (d.schedule_a_line5d !==
          input.schedule_a_tax_facts.total_taxes_before_limit ||
        d.schedule_a_line7 !== input.schedule_a_tax_facts.allowed_taxes))
  ) {
    throw new Error(
      "Form 8960 PDF destinations disagree with calculated sources",
    );
  }
  if (!result.file_form8960 || !result.lines) {
    throw new Error("This calculation does not require Form 8960 attachment");
  }
  const bytes = await loadPinnedDraft2026(
    new URL("../../../../docs/ty2026/corpus/draft/f8960.pdf", import.meta.url),
    "https://www.irs.gov/pub/irs-dft/f8960--dft.pdf",
    "2306f4f334a8b3b1ed73fd5045dec86eed194902923462bf485431c756f66982",
  );
  const draft = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const form = draft.getForm();
  const key = (index: number) => `topmostSubform[0].Page1[0].f1_${index}[0]`;
  const expected = [
    ...Array.from({ length: 35 }, (_, i) => key(i + 1)),
    ...Array.from(
      { length: 3 },
      (_, i) => `topmostSubform[0].Page1[0].PartI[0].c1_${i + 1}[0]`,
    ),
  ];
  if (
    draft.getPageCount() !== 2 || form.getFields().length !== 38 ||
    form.getFields().some((f) =>
      !expected.includes(f.getName()) || f.acroField.getWidgets().length !== 1
    )
  ) throw new Error("Form 8960 template field inventory changed");
  const font = await draft.embedFont(StandardFonts.Helvetica);
  const fill = (index: number, value: string | number) => {
    const field = form.getTextField(key(index));
    const rect = field.acroField.getWidgets()[0].getRectangle();
    const text = String(value);
    const size = Math.min(
      9,
      9 * (rect.width - 4) / Math.max(1, font.widthOfTextAtSize(text, 9)),
    );
    if (size < 6) throw new Error("Form 8960 text exceeds its printable field");
    field.setFontSize(size);
    if (typeof value === "number") field.setAlignment(TextAlignment.Right);
    field.setText(text);
  };
  fill(1, filer.name);
  fill(2, filer.ssn);
  const map: Record<string, number> = {
    line1_taxable_interest: 3,
    line2_ordinary_dividends: 4,
    line3_annuities: 5,
    line4a_passive_income: 6,
    line4b_rental_net: 7,
    line4c_combined: 8,
    line5a_net_gain: 9,
    line5b_net_gain_adjustment: 10,
    line5d_combined: 12,
    line7_other_modifications: 14,
    line8_total_investment_income: 15,
    line9a_investment_interest_expense: 16,
    line9b_state_local_tax: 17,
    line9d_total_expenses: 19,
    line10_additional_modifications: 20,
    line11_total_deductions: 21,
    line12_net_investment_income: 22,
    line13_magi: 23,
    line14_threshold: 24,
    line15_magi_excess: 25,
    line16_taxable_base: 26,
    line17_niit: 27,
  };
  for (const [line, value] of Object.entries(result.lines)) {
    if (!map[line] || typeof value !== "number") {
      throw new Error(`Form 8960 has an unmapped calculated line: ${line}`);
    }
    fill(map[line], value);
  }
  // Unsupported partnership, CFC/PFIC and miscellaneous branches remain blank;
  // the strict source contract rejects them before calculation.
  form.updateFieldAppearances(font);
  form.flatten();
  const doc = await PDFDocument.create();
  const footer = await doc.embedFont(StandardFonts.Helvetica);
  const [page] = await doc.copyPages(draft, [1]);
  doc.addPage(page);
  page.drawText("DRAFT - NOT FOR FILING", {
    x: 36,
    y: 12,
    size: 8,
    font: footer,
    color: rgb(.4, .1, .1),
  });
  page.node.delete(PDFName.of("Annots"));
  doc.catalog.delete(PDFName.of("AcroForm"));
  return doc.save({ updateFieldAppearances: false });
}

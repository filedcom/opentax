import type { PdfFieldEntry, PdfFormDescriptor } from "../../../../review-support/form-descriptor.ts";
import { projectForm8992Source } from "../../../../../domains/income/foreign/form8992/form8992_source.ts";

const page = "topmostSubform[0].Page1[0].";
const field = (
  key: string,
  name: string,
  printZero = false,
): PdfFieldEntry => ({
  kind: "text",
  domainKey: key,
  pdfField: `${page}${name}`,
  printZero,
});
const simple = (key: string, number: number, printZero = false) =>
  field(key, `f1_${String(number).padStart(2, "0")}[0]`, printZero);
const adjustmentFields: ReadonlyArray<PdfFieldEntry> = (
  ["a", "b", "c", "d", "e", "f", "g", "h", "i"] as const
).flatMap((letter, index) => {
  const line = `Table_Line2[0].BodyRow2${letter}[0].`;
  const first = 7 + index * 2;
  return [
    field(
      `line2${letter}_add`,
      `${line}f1_${String(first).padStart(2, "0")}[0]`,
    ),
    field(
      `line2${letter}_subtract`,
      `${line}f1_${String(first + 1).padStart(2, "0")}[0]`,
    ),
  ];
});

export const form5471ScheduleHPdf: PdfFormDescriptor = {
  pendingKey: "f5471_schedule_h",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f5471sh--2021.pdf",
  pageIndices: () => [0],
  fields: [
    simple("shareholder_name", 1),
    simple("shareholder_tin", 2),
    simple("cfc_name", 3),
    simple("cfc_ein", 4),
    simple("cfc_reference_id", 5),
    simple("line1", 6, true),
    ...adjustmentFields,
    simple("line3", 25, true),
    simple("line4", 26, true),
    simple("line5a", 27, true),
    simple("line5c", 29, true),
    simple("line5c_general", 30, true),
    simple("line5c_passive", 31),
    simple("line5d", 40, true),
    simple("line5e_rate", 41),
  ],
  instances(_fields, filer, allPending) {
    if (!allPending?.f5471) return [];
    if (!filer) {
      throw new Error("Form 5471 Schedule H PDF needs final filer identity");
    }
    const { cfc, shareholderName } = projectForm8992Source(
      allPending,
      filer,
    );
    const h = cfc.schedule_h;
    return [{
      shareholder_name: shareholderName,
      shareholder_tin: cfc.shareholder_tin,
      cfc_name: cfc.foreign_corp_name,
      cfc_ein: cfc.foreign_corp_ein,
      cfc_reference_id: cfc.foreign_corp_reference_id,
      line1: h.book_net_income_functional,
      line2a_add: h.adjustments.capital_gain_add,
      line2a_subtract: h.adjustments.capital_gain_subtract,
      line2b_add: h.adjustments.depreciation_add,
      line2b_subtract: h.adjustments.depreciation_subtract,
      line2c_add: h.adjustments.depletion_add,
      line2c_subtract: h.adjustments.depletion_subtract,
      line2d_add: h.adjustments.investment_allowance_add,
      line2d_subtract: h.adjustments.investment_allowance_subtract,
      line2e_add: h.adjustments.statutory_reserves_add,
      line2e_subtract: h.adjustments.statutory_reserves_subtract,
      line2f_add: h.adjustments.inventory_add,
      line2f_subtract: h.adjustments.inventory_subtract,
      line2g_add: h.adjustments.income_taxes_add,
      line2g_subtract: h.adjustments.income_taxes_subtract,
      line2h_add: h.adjustments.foreign_currency_add,
      line2h_subtract: h.adjustments.foreign_currency_subtract,
      line2i_add: h.adjustments.other_add,
      line2i_subtract: h.adjustments.other_subtract,
      line3: 0,
      line4: 0,
      line5a: h.book_net_income_functional,
      line5c: h.book_net_income_functional,
      line5c_general: h.book_net_income_functional - h.passive_category_ep,
      line5c_passive: h.passive_category_ep,
      line5d: h.current_ep_usd,
      line5e_rate: h.average_exchange_rate,
    }];
  },
};

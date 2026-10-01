import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";
import {
  computeF8828Lines,
  type F8828Item,
  inputSchema,
} from "../../../nodes/inputs/f8828/index.ts";
import { reconcileForm8828 } from "../../mef/forms/f8828.ts";

// AcroForm field names inspected on the IRS November 2024 one-page Form 8828.
const page = "topmostSubform[0].Page1[0].";
const text = (
  domainKey: string,
  number: number,
  printZero = false,
): PdfFieldEntry => ({
  kind: "text",
  domainKey,
  pdfField: `${page}f1_${number}[0]`,
  printZero,
});

const fields: ReadonlyArray<PdfFieldEntry> = [
  text("property_address_printed", 3),
  {
    kind: "checkboxWhen",
    domainKey: "subsidy_type",
    pdfField: `${page}c1_01[0]`,
    whenValue: "tax_exempt_bond_loan",
  },
  {
    kind: "checkboxWhen",
    domainKey: "subsidy_type",
    pdfField: `${page}c1_01[1]`,
    whenValue: "mortgage_credit_certificate",
  },
  text("issuer_printed", 4),
  text("lender_printed", 5),
  text("closing_month", 6),
  text("closing_day", 7),
  text("closing_year", 8),
  text("disposition_month", 9),
  text("disposition_day", 10),
  text("disposition_year", 11),
  text("line7_full_years", 12, true),
  text("line7_full_months", 13, true),
  text("repayment_month", 14),
  text("repayment_day", 15),
  text("repayment_year", 16),
  ...Array.from(
    { length: 15 },
    (_, index) => text(`line${index + 9}`, index + 17, true),
  ),
];

function printedAddress(address: F8828Item["property_address"]): string {
  return [
    address.line1,
    address.line2,
    `${address.city}, ${address.state} ${address.zip}`,
  ]
    .filter(Boolean).join("\n");
}

function dateParts(date: string, prefix: string): Record<string, string> {
  const [year, month, day] = date.split("-");
  return {
    [`${prefix}_month`]: month,
    [`${prefix}_day`]: day,
    [`${prefix}_year`]: year,
  };
}

function instance(item: F8828Item): Record<string, unknown> {
  const lines = computeF8828Lines(item);
  const record: Record<string, unknown> = {
    property_address_printed: printedAddress(item.property_address),
    subsidy_type: item.subsidy_type,
    issuer_printed: `${item.issuer_state} — ${item.issuer_name}`,
    lender_printed: `${item.original_lender_name}\n${
      printedAddress(item.original_lender_address)
    }`,
    ...dateParts(item.original_loan_closing_date, "closing"),
    ...dateParts(item.disposition_date, "disposition"),
    ...dateParts(item.full_repayment_date, "repayment"),
    line7_full_years: lines.line7_full_years,
    line7_full_months: lines.line7_full_months,
    line9: lines.line9_sales_price,
    line10: lines.line10_selling_expenses,
    line11: lines.line11_amount_realized,
    line12: lines.line12_adjusted_basis,
    line13: lines.line13_gain_or_loss,
  };
  if (lines.line13_gain_or_loss <= 0) return record;
  Object.assign(record, {
    line14: lines.line14_half_gain,
    line15: lines.line15_modified_agi,
    line16: lines.line16_adjusted_qualifying_income,
    line17: lines.line17_income_excess,
  });
  if (lines.line17_income_excess <= 0) return record;
  return {
    ...record,
    line18: lines.line18_income_percentage,
    line19: lines.line19_federally_subsidized_amount,
    line20: lines.line20_holding_period_percentage,
    line21: lines.line21_holding_adjusted_amount,
    line22: lines.line22_recapture_amount,
    line23: lines.line23_tax,
  };
}

// Staged descriptor: registered only after full attachment and PDF validation.
export const form8828Pdf: PdfFormDescriptor = {
  pendingKey: "f8828",
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8828.pdf",
  fields,
  filerFields: [text("nameLine1", 1), text("primarySSN", 2)],
  instances(raw, filer, allPending) {
    const { f8828s } = inputSchema.parse(raw);
    if (
      !filer?.nameLine1 || !/^\d{9}$/.test(filer.primarySSN.replace(/\D/g, ""))
    ) {
      throw new Error("Form 8828 PDF needs filer name and identifying number");
    }
    reconcileForm8828(f8828s, allPending ? { pending: allPending } : undefined);
    return f8828s.map(instance);
  },
};

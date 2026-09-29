import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";
import { assertForm6251Line8 } from "../../form6251_line8.ts";

// Verified against the cached TY2025 IRS AcroForm field tree and widget
// positions: f1_1/f1_2 are name/SSN, f1_3..f1_33 are lines 1a..11,
// and f2_1..f2_29 are lines 12..40.
function textField(
  domainKey: string,
  page: 1 | 2,
  fieldNumber: number,
  printZero = false,
): PdfFieldEntry {
  return {
    kind: "text",
    domainKey,
    pdfField: `topmostSubform[0].Page${page}[0].f${page}_${fieldNumber}[0]`,
    ...(printZero ? { printZero: true } : {}),
  };
}

const fields: ReadonlyArray<PdfFieldEntry> = [
  textField("line1a_less_senior_deduction", 1, 3),
  textField("regular_tax_income", 1, 4),
  textField("line2a_taxes_paid", 1, 5),
  textField("line2b_tax_refund", 1, 6),
  textField("line2c_investment_interest", 1, 7),
  textField("line2d_depletion", 1, 8),
  textField("nol_adjustment", 1, 10),
  textField("private_activity_bond_interest", 1, 11),
  textField("qsbs_adjustment", 1, 12),
  textField("iso_adjustment", 1, 13),
  textField("line2j_estates_and_trusts", 1, 14),
  textField("line2k_disposition", 1, 15),
  textField("depreciation_adjustment", 1, 16),
  textField("line2o_circulation_costs", 1, 19),
  textField("amti", 1, 26),
  textField("exemption", 1, 27),
  textField("taxable_excess", 1, 28, true),
  textField("tentative_tax", 1, 29, true),
  textField("amtftc", 1, 30),
  textField("net_tmt", 1, 31, true),
  textField("regular_tax", 1, 32),
  textField("line11_amt", 1, 33, true),
  ...Array.from(
    { length: 29 },
    (_, index) => textField(`line${index + 12}`, 2, index + 1),
  ),
];

export const form6251Pdf: PdfFormDescriptor = {
  pendingKey: "form6251",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f6251--2025.pdf",
  fields,
  includeWhenNoMappedData: true,
  filerFields: [
    textField("fullName", 1, 1),
    textField("primarySSN", 1, 2),
  ],
  projectFields(fields, allPending) {
    if (Object.keys(fields).length === 0) return {};
    if (
      typeof fields.nol_adjustment === "number" &&
      fields.nol_adjustment !== 0
    ) {
      throw new Error(
        "Form 6251 line 2f needs sourced regular NOL and AMT NOL refigures before filing",
      );
    }
    if (
      typeof fields.other_adjustments === "number" &&
      fields.other_adjustments !== 0
    ) {
      throw new Error(
        "Form 6251 mixed other_adjustments needs line-specific AMT modeling before filing",
      );
    }
    assertForm6251Line8(fields);
    const form1040 = allPending.f1040;
    const line14 = form1040?.line14_deductions_qbi_total;
    const agi = form1040?.line11_agi;
    const senior = allPending.schedule1a?.line37_senior ?? 0;
    if (
      typeof line14 !== "number" || typeof agi !== "number" ||
      typeof senior !== "number" ||
      typeof fields.regular_tax_income !== "number"
    ) {
      throw new Error(
        "Form 6251 PDF line 1a needs finalized Form 1040 lines 11b/14 and Schedule 1-A line 37",
      );
    }
    const line1a = line14 - senior;
    if (Math.round(agi - line1a) !== Math.round(fields.regular_tax_income)) {
      throw new Error(
        "Form 6251 PDF line 1b does not reconcile to Form 1040 and Schedule 1-A",
      );
    }
    const nol = fields.nol_adjustment;
    return {
      ...fields,
      line1a_less_senior_deduction: line1a,
      ...(typeof nol === "number" ? { nol_adjustment: -nol } : {}),
    };
  },
  includeWhen: (fields) =>
    (typeof fields.tentative_tax === "number" &&
      typeof fields.regular_tax === "number" &&
      fields.tentative_tax > fields.regular_tax) ||
    (typeof fields.line11_amt === "number" && fields.line11_amt > 0) ||
    fields.must_file_for_credit === true ||
    fields.must_file_for_negative_adjustments === true,
};

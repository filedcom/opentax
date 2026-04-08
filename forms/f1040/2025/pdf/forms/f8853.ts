import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";

// IRS Form 8853 (2025) AcroForm field names.
// Archer MSAs and Long-Term Care Insurance Contracts.
// Name/SSN header fields skipped.
// Section A — Archer MSA Deduction.
// Section B — Archer MSA Distributions.
// Section C — Long-Term Care (LTC) Insurance Contracts.
// employer_archer_msa                  → line 1  (employer Archer MSA contributions)
// taxpayer_archer_msa_contributions    → line 2  (taxpayer Archer MSA contributions)
// line3_limitation_amount              → line 3  (limitation amount)
// compensation                         → line 4  (compensation)
// archer_msa_distributions             → line 8  (total Archer MSA distributions)
// archer_msa_rollover                  → line 9  (rollover amounts)
// archer_msa_qualified_expenses        → line 10 (qualified medical expenses)
// medicare_advantage_distributions     → line 14 (Medicare Advantage MSA distributions)
// medicare_advantage_qualified_expenses → line 15 (Medicare Advantage qualified expenses)
// ltc_gross_payments                   → line 17 (gross LTC payments)
// ltc_qualified_contract_amount        → line 18 (per diem limitation)
// ltc_accelerated_death_benefits       → line 19 (accelerated death benefits)
// ltc_period_days                      → line 20 (number of days)
// ltc_actual_costs                     → line 21 (actual LTC costs)
// ltc_reimbursements                   → line 22 (reimbursements)
const fields: ReadonlyArray<PdfFieldEntry> = [
  { kind: "text", domainKey: "employer_archer_msa", pdfField: "topmostSubform[0].Page1[0].f1_3[0]" },
  { kind: "text", domainKey: "taxpayer_archer_msa_contributions", pdfField: "topmostSubform[0].Page1[0].f1_4[0]" },
  { kind: "text", domainKey: "line3_limitation_amount", pdfField: "topmostSubform[0].Page1[0].f1_5[0]" },
  { kind: "text", domainKey: "compensation", pdfField: "topmostSubform[0].Page1[0].f1_6[0]" },
  { kind: "text", domainKey: "archer_msa_distributions", pdfField: "topmostSubform[0].Page1[0].f1_12[0]" },
  { kind: "text", domainKey: "archer_msa_rollover", pdfField: "topmostSubform[0].Page1[0].f1_13[0]" },
  { kind: "text", domainKey: "archer_msa_qualified_expenses", pdfField: "topmostSubform[0].Page1[0].f1_14[0]" },
  { kind: "text", domainKey: "medicare_advantage_distributions", pdfField: "topmostSubform[0].Page1[0].f1_1[0]" },
  { kind: "text", domainKey: "medicare_advantage_qualified_expenses", pdfField: "topmostSubform[0].Page1[0].f1_2[0]" },
  { kind: "text", domainKey: "ltc_gross_payments", pdfField: "topmostSubform[0].Page2[0].f2_3[0]" },
  { kind: "text", domainKey: "ltc_qualified_contract_amount", pdfField: "topmostSubform[0].Page2[0].f2_4[0]" },
  { kind: "text", domainKey: "ltc_accelerated_death_benefits", pdfField: "topmostSubform[0].Page2[0].f2_5[0]" },
  { kind: "text", domainKey: "ltc_period_days", pdfField: "topmostSubform[0].Page2[0].f2_6[0]" },
  { kind: "text", domainKey: "ltc_actual_costs", pdfField: "topmostSubform[0].Page2[0].f2_7[0]" },
  { kind: "text", domainKey: "ltc_reimbursements", pdfField: "topmostSubform[0].Page2[0].f2_8[0]" },
];

export const form8853Pdf: PdfFormDescriptor = {
  pendingKey: "form8853",
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8853.pdf",
  fields,
};

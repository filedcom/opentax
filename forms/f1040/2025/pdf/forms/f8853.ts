import type { PdfFormDescriptor } from "../form-descriptor.ts";

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
export const PDF_FIELD_MAP: ReadonlyArray<readonly [string, string]> = [
  ["employer_archer_msa",                  "topmostSubform[0].Page1[0].f1_03[0]"],
  ["taxpayer_archer_msa_contributions",    "topmostSubform[0].Page1[0].f1_04[0]"],
  ["line3_limitation_amount",              "topmostSubform[0].Page1[0].f1_05[0]"],
  ["compensation",                         "topmostSubform[0].Page1[0].f1_06[0]"],
  ["archer_msa_distributions",             "topmostSubform[0].Page1[0].f1_12[0]"],
  ["archer_msa_rollover",                  "topmostSubform[0].Page1[0].f1_13[0]"],
  ["archer_msa_qualified_expenses",        "topmostSubform[0].Page1[0].f1_14[0]"],
  ["medicare_advantage_distributions",     "topmostSubform[0].Page1[0].f1_19[0]"],
  ["medicare_advantage_qualified_expenses","topmostSubform[0].Page1[0].f1_20[0]"],
  ["ltc_gross_payments",                   "topmostSubform[0].Page2[0].f2_03[0]"],
  ["ltc_qualified_contract_amount",        "topmostSubform[0].Page2[0].f2_04[0]"],
  ["ltc_accelerated_death_benefits",       "topmostSubform[0].Page2[0].f2_05[0]"],
  ["ltc_period_days",                      "topmostSubform[0].Page2[0].f2_06[0]"],
  ["ltc_actual_costs",                     "topmostSubform[0].Page2[0].f2_07[0]"],
  ["ltc_reimbursements",                   "topmostSubform[0].Page2[0].f2_08[0]"],
];

export const form8853Pdf: PdfFormDescriptor = {
  pendingKey: "form8853",
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8853.pdf",
  PDF_FIELD_MAP,
};

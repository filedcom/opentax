import type { PdfFormDescriptor } from "../form-descriptor.ts";

// IRS Form 4562 (2025) AcroForm field names (223 fields).
// f1_1–f1_3:  business name/EIN/activity (skipped).
// Part I Section 179:
//   f1_5: line 2 total cost of property placed in service.
//   f1_8: line 5 dollar limit after reduction.
//   f1_15: line 7 elected cost total.
//   f1_16: line 8 tentative deduction.
//   f1_17: line 9 carryover from prior year.
//   f1_18: line 10 business income limit.
//   f1_19: line 11 Section 179 deduction.
//   f1_20: line 12 carryover to next year.
// Part II Bonus Depreciation:
//   f1_21: line 14 special (bonus) depreciation allowance.
//   f1_22: line 25 bonus for listed property post-Jan-1-2019.
// Part III MACRS:
//   f1_26: MACRS GDS basis.
//   f1_27: MACRS GDS recovery period.
//   f1_28: MACRS GDS year of service.
//   f1_29: MACRS prior depreciation.
//   f1_30: business use percentage.
export const PDF_FIELD_MAP: ReadonlyArray<readonly [string, string]> = [
  ["section_179_cost",                    "topmostSubform[0].Page1[0].f1_05[0]"],
  ["section_179_elected",                 "topmostSubform[0].Page1[0].f1_15[0]"],
  ["business_income_limit",               "topmostSubform[0].Page1[0].f1_18[0]"],
  ["section_179_deduction",               "topmostSubform[0].Page1[0].f1_19[0]"],
  ["section_179_carryover",               "topmostSubform[0].Page1[0].f1_20[0]"],
  ["bonus_depreciation_basis",            "topmostSubform[0].Page1[0].f1_21[0]"],
  ["bonus_depreciation_basis_post_jan19", "topmostSubform[0].Page1[0].f1_22[0]"],
  ["macrs_gds_basis",                     "topmostSubform[0].Page1[0].f1_26[0]"],
  ["macrs_gds_recovery_period",           "topmostSubform[0].Page1[0].f1_27[0]"],
  ["macrs_gds_year_of_service",           "topmostSubform[0].Page1[0].f1_28[0]"],
  ["macrs_prior_depreciation",            "topmostSubform[0].Page1[0].f1_29[0]"],
  ["business_use_pct",                    "topmostSubform[0].Page1[0].f1_30[0]"],
];

export const form4562Pdf: PdfFormDescriptor = {
  pendingKey: "form4562",
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f4562.pdf",
  PDF_FIELD_MAP,
};

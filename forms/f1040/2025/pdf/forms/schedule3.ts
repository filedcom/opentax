import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";

// IRS Schedule 3 (2025) AcroForm field names.
// Verified against the f1040s3--2025.pdf AcroForm field dump (37 fields, one
// page, strictly in reading order):
//   f1_01 = Name(s) shown on Form 1040        f1_02 = SSN
//   Part I — Nonrefundable Credits
//   f1_03 = 1 foreign tax credit              f1_04 = 2 dependent care credit
//   f1_05 = 3 education credits               f1_06 = 4 retirement savings credit
//   f1_07 = 5a residential clean energy       f1_08 = 5b energy efficient home
//   f1_09 = 6a general business credit        f1_10 = 6b prior year minimum tax
//   f1_11 = 6c adoption credit                f1_12 = 6d elderly/disabled credit
//   f1_13 = 6e (reserved)                     f1_14 = 6f clean vehicle credit
//   f1_15 = 6g mortgage interest credit       f1_16 = 6h DC homebuyer credit
//   f1_17 = 6i qualified electric vehicle     f1_18 = 6j alt fuel refueling property
//   f1_19 = 6k tax credit bonds               f1_20 = 6l Form 8978
//   f1_21 = 6m previously owned clean vehicle f2_22 = 6z description text
//   f1_23 = 6z amount                         f1_24 = 7 total other credits
//   f1_25 = 8 total nonrefundable credits (→ 1040 line 20)
//   Part II — Other Payments and Refundable Credits
//   f1_26 = 9 net premium tax credit          f1_27 = 10 paid with extension
//   f1_28 = 11 excess social security         f1_29 = 12 fuel tax credit
//   f1_30 = 13a Form 2439                     f1_31 = 13b section 1341
//   f1_32 = 13c Form 3800 elective payment    f1_33 = 13d deferred 965 tax
//   f1_34 = 13z description text              f1_35 = 13z amount
//   f1_36 = 14 total other payments           f1_37 = 15 total Part II (→ 1040 line 31)
//
// line1_total / line8_total / line15_total are self-emitted by the schedule3
// node; the remaining per-line keys are upstream deposits already in pending.

const fields: ReadonlyArray<PdfFieldEntry> = [
  // ── Part I: Nonrefundable Credits ────────────────────────────────────────────
  { kind: "text", domainKey: "line1_total", pdfField: "topmostSubform[0].Page1[0].f1_03[0]" },
  { kind: "text", domainKey: "line2_childcare_credit", pdfField: "topmostSubform[0].Page1[0].f1_04[0]" },
  { kind: "text", domainKey: "line3_education_credit", pdfField: "topmostSubform[0].Page1[0].f1_05[0]" },
  { kind: "text", domainKey: "line4_retirement_savings_credit", pdfField: "topmostSubform[0].Page1[0].f1_06[0]" },
  { kind: "text", domainKey: "line5_residential_energy", pdfField: "topmostSubform[0].Page1[0].f1_07[0]" },
  { kind: "text", domainKey: "line6z_general_business_credit", pdfField: "topmostSubform[0].Page1[0].Line6a_ReadOrder[0].f1_09[0]" },
  { kind: "text", domainKey: "line6e_prior_year_min_tax_credit", pdfField: "topmostSubform[0].Page1[0].f1_10[0]" },
  { kind: "text", domainKey: "line6c_adoption_credit", pdfField: "topmostSubform[0].Page1[0].f1_11[0]" },
  { kind: "text", domainKey: "line6d_elderly_disabled_credit", pdfField: "topmostSubform[0].Page1[0].f1_12[0]" },
  { kind: "text", domainKey: "line6d_clean_vehicle_credit", pdfField: "topmostSubform[0].Page1[0].f1_14[0]" },
  { kind: "text", domainKey: "line6f_mortgage_interest_credit", pdfField: "topmostSubform[0].Page1[0].f1_15[0]" },
  { kind: "text", domainKey: "line8_total", pdfField: "topmostSubform[0].Page1[0].f1_25[0]" },

  // ── Part II: Other Payments and Refundable Credits ───────────────────────────
  { kind: "text", domainKey: "line9_premium_tax_credit", pdfField: "topmostSubform[0].Page1[0].f1_26[0]" },
  { kind: "text", domainKey: "line10_amount_paid_extension", pdfField: "topmostSubform[0].Page1[0].f1_27[0]" },
  { kind: "text", domainKey: "line11_excess_ss", pdfField: "topmostSubform[0].Page1[0].f1_28[0]" },
  { kind: "text", domainKey: "line13_1446_withholding", pdfField: "topmostSubform[0].Page1[0].f1_33[0]" },
  { kind: "text", domainKey: "line15_total", pdfField: "topmostSubform[0].Page1[0].f1_37[0]" },
];

export const schedule3Pdf: PdfFormDescriptor = {
  pendingKey: "schedule3",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f1040s3--2025.pdf",
  fields,
  filerFields: [
    { kind: "text", domainKey: "fullName", pdfField: "topmostSubform[0].Page1[0].f1_01[0]" },
    { kind: "text", domainKey: "primarySSN", pdfField: "topmostSubform[0].Page1[0].f1_02[0]" },
  ],
};

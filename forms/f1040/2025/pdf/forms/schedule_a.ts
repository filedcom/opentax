import type { PdfFormDescriptor } from "../form-descriptor.ts";

// IRS Schedule A (2025) AcroForm field names.
// Verified layout from https://www.irs.gov/pub/irs-pdf/f1040sa.pdf
//
// Text fields (approx 24 total), personal info fields first (skip):
//   Medical and Dental Expenses (lines 1–4):
//     f1_01 = Line 1 medical/dental expenses
//     f1_02 = Line 2 AGI
//     f1_04 = Line 4 deductible medical (after 7.5% threshold computed by form)
//   Taxes You Paid (lines 5a–7):
//     f1_05 = Line 5a state and local income/sales taxes
//     f1_06 = Line 5b real estate taxes
//     f1_07 = Line 5c personal property taxes
//     f1_09 = Line 6 other taxes
//   Interest You Paid (lines 8a–9):
//     f1_11 = Line 8a home mortgage interest from Form 1098
//     f1_13 = Line 9 investment interest
//   Gifts to Charity (lines 11–13):
//     f1_15 = Line 11 cash contributions
//     f1_16 = Line 12 noncash contributions
//     f1_17 = Line 13 carryover contributions from prior year
//   Casualty and Theft Losses (line 15):
//     f1_19 = Line 15 casualty and theft loss (Form 4684)
//   Other Itemized Deductions (line 16):
//     f1_20 = Line 16 other deductions

export const PDF_FIELD_MAP: ReadonlyArray<readonly [string, string]> = [
  // ── Medical and Dental Expenses ──────────────────────────────────────────────
  ["line_1_medical",                  "topmostSubform[0].Page1[0].f1_01[0]"],
  ["agi",                             "topmostSubform[0].Page1[0].f1_02[0]"],
  // Line 3 threshold and Line 4 net medical computed by PDF — not mapped

  // ── Taxes You Paid ───────────────────────────────────────────────────────────
  ["line_5a_tax_amount",              "topmostSubform[0].Page1[0].f1_05[0]"],
  ["line_5b_real_estate_tax",         "topmostSubform[0].Page1[0].f1_06[0]"],
  ["line_5c_personal_property_tax",   "topmostSubform[0].Page1[0].f1_07[0]"],
  ["line_6_other_taxes",              "topmostSubform[0].Page1[0].f1_09[0]"],

  // ── Interest You Paid ────────────────────────────────────────────────────────
  ["line_8a_mortgage_interest_1098",  "topmostSubform[0].Page1[0].f1_11[0]"],
  ["line_9_investment_interest",      "topmostSubform[0].Page1[0].f1_13[0]"],

  // ── Gifts to Charity ─────────────────────────────────────────────────────────
  ["line_11_cash_contributions",      "topmostSubform[0].Page1[0].f1_15[0]"],
  ["line_12_noncash_contributions",   "topmostSubform[0].Page1[0].f1_16[0]"],
  ["line_13_contribution_carryover",  "topmostSubform[0].Page1[0].f1_17[0]"],

  // ── Casualty and Theft Losses ────────────────────────────────────────────────
  ["line_15_casualty_theft_loss",     "topmostSubform[0].Page1[0].f1_19[0]"],

  // ── Other Itemized Deductions ────────────────────────────────────────────────
  ["line_16_other_deductions",        "topmostSubform[0].Page1[0].f1_20[0]"],
];

export const scheduleAPdf: PdfFormDescriptor = {
  pendingKey: "schedule_a",
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f1040sa.pdf",
  PDF_FIELD_MAP,
};

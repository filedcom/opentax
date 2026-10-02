import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";
import { rgb, StandardFonts } from "pdf-lib";
import { AccountType } from "../../../mef/header.ts";
import { form8814ParentPrintAmounts } from "./f8814.ts";
import { appendIraDistributionStatement } from "./ira_distribution_statement.ts";
import { appendDependentContinuation } from "./dependent_continuation.ts";
import { schedule1aPdf } from "./schedule1a.ts";
import { assertMfsEitcSource } from "../../mfs-eitc-source.ts";
import { assertEicSource } from "../../eic-source.ts";
import { residentElectionName } from "../../resident-election-source.ts";
import { assertSchedule2Line23 } from "../../schedule2-line23-reconciliation.ts";
import { assertEstimatedPaymentLine26 } from "../../estimated-payment-reconciliation.ts";
import { assertOtherFormsWithholding } from "../../f8288-withholding-reconciliation.ts";
import { assertPresidentialCampaignSource } from "../../presidential-campaign-source.ts";
import { retainedActcOptOut } from "../../actc-opt-out-source.ts";
import { retainedEicOptOut } from "../../eic-opt-out-source.ts";
import { assertLine1hSupportedSource } from "../../line1h-source.ts";
import { assertIdentified1099IntOwner } from "../../f1099int-owner-reconciliation.ts";
import { assertPositive1099OidOwner } from "../../f1099oid-owner-reconciliation.ts";
import { assertPositive1099DivOwner } from "../../f1099div-owner-reconciliation.ts";
import { assertPositive1099GOwner } from "../../f1099g-owner-reconciliation.ts";
import { assertPositive1099MOwner } from "../../f1099m-owner-reconciliation.ts";
import { assertPositive1099NecOwner } from "../../f1099nec-owner-reconciliation.ts";
import { assertPositive1099PatrOwner } from "../../f1099patr-owner-reconciliation.ts";
import { assertDirectCapitalGainDistributionSource } from "../../line7a-source-reconciliation.ts";
import { assertNoUnsupportedDeceasedReturn } from "../../filer-source-reconciliation.ts";
import { assertJointDependentRefundSource } from "../../line12a-dependent-source.ts";
import { assertLine36EstimatedTaxSource } from "../../line36-estimated-tax-source.ts";
import { nativeFecInputSchema } from "../../../nodes/inputs/fec/index.ts";
import { physicalPresenceFilingSchema } from "../../../nodes/intermediate/forms/form2555/calculation.ts";
import {
  assertReturnScheduleJoins,
  assertReturnWideArithmetic,
} from "../../return-wide-arithmetic.ts";
import {
  DependentCreditCategory,
  dependentFilingSchema,
  dependentLivedWithFilerOverHalfYear,
} from "../../../nodes/inputs/general/index.ts";
import {
  assertDistinct1099RCopies,
  assertIraRolloverEvidence,
  correctivePlanItems,
  inputSchema as f1099rInputSchema,
  isIraRollover,
  isPensionDirectRollover,
} from "../../../nodes/inputs/f1099r/index.ts";
import {
  codeDExcessDeferral,
  inputSchema as w2InputSchema,
} from "../../../nodes/inputs/w2/index.ts";

// IRS Form 1040 (2025) AcroForm field names.
// Verified empirically by filling each field with a unique value and inspecting the output.
//
// Page 1 layout (f1_XX):
//   f1_14–f1_19:  primary taxpayer name/SSN, spouse name/SSN
//   f1_20–f1_24:  address (line1, apt, city, state, zip)
//   f1_47–f1_57:  wages (lines 1a–1z)
//                 f1_54 = line 1h description text; f1_55 = line 1h amount
//   f1_58–f1_75:  income lines 2–11 (interest, dividends, IRA, pension, SS, capital gains, AGI)
//                 f1_64 and f1_67 = line 4c/5c box 3 text spaces (skipped),
//                 f1_71 = near line 7b check area (skipped)
//   Lines 12–15 appear on page 2 only in the 2025 form.
//
// Page 2 layout (f2_XX):
//   f2_01:        line 11b — AGI carry from page 1
//   f2_02–f2_06:  lines 12–15 — deductions & taxable income
//                 f2_02 = line 12 (std/itemized), f2_03 = line 13a QBI,
//                 f2_04 = line 13b (new 2025), f2_05 = line 14, f2_06 = line 15
//   f2_07:        line 16 form-name text box (not a dollar field — skipped)
//   f2_08–f2_16:  tax lines 16–24 (shifted +1 vs pre-2025 descriptor)
//   f2_17–f2_21:  withholding lines 25a–26 (shifted +1)
//   f2_22:        SSN field (skipped)
//   f2_23–f2_31:  payments lines 27a–35a
//   f2_32–f2_33:  direct-deposit routing and account numbers (lines 35b, 35d)
//                 c2_16[0]/[1] = checking/savings (line 35c)
//   f2_35:        line 37 amount owed

const fields: ReadonlyArray<PdfFieldEntry> = [
  {
    kind: "text",
    domainKey: "print_foreign_country_name",
    pdfField: "topmostSubform[0].Page1[0].Address_ReadOrder[0].f1_25[0]",
  },
  {
    kind: "checkbox",
    domainKey: "main_home_in_us_over_half_year",
    pdfField: "topmostSubform[0].Page1[0].c1_5[0]",
  },
  {
    kind: "checkbox",
    domainKey: "presidential_campaign_fund_taxpayer",
    pdfField: "topmostSubform[0].Page1[0].c1_6[0]",
  },
  {
    kind: "checkbox",
    domainKey: "presidential_campaign_fund_spouse",
    pdfField: "topmostSubform[0].Page1[0].c1_7[0]",
  },
  // ── Page 1: Filing Status checkboxes ──────────────────────────────────────
  // Verified against the 2025 f1040 AcroForm field dump (rects at y≈578–554):
  // the left column (Single/MFJ/MFS) lives under Checkbox_ReadOrder[0] with
  // export values /1 /2 /3; the right column (HOH/QSS) is the bare c1_8 group
  // with export values /4 /5. The previous c1_1–c1_5 mappings pointed at the
  // header row (c1_1 = "Filed pursuant to section 301.9100-2", c1_2 = combat
  // zone, c1_3 = deceased, c1_4 = "Other", c1_5 = main-home-in-US), which
  // wrongly stamped a §301.9100-2 late-election mark on single-filer returns.
  {
    kind: "checkboxWhen",
    domainKey: "filing_status",
    pdfField: "topmostSubform[0].Page1[0].Checkbox_ReadOrder[0].c1_8[0]",
    whenValue: "single",
  },
  {
    kind: "checkboxWhen",
    domainKey: "filing_status",
    pdfField: "topmostSubform[0].Page1[0].Checkbox_ReadOrder[0].c1_8[1]",
    whenValue: "mfj",
  },
  {
    kind: "checkboxWhen",
    domainKey: "filing_status",
    pdfField: "topmostSubform[0].Page1[0].Checkbox_ReadOrder[0].c1_8[2]",
    whenValue: "mfs",
  },
  {
    kind: "checkboxWhen",
    domainKey: "filing_status",
    pdfField: "topmostSubform[0].Page1[0].c1_8[0]",
    whenValue: "hoh",
  },
  {
    kind: "checkboxWhen",
    domainKey: "filing_status",
    pdfField: "topmostSubform[0].Page1[0].c1_8[1]",
    whenValue: "qss",
  },
  {
    kind: "checkbox",
    domainKey: "print_resident_election",
    pdfField: "topmostSubform[0].Page1[0].c1_9[0]",
  },
  {
    kind: "text",
    domainKey: "print_resident_election_name",
    pdfField: "topmostSubform[0].Page1[0].f1_30[0]",
  },

  // ── Page 1: Digital assets question (Yes = c1_10[0], No = c1_10[1]) ───────
  // Required answer on every 2025 return; previously unmapped (left blank).
  {
    kind: "checkboxWhen",
    domainKey: "digital_assets",
    pdfField: "topmostSubform[0].Page1[0].c1_10[0]",
    whenValue: "true",
  },
  {
    kind: "checkboxWhen",
    domainKey: "digital_assets",
    pdfField: "topmostSubform[0].Page1[0].c1_10[1]",
    whenValue: "false",
  },
  {
    kind: "checkbox",
    domainKey: "print_more_than_four_dependents",
    pdfField: "topmostSubform[0].Page1[0].Dependents_ReadOrder[0].c1_11[0]",
  },
  {
    kind: "checkbox",
    domainKey: "mfs_eitc_separation_rule",
    pdfField: "topmostSubform[0].Page1[0].c1_32[0]",
  },
  {
    kind: "text",
    domainKey: "print_mfs_spouse_full_name",
    pdfField: "topmostSubform[0].Page1[0].Checkbox_ReadOrder[0].f1_28[0]",
  },

  // Four dependent columns, each with first/last name, TIN, relationship,
  // residence answers, and one credit-category mark.
  ...Array.from({ length: 4 }, (_, i): PdfFieldEntry[] => {
    const column = i + 1;
    const table = "topmostSubform[0].Page1[0].Table_Dependents[0]";
    return [
      {
        kind: "text",
        domainKey: `dependent_${i}_first_name`,
        pdfField: `${table}.Row1[0].f1_${31 + i}[0]`,
      },
      {
        kind: "text",
        domainKey: `dependent_${i}_last_name`,
        pdfField: `${table}.Row2[0].f1_${35 + i}[0]`,
      },
      {
        kind: "text",
        domainKey: `dependent_${i}_tin`,
        pdfField: `${table}.Row3[0].f1_${39 + i}[0]`,
      },
      {
        kind: "text",
        domainKey: `dependent_${i}_relationship`,
        pdfField: `${table}.Row4[0].f1_${43 + i}[0]`,
      },
      ...["home", "home_us"].map((fact, j): PdfFieldEntry => ({
        kind: "checkbox",
        domainKey: `dependent_${i}_${fact}`,
        pdfField: `${table}.Row5[0].Dependent${column}[0].c1_${
          12 + 2 * i + j
        }[0]`,
      })),
      ...["full_time_student", "disabled"].map((fact, j): PdfFieldEntry => ({
        kind: "checkbox",
        domainKey: `dependent_${i}_${fact}`,
        pdfField: `${table}.Row6[0].Dependent${column}[0].c1_${
          20 + 2 * i + j
        }[0]`,
      })),
      ...["ctc", "odc"].map((category, j): PdfFieldEntry => ({
        kind: "checkboxWhen",
        domainKey: `dependent_${i}_credit_category`,
        pdfField: `${table}.Row7[0].Dependent${column}[0].c1_${28 + i}[${j}]`,
        whenValue: category,
      })),
    ];
  }).flat(),

  // ── Page 1: Wages (Lines 1a–1z) ───────────────────────────────────────────
  {
    kind: "text",
    domainKey: "line1a_wages",
    pdfField: "topmostSubform[0].Page1[0].f1_47[0]",
  },
  {
    kind: "text",
    domainKey: "line1b_household_wages",
    pdfField: "topmostSubform[0].Page1[0].f1_48[0]",
  },
  {
    kind: "text",
    domainKey: "line1c_unreported_tips",
    pdfField: "topmostSubform[0].Page1[0].f1_49[0]",
  },
  {
    kind: "text",
    domainKey: "line1d_medicaid_waiver",
    pdfField: "topmostSubform[0].Page1[0].f1_50[0]",
  },
  {
    kind: "text",
    domainKey: "line1e_taxable_dep_care",
    pdfField: "topmostSubform[0].Page1[0].f1_51[0]",
  },
  {
    kind: "text",
    domainKey: "line1f_taxable_adoption_benefits",
    pdfField: "topmostSubform[0].Page1[0].f1_52[0]",
  },
  {
    kind: "text",
    domainKey: "line1g_wages_8919",
    pdfField: "topmostSubform[0].Page1[0].f1_53[0]",
  },
  {
    kind: "text",
    domainKey: "print_line1h_type",
    pdfField: "topmostSubform[0].Page1[0].f1_54[0]",
  },
  {
    kind: "text",
    domainKey: "line1h_other_earned",
    pdfField: "topmostSubform[0].Page1[0].f1_55[0]",
  },
  {
    kind: "text",
    domainKey: "line1i_combat_pay",
    pdfField: "topmostSubform[0].Page1[0].f1_56[0]",
  },
  {
    kind: "text",
    domainKey: "line1z_total_wages",
    pdfField: "topmostSubform[0].Page1[0].f1_57[0]",
  },

  // ── Page 1: Income (Lines 2–11) ───────────────────────────────────────────
  // f1_64 and f1_67 are box 3 text spaces on lines 4c and 5c.
  // f1_71 = near line 7b checkbox area — all three skipped.
  {
    kind: "text",
    domainKey: "line2a_tax_exempt",
    pdfField: "topmostSubform[0].Page1[0].f1_58[0]",
  },
  {
    kind: "text",
    domainKey: "line2b_taxable_interest",
    pdfField: "topmostSubform[0].Page1[0].f1_59[0]",
  },
  {
    kind: "text",
    domainKey: "line3a_qualified_dividends",
    pdfField: "topmostSubform[0].Page1[0].f1_60[0]",
  },
  {
    kind: "text",
    domainKey: "line3b_ordinary_dividends",
    pdfField: "topmostSubform[0].Page1[0].f1_61[0]",
  },
  // 2025 line 3c has separate child-dividend boxes for lines 3a and 3b.
  {
    kind: "checkbox",
    domainKey: "print_form8814_line3a_included",
    pdfField: "topmostSubform[0].Page1[0].c1_33[0]",
  },
  {
    kind: "checkbox",
    domainKey: "print_form8814_line3b_included",
    pdfField: "topmostSubform[0].Page1[0].c1_34[0]",
  },
  {
    kind: "text",
    domainKey: "line4a_ira_gross",
    pdfField: "topmostSubform[0].Page1[0].f1_62[0]",
  },
  {
    kind: "text",
    domainKey: "line4b_ira_taxable",
    pdfField: "topmostSubform[0].Page1[0].f1_63[0]",
  },
  {
    kind: "checkbox",
    domainKey: "line4c_ira_rollover",
    pdfField: "topmostSubform[0].Page1[0].c1_35[0]",
  },
  {
    kind: "checkbox",
    domainKey: "print_ira_qcd",
    // 2025 Form 1040 line 4c box 2; see IRS Instructions, line 4c.
    pdfField: "topmostSubform[0].Page1[0].c1_36[0]",
  },
  // f1_64 = line 4c box 3 entry space for another exception.
  {
    kind: "text",
    domainKey: "line5a_pension_gross",
    pdfField: "topmostSubform[0].Page1[0].f1_65[0]",
  },
  {
    kind: "text",
    domainKey: "line5b_pension_taxable",
    pdfField: "topmostSubform[0].Page1[0].f1_66[0]",
  },
  {
    kind: "checkbox",
    domainKey: "line5c_pension_rollover",
    pdfField: "topmostSubform[0].Page1[0].c1_38[0]",
  },
  {
    kind: "checkbox",
    domainKey: "print_pension_pso",
    // 2025 Form 1040 line 5c box 2; see IRS Instructions, line 5c.
    pdfField: "topmostSubform[0].Page1[0].c1_39[0]",
  },
  // f1_67 = line 5c box 3 entry space for another exception.
  {
    kind: "text",
    domainKey: "line6a_ss_gross",
    pdfField: "topmostSubform[0].Page1[0].f1_68[0]",
  },
  {
    kind: "text",
    domainKey: "line6b_ss_taxable",
    pdfField: "topmostSubform[0].Page1[0].f1_69[0]",
  },
  {
    kind: "checkbox",
    domainKey: "print_mfs_lived_apart_entire_year",
    // 2025 line 6d: c1_42 at x467.2, y104.002 in the IRS AcroForm.
    pdfField: "topmostSubform[0].Page1[0].c1_42[0]",
  },
  // Line 7: only one of the two keys is set per return
  {
    kind: "text",
    domainKey: "line7_capital_gain",
    pdfField: "topmostSubform[0].Page1[0].f1_70[0]",
  },
  {
    kind: "text",
    domainKey: "line7a_cap_gain_distrib",
    pdfField: "topmostSubform[0].Page1[0].f1_70[0]",
  },
  {
    kind: "checkbox",
    domainKey: "line7a_cap_gain_distrib",
    pdfField: "topmostSubform[0].Page1[0].c1_43[0]",
  },
  {
    kind: "checkbox",
    domainKey: "print_form8814_line7a_included",
    pdfField: "topmostSubform[0].Page1[0].c1_44[0]",
  },
  // f1_71 skipped (near line 7b check area)
  {
    kind: "text",
    domainKey: "line8_additional_income",
    pdfField: "topmostSubform[0].Page1[0].f1_72[0]",
  },
  {
    kind: "text",
    domainKey: "line9_total_income",
    pdfField: "topmostSubform[0].Page1[0].f1_73[0]",
  },
  {
    kind: "text",
    domainKey: "line10_adjustments",
    pdfField: "topmostSubform[0].Page1[0].f1_74[0]",
  },
  {
    kind: "text",
    domainKey: "line11_agi",
    pdfField: "topmostSubform[0].Page1[0].f1_75[0]",
    extraPdfFields: ["topmostSubform[0].Page2[0].f2_01[0]"],
  },

  // ── Page 2: Deductions (Lines 12–15) ─────────────────────────────────────
  // Lines 12–15 are page 2 only in the 2025 form.
  {
    kind: "checkbox",
    domainKey: "taxpayer_can_be_claimed_as_dependent",
    pdfField: "topmostSubform[0].Page2[0].c2_1[0]",
  },
  {
    kind: "checkbox",
    domainKey: "spouse_can_be_claimed_as_dependent",
    pdfField: "topmostSubform[0].Page2[0].c2_2[0]",
  },
  {
    kind: "checkbox",
    domainKey: "mfs_spouse_itemizing",
    pdfField: "topmostSubform[0].Page2[0].c2_3[0]",
  },
  {
    kind: "checkbox",
    domainKey: "taxpayer_age_65_or_older",
    pdfField: "topmostSubform[0].Page2[0].c2_5[0]",
  },
  {
    kind: "checkbox",
    domainKey: "taxpayer_blind",
    pdfField: "topmostSubform[0].Page2[0].c2_6[0]",
  },
  {
    kind: "checkbox",
    domainKey: "spouse_age_65_or_older",
    pdfField: "topmostSubform[0].Page2[0].c2_7[0]",
  },
  {
    kind: "checkbox",
    domainKey: "spouse_blind",
    pdfField: "topmostSubform[0].Page2[0].c2_8[0]",
  },
  // The selected deduction is the only amount printed on 2025 line 12e.
  // The graph can retain a positive unselected Schedule A comparison amount.
  {
    kind: "text",
    domainKey: "line12c_deduction_total",
    pdfField: "topmostSubform[0].Page2[0].f2_02[0]",
  },
  // f2_03 = line 13a QBI deduction
  {
    kind: "text",
    domainKey: "line13_qbi_deduction",
    pdfField: "topmostSubform[0].Page2[0].f2_03[0]",
  },
  {
    kind: "text",
    domainKey: "line13b_additional_deductions",
    pdfField: "topmostSubform[0].Page2[0].f2_04[0]",
  },
  {
    kind: "text",
    domainKey: "line14_deductions_qbi_total",
    pdfField: "topmostSubform[0].Page2[0].f2_05[0]",
  },
  {
    kind: "text",
    domainKey: "line15_taxable_income",
    pdfField: "topmostSubform[0].Page2[0].f2_06[0]",
  },

  // ── Page 2: Tax and Credits (Lines 16–24) ────────────────────────────────
  // f2_07 = line 16 form-name text box (not a dollar field — skipped).
  // All tax lines shifted +1 vs the pre-2025 descriptor.
  {
    kind: "text",
    domainKey: "line16_income_tax",
    pdfField: "topmostSubform[0].Page2[0].f2_08[0]",
  },
  {
    kind: "checkbox",
    domainKey: "form8814_tax",
    pdfField: "topmostSubform[0].Page2[0].c2_9[0]",
  },
  {
    kind: "checkbox",
    domainKey: "form4972_tax",
    // 2025 line 16 box 2: c2_10 at x370.2, y626.002.
    pdfField: "topmostSubform[0].Page2[0].c2_10[0]",
  },
  {
    kind: "text",
    domainKey: "line17_additional_taxes",
    pdfField: "topmostSubform[0].Page2[0].f2_09[0]",
  },
  {
    kind: "text",
    domainKey: "line18_total_tax_before_credits",
    pdfField: "topmostSubform[0].Page2[0].f2_10[0]",
  },
  {
    kind: "text",
    domainKey: "line19_child_tax_credit",
    pdfField: "topmostSubform[0].Page2[0].f2_11[0]",
  },
  {
    kind: "text",
    domainKey: "line20_nonrefundable_credits",
    pdfField: "topmostSubform[0].Page2[0].f2_12[0]",
  },
  {
    kind: "text",
    domainKey: "line21_credits_total",
    pdfField: "topmostSubform[0].Page2[0].f2_13[0]",
  },
  {
    kind: "text",
    domainKey: "line22_tax_after_credits",
    pdfField: "topmostSubform[0].Page2[0].f2_14[0]",
  },
  {
    kind: "text",
    domainKey: "line23_other_taxes",
    pdfField: "topmostSubform[0].Page2[0].f2_15[0]",
  },
  {
    kind: "text",
    domainKey: "line24_total_tax",
    pdfField: "topmostSubform[0].Page2[0].f2_16[0]",
  },

  // ── Page 2: Payments (Lines 25a–33) ──────────────────────────────────────
  // All payment lines shifted +1. f2_22 = SSN field — skipped.
  {
    kind: "text",
    domainKey: "line25a_w2_withheld",
    pdfField: "topmostSubform[0].Page2[0].f2_17[0]",
  },
  {
    kind: "text",
    domainKey: "line25b_withheld_1099",
    pdfField: "topmostSubform[0].Page2[0].f2_18[0]",
  },
  {
    kind: "text",
    domainKey: "line25c_total",
    pdfField: "topmostSubform[0].Page2[0].f2_19[0]",
  },
  {
    kind: "text",
    domainKey: "line25d_total_withholding",
    pdfField: "topmostSubform[0].Page2[0].f2_20[0]",
  },
  {
    kind: "text",
    domainKey: "line26_estimated_tax",
    pdfField: "topmostSubform[0].Page2[0].f2_21[0]",
  },
  {
    kind: "text",
    domainKey: "print_former_spouse_estimated_tax_ssn",
    pdfField: "topmostSubform[0].Page2[0].SSN_ReadOrder[0].f2_22[0]",
  },
  {
    kind: "text",
    domainKey: "line27_eitc",
    pdfField: "topmostSubform[0].Page2[0].f2_23[0]",
  },
  {
    kind: "checkbox",
    domainKey: "print_do_not_claim_eic",
    pdfField: "topmostSubform[0].Page2[0].c2_13[0]",
  },
  {
    kind: "text",
    domainKey: "line28_actc",
    pdfField: "topmostSubform[0].Page2[0].f2_24[0]",
  },
  {
    kind: "checkbox",
    domainKey: "print_do_not_claim_actc",
    pdfField: "topmostSubform[0].Page2[0].Line28_ReadOrder[0].c2_14[0]",
  },
  {
    kind: "text",
    domainKey: "line29_refundable_aoc",
    pdfField: "topmostSubform[0].Page2[0].f2_25[0]",
  },
  {
    kind: "text",
    domainKey: "line30_refundable_adoption",
    pdfField: "topmostSubform[0].Page2[0].f2_26[0]",
  },
  {
    kind: "text",
    domainKey: "line31_additional_payments",
    pdfField: "topmostSubform[0].Page2[0].f2_27[0]",
  },
  {
    kind: "text",
    domainKey: "line32_refundable_credits_total",
    pdfField: "topmostSubform[0].Page2[0].f2_28[0]",
  },
  {
    kind: "text",
    domainKey: "line33_total_payments",
    pdfField: "topmostSubform[0].Page2[0].f2_29[0]",
  },

  // ── Page 2: Refund / Amount Owed / Penalty (Lines 34–38) ───────────────────
  {
    kind: "text",
    domainKey: "line34_overpayment",
    pdfField: "topmostSubform[0].Page2[0].f2_30[0]",
  },
  {
    kind: "text",
    domainKey: "line35a_refund",
    pdfField: "topmostSubform[0].Page2[0].f2_31[0]",
  },
  {
    kind: "text",
    domainKey: "line36_applied_to_2026_estimated_tax",
    pdfField: "topmostSubform[0].Page2[0].f2_34[0]",
  },
  {
    kind: "checkbox",
    domainKey: "print_form8888_attached",
    // The 2025 line 35a attachment box is c2_15 at x467.2, y290.
    pdfField: "topmostSubform[0].Page2[0].c2_15[0]",
  },
  {
    kind: "text",
    domainKey: "line37_amount_owed",
    pdfField: "topmostSubform[0].Page2[0].f2_35[0]",
  },
  {
    kind: "text",
    domainKey: "line38_underpayment_penalty",
    // 2025 canonical field and widget: f2_36, x=410.4–481.65, y=216–228.
    pdfField: "topmostSubform[0].Page2[0].f2_36[0]",
  },
];

function line1hType(
  fields: Record<string, unknown>,
  allPending: Record<string, Record<string, unknown>>,
): "FEC" | "EXCESS DEFERRALS" | "CORRECTIVE DISTRIBUTION" | undefined {
  const fecSource = allPending.fec;
  const physicalSource = allPending.form2555?.filing_details;
  const sources: Array<{
    type: "FEC" | "EXCESS DEFERRALS" | "CORRECTIVE DISTRIBUTION";
    amount: number;
  }> = [];
  if (fecSource !== undefined) {
    sources.push({
      type: "FEC",
      amount: nativeFecInputSchema.parse(fecSource).fecs.reduce(
        (sum, item) => sum + item.compensation_usd,
        0,
      ),
    });
  }
  if (physicalSource !== undefined) {
    sources.push({
      type: "FEC",
      amount: physicalPresenceFilingSchema.parse(physicalSource).foreign_wages,
    });
  }
  if (allPending.w2 !== undefined) {
    const excess = codeDExcessDeferral(
      w2InputSchema.parse(allPending.w2).w2s,
    );
    if (excess.amount > 0) {
      sources.push({ type: "EXCESS DEFERRALS", amount: excess.amount });
    }
  }
  if (allPending.f1099r !== undefined) {
    const retainedItems = f1099rInputSchema.parse(allPending.f1099r).f1099rs;
    assertDistinct1099RCopies(retainedItems);
    const items = correctivePlanItems(
      retainedItems,
    );
    if (items.length > 0) {
      if (
        items.some((item) =>
          !Number.isSafeInteger(item.box2a_taxable_amount) ||
          (item.box2a_taxable_amount ?? 0) <= 0 ||
          !item.recipient_ssn || !item.ts ||
          !item.source_document_reference ||
          !/^\d{2}-?\d{7}$/.test(item.payer_ein)
        ) ||
        new Set(items.map((item) => item.source_document_reference)).size !==
          items.length
      ) {
        throw new Error(
          "Form 1040 PDF line 1h corrective distributions need identified 2025 Form 1099-R sources",
        );
      }
      sources.push({
        type: "CORRECTIVE DISTRIBUTION",
        amount: items.reduce(
          (sum, item) => sum + item.box2a_taxable_amount!,
          0,
        ),
      });
    }
  }
  if (sources.length === 0) return undefined;
  if (sources.length > 1) {
    throw new Error(
      "Form 1040 PDF line 1h needs separate attribution for mixed earned-income types",
    );
  }
  const sourceWages = sources[0].amount;
  const agiLine1h = allPending.agi_aggregator?.line1h_other_earned;
  const agiWages = typeof agiLine1h === "number"
    ? agiLine1h
    : Array.isArray(agiLine1h) &&
        agiLine1h.every((value) => typeof value === "number")
    ? agiLine1h.reduce((sum, value) => sum + value, 0)
    : undefined;
  if (
    !Number.isFinite(sourceWages) || sourceWages <= 0 ||
    fields.line1h_other_earned !== sourceWages || agiWages !== sourceWages
  ) {
    throw new Error(
      "Form 1040 PDF line 1h source must equal finalized and AGI line 1h",
    );
  }
  return sources[0].type;
}

export const irs1040Pdf: PdfFormDescriptor = {
  pendingKey: "f1040",
  // Year-pinned: /pub/irs-pdf/f1040.pdf silently changes revision each filing
  // season; this module is the 2025 form and must always fetch the 2025 PDF.
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f1040--2025.pdf",
  projectFields(fields, allPending) {
    const hasForm8888 = allPending.f8888 !== undefined;
    if (
      hasForm8888 &&
      (typeof fields.line35a_refund !== "number" ||
        !Number.isFinite(fields.line35a_refund) ||
        fields.line35a_refund <= 0)
    ) {
      throw new Error("Form 1040 Form 8888 requires a positive refund");
    }
    assertIdentified1099IntOwner(fields, allPending);
    assertPositive1099OidOwner(fields, allPending);
    assertPositive1099DivOwner(fields, allPending);
    assertPositive1099GOwner(fields, allPending);
    assertPositive1099MOwner(fields, allPending);
    assertPositive1099NecOwner(fields, allPending);
    assertPositive1099PatrOwner(fields, allPending);
    assertJointDependentRefundSource(fields, allPending);
    assertNoUnsupportedDeceasedReturn(
      fields,
      allPending?.general as Record<string, unknown> | undefined,
    );
    assertLine36EstimatedTaxSource(fields, allPending);
    assertPresidentialCampaignSource(fields, allPending);
    assertReturnWideArithmetic(fields);
    const printLine1hType = line1hType(fields, allPending);
    assertLine1hSupportedSource(fields, allPending);
    assertDirectCapitalGainDistributionSource(fields, allPending);
    const standard = fields.line12a_standard_deduction;
    const itemized = fields.line12e_itemized_deductions;
    const selected = typeof standard === "number"
      ? standard
      : typeof itemized === "number"
      ? Math.max(0, itemized)
      : undefined;
    if (
      selected !== undefined &&
      fields.line12c_deduction_total !== selected
    ) {
      throw new Error(
        "Form 1040 PDF line 12e differs from the selected deduction",
      );
    }
    const printFormerSpouseEstimatedTaxSsn = assertEstimatedPaymentLine26(
      fields,
      allPending,
    );
    assertOtherFormsWithholding(fields, allPending);
    assertReturnScheduleJoins(fields, allPending);
    assertSchedule2Line23(fields, allPending);
    const residentElection = residentElectionName(fields, allPending);
    const printEicOptOut = retainedEicOptOut(fields, allPending);
    assertMfsEitcSource(
      fields.filing_status,
      fields.mfs_eitc_separation_rule,
      typeof fields.line27_eitc === "number" ? fields.line27_eitc : undefined,
      allPending,
    );
    assertEicSource(
      fields.filing_status,
      typeof fields.line27_eitc === "number" ? fields.line27_eitc : undefined,
      fields.main_home_in_us_over_half_year,
      allPending,
    );
    const dependents = dependentFilingSchema.array().parse(
      fields.dependent_details ?? [],
    );
    if (
      fields.dependent_count !== undefined &&
      fields.dependent_count !== dependents.length
    ) {
      throw new Error("Form 1040 PDF dependent count differs from filed rows");
    }
    const printedDependents: Record<string, unknown> = {};
    dependents.forEach((dep, i) => {
      if (dep.lived_in_us_over_half_year === undefined) {
        throw new Error(
          "Form 1040 PDF dependent needs a reviewed U.S.-residence answer",
        );
      }
      if (i >= 4) return;
      printedDependents[`dependent_${i}_first_name`] = dep.first_name;
      printedDependents[`dependent_${i}_last_name`] = dep.last_name;
      printedDependents[`dependent_${i}_tin`] =
        (dep.ssn ?? dep.itin ?? dep.atin)?.replaceAll("-", "");
      printedDependents[`dependent_${i}_relationship`] = dep.relationship;
      printedDependents[`dependent_${i}_home`] =
        dependentLivedWithFilerOverHalfYear(dep);
      printedDependents[`dependent_${i}_home_us`] =
        dep.lived_in_us_over_half_year;
      printedDependents[`dependent_${i}_full_time_student`] =
        dep.full_time_student === true;
      printedDependents[`dependent_${i}_disabled`] = dep.disabled === true;
      printedDependents[`dependent_${i}_credit_category`] =
        dep.credit_category === DependentCreditCategory.None
          ? undefined
          : dep.credit_category;
    });
    const iraRollover = fields.line4c_ira_rollover === true;
    const rollover = fields.line5c_pension_rollover === true;
    let printIraQcd = false;
    let printPensionPso = false;
    if (
      fields.line4c_ira_rollover !== undefined &&
      typeof fields.line4c_ira_rollover !== "boolean"
    ) {
      throw new Error("Form 1040 PDF line 4c rollover must be a boolean");
    }
    if (
      fields.line5c_pension_rollover !== undefined &&
      typeof fields.line5c_pension_rollover !== "boolean"
    ) {
      throw new Error("Form 1040 PDF line 5c rollover must be a boolean");
    }
    if (iraRollover || rollover || allPending.f1099r !== undefined) {
      const source = f1099rInputSchema.safeParse(allPending.f1099r);
      if (!source.success) {
        throw new Error(
          "Form 1040 PDF line 5c needs valid Form 1099-R source facts",
        );
      }
      assertIraRolloverEvidence(source.data.f1099rs);
      if (rollover !== source.data.f1099rs.some(isPensionDirectRollover)) {
        throw new Error(
          "Form 1040 PDF line 5c rollover does not match the payer-reported Form 1099-R code G",
        );
      }
      if (iraRollover !== source.data.f1099rs.some(isIraRollover)) {
        throw new Error(
          "Form 1040 PDF line 4c rollover does not match the reviewed IRA Form 1099-R source",
        );
      }
      for (const item of source.data.f1099rs) {
        if (item.no_distribution_received === true) continue;
        if (item.qcd_full === true || (item.qcd_partial_amount ?? 0) > 0) {
          if (item.box7_ira_simple_indicator !== true) {
            throw new Error("Form 1040 PDF line 4c QCD needs an IRA source");
          }
          if (
            item.exclude_4972 === true || item.exclude_8606_roth === true
          ) {
            throw new Error(
              "Form 1040 PDF line 4c QCD needs reported IRA gross",
            );
          }
          printIraQcd = true;
        }
        if ((item.pso_premium ?? 0) > 0) {
          if (item.box7_ira_simple_indicator === true) {
            throw new Error("Form 1040 PDF line 5c PSO needs a pension source");
          }
          if (
            item.disability_flag === true && item.disability_as_wages === true
          ) {
            throw new Error(
              "Form 1040 PDF line 5c PSO cannot label disability wages on line 1h",
            );
          }
          printPensionPso = true;
        }
      }
      if (printIraQcd && !(Number(fields.line4a_ira_gross) > 0)) {
        throw new Error("Form 1040 PDF line 4c QCD needs IRA line 4a");
      }
      if (printPensionPso && !(Number(fields.line5a_pension_gross) > 0)) {
        throw new Error("Form 1040 PDF line 5c PSO needs pension line 5a");
      }
    }
    if (
      typeof fields.line13b_additional_deductions === "number" &&
      fields.line13b_additional_deductions > 0
    ) {
      const projected = schedule1aPdf.projectFields?.(
        allPending.schedule1a ?? {},
        allPending,
      );
      if (projected?.line38_total !== fields.line13b_additional_deductions) {
        throw new Error(
          "Form 1040 PDF line 13b needs a reconciled Schedule 1-A page",
        );
      }
    }
    const child = form8814ParentPrintAmounts(allPending);
    if (
      child.dividends > 0 &&
      ((typeof fields.line3a_qualified_dividends !== "number" ||
        fields.line3a_qualified_dividends < child.dividends) ||
        (typeof fields.line3b_ordinary_dividends !== "number" ||
          fields.line3b_ordinary_dividends < child.dividends))
    ) {
      throw new Error(
        "Form 1040 PDF child-dividend marks need the Form 8814 amount on lines 3a and 3b",
      );
    }
    const childGainDirect = child.capitalGain > 0 &&
      typeof fields.line7a_cap_gain_distrib === "number" &&
      fields.line7a_cap_gain_distrib >= child.capitalGain;
    const childGainOnScheduleD = child.capitalGain > 0 &&
      typeof fields.line7_capital_gain === "number" &&
      typeof allPending.schedule_d?.print_line13_cap_gain_distrib ===
        "number" &&
      allPending.schedule_d.print_line13_cap_gain_distrib >= child.capitalGain;
    if (childGainDirect && childGainOnScheduleD) {
      throw new Error(
        "Form 1040 PDF child capital gain cannot use direct line 7a and Schedule D together",
      );
    }
    if (child.capitalGain > 0 && !childGainDirect && !childGainOnScheduleD) {
      throw new Error(
        "Form 1040 PDF child capital gain needs the Form 8814 amount on line 7a or Schedule D line 13",
      );
    }
    const printMfsSpouseName = fields.filing_status === "mfs" &&
        typeof fields.spouse_first_name === "string" &&
        typeof fields.spouse_last_name === "string"
      ? `${fields.spouse_first_name} ${fields.spouse_last_name}`
      : undefined;
    return {
      ...fields,
      ...printedDependents,
      print_former_spouse_estimated_tax_ssn: printFormerSpouseEstimatedTaxSsn,
      print_foreign_country_name: typeof fields.address_foreign_country ===
            "string" && fields.address_foreign_country.length > 0
        ? new Intl.DisplayNames(["en"], { type: "region" }).of(
          fields.address_foreign_country,
        )
        : undefined,
      print_line1h_type: printLine1hType,
      print_do_not_claim_actc: retainedActcOptOut(
        allPending.f8812,
        fields.line28_actc,
      ),
      print_do_not_claim_eic: printEicOptOut,
      print_ira_qcd: printIraQcd,
      print_pension_pso: printPensionPso,
      print_resident_election: residentElection !== undefined,
      print_resident_election_name: residentElection,
      print_mfs_spouse_full_name: printMfsSpouseName,
      print_mfs_lived_apart_entire_year: fields.filing_status === "mfs" &&
        fields.mfs_spouse_lived_with_taxpayer === false,
      print_more_than_four_dependents: dependents.length > 4,
      ...(iraRollover && fields.line4b_ira_taxable === 0
        ? { line4b_ira_taxable: "0" }
        : {}),
      ...(rollover && fields.line5b_pension_taxable === 0
        ? { line5b_pension_taxable: "0" }
        : {}),
      print_form8888_attached: hasForm8888,
      print_form8814_line3a_included: child.dividends > 0,
      print_form8814_line3b_included: child.dividends > 0,
      print_form8814_line7a_included: childGainDirect,
      print_form8814_line7a_note: childGainDirect
        ? `Form 8814 $${child.capitalGain}`
        : undefined,
    };
  },
  fields,
  async decoratePages(document, pages, fields) {
    const note = fields.print_form8814_line7a_note;
    const page = pages[0];
    if (!page || typeof note !== "string") return;
    const font = await document.embedFont(StandardFonts.Helvetica);
    // The 2025 source PDF places line 7a's dotted space at x312-470,
    // y91-101; the amount field starts at x504. Keep attribution on that line.
    page.drawRectangle({
      x: 312,
      y: 91,
      width: 158,
      height: 11,
      color: rgb(1, 1, 1),
    });
    page.drawText(note, { x: 315, y: 93, size: 7, font });
  },
  async appendSupplementalPages(document, fields, filer, allPending) {
    await appendDependentContinuation(
      document,
      fields.dependent_details,
      filer,
    );
    await appendIraDistributionStatement(document, allPending?.f1099r, filer);
  },
  filerFields: [
    // domainKey uses dot-notation to traverse FilerIdentity (resolved in builder).
    // ── Primary taxpayer ────────────────────────────────────────────────────
    // Field numbers verified against 2025 IRS f1040.pdf AcroForm layer.
    // f1_14 = "Your first name and middle initial", f1_15 = "Last name", f1_16 = SSN (maxLen=9)
    {
      kind: "text",
      domainKey: "firstNameWithInitial",
      pdfField: "topmostSubform[0].Page1[0].f1_14[0]",
    },
    {
      kind: "text",
      domainKey: "lastName",
      pdfField: "topmostSubform[0].Page1[0].f1_15[0]",
    },
    {
      kind: "text",
      domainKey: "primarySSN",
      pdfField: "topmostSubform[0].Page1[0].f1_16[0]",
    },
    // The final MeF/PDF source guard owns the single-account refund election.
    // The 2025 IRS Form 1040 AcroForm places lines 35b–d on page 2.
    {
      kind: "text",
      domainKey: "bankAccount.routingNumber",
      pdfField: "topmostSubform[0].Page2[0].RoutingNo[0].f2_32[0]",
    },
    {
      kind: "checkboxWhen",
      domainKey: "bankAccount.accountType",
      pdfField: "topmostSubform[0].Page2[0].c2_16[0]",
      whenValue: AccountType.Checking,
    },
    {
      kind: "checkboxWhen",
      domainKey: "bankAccount.accountType",
      pdfField: "topmostSubform[0].Page2[0].c2_16[1]",
      whenValue: AccountType.Savings,
    },
    {
      kind: "text",
      domainKey: "bankAccount.accountNumber",
      pdfField: "topmostSubform[0].Page2[0].AccountNo[0].f2_33[0]",
    },
    // ── Sign Here block (page 2): occupation ───────────────────────────────
    {
      kind: "text",
      domainKey: "occupation",
      pdfField: "topmostSubform[0].Page2[0].f2_40[0]",
    },
    {
      kind: "text",
      domainKey: "ipPin",
      pdfField: "topmostSubform[0].Page2[0].f2_41[0]",
    },
    {
      kind: "text",
      domainKey: "spouse.occupation",
      pdfField: "topmostSubform[0].Page2[0].f2_42[0]",
    },
    {
      kind: "text",
      domainKey: "spouse.ipPin",
      pdfField: "topmostSubform[0].Page2[0].f2_43[0]",
    },
    {
      kind: "text",
      domainKey: "phone",
      pdfField: "topmostSubform[0].Page2[0].f2_44[0]",
    },
    {
      kind: "text",
      domainKey: "email",
      pdfField: "topmostSubform[0].Page2[0].f2_45[0]",
    },
    // ── Spouse ──────────────────────────────────────────────────────────────
    // f1_17 = "Spouse's first name and middle initial", f1_18 = "Last name", f1_19 = spouse SSN
    {
      kind: "text",
      domainKey: "spouse.firstName",
      pdfField: "topmostSubform[0].Page1[0].f1_17[0]",
    },
    {
      kind: "text",
      domainKey: "spouse.lastName",
      pdfField: "topmostSubform[0].Page1[0].f1_18[0]",
    },
    {
      kind: "text",
      domainKey: "spouse.ssn",
      pdfField: "topmostSubform[0].Page1[0].f1_19[0]",
    },
    // ── Address ─────────────────────────────────────────────────────────────
    {
      kind: "text",
      domainKey: "address.line1",
      pdfField: "topmostSubform[0].Page1[0].Address_ReadOrder[0].f1_20[0]",
    },
    {
      kind: "text",
      domainKey: "address.line2",
      pdfField: "topmostSubform[0].Page1[0].Address_ReadOrder[0].f1_21[0]",
    },
    {
      kind: "text",
      domainKey: "address.city",
      pdfField: "topmostSubform[0].Page1[0].Address_ReadOrder[0].f1_22[0]",
    },
    {
      kind: "text",
      domainKey: "address.state",
      pdfField: "topmostSubform[0].Page1[0].Address_ReadOrder[0].f1_23[0]",
    },
    {
      kind: "text",
      domainKey: "address.zip",
      pdfField: "topmostSubform[0].Page1[0].Address_ReadOrder[0].f1_24[0]",
    },
    {
      kind: "text",
      domainKey: "address.foreignProvinceState",
      pdfField: "topmostSubform[0].Page1[0].Address_ReadOrder[0].f1_26[0]",
    },
    {
      kind: "text",
      domainKey: "address.foreignPostalCode",
      pdfField: "topmostSubform[0].Page1[0].Address_ReadOrder[0].f1_27[0]",
    },
  ],
};

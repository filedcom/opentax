import { assertRetirementStateLocalTaxSource } from "../../../../domains/income/retirement/retirement_state_local_tax_source.ts";
import type { PdfFieldEntry, PdfFormDescriptor } from "../../../review-support/form-descriptor.ts";
import { FilingStatus } from "../../../../../mef/header.ts";
import {
  assertForm1098Box1Sources,
  assertForm1098Box6Sources,
  assertForm1098Line8aAmount,
  assertForm1098Line8aSourcePresence,
  assertForm1098MortgageLimitSources,
  assertPurchasePointsCrossLoanSources,
} from "../../../../../nodes/inputs/deductions/mortgage/f1098/index.ts";
import { assertRefinancePointsSource } from "../../../../../nodes/inputs/deductions/mortgage/mortgage_refinance_points/index.ts";
import {
  assertElectedSectionAReconciled,
  assertOrdinarySectionAReconciled,
} from "../../../../mef/forms/deductions/charitable/f8283/f8283_election.ts";
import { inputSchema as form8283InputSchema } from "../../../../../nodes/inputs/deductions/charitable/f8283/index.ts";
import { reconcileForm8283Carryover } from "../../../../mef/forms/deductions/charitable/f8283/f8283_carryover.ts";
import {
  inputSchema as scheduleAInputSchema,
  reviewedHomeMortgageNonqualifyingUse,
  scheduleA,
} from "../../../../../nodes/inputs/deductions/itemized/schedule_a/index.ts";
import { itemizeBelowStandardElection } from "../../../../domains/deductions/itemized/schedule-a/schedule_a_line18_election.ts";
import {
  scheduleAOtherTaxDescription,
  scheduleAOtherTaxRows,
} from "../../../../domains/deductions/itemized/schedule-a/schedule_a_other_tax_source.ts";
import { sellerFinancedLine8b } from "../../../../domains/deductions/itemized/schedule-a/schedule_a_line8b_source.ts";
import { scheduleALine16EstateTax } from "../../../../domains/deductions/itemized/schedule-a/schedule_a_line16_estate_source.ts";

// IRS Schedule A (2025) AcroForm field names.
// Verified layout from https://www.irs.gov/pub/irs-prior/f1040sa--2025.pdf
//
// The official AcroForm includes name and SSN as f1_1/f1_2. Subsequent
// numbers follow physical widget order, including unnumbered subtotal fields.

const fields: ReadonlyArray<PdfFieldEntry> = [
  // ── Medical and Dental Expenses ──────────────────────────────────────────────
  {
    kind: "text",
    domainKey: "line_1_medical",
    pdfField: "form1[0].Page1[0].f1_3[0]",
  },
  {
    kind: "text",
    domainKey: "agi",
    pdfField: "form1[0].Page1[0].Line2_ReadOrder[0].f1_4[0]",
  },
  {
    kind: "text",
    domainKey: "line_3_medical_floor",
    pdfField: "form1[0].Page1[0].f1_5[0]",
  },
  {
    kind: "text",
    domainKey: "line_4_medical_deduction",
    pdfField: "form1[0].Page1[0].f1_6[0]",
  },

  // ── Taxes You Paid ───────────────────────────────────────────────────────────
  // IRC §164(b)(5) election: state income tax or sales tax — mutually exclusive.
  // Both map to the same PDF field (line 5a). Only one will be nonzero at runtime.
  {
    kind: "text",
    domainKey: "line_5a_state_income_tax",
    pdfField: "form1[0].Page1[0].f1_7[0]",
  },
  {
    kind: "text",
    domainKey: "line_5a_sales_tax",
    pdfField: "form1[0].Page1[0].f1_7[0]",
  },
  {
    kind: "checkbox",
    domainKey: "print_line_5a_sales_tax_election",
    pdfField: "form1[0].Page1[0].c1_1[0]",
  },
  {
    kind: "text",
    domainKey: "line_5b_real_estate_tax",
    pdfField: "form1[0].Page1[0].f1_8[0]",
  },
  {
    kind: "text",
    domainKey: "line_5c_personal_property_tax",
    pdfField: "form1[0].Page1[0].f1_9[0]",
  },
  {
    kind: "text",
    domainKey: "line_5d_salt_before_cap",
    pdfField: "form1[0].Page1[0].f1_10[0]",
  },
  {
    kind: "text",
    domainKey: "line_5e_salt_deduction",
    pdfField: "form1[0].Page1[0].f1_11[0]",
  },
  {
    kind: "text",
    domainKey: "print_line_6_other_tax_description",
    pdfField: "form1[0].Page1[0].f1_12[0]",
  },
  {
    kind: "text",
    domainKey: "line_6_other_taxes",
    pdfField: "form1[0].Page1[0].f1_13[0]",
  },
  {
    kind: "text",
    domainKey: "line_7_taxes",
    pdfField: "form1[0].Page1[0].f1_14[0]",
  },

  // ── Interest You Paid ────────────────────────────────────────────────────────
  {
    kind: "checkbox",
    domainKey: "print_line_8_mortgage_use_warning",
    pdfField: "form1[0].Page1[0].Line8_ReadOrder[0].c1_2[0]",
  },
  {
    kind: "text",
    domainKey: "line_8a_mortgage_interest_1098",
    pdfField: "form1[0].Page1[0].f1_15[0]",
  },
  {
    kind: "text",
    domainKey: "print_line_8b_seller_details",
    pdfField: "form1[0].Page1[0].Line8b_ReadOrder[0].f1_16[0]",
  },
  {
    kind: "text",
    domainKey: "line_8b_mortgage_interest_no_1098",
    pdfField: "form1[0].Page1[0].f1_17[0]",
  },
  {
    kind: "text",
    domainKey: "line_8c_points_no_1098",
    pdfField: "form1[0].Page1[0].f1_18[0]",
  },
  {
    kind: "text",
    domainKey: "line_8e_mortgage_interest",
    pdfField: "form1[0].Page1[0].f1_20[0]",
  },
  {
    kind: "text",
    domainKey: "line_9_investment_interest",
    pdfField: "form1[0].Page1[0].f1_21[0]",
  },
  {
    kind: "text",
    domainKey: "line_10_interest",
    pdfField: "form1[0].Page1[0].f1_22[0]",
  },

  // ── Gifts to Charity ─────────────────────────────────────────────────────────
  {
    kind: "text",
    domainKey: "line_11_cash_contributions",
    pdfField: "form1[0].Page1[0].f1_23[0]",
  },
  {
    kind: "text",
    domainKey: "line_12_noncash_contributions",
    pdfField: "form1[0].Page1[0].f1_24[0]",
  },
  {
    kind: "text",
    domainKey: "line_13_contribution_carryover",
    pdfField: "form1[0].Page1[0].f1_25[0]",
  },
  {
    kind: "text",
    domainKey: "line_14_charity",
    pdfField: "form1[0].Page1[0].f1_26[0]",
  },

  // ── Casualty and Theft Losses ────────────────────────────────────────────────
  {
    kind: "text",
    domainKey: "line_15_casualty_theft_loss",
    pdfField: "form1[0].Page1[0].f1_27[0]",
  },

  // ── Other Itemized Deductions ────────────────────────────────────────────────
  {
    kind: "text",
    domainKey: "print_line_16_description",
    pdfField: "form1[0].Page1[0].f1_28[0]",
  },
  {
    kind: "text",
    domainKey: "line_16_other_deductions",
    pdfField: "form1[0].Page1[0].f1_29[0]",
  },
  {
    kind: "text",
    domainKey: "line_17_itemized",
    pdfField: "form1[0].Page1[0].f1_30[0]",
    printZero: true,
  },
  {
    kind: "checkbox",
    domainKey: "print_line_18_itemize_election",
    pdfField: "form1[0].Page1[0].Line18_ReadOrder[0].c1_3[0]",
  },
];

export const scheduleAPdf: PdfFormDescriptor = {
  pendingKey: "schedule_a",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f1040sa--2025.pdf",
  filerFields: [
    {
      kind: "text",
      domainKey: "nameShownOnForm1040",
      pdfField: "form1[0].Page1[0].f1_1[0]",
    },
    {
      kind: "text",
      domainKey: "primarySSN",
      pdfField: "form1[0].Page1[0].f1_2[0]",
    },
  ],
  fields,
  instances(input, filer, all) {
    if (
      !(Number(all?.f1040?.line12e_itemized_deductions ?? 0) > 0) &&
      !(input.force_itemized === true &&
        all?.f1040?.line12e_itemized_deductions === 0)
    ) {
      return [];
    }
    assertForm1098Line8aSourcePresence(
      all?.f1098,
      Number(input.line_8a_mortgage_interest_1098 ?? 0),
    );
    if (all?.f1098 !== undefined) {
      if (!filer) {
        throw new Error("Schedule A PDF Form 1098 box 6 needs filer identity");
      }
      const recipients = [filer.primarySSN];
      if (
        filer.filingStatus === FilingStatus.MarriedFilingJointly &&
        filer.spouse?.ssn
      ) {
        recipients.push(filer.spouse.ssn);
      }
      assertForm1098Box6Sources(
        all.f1098,
        recipients,
        Number(input.line_8a_mortgage_interest_1098 ?? 0),
      );
      assertForm1098MortgageLimitSources(
        all.f1098,
        recipients,
        filer.filingStatus,
        Number(input.line_8a_mortgage_interest_1098 ?? 0),
        Number(input.line_8b_mortgage_interest_no_1098 ?? 0),
        Number(input.line_8c_points_no_1098 ?? 0),
        all.mortgage_refinance_points !== undefined,
        all.form8396 !== undefined,
        input.home_mortgage_nonqualifying_use_review,
        (all.mortgage_refinance_points as
          | { cashout_source?: unknown }
          | undefined)?.cashout_source !== undefined,
        filer.spouse?.ssn,
      );
      assertPurchasePointsCrossLoanSources(
        all.f1098,
        recipients,
        filer.filingStatus === FilingStatus.Single,
        Number(input.line_8a_mortgage_interest_1098 ?? 0),
        Number(input.line_8b_mortgage_interest_no_1098 ?? 0),
        Number(input.line_8c_points_no_1098 ?? 0),
        all.mortgage_refinance_points !== undefined,
        all.form8396 !== undefined,
      );
      assertForm1098Box1Sources(all.f1098, recipients);
      assertForm1098Line8aAmount(
        all.f1098,
        Number(input.line_8a_mortgage_interest_1098 ?? 0),
      );
    }
    if (all?.mortgage_refinance_points !== undefined) {
      if (!filer) {
        throw new Error("Schedule A refinance points PDF needs filer identity");
      }
      const recipients = [filer.primarySSN];
      if (
        filer.filingStatus === FilingStatus.MarriedFilingJointly &&
        filer.spouse?.ssn
      ) recipients.push(filer.spouse.ssn);
      assertRefinancePointsSource(
        all.mortgage_refinance_points,
        all.f1098,
        recipients,
        Number(input.line_8c_points_no_1098 ?? 0),
      );
    }
    const hasPriorCarryover = [
      input.capital_gain_property_carryovers,
      all?.schedule_a?.capital_gain_property_carryovers,
    ].some((value) => Array.isArray(value) && value.length > 0);
    if (hasPriorCarryover) {
      reconcileForm8283Carryover(
        form8283InputSchema.parse(all?.f8283),
        { pending: all, filer },
        input,
      );
    }
    const {
      line_11_cash_contributions: _cash,
      line_12_noncash_contributions: _noncash,
      line_13_contribution_carryover: _carryover,
      charitable_limits_finalized: _limits,
      capital_gain_election_finalized: _election,
      ...source
    } = input;
    assertRetirementStateLocalTaxSource(all, input);
    const parsed = scheduleAInputSchema.parse(source);
    const recomputed = scheduleA.compute(
      { taxYear: 2025, formType: "f1040" },
      parsed,
    );
    const standard = recomputed.outputs.find((output) =>
      output.nodeType === "standard_deduction"
    )?.fields;
    if (
      !standard || standard.itemized_deductions !==
        all?.f1040?.line12e_itemized_deductions
    ) {
      throw new Error(
        "Schedule A PDF source differs from Form 1040 itemized deductions",
      );
    }
    const amount = (key: string) => Number(input[key] ?? 0);
    const saltBeforeCap = amount("line_5a_state_income_tax") +
      amount("retirement_state_local_withholding") +
      amount("line_5a_sales_tax") + amount("line_5b_real_estate_tax") +
      amount("line_5c_personal_property_tax");
    const taxes = Number(standard.itemized_taxes);
    const salt = taxes - amount("line_6_other_taxes");
    const reduction = amount("form8396_interest_credit_reduction");
    const reportingLine = input.form8396_interest_reporting_line;
    const creditedInterest = reportingLine === "8a"
      ? amount("line_8a_mortgage_interest_1098")
      : amount("line_8b_mortgage_interest_no_1098");
    const form8396 = all?.form8396;
    if (
      reduction > 0 &&
      ((reportingLine !== "8a" && reportingLine !== "8b") ||
        reduction > creditedInterest || form8396?.line3 !== reduction ||
        form8396.interest_reporting_line !== reportingLine)
    ) {
      throw new Error(
        "Schedule A PDF mortgage-interest reduction differs from Form 8396 line 3 or deductible interest",
      );
    }
    const line8a = amount("line_8a_mortgage_interest_1098") -
      (reportingLine === "8a" ? reduction : 0);
    const line8b = amount("line_8b_mortgage_interest_no_1098") -
      (reportingLine === "8b" ? reduction : 0);
    const mortgageInterest = line8a + line8b +
      amount("line_8c_points_no_1098");
    const interest = mortgageInterest + amount("line_9_investment_interest");
    const charity = amount("line_11_cash_contributions") +
      amount("line_12_noncash_contributions") +
      amount("line_13_contribution_carryover");
    const itemizeBelowStandard = itemizeBelowStandardElection(
      input.force_itemized,
      all?.standard_deduction,
      standard.itemized_deductions,
    );
    const otherTaxRows = scheduleAOtherTaxRows(input);
    const line8bSeller = sellerFinancedLine8b(input);
    const line16EstateTax = scheduleALine16EstateTax(
      all,
      input.line_16_other_deductions,
    );
    return [{
      ...input,
      line_5a_state_income_tax: amount("line_5a_state_income_tax") +
        amount("retirement_state_local_withholding"),
      line_8a_mortgage_interest_1098: line8a,
      line_8b_mortgage_interest_no_1098: line8b,
      print_line_8b_seller_details: line8bSeller?.description,
      line_8e_mortgage_interest: mortgageInterest,
      print_line_8_mortgage_use_warning: reviewedHomeMortgageNonqualifyingUse(
        input,
      ),
      line_3_medical_floor: amount("line_1_medical") > 0
        ? Math.max(0, amount("agi")) * 0.075
        : undefined,
      line_4_medical_deduction: Math.max(
        0,
        amount("line_1_medical") - Math.max(0, amount("agi")) * 0.075,
      ),
      line_5d_salt_before_cap: saltBeforeCap,
      print_line_5a_sales_tax_election: amount("line_5a_sales_tax") > 0,
      line_5e_salt_deduction: salt,
      line_7_taxes: taxes,
      print_line_6_other_tax_description: scheduleAOtherTaxDescription(
        otherTaxRows,
      ),
      line_10_interest: interest,
      line_14_charity: charity,
      print_line_16_description: line16EstateTax > 0
        ? `Federal estate tax: ${line16EstateTax}`
        : undefined,
      line_17_itemized: standard.itemized_deductions,
      print_line_18_itemize_election: itemizeBelowStandard,
    }];
  },
  // Schedule A is filed only when the return actually itemizes (1040 line 12
  // carries an itemized amount) — not merely because AGI was deposited here.
  includeWhen: (input, all) => {
    const filed = (all?.["f1040"]?.["line12e_itemized_deductions"]) as
      | number
      | undefined;
    const itemizes = (filed ?? 0) > 0 ||
      (input.force_itemized === true && filed === 0);
    if (!itemizes) return false;
    const hasPriorCarryover = [
      input["capital_gain_property_carryovers"],
      all?.schedule_a?.capital_gain_property_carryovers,
    ].some((value) => Array.isArray(value) && value.length > 0);
    if (
      input["capital_gain_election_finalized"] === true &&
      !hasPriorCarryover
    ) {
      assertElectedSectionAReconciled({ pending: all }, input);
    }
    const noncashItems = all?.schedule_a?.noncash_contribution_items;
    const hasLinkedCapitalGainReductionGift = Array.isArray(noncashItems) &&
      noncashItems.some((item) =>
        item !== null && typeof item === "object" &&
        ((item as Record<string, unknown>)
              .unrelated_use_capital_gain_reduction_confirmed === true ||
          (item as Record<string, unknown>)
              .private_foundation_capital_gain_reduction_confirmed === true ||
          (item as Record<string, unknown>)
              .taxidermy_capital_gain_reduction_confirmed === true ||
          (item as Record<string, unknown>)
              .intellectual_property_capital_gain_reduction_confirmed === true)
      );
    if (hasLinkedCapitalGainReductionGift && !all?.f8283) {
      throw new Error(
        "Schedule A capital-gain FMV reduction PDF needs its linked Form 8283 source",
      );
    }
    const form8283Source = all?.f8283
      ? form8283InputSchema.parse(all.f8283)
      : undefined;
    if (
      (form8283Source?.section_a_items ?? []).some((item) =>
        item.unrelated_use_capital_gain_reduction !== undefined ||
        item.private_foundation_capital_gain_reduction !== undefined ||
        item.taxidermy_capital_gain_reduction !== undefined ||
        item.intellectual_property_capital_gain_reduction !== undefined
      )
    ) {
      assertOrdinarySectionAReconciled({ pending: all }, input);
    }
    const amount = (key: string) => Number(input[key] ?? 0);
    if (
      (amount("line_11_cash_contributions") > 0 ||
        amount("line_12_noncash_contributions") > 0 ||
        amount("line_13_contribution_carryover") > 0) &&
      input["charitable_limits_finalized"] !== true
    ) {
      throw new Error(
        "Schedule A PDF charitable lines require categorized-source AGI-limit finalization",
      );
    }
    return true;
  },
};

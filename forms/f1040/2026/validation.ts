import { rule } from "../../../core/validation/rule-builder.ts";
import { calculateSettlement2026 } from "./settlement.ts";
import type {
  FieldRegistry,
  ReturnContext,
  RuleDef,
} from "../../../core/validation/types.ts";

function number(ctx: ReturnContext, form: string, key: string): number {
  const value = ctx.pendingField(form, key);
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function f1040(ctx: ReturnContext, key: string): number {
  return number(ctx, "f1040", key);
}

const requiredAmountKeys = [
  "line9_total_income",
  "line10_adjustments",
  "line11a_agi",
  "line11b_agi",
  "line12e_standard_or_itemized",
  "line12f_nonitemizer_charity",
  "line13a_schedule1a",
  "line13b_qbi",
  "line14_total_deductions",
  "line15_taxable_income",
  "line16_income_tax",
  "line17_additional_taxes",
  "line18_total_tax_before_credits",
  "line19_child_tax_credit",
  "line20_nonrefundable_credits",
  "line21_credits_total",
  "line22_tax_after_credits",
  "line23_other_taxes",
  "line24a_total_tax",
  "line24b_form1062",
  "line24c_total_tax",
  "line25a_w2_withheld",
  "line25b_withheld_1099",
  "line25c_other_withheld",
  "line25d_total_withholding",
  "line26_estimated_payments",
  "line27a_eic",
  "line28_actc",
  "line29_refundable_aotc",
  "line30_refundable_adoption",
  "line31_other_payments",
  "line32a_refundable_credits",
  "line32b_public_benefit_reduction",
  "line32c_net_refundable_credits",
  "line33_total_payments",
  "line34_overpayment",
  "line35a_refund",
  "line36_apply_to_2027",
  "line37_amount_owed",
] as const;

function settlementConsistent(ctx: ReturnContext): boolean {
  const choice = (key: string) => {
    const value = ctx.pendingField("schedule3a", key);
    return typeof value === "boolean" ? value : undefined;
  };
  try {
    const expected = calculateSettlement2026({
      line22TaxAfterCredits: f1040(ctx, "line22_tax_after_credits"),
      line23OtherTaxes: f1040(ctx, "line23_other_taxes"),
      form1062Line15: f1040(ctx, "line24b_form1062"),
      line25dWithholding: f1040(ctx, "line25d_total_withholding"),
      line26EstimatedPayments: f1040(ctx, "line26_estimated_payments"),
      line27aEic: f1040(ctx, "line27a_eic"),
      line28Actc: f1040(ctx, "line28_actc"),
      line29RefundableAotc: f1040(ctx, "line29_refundable_aotc"),
      line30RefundableAdoption: f1040(ctx, "line30_refundable_adoption"),
      line31OtherPayments: f1040(ctx, "line31_other_payments"),
      line36ApplyTo2027: f1040(ctx, "line36_apply_to_2027"),
      schedule2Line20: number(
        ctx,
        "schedule2",
        "line20_employment_and_other_taxes",
      ),
      wantsFederalPublicBenefit: choice("line7_wants_benefit"),
      eligibleForFederalPublicBenefit: choice("line8_eligible"),
    });
    const checks = {
      line32a_refundable_credits: expected.line32aRefundableCredits,
      line32b_public_benefit_reduction:
        expected.line32bFederalPublicBenefitReduction,
      line32c_net_refundable_credits: expected.line32cNetRefundableCredits,
      line33_total_payments: expected.line33TotalPayments,
      line34_overpayment: expected.line34Overpayment,
      line35a_refund: expected.line35aRefund,
      line36_apply_to_2027: expected.line36ApplyTo2027,
      line37_amount_owed: expected.line37AmountOwed,
    };
    if (
      !Object.entries(checks).every(([key, value]) =>
        ctx.pendingField("f1040", key) === value
      )
    ) return false;
    const benefit = expected.schedule3a;
    if (!benefit) return !ctx.hasForm("schedule3a");
    const fields = {
      line1a_refundable_credits: benefit.line1a,
      line1b_other_payments: benefit.line1b,
      line2_eligible_refundable_credits: benefit.line2,
      line3_total_tax: benefit.line3,
      line4_schedule2_line20: benefit.line4,
      line5_tax_offset: benefit.line5,
      line6_federal_public_benefit: benefit.line6FederalPublicBenefit,
      line8_disallowed_benefit: benefit.line8DisallowedBenefit,
    };
    if (
      !Object.entries(fields).every(([key, value]) =>
        ctx.pendingField("schedule3a", key) === value
      )
    ) return false;
    if (
      benefit.line6FederalPublicBenefit === 0 &&
      choice("line7_wants_benefit") !== undefined
    ) return false;
    return choice("line7_wants_benefit") === true ||
      choice("line8_eligible") === undefined;
  } catch {
    return false;
  }
}

/** Local TY2026 calculation checks. These are not IRS MeF business rules. */
export const CALCULATION_RULES_2026: readonly RuleDef[] = [
  rule(
    "F1040-2026-LOCAL-11",
    "reject",
    "math_error",
    (ctx) =>
      requiredAmountKeys.every((key) => {
        const value = ctx.pendingField("f1040", key);
        return typeof value === "number" && Number.isSafeInteger(value);
      }),
    "The calculated Form 1040 must contain finite whole-dollar amounts for all required totals.",
  ),
  rule(
    "F1040-2026-LOCAL-12",
    "reject",
    "math_error",
    (ctx) =>
      f1040(ctx, "line9_total_income") === [
        "line1z_total_wages",
        "line2b_taxable_interest",
        "line3b_ordinary_dividends",
        "line4b_ira_taxable",
        "line5b_pension_taxable",
        "line6b_ss_taxable",
        "line7a_capital_gain",
        "line8_additional_income",
      ].reduce((total, key) => total + f1040(ctx, key), 0),
    "Form 1040 line 9 must reconcile to its printed income lines.",
  ),
  rule(
    "F1040-2026-LOCAL-13",
    "reject",
    "math_error",
    (ctx) =>
      f1040(ctx, "line18_total_tax_before_credits") ===
        f1040(ctx, "line16_income_tax") +
          f1040(ctx, "line17_additional_taxes") &&
      f1040(ctx, "line21_credits_total") ===
        f1040(ctx, "line19_child_tax_credit") +
          f1040(ctx, "line20_nonrefundable_credits") &&
      f1040(ctx, "line22_tax_after_credits") ===
        Math.max(
          0,
          f1040(ctx, "line18_total_tax_before_credits") -
            f1040(ctx, "line21_credits_total"),
        ),
    "Form 1040 tax after credits must reconcile to lines 16 through 21.",
  ),
  rule(
    "F1040-2026-LOCAL-14",
    "reject",
    "math_error",
    settlementConsistent,
    "Form 1040 settlement and required Schedule 3-A must reconcile to credits, tax and benefit answers.",
  ),
  rule(
    "F1040-2026-LOCAL-01",
    "reject",
    "missing_document",
    (ctx) => ctx.hasForm("f1040"),
    "The calculated TY2026 Form 1040 is missing.",
  ),
  rule(
    "F1040-2026-LOCAL-02",
    "reject",
    "math_error",
    (ctx) =>
      f1040(ctx, "line11a_agi") ===
        f1040(ctx, "line9_total_income") -
          f1040(ctx, "line10_adjustments") &&
      f1040(ctx, "line11b_agi") === f1040(ctx, "line11a_agi"),
    "Form 1040 lines 11a and 11b must reconcile to lines 9 and 10.",
  ),
  rule(
    "F1040-2026-LOCAL-03",
    "reject",
    "math_error",
    (ctx) =>
      f1040(ctx, "line14_total_deductions") === [
          "line12e_standard_or_itemized",
          "line12f_nonitemizer_charity",
          "line13a_schedule1a",
          "line13b_qbi",
        ].reduce((sum, key) => sum + f1040(ctx, key), 0) &&
      f1040(ctx, "line15_taxable_income") === Math.max(
          0,
          f1040(ctx, "line11b_agi") - f1040(ctx, "line14_total_deductions"),
        ),
    "Form 1040 deductions and taxable income do not reconcile.",
  ),
  rule(
    "F1040-2026-LOCAL-04",
    "reject",
    "math_error",
    (ctx) =>
      f1040(ctx, "line24a_total_tax") ===
        f1040(ctx, "line22_tax_after_credits") +
          f1040(ctx, "line23_other_taxes") &&
      f1040(ctx, "line24c_total_tax") ===
        f1040(ctx, "line24a_total_tax") +
          f1040(ctx, "line24b_form1062"),
    "Form 1040 lines 24a through 24c do not reconcile.",
  ),
  rule(
    "F1040-2026-LOCAL-05",
    "reject",
    "math_error",
    (ctx) =>
      f1040(ctx, "line25d_total_withholding") === [
          "line25a_w2_withheld",
          "line25b_withheld_1099",
          "line25c_other_withheld",
        ].reduce((sum, key) => sum + f1040(ctx, key), 0) &&
      f1040(ctx, "line32c_net_refundable_credits") ===
        f1040(ctx, "line32a_refundable_credits") -
          f1040(ctx, "line32b_public_benefit_reduction") &&
      f1040(ctx, "line33_total_payments") ===
        f1040(ctx, "line25d_total_withholding") +
          f1040(ctx, "line26_estimated_payments") +
          f1040(ctx, "line32c_net_refundable_credits"),
    "Form 1040 withholding, refundable credits, or payments do not reconcile.",
  ),
  rule(
    "F1040-2026-LOCAL-06",
    "reject",
    "missing_document",
    (ctx) =>
      f1040(ctx, "line8_additional_income") === 0 &&
        f1040(ctx, "line10_adjustments") === 0 ||
      ctx.pendingField("schedule1", "file_schedule1") === true &&
        number(ctx, "schedule1", "line10_total_additional_income") ===
          f1040(ctx, "line8_additional_income") &&
        number(ctx, "schedule1", "line26_total_adjustments") ===
          f1040(ctx, "line10_adjustments"),
    "Schedule 1 is required and must reconcile to Form 1040 lines 8 and 10.",
  ),
  rule(
    "F1040-2026-LOCAL-07",
    "reject",
    "missing_document",
    (ctx) =>
      f1040(ctx, "line17_additional_taxes") === 0 &&
        f1040(ctx, "line23_other_taxes") === 0 ||
      ctx.hasForm("schedule2") &&
        number(ctx, "schedule2", "line3_part1_tax") ===
          f1040(ctx, "line17_additional_taxes") &&
        number(ctx, "schedule2", "line21_total_additional_taxes") ===
          f1040(ctx, "line23_other_taxes"),
    "Schedule 2 is required and must reconcile to Form 1040 lines 17 and 23.",
  ),
  rule(
    "F1040-2026-LOCAL-08",
    "reject",
    "missing_document",
    (ctx) =>
      f1040(ctx, "line2b_taxable_interest") <= 1_500 &&
        f1040(ctx, "line3b_ordinary_dividends") <= 1_500 ||
      ctx.pendingField("schedule_b", "file_schedule_b") === true &&
        number(ctx, "schedule_b", "print_line4_total") ===
          f1040(ctx, "line2b_taxable_interest") &&
        number(ctx, "schedule_b", "print_line6_total") ===
          f1040(ctx, "line3b_ordinary_dividends"),
    "Schedule B is required for interest or dividends over $1,500.",
  ),
  rule(
    "F1040-2026-LOCAL-09",
    "reject",
    "missing_document",
    (ctx) =>
      f1040(ctx, "qualifying_child_tax_credit_count") +
            f1040(ctx, "other_dependent_count") === 0 ||
      ctx.hasForm("f8812") &&
        number(ctx, "f8812", "line14") ===
          f1040(ctx, "line19_child_tax_credit") &&
        number(ctx, "f8812", "line27") === f1040(ctx, "line28_actc"),
    "Schedule 8812 must reconcile to Form 1040 child credits.",
  ),
  rule(
    "F1040-2026-LOCAL-10",
    "reject",
    "missing_document",
    (ctx) =>
      f1040(ctx, "line20_nonrefundable_credits") === 0 &&
        f1040(ctx, "line31_other_payments") === 0 ||
      ctx.hasForm("schedule3") &&
        number(ctx, "schedule3", "line8_total") ===
          f1040(ctx, "line20_nonrefundable_credits") &&
        number(ctx, "schedule3", "line15_total") ===
          f1040(ctx, "line31_other_payments"),
    "Schedule 3 must reconcile to Form 1040 lines 20 and 31.",
  ),
];

/** No provisional XML-name map is supplied before the current TY2026 MeF schema. */
export const CALCULATION_FIELD_REGISTRY_2026: FieldRegistry = new Map();

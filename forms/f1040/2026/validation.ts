import { rule } from "../../../core/validation/rule-builder.ts";
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

/** Local TY2026 calculation checks. These are not IRS MeF business rules. */
export const CALCULATION_RULES_2026: readonly RuleDef[] = [
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
      f1040(ctx, "dependent_count") === 0 ||
      ctx.hasForm("f8812") &&
        number(ctx, "f8812", "line14") ===
          f1040(ctx, "line19_child_tax_credit") &&
        number(ctx, "f8812", "line27") === f1040(ctx, "line28_actc"),
    "Schedule 8812 must reconcile to Form 1040 child credits.",
  ),
];

/** No provisional XML-name map is supplied before the current TY2026 MeF schema. */
export const CALCULATION_FIELD_REGISTRY_2026: FieldRegistry = new Map();

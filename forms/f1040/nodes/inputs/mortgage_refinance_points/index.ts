import { z } from "zod";
import type { NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";
import { scheduleA } from "../schedule_a/index.ts";
import { inputSchema as form1098InputSchema } from "../f1098/index.ts";

const paymentSchema = z.object({
  month: z.number().int().min(1).max(12),
  document_reference: z.string().trim().min(1),
}).strict();

const earlyPayoffSchema = z.object({
  payoff_month_2025: z.number().int().min(1).max(12),
  payoff_statement_reference: z.string().trim().min(1),
  full_payoff_verified: z.literal(true),
  refinanced_with_same_lender: z.literal(false),
}).strict();

const improvementSchema = z.object({
  amount_used_to_substantially_improve_main_home: z.number().finite()
    .positive(),
  improvement_expense_records_reference: z.string().trim().min(1),
  main_home_and_substantial_improvement_verified: z.literal(true),
  pub936_immediate_points_tests_1_through_6_verified: z.literal(true),
  points_paid_with_own_funds_verified: z.literal(true),
}).strict();

const priorYear2024Schema = z.object({
  filed_2024_return_reference: z.string().trim().min(1),
  filed_2024_points_workpaper_reference: z.string().trim().min(1),
  filed_2024_loan_points_deduction: z.number().int().nonnegative(),
  payment_records_2024: z.array(paymentSchema).min(1).max(12),
}).strict();

const priorYear2023Schema = z.object({
  filed_2023_return_reference: z.string().trim().min(1),
  filed_2023_points_workpaper_reference: z.string().trim().min(1),
  filed_2023_loan_points_deduction: z.number().int().nonnegative(),
  payment_records_2023: z.array(paymentSchema).min(1).max(12),
}).strict();

export const itemSchema = z.object({
  mortgage_id: z.string().trim().min(1),
  recipient_tin: z.string().regex(/^\d{3}-?\d{2}-?\d{4}$/),
  lender_name: z.string().trim().min(1),
  form1098_source_document_reference: z.string().trim().min(1),
  closing_disclosure_reference: z.string().trim().min(1),
  pub936_workpaper_reference: z.string().trim().min(1),
  refinance_close_year: z.union([
    z.literal(2023),
    z.literal(2024),
    z.literal(2025),
  ]),
  refinance_close_month: z.number().int().min(1).max(12),
  prior_year_2023: priorYear2023Schema.optional(),
  prior_year_2024: priorYear2024Schema.optional(),
  prior_qualified_home_debt: z.number().finite().positive(),
  refinanced_principal: z.number().finite().positive(),
  loan_term_months: z.number().int().min(1).max(600),
  total_points_charged: z.number().finite().positive(),
  points_for_nondeductible_services: z.number().finite().nonnegative(),
  monthly_payment_records: z.array(paymentSchema).min(1).max(12),
  early_payoff_2025: earlyPayoffSchema.optional(),
  improvement: improvementSchema.optional(),
  qualified_home_secured_verified: z.literal(true),
  points_not_reported_in_box6_verified: z.literal(true),
  points_paid_directly_verified: z.literal(true),
  acquisition_debt_limit_verified: z.literal(true),
}).strict().superRefine((item, ctx) => {
  const records = item.monthly_payment_records;
  const months = records.map((record) => record.month).sort((a, b) => a - b);
  const finalMonth = item.early_payoff_2025?.payoff_month_2025 ?? 12;
  const improvementAmount = item.improvement
    ?.amount_used_to_substantially_improve_main_home ?? 0;
  const prior = item.prior_year_2024;
  const prior2023 = item.prior_year_2023;
  const prior2023Months = prior2023?.payment_records_2023.map((record) =>
    record.month
  ).sort((a, b) => a - b) ?? [];
  const priorMonths = prior?.payment_records_2024.map((record) =>
    record.month
  )
    .sort((a, b) => a - b) ?? [];
  const expectedPrior = Array.from(
    { length: priorMonths.length },
    (_, index) => 13 - priorMonths.length + index,
  );
  const interestPoints = item.total_points_charged -
    item.points_for_nondeductible_services;
  const expected2024Deduction = Math.round(
    interestPoints * priorMonths.length / item.loan_term_months,
  );
  const expected2023Deduction = Math.round(
    interestPoints * prior2023Months.length / item.loan_term_months,
  );
  const expected = Array.from(
    { length: months.length },
    (_, index) => finalMonth + 1 - months.length + index,
  );
  if (
    (item.improvement
      ? item.refinanced_principal !==
        item.prior_qualified_home_debt + improvementAmount
      : item.refinanced_principal > item.prior_qualified_home_debt) ||
    item.points_for_nondeductible_services >= item.total_points_charged ||
    item.loan_term_months < months.length ||
    (item.early_payoff_2025 !== undefined &&
      item.loan_term_months === months.length) ||
    (item.refinance_close_year === 2025 &&
      months[0] < item.refinance_close_month) ||
    months.some((month, index) => month !== expected[index]) ||
    (item.early_payoff_2025 !== undefined &&
      item.early_payoff_2025.payoff_month_2025 <
        item.refinance_close_month) ||
    new Set(records.map((record) => record.document_reference)).size !==
      records.length
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        "Refinance points need qualified prior debt plus any documented main-home improvement to cover the new principal, interest-like points, and distinct consecutive 2025 payment records through December or the reviewed full-payoff month",
    });
  }
  if (
    item.refinance_close_year === 2025 &&
    (prior !== undefined || prior2023 !== undefined)
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: [prior2023 !== undefined ? "prior_year_2023" : "prior_year_2024"],
      message:
        "A 2025 refinance cannot claim an earlier-year amortization ledger",
    });
  }
  if (item.refinance_close_year === 2024 && prior2023 !== undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["prior_year_2023"],
      message: "A 2024 refinance cannot claim a 2023 amortization ledger",
    });
  }
  if (
    item.refinance_close_year === 2024 && (
      prior === undefined || item.early_payoff_2025 !== undefined ||
      item.improvement !== undefined || months.length !== 12 ||
      priorMonths[0] < item.refinance_close_month ||
      priorMonths.some((month, index) => month !== expectedPrior[index]) ||
      new Set(
          prior.payment_records_2024.map((record) => record.document_reference),
        ).size !== prior.payment_records_2024.length ||
      prior.payment_records_2024.some((record) =>
        records.some((current) =>
          current.document_reference === record.document_reference
        )
      ) ||
      prior.filed_2024_loan_points_deduction !== expected2024Deduction ||
      item.loan_term_months < priorMonths.length + months.length ||
      Math.round(interestPoints * months.length / item.loan_term_months) >
        interestPoints - prior.filed_2024_loan_points_deduction
    )
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["prior_year_2024"],
      message:
        "A 2024 refinance needs its filed 2024 loan-points workpaper and distinct consecutive payment records through December 2024, a matching claimed deduction, and twelve 2025 payments within the remaining loan term",
    });
  }
  if (
    item.refinance_close_year === 2023 &&
    (prior2023 === undefined || prior === undefined ||
      item.early_payoff_2025 !== undefined || item.improvement !== undefined ||
      months.length !== 12 || priorMonths.length !== 12 ||
      prior2023Months[0] < item.refinance_close_month ||
      prior2023Months.some((month, index) =>
        month !== 13 - prior2023Months.length + index
      ) ||
      priorMonths.some((month, index) => month !== index + 1) ||
      prior2023.filed_2023_return_reference ===
        prior.filed_2024_return_reference ||
      prior2023.filed_2023_points_workpaper_reference ===
        prior.filed_2024_points_workpaper_reference ||
      new Set([
          ...prior2023.payment_records_2023,
          ...prior.payment_records_2024,
          ...records,
        ].map((record) => record.document_reference)).size !==
        prior2023.payment_records_2023.length +
          prior.payment_records_2024.length + records.length ||
      prior2023.filed_2023_loan_points_deduction !==
        expected2023Deduction ||
      prior.filed_2024_loan_points_deduction !== expected2024Deduction ||
      item.loan_term_months <
        prior2023Months.length + priorMonths.length + months.length ||
      Math.round(interestPoints * months.length / item.loan_term_months) >
        interestPoints - prior2023.filed_2023_loan_points_deduction -
          prior.filed_2024_loan_points_deduction)
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["prior_year_2023"],
      message:
        "A 2023 refinance needs reviewed 2023 and 2024 filed loan-points workpapers, distinct consecutive payments through each December, and twelve 2025 payments within the remaining loan term",
    });
  }
});

export const inputSchema = z.object({
  refinances: z.array(itemSchema).min(1).max(20),
}).strict().superRefine(({ refinances }, ctx) => {
  for (
    const key of [
      "mortgage_id",
      "closing_disclosure_reference",
      "form1098_source_document_reference",
    ] as const
  ) {
    const values = refinances.map((item) => item[key]);
    if (new Set(values).size !== values.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `The same refinance ${key} cannot be deducted twice`,
      });
    }
  }
});

type Item = z.infer<typeof itemSchema>;

function deductiblePoints(item: Item): number {
  const interestPoints = item.total_points_charged -
    item.points_for_nondeductible_services;
  if (item.early_payoff_2025) return Math.round(interestPoints);
  const improvementPoints = item.improvement
    ? interestPoints *
      (item.improvement.amount_used_to_substantially_improve_main_home /
        item.refinanced_principal)
    : 0;
  return Math.round(
    improvementPoints +
      (interestPoints - improvementPoints) *
        item.monthly_payment_records.length / item.loan_term_months,
  );
}

export function refinancePointsDeduction(source: unknown): number {
  const items = inputSchema.parse(source).refinances;
  return items.reduce((sum, item) => sum + deductiblePoints(item), 0);
}

export function assertRefinancePointsSource(
  source: unknown,
  form1098Source: unknown,
  recipientTins: readonly string[],
  filedLine8c: number,
): void {
  if (source === undefined) return;
  const items = inputSchema.parse(source).refinances;
  if (form1098Source === undefined) {
    throw new Error(
      "Schedule A refinance points need the linked payer-issued Form 1098 source",
    );
  }
  const forms1098 = form1098InputSchema.parse(form1098Source).f1098s;
  const allowed = new Set(recipientTins.map((tin) => tin.replaceAll("-", "")));
  for (const item of items) {
    if (!allowed.has(item.recipient_tin.replaceAll("-", ""))) {
      throw new Error(
        "Schedule A refinance points recipient must match the taxpayer or joint-filing spouse",
      );
    }
    const matches = forms1098.filter((form) =>
      form.source_document_reference === item.form1098_source_document_reference
    );
    if (
      matches.length !== 1 ||
      matches[0].lender_name?.trim() !== item.lender_name ||
      matches[0].recipient_tin?.replaceAll("-", "") !==
        item.recipient_tin.replaceAll("-", "") ||
      (matches[0].box6_points_paid ?? 0) !== 0
    ) {
      throw new Error(
        "Schedule A refinance points need one matching Form 1098 source with no box 6 points",
      );
    }
    if (!matches[0].issuer_copy) {
      throw new Error(
        "Schedule A refinance points need the reviewed Form 1098 issuer Copy B",
      );
    }
  }
  const calculated = items.reduce(
    (sum, item) => sum + deductiblePoints(item),
    0,
  );
  if (filedLine8c !== calculated) {
    throw new Error(
      "Schedule A line 8c must equal sourced refinance-points amortization",
    );
  }
}

class MortgageRefinancePointsNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "mortgage_refinance_points";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([scheduleA]);

  compute(
    _ctx: NodeContext,
    rawInput: z.infer<typeof inputSchema>,
  ): NodeResult {
    const amount = refinancePointsDeduction(rawInput);
    return {
      outputs: amount > 0
        ? [this.outputNodes.output(scheduleA, {
          line_8c_points_no_1098: amount,
        })]
        : [],
    };
  }
}

export const mortgage_refinance_points = new MortgageRefinancePointsNode();

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

export const itemSchema = z.object({
  mortgage_id: z.string().trim().min(1),
  recipient_tin: z.string().regex(/^\d{3}-?\d{2}-?\d{4}$/),
  lender_name: z.string().trim().min(1),
  form1098_source_document_reference: z.string().trim().min(1),
  closing_disclosure_reference: z.string().trim().min(1),
  pub936_workpaper_reference: z.string().trim().min(1),
  refinance_close_month_2025: z.number().int().min(1).max(12),
  prior_qualified_home_debt: z.number().finite().positive(),
  refinanced_principal: z.number().finite().positive(),
  loan_term_months: z.number().int().min(1).max(600),
  total_points_charged: z.number().finite().positive(),
  points_for_nondeductible_services: z.number().finite().nonnegative(),
  monthly_payment_records: z.array(paymentSchema).min(1).max(12),
  qualified_home_secured_verified: z.literal(true),
  points_not_reported_in_box6_verified: z.literal(true),
  points_paid_directly_verified: z.literal(true),
  acquisition_debt_limit_verified: z.literal(true),
}).strict().superRefine((item, ctx) => {
  const records = item.monthly_payment_records;
  const months = records.map((record) => record.month).sort((a, b) => a - b);
  const expected = Array.from(
    { length: months.length },
    (_, index) => 13 - months.length + index,
  );
  if (
    item.refinanced_principal > item.prior_qualified_home_debt ||
    item.points_for_nondeductible_services >= item.total_points_charged ||
    item.loan_term_months < months.length ||
    months[0] < item.refinance_close_month_2025 ||
    months.some((month, index) => month !== expected[index]) ||
    new Set(records.map((record) => record.document_reference)).size !==
      records.length
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        "Refinance points need no cash-out beyond qualified debt, interest-like points, and distinct consecutive 2025 payment records through December",
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
  return Math.round(
    interestPoints * item.monthly_payment_records.length / item.loan_term_months,
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
  }
  const calculated = items.reduce((sum, item) => sum + deductiblePoints(item), 0);
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

  compute(_ctx: NodeContext, rawInput: z.infer<typeof inputSchema>): NodeResult {
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

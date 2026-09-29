import { z } from "zod";
import type { NodeResult } from "../../../../../core/types/tax-node.ts";
import { output, TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { disabledAccessLimit } from "../../intermediate/forms/disabled_access_limit/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// Form 8826 — Disabled Access Credit (IRC §44)
// Eligibility: prior-year gross receipts ≤$1M OR ≤30 full-time employees.
// Credit: 50% × (eligible expenditures − $250), max expenditures $10,250 → max credit $5,000.
// Source credit enters Form 3800. Its tax-liability limit is not yet finalized.

// TY2025 constants — IRC §44
const GROSS_RECEIPTS_LIMIT = 1_000_000; // $1,000,000
const FULL_TIME_EMPLOYEE_LIMIT = 30;
const EXPENDITURE_FLOOR = 250; // first $250 not creditable
const EXPENDITURE_CAP = 10_250; // max eligible expenditures
const CREDIT_RATE = 0.50; // 50%
const MAX_CREDIT = 5_000; // (10,250 − 250) × 50%

const money = z.number().finite().nonnegative().refine(
  (amount) =>
    Number.isSafeInteger(Math.round(amount * 100)) &&
    Math.abs(amount * 100 - Math.round(amount * 100)) < 0.000001,
  {
    message: "Form 8826 money amounts must have cent precision",
  },
);

export const inputSchema = z.object({
  // Eligible access expenditures paid or incurred during the year (Line 1)
  eligible_expenditures: money,
  // Predecessor and common-control amounts must be included by the caller.
  prior_year_gross_receipts: z.number().finite().nonnegative().optional(),
  // Count employees working at least 30 hours a week for 20 calendar weeks.
  // This is a headcount, not a full-time-equivalent calculation.
  prior_year_full_time_employee_count: z.number().int().nonnegative()
    .optional(),
  subject_to_passive_activity_limit: z.boolean(),
  // Identifies this self-earned credit in the public Form 8582-CR activity rows.
  source_document_reference: z.string().trim().min(1).optional(),
  // Form 8826 line 7. Each K-1 source keeps its own identity and activity
  // classification; the combined line 8 amount is capped at $5,000.
  pass_through_credits: z.array(z.object({
    entity_type: z.enum(["partnership", "s_corporation"]),
    entity_ein: z.string().regex(/^\d{9}$/),
    source_document_reference: z.string().trim().min(1),
    credit_amount: money,
    subject_to_passive_activity_limit: z.boolean(),
  })).optional(),
}).superRefine((input, ctx) => {
  if (
    input.eligible_expenditures > 0 &&
    (input.prior_year_gross_receipts === undefined ||
      input.prior_year_full_time_employee_count === undefined)
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        "Self-earned Form 8826 credit needs both prior-year eligibility facts",
    });
  }
  if (
    input.eligible_expenditures > EXPENDITURE_FLOOR &&
    input.subject_to_passive_activity_limit &&
    !input.source_document_reference
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["source_document_reference"],
      message:
        "Passive Form 8826 needs a Form 8582-CR source document reference",
    });
  }
  const seen = new Set<string>();
  for (const source of input.pass_through_credits ?? []) {
    const key = `${source.entity_type}:${source.entity_ein}`;
    if (seen.has(key)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Duplicate Form 8826 pass-through source ${key}`,
      });
    }
    seen.add(key);
  }
});

export type F8826Input = z.infer<typeof inputSchema>;

export type F8826Lines = {
  readonly line1: number;
  readonly line3: number;
  readonly line5: number;
  readonly line6: number;
  readonly line7: number;
  readonly line8: number;
  readonly selfCreditAfterCap: number;
  readonly passThroughCreditsAfterCap: readonly number[];
};

/** Allocate the Form 8826/3800 $5,000 source cap in cents, largest remainder first. */
function allocateCappedCredits(amounts: readonly number[]): number[] {
  const total = amounts.reduce((sum, amount) => sum + amount, 0);
  if (total <= MAX_CREDIT) return [...amounts];
  const cents = amounts.map((amount) => Math.round(amount * 100));
  if (cents.some((amount) => !Number.isSafeInteger(amount))) {
    throw new Error("Form 8826 source credit exceeds safe cent precision");
  }
  const totalCents = cents.reduce((sum, amount) => sum + amount, 0);
  if (!Number.isSafeInteger(totalCents) || totalCents <= 0) {
    throw new Error("Form 8826 total credit exceeds safe cent precision");
  }
  const capCents = MAX_CREDIT * 100;
  const shares = cents.map((amount, index) => {
    const raw = amount / totalCents * capCents;
    return { index, cents: Math.floor(raw), remainder: raw % 1 };
  });
  const remaining = capCents -
    shares.reduce((sum, share) => sum + share.cents, 0);
  for (
    const share of [...shares].sort((a, b) =>
      b.remainder - a.remainder || a.index - b.index
    ).slice(0, remaining)
  ) {
    share.cents += 1;
  }
  return shares.map((share) => share.cents / 100);
}

export function isEligible(input: F8826Input): boolean {
  if (
    input.prior_year_gross_receipts === undefined ||
    input.prior_year_full_time_employee_count === undefined
  ) return false;
  const receiptsOk = input.prior_year_gross_receipts <= GROSS_RECEIPTS_LIMIT;
  const employeesOk = input.prior_year_full_time_employee_count <=
    FULL_TIME_EMPLOYEE_LIMIT;
  // Either condition suffices (OR logic per IRC §44(b))
  return receiptsOk || employeesOk;
}

/** Form 8826 lines 1, 3, 5, 6, 7, and 8 before the Form 3800 tax limit. */
export function calculateForm8826(input: F8826Input): F8826Lines {
  const line1 = input.eligible_expenditures;
  const eligibleCents = Math.round(line1 * 100);
  const line3Cents = Math.max(0, eligibleCents - EXPENDITURE_FLOOR * 100);
  const line5Cents = Math.min(
    line3Cents,
    (EXPENDITURE_CAP - EXPENDITURE_FLOOR) * 100,
  );
  const line3 = line3Cents / 100;
  const line5 = line5Cents / 100;
  const line6 = Math.round(line5Cents * CREDIT_RATE) / 100;
  const line7 = (input.pass_through_credits ?? []).reduce(
    (sum, source) => sum + source.credit_amount,
    0,
  );
  const allocations = allocateCappedCredits([
    isEligible(input) ? line6 : 0,
    ...(input.pass_through_credits ?? []).map((source) => source.credit_amount),
  ]);
  return {
    line1,
    line3,
    line5,
    line6,
    line7,
    line8: Math.min((isEligible(input) ? line6 : 0) + line7, MAX_CREDIT),
    selfCreditAfterCap: allocations[0] ?? 0,
    passThroughCreditsAfterCap: allocations.slice(1),
  };
}

class F8826Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f8826";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([disabledAccessLimit]);

  compute(_ctx: NodeContext, rawInput: F8826Input): NodeResult {
    const input = inputSchema.parse(rawInput);
    const lines = calculateForm8826(input);
    if (
      lines.line7 > 0 && input.eligible_expenditures > 0 &&
      !isEligible(input)
    ) {
      throw new Error(
        "Form 8826 cannot combine an ineligible self-earned credit with pass-through credit",
      );
    }
    return {
      outputs: lines.line8 > 0
        ? [output(disabledAccessLimit, {
          ...(lines.line6 > 0 && isEligible(input) &&
              input.subject_to_passive_activity_limit
            ? {
              required_disabled_access_self_credit: {
                source_document_reference: input.source_document_reference,
                credit_amount: lines.line6,
              },
            }
            : {}),
          required_form8826_pass_through_credits:
            (input.pass_through_credits ?? []).flatMap((source) =>
              source.credit_amount > 0 &&
                source.subject_to_passive_activity_limit
                ? [{
                  source_type: source.entity_type,
                  source_ein: source.entity_ein,
                  source_document_reference: source.source_document_reference,
                  credit_amount: source.credit_amount,
                }]
                : []
            ),
          f8826_credit_entries: [
            ...(lines.line6 > 0 && isEligible(input) &&
                !input.subject_to_passive_activity_limit
              ? [{
                source_type: "self" as const,
                credit_amount: lines.line6,
                subject_to_passive_activity_limit: false,
              }]
              : []),
            ...(input.pass_through_credits ?? []).flatMap((source) => {
              return source.credit_amount > 0 &&
                  !source.subject_to_passive_activity_limit
                ? [{
                  source_type: source.entity_type,
                  source_ein: source.entity_ein,
                  credit_amount: source.credit_amount,
                  subject_to_passive_activity_limit: false,
                }]
                : [];
            }),
          ],
        })]
        : [],
    };
  }
}

export const f8826 = new F8826Node();

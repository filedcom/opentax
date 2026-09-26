import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { schedule3 } from "../../intermediate/aggregation/schedule3/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// Form 8826 — Disabled Access Credit (IRC §44)
// Eligibility: prior-year gross receipts ≤$1M OR ≤30 full-time employees.
// Credit: 50% × (eligible expenditures − $250), max expenditures $10,250 → max credit $5,000.
// Source credit currently routes gross to Schedule 3 line 6a; Form 3800's
// tax-liability limitation still needs to replace that tentative amount.

// TY2025 constants — IRC §44
const GROSS_RECEIPTS_LIMIT = 1_000_000; // $1,000,000
const FULL_TIME_EMPLOYEE_LIMIT = 30;
const EXPENDITURE_FLOOR = 250; // first $250 not creditable
const EXPENDITURE_CAP = 10_250; // max eligible expenditures
const CREDIT_RATE = 0.50; // 50%
const MAX_CREDIT = 5_000; // (10,250 − 250) × 50%

export const inputSchema = z.object({
  // Eligible access expenditures paid or incurred during the year (Line 1)
  eligible_expenditures: z.number().finite().nonnegative(),
  // Predecessor and common-control amounts must be included by the caller.
  prior_year_gross_receipts: z.number().finite().nonnegative(),
  // Count employees working at least 30 hours a week for 20 calendar weeks.
  // This is a headcount, not a full-time-equivalent calculation.
  prior_year_full_time_employee_count: z.number().int().nonnegative(),
  subject_to_passive_activity_limit: z.boolean(),
});

export type F8826Input = z.infer<typeof inputSchema>;

export type F8826Lines = {
  readonly line1: number;
  readonly line3: number;
  readonly line5: number;
  readonly line6: number;
  readonly line8: number;
};

function isEligible(input: F8826Input): boolean {
  const receiptsOk = input.prior_year_gross_receipts <= GROSS_RECEIPTS_LIMIT;
  const employeesOk = input.prior_year_full_time_employee_count <=
    FULL_TIME_EMPLOYEE_LIMIT;
  // Either condition suffices (OR logic per IRC §44(b))
  return receiptsOk || employeesOk;
}

/** Form 8826 lines 1, 3, 5, 6, and 8 for a self-earned credit. */
export function calculateForm8826(input: F8826Input): F8826Lines {
  const line1 = input.eligible_expenditures;
  const line3 = Math.max(0, line1 - EXPENDITURE_FLOOR);
  const line5 = Math.min(line3, EXPENDITURE_CAP - EXPENDITURE_FLOOR);
  const line6 = line5 * CREDIT_RATE;
  return {
    line1,
    line3,
    line5,
    line6,
    line8: isEligible(input) ? Math.min(line6, MAX_CREDIT) : 0,
  };
}

function buildOutputs(credit: number): NodeOutput[] {
  if (credit <= 0) return [];
  return [{
    nodeType: schedule3.nodeType,
    fields: { line6a_general_business_credit: credit },
  }];
}

class F8826Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f8826";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule3]);

  compute(_ctx: NodeContext, rawInput: F8826Input): NodeResult {
    const input = inputSchema.parse(rawInput);
    const lines = calculateForm8826(input);
    if (lines.line8 > 0 && input.subject_to_passive_activity_limit) {
      throw new Error(
        "Form 8826 passive credit needs Form 8582-CR before Form 3800",
      );
    }
    return { outputs: buildOutputs(lines.line8) };
  }
}

export const f8826 = new F8826Node();

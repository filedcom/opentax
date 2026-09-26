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
});

type F8826Input = z.infer<typeof inputSchema>;

function isEligible(input: F8826Input): boolean {
  const receiptsOk = input.prior_year_gross_receipts <= GROSS_RECEIPTS_LIMIT;
  const employeesOk = input.prior_year_full_time_employee_count <=
    FULL_TIME_EMPLOYEE_LIMIT;
  // Either condition suffices (OR logic per IRC §44(b))
  return receiptsOk || employeesOk;
}

function computeCredit(input: F8826Input): number {
  if (!isEligible(input)) return 0;
  if (input.eligible_expenditures <= EXPENDITURE_FLOOR) return 0;

  const cappedExpenditures = Math.min(
    input.eligible_expenditures,
    EXPENDITURE_CAP,
  );
  const creditableAmount = cappedExpenditures - EXPENDITURE_FLOOR;
  return Math.min(creditableAmount * CREDIT_RATE, MAX_CREDIT);
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
    const credit = computeCredit(input);
    return { outputs: buildOutputs(credit) };
  }
}

export const f8826 = new F8826Node();

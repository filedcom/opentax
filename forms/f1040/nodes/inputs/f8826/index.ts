import { z } from "zod";
import type { NodeOutput, NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { schedule3 } from "../../intermediate/schedule3/index.ts";

// Form 8826 — Disabled Access Credit (IRC §44)
// Eligibility: small business (gross receipts ≤$1M OR ≤30 FTEs).
// Credit: 50% × (eligible expenditures − $250), max expenditures $10,250 → max credit $5,000.
// Routes to Schedule 3, Line 6z (general business credit).

// TY2025 constants — IRC §44
const GROSS_RECEIPTS_LIMIT = 1_000_000;  // $1,000,000
const FTE_LIMIT = 30;                    // 30 full-time employees
const EXPENDITURE_FLOOR = 250;           // first $250 not creditable
const EXPENDITURE_CAP = 10_250;          // max eligible expenditures
const CREDIT_RATE = 0.50;               // 50%
const MAX_CREDIT = 5_000;               // (10,250 − 250) × 50%

export const inputSchema = z.object({
  // Eligible access expenditures paid or incurred during the year (Line 1)
  eligible_expenditures: z.number().nonnegative(),
  // Gross receipts for eligibility test (must be ≤$1M)
  gross_receipts: z.number().nonnegative().optional(),
  // Full-time equivalent employees for eligibility test (must be ≤30)
  fte_count: z.number().nonnegative().optional(),
});

type F8826Input = z.infer<typeof inputSchema>;

function isEligible(input: F8826Input): boolean {
  const receiptsOk = input.gross_receipts === undefined || input.gross_receipts <= GROSS_RECEIPTS_LIMIT;
  const fteOk = input.fte_count === undefined || input.fte_count <= FTE_LIMIT;
  // Either condition suffices (OR logic per IRC §44(b))
  return receiptsOk || fteOk;
}

function computeCredit(input: F8826Input): number {
  if (!isEligible(input)) return 0;
  if (input.eligible_expenditures <= EXPENDITURE_FLOOR) return 0;

  const cappedExpenditures = Math.min(input.eligible_expenditures, EXPENDITURE_CAP);
  const creditableAmount = cappedExpenditures - EXPENDITURE_FLOOR;
  return Math.min(creditableAmount * CREDIT_RATE, MAX_CREDIT);
}

function buildOutputs(credit: number): NodeOutput[] {
  if (credit <= 0) return [];
  return [{ nodeType: schedule3.nodeType, fields: { line6z_general_business_credit: credit } }];
}

class F8826Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f8826";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule3]);

  compute(rawInput: F8826Input): NodeResult {
    const input = inputSchema.parse(rawInput);
    const credit = computeCredit(input);
    return { outputs: buildOutputs(credit) };
  }
}

export const f8826 = new F8826Node();

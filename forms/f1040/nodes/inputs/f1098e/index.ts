import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import { TaxNode, output } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { schedule1 } from "../../outputs/schedule1/index.ts";
import { agi_aggregator } from "../../intermediate/aggregation/agi_aggregator/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// TY2025 — Form 1098-E: Student Loan Interest Statement
// Deduction flows to Schedule 1 Part II Line 19 and AGI Aggregator.
// IRC §221: student loan interest deduction, capped at $2,500.
// MAGI phaseout is handled separately (phaseout node not yet implemented).

// ── Constants ─────────────────────────────────────────────────────────────────

const STUDENT_LOAN_INTEREST_CAP = 2_500; // IRC §221(b)(1)

// ── Schemas ───────────────────────────────────────────────────────────────────

export const itemSchema = z.object({
  // Box 1 — Student loan interest received by lender
  box1_student_loan_interest: z.number().nonnegative(),
  // Optional lender name for identification
  lender_name: z.string().optional(),
});

export const inputSchema = z.object({
  f1098es: z.array(itemSchema).min(1),
});

type F1098EItem = z.infer<typeof itemSchema>;
type F1098EItems = F1098EItem[];

// ── Pure helpers ──────────────────────────────────────────────────────────────

function totalInterest(items: F1098EItems): number {
  return items.reduce((sum, item) => sum + item.box1_student_loan_interest, 0);
}

function allowedDeduction(items: F1098EItems): number {
  return Math.min(totalInterest(items), STUDENT_LOAN_INTEREST_CAP);
}

function schedule1Output(items: F1098EItems): NodeOutput[] {
  const deduction = allowedDeduction(items);
  if (deduction === 0) return [];
  return [output(schedule1, { line19_student_loan_interest: deduction })];
}

function agiOutput(items: F1098EItems): NodeOutput[] {
  const deduction = allowedDeduction(items);
  if (deduction === 0) return [];
  return [output(agi_aggregator, { line19_student_loan_interest: deduction })];
}

// ── Node class ────────────────────────────────────────────────────────────────

class F1098ENode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f1098e";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule1, agi_aggregator]);

  compute(_ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
    const parsed = inputSchema.parse(input);
    const outputs: NodeOutput[] = [
      ...schedule1Output(parsed.f1098es),
      ...agiOutput(parsed.f1098es),
    ];
    return { outputs };
  }
}

// ── Singleton export ──────────────────────────────────────────────────────────

export const f1098e = new F1098ENode();

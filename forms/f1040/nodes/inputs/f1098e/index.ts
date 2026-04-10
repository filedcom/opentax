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
  // Box 2 — If checked, box 1 does NOT include loan origination fees paid before September 1, 2004
  // IRC §221(d)(2): origination fees paid before 9/1/2004 are separately deductible as interest
  // when this box is checked, taxpayer may have additional deductible interest not captured in box1
  box2_origination_fees_excluded: z.boolean().optional().describe("If checked, box 1 does not include loan origination fees paid before September 1, 2004"),
  // Optional lender name for identification
  lender_name: z.string().optional(),
});

export const inputSchema = z.object({
  f1098es: z.array(itemSchema).min(1),
});

type F1098EItem = z.infer<typeof itemSchema>;
type F1098EItems = F1098EItem[];

// ── Pure helpers ──────────────────────────────────────────────────────────────

// Note: box2_origination_fees_excluded is schema-only — no compute adjustment needed.
// When box 2 is checked, box1 already EXCLUDES pre-2004 origination fees, meaning
// the taxpayer may have additional deductible interest the engine cannot recover
// (the fee amount is not reported anywhere on the form). The field is captured in
// the schema for user awareness and potential future enrichment; the deduction here
// is correctly based solely on box1_student_loan_interest as reported.
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

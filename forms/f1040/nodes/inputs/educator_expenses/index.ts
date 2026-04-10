import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import { TaxNode, output } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { schedule1 } from "../../outputs/schedule1/index.ts";
import { agi_aggregator } from "../../intermediate/aggregation/agi_aggregator/index.ts";
import { FilingStatus } from "../../types.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// TY2025 — Educator Expenses Deduction
// Schedule 1 Part II Line 11, IRC §62(a)(2)(D).
// Eligible educators may deduct up to $300 each ($600 if MFJ and both are educators).
// Per-educator cap: $300. Total cap: $300 (single/HOH/MFS/QSS) or $600 (MFJ).
// Rev Proc 2024-40 §3.12: $300 per eligible educator for TY2025.

// ── Constants ─────────────────────────────────────────────────────────────────

const PER_EDUCATOR_CAP = 300; // IRC §62(a)(2)(D)(ii)

// ── Schemas ───────────────────────────────────────────────────────────────────

export const inputSchema = z.object({
  // Educator 1 unreimbursed classroom expenses
  educator1_expenses: z.number().nonnegative(),
  // Educator 2 unreimbursed classroom expenses (MFJ only; ignored for other statuses)
  educator2_expenses: z.number().nonnegative().optional(),
  // Filing status — determines the total deduction cap.
  // Optional here because it is deposited by the general node at execution time
  // via mergePending; users only provide expense amounts when adding this form.
  filing_status: z.nativeEnum(FilingStatus).optional(),
  // Hours worked by educator 1 during the school year — must be 900+ hours in a
  // K-12 school for the educator to be eligible (IRC §62(a)(2)(D)(i))
  educator1_hours_worked: z.number().nonnegative().optional()
    .describe("Hours educator 1 worked as a K-12 teacher/instructor during the school year (must be ≥900 to qualify)"),
  // Hours worked by educator 2 during the school year (MFJ only)
  educator2_hours_worked: z.number().nonnegative().optional()
    .describe("Hours educator 2 worked as a K-12 teacher/instructor during the school year (must be ≥900 to qualify)"),
  // Qualified professional development expenses for educator 1 — courses related to
  // curriculum or students; included in the $300 per-educator cap (Rev Proc 2024-40)
  educator1_professional_development: z.number().nonnegative().optional()
    .describe("Educator 1 qualified professional development expenses (included in $300 cap)"),
  // Qualified professional development expenses for educator 2 (MFJ only)
  educator2_professional_development: z.number().nonnegative().optional()
    .describe("Educator 2 qualified professional development expenses (included in $300 cap)"),
});

export type EducatorExpensesInput = z.infer<typeof inputSchema>;

// ── Pure helpers ──────────────────────────────────────────────────────────────

// IRC §62(a)(2)(D)(i): educator must have worked ≥900 hours in a K-12 school.
// If hours_worked is provided and < 900, the educator is ineligible (zero deduction).
// If hours_worked is absent (undefined), assume eligible — benefit of the doubt.
function educator1Eligible(input: EducatorExpensesInput): boolean {
  return input.educator1_hours_worked === undefined || input.educator1_hours_worked >= 900;
}

function educator2Eligible(input: EducatorExpensesInput): boolean {
  return input.educator2_hours_worked === undefined || input.educator2_hours_worked >= 900;
}

// Professional development expenses count toward the $300 per-educator cap
// alongside unreimbursed supplies/books (Rev Proc 2024-40 §3.12).
function educator1Deduction(input: EducatorExpensesInput): number {
  if (!educator1Eligible(input)) return 0;
  const total = input.educator1_expenses + (input.educator1_professional_development ?? 0);
  return Math.min(total, PER_EDUCATOR_CAP);
}

function educator2Deduction(input: EducatorExpensesInput): number {
  if (input.filing_status !== FilingStatus.MFJ) return 0;
  if (!educator2Eligible(input)) return 0;
  const total = (input.educator2_expenses ?? 0) + (input.educator2_professional_development ?? 0);
  return Math.min(total, PER_EDUCATOR_CAP);
}

function totalDeduction(input: EducatorExpensesInput): number {
  return educator1Deduction(input) + educator2Deduction(input);
}

function schedule1Output(input: EducatorExpensesInput): NodeOutput[] {
  const deduction = totalDeduction(input);
  if (deduction === 0) return [];
  return [output(schedule1, { line11_educator_expenses: deduction })];
}

function agiOutput(input: EducatorExpensesInput): NodeOutput[] {
  const deduction = totalDeduction(input);
  if (deduction === 0) return [];
  return [output(agi_aggregator, { line11_educator_expenses: deduction })];
}

// ── Node class ────────────────────────────────────────────────────────────────

class EducatorExpensesNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "educator_expenses";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule1, agi_aggregator]);

  compute(_ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
    const parsed = inputSchema.parse(input);
    const outputs: NodeOutput[] = [
      ...schedule1Output(parsed),
      ...agiOutput(parsed),
    ];
    return { outputs };
  }
}

// ── Singleton export ──────────────────────────────────────────────────────────

export const educator_expenses = new EducatorExpensesNode();

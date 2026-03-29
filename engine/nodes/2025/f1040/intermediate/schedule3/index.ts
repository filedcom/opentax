import { z } from "zod";
import type { NodeOutput, NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { f1040 } from "../../outputs/f1040/index.ts";

// ─── Schema ───────────────────────────────────────────────────────────────────

// Schedule 3 aggregates nonrefundable credits (Part I → line 8 → f1040 line 20)
// and additional payments (Part II → line 15 → f1040 line 31).
// All fields are optional — any subset may be present on a given return.
export const inputSchema = z.object({
  // ── Part I — Nonrefundable Credits ─────────────────────────────────────────

  // Line 1 — Foreign tax credit (from Form 1116 line 35)
  // IRC §901; Form 1116 line 35 → Schedule 3 line 1
  line1_foreign_tax_credit: z.number().nonnegative().optional(),

  // Line 1 — Foreign tax credit reported directly from 1099-DIV/1099-INT (de minimis)
  // When total foreign taxes ≤ $300 ($600 MFJ), Form 1116 is not required.
  // Both line1 fields are summed into Part I line 1.
  // IRC §901; Treas. Reg. §1.901-1
  line1_foreign_tax_1099: z.number().nonnegative().optional(),

  // Line 2 — Child and dependent care credit (from Form 2441 line 11)
  // IRC §21; Form 2441 line 11 → Schedule 3 line 2
  line2_childcare_credit: z.number().nonnegative().optional(),

  // Line 3 — Education credits (from Form 8863 line 19 — LLC or nonrefundable AOC)
  // IRC §25A; Form 8863 line 19 → Schedule 3 line 3
  line3_education_credit: z.number().nonnegative().optional(),

  // Line 4 — Retirement savings contributions credit (from Form 8880 line 12)
  // IRC §25B; Form 8880 line 12 → Schedule 3 line 4
  line4_retirement_savings_credit: z.number().nonnegative().optional(),

  // Line 6b — Child tax credit / credit for other dependents (from Form 8812 line 14)
  // IRC §24; Form 8812 line 14 → Schedule 3 line 6b (nonrefundable portion)
  line6b_child_tax_credit: z.number().nonnegative().optional(),

  // Line 6c — Adoption credit (from Form 8839 Part II — nonrefundable portion)
  // IRC §23; Form 8839 → Schedule 3 line 6c
  line6c_adoption_credit: z.number().nonnegative().optional(),

  // ── Part II — Other Payments and Credits ───────────────────────────────────

  // Line 10 — Amount paid with extension request (Form 4868 line 7)
  // IRC §6081; Form 4868 line 7 → Schedule 3 line 10
  line10_amount_paid_extension: z.number().nonnegative().optional(),

  // Line 11 — Excess social security tax withheld
  // IRC §31(b); excess SS over wage base across multiple employers → Schedule 3 line 11
  line11_excess_ss: z.number().nonnegative().optional(),
});

type Schedule3Input = z.infer<typeof inputSchema>;

// ─── Pure helpers ─────────────────────────────────────────────────────────────

// Part I, Line 1 — total foreign tax credit.
// Combines Form 1116 allowed credit and de minimis 1099 foreign taxes.
// IRC §901, Treas. Reg. §1.901-1
function line1(input: Schedule3Input): number {
  return (input.line1_foreign_tax_credit ?? 0) + (input.line1_foreign_tax_1099 ?? 0);
}

// Part I, Line 8 — total nonrefundable credits.
// Sum of lines 1–7 (lines 5, 6a, 6d–6z, and 7 are not yet modeled).
function partITotal(input: Schedule3Input): number {
  return (
    line1(input) +
    (input.line2_childcare_credit ?? 0) +
    (input.line3_education_credit ?? 0) +
    (input.line4_retirement_savings_credit ?? 0) +
    (input.line6b_child_tax_credit ?? 0) +
    (input.line6c_adoption_credit ?? 0)
  );
}

// Part II, Line 15 — total additional payments and credits.
// Sum of lines 9–14 (lines 9, 12–14 are not yet modeled).
function partIITotal(input: Schedule3Input): number {
  return (
    (input.line10_amount_paid_extension ?? 0) +
    (input.line11_excess_ss ?? 0)
  );
}

// ─── Node class ───────────────────────────────────────────────────────────────

class Schedule3Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "schedule3";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([f1040]);

  compute(rawInput: Schedule3Input): NodeResult {
    const input = inputSchema.parse(rawInput);

    const credits = partITotal(input);
    const payments = partIITotal(input);

    if (credits === 0 && payments === 0) return { outputs: [] };

    const f1040Input: Record<string, number> = {};
    if (credits > 0) f1040Input.line20_nonrefundable_credits = credits;
    if (payments > 0) f1040Input.line31_additional_payments = payments;

    const outputs: NodeOutput[] = [
      { nodeType: f1040.nodeType, input: f1040Input },
    ];

    return { outputs };
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const schedule3 = new Schedule3Node();

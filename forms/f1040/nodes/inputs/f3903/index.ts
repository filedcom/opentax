import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import { TaxNode, output } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { schedule1 } from "../../outputs/schedule1/index.ts";

// TY2025 — Moving expense deduction (IRC §217) is suspended for most taxpayers
// under TCJA (P.L. 115-97, §11049). Available ONLY for active duty military
// personnel moving pursuant to a military order and incident to a permanent
// change of station (PCS). Rev. Proc. 2024-40.

// Per-move schema — each Form 3903 covers one move
export const itemSchema = z.object({
  // Line 1 — Transportation and storage expenses
  transportation_storage: z.number().nonnegative().optional(),
  // Line 2 — Travel expenses (mileage or actual cost)
  travel_expenses: z.number().nonnegative().optional(),
  // Line 3 — Total moving expenses (sum of lines 1 and 2)
  // If omitted, computed from lines 1 + 2
  total_expenses: z.number().nonnegative().optional(),
  // Line 4 — Employer reimbursements (from W-2 Box 12 code P or other)
  employer_reimbursements: z.number().nonnegative().optional(),
  // Whether this move was pursuant to active duty military orders (PCS)
  active_duty_military: z.boolean().optional(),
  // Move description / location context
  move_description: z.string().optional(),
});

export const inputSchema = z.object({
  f3903s: z.array(itemSchema).min(1),
});

type F3903Item = z.infer<typeof itemSchema>;
type F3903Items = F3903Item[];

function militaryItems(items: F3903Items): F3903Items {
  return items.filter((item) => item.active_duty_military === true);
}

function netDeduction(item: F3903Item): number {
  const total = item.total_expenses ?? (
    (item.transportation_storage ?? 0) + (item.travel_expenses ?? 0)
  );
  const reimbursed = item.employer_reimbursements ?? 0;
  return Math.max(0, total - reimbursed);
}

function totalMilitaryDeduction(items: F3903Items): number {
  return militaryItems(items).reduce((sum, item) => sum + netDeduction(item), 0);
}

function schedule1Output(items: F3903Items): NodeOutput[] {
  const deduction = totalMilitaryDeduction(items);
  if (deduction === 0) return [];
  return [output(schedule1, { line14_moving_expenses: deduction })];
}

class F3903Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f3903";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule1]);

  compute(input: z.infer<typeof inputSchema>): NodeResult {
    const parsed = inputSchema.parse(input);
    const { f3903s } = parsed;

    const outputs: NodeOutput[] = [
      ...schedule1Output(f3903s),
    ];

    return { outputs };
  }
}

export const f3903 = new F3903Node();

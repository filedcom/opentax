import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { f1040 } from "../../outputs/f1040/index.ts";

// Per-item schema — one SSA-1099 or RRB-1099
export const itemSchema = z.object({
  // Payer identification
  payer_name: z.string().min(1),

  // Box 3 — Total social security benefits paid in 2025
  box3_gross_benefits: z.number().nonnegative(),

  // Box 4 — Total benefits repaid to SSA/RRB in 2025
  box4_repaid: z.number().nonnegative().optional(),

  // Box 6 — Voluntary federal income tax withheld (W-4V)
  // Source: IRS Form 1040 instructions, Line 25b — "box 6, of Form SSA-1099"
  box6_federal_withheld: z.number().nonnegative().optional(),

  // Informational: true if this is RRB-1099 (Railroad Retirement Board)
  // Treated identically to SSA-1099 for federal taxability purposes
  is_rrb: z.boolean().optional(),
});

// Node inputSchema — receives all SSA-1099s and RRB-1099s for this return
export const inputSchema = z.object({
  ssas: z.array(itemSchema).min(1),
});

type SsaItem = z.infer<typeof itemSchema>;

// Compute net benefit for a single item: Box 5 = max(0, Box 3 - Box 4)
// IRS Form 1040 instructions, Line 6a: "box 5 of all your Forms SSA-1099 and RRB-1099"
function netBenefit(item: SsaItem): number {
  const gross = item.box3_gross_benefits;
  const repaid = item.box4_repaid ?? 0;
  return Math.max(0, gross - repaid);
}

// Sum net benefits across all items (Worksheet Line 1)
function totalNetBenefits(items: SsaItem[]): number {
  return items.reduce((sum, item) => sum + netBenefit(item), 0);
}

// Sum voluntary federal withholding across all items
// IRS Form 1040 instructions, Line 25b: "box 6, of Form SSA-1099"
function totalWithheld(items: SsaItem[]): number {
  return items.reduce((sum, item) => sum + (item.box6_federal_withheld ?? 0), 0);
}

// Build f1040 output merging line6a_ss_gross and line25b_withheld_1099
function f1040Output(items: SsaItem[]): NodeOutput[] {
  const netTotal = totalNetBenefits(items);
  const withheldTotal = totalWithheld(items);

  const fields: Record<string, number> = {};
  if (netTotal > 0) {
    fields.line6a_ss_gross = netTotal;
  }
  if (withheldTotal > 0) {
    fields.line25b_withheld_1099 = withheldTotal;
  }

  if (Object.keys(fields).length === 0) {
    return [];
  }
  return [{ nodeType: f1040.nodeType, input: fields }];
}

class Ssa1099Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "ssa1099";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([f1040]);

  compute(input: z.infer<typeof inputSchema>): NodeResult {
    const { ssas } = inputSchema.parse(input);
    const outputs: NodeOutput[] = f1040Output(ssas);
    return { outputs };
  }
}

export const ssa1099 = new Ssa1099Node();

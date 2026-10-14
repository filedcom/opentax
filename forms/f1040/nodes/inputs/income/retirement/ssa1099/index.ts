import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../../../core/types/tax-node.ts";
import {
  type AtLeastOne,
  output,
  TaxNode,
} from "../../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../../core/types/output-nodes.ts";
import { f1040 } from "../../../../outputs/general/return-assembly/f1040/index.ts";
import { agi_aggregator } from "../../../../intermediate/aggregation/general/return-assembly/agi_aggregator/index.ts";
import type { NodeContext } from "../../../../../../../core/types/node-context.ts";

// Per-item schema — one SSA-1099 or RRB-1099
export const itemSchema = z.object({
  // Payer identification — optional because the payer is always Social Security Administration
  payer_name: z.string().optional(),
  // Form SSA-1099 or RRB-1099 box 2 and the reviewed issued-copy identity.
  recipient_tin: z.string().regex(/^\d{9}$/).optional(),
  source_document_reference: z.string().trim().min(1).optional(),

  // Box 3 — Total social security benefits paid in 2025
  box3_gross_benefits: z.number().nonnegative(),

  // Box 4 — Total benefits repaid to SSA/RRB in 2025
  box4_repaid: z.number().nonnegative().optional(),

  // Box 5 — Net benefits for 2025 (Box 3 minus Box 4, as precomputed by SSA)
  // When provided, used directly instead of computing box3 - box4.
  // IRS Form 1040 instructions, Line 6a: "box 5 of all your Forms SSA-1099 and RRB-1099"
  box5_net_benefits: z.number().optional().describe(
    "Net benefits for 2025 (Box 3 minus Box 4)",
  ),

  // Box 6 — Voluntary federal income tax withheld (W-4V)
  // Source: IRS Form 1040 instructions, Line 25b — "box 6, of Form SSA-1099"
  box6_federal_withheld: z.number().nonnegative().optional(),

  // Form RRB-1099 reports SSEB withholding in box 10, not SSA-1099 box 6.
  rrb_box10_federal_withheld: z.number().nonnegative().optional(),

  // Informational: true if this is RRB-1099 (Railroad Retirement Board)
  // Treated identically to SSA-1099 for federal taxability purposes
  is_rrb: z.boolean().optional(),
}).superRefine((item, ctx) => {
  if (
    item.box5_net_benefits !== undefined &&
    Math.round(item.box5_net_benefits * 100) !==
      Math.round(item.box3_gross_benefits * 100) -
        Math.round((item.box4_repaid ?? 0) * 100)
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["box5_net_benefits"],
      message: "SSA-1099 box 5 must equal box 3 minus box 4",
    });
  }
  if (item.is_rrb === true && item.box6_federal_withheld !== undefined) {
    ctx.addIssue({
      code: "custom",
      path: ["box6_federal_withheld"],
      message: "RRB-1099 withholding belongs in box 10, not SSA-1099 box 6",
    });
  }
  if (
    item.is_rrb !== true && item.rrb_box10_federal_withheld !== undefined
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["rrb_box10_federal_withheld"],
      message: "SSA-1099 withholding belongs in box 6, not RRB-1099 box 10",
    });
  }
});

// Node inputSchema — receives all SSA-1099s and RRB-1099s for this return
export const inputSchema = z.object({
  ssas: z.array(itemSchema).min(1),
}).superRefine((input, ctx) => {
  const seen = new Set<string>();
  for (const [index, row] of input.ssas.entries()) {
    if (!row.source_document_reference) continue;
    const key = JSON.stringify([
      row.is_rrb === true ? "RRB-1099" : "SSA-1099",
      row.source_document_reference.toUpperCase(),
    ]);
    if (seen.has(key)) {
      ctx.addIssue({
        code: "custom",
        path: ["ssas", index],
        message: "Benefit statement repeats an issued-copy reference",
      });
    }
    seen.add(key);
  }
});

type SsaItem = z.infer<typeof itemSchema>;

// Compute signed net benefit for a single item: Box 5 = Box 3 - Box 4.
// IRS Form 1040 instructions, Line 6a: "box 5 of all your Forms SSA-1099 and RRB-1099"
// When box5_net_benefits is provided by the SSA, use it directly (authoritative precomputed value).
function netBenefit(item: SsaItem): number {
  if (item.box5_net_benefits !== undefined) return item.box5_net_benefits;
  const gross = item.box3_gross_benefits;
  const repaid = item.box4_repaid ?? 0;
  return gross - repaid;
}

// Sum net benefits across all items (Worksheet Line 1)
function totalNetBenefits(items: SsaItem[]): number {
  return items.reduce((sum, item) => sum + netBenefit(item), 0);
}

// Sum voluntary federal withholding across all items
// IRS Form 1040 instructions, Line 25b: "box 6, of Form SSA-1099"
function totalWithheld(items: SsaItem[]): number {
  return items.reduce(
    (sum, item) =>
      sum +
      (item.is_rrb === true
        ? (item.rrb_box10_federal_withheld ?? 0)
        : (item.box6_federal_withheld ?? 0)),
    0,
  );
}

// Build a merged f1040 fields object for all SSA amounts.
// Merges line6a_ss_gross and line25b_withheld_1099 into a single output to satisfy
// tests that expect exactly one f1040 output from this node.
function f1040Fields(
  netTotal: number,
  withheldTotal: number,
): { line6a_ss_gross?: number; line25b_withheld_1099?: number } | null {
  const fields: { line6a_ss_gross?: number; line25b_withheld_1099?: number } =
    {};
  if (netTotal > 0) fields.line6a_ss_gross = netTotal;
  if (withheldTotal > 0) fields.line25b_withheld_1099 = withheldTotal;
  return Object.keys(fields).length > 0 ? fields : null;
}

// Build outputs for SSA-1099 items.
// Gross benefits route to both f1040 (line 6a display) and agi_aggregator (taxability worksheet).
// Withholding routes to f1040 merged with the gross output (single f1040 output).
function buildOutputs(items: SsaItem[]): NodeOutput[] {
  const netTotal = totalNetBenefits(items);
  const withheldTotal = totalWithheld(items);
  const outputs: NodeOutput[] = [];

  // Emit a single merged f1040 output for all SSA fields.
  const merged = f1040Fields(netTotal, withheldTotal);
  if (merged !== null) {
    outputs.push(
      output(f1040, merged as Parameters<typeof output<typeof f1040>>[1]),
    );
  }

  // Also route gross to agi_aggregator so the taxability worksheet can compute line 6b.
  if (netTotal > 0) {
    outputs.push(output(agi_aggregator, { line6a_ss_gross: netTotal }));
  }

  return outputs;
}

class Ssa1099Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "ssa1099";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([f1040, agi_aggregator]);

  compute(_ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
    const { ssas } = inputSchema.parse(input);
    if (totalNetBenefits(ssas) < 0) {
      throw new Error(
        "Negative total SSA-1099 benefits need repayment deduction or credit review before filing",
      );
    }
    const outputs: NodeOutput[] = buildOutputs(ssas);
    return { outputs };
  }
}

export const ssa1099 = new Ssa1099Node();

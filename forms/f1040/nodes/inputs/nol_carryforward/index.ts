import { z } from "zod";
import type { NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// TY2025 NOL carryforward source is not complete. A loss-year amount and
// taxpayer-asserted current taxable income cannot establish the Form 172
// carryover ledger, Schedule 1 line 8a, or Form 6251 lines 2e/2f.

// ── Enums ─────────────────────────────────────────────────────────────────────

export enum NolType {
  PRE2018 = "PRE2018",
  POST2017 = "POST2017",
}

// ── Schemas ───────────────────────────────────────────────────────────────────

export const itemSchema = z.object({
  year: z.number().int().positive(),
  nol_amount: z.number().nonnegative(),
  nol_type: z.nativeEnum(NolType),
});

export const inputSchema = z.object({
  nol_carryforwards: z.array(itemSchema).min(1),
  current_year_taxable_income: z.number(),
});

// ── Node class ────────────────────────────────────────────────────────────────

class NolCarryforwardNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "nol_carryforward";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([]);

  compute(_ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
    const parsed = inputSchema.parse(input);
    if (parsed.nol_carryforwards.some((item) => item.nol_amount > 0)) {
      throw new Error(
        "NOL carryforward needs sourced Form 172 loss-year and carryover calculations plus Form 6251 AMT refigure before reducing income",
      );
    }
    // A zero-valued placeholder has no tax output. Both exports still reject
    // the populated NOL source until Form 172 can be attached.
    return { outputs: [] };
  }
}

export const nol_carryforward = new NolCarryforwardNode();

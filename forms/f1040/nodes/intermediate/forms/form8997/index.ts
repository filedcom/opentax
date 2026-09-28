import { z } from "zod";
import type { NodeResult } from "../../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../../../core/types/node-context.ts";

// ─── Form 8997 — QOF Investment Statement (IRC §1400Z-2) ──────────────────────
//
// This duplicate, legacy input lacks Form 8997 Parts I-IV and Form 8949 source
// transactions. Reject it rather than treating all inclusion as long-term gain
// or misreporting it as undistributed capital gain from Form 2439.

// ─── Schemas ─────────────────────────────────────────────────────────────────

export const itemSchema = z.object({
  // QOF EIN for identification (from Part I / Part IV reporting)
  qof_ein: z.string().optional(),

  // Original deferred gain invested into this QOF
  // This is the gain that was excluded in the year of investment and is
  // now potentially coming back into income on an inclusion event.
  deferred_gain: z.number().nonnegative(),

  // Date of QOF investment (ISO 8601, e.g. "2023-07-15")
  investment_date: z.string(),

  // Legacy asserted inclusion amount. Insufficient to calculate an inclusion
  // or determine the reporting form and tax character.
  inclusion_amount: z.number().nonnegative().optional(),

  // Legacy assertion without the proceeds, adjusted basis, and election facts
  // required to apply the 10-year FMV basis rule.
  held_10_years: z.boolean().optional(),

  // Fair market value of QOF investment at end of year (for Part IV reporting)
  fmv_end_of_year: z.number().nonnegative().optional(),
});

export const inputSchema = z.object({
  investments: z.array(itemSchema).min(1),
});

// ─── Node Class ───────────────────────────────────────────────────────────────

class Form8997Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "form8997";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([]);

  compute(_ctx: NodeContext, rawInput: z.infer<typeof inputSchema>): NodeResult {
    inputSchema.parse(rawInput);
    throw new Error(
      "Legacy form8997 investment input is unsupported; use source-linked Form 8997 Parts I-IV and Form 8949 transactions",
    );
  }
}

// ─── Singleton Export ─────────────────────────────────────────────────────────

export const form8997 = new Form8997Node();

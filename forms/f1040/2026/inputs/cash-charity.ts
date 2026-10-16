import { inputSchema, reviewCashGifts2026 } from "./cash-gift-source.ts";
export { cashGift2026Schema, inputSchema } from "./cash-gift-source.ts";
import { z } from "zod";
import type { NodeContext } from "../../../../core/types/node-context.ts";
import { type NodeResult, TaxNode } from "../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../core/types/output-nodes.ts";
import { standard_deduction_2026 } from "../nodes/standard_deduction.ts";
import { schedule_a_2026 } from "../nodes/schedule-a.ts";

/** Cash-source owner; Schedule A and §170(p) share each contribution identity. */
class CashCharity2026Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "cash_charity";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([
    standard_deduction_2026,
    schedule_a_2026,
  ]);
  compute(ctx: NodeContext, raw: z.input<typeof inputSchema>): NodeResult {
    if (ctx.taxYear !== 2026 || ctx.formType !== "f1040") {
      throw new Error("Cash charity needs f1040:2026 context");
    }
    const rows = reviewCashGifts2026(raw);
    if (rows.length === 0) return { outputs: [] };
    const eligible = rows.reduce(
      (sum, row) => sum + row.nonitemizer_eligible_amount,
      0,
    );
    if (!Number.isFinite(eligible) || eligible > Number.MAX_SAFE_INTEGER) {
      throw new Error("Cash gifts exceed amount range");
    }
    return {
      outputs: [
        {
          nodeType: "standard_deduction",
          fields: { nonitemizer_cash_contributions: eligible },
        },
        // No net Schedule A amount is asserted here: category limits, the 2026
        // floor and carryforwards belong to that receiving source calculator.
        { nodeType: "schedule_a", fields: { cash_gift_sources_2026: rows } },
        { nodeType: this.nodeType, fields: { reviewed_cash_gifts_2026: rows } },
      ],
    };
  }
}
export const cash_charity_2026 = new CashCharity2026Node();

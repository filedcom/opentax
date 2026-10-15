import { z } from "zod";
import type { NodeContext } from "../../../../core/types/node-context.ts";
import { type NodeResult, TaxNode } from "../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../core/types/output-nodes.ts";
import { agi_2026 } from "../nodes/agi.ts";
import { schedule1_2026 } from "../nodes/schedule1.ts";
import { f1040_2026_node } from "../nodes/f1040.ts";
import {
  calculateMovingSources2026,
  movingClaim2026Schema,
  movingSource2026Schema,
} from "./moving-source.ts";
export { movingClaim2026Schema } from "./moving-source.ts";
export const inputSchema = movingClaim2026Schema.partial().extend(
  movingSource2026Schema.pick({
    filing_status: true,
    taxpayer_ssn: true,
    spouse_ssn: true,
    w2_moving_sources_2026: true,
  }).shape,
).strict();
class MovingExpenses2026Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f3903";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([
    agi_2026,
    schedule1_2026,
    f1040_2026_node,
  ]);
  compute(ctx: NodeContext, raw: z.input<typeof inputSchema>): NodeResult {
    if (ctx.taxYear !== 2026 || ctx.formType !== "f1040") {
      throw new Error("Moving expenses need f1040:2026 context");
    }
    const input = inputSchema.parse(raw);
    if (input.tax_year === undefined && input.moves === undefined) {
      if (input.w2_moving_sources_2026.some((w) => w.box12_p > 0)) {
        throw new Error("W-2 code P needs the moving expense ledger");
      }
      return { outputs: [] };
    }
    const result = calculateMovingSources2026(
      movingSource2026Schema.parse(input),
    );
    return {
      outputs: [
        { nodeType: this.nodeType, fields: { calculation_2026: result } },
        {
          nodeType: "agi_aggregator",
          fields: {
            line14_moving_expenses: result.schedule1Line14,
            line1h_other_earned: result.f1040Line1h,
          },
        },
        {
          nodeType: "schedule1",
          fields: {
            line14_moving_expenses: result.schedule1Line14,
            ...(result.schedule1StorageFees
              ? { line14_storage_fees: true }
              : {}),
          },
        },
        {
          nodeType: "f1040",
          fields: { line1h_other_earned: result.f1040Line1h },
        },
      ],
    };
  }
}
export const moving_expenses_2026 = new MovingExpenses2026Node();

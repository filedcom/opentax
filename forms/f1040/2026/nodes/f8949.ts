import { z } from "zod";
import type { NodeContext } from "../../../../core/types/node-context.ts";
import { OutputNodes } from "../../../../core/types/output-nodes.ts";
import { TaxNode } from "../../../../core/types/tax-node.ts";
import {
  form8949,
  Form8949Part,
} from "../../nodes/intermediate/forms/form8949/index.ts";

const money = z.number().finite().nonnegative();

/** A plain capital disposition without a Form 1099-B or Form 1099-DA. */
export const f8949Item2026Schema = z.object({
  asset_kind: z.enum(["security", "digital_asset"]),
  term: z.enum(["short", "long"]),
  description: z.string().trim().min(1),
  date_acquired: z.string().trim().min(1),
  date_sold: z.string().trim().min(1),
  proceeds: money,
  cost_basis: money,
}).strict();

export const f8949Input2026Schema = z.object({
  f8949s: z.array(f8949Item2026Schema).min(1),
}).strict();

class F8949Node2026 extends TaxNode<typeof f8949Input2026Schema> {
  readonly nodeType = "f8949";
  readonly inputSchema = f8949Input2026Schema;
  readonly outputNodes = new OutputNodes([form8949]);

  compute(ctx: NodeContext, rawInput: z.input<typeof f8949Input2026Schema>) {
    if (ctx.taxYear !== 2026 || ctx.formType !== "f1040") {
      throw new Error("TY2026 Form 8949 source requires f1040:2026 context");
    }
    const { f8949s } = this.inputSchema.parse(rawInput);
    return {
      outputs: f8949s.map((item) => {
        const part = item.asset_kind === "digital_asset"
          ? (item.term === "long" ? Form8949Part.L : Form8949Part.I)
          : (item.term === "long" ? Form8949Part.F : Form8949Part.C);
        return this.outputNodes.output(form8949, {
          transaction: {
            part,
            description: item.description,
            date_acquired: item.date_acquired,
            date_sold: item.date_sold,
            proceeds: item.proceeds,
            cost_basis: item.cost_basis,
            gain_loss: item.proceeds - item.cost_basis,
            is_long_term: item.term === "long",
          },
        });
      }),
    };
  }
}

export const f8949_2026 = new F8949Node2026();

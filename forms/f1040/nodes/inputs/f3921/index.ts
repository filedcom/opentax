import { z } from "zod";
import type { NodeContext } from "../../../../../core/types/node-context.ts";
import type { NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { form6251 } from "../../intermediate/forms/form6251/index.ts";

// Form 3921 supplies the exercise-date spread. The extra facts establish the
// narrow Form 6251 line 2i case where that spread is recognized in this year.
export const itemSchema = z.object({
  box2_date_option_exercised: z.string().date(),
  box3_exercise_price_per_share: z.number().finite().nonnegative(),
  box4_fmv_per_share: z.number().finite().nonnegative(),
  box5_shares_transferred: z.number().int().positive(),
  rights_transferable_and_not_subject_to_substantial_risk_on_exercise:
    z.literal(true),
  shares_disposed_during_exercise_year: z.literal(0),
  amount_paid_for_option: z.literal(0),
});

export const inputSchema = z.object({ f3921s: z.array(itemSchema).min(1) });

class F3921Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f3921";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([form6251]);

  compute(_ctx: NodeContext, rawInput: z.infer<typeof inputSchema>): NodeResult {
    const { f3921s } = inputSchema.parse(rawInput);
    const totalSpread = f3921s.reduce((sum, item) => {
      if (!item.box2_date_option_exercised.startsWith("2025-")) {
        throw new Error("Form 3921 line 2i exercise must occur in 2025");
      }
      const spread = (item.box4_fmv_per_share -
        item.box3_exercise_price_per_share) * item.box5_shares_transferred;
      if (!Number.isSafeInteger(Math.round(spread))) {
        throw new Error("Form 3921 line 2i spread exceeds whole-dollar range");
      }
      return sum + Math.max(0, spread);
    }, 0);
    const adjustment = Math.round(totalSpread);
    if (!Number.isSafeInteger(adjustment)) {
      throw new Error("Form 3921 line 2i total exceeds whole-dollar range");
    }
    return adjustment > 0
      ? { outputs: [this.outputNodes.output(form6251, { iso_adjustment: adjustment })] }
      : { outputs: [] };
  }
}

export const f3921 = new F3921Node();

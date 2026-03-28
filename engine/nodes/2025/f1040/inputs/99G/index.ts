import { z } from "zod";
import type { NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { f1040 } from "../../outputs/f1040/index.ts";
import { schedule1 } from "../../outputs/schedule1/index.ts";
import { schedule_f } from "../../intermediate/schedule_f/index.ts";

export const itemSchema = z.object({
  box_1_unemployment: z.number().nonnegative().optional(),
  box_1_repaid: z.number().nonnegative().optional(),
  box_2_state_refund: z.number().nonnegative().optional(),
  box_2_prior_year_itemized: z.boolean().optional(),
  box_4_federal_withheld: z.number().nonnegative().optional(),
  box_5_rtaa: z.number().nonnegative().optional(),
  box_6_taxable_grants: z.number().nonnegative().optional(),
  box_7_agriculture: z.number().nonnegative().optional(),
  box_9_market_gain: z.number().nonnegative().optional(),
});

export const inputSchema = z.object({
  g99s: z.array(itemSchema).min(1),
});

class G99Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "g99";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule1, f1040, schedule_f]);

  compute(input: z.infer<typeof inputSchema>): NodeResult {
    const out = this.outputNodes.builder();

    for (const item of input.g99s) {
      const unemploymentNet = (item.box_1_unemployment ?? 0) -
        (item.box_1_repaid ?? 0);
      if (unemploymentNet > 0) {
        out.add(schedule1, { line7_unemployment: unemploymentNet });
      }

      const stateRefund = item.box_2_state_refund ?? 0;
      if (item.box_2_prior_year_itemized === true && stateRefund > 0) {
        out.add(schedule1, { line1_state_refund: stateRefund });
      }

      const box4 = item.box_4_federal_withheld ?? 0;
      if (box4 > 0) {
        out.add(f1040, { line25b_withheld_1099: box4 });
      }

      const box5 = item.box_5_rtaa ?? 0;
      if (box5 > 0) {
        out.add(schedule1, { line8z_rtaa: box5 });
      }

      const box6 = item.box_6_taxable_grants ?? 0;
      if (box6 > 0) {
        out.add(schedule1, { line8z_taxable_grants: box6 });
      }

      const box7 = item.box_7_agriculture ?? 0;
      if (box7 > 0) {
        out.add(schedule_f, { line4a_gov_payments: box7 });
      }

      const box9 = item.box_9_market_gain ?? 0;
      if (box9 > 0) {
        out.add(schedule_f, { line5_ccc_gain: box9 });
      }
    }

    return out.build();
  }
}

export const g99 = new G99Node();

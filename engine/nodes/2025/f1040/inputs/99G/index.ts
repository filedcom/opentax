import { z } from "zod";
import type { NodeOutput, NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";

export const inputSchema = z.object({
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

type G99Input = z.infer<typeof inputSchema>;

class G99Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "g99";
  readonly inputSchema = inputSchema;
  readonly outputNodeTypes = [
    "schedule1",
    "f1040",
    "schedule_f",
  ] as const;

  compute(input: G99Input): NodeResult {
    const outputs: NodeOutput[] = [];

    // Unemployment net = box_1_unemployment - box_1_repaid
    const unemploymentNet =
      (input.box_1_unemployment ?? 0) - (input.box_1_repaid ?? 0);
    if (unemploymentNet > 0) {
      outputs.push({
        nodeType: "schedule1",
        input: { line7_unemployment: unemploymentNet },
      });
    }

    // State refund: only taxable if taxpayer itemized in prior year
    const stateRefund = input.box_2_state_refund ?? 0;
    if (input.box_2_prior_year_itemized === true && stateRefund > 0) {
      outputs.push({
        nodeType: "schedule1",
        input: { line1_state_refund: stateRefund },
      });
    }

    // box_4 → f1040 line25b
    const box4 = input.box_4_federal_withheld ?? 0;
    if (box4 > 0) {
      outputs.push({
        nodeType: "f1040",
        input: { line25b_withheld_1099: box4 },
      });
    }

    // box_5 → schedule1 line8z_rtaa
    const box5 = input.box_5_rtaa ?? 0;
    if (box5 > 0) {
      outputs.push({
        nodeType: "schedule1",
        input: { line8z_rtaa: box5 },
      });
    }

    // box_6 → schedule1 line8z_taxable_grants
    const box6 = input.box_6_taxable_grants ?? 0;
    if (box6 > 0) {
      outputs.push({
        nodeType: "schedule1",
        input: { line8z_taxable_grants: box6 },
      });
    }

    // box_7 → schedule_f line4a_gov_payments
    const box7 = input.box_7_agriculture ?? 0;
    if (box7 > 0) {
      outputs.push({
        nodeType: "schedule_f",
        input: { line4a_gov_payments: box7 },
      });
    }

    // box_9 → schedule_f line5_ccc_gain
    const box9 = input.box_9_market_gain ?? 0;
    if (box9 > 0) {
      outputs.push({
        nodeType: "schedule_f",
        input: { line5_ccc_gain: box9 },
      });
    }

    return { outputs };
  }
}

export const g99 = new G99Node();

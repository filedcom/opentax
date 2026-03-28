import { z } from "zod";
import type { NodeOutput, NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";

export const inputSchema = z.object({
  payer_name: z.string(),
  payer_ein: z.string(),
  box1_gross_distribution: z.number().nonnegative(),
  box2a_taxable_amount: z.number().nonnegative().optional(),
  box2b_taxable_not_determined: z.boolean().optional(),
  box4_federal_withheld: z.number().nonnegative().optional(),
  box7_distribution_code: z.string(),
  box7_ira_sep_simple: z.boolean().optional(),
  box9b_employee_contributions: z.number().nonnegative().optional(),
});

type R1099Input = z.infer<typeof inputSchema>;

class R1099Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "r1099";
  readonly inputSchema = inputSchema;
  readonly outputNodeTypes = ["f1040", "form5329", "form4972"] as const;

  compute(input: R1099Input): NodeResult {
    const outputs: NodeOutput[] = [];

    const taxableAmount = input.box2a_taxable_amount ?? input.box1_gross_distribution;

    // IRA vs pension routing
    if (input.box7_ira_sep_simple === true) {
      outputs.push({
        nodeType: "f1040",
        input: {
          line4a_ira_gross: input.box1_gross_distribution,
          line4b_ira_taxable: taxableAmount,
        },
      });
    } else {
      outputs.push({
        nodeType: "f1040",
        input: {
          line5a_pension_gross: input.box1_gross_distribution,
          line5b_pension_taxable: taxableAmount,
        },
      });
    }

    // Federal withholding → f1040 line25b
    if (input.box4_federal_withheld !== undefined && input.box4_federal_withheld > 0) {
      outputs.push({
        nodeType: "f1040",
        input: { line25b_withheld_1099: input.box4_federal_withheld },
      });
    }

    // Distribution code 1: early distribution, no exception → form5329
    if (input.box7_distribution_code === "1") {
      outputs.push({
        nodeType: "form5329",
        input: {
          early_distribution: taxableAmount,
          distribution_code: "1",
        },
      });
    }

    // Distribution code 5: profit-sharing lump sum → form4972
    if (input.box7_distribution_code === "5") {
      outputs.push({
        nodeType: "form4972",
        input: { lump_sum_amount: input.box1_gross_distribution },
      });
    }

    return { outputs };
  }
}

export const r1099 = new R1099Node();

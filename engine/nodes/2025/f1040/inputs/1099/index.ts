import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { f1040 } from "../../outputs/f1040/index.ts";
import { form5329 } from "../../intermediate/form5329/index.ts";
import { form4972 } from "../../intermediate/form4972/index.ts";

export const itemSchema = z.object({
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

export const inputSchema = z.object({
  r1099s: z.array(itemSchema).min(1),
});

type R1099Item = z.infer<typeof itemSchema>;

function distributionOutput(item: R1099Item, taxableAmount: number): NodeOutput {
  if (item.box7_ira_sep_simple === true) {
    return { nodeType: f1040.nodeType, input: { line4a_ira_gross: item.box1_gross_distribution, line4b_ira_taxable: taxableAmount } };
  }
  return { nodeType: f1040.nodeType, input: { line5a_pension_gross: item.box1_gross_distribution, line5b_pension_taxable: taxableAmount } };
}

function r1099ItemOutputs(item: R1099Item): NodeOutput[] {
  const taxableAmount = item.box2a_taxable_amount ?? item.box1_gross_distribution;
  return [
    distributionOutput(item, taxableAmount),
    ...((item.box4_federal_withheld ?? 0) > 0 ? [{ nodeType: f1040.nodeType, input: { line25b_withheld_1099: item.box4_federal_withheld } }] : []),
    ...(item.box7_distribution_code === "1" ? [{ nodeType: form5329.nodeType, input: { early_distribution: taxableAmount, distribution_code: "1" } }] : []),
    ...(item.box7_distribution_code === "5" ? [{ nodeType: form4972.nodeType, input: { lump_sum_amount: item.box1_gross_distribution } }] : []),
  ];
}

class R1099Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "r1099";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([f1040, form5329, form4972]);

  compute(input: z.infer<typeof inputSchema>): NodeResult {
    return { outputs: input.r1099s.flatMap(r1099ItemOutputs) };
  }
}

export const r1099 = new R1099Node();

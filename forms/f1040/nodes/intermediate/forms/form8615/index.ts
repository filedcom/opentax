import { z } from "zod";
import type { NodeContext } from "../../../../../../core/types/node-context.ts";
import { OutputNodes } from "../../../../../../core/types/output-nodes.ts";
import type { NodeResult } from "../../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../../core/types/tax-node.ts";
import { filingStatusSchema } from "../../../types.ts";

// Form 8615 is finalized by income_tax_calculation after the child's ordinary
// tax is known. This node validates and preserves its filed line values.
export const inputSchema = z.object({
  parent_name: z.string().min(1),
  parent_name_control: z.string().min(1),
  parent_ssn: z.string().regex(/^\d{9}$/),
  parent_filing_status: filingStatusSchema,
  line1_child_unearned_income: z.number().nonnegative(),
  line2_kiddie_deduction: z.number().nonnegative(),
  line3_adjusted_unearned_income: z.number(),
  line4_child_taxable_income: z.number().nonnegative().optional(),
  line5_child_net_unearned_income: z.number().nonnegative().optional(),
  line6_parent_taxable_income: z.number().nonnegative().optional(),
  line7_other_children_income: z.number().nonnegative().optional(),
  line8_family_income: z.number().nonnegative().optional(),
  line9_family_tax: z.number().nonnegative().optional(),
  line10_parent_tax: z.number().nonnegative().optional(),
  line11_children_tax: z.number().optional(),
  line12a_children_income: z.number().nonnegative().optional(),
  line12b_allocation_ratio: z.number().min(0).max(1).optional(),
  line13_allocable_tax: z.number().optional(),
  line14_child_net_income: z.number().nonnegative().optional(),
  line15_child_net_income_tax: z.number().nonnegative().optional(),
  line16_combined_child_tax: z.number().nonnegative().optional(),
  line17_child_regular_tax: z.number().nonnegative().optional(),
  line18_child_tax: z.number().nonnegative().optional(),
});

class Form8615Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "form8615";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([]);

  compute(
    _ctx: NodeContext,
    rawInput: z.infer<typeof inputSchema>,
  ): NodeResult {
    inputSchema.parse(rawInput);
    return { outputs: [] };
  }
}

export const form8615 = new Form8615Node();

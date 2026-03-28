import { z } from "zod";
import { UnimplementedTaxNode } from "../../../../../core/types/tax-node.ts";

const inputSchema = z.object({
  line1a_wages: z.number().optional(),
  line1e_taxable_dep_care: z.number().optional(),
  line1i_combat_pay: z.number().optional(),
  line2a_tax_exempt: z.number().optional(),
  line3a_qualified_dividends: z.number().optional(),
  line4a_ira_gross: z.number().optional(),
  line4b_ira_taxable: z.number().optional(),
  line5a_pension_gross: z.number().optional(),
  line5b_pension_taxable: z.number().optional(),
  line25a_w2_withheld: z.number().optional(),
  line25b_withheld_1099: z.number().optional(),
  line12e_itemized_deductions: z.number().optional(),
  line28_actc: z.number().optional(),
  line29_refundable_aoc: z.number().optional(),
  line38_amount_paid_extension: z.number().optional(),
});

class F1040Node extends UnimplementedTaxNode {
  override readonly inputSchema = inputSchema;
}

export const f1040 = new F1040Node("f1040");

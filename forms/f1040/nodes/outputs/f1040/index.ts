import { z } from "zod";
import { TaxNode, type NodeResult } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";

const inputSchema = z.object({
  line1a_wages: z.number().optional(),
  line1c_unreported_tips: z.number().optional(),
  line1e_taxable_dep_care: z.number().optional(),
  line1i_combat_pay: z.number().optional(),
  line2a_tax_exempt: z.number().optional(),
  line2b_taxable_interest: z.number().optional(),
  line3a_qualified_dividends: z.number().optional(),
  line3b_ordinary_dividends: z.number().optional(),
  line4a_ira_gross: z.number().optional(),
  line4b_ira_taxable: z.number().optional(),
  line5a_pension_gross: z.number().optional(),
  line5b_pension_taxable: z.number().optional(),
  line6a_ss_gross: z.number().optional(),
  line6b_ss_taxable: z.number().optional(),
  line7_capital_gain: z.number().optional(),
  line7a_cap_gain_distrib: z.number().optional(),
  line17_additional_taxes: z.number().nonnegative().optional(),
  line25a_w2_withheld: z.number().optional(),
  line25b_withheld_1099: z.number().optional(),
  // Line 25c — Additional Medicare Tax withheld (Form 8959 line 24)
  line25c_additional_medicare_withheld: z.number().nonnegative().optional(),
  line12e_itemized_deductions: z.number().optional(),
  line13_qbi_deduction: z.number().nonnegative().optional(),
  line28_actc: z.number().optional(),
  line29_refundable_aoc: z.number().optional(),
  line30_refundable_adoption: z.number().nonnegative().optional(),
  line1f_taxable_adoption_benefits: z.number().nonnegative().optional(),
  line1g_wages_8919: z.number().nonnegative().optional(),
  line38_amount_paid_extension: z.number().optional(),
  // Line 20 — Total nonrefundable credits (from Schedule 3 Part I line 8)
  line20_nonrefundable_credits: z.number().nonnegative().optional(),
  // Line 31 — Additional payments and credits (from Schedule 3 Part II line 15)
  line31_additional_payments: z.number().nonnegative().optional(),
});

class F1040Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f1040";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([]);
  compute(): NodeResult {
    return { outputs: [] };
  }
}

export const f1040 = new F1040Node();

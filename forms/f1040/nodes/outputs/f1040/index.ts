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
  // Line 38 — Penalty for underpayment of estimated tax (from Form 2210 line 19)
  // IRC §6654; Form 2210 line 19 → Form 1040 line 38
  line38_underpayment_penalty: z.number().nonnegative().optional(),
  // Line 20 — Total nonrefundable credits (from Schedule 3 Part I line 8)
  line20_nonrefundable_credits: z.number().nonnegative().optional(),
  // Line 27 — Earned Income Credit (EITC)
  // IRC §32; EITC worksheet → Form 1040 line 27
  line27_eitc: z.number().nonnegative().optional(),
  // Line 31 — Additional payments and credits (from Schedule 3 Part II line 15)
  line31_additional_payments: z.number().nonnegative().optional(),
  // Line 35 — Credit for federal tax on fuels (Form 4136)
  // IRC §§ 6421, 6427; refundable portion (farming use)
  line35_fuel_tax_credit: z.number().nonnegative().optional(),
  // Line 12a — Standard deduction (from standard_deduction node)
  // IRC §63(c); Rev. Proc. 2024-40 §3.14
  line12a_standard_deduction: z.number().nonnegative().optional(),
  // Line 15 — Taxable income (AGI minus deduction minus QBI deduction)
  // Form 1040 Line 15; IRC §63(a)
  line15_taxable_income: z.number().nonnegative().optional(),
  // Line 11 — Adjusted gross income (from AGI Aggregator node)
  // IRC §62; Form 1040 Line 11
  line11_agi: z.number().nonnegative().optional(),
  // Line 16 — Income tax (from tax tables, worksheets, or Schedule J line 23)
  // IRC §§ 1, 55; Schedule J replaces regular tax computation when income averaging elected
  line16_income_tax: z.number().nonnegative().optional(),
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

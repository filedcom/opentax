import { z } from "zod";
import { TaxNode, type NodeResult } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";

const inputSchema = z.object({
  line1_state_refund: z.number().optional(),
  line3_schedule_c: z.number().optional(),
  line13_depreciation: z.number().nonnegative().optional(),
  line4_other_gains: z.number().optional(),
  line7_unemployment: z.number().optional(),
  line8i_prizes_awards: z.number().optional(),
  line8z_rtaa: z.number().optional(),
  line8z_taxable_grants: z.number().optional(),
  line8z_substitute_payments: z.number().optional(),
  line8z_attorney_proceeds: z.number().optional(),
  line8z_nqdc: z.number().optional(),
  line8z_other: z.number().optional(),
  line8z_other_income: z.number().optional(),
  line8z_golden_parachute: z.number().optional(),
  line8p_excess_business_loss: z.number().nonnegative().optional(),
  line8c_cod_income: z.number().optional(),
  line5_schedule_e: z.number().optional(),
  line17_schedule_e: z.number().optional(),
  line18_early_withdrawal: z.number().optional(),
  line24f_501c18d: z.number().optional(),
  // Line 8e — Taxable Archer MSA / Medicare Advantage MSA distributions and LTC payments
  // IRC §220(f)(4), §138(c)(2), §7702B; Form 8853 lines 8, 12, 26 → Schedule 1 line 8e
  line8e_archer_msa_dist: z.number().nonnegative().optional(),
  // Line 23 — Archer MSA deduction
  // IRC §220(a); Form 8853 Part I line 5 → Schedule 1 line 23
  line23_archer_msa_deduction: z.number().nonnegative().optional(),
  // Line 6 — Net farm profit or loss from Schedule F, line 34
  // IRC §61; Schedule F (Form 1040) line 34 → Schedule 1 line 6
  line6_schedule_f: z.number().optional(),
  // Form 6198 at-risk disallowance add-back (positive; reduces an upstream-posted loss)
  at_risk_disallowed_add_back: z.number().nonnegative().optional(),
  // Line 13: HSA deduction (Form 8889 Part I result)
  // IRC §223(a); Form 8889 line 13 → Schedule 1 line 13
  line13_hsa_deduction: z.number().nonnegative().optional(),
  // Form 8990 §163(j) disallowed business interest add-back (positive; reverses
  // upstream-posted BIE deduction to the extent it is disallowed)
  biz_interest_disallowed_add_back: z.number().nonnegative().optional(),
  // Line 20 — IRA Deduction (IRA Deduction Worksheet → Schedule 1 line 20)
  // IRC §219; Pub 590-A
  line20_ira_deduction: z.number().nonnegative().optional(),
  // Line 15 — Deductible part of self-employment tax (from Schedule SE line 13)
  // IRC §164(f); Schedule SE line 13 → Schedule 1 line 15
  line15_se_deduction: z.number().nonnegative().optional(),
  // Line 8d — Foreign earned income exclusion (Form 2555 line 45)
  // IRC §911; Form 2555 line 45 → Schedule 1 line 8d (reported as negative adjustment)
  line8d_foreign_earned_income_exclusion: z.number().nonnegative().optional(),
  // Line 8d — Foreign housing deduction (Form 2555 line 50)
  // IRC §911(c); Form 2555 line 50 → Schedule 1 line 8d (housing)
  line8d_foreign_housing_deduction: z.number().nonnegative().optional(),
  // Line 24b — Self-employed health insurance deduction (Form 7206 line 17)
  // IRC §162(l); Form 7206 line 17 → Schedule 1 line 17 (reported on line 17)
  line17_se_health_insurance: z.number().nonnegative().optional(),
  // Line 8b — Savings bond interest exclusion (Form 8815 line 14)
  // IRC §135; Form 8815 line 14 → Schedule 1 line 8b
  line8b_savings_bond_exclusion: z.number().nonnegative().optional(),
  // Line 8g — Income from Form 8814 (parent's election for child's interest/dividends)
  // IRC §1(g)(7); Form 8814 line 15 → Schedule 1 line 8g
  line8g_child_interest_dividends: z.number().nonnegative().optional(),
});

class Schedule1Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "schedule1";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([]);
  compute(): NodeResult {
    return { outputs: [] };
  }
}

export const schedule1 = new Schedule1Node();

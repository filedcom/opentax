import { z } from "zod";
import { UnimplementedTaxNode } from "../../../../../core/types/tax-node.ts";

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
});

class Schedule1Node extends UnimplementedTaxNode {
  override readonly inputSchema = inputSchema;
}

export const schedule1 = new Schedule1Node("schedule1");

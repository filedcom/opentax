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
  // Form 6198 at-risk disallowance add-back (positive; reduces an upstream-posted loss)
  at_risk_disallowed_add_back: z.number().nonnegative().optional(),
});

class Schedule1Node extends UnimplementedTaxNode {
  override readonly inputSchema = inputSchema;
}

export const schedule1 = new Schedule1Node("schedule1");

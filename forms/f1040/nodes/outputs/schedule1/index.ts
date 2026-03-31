import { z } from "zod";
import { TaxNode, type NodeResult } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// Schedule 1 Output Node — Additional Income and Adjustments Assembly
//
// Sink node: assembles Schedule 1 Part I (additional income) and
// Part II (adjustments to income). No downstream outputs.
//
// Part I lines: additional income not on main 1040
// Part II lines: above-the-line deductions reducing gross income to AGI

// ─── Schema ───────────────────────────────────────────────────────────────────

const inputSchema = z.object({
  // ── Part I — Additional Income ────────────────────────────────────────────
  // Line 1 — Taxable refunds, credits, or offsets of state/local income taxes
  line1_state_refund: z.number().optional(),
  // Line 2a — Alimony received (divorce agreements before 1/1/2019)
  line2a_alimony_received: z.number().nonnegative().optional(),
  // Line 3 — Business income or (loss) from Schedule C
  line3_schedule_c: z.number().optional(),
  // Line 4 — Other gains or (losses) from Form 4797
  line4_other_gains: z.number().optional(),
  // Line 5 — Rental real estate, royalties, partnerships (Schedule E)
  line5_schedule_e: z.number().optional(),
  // Form 8582 passive loss allowed portion (Schedule E)
  line17_schedule_e: z.number().optional(),
  // Line 6 — Farm income or (loss) from Schedule F
  line6_schedule_f: z.number().optional(),
  // Line 7 — Unemployment compensation (Form 1099-G)
  line7_unemployment: z.number().optional(),
  // Line 8 — Other income (various line 8 sub-items)
  line8b_savings_bond_exclusion: z.number().nonnegative().optional(),
  line8c_cod_income: z.number().optional(),
  line8d_foreign_earned_income_exclusion: z.number().nonnegative().optional(),
  line8d_foreign_housing_deduction: z.number().nonnegative().optional(),
  line8e_archer_msa_dist: z.number().nonnegative().optional(),
  line8g_child_interest_dividends: z.number().nonnegative().optional(),
  line8i_prizes_awards: z.number().optional(),
  line8p_excess_business_loss: z.number().nonnegative().optional(),
  line8z_rtaa: z.number().optional(),
  line8z_taxable_grants: z.number().optional(),
  line8z_substitute_payments: z.number().optional(),
  line8z_attorney_proceeds: z.number().optional(),
  line8z_nqdc: z.number().optional(),
  line8z_golden_parachute: z.number().optional(),
  line8z_other_income: z.number().optional(),
  line8z_other: z.number().optional(),
  // ── Part II — Adjustments to Income ──────────────────────────────────────
  // Line 11 — Educator expenses (up to $300 / $600 MFJ)
  line11_educator_expenses: z.number().nonnegative().optional(),
  // Line 12 — Certain business expenses (Form 2106)
  line12_business_expenses: z.number().nonnegative().optional(),
  // Line 13 — HSA deduction (Form 8889)
  line13_hsa_deduction: z.number().nonnegative().optional(),
  // Line 13 — Depreciation adjustment (Form 4562)
  line13_depreciation: z.number().nonnegative().optional(),
  // Line 14 — Moving expenses (Form 3903; military only)
  line14_moving_expenses: z.number().nonnegative().optional(),
  // Line 15 — Deductible part of self-employment tax (Schedule SE)
  line15_se_deduction: z.number().nonnegative().optional(),
  // Line 16 — SEP, SIMPLE, and qualified plan contributions
  line16_sep_simple: z.number().nonnegative().optional(),
  // Line 17 — Self-employed health insurance deduction (Form 7206)
  line17_se_health_insurance: z.number().nonnegative().optional(),
  // Line 18 — Penalty on early withdrawal of savings
  line18_early_withdrawal: z.number().optional(),
  // Line 19 — Student loan interest deduction
  line19_student_loan_interest: z.number().nonnegative().optional(),
  // Line 20 — IRA deduction (IRA Deduction Worksheet)
  line20_ira_deduction: z.number().nonnegative().optional(),
  // Line 23 — Archer MSA deduction (Form 8853)
  line23_archer_msa_deduction: z.number().nonnegative().optional(),
  // Line 24f — §501(c)(18)(D) pension plan deduction
  line24f_501c18d: z.number().nonnegative().optional(),
  // Form 6198 at-risk disallowance add-back
  at_risk_disallowed_add_back: z.number().nonnegative().optional(),
  // Form 8990 §163(j) disallowed business interest add-back
  biz_interest_disallowed_add_back: z.number().nonnegative().optional(),
});

type Schedule1Input = z.infer<typeof inputSchema>;

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function otherIncome(input: Schedule1Input): number {
  return (
    (input.line8b_savings_bond_exclusion !== undefined ? -(input.line8b_savings_bond_exclusion) : 0) +
    (input.line8c_cod_income ?? 0) +
    (input.line8d_foreign_earned_income_exclusion !== undefined ? -(input.line8d_foreign_earned_income_exclusion) : 0) +
    (input.line8d_foreign_housing_deduction !== undefined ? -(input.line8d_foreign_housing_deduction) : 0) +
    (input.line8e_archer_msa_dist ?? 0) +
    (input.line8g_child_interest_dividends ?? 0) +
    (input.line8i_prizes_awards ?? 0) +
    (input.line8p_excess_business_loss ?? 0) +
    (input.line8z_rtaa ?? 0) +
    (input.line8z_taxable_grants ?? 0) +
    (input.line8z_substitute_payments ?? 0) +
    (input.line8z_attorney_proceeds ?? 0) +
    (input.line8z_nqdc ?? 0) +
    (input.line8z_golden_parachute ?? 0) +
    (input.line8z_other_income ?? 0) +
    (input.line8z_other ?? 0) +
    (input.at_risk_disallowed_add_back ?? 0) +
    (input.biz_interest_disallowed_add_back ?? 0)
  );
}

function totalAdditionalIncome(input: Schedule1Input): number {
  return (
    (input.line1_state_refund ?? 0) +
    (input.line2a_alimony_received ?? 0) +
    (input.line3_schedule_c ?? 0) +
    (input.line4_other_gains ?? 0) +
    (input.line5_schedule_e ?? 0) +
    (input.line17_schedule_e ?? 0) +
    (input.line6_schedule_f ?? 0) +
    (input.line7_unemployment ?? 0) +
    otherIncome(input)
  );
}

function totalAdjustments(input: Schedule1Input): number {
  return (
    (input.line11_educator_expenses ?? 0) +
    (input.line12_business_expenses ?? 0) +
    (input.line13_hsa_deduction ?? 0) +
    (input.line13_depreciation ?? 0) +
    (input.line14_moving_expenses ?? 0) +
    (input.line15_se_deduction ?? 0) +
    (input.line16_sep_simple ?? 0) +
    (input.line17_se_health_insurance ?? 0) +
    (input.line18_early_withdrawal ?? 0) +
    (input.line19_student_loan_interest ?? 0) +
    (input.line20_ira_deduction ?? 0) +
    (input.line23_archer_msa_deduction ?? 0) +
    (input.line24f_501c18d ?? 0)
  );
}

function assembleSchedule1(input: Schedule1Input): Record<string, number> {
  const line10_total_additional_income = totalAdditionalIncome(input);
  const line26_total_adjustments = totalAdjustments(input);

  const result: Record<string, number> = {
    line10_total_additional_income,
    line26_total_adjustments,
  };

  // Pass-through fields when present
  if (input.line1_state_refund !== undefined) result.line1_state_refund = input.line1_state_refund;
  if (input.line3_schedule_c !== undefined) result.line3_schedule_c = input.line3_schedule_c;
  if (input.line4_other_gains !== undefined) result.line4_other_gains = input.line4_other_gains;
  if (input.line5_schedule_e !== undefined) result.line5_schedule_e = input.line5_schedule_e;
  if (input.line6_schedule_f !== undefined) result.line6_schedule_f = input.line6_schedule_f;
  if (input.line7_unemployment !== undefined) result.line7_unemployment = input.line7_unemployment;
  if (input.line13_hsa_deduction !== undefined) result.line13_hsa_deduction = input.line13_hsa_deduction;
  if (input.line14_moving_expenses !== undefined) result.line14_moving_expenses = input.line14_moving_expenses;
  if (input.line15_se_deduction !== undefined) result.line15_se_deduction = input.line15_se_deduction;
  if (input.line17_se_health_insurance !== undefined) result.line17_se_health_insurance = input.line17_se_health_insurance;
  if (input.line20_ira_deduction !== undefined) result.line20_ira_deduction = input.line20_ira_deduction;

  return result;
}

// ─── Node class ───────────────────────────────────────────────────────────────

class Schedule1Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "schedule1";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([]);

  compute(_ctx: NodeContext, rawInput: Schedule1Input): NodeResult {
    const input = inputSchema.parse(rawInput);
    const assembled = assembleSchedule1(input);
    return { outputs: [{ nodeType: this.nodeType, fields: assembled }] };
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const schedule1 = new Schedule1Node();

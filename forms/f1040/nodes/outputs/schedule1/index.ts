import { z } from "zod";
import {
  type NodeResult,
  TaxNode,
} from "../../../../../core/types/tax-node.ts";
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
  // Schedule E and Form 8582 can each contribute to this printed line.
  line5_schedule_e: z.union([z.number(), z.array(z.number())]).optional(),
  // Line 6 — Farm income or (loss) from Schedule F
  line6_schedule_f: z.number().optional(),
  // Line 7 — Unemployment compensation (Form 1099-G)
  line7_unemployment: z.number().optional(),
  // Line 8 — Other income (various line 8 sub-items)
  // Line 8a — Net operating loss (NOL) deduction (IRC §172; negative entry reducing income)
  line8a_nol_deduction: z.number().nonnegative().optional(),
  line8b_gambling_winnings: z.number().nonnegative().optional(),
  line8c_cod_income: z.number().optional(),
  line8d_foreign_earned_income_exclusion: z.number().nonnegative().optional(),
  line8d_foreign_housing_deduction: z.number().nonnegative().optional(),
  line8e_archer_msa_dist: z.number().nonnegative().optional(),
  // Form 8889 lines 16 and 20, Schedule 1 line 8f.
  line8f_hsa_income: z.number().nonnegative().optional(),
  line8g_child_interest_dividends: z.number().nonnegative().optional(),
  line8i_prizes_awards: z.number().optional(),
  line8j_f1099k_hobby_income: z.number().nonnegative().optional(),
  line8p_excess_business_loss: z.number().nonnegative().optional(),
  line8z_rtaa: z.number().optional(),
  line8z_taxable_grants: z.number().optional(),
  line8z_substitute_payments: z.number().optional(),
  line8z_attorney_proceeds: z.number().optional(),
  line8z_nqdc: z.number().optional(),
  line8z_golden_parachute: z.number().optional(),
  line8z_other_income: z.number().optional(),
  line8z_form8814: z.number().nonnegative().optional(),
  line8z_hsa_excess_earnings: z.number().nonnegative().optional(),
  line8z_hsa_excess_employer: z.number().nonnegative().optional(),
  line8z_other: z.number().optional(),
  line8z_form8621_qef: z.number().optional(),
  line8z_form8621_mtm: z.number().optional(),
  line8z_form8621_section1291: z.number().optional(),
  line8z_f1099nec_nonbusiness: z.number().nonnegative().optional(),
  line8z_f1098_interest_recovery: z.number().nonnegative().optional(),
  line8z_k1_s_corp_tax_benefit_recovery: z.number().nonnegative().optional(),
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
  line18_early_withdrawal: z.number().nonnegative().optional(),
  // Line 21 — Student loan interest deduction
  line21_student_loan_interest: z.number().nonnegative().optional(),
  // Line 20 — IRA deduction (IRA Deduction Worksheet)
  line20_ira_deduction: z.number().nonnegative().optional(),
  // Line 23 — Archer MSA deduction (Form 8853)
  line23_archer_msa_deduction: z.number().nonnegative().optional(),
  // Line 24f — §501(c)(18)(D) pension plan deduction
  line24f_501c18d: z.number().nonnegative().optional(),
  // Line 24h — Domestic Production Activities Deduction (DPAD) — LEGACY TY2017 and prior only
  // Repealed by TCJA §13305 effective TY2018+; retained for amended pre-2018 returns
  line24h_dpad: z.number().nonnegative().optional(),
  // Form 6198 at-risk disallowance add-back
  at_risk_disallowed_add_back: z.number().nonnegative().optional(),
  // Form 6198 §465(e) recapture income — ordinary income when at-risk amount goes negative
  // IRC §465(e): previously deducted losses are recaptured as ordinary income
  at_risk_recapture: z.number().nonnegative().optional(),
  // Form 8990 §163(j) disallowed business interest add-back
  biz_interest_disallowed_add_back: z.number().nonnegative().optional(),
  // Form 7203 S-corp basis disallowance. This adjusts printed line 5, not 8z.
  basis_disallowed_add_back: z.number().nonnegative().optional(),
});

type Schedule1Input = z.infer<typeof inputSchema>;

function scheduleELine5(value: Schedule1Input["line5_schedule_e"]): number {
  return Array.isArray(value)
    ? value.reduce((sum, amount) => sum + amount, 0)
    : value ?? 0;
}

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function otherIncome(input: Schedule1Input): number {
  return (
    (input.line8a_nol_deduction !== undefined
      ? -(input.line8a_nol_deduction)
      : 0) +
    (input.line8b_gambling_winnings ?? 0) +
    (input.line8c_cod_income ?? 0) +
    (input.line8d_foreign_earned_income_exclusion !== undefined
      ? -(input.line8d_foreign_earned_income_exclusion)
      : 0) +
    (input.line8d_foreign_housing_deduction !== undefined
      ? -(input.line8d_foreign_housing_deduction)
      : 0) +
    (input.line8e_archer_msa_dist ?? 0) +
    (input.line8f_hsa_income ?? 0) +
    (input.line8g_child_interest_dividends ?? 0) +
    (input.line8i_prizes_awards ?? 0) +
    (input.line8j_f1099k_hobby_income ?? 0) +
    (input.line8p_excess_business_loss ?? 0) +
    (input.line8z_rtaa ?? 0) +
    (input.line8z_taxable_grants ?? 0) +
    (input.line8z_substitute_payments ?? 0) +
    (input.line8z_attorney_proceeds ?? 0) +
    (input.line8z_nqdc ?? 0) +
    (input.line8z_golden_parachute ?? 0) +
    (input.line8z_other_income ?? 0) +
    (input.line8z_form8814 ?? 0) +
    (input.line8z_hsa_excess_earnings ?? 0) +
    (input.line8z_hsa_excess_employer ?? 0) +
    (input.line8z_other ?? 0) +
    (input.line8z_form8621_qef ?? 0) +
    (input.line8z_form8621_mtm ?? 0) +
    (input.line8z_form8621_section1291 ?? 0) +
    (input.line8z_f1099nec_nonbusiness ?? 0) +
    (input.line8z_f1098_interest_recovery ?? 0) +
    (input.line8z_k1_s_corp_tax_benefit_recovery ?? 0) +
    (input.at_risk_disallowed_add_back ?? 0) +
    (input.at_risk_recapture ?? 0) +
    (input.biz_interest_disallowed_add_back ?? 0)
  );
}

function totalAdditionalIncome(input: Schedule1Input): number {
  return (
    (input.line1_state_refund ?? 0) +
    (input.line2a_alimony_received ?? 0) +
    (input.line3_schedule_c ?? 0) +
    (input.line4_other_gains ?? 0) +
    scheduleELine5(input.line5_schedule_e) +
    (input.basis_disallowed_add_back ?? 0) +
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
    (input.line21_student_loan_interest ?? 0) +
    (input.line20_ira_deduction ?? 0) +
    (input.line23_archer_msa_deduction ?? 0) +
    (input.line24f_501c18d ?? 0) +
    (input.line24h_dpad ?? 0)
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
  if (input.line1_state_refund !== undefined) {
    result.line1_state_refund = input.line1_state_refund;
  }
  if (input.line3_schedule_c !== undefined) {
    result.line3_schedule_c = input.line3_schedule_c;
  }
  if (input.line4_other_gains !== undefined) {
    result.line4_other_gains = input.line4_other_gains;
  }
  if (
    input.line5_schedule_e !== undefined ||
    input.basis_disallowed_add_back !== undefined
  ) {
    result.line5_schedule_e = scheduleELine5(input.line5_schedule_e) +
      (input.basis_disallowed_add_back ?? 0);
  }
  if (input.line6_schedule_f !== undefined) {
    result.line6_schedule_f = input.line6_schedule_f;
  }
  if (input.line7_unemployment !== undefined) {
    result.line7_unemployment = input.line7_unemployment;
  }
  if (input.line8b_gambling_winnings !== undefined) {
    result.line8b_gambling_winnings = input.line8b_gambling_winnings;
  }
  if (input.line8d_foreign_earned_income_exclusion !== undefined) {
    result.line8d_foreign_earned_income_exclusion =
      input.line8d_foreign_earned_income_exclusion;
  }
  if (otherIncome(input) !== 0) {
    result.line9_total_other_income = otherIncome(input);
  }
  if (input.line12_business_expenses !== undefined) {
    result.line12_business_expenses = input.line12_business_expenses;
  }
  if (input.line13_hsa_deduction !== undefined) {
    result.line13_hsa_deduction = input.line13_hsa_deduction;
  }
  if (input.line14_moving_expenses !== undefined) {
    result.line14_moving_expenses = input.line14_moving_expenses;
  }
  if (input.line15_se_deduction !== undefined) {
    result.line15_se_deduction = input.line15_se_deduction;
  }
  if (input.line17_se_health_insurance !== undefined) {
    result.line17_se_health_insurance = input.line17_se_health_insurance;
  }
  if (input.line20_ira_deduction !== undefined) {
    result.line20_ira_deduction = input.line20_ira_deduction;
  }

  // Preserve each source line used in the totals for the MeF and PDF
  // projections. A total alone cannot stand in for a required printed line.
  const directLines = [
    "line8a_nol_deduction",
    "line8c_cod_income",
    "line8e_archer_msa_dist",
    "line8f_hsa_income",
    "line8i_prizes_awards",
    "line8j_f1099k_hobby_income",
    "line8p_excess_business_loss",
    "line8z_rtaa",
    "line8z_taxable_grants",
    "line8z_substitute_payments",
    "line8z_attorney_proceeds",
    "line8z_nqdc",
    "line8z_golden_parachute",
    "line8z_other_income",
    "line8z_form8814",
    "line8z_hsa_excess_earnings",
    "line8z_hsa_excess_employer",
    "line8z_other",
    "line8z_form8621_qef",
    "line8z_form8621_mtm",
    "line8z_form8621_section1291",
    "line8z_f1099nec_nonbusiness",
    "line8z_f1098_interest_recovery",
    "line8z_k1_s_corp_tax_benefit_recovery",
    "at_risk_disallowed_add_back",
    "at_risk_recapture",
    "biz_interest_disallowed_add_back",
    "line11_educator_expenses",
    "line16_sep_simple",
    "line18_early_withdrawal",
    "line21_student_loan_interest",
    "line23_archer_msa_deduction",
    "line24f_501c18d",
  ] as const satisfies readonly (keyof Schedule1Input)[];
  for (const key of directLines) {
    const value = input[key];
    if (value !== undefined) result[key] = value;
  }
  if (input.line8d_foreign_housing_deduction !== undefined) {
    result.line8d_foreign_earned_income_exclusion =
      (input.line8d_foreign_earned_income_exclusion ?? 0) +
      input.line8d_foreign_housing_deduction;
  }

  return result;
}

// ─── Node class ───────────────────────────────────────────────────────────────

class Schedule1Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "schedule1";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([]);

  compute(_ctx: NodeContext, rawInput: Schedule1Input): NodeResult {
    const input = inputSchema.parse(rawInput);
    if (
      (input.line2a_alimony_received ?? 0) !== 0 ||
      (input.line8g_child_interest_dividends ?? 0) !== 0 ||
      (input.line8z_attorney_proceeds ?? 0) !== 0 ||
      (input.line13_depreciation ?? 0) !== 0 ||
      (input.line24h_dpad ?? 0) !== 0
    ) {
      throw new Error(
        "Schedule 1 source needs its TY2025 line identity and required supporting facts before finalization",
      );
    }
    const assembled = assembleSchedule1(input);
    return { outputs: [{ nodeType: this.nodeType, fields: assembled }] };
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const schedule1 = new Schedule1Node();

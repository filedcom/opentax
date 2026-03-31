import { z } from "zod";
import type { NodeOutput, NodeResult } from "../../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../../../core/types/node-context.ts";
import { f1040 } from "../../../outputs/f1040/index.ts";
import { scheduleA } from "../../../inputs/schedule_a/index.ts";
import { standard_deduction } from "../../worksheets/standard_deduction/index.ts";

// AGI Aggregator — Form 1040 Line 11
//
// Collects all income, exclusion, and above-the-line deduction fields from
// upstream nodes (w2, schedule_b, f1099r, schedule_d, schedule_c, etc.) and
// computes Adjusted Gross Income per IRC §62.
//
// Formula:
//   gross_income = f1040 income lines + Schedule 1 Part I additions
//   agi = gross_income - exclusions - above_line_deductions
//
// Outputs:
//   agi → standard_deduction (required field)
//   agi → schedule_a (optional; used for AGI-based floors and limits)
//   line11_agi → f1040

// ─── Schema ───────────────────────────────────────────────────────────────────

export const inputSchema = z.object({
  // ── Form 1040 income lines ─────────────────────────────────────────────────
  // Line 1a — Wages (W-2 Box 1, regular employees)
  line1a_wages: z.number().optional(),
  // Line 1c — Unreported tips (Form 4137)
  line1c_unreported_tips: z.number().nonnegative().optional(),
  // Line 1e — Taxable dependent care benefits (Form 2441)
  line1e_taxable_dep_care: z.number().nonnegative().optional(),
  // Line 1f — Employer adoption benefits (Form 8839)
  line1f_taxable_adoption_benefits: z.number().nonnegative().optional(),
  // Line 1g — Wages from Form 8919 (uncollected SS/Medicare)
  line1g_wages_8919: z.number().nonnegative().optional(),
  // Line 2b — Taxable interest (Schedule B Part I)
  line2b_taxable_interest: z.number().optional(),
  // Line 3b — Ordinary dividends (Schedule B Part II)
  line3b_ordinary_dividends: z.number().optional(),
  // Line 4b — IRA distributions, taxable amount (Form 1099-R)
  line4b_ira_taxable: z.number().optional(),
  // Line 5b — Pensions and annuities, taxable amount (Form 1099-R)
  line5b_pension_taxable: z.number().optional(),
  // Line 6b — Social security benefits, taxable amount (SSA-1099 worksheet)
  line6b_ss_taxable: z.number().nonnegative().optional(),
  // Line 7 — Capital gain or (loss) (Schedule D)
  line7_capital_gain: z.number().optional(),

  // ── Schedule 1 Part I — Additional income ─────────────────────────────────
  // Line 1 — State and local income tax refunds (Form 1099-G)
  line1_state_refund: z.number().optional(),
  // Line 3 — Net profit or (loss) from business (Schedule C)
  line3_schedule_c: z.number().optional(),
  // Line 4 — Other gains or (losses) (Form 4797)
  line4_other_gains: z.number().optional(),
  // Line 5 — Rental real estate, royalties, partnerships, etc. (Schedule E)
  line5_schedule_e: z.number().optional(),
  // Line 17 — Rental real estate passive loss allowed (Form 8582 negative output)
  line17_schedule_e: z.number().optional(),
  // Line 6 — Net farm profit or (loss) (Schedule F)
  line6_schedule_f: z.number().optional(),
  // Line 7 — Unemployment compensation (Form 1099-G)
  line7_unemployment: z.number().optional(),
  // Line 8c — Cancellation of debt income (Form 1099-C)
  line8c_cod_income: z.number().optional(),
  // Line 8e — Taxable Archer/Medicare MSA distributions (Form 8853)
  line8e_archer_msa_dist: z.number().nonnegative().optional(),
  // Line 8z — Other income (HSA taxable distributions, 1099-NEC line 8z, etc.)
  line8z_other: z.number().optional(),
  // Line 8z — RTAA payments (Form 1099-G)
  line8z_rtaa: z.number().optional(),
  // Line 8z — Taxable grants (Form 1099-G)
  line8z_taxable_grants: z.number().optional(),
  // Form 6198 at-risk disallowance add-back (restores previously posted loss)
  at_risk_disallowed_add_back: z.number().nonnegative().optional(),
  // Form 8990 §163(j) disallowed business interest add-back
  biz_interest_disallowed_add_back: z.number().nonnegative().optional(),

  // ── Schedule 1 Part I — Exclusions ────────────────────────────────────────
  // Line 8d — Foreign earned income exclusion (Form 2555)
  line8d_foreign_earned_income_exclusion: z.number().nonnegative().optional(),
  // Line 8d — Foreign housing deduction (Form 2555)
  line8d_foreign_housing_deduction: z.number().nonnegative().optional(),
  // Line 8b — Savings bond interest exclusion (Form 8815)
  line8b_savings_bond_exclusion: z.number().nonnegative().optional(),

  // ── Schedule 1 Part II — Above-the-line deductions ────────────────────────
  // Line 13 — HSA deduction (Form 8889)
  line13_hsa_deduction: z.number().nonnegative().optional(),
  // Line 13 — Depreciation adjustment (Form 4562)
  line13_depreciation: z.number().nonnegative().optional(),
  // Line 14 — Moving expense deduction (Form 3903; military only)
  line14_moving_expenses: z.number().nonnegative().optional(),
  // Line 15 — Deductible part of self-employment tax (Schedule SE)
  line15_se_deduction: z.number().nonnegative().optional(),
  // Line 17 — Self-employed health insurance deduction (Form 7206)
  line17_se_health_insurance: z.number().nonnegative().optional(),
  // Line 18 — Penalty on early withdrawal of savings (Form 1099-INT Box 2)
  line18_early_withdrawal: z.number().optional(),
  // Line 20 — IRA deduction (IRA Deduction Worksheet)
  line20_ira_deduction: z.number().nonnegative().optional(),
  // Line 23 — Archer MSA deduction (Form 8853)
  line23_archer_msa_deduction: z.number().nonnegative().optional(),
  // Line 24f — §501(c)(18)(D) pension plan deduction (W-2 Box 12 Code H)
  line24f_501c18d: z.number().nonnegative().optional(),
});

type AgiInput = z.infer<typeof inputSchema>;

// ─── Pure helpers ─────────────────────────────────────────────────────────────

// Sum all income and addition items (before exclusions/deductions).
// Fields can be negative (e.g., capital loss, schedule C net loss).
function grossIncome(input: AgiInput): number {
  return (
    (input.line1a_wages ?? 0) +
    (input.line1c_unreported_tips ?? 0) +
    (input.line1e_taxable_dep_care ?? 0) +
    (input.line1f_taxable_adoption_benefits ?? 0) +
    (input.line1g_wages_8919 ?? 0) +
    (input.line2b_taxable_interest ?? 0) +
    (input.line3b_ordinary_dividends ?? 0) +
    (input.line4b_ira_taxable ?? 0) +
    (input.line5b_pension_taxable ?? 0) +
    (input.line6b_ss_taxable ?? 0) +
    (input.line7_capital_gain ?? 0) +
    (input.line1_state_refund ?? 0) +
    (input.line3_schedule_c ?? 0) +
    (input.line4_other_gains ?? 0) +
    (input.line5_schedule_e ?? 0) +
    (input.line17_schedule_e ?? 0) +
    (input.line6_schedule_f ?? 0) +
    (input.line7_unemployment ?? 0) +
    (input.line8c_cod_income ?? 0) +
    (input.line8e_archer_msa_dist ?? 0) +
    (input.line8z_other ?? 0) +
    (input.line8z_rtaa ?? 0) +
    (input.line8z_taxable_grants ?? 0) +
    (input.at_risk_disallowed_add_back ?? 0) +
    (input.biz_interest_disallowed_add_back ?? 0)
  );
}

// Sum IRC §911 exclusions and EE/I bond exclusion.
function exclusions(input: AgiInput): number {
  return (
    (input.line8d_foreign_earned_income_exclusion ?? 0) +
    (input.line8d_foreign_housing_deduction ?? 0) +
    (input.line8b_savings_bond_exclusion ?? 0)
  );
}

// Sum above-the-line deductions (Schedule 1 Part II).
// IRC §62 allows these before arriving at AGI.
function aboveLineDeductions(input: AgiInput): number {
  return (
    (input.line13_hsa_deduction ?? 0) +
    (input.line13_depreciation ?? 0) +
    (input.line14_moving_expenses ?? 0) +
    (input.line15_se_deduction ?? 0) +
    (input.line17_se_health_insurance ?? 0) +
    (input.line18_early_withdrawal ?? 0) +
    (input.line20_ira_deduction ?? 0) +
    (input.line23_archer_msa_deduction ?? 0) +
    (input.line24f_501c18d ?? 0)
  );
}

// AGI cannot be negative (loss limitation rules prevent it in practice).
function computeAgi(input: AgiInput): number {
  return Math.max(0, grossIncome(input) - exclusions(input) - aboveLineDeductions(input));
}

// ─── Node class ───────────────────────────────────────────────────────────────

class AgiAggregatorNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "agi_aggregator";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([f1040, standard_deduction, scheduleA]);

  compute(_ctx: NodeContext, rawInput: AgiInput): NodeResult {
    const input = inputSchema.parse(rawInput);
    const agi = computeAgi(input);

    const outputs: NodeOutput[] = [
      this.outputNodes.output(f1040, { line11_agi: agi }),
      this.outputNodes.output(standard_deduction, { agi }),
      this.outputNodes.output(scheduleA, { agi }),
    ];

    return { outputs };
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const agi_aggregator = new AgiAggregatorNode();

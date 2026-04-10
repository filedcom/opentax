import { z } from "zod";
import type { NodeOutput, NodeResult } from "../../../../../../core/types/tax-node.ts";
import { TaxNode, type AtLeastOne } from "../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../../../core/types/node-context.ts";
import { f1040 } from "../../../outputs/f1040/index.ts";
import { scheduleA } from "../../../inputs/schedule_a/index.ts";
import { standard_deduction } from "../../worksheets/standard_deduction/index.ts";
import { eitc } from "../../forms/eitc/index.ts";
import { f8812 } from "../../../inputs/f8812/index.ts";
import { f2441 } from "../../../inputs/f2441/index.ts";
import { form8995 } from "../../forms/form8995/index.ts";
import { form8960 } from "../../forms/form8960/index.ts";
import { form8962 } from "../../forms/form8962/index.ts";
import { form8880 } from "../../forms/form8880/index.ts";
import { FilingStatus } from "../../../types.ts";
import { CONFIG_BY_YEAR } from "../../../config/index.ts";

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
  // Line 1b — Allocated tips (W-2 Box 8; reported when employer allocation exceeds declared tips)
  line1b_allocated_tips: z.number().nonnegative().optional(),
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
  // Line 6a — Social security benefits, gross (from SSA-1099 — for taxability worksheet)
  line6a_ss_gross: z.number().nonnegative().optional(),
  // Line 6b — Social security benefits, taxable amount (SSA-1099 worksheet)
  // If provided directly (e.g., from prior worksheet), use as-is.
  line6b_ss_taxable: z.number().nonnegative().optional(),
  // Filing status — required for SSA taxability worksheet thresholds (MFJ vs other)
  filing_status: z.string().optional(),
  // Tax-exempt interest (Schedule B, Form 1099-INT box 8) — included in provisional income
  // for Social Security taxability per IRC §86(b)(1) even though excluded from AGI
  tax_exempt_interest: z.number().nonnegative().optional(),
  // MFS filer who lived with spouse at any time during the year (IRC §86(c)(2))
  // When true: 85% of SS benefits are always taxable, no threshold applies
  mfs_lived_with_spouse: z.boolean().optional(),
  // Line 7 — Capital gain or (loss) (Schedule D)
  line7_capital_gain: z.number().optional(),
  // Line 7a — Capital gain distributions (no Schedule D required; from f1099div box2a)
  line7a_cap_gain_distrib: z.number().nonnegative().optional(),

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
  // Line 2a — Alimony received (divorce or separation instruments before 1/1/2019, IRC §71)
  line2a_alimony_received: z.number().nonnegative().optional(),
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
  // Form 6198 §465(e) recapture income — ordinary income when at-risk amount goes negative
  at_risk_recapture: z.number().nonnegative().optional(),
  // Form 8990 §163(j) disallowed business interest add-back
  biz_interest_disallowed_add_back: z.number().nonnegative().optional(),
  // Form 7203 S-corp basis disallowance add-back (IRC §1366(d)(1))
  basis_disallowed_add_back: z.number().nonnegative().optional(),

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
  // Line 11 — Educator expenses (Schedule 1 Part II line 11)
  line11_educator_expenses: z.number().nonnegative().optional(),
  // Line 12 — Employee business expenses (Form 2106)
  line12_business_expenses: z.number().nonnegative().optional(),
  // Line 16 — SEP, SIMPLE, and qualified plan deductions
  line16_sep_simple: z.number().nonnegative().optional(),
  // Line 19 — Student loan interest deduction (Form 1098-E)
  line19_student_loan_interest: z.number().nonnegative().optional(),
});

type AgiInput = z.infer<typeof inputSchema>;

// ─── SSA Taxability Worksheet (IRC §86) ───────────────────────────────────────
// Computes the taxable portion of Social Security benefits.
// IRS Publication 915; Form 1040 instructions for Line 6b.
//
// Thresholds (not indexed for inflation):
//   MFJ: base $32,000, upper $44,000
//   All others: base $25,000, upper $34,000

const SSA_BASE_THRESHOLD_MFJ = 32_000;
const SSA_UPPER_THRESHOLD_MFJ = 44_000;
const SSA_BASE_THRESHOLD_OTHER = 25_000;
const SSA_UPPER_THRESHOLD_OTHER = 34_000;

function computeSsaTaxable(
  ssaGross: number,
  otherIncome: number,
  taxExemptInterest: number,
  isMfj: boolean,
): number {
  if (ssaGross <= 0) return 0;

  const baseThreshold = isMfj ? SSA_BASE_THRESHOLD_MFJ : SSA_BASE_THRESHOLD_OTHER;
  const upperThreshold = isMfj ? SSA_UPPER_THRESHOLD_MFJ : SSA_UPPER_THRESHOLD_OTHER;

  // Provisional income = other AGI items + tax-exempt interest + 50% × SSA gross benefits
  // IRC §86(b)(1): tax-exempt interest is included in provisional income
  const provisionalIncome = otherIncome + taxExemptInterest + 0.5 * ssaGross;

  if (provisionalIncome <= baseThreshold) return 0;

  // Maximum possible taxable SSA = 85% of gross benefits
  const maxTaxable = 0.85 * ssaGross;

  if (provisionalIncome <= upperThreshold) {
    // Between base and upper threshold: lesser of 50% of gross benefits or 50% of excess
    // IRS Pub 915 Worksheet 1, Line 11: enter the smaller of line 9 or line 10
    return Math.min(0.5 * ssaGross, 0.5 * (provisionalIncome - baseThreshold));
  }

  // Above upper threshold: tiered formula
  // = 85% × (provisional - upper) + 50% × min(upper - base, SSA gross)
  const tier1 = 0.85 * (provisionalIncome - upperThreshold);
  const tier2 = 0.5 * Math.min(upperThreshold - baseThreshold, ssaGross);
  return Math.min(maxTaxable, tier1 + tier2);
}

// ─── Pure helpers ─────────────────────────────────────────────────────────────

// Sum all non-SSA income items (used as "other income" for provisional income calculation).
function nonSsaIncome(input: AgiInput): number {
  return (
    (input.line1a_wages ?? 0) +
    (input.line1b_allocated_tips ?? 0) +
    (input.line1c_unreported_tips ?? 0) +
    (input.line1e_taxable_dep_care ?? 0) +
    (input.line1f_taxable_adoption_benefits ?? 0) +
    (input.line1g_wages_8919 ?? 0) +
    (input.line2b_taxable_interest ?? 0) +
    (input.line3b_ordinary_dividends ?? 0) +
    (input.line4b_ira_taxable ?? 0) +
    (input.line5b_pension_taxable ?? 0) +
    (input.line7_capital_gain ?? 0) +
    (input.line7a_cap_gain_distrib ?? 0) +
    (input.line1_state_refund ?? 0) +
    (input.line2a_alimony_received ?? 0) +
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
    (input.at_risk_recapture ?? 0) +
    (input.biz_interest_disallowed_add_back ?? 0) +
    (input.basis_disallowed_add_back ?? 0)
  );
}

// Compute taxable SSA: prefer pre-computed line6b_ss_taxable; otherwise run the worksheet.
// "Other income" for provisional income = AGI from non-SSA sources (after exclusions/deductions).
function resolveSsaTaxable(input: AgiInput, cfg: import("../../../config/index.ts").F1040Config): number {
  if (input.line6b_ss_taxable !== undefined) return input.line6b_ss_taxable;
  const ssaGross = input.line6a_ss_gross ?? 0;
  if (ssaGross === 0) return 0;

  // IRC §86(c)(2): MFS filer who lived with spouse at any time during the year —
  // 85% of benefits are always taxable; no threshold applies.
  if (input.filing_status === "mfs" && input.mfs_lived_with_spouse === true) {
    return 0.85 * ssaGross;
  }

  const isMfj = input.filing_status === "mfj" || input.filing_status === "qss";
  const taxExemptInterest = input.tax_exempt_interest ?? 0;
  const otherAgi = Math.max(0, nonSsaIncome(input) - exclusions(input) - aboveLineDeductions(input, cfg));
  return computeSsaTaxable(ssaGross, otherAgi, taxExemptInterest, isMfj);
}

// Sum all income and addition items (before exclusions/deductions).
// Fields can be negative (e.g., capital loss, schedule C net loss).
function grossIncome(input: AgiInput, cfg: import("../../../config/index.ts").F1040Config): number {
  const ssaTaxable = resolveSsaTaxable(input, cfg);
  return (
    nonSsaIncome(input) +
    ssaTaxable
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

// Sum above-the-line deductions excluding SLI (used to compute MAGI for SLI phase-out).
function aboveLineDeductionsExceptSli(input: AgiInput): number {
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
    (input.line20_ira_deduction ?? 0) +
    (input.line23_archer_msa_deduction ?? 0) +
    (input.line24f_501c18d ?? 0)
  );
}

// Compute phase-out adjusted student loan interest deduction (IRC §221(b)(2)).
// MAGI = provisional AGI without SLI = gross income - exclusions - other above-line deductions.
// Phase-out: single/HOH $85k–$100k; MFJ $175k–$205k; MFS not eligible.
function computeAdjustedSli(input: AgiInput, cfg: import("../../../config/index.ts").F1040Config): number {
  const raw = input.line19_student_loan_interest ?? 0;
  if (raw <= 0) return 0;
  // MFS cannot deduct student loan interest (IRC §221(b)(2)(B))
  if (input.filing_status === "mfs") return 0;

  const isMfj = input.filing_status === "mfj" || input.filing_status === "qss";
  const phaseOutStart = isMfj ? cfg.sliPhaseOutStartMfj : cfg.sliPhaseOutStartSingle;
  const phaseOutEnd = isMfj ? cfg.sliPhaseOutEndMfj : cfg.sliPhaseOutEndSingle;

  // MAGI for SLI = AGI before SLI deduction.
  // Use SSA gross from input (line6b_ss_taxable if pre-computed, else 0 for MAGI purposes)
  // to avoid circular dependency with resolveSsaTaxable.
  const ssaTaxable = input.line6b_ss_taxable ?? 0;
  const magi = nonSsaIncome(input) + ssaTaxable - exclusions(input) - aboveLineDeductionsExceptSli(input);

  if (magi <= phaseOutStart) return raw;
  if (magi >= phaseOutEnd) return 0;

  // Linear phase-out; IRS rounds to nearest dollar
  const phaseOutRatio = (magi - phaseOutStart) / (phaseOutEnd - phaseOutStart);
  return Math.round(raw * (1 - phaseOutRatio));
}

// Sum above-the-line deductions (Schedule 1 Part II).
// IRC §62 allows these before arriving at AGI.
function aboveLineDeductions(input: AgiInput, cfg: import("../../../config/index.ts").F1040Config): number {
  return aboveLineDeductionsExceptSli(input) + computeAdjustedSli(input, cfg);
}

// Sum Schedule 1 Part I items (Additional Income) net of exclusions.
// This is what appears on Form 1040 line 8.
function scheduleOnePartI(input: AgiInput): number {
  return (
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
    (input.at_risk_recapture ?? 0) +
    (input.biz_interest_disallowed_add_back ?? 0) +
    (input.basis_disallowed_add_back ?? 0) -
    (input.line8d_foreign_earned_income_exclusion ?? 0) -
    (input.line8d_foreign_housing_deduction ?? 0) -
    (input.line8b_savings_bond_exclusion ?? 0)
  );
}

// AGI can be negative in large NOL scenarios (IRC §172); do not floor at 0.
function computeAgi(input: AgiInput, cfg: import("../../../config/index.ts").F1040Config): number {
  return grossIncome(input, cfg) - exclusions(input) - aboveLineDeductions(input, cfg);
}

// ─── Node class ───────────────────────────────────────────────────────────────

class AgiAggregatorNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "agi_aggregator";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([f1040, standard_deduction, scheduleA, eitc, f8812, f2441, form8995, form8960, form8962, form8880]);

  compute(ctx: NodeContext, rawInput: AgiInput): NodeResult {
    const cfg = CONFIG_BY_YEAR[ctx.taxYear];
    if (!cfg) throw new Error(`No f1040 config for year ${ctx.taxYear}`);
    const input = inputSchema.parse(rawInput);
    const agi = computeAgi(input, cfg);

    // Compute SSA taxable amount for f1040 line 6b pass-through
    const ssaGross = input.line6a_ss_gross ?? 0;
    const ssaTaxable = resolveSsaTaxable(input, cfg);

    const line8 = scheduleOnePartI(input);
    const line10 = aboveLineDeductions(input, cfg);

    const f1040Fields: Partial<z.infer<typeof f1040["inputSchema"]>> = { line11_agi: agi };
    if (line8 !== 0) f1040Fields.line8_additional_income = line8;
    if (line10 > 0) f1040Fields.line10_adjustments = line10;

    const outputs: NodeOutput[] = [
      this.outputNodes.output(f1040, f1040Fields as AtLeastOne<z.infer<typeof f1040["inputSchema"]>>),
      this.outputNodes.output(standard_deduction, { agi }),
      this.outputNodes.output(scheduleA, { agi }),
      this.outputNodes.output(eitc, { agi }),
      // Pass AGI to f8812 for CTC/ACTC phase-out computation
      this.outputNodes.output(f8812, { auto_agi: agi }),
      // Pass AGI to f2441 for dependent care credit rate calculation
      this.outputNodes.output(f2441, { agi }),
      // Pass AGI to form8995 so it can apply the 20%-of-taxable-income income limit
      this.outputNodes.output(form8995, { agi }),
      // Pass AGI as MAGI to form8960 for NIIT threshold comparison (AGI = MAGI for most taxpayers)
      this.outputNodes.output(form8960, { magi: agi }),
      // Pass AGI as household_income to form8962 for PTC eligibility and reconciliation
      this.outputNodes.output(form8962, { household_income: agi }),
      // Pass AGI and filing_status to form8880 for Saver's Credit rate determination (IRC §25B)
      this.outputNodes.output(form8880, {
        agi,
        ...(input.filing_status !== undefined && { filing_status: input.filing_status as FilingStatus }),
      } as AtLeastOne<z.infer<typeof form8880["inputSchema"]>>),
    ];

    // Pass SSA taxable amount to f1040 for line 6b.
    // line6a_ss_gross is routed directly by ssa1099 node to avoid double-counting.
    if (ssaGross > 0 && ssaTaxable > 0) {
      outputs.push(this.outputNodes.output(f1040, {
        line6b_ss_taxable: ssaTaxable,
      }));
    }

    return { outputs };
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const agi_aggregator = new AgiAggregatorNode();

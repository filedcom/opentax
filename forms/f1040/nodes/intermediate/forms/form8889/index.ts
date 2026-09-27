import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../../core/types/tax-node.ts";
import {
  type AtLeastOne,
  output,
  TaxNode,
} from "../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../core/types/output-nodes.ts";
import { agi_aggregator } from "../../aggregation/agi_aggregator/index.ts";
import { schedule1 } from "../../../outputs/schedule1/index.ts";
import { schedule2 } from "../../aggregation/schedule2/index.ts";
import { form5329 } from "../form5329/index.ts";
import type { NodeContext } from "../../../../../../core/types/node-context.ts";
import { CONFIG_BY_YEAR } from "../../../config/index.ts";

// ─── Constants — mathematical/statutory rates, unchanged across years ─────────

// IRC §223(f)(4)(A) — additional tax rate on non-qualified HSA distributions
const NON_QUALIFIED_PENALTY_RATE = 0.20;

// ─── Enums ────────────────────────────────────────────────────────────────────

export enum CoverageType {
  SelfOnly = "self_only",
  Family = "family",
}

// ─── Schema ───────────────────────────────────────────────────────────────────

export const inputSchema = z.object({
  // ── Coverage (determines contribution limit) ─────────────────────────────
  // Type of HDHP coverage on the first day of each eligible month, for the
  // uniform-coverage route. Distribution-only filers may have no 2025 HDHP.
  coverage_type: z.nativeEnum(CoverageType).optional(),
  coverage_type_constant_for_eligible_months: z.literal(true).optional(),

  // ── Part I: Contributions ────────────────────────────────────────────────
  // Line 2: Taxpayer's own HSA contributions (not through payroll)
  taxpayer_hsa_contributions: z.number().nonnegative().optional(),
  // Line 9: Employer contributions to HSA (from W-2 Box 12 Code W)
  // IRC §106(d); routed here from the w2 node
  employer_hsa_contributions: z.number().nonnegative().optional(),
  // Whether the taxpayer is age 55 or older (enables $1,000 catch-up)
  // IRC §223(b)(3)
  age_55_or_older: z.boolean().optional(),
  // Number of months eligible on the first day of the month (0–12).
  // Must be supplied for the uniform-coverage contribution route.
  months_of_hdhp_coverage: z.number().int().min(0).max(12).optional(),
  last_month_rule_elected: z.boolean().optional(),
  married_at_year_end: z.boolean().optional(),
  spouse_has_separate_hsa: z.boolean().optional(),
  // Line 4: Archer MSA distributions received during the year (Form 8853).
  // IRC §223(b)(4)(B): Archer MSA distributions reduce the HSA contribution limit.
  archer_msa_distributions: z.number().nonnegative().optional(),

  // ── Part II: Distributions ───────────────────────────────────────────────
  // Line 14a: Total HSA distributions received during the year (1099-SA box 1)
  hsa_distributions: z.number().nonnegative().optional(),
  // Line 14b: rollovers plus timely withdrawals of excess contributions and
  // their earnings that were included on line 14a.
  hsa_rollovers_and_timely_excess_withdrawals: z.number().nonnegative()
    .optional(),
  // Line 15: Qualified medical expenses paid from HSA (unreimbursed)
  // IRC §213(d)
  qualified_medical_expenses: z.number().nonnegative().optional(),
  // Whether every taxable distribution qualifies for the 20% penalty
  // exception (beneficiary death, disability, or age 65).
  // IRC §223(f)(4)(B)–(D)
  distribution_exception: z.boolean().optional(),

  // Part III is sourced from the prior-year last-month-rule calculation or
  // qualified HSA funding distribution. Death and disability do not trigger
  // recapture; callers affirm that neither exception applies before routing.
  testing_period_failure: z.object({
    last_month_rule_excess_amount: z.number().nonnegative(),
    qualified_funding_distribution_amount: z.number().nonnegative(),
    not_death_or_disability: z.literal(true),
    prior_year_source: z.string().trim().min(1),
  }).optional(),
});

type Form8889Input = z.infer<typeof inputSchema>;

// ─── Pure Helper Functions ────────────────────────────────────────────────────

// The 2025 line 3 worksheet averages one limit for each eligible month. This
// route is deliberately limited to the same coverage type for those months;
// mixed coverage and a last-month-rule election need separate source facts.
function contributionLimitLines(
  input: Form8889Input,
  selfOnlyLimit: number,
  familyLimit: number,
  catchupLimit: number,
): { line3: number; line5: number; line7: number; line8: number } {
  const months = input.months_of_hdhp_coverage;
  if (
    input.coverage_type === undefined ||
    input.coverage_type_constant_for_eligible_months !== true ||
    months === undefined || input.age_55_or_older === undefined ||
    input.last_month_rule_elected === undefined
  ) {
    throw new Error(
      "Form 8889 contributions need explicit uniform HDHP coverage, eligible months, age, and last-month-rule answers",
    );
  }
  if (input.last_month_rule_elected) {
    throw new Error(
      "Form 8889 last-month-rule contribution calculation needs month-by-month eligibility facts",
    );
  }
  if (months === 0) {
    throw new Error(
      "Form 8889 contributions with no eligible HDHP month need excess-employer and excise-tax source treatment",
    );
  }
  if (
    input.age_55_or_older && input.coverage_type === CoverageType.Family &&
    input.married_at_year_end === undefined
  ) {
    throw new Error(
      "Form 8889 family catch-up contribution needs an explicit marriage answer",
    );
  }
  if (
    input.married_at_year_end === true &&
    input.coverage_type === CoverageType.Family &&
    input.spouse_has_separate_hsa !== false
  ) {
    throw new Error(
      "Form 8889 married family coverage needs spouse-HSA allocation facts",
    );
  }
  const base = input.coverage_type === CoverageType.Family
    ? familyLimit
    : selfOnlyLimit;
  const catchupOnLine7 = input.age_55_or_older === true &&
    input.coverage_type === CoverageType.Family &&
    input.married_at_year_end === true;
  const line3 = Math.round(
    (base +
      (input.age_55_or_older === true && !catchupOnLine7 ? catchupLimit : 0)) *
      months / 12,
  );
  const line5 = Math.max(0, line3 - (input.archer_msa_distributions ?? 0));
  const line7 = catchupOnLine7 ? Math.round(catchupLimit * months / 12) : 0;
  return { line3, line5, line7, line8: line5 + line7 };
}

// Part I, Line 13: Deductible HSA contributions for AGI purposes.
// Only the taxpayer's own contributions (not through payroll) are deductible.
// Employer contributions (Box 12 Code W, §106(d)) are already excluded from
// W-2 Box 1 wages by standard payroll — they are NOT an above-the-line
// deduction. They appear on Form 8889 for informational and excess-contribution
// purposes only. The deductible amount is capped at the annual limit minus
// employer contributions (since employer contributions consume part of the limit).
// IRC §223(a), §223(b)(4)
function deductibleContributions(
  input: Form8889Input,
  limit: number,
): number {
  const taxpayer = input.taxpayer_hsa_contributions ?? 0;
  if (taxpayer <= 0) return 0;
  const employer = input.employer_hsa_contributions ?? 0;
  // Employer contributions reduce the remaining limit available for the taxpayer
  const remainingLimit = Math.max(0, limit - employer);
  return Math.min(taxpayer, remainingLimit);
}

// Part I: Total contributions (taxpayer + employer) for excess calculation
function totalContributions(input: Form8889Input): number {
  return (input.taxpayer_hsa_contributions ?? 0) +
    (input.employer_hsa_contributions ?? 0);
}

// Part I: Excess contributions = max(0, total - limit)
// IRC §4973(a)(2)
function excessContributions(
  input: Form8889Input,
  limit: number,
): number {
  return Math.max(
    0,
    totalContributions(input) - limit,
  );
}

// Part II: Taxable (non-qualified) distributions
// = max(0, total_distributions - qualified_expenses)
// IRC §223(f)(2)
function taxableDistributions(input: Form8889Input): number {
  const total = input.hsa_distributions ?? 0;
  const excluded = input.hsa_rollovers_and_timely_excess_withdrawals ?? 0;
  if (excluded > total) {
    throw new Error("Form 8889 line 14b cannot exceed HSA distributions");
  }
  const net = total - excluded;
  const qualified = input.qualified_medical_expenses ?? 0;
  if (qualified > net) {
    throw new Error(
      "Form 8889 line 15 qualified expenses cannot exceed net HSA distributions",
    );
  }
  if (total <= 0) return 0;
  return net - qualified;
}

// Part II, Line 20: 20% additional tax on non-qualified distributions
// Only applies when no whole-distribution exception flag is set
// IRC §223(f)(4)(A)
function nonQualifiedPenalty(input: Form8889Input, taxable: number): number {
  if (taxable <= 0) return 0;
  if (input.distribution_exception === undefined) {
    throw new Error(
      "Form 8889 taxable distribution needs an explicit additional-tax exception answer",
    );
  }
  if (input.distribution_exception === true) return 0;
  return taxable * NON_QUALIFIED_PENALTY_RATE;
}

// Merged Schedule 1 output — deduction (line 13) and Form 8889 income (line 8f)
// are emitted as a single output to avoid duplicate nodeType entries
function schedule1Output(deductible: number, income: number): NodeOutput[] {
  const input: Partial<z.infer<typeof schedule1["inputSchema"]>> = {};
  if (deductible > 0) input.line13_hsa_deduction = deductible;
  if (income > 0) input.line8f_hsa_income = income;
  if (Object.keys(input).length === 0) return [];
  return [
    output(
      schedule1,
      input as AtLeastOne<z.infer<typeof schedule1["inputSchema"]>>,
    ),
  ];
}

// Excess contribution output → Form 5329 Part VII
function excessOutput(excess: number): NodeOutput[] {
  if (excess <= 0) return [];
  return [output(form5329, { excess_hsa: excess })];
}

// Form 8889 Part II line 17b and Part III line 21 remain separate Schedule 2
// lines even when both apply to the same HSA beneficiary.
function penaltyOutput(penalty: number, eligibilityTax: number): NodeOutput[] {
  if (penalty <= 0 && eligibilityTax <= 0) return [];
  if (penalty > 0 && eligibilityTax > 0) {
    return [output(schedule2, {
      line17c_hsa_penalty: penalty,
      line17d_hsa_eligibility_tax: eligibilityTax,
    })];
  }
  return penalty > 0
    ? [output(schedule2, { line17c_hsa_penalty: penalty })]
    : [output(schedule2, { line17d_hsa_eligibility_tax: eligibilityTax })];
}

// ─── Node class ───────────────────────────────────────────────────────────────

class Form8889Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "form8889";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([
    schedule1,
    agi_aggregator,
    schedule2,
    form5329,
  ]);

  compute(ctx: NodeContext, rawInput: Form8889Input): NodeResult {
    const cfg = CONFIG_BY_YEAR[ctx.taxYear];
    if (!cfg) throw new Error(`No f1040 config for year ${ctx.taxYear}`);
    const input = inputSchema.parse(rawInput);
    const hasContributions = totalContributions(input) > 0;
    const limitLines = hasContributions
      ? contributionLimitLines(
        input,
        cfg.hsaSelfOnlyLimit,
        cfg.hsaFamilyLimit,
        cfg.hsaCatchup,
      )
      : undefined;
    if (
      limitLines &&
      (input.employer_hsa_contributions ?? 0) > limitLines.line8
    ) {
      throw new Error(
        "Form 8889 employer HSA contributions above the limit need excess-income source treatment",
      );
    }
    const deductible = deductibleContributions(input, limitLines?.line8 ?? 0);
    const excess = excessContributions(input, limitLines?.line8 ?? 0);
    const taxable = taxableDistributions(input);
    const penalty = nonQualifiedPenalty(input, taxable);
    const failure = input.testing_period_failure;
    const partIIIIncome = failure
      ? failure.last_month_rule_excess_amount +
        failure.qualified_funding_distribution_amount
      : 0;
    const eligibilityTax = partIIIIncome * 0.1;

    const outputs: NodeOutput[] = [
      ...schedule1Output(deductible, taxable + partIIIIncome),
      ...excessOutput(excess),
      ...penaltyOutput(penalty, eligibilityTax),
    ];

    // Self-emit only the applicable printed parts for MeF and PDF. A
    // distribution-only or Part III-only filer need not have 2025 HDHP coverage.
    if (
      !hasContributions && (input.hsa_distributions ?? 0) <= 0 &&
      partIIIIncome <= 0
    ) {
      return { outputs };
    }
    const printFields: Record<string, number | string | boolean> = {};
    if (limitLines && input.coverage_type) {
      const line9 = input.employer_hsa_contributions ?? 0;
      printFields.print_line1_coverage = input.coverage_type;
      printFields.print_line2_taxpayer_contributions =
        input.taxpayer_hsa_contributions ?? 0;
      printFields.print_line3_limit = limitLines.line3;
      printFields.print_line4_archer = input.archer_msa_distributions ?? 0;
      printFields.print_line5 = limitLines.line5;
      printFields.print_line6 = limitLines.line5;
      printFields.print_line7_catchup = limitLines.line7;
      printFields.print_line8 = limitLines.line8;
      printFields.print_line9_employer = line9;
      printFields.print_line11 = line9;
      printFields.print_line12 = Math.max(0, limitLines.line8 - line9);
      printFields.print_line13_deduction = deductible;
    }
    const distributions = input.hsa_distributions ?? 0;
    if (distributions > 0) {
      printFields.print_line14a_distributions = distributions;
      const line14b = input.hsa_rollovers_and_timely_excess_withdrawals ?? 0;
      printFields.print_line14b_rollovers = line14b;
      printFields.print_line14c = distributions - line14b;
      printFields.print_line15_qualified = input.qualified_medical_expenses ??
        0;
      printFields.print_line16_taxable = taxable;
      if (input.distribution_exception === true) {
        printFields.print_line17a_exception = true;
      }
      printFields.print_line17b_penalty = penalty;
    }
    if (partIIIIncome > 0 && failure) {
      printFields.print_line18 = failure.last_month_rule_excess_amount;
      printFields.print_line19 = failure.qualified_funding_distribution_amount;
      printFields.print_line20 = partIIIIncome;
      printFields.print_line21 = eligibilityTax;
    }
    outputs.push({ nodeType: this.nodeType, fields: printFields });

    // Route HSA deduction and taxable distribution to AGI aggregator
    const agiFields: Partial<z.infer<typeof agi_aggregator["inputSchema"]>> =
      {};
    if (deductible > 0) agiFields.line13_hsa_deduction = deductible;
    if (taxable + partIIIIncome > 0) {
      agiFields.line8f_hsa_income = taxable + partIIIIncome;
    }
    if (Object.keys(agiFields).length > 0) {
      outputs.push(this.outputNodes.output(
        agi_aggregator,
        agiFields as AtLeastOne<z.infer<typeof agi_aggregator["inputSchema"]>>,
      ));
    }

    return { outputs };
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const form8889 = new Form8889Node();

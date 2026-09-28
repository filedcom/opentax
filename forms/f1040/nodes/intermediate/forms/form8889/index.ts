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
  // Each entry is the eligible HDHP coverage on the first day of Jan-Dec,
  // or null when not an eligible individual (including Medicare enrollment).
  // Distribution-only filers may have no 2025 HDHP.
  eligible_hdhp_coverage_by_month: z.array(
    z.nativeEnum(CoverageType).nullable(),
  )
    .length(12).optional(),

  // ── Part I: Contributions ────────────────────────────────────────────────
  // Line 2: Taxpayer's own HSA contributions (not through payroll)
  taxpayer_hsa_contributions: z.number().nonnegative().optional(),
  // 2025 W-2 box 12 code W amount. Form 8889 line 9 may differ after the
  // Employer Contribution Worksheet's prior/next-year adjustments.
  employer_hsa_contributions: z.number().nonnegative().optional(),
  employer_contribution_years: z.object({
    made_in_2025_for_2024_in_w2: z.number().nonnegative(),
    made_in_2026_for_2025: z.number().nonnegative(),
  }).optional(),
  employer_excess_treatment: z.object({
    amount_included_in_w2_box1: z.number().nonnegative(),
    // Null is an explicit retained-excess answer. A later-year timely
    // withdrawal reduces the 2025 excess base but is not a 2025 distribution.
    timely_withdrawal: z.union([
      z.null(),
      z.object({
        principal: z.number().positive(),
        earnings: z.number().nonnegative(),
        withdrawal_tax_year: z.union([z.literal(2025), z.literal(2026)]),
        withdrawn_by_return_due_date: z.literal(true),
      }),
    ]),
  }).optional(),
  hsa_december_31_value: z.number().nonnegative().optional(),
  post_year_personal_excess_withdrawal: z.object({
    principal: z.number().positive(),
    earnings: z.number().nonnegative(),
    withdrawal_tax_year: z.literal(2026),
    withdrawn_by_return_due_date: z.literal(true),
  }).optional(),
  // Carryover is sourced from the filed 2024 Form 5329, not inferred from
  // the 2025 HSA balance. A zero prior-year line 49 stops the carryover.
  prior_year_hsa_excess: z.object({
    form5329_line48: z.number().nonnegative(),
    form5329_line49: z.number().nonnegative(),
  }).optional(),
  // Line 10: one direct IRA-to-HSA transfer, or a second in a later month of
  // this year after self-only coverage changes to family coverage.
  qualified_hsa_funding_distributions: z.object({
    no_prior_qualified_funding_distribution: z.literal(true),
    transfers: z.array(z.object({
      amount: z.number().positive(),
      transfer_month: z.number().int().min(1).max(12),
      ira_type: z.enum(["traditional", "roth"]),
      direct_trustee_transfer: z.literal(true),
      source_reference: z.string().trim().min(1),
    })).min(1).max(2),
  }).optional(),
  // Whether the taxpayer is age 55 or older (enables $1,000 catch-up)
  // IRC §223(b)(3)
  age_55_or_older: z.boolean().optional(),
  last_month_rule_elected: z.boolean().optional(),
  married_at_year_end: z.boolean().optional(),
  spouse_has_separate_hsa: z.boolean().optional(),
  // Retained as an explicit unsupported source fact until the return can
  // attach both spouses' Forms 8889 and combine their Schedule 1 deductions.
  spouse_allocated_family_limit: z.number().int().nonnegative().optional(),
  // Line 4: Archer MSA distributions received during the year (Form 8853).
  // IRC §223(b)(4)(B): Archer MSA distributions reduce the HSA contribution limit.
  archer_msa_distributions: z.number().nonnegative().optional(),

  // ── Part II: Distributions ───────────────────────────────────────────────
  // Line 14a: Total HSA distributions received during the year (1099-SA box 1)
  hsa_distributions: z.number().nonnegative().optional(),
  // Line 14b: identify rollover amounts separately from timely excess
  // withdrawals, whose included earnings also reach Schedule 1 other income.
  hsa_excluded_distributions: z.object({
    rollover_amount: z.number().nonnegative().optional(),
    timely_excess_withdrawal: z.object({
      source: z.literal("current_year_personal"),
      amount_including_earnings: z.number().nonnegative(),
      included_earnings: z.number().nonnegative(),
      withdrawn_by_return_due_date: z.literal(true),
    }).optional(),
  }).optional(),
  // Line 15: Qualified medical expenses paid from HSA (unreimbursed)
  // IRC §213(d)
  qualified_medical_expenses: z.number().nonnegative().optional(),
  // Portion of line 16 distributed after death, disability, or age 65.
  // Must be answered explicitly when line 16 is positive, including zero.
  // IRC §223(f)(4)(B)–(D)
  exception_qualified_taxable_amount: z.number().nonnegative().optional(),

  // Part III is sourced from the prior-year last-month-rule calculation or
  // qualified HSA funding distribution. Death and disability do not trigger
  // recapture; callers affirm that neither exception applies before routing.
  testing_period_failure: z.object({
    // The 2025 line 18 is recalculated from the filed 2024 contribution lines
    // and the 2024 monthly limitation, not accepted as an entered tax amount.
    last_month_rule_evidence: z.object({
      contribution_year: z.literal(2024),
      eligible_hdhp_coverage_by_month: z.array(
        z.nativeEnum(CoverageType).nullable(),
      ).length(12),
      age_55_or_older: z.boolean(),
      married_at_year_end: z.boolean(),
      // With one Form 8889, no family limit is allocated to another HSA.
      // Separate spouse HSAs require both filed forms and remain unsupported.
      spouse_has_separate_hsa: z.literal(false).optional(),
      last_month_rule_elected: z.literal(true),
      filed_form8889_line2: z.number().int().nonnegative(),
      filed_form8889_line3: z.number().int().nonnegative().optional(),
      filed_form8889_line4_archer: z.literal(0),
      filed_form8889_line5: z.number().int().nonnegative().optional(),
      filed_form8889_line6: z.number().int().nonnegative().optional(),
      filed_form8889_line7: z.number().int().nonnegative().optional(),
      filed_form8889_line8: z.number().int().nonnegative(),
      filed_form8889_line9: z.number().int().nonnegative(),
      filed_form8889_line10: z.literal(0),
      filed_form8889_line13: z.number().int().nonnegative(),
    }).strict().optional(),
    qualified_funding_distribution_amount: z.number().nonnegative(),
    not_death_or_disability: z.literal(true),
    prior_year_source: z.string().trim().min(1),
    // Required when line 19 is positive. Prior-year transfers reconcile to
    // the filed Form 8889 line 10; current-year transfers reconcile to Part I.
    qualified_funding_transfer_evidence: z.object({
      transfer_year: z.number().int(),
      transfers: z.array(z.object({
        amount: z.number().positive(),
        transfer_month: z.number().int().min(1).max(12),
        source_reference: z.string().trim().min(1),
      })).min(1).max(2),
      filed_prior_year_form8889_line10: z.number().positive().optional(),
      eligible_through_prior_year_end: z.literal(true).optional(),
    }).optional(),
  }).strict().optional(),
}).strict();

type Form8889Input = z.infer<typeof inputSchema>;
type LastMonthEvidence = NonNullable<
  NonNullable<
    Form8889Input["testing_period_failure"]
  >["last_month_rule_evidence"]
>;

function verifyPriorYearSpouseFacts(evidence: LastMonthEvidence): void {
  if (
    evidence.married_at_year_end &&
    evidence.spouse_has_separate_hsa !== false
  ) {
    throw new Error(
      "Form 8889 married 2024 last-month-rule recapture needs confirmation the spouse had no separate HSA",
    );
  }
  if (
    !evidence.married_at_year_end &&
    evidence.spouse_has_separate_hsa !== undefined
  ) {
    throw new Error(
      "Form 8889 unmarried 2024 last-month-rule evidence cannot include a spouse HSA answer",
    );
  }
  if (!evidence.married_at_year_end) return;
  // December family coverage makes the elected 2024 line 3 the $8,300 family
  // limit even when earlier eligible months were self-only. The redetermined
  // limitation below uses each month's actual coverage instead of that election.
  const familyLimit = 8_300;
  const catchup = evidence.age_55_or_older ? 1_000 : 0;
  if (
    evidence.filed_form8889_line3 !== familyLimit ||
    evidence.filed_form8889_line5 !== familyLimit ||
    evidence.filed_form8889_line6 !== familyLimit ||
    evidence.filed_form8889_line7 !== catchup ||
    evidence.filed_form8889_line8 !== familyLimit + catchup
  ) {
    throw new Error(
      "Form 8889 married 2024 recapture needs filed lines 3-8 showing the family limit and catch-up without spouse allocation",
    );
  }
}

// 2025 Part III line 18 uses the 2024 Line 3 Limitation Chart and Worksheet.
// This bounded path supports one beneficiary, including a married taxpayer
// whose spouse had no separate HSA. A second HSA needs both spouses' filed
// allocations rather than an inferred amount. Archer MSA or IRA funding in
// 2024 also need separate source reconciliation.
function lastMonthRuleIncome(input: Form8889Input): number {
  const evidence = input.testing_period_failure?.last_month_rule_evidence;
  if (!evidence) return 0;
  const currentCoverage = input.eligible_hdhp_coverage_by_month;
  if (!currentCoverage || !currentCoverage.includes(null)) {
    throw new Error(
      "Form 8889 last-month rule needs twelve 2025 eligibility facts showing a testing-period failure",
    );
  }
  const priorCoverage = evidence.eligible_hdhp_coverage_by_month;
  verifyPriorYearSpouseFacts(evidence);
  const december = priorCoverage[11];
  if (
    december === null || !priorCoverage.slice(0, 11).includes(null)
  ) {
    throw new Error(
      "Form 8889 last-month rule needs a 2024 eligibility gap and December 1 HDHP coverage",
    );
  }
  if (
    input.testing_period_failure?.qualified_funding_transfer_evidence
      ?.transfer_year === 2024
  ) {
    throw new Error(
      "Form 8889 combined 2024 last-month-rule and IRA funding recapture needs separate source reconciliation",
    );
  }
  const annualLimit = (coverage: CoverageType | null): number => {
    if (coverage === null) return 0;
    return (coverage === CoverageType.Family ? 8_300 : 4_150) +
      (evidence.age_55_or_older ? 1_000 : 0);
  };
  const enhancedLimit = annualLimit(december);
  const redeterminedLimit = Math.round(
    priorCoverage.reduce((sum, coverage) => sum + annualLimit(coverage), 0) /
      12,
  );
  const contributed = evidence.filed_form8889_line2 +
    evidence.filed_form8889_line9;
  if (
    evidence.filed_form8889_line8 !== enhancedLimit ||
    contributed > enhancedLimit ||
    evidence.filed_form8889_line13 !== evidence.filed_form8889_line2
  ) {
    throw new Error(
      "Form 8889 last-month rule needs filed 2024 contribution lines that reconcile to the elected limit",
    );
  }
  return Math.max(0, contributed - redeterminedLimit);
}

function verifyFundingTestingPeriod(
  input: Form8889Input,
  taxYear: number,
): void {
  const failure = input.testing_period_failure;
  if (!failure) return;
  const claimed = failure.qualified_funding_distribution_amount;
  const evidence = failure.qualified_funding_transfer_evidence;
  if (claimed === 0) {
    if (evidence) {
      throw new Error(
        "Form 8889 funding-transfer evidence requires a positive Part III line 19 amount",
      );
    }
    return;
  }
  const coverage = input.eligible_hdhp_coverage_by_month;
  if (!evidence || !coverage) {
    throw new Error(
      "Form 8889 Part III line 19 needs transfer evidence and twelve months of HDHP eligibility",
    );
  }
  const priorYear = evidence.transfer_year === taxYear - 1;
  if (!priorYear && evidence.transfer_year !== taxYear) {
    throw new Error(
      "Form 8889 Part III line 19 transfer must be from the current or preceding tax year",
    );
  }
  const sourceTotal = evidence.transfers.reduce(
    (sum, transfer) => sum + transfer.amount,
    0,
  );
  if (priorYear) {
    if (
      input.qualified_hsa_funding_distributions ||
      evidence.filed_prior_year_form8889_line10 !== sourceTotal ||
      evidence.eligible_through_prior_year_end !== true
    ) {
      throw new Error(
        "Form 8889 prior-year funding transfers need filed line 10, uninterrupted prior-year eligibility, and no later lifetime transfer",
      );
    }
  } else {
    const current = input.qualified_hsa_funding_distributions?.transfers;
    if (
      evidence.filed_prior_year_form8889_line10 !== undefined ||
      evidence.eligible_through_prior_year_end !== undefined ||
      current?.length !== evidence.transfers.length ||
      !evidence.transfers.every((transfer) =>
        current?.some((source) =>
          source.amount === transfer.amount &&
          source.transfer_month === transfer.transfer_month &&
          source.source_reference === transfer.source_reference
        )
      )
    ) {
      throw new Error(
        "Form 8889 current-year Part III transfers must match the sourced Part I line 10 transfers",
      );
    }
  }
  const references = evidence.transfers.map((transfer) =>
    transfer.source_reference
  );
  if (new Set(references).size !== references.length) {
    throw new Error(
      "Form 8889 Part III transfer evidence needs distinct trustee sources",
    );
  }
  const failedAmount = evidence.transfers.reduce((sum, transfer) => {
    const firstTestingMonth = priorYear ? 1 : transfer.transfer_month;
    const finalTestingMonth = priorYear ? transfer.transfer_month : 12;
    const firstIneligible = coverage.findIndex((month, index) =>
      index + 1 >= firstTestingMonth &&
      index + 1 <= finalTestingMonth && month === null
    );
    return sum + (firstIneligible >= 0 ? transfer.amount : 0);
  }, 0);
  if (failedAmount !== claimed) {
    throw new Error(
      "Form 8889 Part III line 19 must equal transfers whose testing periods failed in this tax year",
    );
  }
}

// ─── Pure Helper Functions ────────────────────────────────────────────────────

// The 2025 line 3 worksheet averages one limit for each eligible month. An
// elected last-month rule uses December coverage for the full year; someone
// eligible all year with changing coverage receives the greater worksheet or
// December-coverage amount. See 2025 Instructions for Form 8889, line 3.
function contributionLimitLines(
  input: Form8889Input,
  selfOnlyLimit: number,
  familyLimit: number,
  catchupLimit: number,
): {
  line1?: CoverageType;
  line3: number;
  line5: number;
  line6: number;
  line7: number;
  line8: number;
} {
  const coverage = input.eligible_hdhp_coverage_by_month;
  if (
    coverage === undefined || input.age_55_or_older === undefined ||
    input.last_month_rule_elected === undefined
  ) {
    throw new Error(
      "Form 8889 contributions need twelve monthly HDHP eligibility/coverage facts, age, and a last-month-rule answer",
    );
  }
  const eligible = coverage.filter((month) => month !== null);
  const december = coverage[11];
  if (eligible.length === 0) {
    if (input.last_month_rule_elected) {
      throw new Error(
        "Form 8889 last-month rule requires December 1 HDHP eligibility",
      );
    }
    return { line3: 0, line5: 0, line6: 0, line7: 0, line8: 0 };
  }
  if (input.last_month_rule_elected && december === null) {
    throw new Error(
      "Form 8889 last-month rule requires December 1 HDHP eligibility",
    );
  }
  const familyMonths =
    coverage.filter((month) => month === CoverageType.Family).length;
  const selfOnlyMonths = eligible.length - familyMonths;
  // The form's line 1 is the longer-duration coverage unless December is
  // family. The instructions do not resolve a non-December tie, so stop.
  if (
    !input.last_month_rule_elected &&
    december !== CoverageType.Family && familyMonths === selfOnlyMonths
  ) {
    throw new Error(
      "Form 8889 line 1 needs a source-backed coverage choice when durations tie",
    );
  }
  const line1 = input.last_month_rule_elected
    ? december!
    : december === CoverageType.Family || familyMonths > selfOnlyMonths
    ? CoverageType.Family
    : CoverageType.SelfOnly;
  const marriedFamily = familyMonths > 0 && input.married_at_year_end === true;
  if (
    familyMonths > 0 && input.married_at_year_end === undefined
  ) {
    throw new Error(
      "Form 8889 family contribution limit needs an explicit marriage answer",
    );
  }
  if (marriedFamily && input.spouse_has_separate_hsa === undefined) {
    throw new Error(
      "Form 8889 married family coverage needs a separate-spouse-HSA answer",
    );
  }
  const catchupOnLine7 = input.age_55_or_older === true && marriedFamily;
  const monthLimit = (month: CoverageType | null): number => {
    if (month === null) return 0;
    const base = month === CoverageType.Family ? familyLimit : selfOnlyLimit;
    return base +
      (input.age_55_or_older === true && !catchupOnLine7 ? catchupLimit : 0);
  };
  const worksheet =
    coverage.reduce((sum, month) => sum + monthLimit(month), 0) /
    12;
  const fullYear = eligible.length === 12;
  const changedCoverage = familyMonths > 0 && selfOnlyMonths > 0;
  const decemberLimit = december === null ? 0 : monthLimit(december);
  const line3 = Math.round(
    fullYear && changedCoverage
      ? Math.max(worksheet, decemberLimit)
      : input.last_month_rule_elected
      ? decemberLimit
      : worksheet,
  );
  const line5 = Math.max(0, line3 - (input.archer_msa_distributions ?? 0));
  const line6 = line5;
  const catchupMonths = input.last_month_rule_elected ? 12 : eligible.length;
  const line7 = catchupOnLine7
    ? Math.round(catchupLimit * catchupMonths / 12)
    : 0;
  return { line1, line3, line5, line6, line7, line8: line6 + line7 };
}

// Part I, Line 13: Deductible HSA contributions for AGI purposes.
// Only the taxpayer's own contributions (not through payroll) are deductible.
// Employer contributions (Box 12 Code W, §106(d)) are already excluded from
// W-2 Box 1 wages by standard payroll — they are NOT an above-the-line
// deduction. They appear on Form 8889 for informational and excess-contribution
// purposes only. The deductible amount is capped by line 12, after employer
// and qualified IRA-to-HSA funding transfers consume their part of the limit.
// IRC §223(a), §223(b)(4)
function deductibleContributions(
  input: Form8889Input,
  remainingLimit: number,
): number {
  const taxpayer = input.taxpayer_hsa_contributions ?? 0;
  if (taxpayer <= 0) return 0;
  return Math.min(taxpayer, remainingLimit);
}

// Part I: Detect whether regular personal or employer contributions exist.
function employerContributionsForTaxYear(input: Form8889Input): number {
  const codeW = input.employer_hsa_contributions ?? 0;
  const years = input.employer_contribution_years;
  if (codeW > 0 && !years) {
    throw new Error(
      "Form 8889 employer contributions need the 2025 Employer Contribution Worksheet year facts",
    );
  }
  const priorYear = years?.made_in_2025_for_2024_in_w2 ?? 0;
  if (priorYear > codeW) {
    throw new Error(
      "Form 8889 prior-year employer contributions exceed W-2 box 12 code W",
    );
  }
  return codeW - priorYear + (years?.made_in_2026_for_2025 ?? 0);
}

function totalContributions(
  input: Form8889Input,
  employerForTaxYear: number,
): number {
  return (input.taxpayer_hsa_contributions ?? 0) + employerForTaxYear;
}

// Part I: Personal excess contributions equal line 2 less line 13, reduced by
// any timely withdrawn current-year personal principal. Employer excess and
// its timely withdrawal are calculated separately in compute().
// IRC §4973(a)(2)
function excessContributions(
  input: Form8889Input,
  currentDeduction: number,
): number {
  const personalExcess = Math.max(
    0,
    (input.taxpayer_hsa_contributions ?? 0) - currentDeduction,
  );
  const withdrawn = input.hsa_excluded_distributions?.timely_excess_withdrawal;
  const withdrawnPrincipal = withdrawn
    ? withdrawn.amount_including_earnings - withdrawn.included_earnings
    : 0;
  const postYearPrincipal = input.post_year_personal_excess_withdrawal
    ?.principal ?? 0;
  if (withdrawnPrincipal + postYearPrincipal > personalExcess) {
    throw new Error(
      "Form 8889 timely personal excess withdrawal exceeds excess personal contributions",
    );
  }
  return personalExcess - withdrawnPrincipal - postYearPrincipal;
}

function excludedDistributions(input: Form8889Input): {
  excluded: number;
  earnings: number;
} {
  const sources = input.hsa_excluded_distributions;
  const timely = sources?.timely_excess_withdrawal;
  const personalEarnings = timely?.included_earnings ?? 0;
  if (timely && personalEarnings > timely.amount_including_earnings) {
    throw new Error(
      "Form 8889 timely excess-withdrawal earnings cannot exceed the withdrawal",
    );
  }
  const employerTimely = input.employer_excess_treatment?.timely_withdrawal;
  const employerCurrentYear = employerTimely?.withdrawal_tax_year === 2025
    ? employerTimely.principal + employerTimely.earnings
    : 0;
  return {
    excluded: (sources?.rollover_amount ?? 0) +
      (timely?.amount_including_earnings ?? 0) + employerCurrentYear,
    earnings: personalEarnings +
      (employerTimely?.withdrawal_tax_year === 2025
        ? employerTimely.earnings
        : 0),
  };
}

// Part II: Taxable (non-qualified) distributions after line 14b exclusions.
// IRC §223(f)(2)
function taxableDistributions(input: Form8889Input, excluded: number): number {
  const total = input.hsa_distributions ?? 0;
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
  const excepted = input.exception_qualified_taxable_amount;
  if (excepted !== undefined && excepted > taxable) {
    throw new Error(
      "Form 8889 additional-tax exception amount cannot exceed taxable distributions",
    );
  }
  if (taxable <= 0) return 0;
  if (excepted === undefined) {
    throw new Error(
      "Form 8889 taxable distribution needs an explicit additional-tax exception amount",
    );
  }
  return (taxable - excepted) * NON_QUALIFIED_PENALTY_RATE;
}

// Merged Schedule 1 output avoids duplicate nodeType entries when deduction,
// HSA distribution income, and timely excess-withdrawal earnings coexist.
function schedule1Output(
  deductible: number,
  income: number,
  excessWithdrawalEarnings: number,
  employerExcessIncome: number,
): NodeOutput[] {
  const input: Partial<z.infer<typeof schedule1["inputSchema"]>> = {};
  if (deductible > 0) input.line13_hsa_deduction = deductible;
  if (income > 0) input.line8f_hsa_income = income;
  if (excessWithdrawalEarnings > 0) {
    input.line8z_hsa_excess_earnings = excessWithdrawalEarnings;
  }
  if (employerExcessIncome > 0) {
    input.line8z_hsa_excess_employer = employerExcessIncome;
  }
  if (Object.keys(input).length === 0) return [];
  return [
    output(
      schedule1,
      input as AtLeastOne<z.infer<typeof schedule1["inputSchema"]>>,
    ),
  ];
}

// Excess contribution output → Form 5329 Part VII
function excessOutput(
  input: Form8889Input,
  line12: number,
  taxable: number,
  currentExcess: number,
): NodeOutput[] {
  const prior = input.prior_year_hsa_excess;
  const priorExcess = prior && prior.form5329_line49 > 0
    ? prior.form5329_line48
    : 0;
  if (priorExcess <= 0 && currentExcess <= 0) return [];
  const accountValue = input.hsa_december_31_value;
  if (accountValue === undefined) {
    throw new Error(
      "Form 8889 excess contributions need the December 31 HSA value for Form 5329",
    );
  }
  return [output(form5329, {
    hsa_part_vii: {
      line42_prior_excess: priorExcess,
      line43_unused_contribution_room: Math.max(
        0,
        line12 - (input.taxpayer_hsa_contributions ?? 0),
      ),
      line44_taxable_distributions: taxable,
      line47_current_year_excess: currentExcess,
      december_31_value: accountValue,
    },
  })];
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
    if (input.spouse_has_separate_hsa === true) {
      throw new Error(
        "Form 8889 separate spouse HSAs need both spouses' Forms 8889 and a combined Schedule 1 deduction",
      );
    }
    if (input.spouse_allocated_family_limit !== undefined) {
      throw new Error(
        "Form 8889 spouse family-limit allocation needs both spouses' Forms 8889",
      );
    }
    verifyFundingTestingPeriod(input, ctx.taxYear);
    if (
      (input.prior_year_hsa_excess?.form5329_line49 ?? 0) > 0 &&
      (input.prior_year_hsa_excess?.form5329_line48 ?? 0) === 0
    ) {
      throw new Error(
        "Form 8889 prior-year HSA excise needs a positive filed Form 5329 line 48",
      );
    }
    const funding = input.qualified_hsa_funding_distributions;
    const fundingAmount = funding?.transfers.reduce(
      (sum, transfer) => sum + transfer.amount,
      0,
    ) ?? 0;
    const employer = employerContributionsForTaxYear(input);
    const hasContributions = totalContributions(input, employer) +
        fundingAmount > 0;
    const hasPriorYearExcess =
      (input.prior_year_hsa_excess?.form5329_line49 ?? 0) > 0;
    const limitLines = hasContributions || hasPriorYearExcess
      ? contributionLimitLines(
        input,
        cfg.hsaSelfOnlyLimit,
        cfg.hsaFamilyLimit,
        cfg.hsaCatchup,
      )
      : undefined;
    if (funding && limitLines) {
      const transferCoverage = funding.transfers.map((transfer) => {
        const coverage = input.eligible_hdhp_coverage_by_month![
          transfer.transfer_month - 1
        ];
        if (coverage === null) {
          throw new Error(
            "Form 8889 qualified HSA funding transfer needs HDHP eligibility in its transfer month",
          );
        }
        const limit = (coverage === CoverageType.Family
          ? cfg.hsaFamilyLimit
          : cfg.hsaSelfOnlyLimit) +
          (input.age_55_or_older ? cfg.hsaCatchup : 0);
        if (transfer.amount > limit) {
          throw new Error(
            "Form 8889 qualified HSA funding transfer exceeds its coverage limit",
          );
        }
        return coverage;
      });
      if (funding.transfers.length === 2) {
        const first = funding.transfers[0]!;
        const second = funding.transfers[1]!;
        if (
          transferCoverage[0] !== CoverageType.SelfOnly ||
          transferCoverage[1] !== CoverageType.Family ||
          first.transfer_month >= second.transfer_month ||
          first.source_reference === second.source_reference
        ) {
          throw new Error(
            "Form 8889 second HSA funding transfer needs a later family-coverage month and distinct trustee source",
          );
        }
      }
      const lifetimeLimit = (funding.transfers.length === 2
        ? cfg.hsaFamilyLimit
        : transferCoverage[0] === CoverageType.Family
        ? cfg.hsaFamilyLimit
        : cfg.hsaSelfOnlyLimit) +
        (input.age_55_or_older ? cfg.hsaCatchup : 0);
      if (fundingAmount > lifetimeLimit || fundingAmount > limitLines.line8) {
        throw new Error(
          "Form 8889 qualified HSA funding transfer exceeds its eligible contribution limit",
        );
      }
    }
    const employerExcess = limitLines
      ? Math.max(0, employer - Math.max(0, limitLines.line8 - fundingAmount))
      : 0;
    const employerTreatment = input.employer_excess_treatment;
    if (employerExcess > 0 && !employerTreatment) {
      throw new Error(
        "Form 8889 employer HSA contributions above the limit need W-2 inclusion and retention facts",
      );
    }
    if (employerExcess === 0 && employerTreatment) {
      throw new Error(
        "Form 8889 employer excess treatment requires excess employer contributions",
      );
    }
    if (
      employerTreatment &&
      employerTreatment.amount_included_in_w2_box1 > employerExcess
    ) {
      throw new Error(
        "Form 8889 W-2 box 1 inclusion cannot exceed employer excess",
      );
    }
    const employerWithdrawal = employerTreatment?.timely_withdrawal;
    if (employerWithdrawal && employerWithdrawal.principal > employerExcess) {
      throw new Error(
        "Form 8889 timely employer withdrawal exceeds excess employer contributions",
      );
    }
    const line12 = Math.max(
      0,
      (limitLines?.line8 ?? 0) - employer - fundingAmount,
    );
    const currentDeduction = deductibleContributions(input, line12);
    const line42 = hasPriorYearExcess
      ? input.prior_year_hsa_excess!.form5329_line48
      : 0;
    const line43 = Math.max(
      0,
      line12 - (input.taxpayer_hsa_contributions ?? 0),
    );
    const line14b = excludedDistributions(input);
    const taxable = taxableDistributions(input, line14b.excluded);
    const priorYearDeduction = Math.min(
      line43,
      Math.max(0, line42 - taxable),
    );
    const deductible = currentDeduction + priorYearDeduction;
    const excess = excessContributions(input, currentDeduction) +
      employerExcess -
      (employerWithdrawal?.principal ?? 0);
    const employerExcessIncome = employerExcess -
      (employerTreatment?.amount_included_in_w2_box1 ?? 0);
    const penalty = nonQualifiedPenalty(input, taxable);
    const failure = input.testing_period_failure;
    const lastMonthIncome = lastMonthRuleIncome(input);
    const partIIIIncome = failure
      ? lastMonthIncome +
        failure.qualified_funding_distribution_amount
      : 0;
    const eligibilityTax = partIIIIncome * 0.1;

    const outputs: NodeOutput[] = [
      ...schedule1Output(
        deductible,
        taxable + partIIIIncome,
        line14b.earnings,
        employerExcessIncome,
      ),
      ...excessOutput(input, line12, taxable, excess),
      ...penaltyOutput(penalty, eligibilityTax),
    ];

    // Self-emit only the applicable printed parts for MeF and PDF. A
    // distribution-only or Part III-only filer need not have 2025 HDHP coverage.
    if (
      !hasContributions && !hasPriorYearExcess &&
      (input.hsa_distributions ?? 0) <= 0 &&
      partIIIIncome <= 0
    ) {
      return { outputs };
    }
    const printFields: Record<string, number | string | boolean> = {};
    if (limitLines) {
      if (limitLines.line1) {
        printFields.print_line1_coverage = limitLines.line1;
      }
      printFields.print_line2_taxpayer_contributions =
        input.taxpayer_hsa_contributions ?? 0;
      printFields.print_line3_limit = limitLines.line3;
      printFields.print_line4_archer = input.archer_msa_distributions ?? 0;
      printFields.print_line5 = limitLines.line5;
      printFields.print_line6 = limitLines.line6;
      printFields.print_line7_catchup = limitLines.line7;
      printFields.print_line8 = limitLines.line8;
      printFields.print_line9_employer = employer;
      if (fundingAmount > 0) printFields.print_line10 = fundingAmount;
      printFields.print_line11 = employer + fundingAmount;
      printFields.print_line12 = line12;
      printFields.print_line13_deduction = deductible;
    }
    const distributions = input.hsa_distributions ?? 0;
    if (distributions > 0) {
      printFields.print_line14a_distributions = distributions;
      printFields.print_line14b_excluded_distributions = line14b.excluded;
      printFields.print_line14c = distributions - line14b.excluded;
      printFields.print_line15_qualified = input.qualified_medical_expenses ??
        0;
      printFields.print_line16_taxable = taxable;
      if ((input.exception_qualified_taxable_amount ?? 0) > 0) {
        printFields.print_line17a_exception = true;
      }
      printFields.print_line17b_penalty = penalty;
    }
    if (partIIIIncome > 0 && failure) {
      printFields.print_line18 = lastMonthIncome;
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
    if (line14b.earnings > 0) {
      agiFields.line8z_hsa_excess_earnings = line14b.earnings;
    }
    if (employerExcessIncome > 0) {
      agiFields.line8z_hsa_excess_employer = employerExcessIncome;
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

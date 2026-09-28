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
import { TS } from "../../../types.ts";

// ─── Constants — mathematical/statutory rates, unchanged across years ─────────

// IRC §223(f)(4)(A) — additional tax rate on non-qualified HSA distributions
const NON_QUALIFIED_PENALTY_RATE = 0.20;

// ─── Enums ────────────────────────────────────────────────────────────────────

export enum CoverageType {
  SelfOnly = "self_only",
  Family = "family",
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const beneficiaryInputSchema = z.object({
  beneficiary_identity: z.object({
    owner: z.nativeEnum(TS),
    name: z.string().trim().min(1),
    ssn: z.string().regex(/^\d{3}-?\d{2}-?\d{4}$/),
  }).strict(),
  allocated_family_limit: z.number().int().nonnegative().optional(),
  family_allocation_source_reference: z.string().trim().min(1).optional(),
  // ── Coverage (determines contribution limit) ─────────────────────────────
  // Each entry is the eligible HDHP coverage on the first day of Jan-Dec,
  // or null when not an eligible individual (including Medicare enrollment).
  // Distribution-only filers may have no 2025 HDHP.
  eligible_hdhp_coverage_by_month: z.array(
    z.nativeEnum(CoverageType).nullable(),
  )
    .length(12).optional(),
  // Used for the paired route where Medicare ends one spouse's eligibility.
  medicare_enrollment: z.object({
    first_ineligible_month: z.number().int().min(2).max(12),
    source_reference: z.string().trim().min(1),
  }).strict().optional(),
  other_disqualifying_coverage: z.object({
    first_ineligible_month: z.number().int().min(2).max(12),
    source_reference: z.string().trim().min(1),
    continuing_spouse_not_covered_by_other_plan: z.literal(true),
  }).strict().optional(),

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
        // A 2025 payment to the HSA owner reaches lines 14a/14b and must
        // match its code-2 Form 1099-SA. A 2026 payment is not on this return.
        form1099_sa_source_reference: z.string().trim().min(1).optional(),
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
  // Line 4: Archer MSA distributions received during the year (Form 8853).
  // IRC §223(b)(4)(B): Archer MSA distributions reduce the HSA contribution limit.
  archer_msa_distributions: z.number().nonnegative().optional(),

  // ── Part II: Distributions ───────────────────────────────────────────────
  // Line 14a: Total HSA distributions received during the year (1099-SA box 1)
  hsa_distributions: z.number().nonnegative().optional(),
  // Each reported HSA distribution is tied to its beneficiary's Form 1099-SA.
  // Paired-HSA export requires these records rather than accepting a bare total.
  form1099_sa_distributions: z.array(
    z.object({
      tax_year: z.number().int(),
      recipient_ssn: z.string().regex(/^\d{3}-?\d{2}-?\d{4}$/),
      box1_gross_distribution: z.number().positive(),
      box2_earnings_on_excess: z.number().nonnegative().optional(),
      box3_distribution_code: z.enum(["1", "2", "3"]),
      source_reference: z.string().trim().min(1),
    }).strict().superRefine((row, ctx) => {
      if (
        row.box3_distribution_code === "2"
          ? row.box2_earnings_on_excess === undefined ||
            row.box2_earnings_on_excess > row.box1_gross_distribution
          : row.box2_earnings_on_excess !== undefined
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["box2_earnings_on_excess"],
          message: "Form 1099-SA code 2 needs box 2 earnings included in box 1",
        });
      }
    }),
  ).min(1).optional(),
  // Line 14b: identify rollover amounts separately from timely excess
  // withdrawals, whose included earnings also reach Schedule 1 other income.
  hsa_excluded_distributions: z.object({
    rollover: z.object({
      amount: z.number().positive(),
      distribution_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      contribution_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      distribution_source_reference: z.string().trim().min(1),
      contribution_source_reference: z.string().trim().min(1),
      same_beneficiary: z.literal(true),
      receiving_hsa_no_other_rollover_in_preceding_12_months: z.literal(true),
      not_direct_trustee_transfer: z.literal(true),
    }).strict().optional(),
    timely_excess_withdrawal: z.object({
      source: z.literal("current_year_personal"),
      amount_including_earnings: z.number().nonnegative(),
      included_earnings: z.number().nonnegative(),
      form1099_sa_source_reference: z.string().trim().min(1),
      withdrawn_by_return_due_date: z.literal(true),
    }).optional(),
  }).strict().optional(),
  // Line 15: Qualified medical expenses paid from HSA (unreimbursed)
  // IRC §213(d)
  qualified_medical_expenses: z.number().nonnegative().optional(),
  qualified_medical_expense_evidence: z.array(
    z.object({
      amount: z.number().positive(),
      source_reference: z.string().trim().min(1),
      incurred_after_hsa_established: z.literal(true),
      not_reimbursed_by_other_coverage: z.literal(true),
      eligible_person: z.enum(["owner", "spouse", "dependent"]),
    }).strict(),
  ).min(1).optional(),
  // Portion of line 16 distributed after death, disability, or age 65.
  // Must be answered explicitly when line 16 is positive, including zero.
  // IRC §223(f)(4)(B)–(D)
  exception_qualified_taxable_amount: z.number().nonnegative().optional(),
  // A positive age-65 exception needs dated distributions: Form 1099-SA box 1
  // is an annual total and cannot identify which withdrawals followed age 65.
  age_65_exception_evidence: z.object({
    date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    birth_date_source_reference: z.string().trim().min(1),
    distributions: z.array(
      z.object({
        distribution_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        gross_amount: z.number().positive(),
        qualified_medical_amount: z.number().nonnegative(),
        // Required for every dated row when a line-14b rollover coexists with
        // the age-65 exception. Zero explicitly marks a non-rollover row.
        rollover_excluded_amount: z.number().nonnegative().optional(),
        source_reference: z.string().trim().min(1),
        form1099_sa_source_reference: z.string().trim().min(1),
      }).strict(),
    ).min(1),
  }).strict().optional(),
  // Form 1099-SA code 3 identifies a distribution after disability. The
  // exception applies only to the taxable portion distributed after the
  // documented disability date, not automatically to the annual total.
  disability_exception_evidence: z.object({
    disability_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    disability_source_reference: z.string().trim().min(1),
    section_72m7_disability_confirmed: z.literal(true),
    distributions: z.array(
      z.object({
        distribution_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        gross_amount: z.number().positive(),
        qualified_medical_amount: z.number().nonnegative(),
        source_reference: z.string().trim().min(1),
        form1099_sa_source_reference: z.string().trim().min(1),
      }).strict(),
    ).min(1),
  }).strict().optional(),

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
      spouse_has_separate_hsa: z.boolean().optional(),
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
      prior_year_eligible_hdhp_coverage_by_month: z.array(
        z.nativeEnum(CoverageType).nullable(),
      ).length(12).optional(),
      prior_year_eligibility_source_reference: z.string().trim().min(1)
        .optional(),
    }).optional(),
  }).strict().optional(),
}).strict();

export const inputSchema = beneficiaryInputSchema.extend({
  spouse_hsa: beneficiaryInputSchema.optional(),
  // A 2024 married-family election with two HSAs can only be redetermined
  // from both filed owner forms and the spouses' actual allocation agreement.
  prior_year_paired_family_allocation: z.object({
    contribution_year: z.literal(2024),
    equal_allocation_agreed: z.literal(true),
    allocation_source_reference: z.string().trim().min(1),
    primary_filed_form8889_source_reference: z.string().trim().min(1),
    spouse_filed_form8889_source_reference: z.string().trim().min(1),
  }).strict().optional(),
  w2_code_w_entries: z.array(
    z.object({
      employee_ssn: z.string().regex(/^\d{3}-?\d{2}-?\d{4}$/),
      amount: z.number().nonnegative(),
    }).strict(),
  ).optional(),
});

type Form8889Input = z.infer<typeof beneficiaryInputSchema>;
type Form8889ReturnInput = z.infer<typeof inputSchema>;
type LastMonthEvidence = NonNullable<
  NonNullable<
    Form8889Input["testing_period_failure"]
  >["last_month_rule_evidence"]
>;

function verifyPriorYearSpouseFacts(
  evidence: LastMonthEvidence,
  pairedPriorYear: boolean,
): void {
  if (
    evidence.married_at_year_end &&
    evidence.spouse_has_separate_hsa !== pairedPriorYear
  ) {
    throw new Error(
      "Form 8889 married 2024 last-month-rule recapture needs both spouse-HSA status and filed-form reconciliation",
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
  if (pairedPriorYear) {
    const priorCoverage = evidence.eligible_hdhp_coverage_by_month;
    if (
      evidence.age_55_or_older ||
      priorCoverage.some((month, index) =>
        index === 11 ? month !== CoverageType.Family : month !== null
      ) ||
      evidence.filed_form8889_line3 !== 8_300 ||
      evidence.filed_form8889_line5 !== 8_300 ||
      evidence.filed_form8889_line6 !== 4_150 ||
      evidence.filed_form8889_line7 !== 0 ||
      evidence.filed_form8889_line8 !== 4_150
    ) {
      throw new Error(
        "Form 8889 paired 2024 recapture supports only a sourced equal family allocation with December-only eligibility and no catch-up",
      );
    }
    return;
  }
  // December family coverage makes elected line 3 the $8,300 family limit.
  // With December self-only coverage and earlier family months, the filed
  // line 3 is the greater of the 2024 monthly worksheet and $4,150. The
  // age-55 mixed-coverage worksheet also affects line 7 and remains out of
  // scope here.
  const december = evidence.eligible_hdhp_coverage_by_month[11];
  const selfOnly = december === CoverageType.SelfOnly;
  const mixedToSelfOnly = selfOnly &&
    evidence.eligible_hdhp_coverage_by_month.includes(CoverageType.Family);
  if (mixedToSelfOnly && evidence.age_55_or_older) {
    throw new Error(
      "Form 8889 married 2024 age-55 mixed-coverage recapture needs the filed additional-contribution worksheet",
    );
  }
  const baseLimit = selfOnly ? 4_150 : 8_300;
  const catchup = evidence.age_55_or_older ? 1_000 : 0;
  const monthlyWorksheet = Math.round(
    evidence.eligible_hdhp_coverage_by_month.reduce(
      (sum, coverage) =>
        sum +
        (coverage === CoverageType.Family
          ? 8_300
          : coverage === CoverageType.SelfOnly
          ? 4_150
          : 0),
      0,
    ) / 12,
  );
  const electedLine3 = mixedToSelfOnly
    ? Math.max(baseLimit, monthlyWorksheet)
    : selfOnly
    ? baseLimit + catchup
    : baseLimit;
  if (
    evidence.filed_form8889_line3 !== electedLine3 ||
    evidence.filed_form8889_line5 !== electedLine3 ||
    evidence.filed_form8889_line6 !== electedLine3 ||
    evidence.filed_form8889_line7 !== (selfOnly ? 0 : catchup) ||
    evidence.filed_form8889_line8 !== electedLine3 +
        (selfOnly ? 0 : catchup)
  ) {
    throw new Error(
      "Form 8889 married 2024 recapture needs filed lines 3-8 showing the December coverage limit and catch-up without spouse allocation",
    );
  }
}

// 2025 Part III line 18 uses the 2024 Line 3 Limitation Chart and Worksheet.
// This path supports one beneficiary, including a married taxpayer whose
// spouse had no separate HSA, plus the separately reconciled equal-allocation
// 2024 paired-family case. Other paired allocations, Archer MSA, or 2024 IRA
// funding require their own source reconstruction.
function lastMonthRuleIncome(
  input: Form8889Input,
  pairedPriorYear: boolean,
): number {
  const evidence = input.testing_period_failure?.last_month_rule_evidence;
  if (!evidence) return 0;
  const currentCoverage = input.eligible_hdhp_coverage_by_month;
  if (!currentCoverage || !currentCoverage.includes(null)) {
    throw new Error(
      "Form 8889 last-month rule needs twelve 2025 eligibility facts showing a testing-period failure",
    );
  }
  const priorCoverage = evidence.eligible_hdhp_coverage_by_month;
  verifyPriorYearSpouseFacts(evidence, pairedPriorYear);
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
  const redeterminedFamilyLimit = Math.round(
    priorCoverage.reduce((sum, coverage) => sum + annualLimit(coverage), 0) /
      12,
  );
  const enhancedLimit = pairedPriorYear
    ? 4_150
    : evidence.married_at_year_end &&
        december === CoverageType.SelfOnly &&
        priorCoverage.includes(CoverageType.Family) &&
        !evidence.age_55_or_older
    ? Math.max(4_150, redeterminedFamilyLimit)
    : annualLimit(december);
  const redeterminedLimit = pairedPriorYear
    ? redeterminedFamilyLimit / 2
    : redeterminedFamilyLimit;
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
    const priorCoverage = evidence.prior_year_eligible_hdhp_coverage_by_month;
    if (
      input.qualified_hsa_funding_distributions ||
      evidence.filed_prior_year_form8889_line10 !== sourceTotal ||
      !priorCoverage ||
      !evidence.prior_year_eligibility_source_reference
    ) {
      throw new Error(
        "Form 8889 prior-year funding transfers need filed line 10, sourced monthly prior-year eligibility, and no later lifetime transfer",
      );
    }
    for (const transfer of evidence.transfers) {
      if (
        priorCoverage.slice(transfer.transfer_month - 1).some((month) =>
          month === null
        )
      ) {
        throw new Error(
          "Form 8889 prior-year funding transfer needs uninterrupted HDHP eligibility from its transfer month through year-end",
        );
      }
    }
  } else {
    const current = input.qualified_hsa_funding_distributions?.transfers;
    if (
      evidence.filed_prior_year_form8889_line10 !== undefined ||
      evidence.prior_year_eligible_hdhp_coverage_by_month !== undefined ||
      evidence.prior_year_eligibility_source_reference !== undefined ||
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
  soleFamilyLimit = 0,
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
  // For spouses with separate HSAs and mixed family/self-only months, line 6
  // first takes the agreed family-month share, then adds this owner's own
  // self-only-month limit. The latter is not shared with the spouse.
  const ownSelfOnlyLimit = marriedFamily &&
      input.spouse_has_separate_hsa === true &&
      input.allocated_family_limit !== undefined && selfOnlyMonths > 0
    ? Math.round(selfOnlyLimit * selfOnlyMonths / 12)
    : 0;
  const line6 = input.allocated_family_limit === undefined
    ? line5
    : input.allocated_family_limit + ownSelfOnlyLimit + soleFamilyLimit;
  if (line6 > line5) {
    throw new Error("Form 8889 allocated family limit cannot exceed line 5");
  }
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

function excludedDistributions(input: Form8889Input, taxYear: number): {
  excluded: number;
  earnings: number;
} {
  const sources = input.hsa_excluded_distributions;
  const rollover = sources?.rollover;
  if (rollover) {
    const parseDate = (value: string): number => {
      const timestamp = Date.parse(`${value}T00:00:00.000Z`);
      if (
        !Number.isFinite(timestamp) ||
        new Date(timestamp).toISOString().slice(0, 10) !== value
      ) {
        throw new Error("Form 8889 HSA rollover needs valid calendar dates");
      }
      return timestamp;
    };
    const distributionDate = parseDate(rollover.distribution_date);
    const contributionDate = parseDate(rollover.contribution_date);
    const elapsedDays = (contributionDate - distributionDate) / 86_400_000;
    if (
      rollover.distribution_date.slice(0, 4) !== String(taxYear) ||
      elapsedDays < 0 || elapsedDays > 60
    ) {
      throw new Error(
        "Form 8889 HSA rollover must redeposit a tax-year distribution within 60 days",
      );
    }
    if (
      rollover.distribution_source_reference ===
        rollover.contribution_source_reference
    ) {
      throw new Error(
        "Form 8889 HSA rollover needs distinct distribution and redeposit sources",
      );
    }
  }
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
    excluded: (rollover?.amount ?? 0) +
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

function verifyDistributionSources(
  input: Form8889Input,
  taxYear: number,
): void {
  const records = input.form1099_sa_distributions;
  const expenses = input.qualified_medical_expense_evidence;
  const uniqueReferences = (references: string[]) =>
    new Set(references).size === references.length;
  if ((input.hsa_distributions ?? 0) > 0 && !records) {
    throw new Error(
      "Form 8889 positive line 14a needs owner-matched Form 1099-SA box 1 sources",
    );
  }
  if (records) {
    const ownerSsn = input.beneficiary_identity.ssn.replaceAll("-", "");
    const total = records.reduce((sum, record) => {
      if (
        record.tax_year !== taxYear ||
        record.recipient_ssn.replaceAll("-", "") !== ownerSsn
      ) {
        throw new Error(
          "Form 8889 Form 1099-SA year and recipient must match the HSA owner",
        );
      }
      return sum + record.box1_gross_distribution;
    }, 0);
    if (
      total !== (input.hsa_distributions ?? 0) ||
      !uniqueReferences(records.map((record) => record.source_reference))
    ) {
      throw new Error(
        "Form 8889 line 14a must reconcile to distinct Form 1099-SA box 1 sources",
      );
    }
  }
  const timely = input.hsa_excluded_distributions?.timely_excess_withdrawal;
  const employerTimely = input.employer_excess_treatment?.timely_withdrawal;
  const employerCode2 = employerTimely?.withdrawal_tax_year === 2025
    ? employerTimely
    : undefined;
  if (
    employerTimely?.withdrawal_tax_year === 2026 &&
    employerTimely.form1099_sa_source_reference !== undefined
  ) {
    throw new Error(
      "Form 8889 post-year employer excess withdrawal cannot claim a 2025 Form 1099-SA source",
    );
  }
  const code2 =
    records?.filter((record) => record.box3_distribution_code === "2") ?? [];
  if (employerCode2) {
    const record = code2[0];
    if (
      timely || !record || !employerCode2.form1099_sa_source_reference ||
      records?.length !== 1 || code2.length !== 1 ||
      input.hsa_excluded_distributions !== undefined ||
      (input.qualified_medical_expenses ?? 0) !== 0 ||
      input.age_65_exception_evidence !== undefined ||
      input.disability_exception_evidence !== undefined ||
      record.source_reference !==
        employerCode2.form1099_sa_source_reference ||
      record.box1_gross_distribution !==
        employerCode2.principal + employerCode2.earnings ||
      record.box2_earnings_on_excess !== employerCode2.earnings
    ) {
      throw new Error(
        "Form 8889 timely employer excess paid to the owner needs one matching code-2 Form 1099-SA box 1 and box 2 source",
      );
    }
  } else if (timely || code2.length > 0) {
    const record = code2[0];
    if (
      !timely || !record || records?.length !== 1 || code2.length !== 1 ||
      input.hsa_excluded_distributions?.rollover !== undefined ||
      input.employer_excess_treatment?.timely_withdrawal !== undefined ||
      (input.qualified_medical_expenses ?? 0) !== 0 ||
      input.age_65_exception_evidence !== undefined ||
      input.disability_exception_evidence !== undefined ||
      record.source_reference !== timely.form1099_sa_source_reference ||
      record.box1_gross_distribution !== timely.amount_including_earnings ||
      record.box2_earnings_on_excess !== timely.included_earnings
    ) {
      throw new Error(
        "Form 8889 timely personal excess withdrawal needs one matching code-2 Form 1099-SA box 1 and box 2 source",
      );
    }
  }
  if (expenses) {
    const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    if (
      total !== (input.qualified_medical_expenses ?? 0) ||
      !uniqueReferences(expenses.map((expense) => expense.source_reference))
    ) {
      throw new Error(
        "Form 8889 line 15 must reconcile to distinct qualified medical expense sources",
      );
    }
  }
}

// Part II, Line 20: 20% additional tax on non-qualified distributions
// Only applies when no whole-distribution exception flag is set
// IRC §223(f)(4)(A)
function nonQualifiedPenalty(
  input: Form8889Input,
  taxable: number,
  taxYear: number,
): number {
  const excepted = input.exception_qualified_taxable_amount;
  if (excepted !== undefined && excepted > taxable) {
    throw new Error(
      "Form 8889 additional-tax exception amount cannot exceed taxable distributions",
    );
  }
  const disability = input.disability_exception_evidence;
  if (
    input.form1099_sa_distributions?.some((row) =>
      row.box3_distribution_code === "3"
    ) && !disability
  ) {
    throw new Error(
      "Form 8889 Form 1099-SA disability code needs dated disability evidence",
    );
  }
  if (input.age_65_exception_evidence && disability) {
    throw new Error(
      "Form 8889 combined age-65 and disability exceptions need separate allocation",
    );
  }
  if (taxable <= 0 && !disability) return 0;
  if (taxable > 0 && excepted === undefined) {
    throw new Error(
      "Form 8889 taxable distribution needs an explicit additional-tax exception amount",
    );
  }
  const evidence = input.age_65_exception_evidence;
  if ((excepted ?? 0) > 0 && !evidence && !disability) {
    throw new Error(
      "Form 8889 positive additional-tax exception needs dated age-65 or disability evidence",
    );
  }
  if (evidence) {
    const exclusions = input.hsa_excluded_distributions;
    const rollover = exclusions?.rollover;
    if (
      (exclusions && !rollover) ||
      exclusions?.timely_excess_withdrawal ||
      input.employer_excess_treatment?.timely_withdrawal
          ?.withdrawal_tax_year === 2025
    ) {
      throw new Error(
        "Form 8889 age-65 exception supports line 14b only for a sourced rollover allocation",
      );
    }
    const validDate = (value: string): boolean => {
      const date = new Date(`${value}T00:00:00.000Z`);
      return !Number.isNaN(date.valueOf()) &&
        date.toISOString().slice(0, 10) === value;
    };
    const birthday = evidence.date_of_birth;
    // Federal tax age is attained the day before the birthday. Subtracting one
    // from a Feb 29 birth day gives Feb 28 in a non-leap 65th year.
    const age65 = new Date(Date.UTC(
      Number(birthday.slice(0, 4)) + 65,
      Number(birthday.slice(5, 7)) - 1,
      Number(birthday.slice(8, 10)) - 1,
    )).toISOString().slice(0, 10);
    const records = evidence.distributions;
    if (rollover) {
      const allocated = records.filter((row) =>
        (row.rollover_excluded_amount ?? 0) > 0
      );
      if (
        records.some((row) => row.rollover_excluded_amount === undefined) ||
        allocated.length !== 1 ||
        allocated[0]?.source_reference !==
          rollover.distribution_source_reference ||
        allocated[0]?.distribution_date !== rollover.distribution_date ||
        allocated[0]?.rollover_excluded_amount !== rollover.amount
      ) {
        throw new Error(
          "Form 8889 age-65 rollover needs one dated transaction matching the excluded amount, date, and source",
        );
      }
    } else if (
      records.some((row) => row.rollover_excluded_amount !== undefined)
    ) {
      throw new Error(
        "Form 8889 age-65 transaction cannot claim rollover exclusion without line 14b rollover source",
      );
    }
    const forms = input.form1099_sa_distributions ?? [];
    const grossByForm = new Map<string, number>();
    for (const row of records) {
      grossByForm.set(
        row.form1099_sa_source_reference,
        (grossByForm.get(row.form1099_sa_source_reference) ?? 0) +
          row.gross_amount,
      );
    }
    if (
      !validDate(birthday) ||
      !validDate(age65) ||
      !forms.length ||
      new Set(records.map((row) => row.source_reference)).size !==
        records.length ||
      records.some((row) =>
        !validDate(row.distribution_date) ||
        row.distribution_date.slice(0, 4) !== String(taxYear) ||
        row.qualified_medical_amount +
              (row.rollover_excluded_amount ?? 0) > row.gross_amount
      ) ||
      records.reduce((sum, row) => sum + row.gross_amount, 0) !==
        (input.hsa_distributions ?? 0) ||
      forms.some((form) =>
        grossByForm.get(form.source_reference) !==
          form.box1_gross_distribution ||
        form.box3_distribution_code !== "1"
      ) ||
      grossByForm.size !== forms.length ||
      records.reduce((sum, row) => sum + row.qualified_medical_amount, 0) !==
        (input.qualified_medical_expenses ?? 0) ||
      records.reduce(
          (sum, row) =>
            sum +
            (row.distribution_date >= age65
              ? row.gross_amount - row.qualified_medical_amount -
                (row.rollover_excluded_amount ?? 0)
              : 0),
          0,
        ) !== (excepted ?? 0)
    ) {
      throw new Error(
        "Form 8889 age-65 exception does not reconcile to dated taxable distributions",
      );
    }
  }
  if (disability) {
    if (input.hsa_excluded_distributions) {
      throw new Error(
        "Form 8889 disability exception with line 14b exclusions needs transaction allocation",
      );
    }
    const validDate = (value: string): boolean => {
      const date = new Date(`${value}T00:00:00.000Z`);
      return !Number.isNaN(date.valueOf()) &&
        date.toISOString().slice(0, 10) === value;
    };
    const records = disability.distributions;
    const forms = input.form1099_sa_distributions ?? [];
    const grossByForm = new Map<string, number>();
    for (const row of records) {
      grossByForm.set(
        row.form1099_sa_source_reference,
        (grossByForm.get(row.form1099_sa_source_reference) ?? 0) +
          row.gross_amount,
      );
    }
    if (
      !validDate(disability.disability_date) ||
      !forms.length ||
      new Set(records.map((row) => row.source_reference)).size !==
        records.length ||
      records.some((row) =>
        !validDate(row.distribution_date) ||
        row.distribution_date.slice(0, 4) !== String(taxYear) ||
        row.qualified_medical_amount > row.gross_amount
      ) ||
      forms.some((form) =>
        grossByForm.get(form.source_reference) !==
          form.box1_gross_distribution ||
        (form.box3_distribution_code === "3" &&
          records.some((row) =>
            row.form1099_sa_source_reference === form.source_reference &&
            row.distribution_date < disability.disability_date
          ))
      ) ||
      grossByForm.size !== forms.length ||
      records.reduce((sum, row) => sum + row.qualified_medical_amount, 0) !==
        (input.qualified_medical_expenses ?? 0) ||
      records.reduce(
          (sum, row) =>
            sum +
            (row.distribution_date >= disability.disability_date
              ? row.gross_amount - row.qualified_medical_amount
              : 0),
          0,
        ) !== excepted
    ) {
      throw new Error(
        "Form 8889 disability exception does not reconcile to dated Form 1099-SA distributions",
      );
    }
  }
  return (taxable - (excepted ?? 0)) * NON_QUALIFIED_PENALTY_RATE;
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
  owner: TS,
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
    owner_entries: [{
      owner,
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
    }],
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

  private computeOne(
    ctx: NodeContext,
    rawInput: Form8889Input,
    owner: TS,
    pairedPriorYear = false,
    soleFamilyLimit = 0,
  ): NodeResult {
    const cfg = CONFIG_BY_YEAR[ctx.taxYear];
    if (!cfg) throw new Error(`No f1040 config for year ${ctx.taxYear}`);
    const input = beneficiaryInputSchema.parse(rawInput);
    const medicareMonth = input.medicare_enrollment?.first_ineligible_month;
    if (
      medicareMonth !== undefined &&
      (input.eligible_hdhp_coverage_by_month === undefined ||
        input.eligible_hdhp_coverage_by_month.some((month, index) =>
          index < medicareMonth - 1 ? month === null : month !== null
        ))
    ) {
      throw new Error(
        "Form 8889 Medicare onset must match the twelve monthly eligibility facts",
      );
    }
    const otherCoverageMonth = input.other_disqualifying_coverage
      ?.first_ineligible_month;
    if (
      otherCoverageMonth !== undefined &&
      (medicareMonth !== undefined ||
        !input.eligible_hdhp_coverage_by_month?.every((month, index) =>
          index < otherCoverageMonth - 1
            ? month === CoverageType.Family
            : month === null
        ))
    ) {
      throw new Error(
        "Form 8889 other disqualifying coverage onset must match family-to-ineligible monthly facts without Medicare overlap",
      );
    }
    verifyDistributionSources(input, ctx.taxYear);
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
        soleFamilyLimit,
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
    const returnedPersonal = input.hsa_excluded_distributions
      ?.timely_excess_withdrawal;
    if (
      returnedPersonal && (
        employer !== 0 || fundingAmount !== 0 ||
        input.prior_year_hsa_excess !== undefined ||
        input.post_year_personal_excess_withdrawal !== undefined ||
        returnedPersonal.amount_including_earnings -
              returnedPersonal.included_earnings !==
          Math.max(
            0,
            (input.taxpayer_hsa_contributions ?? 0) - currentDeduction,
          )
      )
    ) {
      throw new Error(
        "Form 8889 code-2 route needs the full current-year personal excess returned without other contribution events",
      );
    }
    const line42 = hasPriorYearExcess
      ? input.prior_year_hsa_excess!.form5329_line48
      : 0;
    const line43 = Math.max(
      0,
      line12 - (input.taxpayer_hsa_contributions ?? 0),
    );
    const line14b = excludedDistributions(input, ctx.taxYear);
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
    const penalty = nonQualifiedPenalty(input, taxable, ctx.taxYear);
    const failure = input.testing_period_failure;
    const lastMonthIncome = lastMonthRuleIncome(input, pairedPriorYear);
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
      ...excessOutput(input, line12, taxable, excess, owner),
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

  compute(ctx: NodeContext, rawInput: Form8889ReturnInput): NodeResult {
    const input = inputSchema.parse(rawInput);
    const {
      spouse_hsa: spouse,
      prior_year_paired_family_allocation: priorAllocation,
      w2_code_w_entries: codeW = [],
      ...primary
    } = input;
    if ((primary.spouse_has_separate_hsa === true) !== (spouse !== undefined)) {
      throw new Error(
        "Form 8889 separate spouse HSA answer must match the two beneficiary sources",
      );
    }
    const normalizeSsn = (ssn: string) => ssn.replaceAll("-", "");
    const ownerIds = new Set([
      normalizeSsn(primary.beneficiary_identity.ssn),
      ...(spouse ? [normalizeSsn(spouse.beneficiary_identity.ssn)] : []),
    ]);
    if (
      ownerIds.size !== (spouse ? 2 : 1) ||
      codeW.some((entry) => !ownerIds.has(normalizeSsn(entry.employee_ssn)))
    ) {
      throw new Error(
        "Form 8889 W-2 code W must identify exactly one filed HSA beneficiary",
      );
    }
    const withEmployer = (owner: Form8889Input): Form8889Input => {
      const sourceAmount = codeW.filter((entry) =>
        normalizeSsn(entry.employee_ssn) ===
          normalizeSsn(owner.beneficiary_identity.ssn)
      ).reduce((sum, entry) => sum + entry.amount, 0);
      if (sourceAmount > 0 && owner.employer_hsa_contributions !== undefined) {
        throw new Error(
          "Form 8889 owner has duplicate direct and W-2 code W employer contribution sources",
        );
      }
      return sourceAmount > 0
        ? { ...owner, employer_hsa_contributions: sourceAmount }
        : owner;
    };
    if (!spouse) {
      if (primary.other_disqualifying_coverage !== undefined) {
        throw new Error(
          "Form 8889 other disqualifying coverage route requires both spouse HSA sources",
        );
      }
      if (priorAllocation) {
        throw new Error(
          "Form 8889 paired prior-year family allocation requires both HSA beneficiaries",
        );
      }
      if (
        primary.allocated_family_limit !== undefined ||
        primary.family_allocation_source_reference !== undefined
      ) {
        throw new Error(
          "Form 8889 family allocation requires both spouse HSA sources",
        );
      }
      const owner = primary.beneficiary_identity.owner;
      const single = this.computeOne(ctx, withEmployer(primary), owner);
      const printed = single.outputs.find((item) =>
        item.nodeType === this.nodeType
      );
      return {
        outputs: [
          ...single.outputs.filter((item) => item.nodeType !== this.nodeType),
          ...(printed
            ? [{
              nodeType: this.nodeType,
              fields: {
                forms: [{
                  owner: owner === TS.T ? "primary" : "spouse",
                  beneficiary_name: primary.beneficiary_identity.name,
                  beneficiary_ssn: normalizeSsn(
                    primary.beneficiary_identity.ssn,
                  ),
                  ...printed.fields,
                }],
              },
            }]
            : []),
        ],
      };
    }
    const cfg = CONFIG_BY_YEAR[ctx.taxYear];
    if (!cfg) throw new Error(`No f1040 config for year ${ctx.taxYear}`);
    const paired = [primary, spouse];
    const priorFailures = paired.map((owner) =>
      owner.testing_period_failure?.last_month_rule_evidence
    );
    const pairedPriorRecapture = priorFailures.some((evidence) =>
      evidence?.spouse_has_separate_hsa === true
    );
    if (pairedPriorRecapture || priorAllocation) {
      const [taxpayer, spouseEvidence] = priorFailures;
      const [taxpayerFailure, spouseFailure] = paired.map((owner) =>
        owner.testing_period_failure
      );
      if (
        !priorAllocation || !taxpayer || !spouseEvidence ||
        taxpayer.spouse_has_separate_hsa !== true ||
        spouseEvidence.spouse_has_separate_hsa !== true ||
        taxpayerFailure?.prior_year_source !==
          priorAllocation.primary_filed_form8889_source_reference ||
        spouseFailure?.prior_year_source !==
          priorAllocation.spouse_filed_form8889_source_reference ||
        priorAllocation.primary_filed_form8889_source_reference ===
          priorAllocation.spouse_filed_form8889_source_reference ||
        (taxpayer.filed_form8889_line6 ?? 0) +
              (spouseEvidence.filed_form8889_line6 ?? 0) !== 8_300
      ) {
        throw new Error(
          "Form 8889 paired 2024 last-month-rule recapture needs both distinct filed owner forms and the sourced family allocation",
        );
      }
    }
    if (
      primary.beneficiary_identity.owner !== TS.T ||
      spouse.beneficiary_identity.owner !== TS.S
    ) {
      throw new Error(
        "Form 8889 paired HSA sources need taxpayer then spouse owner identities",
      );
    }
    const primaryCoverage = primary.eligible_hdhp_coverage_by_month;
    const spouseCoverage = spouse.eligible_hdhp_coverage_by_month;
    const familyMonths =
      primaryCoverage?.filter((month) => month === CoverageType.Family)
        .length ?? 0;
    const sharedFamilyLimit = Math.round(
      cfg.hsaFamilyLimit * familyMonths / 12,
    );
    // With no family HDHP month, each spouse has an independent self-only
    // limit. Ineligible months contribute zero to that owner's worksheet.
    const separateSelfOnlyMonths = paired.every((owner) =>
      owner.married_at_year_end === true &&
      owner.spouse_has_separate_hsa === true &&
      owner.last_month_rule_elected === false &&
      owner.eligible_hdhp_coverage_by_month?.length === 12 &&
      owner.eligible_hdhp_coverage_by_month.includes(CoverageType.SelfOnly) &&
      owner.eligible_hdhp_coverage_by_month.every((month) =>
        month === CoverageType.SelfOnly || month === null
      ) &&
      owner.allocated_family_limit === undefined &&
      owner.family_allocation_source_reference === undefined &&
      (owner.archer_msa_distributions ?? 0) === 0
    );
    const matchingFamilyAllocation = familyMonths > 0 &&
      !paired.some((owner) => {
        const coverage = owner.eligible_hdhp_coverage_by_month;
        return owner.married_at_year_end !== true ||
          owner.spouse_has_separate_hsa !== true ||
          owner.last_month_rule_elected !== false ||
          owner.other_disqualifying_coverage !== undefined ||
          coverage === undefined || coverage.length !== 12 ||
          coverage.some((month, index) =>
            (month !== CoverageType.Family && month !== null) ||
            month !== primaryCoverage?.[index]
          ) ||
          owner.allocated_family_limit === undefined ||
          !owner.family_allocation_source_reference ||
          (owner.archer_msa_distributions ?? 0) > 0;
      }) && primary.family_allocation_source_reference ===
        spouse.family_allocation_source_reference &&
      (primary.allocated_family_limit ?? 0) +
            (spouse.allocated_family_limit ?? 0) === sharedFamilyLimit;
    const medicareOwnerIndex = paired.findIndex((owner) =>
      owner.medicare_enrollment !== undefined
    );
    const medicareOwner = paired[medicareOwnerIndex];
    const continuingOwner = paired[1 - medicareOwnerIndex];
    const medicareMonth = medicareOwner?.medicare_enrollment
      ?.first_ineligible_month;
    const sharedMedicareMonths = medicareMonth === undefined
      ? 0
      : medicareMonth - 1;
    const medicareSharedLimit = Math.round(
      cfg.hsaFamilyLimit * sharedMedicareMonths / 12,
    );
    // The Medicare-enrolled owner has zero limit from the first ineligible
    // month. The continuing family-covered owner retains the remaining months.
    const oneMedicareSpouse = medicareOwnerIndex >= 0 &&
      paired.filter((owner) => owner.medicare_enrollment).length === 1 &&
      medicareOwner?.eligible_hdhp_coverage_by_month?.every((month, index) =>
          index < sharedMedicareMonths
            ? month === CoverageType.Family
            : month === null
        ) === true &&
      continuingOwner?.eligible_hdhp_coverage_by_month?.every((month) =>
          month === CoverageType.Family
        ) === true &&
      paired.every((owner) =>
        owner.married_at_year_end === true &&
        owner.spouse_has_separate_hsa === true &&
        owner.last_month_rule_elected === false &&
        owner.allocated_family_limit !== undefined &&
        !!owner.family_allocation_source_reference &&
        (owner.archer_msa_distributions ?? 0) === 0 &&
        owner.testing_period_failure === undefined
      ) &&
      primary.family_allocation_source_reference ===
        spouse.family_allocation_source_reference &&
      (primary.allocated_family_limit ?? 0) +
            (spouse.allocated_family_limit ?? 0) === medicareSharedLimit;
    const otherCoverageOwnerIndex = paired.findIndex((owner) =>
      owner.other_disqualifying_coverage !== undefined
    );
    const otherCoverageOwner = paired[otherCoverageOwnerIndex];
    const otherCoverageMonth = otherCoverageOwner
      ?.other_disqualifying_coverage?.first_ineligible_month;
    const otherCoverageSharedMonths = otherCoverageMonth === undefined
      ? 0
      : otherCoverageMonth - 1;
    const otherCoverageSharedLimit = Math.round(
      cfg.hsaFamilyLimit * otherCoverageSharedMonths / 12,
    );
    const oneOtherCoverageSpouse = otherCoverageOwnerIndex >= 0 &&
      paired.filter((owner) => owner.other_disqualifying_coverage).length ===
        1 &&
      paired.every((owner) => owner.medicare_enrollment === undefined) &&
      otherCoverageOwner?.eligible_hdhp_coverage_by_month?.every(
          (month, index) =>
            index < otherCoverageSharedMonths
              ? month === CoverageType.Family
              : month === null,
        ) === true &&
      paired[1 - otherCoverageOwnerIndex]
          ?.eligible_hdhp_coverage_by_month?.every((month) =>
            month === CoverageType.Family
          ) === true &&
      paired.every((owner) =>
        owner.married_at_year_end === true &&
        owner.spouse_has_separate_hsa === true &&
        owner.last_month_rule_elected === false &&
        owner.allocated_family_limit !== undefined &&
        !!owner.family_allocation_source_reference &&
        (owner.archer_msa_distributions ?? 0) === 0 &&
        owner.testing_period_failure === undefined
      ) &&
      primary.family_allocation_source_reference ===
        spouse.family_allocation_source_reference &&
      (primary.allocated_family_limit ?? 0) +
            (spouse.allocated_family_limit ?? 0) === otherCoverageSharedLimit;
    const bothEligibleAllYear = paired.every((owner) =>
      owner.eligible_hdhp_coverage_by_month?.length === 12 &&
      owner.eligible_hdhp_coverage_by_month.every((month) =>
        month === CoverageType.Family || month === CoverageType.SelfOnly
      )
    );
    // In a month when both spouses are eligible, either spouse's family HDHP
    // makes both owners family-covered for Form 8889 lines 1, 3, and 6.
    const deemedCoverage = bothEligibleAllYear
      ? primaryCoverage!.map((month, index) =>
        month === CoverageType.Family ||
          spouseCoverage?.[index] === CoverageType.Family
          ? CoverageType.Family
          : CoverageType.SelfOnly
      )
      : [];
    const deemedFamilyMonths =
      deemedCoverage.filter((month) => month === CoverageType.Family).length;
    const fullYearDeemedAllocation = deemedFamilyMonths > 0 &&
      bothEligibleAllYear &&
      !paired.some((owner) => {
        return owner.married_at_year_end !== true ||
          owner.spouse_has_separate_hsa !== true ||
          owner.last_month_rule_elected !== false ||
          owner.allocated_family_limit === undefined ||
          !owner.family_allocation_source_reference ||
          (owner.archer_msa_distributions ?? 0) > 0;
      }) && primary.family_allocation_source_reference ===
        spouse.family_allocation_source_reference &&
      (primary.allocated_family_limit ?? 0) +
            (spouse.allocated_family_limit ?? 0) ===
        Math.round(cfg.hsaFamilyLimit * deemedFamilyMonths / 12);
    if (medicareOwnerIndex >= 0 && !oneMedicareSpouse) {
      throw new Error(
        "Form 8889 Medicare enrollment needs one sourced onset and the continuing spouse's full-year family coverage",
      );
    }
    if (otherCoverageOwnerIndex >= 0 && !oneOtherCoverageSpouse) {
      throw new Error(
        "Form 8889 other disqualifying coverage needs one sourced onset and the continuing spouse's full-year family coverage",
      );
    }
    if (
      !separateSelfOnlyMonths && !matchingFamilyAllocation &&
      !fullYearDeemedAllocation && !oneMedicareSpouse &&
      !oneOtherCoverageSpouse
    ) {
      throw new Error(
        "Form 8889 two-spouse filing needs matching monthly family eligibility, sourced deemed-family months, or sourced one-spouse ineligibility allocation",
      );
    }
    const ownedAccounts = paired.map((owner) =>
      withEmployer(
        fullYearDeemedAllocation
          ? { ...owner, eligible_hdhp_coverage_by_month: deemedCoverage }
          : owner,
      )
    );
    const results = ownedAccounts.map((owner, index) =>
      this.computeOne(
        ctx,
        owner,
        index === 0 ? TS.T : TS.S,
        pairedPriorRecapture,
        oneMedicareSpouse && index !== medicareOwnerIndex
          ? cfg.hsaFamilyLimit - medicareSharedLimit
          : oneOtherCoverageSpouse && index !== otherCoverageOwnerIndex
          ? cfg.hsaFamilyLimit - otherCoverageSharedLimit
          : 0,
      )
    );
    const forms = results.map((result, index) => {
      const printed = result.outputs.find((item) =>
        item.nodeType === this.nodeType
      );
      if (!printed) {
        throw new Error(
          "Form 8889 two-spouse HSA filing needs a computed form for each beneficiary",
        );
      }
      const owner = paired[index];
      return {
        owner: index === 0 ? "primary" : "spouse",
        beneficiary_name: owner.beneficiary_identity.name,
        beneficiary_ssn: normalizeSsn(owner.beneficiary_identity.ssn),
        ...printed.fields,
      };
    });
    const downstream = results.flatMap((result) =>
      result.outputs.filter((row) => row.nodeType !== this.nodeType)
    );
    if (
      downstream.some((row) =>
        row.nodeType !== schedule1.nodeType &&
        row.nodeType !== agi_aggregator.nodeType &&
        row.nodeType !== schedule2.nodeType &&
        row.nodeType !== form5329.nodeType
      )
    ) {
      throw new Error(
        "Form 8889 two-spouse route has an unsupported owner-level output",
      );
    }
    const supportedDownstreamFields = new Map([
      [
        schedule1.nodeType,
        new Set([
          "line13_hsa_deduction",
          "line8f_hsa_income",
          "line8z_hsa_excess_earnings",
          "line8z_hsa_excess_employer",
        ]),
      ],
      [
        agi_aggregator.nodeType,
        new Set([
          "line13_hsa_deduction",
          "line8f_hsa_income",
          "line8z_hsa_excess_earnings",
          "line8z_hsa_excess_employer",
        ]),
      ],
      [
        schedule2.nodeType,
        new Set([
          "line17c_hsa_penalty",
          "line17d_hsa_eligibility_tax",
        ]),
      ],
      [form5329.nodeType, new Set(["owner_entries"])],
    ]);
    for (const row of downstream) {
      const allowed = supportedDownstreamFields.get(row.nodeType);
      if (
        !allowed || Object.keys(row.fields).some((key) => !allowed.has(key))
      ) {
        throw new Error(
          "Form 8889 two-spouse route cannot combine an unreviewed owner field",
        );
      }
    }
    const sumField = (nodeType: string, key: string): number =>
      downstream.filter((row) => row.nodeType === nodeType).reduce(
        (total, row) => {
          const value = row.fields[key];
          if (value === undefined) return total;
          if (typeof value !== "number" || !Number.isFinite(value)) {
            throw new Error(
              `Form 8889 two-spouse ${nodeType}.${key} cannot be combined safely`,
            );
          }
          return total + value;
        },
        0,
      );
    const deduction = sumField(schedule1.nodeType, "line13_hsa_deduction");
    const taxableIncome = sumField(schedule1.nodeType, "line8f_hsa_income");
    const withdrawalEarnings = sumField(
      schedule1.nodeType,
      "line8z_hsa_excess_earnings",
    );
    const employerExcessIncome = sumField(
      schedule1.nodeType,
      "line8z_hsa_excess_employer",
    );
    const penalty = sumField(schedule2.nodeType, "line17c_hsa_penalty");
    const eligibilityTax = sumField(
      schedule2.nodeType,
      "line17d_hsa_eligibility_tax",
    );
    if (
      sumField(agi_aggregator.nodeType, "line13_hsa_deduction") !== deduction ||
      sumField(agi_aggregator.nodeType, "line8f_hsa_income") !==
        taxableIncome ||
      sumField(agi_aggregator.nodeType, "line8z_hsa_excess_earnings") !==
        withdrawalEarnings ||
      sumField(agi_aggregator.nodeType, "line8z_hsa_excess_employer") !==
        employerExcessIncome
    ) {
      throw new Error(
        "Form 8889 two-spouse Schedule 1 and AGI totals do not reconcile",
      );
    }
    const schedule1Fields = {
      ...(deduction > 0 ? { line13_hsa_deduction: deduction } : {}),
      ...(taxableIncome > 0 ? { line8f_hsa_income: taxableIncome } : {}),
      ...(withdrawalEarnings > 0
        ? { line8z_hsa_excess_earnings: withdrawalEarnings }
        : {}),
      ...(employerExcessIncome > 0
        ? { line8z_hsa_excess_employer: employerExcessIncome }
        : {}),
    };
    const schedule2Fields = {
      ...(penalty > 0 ? { line17c_hsa_penalty: penalty } : {}),
      ...(eligibilityTax > 0
        ? { line17d_hsa_eligibility_tax: eligibilityTax }
        : {}),
    };
    return {
      outputs: [
        ...(Object.keys(schedule1Fields).length > 0
          ? [{
            nodeType: schedule1.nodeType,
            fields: schedule1.inputSchema.parse(schedule1Fields),
          }, {
            nodeType: agi_aggregator.nodeType,
            fields: agi_aggregator.inputSchema.parse(schedule1Fields),
          }]
          : []),
        ...(Object.keys(schedule2Fields).length > 0
          ? [{
            nodeType: schedule2.nodeType,
            fields: schedule2.inputSchema.parse(schedule2Fields),
          }]
          : []),
        ...downstream.filter((row) => row.nodeType === form5329.nodeType),
        { nodeType: this.nodeType, fields: { forms } },
      ],
    };
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const form8889 = new Form8889Node();

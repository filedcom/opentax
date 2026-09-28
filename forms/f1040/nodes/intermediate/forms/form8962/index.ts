import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../../core/types/tax-node.ts";
import { output, TaxNode } from "../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../core/types/output-nodes.ts";
import { schedule3 } from "../../aggregation/schedule3/index.ts";
import { schedule2 } from "../../aggregation/schedule2/index.ts";
import { form6251 } from "../form6251/index.ts";
import { FilingStatus, filingStatusSchema } from "../../../types.ts";
import type { NodeContext } from "../../../../../../core/types/node-context.ts";
import { CONFIG_BY_YEAR } from "../../../config/index.ts";
import type { F1040Config } from "../../../config/index.ts";
import { attributableSpecifiedPtc } from "../form7206/pub974_attribution.ts";

// 2025 Form 8962 instructions, Table 2: line 5 is an integer percentage.
// Through 150% FPL the applicable figure is zero; it rises by 0.0004 per
// percentage point through 300%, then by 0.00025 to 8.5% at 400%.

// IRC §36B(f)(2)(B): APTC repayment caps by household income as % of FPL
// Table 5 has a Single column and one column for every other filing status.
// Above 400% FPL (TY2025): no cap — ARP extension means 400%+ still eligible,
//   so full excess APTC is repaid with no limit
type RepaymentCapTier = {
  readonly maxPct: number; // income pct upper bound (exclusive)
  readonly singleCap: number;
  readonly otherCap: number;
};

const REPAYMENT_CAP_TIERS: readonly RepaymentCapTier[] = [
  { maxPct: 200, singleCap: 375, otherCap: 750 },
  { maxPct: 300, singleCap: 975, otherCap: 1_950 },
  { maxPct: 400, singleCap: 1_625, otherCap: 3_250 },
];

const MONTH_CODES = [
  "JANUARY",
  "FEBRUARY",
  "MARCH",
  "APRIL",
  "MAY",
  "JUNE",
  "JULY",
  "AUGUST",
  "SEPTEMBER",
  "OCTOBER",
  "NOVEMBER",
  "DECEMBER",
] as const;

// ─── Schema ───────────────────────────────────────────────────────────────────

export const below100FplStatusSchema = z.discriminatedUnion("basis", [
  z.object({
    basis: z.literal("marketplace_estimate"),
    no_one_can_claim_taxpayer: z.literal(true),
    marketplace_coverage: z.literal(true),
    marketplace_estimated_at_least_100_fpl: z.literal(true),
    marketplace_information_provided_in_good_faith: z.literal(true),
    otherwise_applicable_taxpayer: z.literal(true),
  }).strict(),
  z.object({
    basis: z.literal("lawfully_present"),
    no_one_can_claim_taxpayer: z.literal(true),
    marketplace_coverage: z.literal(true),
    enrolled_individual_lawfully_present: z.literal(true),
    medicaid_ineligible_due_to_immigration_status: z.literal(true),
    otherwise_applicable_taxpayer: z.literal(true),
  }).strict(),
  z.object({
    basis: z.literal("not_applicable"),
    exception_routes_reviewed: z.literal(true),
    no_one_can_claim_taxpayer: z.literal(true),
    all_covered_individuals_lawfully_present: z.literal(true),
    no_shared_policy: z.literal(true),
    no_self_employed_health_insurance_deduction: z.literal(true),
    no_alternative_marriage_calculation: z.literal(true),
  }).strict(),
]);

const mfsExceptionFactsSchema = z.object({
  living_apart_at_filing: z.literal(true),
  unable_to_file_joint_due_to_exception: z.literal(true),
  prior_consecutive_exception_years: z.number().int().min(0).max(2),
  no_one_can_claim_taxpayer: z.literal(true),
  policy_scope: z.enum(["family_only", "shared_with_spouse"]),
});

export const mfsPtcStatusSchema = z.discriminatedUnion("basis", [
  mfsExceptionFactsSchema.extend({ basis: z.literal("domestic_abuse") })
    .strict(),
  mfsExceptionFactsSchema.extend({ basis: z.literal("spousal_abandonment") })
    .strict(),
  z.object({
    basis: z.literal("no_exception"),
    exception_reviewed: z.literal(true),
    no_one_can_claim_taxpayer: z.literal(true),
    policy_scope: z.enum(["family_only", "shared_with_spouse"]),
    all_covered_individuals_lawfully_present: z.literal(true),
    no_self_employed_health_insurance_deduction: z.literal(true),
  }).strict(),
]);

export const allocationPctSchema = z.number().min(0).max(1).refine(
  (pct) => Math.abs(pct * 100 - Math.round(pct * 100)) < 1e-9,
  "Allocation percentage must have at most two decimal places",
);

export const sharedPolicyAllocationSchema = z.object({
  basis: z.enum([
    "mfs_exception",
    "mfs_no_exception",
    "divorce_agreed",
    "divorce_no_agreement",
    "other_agreed",
    "other_no_agreement",
    "no_aptc",
  ]),
  policy_number: z.string().regex(/^[A-Za-z0-9 \-:_]{1,15}$/),
  other_taxpayer_ssn: z.string().regex(/^\d{9}$/),
  start_month: z.number().int().min(1).max(12),
  end_month: z.number().int().min(1).max(12),
  premium_pct: allocationPctSchema.optional(),
  slcsp_pct: allocationPctSchema.optional(),
  aptc_pct: allocationPctSchema.optional(),
}).strict();

const alternativeMarriageCoverageSchema = z.object({
  family_size: z.number().int().positive(),
  // Exact 1095-A policy identities for the spouse's pre-marriage worksheet.
  policy_numbers: z.array(z.string().trim().min(1)).min(1),
}).strict();

export const alternativeMarriagePolicySchema = z.object({
  policy_number: z.string().trim().min(1),
  owner: z.enum(["primary", "spouse"]),
  coverage_state: z.string().regex(/^[A-Z]{2}$/).optional(),
  // Source Form 1095-A monthly columns after applicable SLCSP correction
  // and any Part IV allocation; not taxpayer-entered worksheet amounts.
  monthly_premiums: z.array(z.number().nonnegative()).length(12),
  monthly_slcsps: z.array(z.number().nonnegative()).length(12),
  monthly_aptcs: z.array(z.number().nonnegative()).length(12),
}).strict();

export const alternativeMarriageSchema = z.object({
  both_unmarried_january_1: z.literal(true),
  married_december_31: z.literal(true),
  alternative_family_sizes_verified: z.literal(true),
  marriage_month: z.number().int().min(1).max(12),
  primary: alternativeMarriageCoverageSchema.optional(),
  spouse: alternativeMarriageCoverageSchema.optional(),
}).strict();

export const inputSchema = z.object({
  // Household size for FPL calculation
  household_size: z.number().int().positive().optional(),
  fpl_region: z.enum(["contiguous", "alaska", "hawaii"]).optional(),

  // Form 8962 lines 2a, 2b, and 3 are distinct amounts.
  taxpayer_modified_agi: z.number().optional(),
  dependents_modified_agi: z.number().optional(),
  form8814_expected_ssns: z.array(z.string()).optional(),
  form8814_children: z.array(z.object({
    ssn: z.string().regex(/^\d{9}$/),
    magi: z.number().nonnegative(),
  })).optional(),
  dependent_income_complete: z.boolean().optional(),
  below_100_fpl_status: below100FplStatusSchema.optional(),
  mfs_ptc_status: mfsPtcStatusSchema.optional(),
  shared_policy_allocations: z.array(sharedPolicyAllocationSchema).max(99)
    .optional(),
  alternative_marriage: alternativeMarriageSchema.optional(),
  alternative_marriage_policies: z.array(alternativeMarriagePolicySchema).min(1)
    .optional(),
  alternative_marriage_source_month: z.number().int().min(1).max(12)
    .optional(),

  // Annual totals (used when no monthly detail provided)
  annual_premium: z.number().nonnegative().optional(),
  annual_slcsp: z.number().nonnegative().optional(),
  annual_aptc: z.number().nonnegative().optional(),
  // Form 8962 line 10: derived from twelve full-year, unchanged monthly rows.
  annual_line11_eligible: z.boolean().optional(),

  // Monthly detail arrays (12 elements each, indexed 0=Jan … 11=Dec)
  monthly_premiums: z.array(z.number().nonnegative()).length(12).optional(),
  monthly_slcsps: z.array(z.number().nonnegative()).length(12).optional(),
  monthly_aptcs: z.array(z.number().nonnegative()).length(12).optional(),
  pub974_form1095a_policy_months: z.array(
    z.object({
      form1095a_policy_number: z.string().min(1),
      month: z.number().int().min(1).max(12),
      premium: z.number().nonnegative(),
      aptc: z.number().nonnegative(),
    }).strict(),
  ).optional(),
  pub974_income_audit: z.object({
    schedule1_line3_schedule_c: z.number().finite(),
    form1040_line9_total_income: z.number().finite(),
    form1040_line2a_tax_exempt_interest: z.number().nonnegative(),
    form1040_nontaxable_social_security: z.number().nonnegative(),
    form2555_lines45_and_50: z.number().nonnegative(),
    schedule1_adjustments_except_line17: z.number().finite(),
    schedule1_line15_se_tax_deduction: z.number().nonnegative(),
    schedule1_line16_retirement_deduction: z.number().nonnegative(),
    schedule1_line17_se_health_insurance: z.number().nonnegative(),
    unsupported_adjustments_present: z.boolean(),
  }).strict().optional(),
  // Internal reconciliation from the graph-safe Pub. 974 deduction route.
  // The ordinary 1095-A and AGI graph must reproduce its policy facts/PTC.
  pub974_reconciliation: z.object({
    monthly_premiums: z.array(z.number().nonnegative()).length(12),
    monthly_slcsps: z.array(z.number().nonnegative()).length(12),
    monthly_aptcs: z.array(z.number().nonnegative()).length(12),
    specified_policy_months: z.array(
      z.object({
        form1095a_policy_number: z.string().min(1),
        month: z.number().int().min(1).max(12),
        specified_premium: z.number().nonnegative(),
        attributable_aptc: z.number().nonnegative(),
      }).strict(),
    ).min(1),
    form1095a_policy_months: z.array(z.object({
      form1095a_policy_number: z.string().trim().min(1),
      month: z.number().int().min(1).max(12),
      premium: z.number().positive(),
      aptc: z.number().nonnegative(),
    }).strict()).min(1).max(12),
    worksheet_x_source: z.object({
      form1040_line9_total_income: z.number().finite(),
      form1040_line2a_tax_exempt_interest: z.number().nonnegative(),
      form1040_nontaxable_social_security: z.number().nonnegative(),
      form2555_lines45_and_50: z.number().nonnegative(),
      schedule1_adjustments_except_line17: z.number().nonnegative(),
    }).strict(),
    worksheet_w_line15_se_tax_deduction: z.number().nonnegative().optional(),
    worksheet_w_line16_retirement_deduction: z.number().nonnegative()
      .optional(),
    worksheet_w_business_earned_income: z.number().nonnegative(),
    schedule1_line17_final_deduction: z.number().nonnegative(),
    taxpayer_modified_agi: z.number().finite(),
    dependents_modified_agi: z.number().finite(),
    household_size: z.number().int().positive(),
    fpl_region: z.enum(["contiguous", "alaska", "hawaii"]),
    filing_status: filingStatusSchema,
    total_premium_tax_credit: z.number().nonnegative(),
    specified_premiums: z.number().nonnegative(),
    attributable_specified_ptc: z.number().nonnegative(),
    specified_deduction: z.number().nonnegative(),
  }).strict().optional(),

  // Box 12 code FF or the QSEHRA source gives the annual permitted benefit.
  // Monthly notice facts are needed separately for Pub. 974 Worksheets N/Q.
  qsehra_amount_offered: z.number().nonnegative().optional(),
  qsehra_w2_reported_benefit: z.number().nonnegative().optional(),
  qsehra_monthly_facts: z.array(
    z.object({
      self_only_slcsp: z.number().nonnegative(),
      self_only_permitted_benefit: z.number().nonnegative(),
      permitted_benefit: z.number().nonnegative(),
    }).strict().nullable(),
  ).length(12).optional(),

  // Filing status — Table 5 has a Single cap and a cap for every other status.
  filing_status: filingStatusSchema.optional(),
});

type Form8962Input = z.infer<typeof inputSchema>;

// ─── Pure Helpers ─────────────────────────────────────────────────────────────

function federalPovertyLevel(
  householdSize: number,
  region: NonNullable<Form8962Input["fpl_region"]>,
  cfg: F1040Config,
): number {
  const [base, increment] = region === "alaska"
    ? [18_810, 6_730]
    : region === "hawaii"
    ? [17_310, 6_190]
    : [cfg.fplBase, cfg.fplIncrement];
  return base + increment * (householdSize - 1);
}

function applicableContributionPct(incomeAsFplPct: number): number {
  const line5 = Math.floor(incomeAsFplPct);
  if (line5 <= 150) return 0;
  if (line5 <= 300) return ((line5 - 150) * 4) / 10_000;
  if (line5 < 400) {
    return Math.round(600 + (line5 - 300) * 2.5) / 10_000;
  }
  return 0.085;
}

function totalPremium(input: Form8962Input): number {
  if (input.monthly_premiums) {
    return input.monthly_premiums.reduce((sum, m) => sum + m, 0);
  }
  return input.annual_premium ?? 0;
}

function totalSlcsp(input: Form8962Input): number {
  if (input.monthly_slcsps) {
    return input.monthly_slcsps.reduce((sum, m) => sum + m, 0);
  }
  return input.annual_slcsp ?? 0;
}

function totalAptc(input: Form8962Input): number {
  if (input.monthly_aptcs) {
    return input.monthly_aptcs.reduce((sum, m) => sum + m, 0);
  }
  return input.annual_aptc ?? 0;
}

// Allowed PTC = min(enrollment premium, max(0, SLCSP - contribution)).
// IRS Form 8962 line 11: max premium assistance = SLCSP - required contribution;
// allowed = lesser of enrollment premium or max premium assistance (IRC §36B(b)(2)(A))
function allowedPtc(
  slcsp: number,
  actualPremium: number,
  applicable: number,
): number {
  return Math.min(actualPremium, Math.max(0, slcsp - applicable));
}

function qsehraMonthlyCredit(
  tentativeCredit: number,
  householdIncome: number,
  facts: NonNullable<Form8962Input["qsehra_monthly_facts"]>[number],
): number {
  if (facts === null) return tentativeCredit;
  // Pub. 974 Worksheet N, lines 4 and 8. Equality is affordable.
  const affordabilityThreshold = householdIncome * 0.0902 / 12;
  const employeeCost = facts.self_only_slcsp -
    facts.self_only_permitted_benefit;
  if (affordabilityThreshold >= employeeCost) return 0;
  // Worksheet Q, Part III, columns A-C.
  return Math.max(0, tentativeCredit - facts.permitted_benefit);
}

// Pub. 974 Worksheets N and Q. Form 8962 line 11 is one annual amount, even
// when the QSEHRA was available for only part of the year. Worksheet N removes
// the provided months if all are affordable; Worksheet Q Part II subtracts a
// uniform, unaffordable benefit; Part III handles mixed affordability/benefits.
function qsehraAnnualCredit(
  annualTentativeCredit: number,
  householdIncome: number,
  facts: NonNullable<Form8962Input["qsehra_monthly_facts"]>,
): number {
  const provided = facts.filter((month) => month !== null);
  const monthlyTentative = annualTentativeCredit / 12;
  const threshold = householdIncome * 0.0902 / 12;
  const isAffordable = (month: NonNullable<(typeof facts)[number]>) =>
    threshold >= month.self_only_slcsp - month.self_only_permitted_benefit;

  if (provided.every(isAffordable)) {
    // Worksheet N lines 10-13, including its all-year zero case.
    return annualTentativeCredit - monthlyTentative * provided.length;
  }
  const uniformBenefit = provided.every((month) =>
    month.permitted_benefit === provided[0].permitted_benefit
  );
  if (uniformBenefit && provided.every((month) => !isAffordable(month))) {
    // Worksheet Q Parts I-II; the non-QSEHRA months retain their PTC.
    return annualTentativeCredit -
      Math.min(provided[0].permitted_benefit, monthlyTentative) *
        provided.length;
  }
  // Worksheet Q Part III, lines 9-27. Column C covers provided months;
  // line 26 adds back the annual line-11 share for the other months.
  return provided.reduce(
    (sum, month) =>
      sum + qsehraMonthlyCredit(monthlyTentative, householdIncome, month),
    annualTentativeCredit - monthlyTentative * provided.length,
  );
}

// IRC §36B(f)(2)(B): cap on excess APTC repayment liability
// Returns null when no cap applies (income ≥ 400% FPL)
function repaymentCap(
  incomePct: number,
  status: FilingStatus | undefined,
): number | null {
  const isSingle = status === FilingStatus.Single;
  for (const tier of REPAYMENT_CAP_TIERS) {
    if (incomePct < tier.maxPct) {
      return isSingle ? tier.singleCap : tier.otherCap;
    }
  }
  return null; // ≥ 400% FPL — no cap
}

interface AlternativeMarriageGroup {
  family_size: number;
  monthly_contribution: number;
  start_month: number;
  end_month: number;
}

function alternativeMarriageCalculation(
  input: Form8962Input,
  income: number,
  cfg: F1040Config,
): {
  primary?: AlternativeMarriageGroup;
  spouse?: AlternativeMarriageGroup;
  coveredMonths: boolean[];
  contributions: number[];
  credits: number[];
} | undefined {
  const election = input.alternative_marriage;
  if (!election) return undefined;
  if (input.alternative_marriage_source_month !== election.marriage_month) {
    throw new Error(
      "Form 8962 marriage month must match the Form 1095-A source month",
    );
  }
  if (
    !input.monthly_premiums || !input.monthly_slcsps ||
    !input.monthly_aptcs
  ) {
    throw new Error(
      "Form 8962 marriage alternative requires monthly 1095-A columns",
    );
  }
  const sourcePolicies = input.alternative_marriage_policies ?? [];
  const byPolicyNumber = new Map(
    sourcePolicies.map((policy) => [policy.policy_number, policy]),
  );
  if (
    sourcePolicies.length === 0 ||
    byPolicyNumber.size !== sourcePolicies.length
  ) {
    throw new Error(
      "Form 8962 marriage alternative needs uniquely identified Form 1095-A policies",
    );
  }
  const selectedPolicies = new Set<string>();
  const resolveCoverage = (
    role: "primary" | "spouse",
    coverage: typeof election.primary,
  ) => {
    if (!coverage) return undefined;
    const policies = coverage.policy_numbers.map((number) => {
      const policy = byPolicyNumber.get(number);
      if (!policy || policy.owner !== role || selectedPolicies.has(number)) {
        throw new Error(
          "Form 8962 marriage policy number must identify one policy owned by the selected spouse",
        );
      }
      selectedPolicies.add(number);
      return policy;
    });
    const monthly_premiums = Array<number>(12).fill(0);
    const monthly_slcsps = Array<number>(12).fill(0);
    const monthly_aptcs = Array<number>(12).fill(0);
    for (let month = 0; month < election.marriage_month; month++) {
      const slcspByState = new Map<string, number>();
      for (const policy of policies) {
        monthly_premiums[month] += policy.monthly_premiums[month];
        monthly_aptcs[month] += policy.monthly_aptcs[month];
        const slcsp = policy.monthly_slcsps[month];
        if (slcsp <= 0) continue;
        if (policies.length > 1 && !policy.coverage_state) {
          throw new Error(
            "Form 8962 multiple marriage policies need coverage state for SLCSP",
          );
        }
        const state = policy.coverage_state ?? policy.policy_number;
        const prior = slcspByState.get(state);
        if (prior !== undefined && prior !== slcsp) {
          throw new Error(
            "Form 8962 same-state marriage policies disagree on SLCSP",
          );
        }
        slcspByState.set(state, slcsp);
      }
      monthly_slcsps[month] = [...slcspByState.values()].reduce(
        (sum, amount) => sum + amount,
        0,
      );
    }
    return {
      family_size: coverage.family_size,
      monthly_premiums,
      monthly_slcsps,
      monthly_aptcs,
    };
  };
  const primaryCoverage = resolveCoverage("primary", election.primary);
  const spouseCoverage = resolveCoverage("spouse", election.spouse);
  if (selectedPolicies.size !== sourcePolicies.length) {
    throw new Error(
      "Form 8962 marriage policies must all be assigned to a worksheet spouse",
    );
  }
  const groups = [primaryCoverage, spouseCoverage].filter((group) =>
    group !== undefined
  );
  if (groups.length === 0) {
    throw new Error(
      "Form 8962 marriage alternative needs pre-marriage coverage",
    );
  }
  if (
    groups.length === 2 &&
    groups[0].family_size + groups[1].family_size !== input.household_size
  ) {
    throw new Error(
      "Form 8962 alternative family sizes must total the tax family size",
    );
  }
  const coveredMonths = Array<boolean>(12).fill(false);
  const contributions = Array<number>(12).fill(0);
  const credits = Array<number>(12).fill(0);
  const halfIncome = Math.round(income / 2);
  const result: {
    primary?: AlternativeMarriageGroup;
    spouse?: AlternativeMarriageGroup;
    coveredMonths: boolean[];
    contributions: number[];
    credits: number[];
  } = { coveredMonths, contributions, credits };
  for (
    const [role, coverage] of [
      ["primary", primaryCoverage],
      ["spouse", spouseCoverage],
    ] as const
  ) {
    if (!coverage) continue;
    if (coverage.family_size >= input.household_size!) {
      throw new Error(
        "Form 8962 alternative family size must be smaller than the joint family",
      );
    }
    const coveredMonths = coverage.monthly_premiums.flatMap((premium, month) =>
      premium > 0 ? [month] : []
    );
    if (
      coveredMonths.length === 0 ||
      coveredMonths.at(-1)! >= election.marriage_month ||
      coverage.monthly_slcsps.some((slcsp, month) =>
        slcsp > 0 && coverage.monthly_premiums[month] === 0
      ) ||
      coveredMonths.some((month) => coverage.monthly_slcsps[month] === 0)
    ) {
      throw new Error(
        "Form 8962 marriage alternative needs covered pre-marriage months and their applicable SLCSP",
      );
    }
    const alternativeFpl = federalPovertyLevel(
      coverage.family_size,
      input.fpl_region!,
      cfg,
    );
    const alternativePct = halfIncome > 4 * alternativeFpl
      ? 401
      : Math.floor(halfIncome / alternativeFpl * 100);
    const contribution = Math.round(
      Math.round(
        halfIncome * applicableContributionPct(alternativePct),
      ) / 12,
    );
    result[role] = {
      family_size: coverage.family_size,
      monthly_contribution: contribution,
      start_month: coveredMonths[0] + 1,
      end_month: coveredMonths.at(-1)! + 1,
    };
    // Pub. 974 Worksheets II/IV run from start through stop, inclusive. A
    // temporary gap in enrollment still has the worksheet's column C amount;
    // its credit is zero because the enrollment premium is zero.
    for (
      let month = coveredMonths[0];
      month <= coveredMonths.at(-1)!;
      month++
    ) {
      contributions[month] += contribution;
    }
    for (const month of coveredMonths) {
      result.coveredMonths[month] = true;
      credits[month] += allowedPtc(
        coverage.monthly_slcsps[month],
        coverage.monthly_premiums[month],
        contribution,
      );
    }
  }
  for (let month = 0; month < election.marriage_month; month++) {
    const premium = groups.reduce(
      (sum, group) => sum + group.monthly_premiums[month],
      0,
    );
    const slcsp = groups.reduce(
      (sum, group) => sum + group.monthly_slcsps[month],
      0,
    );
    const aptc = groups.reduce(
      (sum, group) => sum + group.monthly_aptcs[month],
      0,
    );
    if (
      Math.abs(premium - input.monthly_premiums[month]) > 0.01 ||
      Math.abs(slcsp - input.monthly_slcsps[month]) > 0.01 ||
      Math.abs(aptc - input.monthly_aptcs[month]) > 0.01
    ) {
      throw new Error(
        "Form 8962 marriage worksheet amounts must reconcile to allocated monthly 1095-A columns",
      );
    }
  }
  return result;
}

function buildOutputs(
  line26: number,
  line29: number,
  formFields: Record<string, unknown>,
): NodeOutput[] {
  const outputs: NodeOutput[] = [];
  if (line26 > 0) {
    outputs.push(output(schedule3, { line9_premium_tax_credit: line26 }));
  }
  if (line29 > 0) {
    outputs.push(output(schedule2, { line1a_excess_advance_premium: line29 }));
    outputs.push(output(form6251, { schedule2_line1z_tax: line29 }));
  }
  outputs.push({ nodeType: "form8962", fields: formFields });
  return outputs;
}

function noForm8962Required(): NodeResult {
  // A self-output replaces source-only pending fields. Without it, a 1095-A
  // premium can be mistaken for a completed Form 8962 at export time.
  return {
    outputs: [{
      nodeType: "form8962",
      fields: { filing_required: false },
    }],
  };
}

interface Form8962BaseFields {
  household_size: number;
  taxpayer_modified_agi: number;
  dependents_modified_agi: number;
  household_income: number;
  federal_poverty_line: number;
  fpl_region: NonNullable<Form8962Input["fpl_region"]>;
  federal_poverty_pct: number;
}

function aptcOnlyRepayment(
  input: Form8962Input,
  aptc: number,
  baseFields: Form8962BaseFields,
): NodeResult {
  if (aptc === 0) return noForm8962Required();
  const monthlyAptc = input.monthly_aptcs;
  const monthly = monthlyAptc !== undefined &&
    input.annual_line11_eligible !== true;
  if (!monthly && input.annual_line11_eligible !== true) {
    throw new Error(
      "Form 8962 APTC-only annual line 11 needs verified full-year unchanged coverage or monthly APTC",
    );
  }
  const line25 = Math.round(aptc);
  const cap = repaymentCap(baseFields.federal_poverty_pct, input.filing_status);
  const line29 = cap === null ? line25 : Math.min(line25, cap);
  return {
    outputs: buildOutputs(0, line29, {
      ...baseFields,
      ...(input.shared_policy_allocations?.length
        ? { shared_policy_allocations: input.shared_policy_allocations }
        : {}),
      total_premium_tax_credit: 0,
      total_advance_ptc: line25,
      ...(monthlyAptc !== undefined &&
          input.annual_line11_eligible !== true
        ? {
          monthly_ptc_rows: monthlyAptc.map((amount, index) => ({
            month_code: MONTH_CODES[index],
            aptc: amount,
          })),
        }
        : { annual_aptc: aptc }),
      excess_advance_payment: line25,
      ...(cap !== null ? { repayment_limitation: cap } : {}),
      excess_advance_premium: line29,
    }),
  };
}

// ─── Node Class ───────────────────────────────────────────────────────────────

class Form8962Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "form8962";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule3, schedule2, form6251]);

  compute(ctx: NodeContext, rawInput: Form8962Input): NodeResult {
    const cfg = CONFIG_BY_YEAR[ctx.taxYear];
    if (!cfg) throw new Error(`No f1040 config for year ${ctx.taxYear}`);
    const input = inputSchema.parse(rawInput);

    if (
      input.alternative_marriage &&
      input.filing_status !== FilingStatus.MFJ
    ) {
      throw new Error("Form 8962 marriage alternative requires a joint return");
    }
    if (
      input.alternative_marriage &&
      input.below_100_fpl_status?.basis === "not_applicable"
    ) {
      throw new Error(
        "Form 8962 below-100% no-exception facts conflict with marriage alternative",
      );
    }

    const premium = totalPremium(input);
    const slcsp = totalSlcsp(input);
    const aptc = totalAptc(input);
    if (
      premium === 0 && slcsp === 0 && aptc === 0 &&
      !input.shared_policy_allocations?.length
    ) {
      return input.annual_premium !== undefined ||
          input.annual_slcsp !== undefined ||
          input.annual_aptc !== undefined ||
          input.monthly_premiums !== undefined ||
          input.monthly_slcsps !== undefined ||
          input.monthly_aptcs !== undefined
        ? noForm8962Required()
        : { outputs: [] };
    }
    if (
      input.taxpayer_modified_agi === undefined ||
      input.household_size === undefined ||
      input.fpl_region === undefined || input.filing_status === undefined
    ) {
      throw new Error(
        "Form 8962 requires taxpayer modified AGI, family size, FPL region, and filing status",
      );
    }
    if (input.dependent_income_complete !== true) {
      throw new Error(
        "Form 8962 needs verified dependent filing and modified-AGI facts",
      );
    }
    const pub974 = input.pub974_reconciliation;
    if (pub974) {
      const sameMonths = (actual: number[] | undefined, expected: number[]) =>
        actual?.length === 12 &&
        actual.every((value, index) =>
          Math.abs(value - expected[index]) < 0.01
        );
      const actualPolicyMonths = input.pub974_form1095a_policy_months ?? [];
      const expectedPolicyMonths = pub974.specified_policy_months;
      const allPolicyMonths = pub974.form1095a_policy_months;
      const coverageMonths = new Set(allPolicyMonths.map((row) => row.month));
      const expectedRows = new Map(allPolicyMonths.map((row) => [
        `${row.form1095a_policy_number}:${row.month}`,
        row,
      ]));
      const actualKeys = actualPolicyMonths.map((row) =>
        `${row.form1095a_policy_number}:${row.month}`
      );
      const policyMonthsMatch =
        coverageMonths.size === allPolicyMonths.length &&
        expectedRows.size === allPolicyMonths.length &&
        expectedPolicyMonths.every((row) => {
          const policy = expectedRows.get(`${row.form1095a_policy_number}:${row.month}`);
          return policy !== undefined &&
            Math.abs(policy.premium - row.specified_premium) < 0.01 &&
            Math.abs(policy.aptc - row.attributable_aptc) < 0.01;
        }) &&
        actualKeys.length === allPolicyMonths.length &&
        new Set(actualKeys).size === actualKeys.length &&
        actualPolicyMonths.every((row) => {
          const expected = expectedRows.get(
            `${row.form1095a_policy_number}:${row.month}`,
          );
          return expected !== undefined &&
            Math.abs(row.premium - expected.premium) < 0.01 &&
            Math.abs(row.aptc - expected.aptc) < 0.01;
        });
      const audit = input.pub974_income_audit;
      const xSource = pub974.worksheet_x_source;
      const incomeSourceMatches = audit !== undefined &&
        !audit.unsupported_adjustments_present &&
        Math.abs(
            audit.schedule1_line3_schedule_c -
              pub974.worksheet_w_business_earned_income,
          ) < 0.01 &&
        Math.abs(
            audit.form1040_line9_total_income -
              xSource.form1040_line9_total_income,
          ) < 0.01 &&
        Math.abs(
            audit.form1040_line2a_tax_exempt_interest -
              xSource.form1040_line2a_tax_exempt_interest,
          ) < 0.01 &&
        Math.abs(
            audit.form1040_nontaxable_social_security -
              xSource.form1040_nontaxable_social_security,
          ) < 0.01 &&
        Math.abs(
            audit.form2555_lines45_and_50 - xSource.form2555_lines45_and_50,
          ) < 0.01 &&
        Math.abs(
            audit.schedule1_adjustments_except_line17 -
              xSource.schedule1_adjustments_except_line17,
          ) < 0.01 &&
        Math.abs(
            audit.schedule1_line17_se_health_insurance -
              pub974.schedule1_line17_final_deduction,
          ) < 0.01 &&
        (pub974.worksheet_w_line15_se_tax_deduction === undefined ||
          Math.abs(
              audit.schedule1_line15_se_tax_deduction -
                pub974.worksheet_w_line15_se_tax_deduction,
            ) < 0.01) &&
        (pub974.worksheet_w_line16_retirement_deduction === undefined ||
          Math.abs(
              pub974.worksheet_w_line16_retirement_deduction -
                audit.schedule1_line16_retirement_deduction,
            ) < 0.01);
      if (
        !policyMonthsMatch || !incomeSourceMatches ||
        input.shared_policy_allocations?.length || input.alternative_marriage ||
        input.alternative_marriage_policies ||
        input.alternative_marriage_source_month !== undefined ||
        input.qsehra_monthly_facts ||
        input.qsehra_amount_offered !== undefined ||
        input.qsehra_w2_reported_benefit !== undefined ||
        input.below_100_fpl_status || input.form8814_children?.length ||
        input.form8814_expected_ssns?.length ||
        !sameMonths(input.monthly_premiums, pub974.monthly_premiums) ||
        !sameMonths(input.monthly_slcsps, pub974.monthly_slcsps) ||
        !sameMonths(input.monthly_aptcs, pub974.monthly_aptcs) ||
        Math.abs(input.taxpayer_modified_agi - pub974.taxpayer_modified_agi) >=
          1 ||
        (input.dependents_modified_agi ?? 0) !==
          pub974.dependents_modified_agi ||
        input.household_size !== pub974.household_size ||
        input.fpl_region !== pub974.fpl_region ||
        input.filing_status !== pub974.filing_status
      ) {
        throw new Error(
          "Form 8962 does not reconcile to Publication 974 source and final MAGI",
        );
      }
    }
    const taxpayerMagi = input.taxpayer_modified_agi;
    const expected8814 = input.form8814_expected_ssns ?? [];
    const reported8814 = input.form8814_children ?? [];
    const reportedBySsn = new Map(
      reported8814.map((child) => [child.ssn, child.magi]),
    );
    if (
      new Set(expected8814).size !== expected8814.length ||
      reportedBySsn.size !== reported8814.length ||
      expected8814.some((ssn) => !ssn || !reportedBySsn.has(ssn))
    ) {
      throw new Error(
        "Form 8962 needs a matching Form 8814 for each elected dependent",
      );
    }
    const dependentsMagi = (input.dependents_modified_agi ?? 0) +
      expected8814.reduce((sum, ssn) => sum + (reportedBySsn.get(ssn) ?? 0), 0);
    const income = Math.max(0, taxpayerMagi + dependentsMagi);
    const fpl = federalPovertyLevel(
      input.household_size,
      input.fpl_region,
      cfg,
    );
    const incomePct = income > 4 * fpl ? 401 : Math.floor(income / fpl * 100);
    const baseFields = {
      household_size: input.household_size,
      taxpayer_modified_agi: taxpayerMagi,
      dependents_modified_agi: dependentsMagi,
      household_income: income,
      federal_poverty_line: fpl,
      fpl_region: input.fpl_region,
      federal_poverty_pct: incomePct,
    };
    const mfsStatus = input.filing_status === FilingStatus.MFS
      ? input.mfs_ptc_status
      : undefined;
    if (input.filing_status === FilingStatus.MFS && !mfsStatus) {
      throw new Error(
        "Form 8962 MFS needs verified exception and policy-allocation facts before filing",
      );
    }
    const allocations = input.shared_policy_allocations ?? [];
    const hasMfsAllocation = allocations.some((row) =>
      row.basis === "mfs_exception" || row.basis === "mfs_no_exception"
    );
    if (hasMfsAllocation && !mfsStatus) {
      throw new Error("Form 8962 shared MFS policy needs MFS filing status");
    }
    if (mfsStatus && allocations.length > 0 && !hasMfsAllocation) {
      throw new Error("Form 8962 MFS status requires Situation 2 allocation");
    }
    if (
      mfsStatus?.policy_scope === "shared_with_spouse" &&
      allocations.length === 0
    ) {
      throw new Error("Form 8962 MFS shared policy allocation is missing");
    }
    if (
      mfsStatus?.policy_scope === "family_only" && allocations.length > 0
    ) {
      throw new Error(
        "Form 8962 family-only MFS status conflicts with shared policy allocation",
      );
    }
    for (const row of allocations) {
      if (row.start_month > row.end_month) {
        throw new Error("Form 8962 shared policy months are reversed");
      }
      if (mfsStatus) {
        const expectedBasis = mfsStatus.basis === "no_exception"
          ? "mfs_no_exception"
          : "mfs_exception";
        if (
          row.basis !== expectedBasis || row.aptc_pct !== 0.5 ||
          row.slcsp_pct !== undefined ||
          (row.basis === "mfs_exception" && row.premium_pct !== 0.5) ||
          (row.basis === "mfs_no_exception" &&
            row.premium_pct !== undefined)
        ) {
          throw new Error(
            "Form 8962 MFS policy allocation does not match exception status",
          );
        }
      } else if (
        row.basis !== "divorce_agreed" &&
        row.basis !== "divorce_no_agreement" &&
        row.basis !== "other_agreed" &&
        row.basis !== "other_no_agreement" &&
        row.basis !== "no_aptc"
      ) {
        throw new Error("Form 8962 shared policy allocation basis is invalid");
      } else if (row.basis === "no_aptc") {
        if (
          row.premium_pct === undefined || row.slcsp_pct !== undefined ||
          row.aptc_pct !== undefined
        ) {
          throw new Error(
            "Form 8962 Situation 3 allocates premiums only and has no APTC",
          );
        }
      } else if (
        row.premium_pct === undefined || row.slcsp_pct === undefined ||
        row.aptc_pct === undefined ||
        row.premium_pct !== row.slcsp_pct ||
        row.premium_pct !== row.aptc_pct ||
        (row.basis === "divorce_no_agreement" && row.premium_pct !== 0.5)
      ) {
        throw new Error(
          "Form 8962 shared policy must allocate all three amounts equally",
        );
      }
    }
    if (allocations.length > 0 && input.annual_line11_eligible === true) {
      throw new Error("Form 8962 shared policy must use monthly calculation");
    }
    if (mfsStatus?.basis === "no_exception") {
      return aptcOnlyRepayment(input, aptc, baseFields);
    }
    if (incomePct < 100) {
      const status = input.below_100_fpl_status;
      if (!status) {
        throw new Error(
          "Form 8962 below 100% FPL needs verified PTC exception facts before filing",
        );
      }
      if (status.basis === "marketplace_estimate" && aptc === 0) {
        throw new Error(
          "Form 8962 below 100% FPL marketplace-estimate route requires paid APTC",
        );
      }
      if (status.basis === "not_applicable") {
        return aptcOnlyRepayment(input, aptc, baseFields);
      }
    }

    const hasMonthlyColumns = input.monthly_premiums !== undefined ||
      input.monthly_slcsps !== undefined || input.monthly_aptcs !== undefined;
    if (
      hasMonthlyColumns &&
      (!input.monthly_premiums || !input.monthly_slcsps || !input.monthly_aptcs)
    ) {
      throw new Error(
        "Form 8962 monthly calculation needs all three 1095-A columns for each month",
      );
    }
    if (hasMonthlyColumns) {
      for (
        const [annual, monthly, label] of [
          [input.annual_premium, input.monthly_premiums!, "premium"],
          [input.annual_slcsp, input.monthly_slcsps!, "SLCSP"],
          [input.annual_aptc, input.monthly_aptcs!, "APTC"],
        ] as const
      ) {
        if (
          annual !== undefined &&
          Math.abs(annual - monthly.reduce((sum, amount) => sum + amount, 0)) >
            0.01
        ) {
          throw new Error(
            `Form 8962 annual ${label} must reconcile to twelve monthly 1095-A amounts`,
          );
        }
      }
    }
    if (
      hasMonthlyColumns && input.annual_line11_eligible === true &&
      !input.alternative_marriage &&
      (!input.monthly_premiums!.every((amount) =>
        amount > 0 && amount === input.monthly_premiums![0]
      ) ||
        !input.monthly_slcsps!.every((amount) =>
          amount > 0 && amount === input.monthly_slcsps![0]
        ))
    ) {
      throw new Error(
        "Form 8962 line 11 requires twelve months of unchanged enrollment premium and applicable SLCSP",
      );
    }
    if (!hasMonthlyColumns && input.annual_line11_eligible !== true) {
      throw new Error(
        "Form 8962 annual line 11 needs verified full-year unchanged monthly coverage",
      );
    }
    const monthly = hasMonthlyColumns &&
      (input.annual_line11_eligible !== true ||
        input.alternative_marriage !== undefined);
    const qsehraFacts = input.qsehra_monthly_facts;
    if (input.alternative_marriage && qsehraFacts) {
      throw new Error(
        "Form 8962 marriage alternative with QSEHRA needs separate Publication 974 calculation",
      );
    }
    if (
      input.qsehra_amount_offered !== undefined &&
      input.qsehra_w2_reported_benefit !== undefined &&
      Math.abs(
          input.qsehra_amount_offered - input.qsehra_w2_reported_benefit,
        ) > 0.01
    ) {
      throw new Error(
        "Form 8962 QSEHRA benefit disagrees with W-2 code FF",
      );
    }
    const annualQsehraBenefit = input.qsehra_w2_reported_benefit ??
      input.qsehra_amount_offered;
    if ((annualQsehraBenefit ?? 0) > 0 && !qsehraFacts) {
      throw new Error(
        "Form 8962 QSEHRA needs monthly affordability and benefit facts before PTC can be filed",
      );
    }
    if (qsehraFacts) {
      const monthlyBenefit = qsehraFacts.reduce(
        (sum, facts) => sum + (facts?.permitted_benefit ?? 0),
        0,
      );
      if (
        annualQsehraBenefit === undefined ||
        Math.abs(monthlyBenefit - annualQsehraBenefit) > 0.01 ||
        !qsehraFacts.some((facts) => facts !== null)
      ) {
        throw new Error(
          "Form 8962 QSEHRA monthly benefits must reconcile to the annual permitted benefit",
        );
      }
    }
    const applicableFigure = applicableContributionPct(incomePct);
    const annualContribution = applicableFigure === Infinity
      ? undefined
      : Math.round(income * applicableFigure);
    const monthlyContribution = annualContribution === undefined
      ? undefined
      : Math.round(annualContribution / 12);
    const alternativeMarriage = alternativeMarriageCalculation(
      input,
      income,
      cfg,
    );
    if (alternativeMarriage) {
      const regularCredit = input.monthly_premiums!.reduce(
        (sum, monthPremium, index) =>
          sum + allowedPtc(
            input.monthly_slcsps![index],
            monthPremium,
            monthlyContribution!,
          ),
        0,
      );
      const regularPreMarriageCredit = input.monthly_premiums!.reduce(
        (sum, monthPremium, index) =>
          sum + (alternativeMarriage.coveredMonths[index]
            ? allowedPtc(
              input.monthly_slcsps![index],
              monthPremium,
              monthlyContribution!,
            )
            : 0),
        0,
      );
      const alternativePreMarriageCredit = alternativeMarriage.credits.reduce(
        (sum, credit) => sum + credit,
        0,
      );
      if (
        aptc <= regularCredit ||
        alternativePreMarriageCredit <= regularPreMarriageCredit
      ) {
        throw new Error(
          "Form 8962 marriage alternative requires excess APTC and a beneficial Worksheet V election",
        );
      }
    }
    const monthlyRows = monthly
      ? input.monthly_premiums!.map((monthPremium, index) => {
        const monthSlcsp = input.monthly_slcsps![index];
        const monthAptc = input.monthly_aptcs![index];
        const regularMaxAssistance = annualContribution === undefined
          ? 0
          : Math.max(0, monthSlcsp - monthlyContribution!);
        const preMarriage = alternativeMarriage !== undefined &&
          index < input.alternative_marriage!.marriage_month;
        const maxAssistance = preMarriage
          ? Math.max(
            0,
            monthSlcsp - alternativeMarriage.contributions[index],
          )
          : regularMaxAssistance;
        const tentativeCredit = preMarriage
          ? alternativeMarriage.credits[index]
          : Math.min(monthPremium, maxAssistance);
        return {
          month_code: MONTH_CODES[index],
          premium: monthPremium,
          slcsp: monthSlcsp,
          contribution: preMarriage
            ? alternativeMarriage.contributions[index]
            : monthlyContribution,
          max_assistance: maxAssistance,
          allowed_credit: qsehraMonthlyCredit(
            tentativeCredit,
            income,
            qsehraFacts?.[index] ?? null,
          ),
          aptc: monthAptc,
        };
      })
      : undefined;
    const annualMaxAssistance = annualContribution === undefined
      ? 0
      : Math.max(0, slcsp - annualContribution);
    const annualTentativeCredit = annualContribution === undefined
      ? 0
      : allowedPtc(slcsp, premium, annualContribution);
    const allowed = monthlyRows
      ? monthlyRows.reduce((sum, row) => sum + row.allowed_credit, 0)
      : qsehraFacts
      ? qsehraAnnualCredit(annualTentativeCredit, income, qsehraFacts)
      : annualTentativeCredit;
    const line24 = Math.round(allowed);
    if (
      pub974 && (
        line24 !== pub974.total_premium_tax_credit ||
        !monthlyRows ||
        Math.abs(attributableSpecifiedPtc(
            monthlyRows,
            new Set(pub974.specified_policy_months.map((row) => row.month)),
            new Set(pub974.form1095a_policy_months.map((row) => row.month)),
          ) - pub974.attributable_specified_ptc) >= 0.01 ||
        pub974.specified_deduction + pub974.attributable_specified_ptc >
          pub974.specified_premiums + 0.01
      )
    ) {
      throw new Error(
        "Form 8962 PTC does not reconcile to Publication 974 deduction",
      );
    }
    const line25 = Math.round(aptc);
    // Pub. 974 Worksheet N/Q: no Form 8962 when QSEHRA leaves no PTC and
    // no APTC was paid for anyone in the tax family.
    if (qsehraFacts && line24 === 0 && line25 === 0) {
      return noForm8962Required();
    }
    const line26 = alternativeMarriage ? 0 : Math.max(0, line24 - line25);
    const line27 = Math.max(0, line25 - line24);
    const cap = line27 > 0
      ? repaymentCap(incomePct, input.filing_status)
      : null;
    const line29 = cap === null ? line27 : Math.min(line27, cap);

    const formFields: Record<string, unknown> = {
      ...baseFields,
      ...(mfsStatus ? { mfs_exception_ind: true } : {}),
      ...(qsehraFacts ? { qsehra_ind: true } : {}),
      ...(allocations.length > 0
        ? { shared_policy_allocations: allocations }
        : {}),
      ...(alternativeMarriage
        ? {
          alternative_marriage_primary: alternativeMarriage.primary,
          alternative_marriage_spouse: alternativeMarriage.spouse,
        }
        : {}),
      total_premium_tax_credit: line24,
      total_advance_ptc: line25,
      ...(annualContribution !== undefined && {
        applicable_figure: applicableFigure,
        annual_applicable_contribution: annualContribution,
        monthly_applicable_contribution: monthlyContribution,
      }),
      ...(monthlyRows ? { monthly_ptc_rows: monthlyRows } : {
        annual_premium: premium,
        annual_slcsp: slcsp,
        annual_max_ptc: annualMaxAssistance,
        annual_ptc_allowed: line24,
        annual_aptc: aptc,
      }),
      ...((alternativeMarriage || line26 > 0) && {
        net_premium_tax_credit: line26,
      }),
      ...(line27 > 0 && {
        excess_advance_payment: line27,
        ...(cap !== null && { repayment_limitation: cap }),
        excess_advance_premium: line29,
      }),
    };
    return { outputs: buildOutputs(line26, line29, formFields) };
  }
}

// ─── Singleton Export ─────────────────────────────────────────────────────────

export const form8962 = new Form8962Node();

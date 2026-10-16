import { z } from "zod";
import {
  calculateForm4852Bridge2026,
  form4852Bridge2026Schema,
} from "./form4852-bridge.ts";
import { hsaFundingReview2026Schema } from "./hsa-funding-evidence.ts";
import {
  calculateHsaTestingPeriod2026,
  hsaTestingPeriod2026Schema,
} from "./hsa-testing-period.ts";
import { hsaQualifiedFunding2026Schema } from "./hsa-qualified-funding.ts";
import { investmentOwner2026 } from "./investment-source.ts";
import { w2Item2026Schema } from "./w2-source.ts";
import { classifyHsaCoverage2026 } from "./hsa-plan-eligibility.ts";
import { CoverageType as C } from "../../nodes/intermediate/forms/adjustments/health/form8889/contribution-limit.ts";
import { FilingStatus } from "../../nodes/types.ts";
import { roundWholeDollars } from "../../whole-dollars.ts";
import { sumSourceMoney } from "../../nodes/intermediate/forms/taxes/retirement/form4972/source-rounding.ts";
const ownerKeys = {
  filing_status: true,
  taxpayer_ssn: true,
  spouse_ssn: true,
} as const;
const contributionClaim = hsaQualifiedFunding2026Schema.omit({
  ...ownerKeys,
  wage_sources: true,
  rollover_distribution_sources: true,
  nonreportable_distribution_sources: true,
  form4852_sources_2026: true,
}).extend({
  qualified_funding_review: hsaFundingReview2026Schema.extend({
    ira_accounts: z.array(
      hsaFundingReview2026Schema.shape.ira_accounts.element.omit({
        form4852_source_reference: true,
      }).extend({
        current_issued_copy_after_corrections_verified: z.literal(true),
      }),
    ).max(100).default([]),
    substitute_ira_accounts: z.array(
      hsaFundingReview2026Schema.shape.ira_accounts.element.omit({
        form1099r: true,
        current_issued_copy_after_corrections_verified: true,
      }).extend({ form4852_source_reference: z.string().trim().min(1) }),
    ).min(1).max(100).optional(),
  }).optional(),
});
export const hsaReturnClaim2026Schema = hsaTestingPeriod2026Schema.omit({
  ...ownerKeys,
  taxpayer_dob: true,
  spouse_dob: true,
  schedule_a_medical_sources: true,
}).extend({
  excess_returns: hsaTestingPeriod2026Schema.shape.excess_returns.extend({
    contribution_sources: contributionClaim,
  }),
}).strict();
export const hsaReturnSource2026Schema = investmentOwner2026.extend({
  taxpayer_dob: z.string().date(),
  spouse_dob: z.string().date().optional(),
  taxpayer_can_be_claimed_as_dependent: z.boolean(),
  spouse_can_be_claimed_as_dependent: z.boolean().optional(),
  form4852_sources_2026: form4852Bridge2026Schema.optional(),
  wage_sources: z.array(w2Item2026Schema).default([]),
  schedule_a_medical_sources: hsaTestingPeriod2026Schema.shape
    .schedule_a_medical_sources.default([]),
  claim: hsaReturnClaim2026Schema,
}).strict();
export type HsaReturnSource2026 = z.input<typeof hsaReturnSource2026Schema>;
/** Bind one annual HSA workpaper to executed identity, wages and itemized
 * medical sources before publishing any income, deduction or additional tax. */
export function calculateHsaReturnSources2026(raw: HsaReturnSource2026) {
  const input = hsaReturnSource2026Schema.parse(raw),
    { claim, wage_sources } = input;
  const review =
    claim.excess_returns.contribution_sources.qualified_funding_review;
  const substitutes = input.form4852_sources_2026
    ? calculateForm4852Bridge2026(input.form4852_sources_2026)
    : undefined;
  const qualifiedReview = review
    ? (() => {
      const { substitute_ira_accounts, ...issued } = review;
      return {
        ...issued,
        ira_accounts: [
          ...issued.ira_accounts,
          ...(substitute_ira_accounts ?? []).map((a) => {
            const copy = substitutes?.substitute_retirement_copies.find((c) =>
              c.source_document_reference === a.form4852_source_reference
            );
            if (!copy) {
              throw Error(
                "HSA substitute account needs its actual Form 4852 retirement source",
              );
            }
            return { ...a, form1099r: copy };
          }),
        ],
      };
    })()
    : undefined;
  const owner = {
    filing_status: input.filing_status,
    taxpayer_ssn: input.taxpayer_ssn,
    spouse_ssn: input.spouse_ssn,
  };
  for (
    const e of claim.excess_returns.contribution_sources.household_eligibility
      .owners
  ) {
    const primary = e.owner_tin === input.taxpayer_ssn;
    const dob = primary ? input.taxpayer_dob : input.spouse_dob;
    const dependent = primary
      ? input.taxpayer_can_be_claimed_as_dependent
      : input.spouse_can_be_claimed_as_dependent;
    // A separate-return spouse is supporting evidence, not a return owner;
    // the household workpaper verifies that spouse's actual TIN and records.
    if (
      (primary || input.filing_status === FilingStatus.MFJ) &&
      (e.owner_dob !== dob || e.can_be_claimed_as_dependent !== dependent)
    ) {
      throw Error(
        "HSA eligibility must match the actual return owner's birth date and dependency",
      );
    }
  }
  const calculation = calculateHsaTestingPeriod2026({
    ...claim,
    ...owner,
    taxpayer_dob: input.taxpayer_dob,
    spouse_dob: input.spouse_dob,
    schedule_a_medical_sources: input.schedule_a_medical_sources,
    excess_returns: {
      ...claim.excess_returns,
      contribution_sources: {
        ...claim.excess_returns.contribution_sources,
        qualified_funding_review: qualifiedReview,
        form4852_sources_2026: input.form4852_sources_2026,
        ...owner,
        wage_sources,
        ...(claim.excess_returns.contribution_sources.nonreportable_review ||
            claim.claim.accounts.some((a) => a.nonreportable_payments?.length)
          ? {
            nonreportable_distribution_sources: {
              ...owner,
              taxpayer_dob: input.taxpayer_dob,
              spouse_dob: input.spouse_dob,
              claim: claim.claim,
            },
          }
          : {}),
        ...(claim.excess_returns.contribution_sources.rollover_review
          ? {
            rollover_distribution_sources: {
              ...owner,
              taxpayer_dob: input.taxpayer_dob,
              spouse_dob: input.spouse_dob,
              claim: claim.claim,
            },
          }
          : {}),
      },
    },
  });
  const annual = calculation.annual_sources, medical = annual.medical_sources;
  const excess = medical.excess_return_sources!,
    contributions = excess.contribution_sources;
  const household = contributions.source_input.household_eligibility;
  const owners = calculation.owners.map((o) => {
    const contribution = contributions.owners.find((v) =>
      v.owner_tin === o.owner_tin
    )!;
    const dist = medical.owners.find((v) => v.owner_tin === o.owner_tin)!;
    const e = household.owners.find((v) => v.owner_tin === o.owner_tin)!;
    const spouse = household.owners.find((v) => v.owner_tin !== o.owner_tin);
    const planCoverage = (h: typeof e, day: string) =>
      classifyHsaCoverage2026(
        h.plans.filter((p) =>
          p.effective_from <= day && p.effective_through >= day
        ),
        [],
        false,
        false,
        "none",
        day,
      ).eligible_coverage;
    const coverage = o.daily_coverage_review.map(({ day }) => {
      const own = planCoverage(e, day);
      const other = spouse ? planCoverage(spouse, day) : null;
      return {
        day,
        coverage:
          household.married_at_year_end && own !== null && other !== null &&
            (own === C.Family || other === C.Family)
            ? C.Family
            : own,
      };
    });
    const family = coverage.filter((v) => v.coverage === C.Family).length;
    const single = coverage.filter((v) => v.coverage === C.SelfOnly).length;
    const decemberFamily = coverage.find((v) =>
      v.day === "2026-12-01"
    )!.coverage === C.Family;
    if (!decemberFamily && family === single && family > 0) {
      throw Error(
        "Form 8889 equal-duration coverage needs the line 1 election review",
      );
    }
    const line1 = decemberFamily || family > single
      ? C.Family
      : single
      ? C.SelfOnly
      : undefined;
    const { line13_before_prior_excess: _before, ...cash } =
      contribution.current_contributions.filed_current_lines;
    return {
      ...o,
      owner: o.owner_tin === input.taxpayer_ssn
        ? "taxpayer" as const
        : "spouse" as const,
      file_form8889:
        contribution.current_contributions.exact_personal.numerator > 0 ||
        contribution.current_contributions.exact_employer.numerator > 0 ||
        contribution.current_contributions.exact_qualified_funding.numerator >
          0 ||
        dist.gross_distributions > 0 || o.exact_part_iii_income.numerator > 0 ||
        o.exact_form8889_line13.numerator > 0,
      form8889: {
        ...contribution.limits,
        line1,
        line4: 0,
        ...cash,
        line13: o.filed_form8889_line13,
        ...dist.filed_part_ii,
        ...o.filed_part_iii,
      },
    };
  });
  return {
    source_input: input,
    calculation,
    owners,
    contribution_sources:
      calculation.source_input.excess_returns.contribution_sources,
    schedule1_line8f: calculation.schedule1_line8f_hsa_income,
    schedule1_line13: annual.schedule1_line13_before_testing_period_review,
    schedule1_line8z_earnings: roundWholeDollars(
      sumSourceMoney(excess.owners.map((o) => o.excess_earnings_income_2026)),
    ),
    schedule1_line8z_employer: excess.owners.reduce(
      (n, o) => n + o.filed_employer_excess_other_income_2026,
      0,
    ),
    schedule2_line13c: owners.reduce((n, o) => n + o.form8889.line17b, 0),
    schedule2_line13d: calculation.schedule2_line13d_hsa_testing_tax,
    schedule2_line18: annual.schedule2_line18_hsa_excess_tax,
  };
}

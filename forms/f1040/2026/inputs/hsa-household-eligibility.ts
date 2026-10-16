import { z } from "zod";
import {
  calculateHsaEligibility2026,
  hsaEligibility2026Schema,
} from "./hsa-eligibility.ts";
import { CoverageType } from "../../nodes/intermediate/forms/adjustments/health/form8889/contribution-limit.ts";
import {
  hsaFundingSources2026Schema,
  reconcileHsaFunding2026,
} from "./hsa-funding-source.ts";
import { FilingStatus } from "../../nodes/types.ts";
const ref = z.string().trim().min(1);
const tin = z.string().regex(/^\d{9}$/);
export const hsaHouseholdEligibility2026Schema = z.object({
  tax_year: z.literal(2026),
  record_reference: ref,
  taxpayer_tin: tin,
  spouse_tin: tin.optional(),
  same_identified_spouse_for_all_married_months_verified: z.literal(true),
  married_at_year_end: z.boolean(),
  year_end_marriage_record_reference: ref,
  owners: z.array(hsaEligibility2026Schema).min(1).max(2),
  months: z.array(
    z.object({
      month: z.number().int().min(1).max(12),
      married_to_identified_spouse_on_first_day: z.boolean(),
      marriage_record_reference: ref,
    }).strict(),
  ).length(12),
}).strict();
export type HsaHouseholdEligibility2026 = z.input<
  typeof hsaHouseholdEligibility2026Schema
>;

/** Join actual eligibility before applying the spousal family-coverage rule.
 * Never create an eligible month for a Medicare-enrolled/ineligible spouse.
 * No family limit is independently granted twice by this source workpaper. */
export function calculateHsaHouseholdEligibility2026(
  raw: HsaHouseholdEligibility2026,
) {
  const input = hsaHouseholdEligibility2026Schema.parse(raw);
  const ids = [
    input.taxpayer_tin,
    ...(input.spouse_tin ? [input.spouse_tin] : []),
  ];
  if (
    new Set(ids).size !== ids.length || input.owners.length !== ids.length ||
    new Set(input.owners.map((o) => o.owner_tin)).size !== ids.length ||
    input.owners.some((o) => !ids.includes(o.owner_tin))
  ) {
    throw Error(
      "HSA household needs exactly the identified owners' eligibility records",
    );
  }
  if (new Set(input.months.map((m) => m.month)).size !== 12) {
    throw Error("HSA household marriage inventory needs every month once");
  }
  if (
    !input.spouse_tin &&
    (input.married_at_year_end ||
      input.months.some((m) => m.married_to_identified_spouse_on_first_day))
  ) {
    throw Error(
      "HSA married months require the identified spouse's source eligibility",
    );
  }
  if (
    new Set(input.owners.map((o) => o.record_reference)).size !==
      input.owners.length ||
    input.owners.some((o) => o.record_reference === input.record_reference)
  ) {
    throw Error("HSA household owners need distinct eligibility inventories");
  }
  const owners = ids.map((id) =>
    calculateHsaEligibility2026(input.owners.find((o) => o.owner_tin === id)!)
  );
  const months = [...input.months].sort((a, b) => a.month - b.month).map(
    (m) => {
      const coverage = owners.map((o) =>
        o.eligible_hdhp_coverage_by_month[m.month - 1]
      );
      const family = owners.length === 2 &&
        m.married_to_identified_spouse_on_first_day &&
        coverage.every((c) => c !== null) &&
        coverage.includes(CoverageType.Family);
      return {
        month: m.month,
        married_on_first_day: m.married_to_identified_spouse_on_first_day,
        shared_family_coverage: family,
        owner_coverage: ids.map((owner_tin, i) => ({
          owner_tin,
          actual_eligible_coverage: coverage[i],
          deemed_eligible_coverage: family ? CoverageType.Family : coverage[i],
        })),
      };
    },
  );
  return {
    source_input: input,
    months,
    owners: owners.map((o, i) => ({
      owner_tin: ids[i],
      eligibility: o,
      eligible_hdhp_coverage_by_month: months.map((m) =>
        m.owner_coverage[i].deemed_eligible_coverage
      ),
    })),
  };
}

export const hsaContributionEvidence2026Schema = hsaFundingSources2026Schema
  .extend({
    household_eligibility: hsaHouseholdEligibility2026Schema,
  }).strict();
export type HsaContributionEvidence2026 = z.input<
  typeof hsaContributionEvidence2026Schema
>;
/** Internal bridge for the eventual form node. The common funding owner and
 * household identity must match; an MFS spouse's eligibility is supporting
 * evidence, not authority to deduct the spouse's contributions on this return. */
export function reconcileHsaContributionEvidence2026(
  raw: HsaContributionEvidence2026,
) {
  const { household_eligibility: household, ...funding } =
    hsaContributionEvidence2026Schema.parse(raw);
  if (
    household.taxpayer_tin !== funding.taxpayer_ssn ||
    household.spouse_tin !== funding.spouse_ssn ||
    ((funding.filing_status === FilingStatus.MFJ ||
      funding.filing_status === FilingStatus.MFS) &&
      !household.married_at_year_end) ||
    (funding.filing_status === FilingStatus.Single &&
      household.married_at_year_end)
  ) {
    throw Error(
      "HSA contribution evidence must use the actual return and household identities",
    );
  }
  const h = calculateHsaHouseholdEligibility2026(household);
  const f = reconcileHsaFunding2026(funding);
  if (household.owners.some((o) => o.reviewed_on > funding.claim.reviewed_on)) {
    throw Error(
      "HSA contribution review cannot predate its eligibility evidence",
    );
  }
  return {
    source_input: { ...f.source_input, household_eligibility: h.source_input },
    household: h,
    funding: f,
    owners: f.owners.map((o) => ({
      ...o,
      eligibility: h.owners.find((e) => e.owner_tin === o.owner_tin)!,
    })),
  };
}

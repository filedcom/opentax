import { classifyHsaCoverage2026 } from "./hsa-plan-eligibility.ts";
import { z } from "zod";
import { CoverageType } from "../../nodes/intermediate/forms/adjustments/health/form8889/contribution-limit.ts";
import {
  isSourceMoney,
} from "../../nodes/intermediate/forms/taxes/retirement/form4972/source-rounding.ts";
const ref = z.string().trim().min(1);
const date = z.string().date();
const money = z.number().finite().nonnegative().max(10_000_000).refine(
  isSourceMoney,
);
const period = { effective_from: date, effective_through: date };
const commonPlan = {
  source_document_reference: ref,
  policy_identifier: ref,
  covered_owner_tin: z.string().regex(/^\d{9}$/),
  ...period,
  coverage: z.nativeEnum(CoverageType),
  contract_and_enrollment_terms_reviewed: z.literal(true),
};
export const hsaHealthPlan2026Schema = z.discriminatedUnion("kind", [
  z.object({
    ...commonPlan,
    kind: z.literal("ordinary_health_plan"),
    annual_deductible: money,
    annual_out_of_pocket_maximum: money,
    // For family coverage, an embedded deductible must independently meet
    // the family HDHP minimum. Null means there is no embedded deductible.
    embedded_individual_deductible: money.nullable(),
    nonpermitted_benefits_before_minimum_deductible: z.boolean(),
    telehealth_or_remote_care_before_deductible: z.boolean(),
    plan_year_begins: date,
    all_deductible_out_of_pocket_network_and_preventive_care_terms_reviewed: z
      .literal(true),
  }).strict(),
  z.object({
    ...commonPlan,
    kind: z.enum(["individual_bronze", "individual_catastrophic"]),
    individual_market_plan_verified: z.literal(true),
    exchange_status: z.enum([
      "purchased_on_exchange",
      "off_exchange_available_on_exchange",
      "off_exchange_no_reason_to_believe_unavailable",
    ]),
    exchange_or_safe_harbor_evidence_reference: ref,
    // An employer's group bronze plan does not get the individual-market rule.
    not_employer_group_or_shop_plan_verified: z.literal(true),
  }).strict(),
]);
const dpcSchema = z.object({
  source_document_reference: ref,
  arrangement_identifier: ref,
  covered_owner_tin: z.string().regex(/^\d{9}$/),
  ...period,
  fixed_periodic_fee: money,
  billing_period_months: z.number().int().min(1).max(12),
  covers_more_than_one_individual: z.boolean(),
  statutory_primary_care_practitioners_only: z.boolean(),
  solely_primary_care_without_prohibited_services: z.boolean(),
  fixed_fee_is_sole_compensation_for_care_within_arrangement: z.boolean(),
  entire_contract_not_only_services_used_reviewed: z.literal(true),
}).strict();
/** Internal owner workpaper. The eventual return adapter must bind owner TIN,
 * DOB and dependency to general, and combine both spouses' coverage/allocation
 * before using the shared contribution-limit worksheet. No entered eligibility
 * boolean or assumed twelve eligible months is accepted. */
export const hsaEligibility2026Schema = z.object({
  tax_year: z.literal(2026),
  owner_tin: z.string().regex(/^\d{9}$/),
  owner_dob: date,
  can_be_claimed_as_dependent: z.boolean(),
  record_reference: ref,
  reviewed_on: date.refine((d) => d >= "2027-01-01"),
  complete_monthly_plan_medicare_other_coverage_and_direct_care_inventory_verified:
    z.literal(true),
  living_owner_no_inherited_account_verified: z.literal(true),
  plans: z.array(hsaHealthPlan2026Schema).max(24),
  direct_primary_care_arrangements: z.array(dpcSchema).max(24),
  months: z.array(
    z.object({
      month: z.number().int().min(1).max(12),
      record_reference: ref,
      first_day_enrollment_and_other_coverage_reviewed: z.literal(true),
      plan_references: z.array(ref).max(4),
      medicare: z.object({
        enrolled: z.boolean(),
        source_document_reference: ref,
        retroactive_enrollment_reviewed: z.literal(true),
      }).strict(),
      other_coverage: z.object({
        disposition: z.enum(["none", "permitted_only", "disqualifying"]),
        source_document_reference: ref,
        spouse_plans_fsa_hra_va_ihs_and_other_health_coverage_reviewed: z
          .literal(true),
        permitted_coverage_statutory_basis_reference: ref.optional(),
      }).strict(),
      direct_primary_care_references: z.array(ref).max(24),
    }).strict(),
  ).length(12),
}).strict();
export type HsaEligibility2026 = z.input<typeof hsaEligibility2026Schema>;

export function calculateHsaEligibility2026(raw: HsaEligibility2026) {
  const input = hsaEligibility2026Schema.parse(raw);
  if (input.owner_dob > "2026-12-31") {
    throw Error("HSA owner must be born by the tax year");
  }
  const planMap = new Map(
    input.plans.map((p) => [p.source_document_reference, p]),
  );
  const dpcMap = new Map(
    input.direct_primary_care_arrangements.map(
      (p) => [p.source_document_reference, p],
    ),
  );
  const recordRefs = [
    input.record_reference,
    ...input.months.map((m) => m.record_reference),
    ...planMap.keys(),
    ...dpcMap.keys(),
  ];
  if (
    new Set(recordRefs).size !== recordRefs.length ||
    planMap.size !== input.plans.length ||
    dpcMap.size !== input.direct_primary_care_arrangements.length ||
    new Set(input.months.map((m) => m.month)).size !== 12
  ) {
    throw Error(
      "HSA eligibility needs distinct inventory records and every calendar month once",
    );
  }
  const policies = new Set<string>(), arrangements = new Set<string>();
  for (const p of input.plans) {
    const key =
      `${p.policy_identifier}/${p.effective_from}/${p.effective_through}`;
    if (policies.has(key)) {
      throw Error("HSA plan inventory repeats a policy period");
    }
    policies.add(key);
  }
  for (const p of input.direct_primary_care_arrangements) {
    const key =
      `${p.arrangement_identifier}/${p.effective_from}/${p.effective_through}`;
    if (arrangements.has(key)) {
      throw Error("HSA direct-care inventory repeats an arrangement");
    }
    arrangements.add(key);
  }
  for (const p of [...input.plans, ...input.direct_primary_care_arrangements]) {
    if (
      p.covered_owner_tin !== input.owner_tin ||
      p.effective_from > p.effective_through ||
      p.effective_from > input.reviewed_on || p.effective_from > "2026-12-31" ||
      p.effective_through < "2026-01-01"
    ) {
      throw Error(
        "HSA plan evidence needs the actual owner and an ordered coverage period",
      );
    }
  }
  const months = [...input.months].sort((a, b) => a.month - b.month).map(
    (m) => {
      const first = `2026-${String(m.month).padStart(2, "0")}-01`;
      if (
        new Set(m.plan_references).size !== m.plan_references.length ||
        new Set(m.direct_primary_care_references).size !==
          m.direct_primary_care_references.length
      ) {
        throw Error(
          "HSA monthly coverage cannot repeat a plan or direct-care arrangement",
        );
      }
      const activeReferences = (
        records: {
          source_document_reference: string;
          effective_from: string;
          effective_through: string;
        }[],
      ) =>
        records.filter((p) =>
          p.effective_from <= first && p.effective_through >= first
        ).map((p) => p.source_document_reference).sort();
      if (
        JSON.stringify([...m.plan_references].sort()) !==
          JSON.stringify(activeReferences(input.plans)) ||
        JSON.stringify([...m.direct_primary_care_references].sort()) !==
          JSON.stringify(
            activeReferences(input.direct_primary_care_arrangements),
          )
      ) {
        throw Error(
          "HSA monthly ledger must include every active plan and direct-care arrangement",
        );
      }
      const plans = m.plan_references.map((r) => {
        const p = planMap.get(r);
        if (
          !p || p.effective_from > first || p.effective_through < first ||
          first < input.owner_dob
        ) {
          throw Error(
            "HSA monthly plan needs owner enrollment on the first day",
          );
        }
        return p;
      });
      if (
        new Set(plans.map((p) => p.policy_identifier)).size !== plans.length
      ) throw Error("HSA policy enrollment periods overlap");
      const dpcs = m.direct_primary_care_references.map((r) => {
        const p = dpcMap.get(r);
        if (
          !p || p.effective_from > first || p.effective_through < first ||
          first < input.owner_dob
        ) {
          throw Error(
            "HSA direct-care membership needs first-day source evidence",
          );
        }
        return p;
      });
      if (
        new Set(dpcs.map((p) => p.arrangement_identifier)).size !== dpcs.length
      ) throw Error("HSA direct-care arrangement periods overlap");
      if (
        (m.other_coverage.disposition === "permitted_only") !==
          !!m.other_coverage.permitted_coverage_statutory_basis_reference
      ) {
        throw Error(
          "HSA permitted other coverage needs its statutory classification evidence",
        );
      }
      return {
        month: m.month,
        first_day: first,
        ...classifyHsaCoverage2026(
          plans,
          dpcs,
          input.can_be_claimed_as_dependent,
          m.medicare.enrolled,
          m.other_coverage.disposition,
          first,
        ),
      };
    },
  );
  return {
    source_input: input,
    months,
    eligible_hdhp_coverage_by_month: months.map((m) => m.eligible_coverage),
    age_55_or_older: input.owner_dob <= "1972-01-01",
  };
}

import { addCalendarMonths } from "./retirement-statement.ts";
import { z } from "zod";
import { FilingStatus } from "../../nodes/types.ts";
import { investmentOwner2026 } from "./investment-source.ts";
import { w2Item2026Schema } from "./w2-source.ts";
import { w2_2026 } from "./w2.ts";
import {
  businessReturnSource2026Schema,
  resolveBusinessQbi2026,
} from "./business-qbi.ts";
import { ableContributionReviewSchema } from "../../nodes/intermediate/forms/credits/individual/form8880/able_contribution_review.ts";
import {
  ableDistributionReferences,
  calculateAbleDistributionAmounts,
  createAbleDistributionReviewSchema,
} from "../../nodes/intermediate/forms/credits/individual/form8880/able_distribution_review.ts";
import {
  AbleBusinessKind,
  ableEmploymentLimitWithConfig,
  createAbleEmploymentReviewSchema,
  hasDisqualifyingAblePlanDeferral,
} from "../../nodes/intermediate/forms/credits/individual/form8880/able_employment_review.ts";
import {
  isSourceMoney,
  sourceCents,
  sumSourceMoney,
} from "../../nodes/intermediate/forms/taxes/retirement/form4972/source-rounding.ts";

const ref = z.string().trim().min(1);
const date = z.string().date();
const money = z.number().finite().nonnegative().max(1_000_000_000).refine(
  isSourceMoney,
);
const currentDate = date.refine((d) => d.startsWith("2026-"));
const employmentSchema = createAbleEmploymentReviewSchema(2026);
const distributionSchema = createAbleDistributionReviewSchema(2026, true)
  .superRefine((d, ctx) => {
    if (
      ![
        d.form1099qa.box1_gross_distribution,
        d.form1099qa.box2_earnings,
        d.form1099qa.box3_basis,
        ...d.distributions.map((p) => p.amount),
        ...d.qualified_expenses.map((p) => p.amount),
      ].every((n) => money.safeParse(n).success)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "ABLE amounts need bounded exact source cents",
      });
    }
  });
// Reuse the stable issuer/payment fields only. Year-specific declarations and
// employment/distribution schemas are replaced explicitly, never relabeled 2025 data.
const previousAccount =
  ableContributionReviewSchema.innerType().shape.accounts.element;
const employmentClaim = z.object({
  record_reference: ref,
  no_401a_403a_defined_contribution_403b_or_457b_contributions_verified: z
    .literal(true),
  no_other_compensation_or_self_employed_retirement_deduction_verified: z
    .literal(true),
  wages: z.array(
    z.object({
      source_document_reference: ref,
      employer_plan_review_reference: ref,
      wages_for_current_services_verified: z.literal(true),
    }).strict(),
  ).max(100),
  business_inventory_reference: ref.optional(),
  personal_service_business_references: z.array(ref).max(100),
  listed_businesses_personal_services_material_income_factor_verified: z
    .literal(true),
  residence_periods: employmentSchema.innerType().shape.residence_periods,
}).strict();
const accountSchema = previousAccount.omit({
  eligible_individual_in_2025_confirmed: true,
  employed_beneficiary_review: true,
  current_year_distributions: true,
  beneficiary_payments: true,
}).extend({
  form5498qa: previousAccount.shape.form5498qa.extend({
    tax_year: z.literal(2026),
    box1_contributions: money,
    // This source route does not yet reconcile transferred/closed prior accounts.
    box2_able_rollovers: z.literal(0),
    box8_trump_account_rollover: z.literal(0),
    current_issued_copy_or_program_substitute_after_corrections_verified: z
      .literal(true),
  }).strict(),
  other_contributors_cash: money,
  qtp_rollovers_or_transfers: money,
  eligibility: z.object({
    record_reference: ref,
    blindness_or_disability_onset: date,
    eligibility_basis_matches_program_and_statutory_requirements_verified: z
      .literal(true),
    eligibility_active_for_all_contributions_and_expenses_verified: z.literal(
      true,
    ),
    living_beneficiary_and_no_beneficiary_changes_verified: z.literal(true),
  }).strict(),
  employed_beneficiary_review: employmentClaim.optional(),
  current_year_distributions: distributionSchema.optional(),
  current_distribution_copy_after_corrections_verified: z.literal(true)
    .optional(),
  beneficiary_payments: z.array(
    z.object({
      source_document_ref: ref,
      paid_on: currentDate,
      contributor_ssn: z.string().regex(/^\d{9}$/),
      amount: money.refine((v) => v > 0),
    }).strict(),
  ).max(1000),
}).strict();

export const ableClaim2026Schema = z.object({
  claim: z.object({
    tax_year: z.literal(2026),
    record_reference: ref,
    reviewed_on: date,
    complete_current_able_accounts_contributions_distributions_and_corrections_verified:
      z.literal(true),
    accounts: z.array(accountSchema).min(1).max(2),
  }).strict(),
}).strict();
/** Internal annual workpaper. Actual filer DOBs, wages and business sources must
 * be bound by graph producers before this can become a public source route. */
export const ableSource2026Schema = investmentOwner2026.extend({
  taxpayer_dob: date,
  spouse_dob: date.optional(),
  wage_sources: z.array(w2Item2026Schema).max(100).default([]),
  business_sources_2026: businessReturnSource2026Schema.optional(),
  ...ableClaim2026Schema.shape,
}).strict();
export type AbleSource2026 = z.input<typeof ableSource2026Schema>;
export const ableRules2026 = {
  annual_contributions: 20000,
  disability_onset_before_age: 46,
  // 26 CFR 1.529A-2(g): preceding-calendar-year (2025) HHS one-person guidelines.
  employment_poverty: { continental: 15650, alaska: 19550, hawaii: 17990 },
} as const;
const same = (a: string[], b: string[]) =>
  new Set(a).size === a.length &&
  new Set(b).size === b.length && a.length === b.length &&
  a.every((r) => b.includes(r));

export function calculateAbleSources2026(raw: AbleSource2026) {
  const input = ableSource2026Schema.parse(raw), claim = input.claim;
  const joint = input.filing_status === FilingStatus.MFJ;
  if (
    joint &&
    (!input.spouse_ssn || !input.spouse_dob ||
      input.spouse_ssn === input.taxpayer_ssn)
  ) {
    throw Error(
      "ABLE sources need distinct joint owners and actual birth dates",
    );
  }
  if (claim.reviewed_on < "2027-01-01") {
    throw Error("ABLE annual review must follow year end");
  }
  const owners = new Map<string, string>([
    [input.taxpayer_ssn, input.taxpayer_dob],
    ...(joint
      ? [[input.spouse_ssn!, input.spouse_dob!] as [string, string]]
      : []),
  ]);
  const refs = new Set<string>([claim.record_reference]);
  const document = (r: string) => {
    if (refs.has(r)) {
      throw Error("ABLE sources need distinct document and review references");
    }
    refs.add(r);
  };
  const wages = input.wage_sources;
  wages.forEach((w) => document(w.source_document_reference));
  w2_2026.compute({ taxYear: 2026, formType: "f1040" }, {
    filing_status: input.filing_status,
    taxpayer_ssn: input.taxpayer_ssn,
    spouse_ssn: input.spouse_ssn,
    w2s: wages,
  });
  const businessSource = input.business_sources_2026;
  const business = businessSource
    ? resolveBusinessQbi2026(businessSource).business
    : undefined;
  if (businessSource) {
    const linked = businessSource;
    if (
      businessSource.filing_status !== input.filing_status ||
      businessSource.taxpayer_tin !== input.taxpayer_ssn ||
      businessSource.spouse_tin !== (joint ? input.spouse_ssn : undefined) ||
      !same(
        wages.map((w) => w.source_document_reference),
        (linked.w2s ?? []).map((w) => w.source_document_reference),
      ) ||
      wages.some((w) =>
        JSON.stringify(w) !==
          JSON.stringify(w2Item2026Schema.parse((linked.w2s ?? []).find((v) =>
            v.source_document_reference === w.source_document_reference
          )))
      )
    ) {
      throw Error(
        "ABLE employment needs the actual return owner and wage/business inventory",
      );
    }
  }
  const seenOwners = new Set<string>();
  const accounts = claim.accounts.map((a) => {
    const q = a.form5498qa, owner = q.beneficiary_ssn, dob = owners.get(owner);
    if (!dob || seenOwners.has(owner)) {
      throw Error("ABLE account must belong to one distinct current filer");
    }
    seenOwners.add(owner);
    const birthday46 = addCalendarMonths(dob, 46 * 12);
    if (
      a.eligibility.blindness_or_disability_onset < dob ||
      a.eligibility.blindness_or_disability_onset >= birthday46 ||
      a.eligibility.blindness_or_disability_onset > "2026-12-31"
    ) {
      throw Error(
        "ABLE disability onset must precede the owner's 46th birthday",
      );
    }
    const d = a.current_year_distributions;
    if (
      (d !== undefined) ===
        (a.no_current_year_able_distributions_confirmed !== undefined)
    ) {
      throw Error(
        "ABLE account needs its actual distribution inventory or an explicit absence review",
      );
    }
    if (
      d && a.current_distribution_copy_after_corrections_verified !== true ||
      !d && a.current_distribution_copy_after_corrections_verified !== undefined
    ) {
      throw Error(
        "ABLE distribution needs the current issued copy after corrections",
      );
    }
    if (
      d &&
      (d.form1099qa.recipient_ssn !== owner ||
        d.form1099qa.program_ein !== q.program_ein ||
        d.form1099qa.account_number !== q.account_number)
    ) {
      throw Error(
        "ABLE distribution must match its beneficiary and program account",
      );
    }
    const accountRefs = [
      q.source_document_ref,
      a.program_review_ref,
      a.contribution_detail_ref,
      a.eligibility.record_reference,
      ...a.beneficiary_payments.map((p) => p.source_document_ref),
      ...(d ? ableDistributionReferences(d) : []),
    ];
    accountRefs.forEach(document);
    if (
      a.beneficiary_payments.some((p) =>
        p.contributor_ssn !== owner || p.paid_on > claim.reviewed_on ||
        p.paid_on < a.eligibility.blindness_or_disability_onset
      ) ||
      d?.qualified_expenses.some((e) =>
        e.paid_on > claim.reviewed_on ||
        e.paid_on < a.eligibility.blindness_or_disability_onset
      ) ||
      d?.distributions.some((p) =>
        p.received_on < a.eligibility.blindness_or_disability_onset
      )
    ) {
      throw Error(
        "ABLE beneficiary payments and expenses need owned dated evidence available at review",
      );
    }
    const e = a.employed_beneficiary_review;
    let employment: z.output<typeof employmentSchema> | undefined;
    if (e) {
      document(e.record_reference);
      e.wages.forEach((w) => document(w.employer_plan_review_reference));
      e.residence_periods.forEach((p) => document(p.source_document_ref));
      const ownerWages = wages.filter((w) =>
        w.employee_ssn.replaceAll("-", "") === owner
      );
      const ownerBusinesses = business?.businesses.filter((b) =>
        b.source.owner_tin === owner
      ) ?? [];
      if (
        !same(
          ownerWages.map((w) => w.source_document_reference),
          e.wages.map((w) => w.source_document_reference),
        ) ||
        !same(
          ownerBusinesses.map((b) => b.source.business_reference),
          e.personal_service_business_references,
        ) ||
        e.business_inventory_reference !== (ownerBusinesses.length
            ? businessSource!.record_reference
            : undefined)
      ) {
        throw Error(
          "ABLE employment review must include all actual owner wages and businesses",
        );
      }
      if (
        ownerWages.some((w) =>
          w.box13_statutory_employee || (w.box11_nonqual_plans ?? 0) > 0 ||
          hasDisqualifyingAblePlanDeferral(w.box12_entries ?? [])
        ) ||
        ownerBusinesses.some((b) => b.source.kind !== "sole_proprietor")
      ) {
        throw Error(
          "ABLE increased limit needs current-service compensation without disqualifying retirement contributions",
        );
      }
      const se = business?.owners.find((o) =>
        o.owner_tin === owner
      )?.schedule_se?.line13 ?? 0;
      employment = employmentSchema.parse({
        eligibility_review_ref: e.record_reference,
        no_401a_403a_defined_contribution_403b_or_457b_contributions_confirmed:
          true,
        complete_w2_inventory_confirmed: true,
        ...(ownerBusinesses.length
          ? {
            self_employment: {
              compensation_review_ref: e.record_reference,
              complete_sole_proprietor_inventory_confirmed: true,
              no_other_self_employment_or_excluded_income_confirmed: true,
              no_self_employed_retirement_deduction_confirmed: true,
              deductible_se_tax: se,
              businesses: ownerBusinesses.map((b) => ({
                business_reference: b.source.business_reference,
                income_record_ref: businessSource!.record_reference,
                owner_ssn: owner,
                kind: AbleBusinessKind.ScheduleC,
                net_profit: b.lines.line31,
                personal_services_material_income_factor_confirmed: true,
              })),
            },
          }
          : { only_wage_compensation_confirmed: true }),
        wages: ownerWages.filter((w) => w.box1_wages > 0).map((w) => ({
          source_document_ref: w.source_document_reference,
          employer_plan_review_ref: e.wages.find((r) =>
            r.source_document_reference === w.source_document_reference
          )!.employer_plan_review_reference,
          employee_ssn: owner,
          employer_ein: w.employer_ein.replaceAll("-", ""),
          box1_wages: w.box1_wages,
          wages_for_current_services_confirmed: true,
        })),
        residence_periods: e.residence_periods,
      });
    }
    const extra = employment
      ? ableEmploymentLimitWithConfig(
        employment,
        ableRules2026.employment_poverty,
      )
      : 0;
    const beneficiary = sumSourceMoney(
      a.beneficiary_payments.map((p) => p.amount),
    );
    if (
      sourceCents(beneficiary) + sourceCents(a.other_contributors_cash) +
            sourceCents(a.qtp_rollovers_or_transfers) !==
        sourceCents(q.box1_contributions) ||
      sourceCents(q.box1_contributions) >
        sourceCents(ableRules2026.annual_contributions + extra) ||
      sourceCents(q.box1_contributions) - sourceCents(beneficiary) >
        sourceCents(ableRules2026.annual_contributions)
    ) {
      throw Error(
        "ABLE contributions must reconcile beneficiary cash, other contributors, QTP amounts and annual limits",
      );
    }
    return {
      owner_tin: owner,
      source: a,
      employment,
      extra_contribution_limit: extra,
      saver_contributions: beneficiary,
      distribution: d ? calculateAbleDistributionAmounts(d) : undefined,
    };
  });
  return {
    source_input: input,
    accounts,
    taxable_earnings: accounts.reduce(
      (n, a) => n + (a.distribution?.taxableWholeDollars ?? 0),
      0,
    ),
    additional_tax: accounts.reduce(
      (n, a) => n + (a.distribution?.additionalTax ?? 0),
      0,
    ),
    owners: accounts.map((a) => ({
      owner_tin: a.owner_tin,
      saver_contributions: a.saver_contributions,
      saver_distributions: a.distribution?.grossDistribution ?? 0,
      form5329_part2: a.distribution && a.distribution.taxableWholeDollars > 0
        ? {
          line5: a.distribution.taxableWholeDollars,
          line6: 0,
          line7: a.distribution.taxableWholeDollars,
          line8: a.distribution.additionalTax,
        }
        : undefined,
    })),
  };
}

import { z } from "zod";
import {
  ownedScheduleSE,
  ownerSourcesSchema,
} from "../../../../intermediate/forms/taxes/self-employment/schedule_se/owner-calculation.ts";
import { roundWholeDollars } from "../../../../../whole-dollars.ts";
const reference = z.string().trim().min(1);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((v) => {
  const d = new Date(v + "T00:00:00Z");
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === v;
}, "SEP source date must be a real calendar date");
const contribution = z.object({
  custodian_name: reference,
  custodian_ein: z.string().regex(/^\d{9}$/),
  participant_ssn: z.string().regex(/^\d{9}$/),
  payer_ssn: z.string().regex(/^\d{9}$/),
  plan_identifier: reference,
  tax_year: z.literal(2025),
  traditional_sep_ira_confirmed: z.literal(true),
  amount: z.number().finite().nonnegative(),
  received_on: date,
  issued_record_reference: reference,
  payment_reference: reference,
}).strict();
const employee = z.object({
  employee_reference: reference,
  payroll_source_document_reference: reference,
  employee_ssn: z.string().regex(/^\d{9}$/),
  date_of_birth: date,
  employment_source_reference: reference,
  service_years: z.array(z.number().int().min(2020).max(2024)).max(5),
  compensation: z.number().finite().nonnegative(),
  contribution: contribution.optional(),
  participant_information_delivery_reference: reference.optional(),
}).strict();
export const ownedSepSourceSchema = z.object({
  plans: z.array(
    z.object({
      business_reference: reference,
      recipient: z.enum(["T", "S"]),
      employer_ein: z.string().regex(/^\d{9}$/),
      plan_identifier: reference,
      adoption_record_reference: reference,
      adopted_on: date,
      contribution_deadline: date,
      extension_record_reference: reference.optional(),
      annual_allocation_rate: z.number().finite().nonnegative().max(0.25),
      eligibility: z.object({
        minimum_age: z.number().int().min(0).max(21),
        minimum_prior_service_years: z.number().int().min(0).max(3),
        minimum_compensation: z.number().nonnegative().max(750),
      }).strict(),
      owner_date_of_birth: date,
      owner_service_years: z.array(z.number().int().min(2020).max(2024)).max(5),
      owner_participant_record_reference: reference,
      owner_information_delivery_reference: reference,
      owner_contribution: contribution.optional(),
      employee_census: z.array(employee),
      complete_employee_census_record_reference: reference,
      all_employee_compensation_in_retained_box1_records_confirmed: z.literal(
        true,
      ),
      all_common_law_and_leased_workers_included_confirmed: z.literal(true),
      no_sarsep_elective_deferrals_roth_or_excess_carryover_confirmed: z
        .literal(true),
    }).strict(),
  ).min(1),
  business_plan_reviews: z.array(
    z.object({
      business_reference: reference,
      recipient: z.enum(["T", "S"]),
      plan_identifiers: z.array(reference),
      review_record_reference: reference,
      no_other_defined_contribution_or_defined_benefit_plans_confirmed: z
        .literal(true),
    }).strict(),
  ).min(1),
  employer_relationship_review: z.object({
    assessed_business_references: z.array(reference).min(1),
    ownership_and_family_attribution_record_reference: reference,
    no_controlled_group_or_affiliated_service_group_confirmed: z.literal(true),
    spousal_attribution_exception_reviews: z.array(
      z.object({
        business_reference: reference,
        nonowner_spouse_ssn: z.string().regex(/^\d{9}$/),
        ownership_record_reference: reference,
        no_direct_interest_at_any_time_confirmed: z.literal(true),
        roles_and_management_record_reference: reference,
        no_employee_director_fiduciary_or_management_role_at_any_time_confirmed:
          z.literal(true),
        income_classification_record_reference: reference,
        section61_gross_income: z.number().finite().nonnegative(),
        royalties_rents_dividends_interest_annuities_income: z.number().finite()
          .nonnegative(),
        disposal_rights_record_reference: reference,
        no_disposal_restriction_in_favor_of_spouse_or_children_under_21_confirmed:
          z.literal(true),
      }).strict(),
    ).min(1),
  }).strict(),
}).strict();
export type OwnedSepSource = z.infer<typeof ownedSepSourceSchema>;
const canonical = (v: unknown) => JSON.stringify(v);
const ageAtYearEnd = (dob: string) => 2025 - Number(dob.slice(0, 4));
export function calculateOwnedSep(
  raw: unknown,
  rawSE: unknown,
  wageBase: number,
) {
  const source = ownedSepSourceSchema.parse(raw);
  const owned = ownedScheduleSE(ownerSourcesSchema.parse(rawSE), wageBase);
  const refs = owned.source.businesses.map((b) => b.source_reference).sort();
  if (
    canonical(
        [...source.employer_relationship_review.assessed_business_references]
          .sort(),
      ) !== canonical(refs) ||
    canonical(
        source.business_plan_reviews.map((r) => r.business_reference).sort(),
      ) !== canonical(refs)
  ) {
    throw new Error(
      "Owned SEP reviews must inventory actual businesses and employer relationships",
    );
  }
  const attribution =
    source.employer_relationship_review.spousal_attribution_exception_reviews;
  if (
    canonical(attribution.map((r) => r.business_reference).sort()) !==
      canonical(refs) ||
    attribution.some((r) => {
      const business = owned.source.businesses.find((b) =>
        b.source_reference === r.business_reference
      )!;
      const nonowner = business.recipient === "T"
        ? owned.source.identity.spouse_ssn
        : owned.source.identity.primary_ssn;
      return r.nonowner_spouse_ssn !== nonowner ||
        r.royalties_rents_dividends_interest_annuities_income >
          r.section61_gross_income * .5;
    })
  ) {
    throw new Error(
      "Owned SEP separate employer review needs each actual spousal attribution exception and income facts",
    );
  }
  const payments = new Set<string>(),
    records = new Set<string>();
  for (const review of source.business_plan_reviews) {
    const business = owned.source.businesses.find((b) =>
      b.source_reference === review.business_reference
    );
    if (
      !business || business.recipient !== review.recipient ||
      canonical([...review.plan_identifiers].sort()) !==
        canonical(
          source.plans.filter((p) =>
            p.business_reference === review.business_reference
          ).map((p) => p.plan_identifier).sort(),
        )
    ) {
      throw new Error(
        "Owned SEP plan inventory differs from actual proprietor business",
      );
    }
  }
  const rows = source.plans.map((plan) => {
    const business = owned.source.businesses.find((b) =>
      b.source_reference === plan.business_reference
    );
    const owner = owned.instances.find((o) => o.recipient === plan.recipient);
    const ssn = plan.recipient === "T"
      ? owned.source.identity.primary_ssn
      : owned.source.identity.spouse_ssn;
    if (
      !business || business.recipient !== plan.recipient ||
      business.net_profit <= 0 ||
      business.farm_optional_method_elected || !owner || !ssn ||
      owned.source.businesses.filter((b) => b.recipient === plan.recipient)
          .length !== 1 ||
      source.plans.filter((p) => p.recipient === plan.recipient).length !== 1
    ) {
      throw new Error(
        "Owned SEP needs an actual positive regular proprietor and its one reviewed plan",
      );
    }
    const deadline = plan.contribution_deadline;
    if (
      (deadline !== "2026-04-15" && deadline !== "2026-10-15") ||
      (deadline === "2026-10-15" && !plan.extension_record_reference) ||
      plan.adopted_on > deadline ||
      new Set(plan.owner_service_years).size !==
        plan.owner_service_years.length ||
      ageAtYearEnd(plan.owner_date_of_birth) < plan.eligibility.minimum_age ||
      plan.owner_service_years.length <
        plan.eligibility.minimum_prior_service_years
    ) {
      throw new Error(
        "Owned SEP adoption, filing deadline and proprietor eligibility need actual records",
      );
    }
    const verifyPayment = (
      p: z.infer<typeof contribution>,
      participant: string,
    ) => {
      if (
        p.participant_ssn !== participant || p.payer_ssn !== ssn ||
        p.plan_identifier !== plan.plan_identifier ||
        p.received_on > deadline || p.received_on < "2025-01-01" ||
        payments.has(p.payment_reference) ||
        records.has(p.issued_record_reference)
      ) {
        throw new Error(
          "Owned SEP contribution must match its participant, payer, plan and timely distinct payment",
        );
      }
      payments.add(p.payment_reference);
      records.add(p.issued_record_reference);
    };
    if (plan.owner_contribution) verifyPayment(plan.owner_contribution, ssn);
    const net = business.net_profit - owner.line13;
    const rate = plan.annual_allocation_rate;
    const limit = Math.min(net * rate / (1 + rate), 350000 * rate, 70000);
    if (
      net - limit < plan.eligibility.minimum_compensation ||
      Math.abs((plan.owner_contribution?.amount ?? 0) - limit) > 0.005
    ) {
      throw new Error(
        "Owned SEP contribution must follow the reviewed uniform rate and actual owner net earnings and limits",
      );
    }
    const employeeRefs = new Set<string>(), employeeSsns = new Set<string>();
    let employeeContribution = 0;
    for (const e of plan.employee_census) {
      if (
        employeeRefs.has(e.employee_reference) ||
        employeeSsns.has(e.employee_ssn) ||
        new Set(e.service_years).size !== e.service_years.length ||
        e.employee_ssn === ssn
      ) {
        throw new Error(
          "Owned SEP employee census must be distinct from its proprietor and complete",
        );
      }
      employeeRefs.add(e.employee_reference);
      employeeSsns.add(e.employee_ssn);
      const eligible =
        ageAtYearEnd(e.date_of_birth) >= plan.eligibility.minimum_age &&
        e.service_years.length >=
          plan.eligibility.minimum_prior_service_years &&
        e.compensation >= plan.eligibility.minimum_compensation;
      const expected = eligible
        ? Math.min(Math.min(e.compensation, 350000) * rate, 70000)
        : 0;
      if (
        eligible &&
          (!e.participant_information_delivery_reference ||
            (expected > 0 && !e.contribution)) ||
        Math.abs((e.contribution?.amount ?? 0) - expected) > 0.005
      ) {
        throw new Error(
          "Owned SEP must include the uniform contribution for every eligible census employee",
        );
      }
      if (e.contribution) verifyPayment(e.contribution, e.employee_ssn);
      employeeContribution += e.contribution?.amount ?? 0;
    }
    return {
      business_reference: plan.business_reference,
      recipient: plan.recipient,
      employer_ein: plan.employer_ein,
      plan_identifier: plan.plan_identifier,
      net_earnings: net,
      reduced_rate: rate / (1 + rate),
      raw_limit: limit,
      raw_deduction: Math.min(plan.owner_contribution?.amount ?? 0, limit),
      deduction: roundWholeDollars(
        Math.min(plan.owner_contribution?.amount ?? 0, limit),
      ),
      employee_contribution: employeeContribution,
    };
  });
  return {
    source,
    owned,
    rows,
    deduction: roundWholeDollars(
      rows.reduce((sum, r) => sum + r.raw_deduction, 0),
    ),
  };
}

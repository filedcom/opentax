import { z } from "zod";
import {
  arrangementQuoteContribution,
  cents,
  monthlyArrangementSchema,
  premiumMoney,
  validateArrangementRules,
} from "./arrangements.ts";
import {
  coverageTierSchema,
  coveredDependentSchema,
  enrollmentMonthCount,
  enrollmentPeriodSchema,
  monthCoverageDates,
} from "./shop_evidence.ts";

const reference = z.string().trim().min(1);
const id = z.string().regex(/^\d{9}$/);
const period = enrollmentPeriodSchema;
const eligibilityPeriod = period.extend({ shop_plan_reference: reference })
  .strict();
const dependentSchema = coveredDependentSchema.extend({
  plan_eligibility_records: z.array(
    z.object({
      shop_plan_reference: reference,
      plan_dependent_eligibility_source_reference: reference,
      eligible_plan_dependent_confirmed: z.literal(true),
    }).strict(),
  ).min(1).max(12),
}).strict();
const planSchema = z.object({
  payer_employment_ein: id,
  shop_marketplace_identifier: reference,
  shop_plan_reference: reference,
  qualified_shop_health_plan_confirmed: z.literal(true),
  qualified_shop_plan_source_reference: reference,
  employer_offering_source_reference: reference,
  offering_period: period,
}).strict();
const policySchema = monthlyArrangementSchema.partial({
  employee_only_rule: true,
  family_rule: true,
}).extend({
  contribution_application: z.enum(["own_qhp_rules", "reference_entitlement"]),
  family_coverage_offered: z.boolean(),
  all_plan_eligible_employees_identified_confirmed: z.literal(true),
  eligibility_roster_source_reference: reference,
  reference_contributions: z.array(
    z.object({
      employee_reference: reference,
      employee_ssn: id,
      contribution_source_reference: reference,
      employee_only_contribution: premiumMoney,
      family_contribution: premiumMoney.optional(),
    }).strict(),
  ).min(1).max(24).optional(),
}).strict();
const invoiceSchema = z.object({
  employee_ssn: id,
  payer_employment_ein: id,
  shop_plan_reference: reference,
  month: z.number().int().min(1).max(12),
  coverage_start_date: z.string(),
  coverage_end_date: z.string(),
  invoice_date: z.string(),
  payment_date: z.string(),
  coverage_tier: coverageTierSchema,
  covered_dependent_references: z.array(reference),
  billed_premium: premiumMoney.refine((n) => n > 0),
  employer_payment: premiumMoney,
  employer_policy_reference: reference,
  insured_quote_reference: reference,
  reference_policy_reference: reference.optional(),
  reference_contribution_source_reference: reference.optional(),
  shop_invoice_reference: reference,
  employer_payment_reference: reference,
}).strict();
export const multiplePlanEmployeeSchema = z.object({
  employee_reference: reference,
  employee_ssn: id,
  hours_of_service: z.number().int().min(1).max(2080),
  social_security_medicare_wages: z.number().int().positive(),
  enrollment_and_payroll_record_reference: reference,
  employment_period: period,
  plan_eligibility_periods: z.array(eligibilityPeriod).max(24),
  enrollment_selections: z.array(eligibilityPeriod).max(12),
  coverage_tier: coverageTierSchema,
  covered_dependents: z.array(dependentSchema).max(10),
  employer_premium_paid: premiumMoney,
  tax_year_shop_premium: premiumMoney,
  irs_2025_rating_area_average_premium: z.number().int().positive(),
  rating_area_state: z.string().regex(/^[A-Z]{2}$/),
  rating_area_county: reference,
}).strict();
export const multiplePlanReviewSchema = z.object({
  irs_table_tax_year: z.literal(2025),
  irs_table_source_url: z.literal("https://www.irs.gov/instructions/i8941"),
  irs_table_state: z.literal("NY"),
  irs_table_county: z.literal("Albany"),
  irs_table_employee_only_average_premium: z.literal(9358),
  irs_table_family_average_premium: z.literal(24527),
  table_review_reference: reference,
  employment_ein: id,
  payroll_ledger_reference: reference,
  shop_marketplace_identifier: reference,
  employee_premium_reviews: z.array(
    z.object({
      employee_reference: reference,
      employee_ssn: id,
      payroll_tax_year: z.literal(2025),
      payroll_employment_ein: id,
      payroll_hours_of_service: z.number().int().positive(),
      payroll_social_security_medicare_wages: z.number().int().positive(),
      enrollment_and_payroll_record_reference: reference,
      employment_period: period,
      plan_eligibility_periods: z.array(eligibilityPeriod).max(24),
      enrollment_selections: z.array(eligibilityPeriod).max(12),
      coverage_tier: coverageTierSchema,
      covered_dependents: z.array(dependentSchema).max(10),
      monthly_premiums: z.array(invoiceSchema).max(12),
    }).strict(),
  ).min(1).max(24),
}).strict();
export const multiplePlanFields = {
  qualifying_arrangement: z.literal("owned_multiple_qhp_monthly_eligibility"),
  multiple_qhp_method: z.enum(["qhp_by_qhp", "reference_qhp"]),
  reference_shop_plan_reference: reference.optional(),
  all_nonexcluded_payroll_employees_identified_confirmed: z.literal(true),
  all_offered_qhps_and_monthly_eligibility_identified_confirmed: z.literal(
    true,
  ),
  no_salary_reduction_or_tobacco_surcharge_in_employer_premiums_confirmed: z
    .literal(true),
  no_wellness_or_state_law_contribution_adjustment_confirmed: z.literal(true),
  offered_qhps: z.array(planSchema).min(2).max(12),
  monthly_plan_arrangements: z.array(policySchema).min(2).max(144),
  employees: z.array(multiplePlanEmployeeSchema).min(1).max(24),
  shop_review: multiplePlanReviewSchema,
};
const contractSchema = z.object({
  ...multiplePlanFields,
  owner_ssn: id,
  employment_ein: id,
  shop_plan_reference: reference,
  payroll_ledger_reference: reference,
  shop_marketplace_identifier: reference,
}).passthrough();
type Contract = z.infer<typeof contractSchema>;
function fail(message: string): never {
  throw new Error(`Form 8941 multiple QHP ${message}`);
}
function monthSet(p: z.infer<typeof period>) {
  enrollmentMonthCount({ employee_reference: "period", enrollment_period: p });
  return new Set(
    Array.from(
      { length: p.last_month - p.first_month + 1 },
      (_, i) => p.first_month + i,
    ),
  );
}
function dated(value: string) {
  const d = new Date(value);
  return /^2025-\d{2}-\d{2}$/.test(value) && Number.isFinite(d.getTime()) &&
    d.toISOString().slice(0, 10) === value;
}
/** Source-owned plan eligibility determines quote denominators, not enrollment. */
export function multiplePlanWorksheet(raw: unknown) {
  const s: Contract = contractSchema.parse(raw);
  const documents = new Set<string>();
  const add = (r: string) => {
    if (documents.has(r)) fail("source reference is reused");
    documents.add(r);
  };
  add(s.payroll_ledger_reference);
  add(s.shop_review.table_review_reference);
  if (
    s.shop_review.employment_ein !== s.employment_ein ||
    s.shop_review.payroll_ledger_reference !== s.payroll_ledger_reference ||
    s.shop_review.shop_marketplace_identifier !== s.shop_marketplace_identifier
  ) fail("review employer differs");
  const plans = new Map(s.offered_qhps.map((p) => [p.shop_plan_reference, p]));
  if (
    plans.size !== s.offered_qhps.length || !plans.has(s.shop_plan_reference)
  ) fail("offered plan identity differs");
  for (const p of plans.values()) {
    if (
      p.payer_employment_ein !== s.employment_ein ||
      p.shop_marketplace_identifier !== s.shop_marketplace_identifier
    ) fail("offered QHP employer or SHOP differs");
    add(p.qualified_shop_plan_source_reference);
    add(p.employer_offering_source_reference);
    add(p.offering_period.enrollment_source_reference);
    monthSet(p.offering_period);
  }
  const referenceMethod = s.multiple_qhp_method === "reference_qhp";
  if (
    referenceMethod !== Boolean(s.reference_shop_plan_reference) ||
    (referenceMethod && !plans.has(s.reference_shop_plan_reference!))
  ) fail("designated reference plan differs");
  const employees = new Map(s.employees.map((e) => [e.employee_reference, e]));
  const ssns = new Set([s.owner_ssn]);
  if (employees.size !== s.employees.length) {
    fail("payroll employee identity is duplicated");
  }
  const eligibility = new Map<string, Set<number>>();
  const selections = new Map<string, Map<number, string>>();
  const dependents = new Set<string>();
  for (const e of employees.values()) {
    if (ssns.has(e.employee_ssn)) {
      fail("payroll employee SSN is duplicated or proprietor-owned");
    }
    ssns.add(e.employee_ssn);
    add(e.enrollment_and_payroll_record_reference);
    add(e.employment_period.enrollment_source_reference);
    const employed = monthSet(e.employment_period);
    if (
      e.rating_area_state !== "NY" || e.rating_area_county !== "Albany" ||
      e.irs_2025_rating_area_average_premium !==
        (e.coverage_tier === "family" ? 24527 : 9358)
    ) fail("employee IRS table differs");
    if ((e.coverage_tier === "family") !== (e.covered_dependents.length > 0)) {
      fail("covered family membership differs");
    }
    for (const d of e.covered_dependents) {
      if (
        dependents.has(d.dependent_reference) || ssns.has(d.dependent_ssn) ||
        s.employees.some((x) => x.employee_ssn === d.dependent_ssn)
      ) fail("dependent identity is reused or employee-owned");
      dependents.add(d.dependent_reference);
      ssns.add(d.dependent_ssn);
      add(d.enrollment_source_reference);
      const seenPlans = new Set<string>();
      for (const eligibility of d.plan_eligibility_records) {
        if (
          !plans.has(eligibility.shop_plan_reference) ||
          seenPlans.has(eligibility.shop_plan_reference)
        ) fail("dependent plan eligibility differs");
        seenPlans.add(eligibility.shop_plan_reference);
        add(eligibility.plan_dependent_eligibility_source_reference);
      }
      if (
        e.enrollment_selections.some((p) =>
          !seenPlans.has(p.shop_plan_reference)
        )
      ) fail("dependent is not eligible in a selected QHP");
    }
    for (const p of e.plan_eligibility_periods) {
      add(p.enrollment_source_reference);
      const offered = plans.get(p.shop_plan_reference);
      if (!offered) fail("eligibility plan is not offered");
      const offeredMonths = monthSet(offered.offering_period);
      const key = e.employee_reference + ":" + p.shop_plan_reference;
      const set = eligibility.get(key) ?? new Set<number>();
      for (const m of monthSet(p)) {
        if (!employed.has(m) || !offeredMonths.has(m) || set.has(m)) {
          fail("eligibility is outside employment/offering or duplicated");
        }
        set.add(m);
      }
      eligibility.set(key, set);
    }
    const selected = new Map<number, string>();
    for (const p of e.enrollment_selections) {
      add(p.enrollment_source_reference);
      for (const m of monthSet(p)) {
        if (
          selected.has(m) ||
          !eligibility.get(e.employee_reference + ":" + p.shop_plan_reference)
            ?.has(m)
        ) fail("enrollment is duplicated or ineligible");
        selected.set(m, p.shop_plan_reference);
      }
    }
    selections.set(e.employee_reference, selected);
  }
  if (referenceMethod) {
    for (const e of employees.values()) {
      for (let month = 1; month <= 12; month++) {
        const anyEligible = [...plans.keys()].some((plan) =>
          eligibility.get(e.employee_reference + ":" + plan)?.has(month)
        );
        if (
          anyEligible &&
          !eligibility.get(
            e.employee_reference + ":" + s.reference_shop_plan_reference,
          )?.has(month)
        ) fail("reference QHP is not available to every eligible employee");
      }
    }
  }
  const policyKey = (plan: string, month: number) => plan + ":" + month;
  const policies = new Map<
    string,
    Contract["monthly_plan_arrangements"][number]
  >();
  for (const p of s.monthly_plan_arrangements) {
    const key = policyKey(p.shop_plan_reference, p.month);
    const offered = plans.get(p.shop_plan_reference);
    const dates = monthCoverageDates(p.month);
    if (
      policies.has(key) || !offered ||
      !monthSet(offered.offering_period).has(p.month) ||
      p.payer_employment_ein !== s.employment_ein ||
      p.coverage_start_date !== dates.start || p.coverage_end_date !== dates.end
    ) fail("policy month/plan/owner differs");
    add(p.employer_policy_reference);
    add(p.eligibility_roster_source_reference);
    const roster = s.employees.filter((e) =>
      eligibility.get(e.employee_reference + ":" + p.shop_plan_reference)?.has(
        p.month,
      )
    );
    const quoted = new Set<string>();
    for (const q of p.eligible_employee_quotes) {
      const e = employees.get(q.employee_reference);
      if (
        !e || q.employee_ssn !== e.employee_ssn || !roster.includes(e) ||
        quoted.has(q.employee_reference)
      ) fail("quote is duplicated, wrong-owned or ineligible");
      quoted.add(q.employee_reference);
      add(q.quote_source_reference);
      if (
        p.family_coverage_offered !== (q.family_premium !== undefined) ||
        (q.family_premium !== undefined &&
          q.family_premium < q.employee_only_premium)
      ) fail("offered tier reference premium differs");
    }
    if (quoted.size !== roster.length) {
      fail("eligible quote roster is incomplete");
    }
    if (p.billing_method === "composite") {
      const first = p.eligible_employee_quotes[0];
      if (
        p.eligible_employee_quotes.some((q) =>
          q.employee_only_premium !== first.employee_only_premium ||
          q.family_premium !== first.family_premium
        )
      ) fail("composite reference quotes differ");
    }
    // Reference-only selected plans have actual insurer quotes, while their
    // contribution entitlement is defined by the designated reference policy.
    const ownRules = !referenceMethod ||
      p.shop_plan_reference === s.reference_shop_plan_reference;
    if (ownRules) {
      if (
        p.contribution_application !== "own_qhp_rules" ||
        !p.employee_only_rule ||
        Boolean(p.family_rule) !== p.family_coverage_offered
      ) fail("owned contribution rules are missing");
      validateArrangementRules({
        ...p,
        employee_only_rule: p.employee_only_rule,
      });
    } else if (
      p.contribution_application !== "reference_entitlement" ||
      p.employee_only_rule !== undefined || p.family_rule !== undefined
    ) fail("selected reference-method plan must use reference entitlement");
    if (!referenceMethod && p.reference_contributions !== undefined) {
      fail("independent plan has reference contributions");
    }
    if (
      referenceMethod &&
      p.shop_plan_reference === s.reference_shop_plan_reference
    ) {
      const contributions = p.reference_contributions;
      if (!contributions || contributions.length !== roster.length) {
        fail("reference contribution roster is incomplete");
      }
      const seen = new Set<string>();
      for (const c of contributions) {
        const q = p.eligible_employee_quotes.find((q) =>
          q.employee_reference === c.employee_reference
        );
        if (
          !q || q.employee_ssn !== c.employee_ssn ||
          seen.has(c.employee_reference)
        ) fail("reference contribution employee differs");
        seen.add(c.employee_reference);
        add(c.contribution_source_reference);
        arrangementQuoteContribution(
          { ...p, employee_only_rule: p.employee_only_rule! },
          q,
          "employee_only",
          c.employee_only_contribution,
        );
        if (
          p.family_coverage_offered !== (c.family_contribution !== undefined)
        ) fail("reference family contribution is missing");
        if (c.family_contribution !== undefined) {
          arrangementQuoteContribution(
            { ...p, employee_only_rule: p.employee_only_rule! },
            q,
            "family",
            c.family_contribution,
          );
        }
      }
    } else if (p.reference_contributions !== undefined) {
      fail("contributions belong only to the designated reference plan");
    }
    policies.set(key, p);
  }
  for (const p of plans.values()) {
    for (const m of monthSet(p.offering_period)) {
      const roster = s.employees.filter((e) =>
        eligibility.get(e.employee_reference + ":" + p.shop_plan_reference)
          ?.has(m)
      );
      if (
        roster.length && !policies.has(policyKey(p.shop_plan_reference, m))
      ) fail("offered eligible plan month has no policy");
      if (
        !roster.length && policies.has(policyKey(p.shop_plan_reference, m))
      ) fail("empty eligible plan month has a policy");
    }
  }
  if (s.shop_review.employee_premium_reviews.length !== employees.size) {
    fail("annual payroll review roster is incomplete");
  }
  const reviewed = new Set<string>();
  const rows = [];
  for (const r of s.shop_review.employee_premium_reviews) {
    const e = employees.get(r.employee_reference);
    if (!e || reviewed.has(r.employee_reference)) {
      fail("review employee is unknown or duplicated");
    }
    reviewed.add(r.employee_reference);
    if (
      r.employee_ssn !== e.employee_ssn ||
      r.payroll_employment_ein !== s.employment_ein ||
      Math.min(r.payroll_hours_of_service, 2080) !== e.hours_of_service ||
      r.payroll_social_security_medicare_wages !==
        e.social_security_medicare_wages ||
      r.enrollment_and_payroll_record_reference !==
        e.enrollment_and_payroll_record_reference
    ) fail("payroll ownership or amounts differ");
    for (
      const field of [
        "employment_period",
        "plan_eligibility_periods",
        "enrollment_selections",
        "coverage_tier",
        "covered_dependents",
      ] as const
    ) {
      if (JSON.stringify(r[field]) !== JSON.stringify(e[field])) {
        fail("review eligibility or enrollment record differs");
      }
    }
    const selected = selections.get(e.employee_reference)!;
    const billedMonths = new Set<number>();
    let billed = 0;
    let paid = 0;
    for (const invoice of r.monthly_premiums) {
      const plan = selected.get(invoice.month);
      const p = policies.get(
        policyKey(invoice.shop_plan_reference, invoice.month),
      );
      const dates = monthCoverageDates(invoice.month);
      if (
        !p || plan !== invoice.shop_plan_reference ||
        billedMonths.has(invoice.month) ||
        invoice.employee_ssn !== e.employee_ssn ||
        invoice.payer_employment_ein !== s.employment_ein ||
        invoice.coverage_start_date !== dates.start ||
        invoice.coverage_end_date !== dates.end ||
        !dated(invoice.invoice_date) || !dated(invoice.payment_date)
      ) fail("invoice/payment eligibility, ownership or dates differ");
      billedMonths.add(invoice.month);
      add(invoice.shop_invoice_reference);
      add(invoice.employer_payment_reference);
      const q = p.eligible_employee_quotes.find((q) =>
        q.employee_reference === e.employee_reference
      )!;
      const premium = e.coverage_tier === "family"
        ? q.family_premium
        : q.employee_only_premium;
      if (
        premium === undefined ||
        cents(premium) !== cents(invoice.billed_premium) ||
        invoice.insured_quote_reference !== q.quote_source_reference ||
        invoice.employer_policy_reference !== p.employer_policy_reference ||
        invoice.coverage_tier !== e.coverage_tier ||
        JSON.stringify([...invoice.covered_dependent_references].sort()) !==
          JSON.stringify(
            e.covered_dependents.map((d) => d.dependent_reference).sort(),
          )
      ) fail("invoice premium, policy, quote or family join differs");
      let pct: number;
      let refContribution: string | undefined;
      let referenceEntitlement: number | undefined;
      if (referenceMethod) {
        const reference = policies.get(
          policyKey(s.reference_shop_plan_reference!, invoice.month),
        );
        const c = reference?.reference_contributions?.find((c) =>
          c.employee_reference === e.employee_reference
        );
        if (
          !reference || !c ||
          !eligibility.get(
            e.employee_reference + ":" + s.reference_shop_plan_reference,
          )?.has(invoice.month)
        ) fail("selected employee is not reference-plan eligible");
        const entitlement = e.coverage_tier === "family"
          ? c.family_contribution
          : c.employee_only_contribution;
        if (
          entitlement === undefined ||
          cents(Math.min(entitlement, premium)) !==
            cents(invoice.employer_payment) ||
          invoice.reference_policy_reference !==
            reference.employer_policy_reference ||
          invoice.reference_contribution_source_reference !==
            c.contribution_source_reference
        ) fail("selected payment differs from owned reference entitlement");
        referenceEntitlement = entitlement;
        pct = invoice.employer_payment / premium;
        refContribution = c.contribution_source_reference;
      } else {
        if (
          invoice.reference_policy_reference !== undefined ||
          invoice.reference_contribution_source_reference !== undefined
        ) fail("independent invoice has a reference join");
        pct = arrangementQuoteContribution(
          { ...p, employee_only_rule: p.employee_only_rule! },
          q,
          e.coverage_tier,
          invoice.employer_payment,
        ).adjustmentPercentage;
      }
      billed += invoice.billed_premium;
      paid += invoice.employer_payment;
      rows.push({
        employee_reference: e.employee_reference,
        month: invoice.month,
        shop_plan_reference: plan,
        coverage_tier: e.coverage_tier,
        employer_policy_reference: p.employer_policy_reference,
        insured_quote_reference: q.quote_source_reference,
        reference_contribution_source_reference: refContribution,
        reference_entitlement: referenceEntitlement,
        unused_reference_entitlement: referenceEntitlement === undefined
          ? undefined
          : (cents(referenceEntitlement) - cents(invoice.employer_payment)) /
            100,
        billed_premium: invoice.billed_premium,
        employer_payment: invoice.employer_payment,
        adjusted_average_percentage: pct,
        adjusted_average_premium: e.irs_2025_rating_area_average_premium / 12 *
          pct,
      });
    }
    if (
      billedMonths.size !== selected.size ||
      cents(billed) !== cents(e.tax_year_shop_premium) ||
      cents(paid) !== cents(e.employer_premium_paid)
    ) fail("annual enrollment or premium total differs");
  }
  return {
    rows,
    enrolledEmployeeReferences: [...selections].filter(([, v]) => v.size > 0)
      .map(([k]) => k),
  };
}

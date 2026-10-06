import { form8941ArrangementSource } from "./review-8941-arrangements.fixture.ts";
import { form8941OwnedInputs } from "./review-8941-owned.fixture.ts";
import {
  calculateForm8941,
  inputSchema,
} from "../../nodes/inputs/f8941/index.ts";
import {
  arrangementQuoteContribution,
  type MonthlyArrangement,
} from "../../nodes/inputs/f8941/arrangements.ts";
import { monthCoverageDates } from "../../nodes/inputs/f8941/shop_evidence.ts";
import { extractFilerIdentity } from "../../mef/filer.ts";
import type { PdfReviewFixture } from "./review-fixtures.ts";
export const multiplePlanKinds = [
  "independent-mixed",
  "reference-composite",
  "reference-cheaper",
  "reference-list",
] as const;
export type MultiplePlanKind = typeof multiplePlanKinds[number];
const money = (n: number) => Math.round(n * 100) / 100;
const period = (name: string, first = 1, last = 12) => ({
  first_month: first,
  last_month: last,
  coverage_start_date: monthCoverageDates(first).start,
  coverage_end_date: monthCoverageDates(last).end,
  enrollment_source_reference: name,
});
/** First-year synthetic SHOP records, including actual changing eligibility and a declined worker. */
export function form8941MultiplePlanSource(kind: MultiplePlanKind) {
  const original = form8941ArrangementSource("list-self-computed-family-floor");
  const {
    all_nonexcluded_employees_enrolled_verified: _all,
    monthly_arrangements: _policy,
    all_identified_employees_plan_eligible_every_policy_month_confirmed:
      _annual,
    all_plan_eligible_employees_identified_confirmed: _eligible,
    proprietor_and_excluded_workers_not_plan_eligible_confirmed: _excluded,
    identified_shop_tier_calendar_month_coverage_confirmed: _tier,
    qualified_shop_health_plan_confirmed: _qhp,
    qualified_shop_plan_source_reference: _qhpRef,
    all_enrollment_invoice_payment_records_identified_confirmed: _records,
    ...common
  } = original;
  const referenceMethod = kind !== "independent-mixed";
  const plans = ["Synthetic-QHP-A", "Synthetic-QHP-B"];
  const roster = [...original.employees, {
    ...original.employees[4],
    employee_reference: "Synthetic worker-six-declined",
    employee_ssn: "666554444",
    enrollment_and_payroll_record_reference: "Synthetic payroll-six",
    coverage_tier: "employee_only" as const,
    covered_dependents: [],
    irs_2025_rating_area_average_premium: 9358,
  }];
  const employees = roster.map((e, index) => {
    const {
      enrollment_period: _period,
      covered_dependents_all_enrolled_for_employee_period_confirmed: _members,
      ...base
    } = e;
    const first = index === 2 ? 4 : 1, last = index === 3 ? 9 : 12;
    const eligibleFirst = index === 2 ? 6 : 1;
    const selection = index === 5 ? [] : index === 0
      ? [{
        ...period(`Synthetic enrollment-${index}-A`, 1, 6),
        shop_plan_reference: plans[0],
      }, {
        ...period(`Synthetic enrollment-${index}-B`, 7, 12),
        shop_plan_reference: plans[1],
      }]
      : [{
        ...period(`Synthetic enrollment-${index}`, eligibleFirst, last),
        shop_plan_reference: plans[index % 2],
      }];
    return {
      ...base,
      covered_dependents: base.covered_dependents.map((d) => ({
        ...d,
        plan_eligibility_records: plans.map((plan) => ({
          shop_plan_reference: plan,
          plan_dependent_eligibility_source_reference:
            `Synthetic dependent eligibility-${d.dependent_reference}-${plan}`,
          eligible_plan_dependent_confirmed: true as const,
        })),
      })),
      hours_of_service: index === 2 || index === 3 ? 1560 : 2080,
      social_security_medicare_wages: index === 2 || index === 3
        ? 15000
        : 20000,
      employment_period: period(`Synthetic employment-${index}`, first, last),
      plan_eligibility_periods: plans.map((plan) => ({
        ...period(
          `Synthetic eligibility-${index}-${plan}`,
          eligibleFirst,
          last,
        ),
        shop_plan_reference: plan,
      })),
      enrollment_selections: selection,
      employer_premium_paid: 0,
      tax_year_shop_premium: 0,
    };
  });
  const eligible = (e: typeof employees[number], month: number) =>
    e.plan_eligibility_periods[0].first_month <= month &&
    month <= e.plan_eligibility_periods[0].last_month;
  const monthly_plan_arrangements = plans.flatMap((plan, planIndex) =>
    Array.from({ length: 12 }, (_, i) => {
      const month = i + 1, change = month >= 7 ? 25 : 0;
      const composite = planIndex === 0 && kind !== "reference-list";
      const quotes = employees.flatMap((e, index) =>
        eligible(e, month)
          ? [{
            employee_reference: e.employee_reference,
            employee_ssn: e.employee_ssn,
            quote_source_reference:
              `Synthetic quote-${planIndex}-${index}-${month}`,
            employee_only_premium: (composite
              ? 1000.05
              : ([900.05, 1000.05, 1100.05, 1200.05, 1800.05, 3000.05][index] +
                planIndex * 200)) + change,
            family_premium:
              (composite ? 2400.07 : 2100.07 + index * 300 + planIndex * 400) +
              change,
          }]
          : []
      );
      const own = !referenceMethod || planIndex === 0;
      const rules = composite
        ? {
          employee_only_rule: {
            method: "uniform_percentage" as const,
            employer_basis_points: 6000,
          },
          family_rule: {
            method: "uniform_employer_amount" as const,
            employer_monthly_contribution: money((1000.05 + change) * .6),
          },
        }
        : {
          employee_only_rule: referenceMethod
            ? {
              method: "uniform_employee_contribution" as const,
              employee_monthly_contribution: 650.01,
            }
            : {
              method: "uniform_percentage" as const,
              employer_basis_points: 5500,
            },
          family_rule: referenceMethod
            ? { method: "employee_only_floor" as const }
            : {
              method: "uniform_percentage" as const,
              employer_basis_points: 6000,
            },
        };
      if (kind === "reference-cheaper" && planIndex === 1) {
        for (const quote of quotes) {
          quote.employee_only_premium = 400.05 + change;
          quote.family_premium = 500.07 + change;
        }
      }
      const policy = {
        month,
        employer_policy_reference: `Synthetic policy-${planIndex}-${month}`,
        payer_employment_ein: original.employment_ein,
        shop_plan_reference: plan,
        coverage_start_date: monthCoverageDates(month).start,
        coverage_end_date: monthCoverageDates(month).end,
        billing_method: composite ? "composite" as const : "list" as const,
        eligible_employee_quotes: quotes,
        ...rules,
      };
      const contributions = referenceMethod && planIndex === 0
        ? quotes.map((q) => ({
          employee_reference: q.employee_reference,
          employee_ssn: q.employee_ssn,
          contribution_source_reference:
            `Synthetic entitlement-${q.employee_reference}-${month}`,
          employee_only_contribution:
            arrangementQuoteContribution(policy, q, "employee_only")
              .employerPayment,
          family_contribution:
            arrangementQuoteContribution(policy, q, "family").employerPayment,
        }))
        : undefined;
      return {
        ...policy,
        ...(own
          ? {}
          : { employee_only_rule: undefined, family_rule: undefined }),
        contribution_application: own
          ? "own_qhp_rules" as const
          : "reference_entitlement" as const,
        family_coverage_offered: true,
        all_plan_eligible_employees_identified_confirmed: true as const,
        eligibility_roster_source_reference:
          `Synthetic eligibility-roster-${planIndex}-${month}`,
        reference_contributions: contributions,
      };
    })
  );
  const employee_premium_reviews = employees.map((e, index) => {
    const monthly_premiums = e.enrollment_selections.flatMap((selection) =>
      Array.from(
        { length: selection.last_month - selection.first_month + 1 },
        (_, i) => {
          const month = selection.first_month + i,
            p = monthly_plan_arrangements.find((p) =>
              p.month === month &&
              p.shop_plan_reference === selection.shop_plan_reference
            )!;
          const quote = p.eligible_employee_quotes.find((q) =>
            q.employee_reference === e.employee_reference
          )!;
          const reference = monthly_plan_arrangements.find((p) =>
            p.month === month && p.shop_plan_reference === plans[0]
          )!;
          const c = reference.reference_contributions?.find((c) =>
            c.employee_reference === e.employee_reference
          );
          const billed = e.coverage_tier === "family"
            ? quote.family_premium
            : quote.employee_only_premium;
          const paid = referenceMethod
            ? (e.coverage_tier === "family"
              ? c!.family_contribution
              : c!.employee_only_contribution)
            : arrangementQuoteContribution(
              p as MonthlyArrangement,
              quote,
              e.coverage_tier,
            ).employerPayment;
          return {
            employee_ssn: e.employee_ssn,
            payer_employment_ein: original.employment_ein,
            shop_plan_reference: selection.shop_plan_reference,
            month,
            coverage_start_date: monthCoverageDates(month).start,
            coverage_end_date: monthCoverageDates(month).end,
            invoice_date: `2025-${String(month).padStart(2, "0")}-05`,
            payment_date: `2025-${String(month).padStart(2, "0")}-15`,
            coverage_tier: e.coverage_tier,
            covered_dependent_references: e.covered_dependents.map((d) =>
              d.dependent_reference
            ),
            billed_premium: billed,
            employer_payment: money(Math.min(paid, billed)),
            employer_policy_reference: p.employer_policy_reference,
            insured_quote_reference: quote.quote_source_reference,
            ...(referenceMethod
              ? {
                reference_policy_reference: reference.employer_policy_reference,
                reference_contribution_source_reference:
                  c!.contribution_source_reference,
              }
              : {}),
            shop_invoice_reference: `Synthetic invoice-${index}-${month}`,
            employer_payment_reference: `Synthetic payment-${index}-${month}`,
          };
        },
      )
    );
    e.tax_year_shop_premium = money(
      monthly_premiums.reduce((sum, m) => sum + m.billed_premium, 0),
    );
    e.employer_premium_paid = money(
      monthly_premiums.reduce((sum, m) => sum + m.employer_payment, 0),
    );
    return {
      employee_reference: e.employee_reference,
      employee_ssn: e.employee_ssn,
      payroll_tax_year: 2025 as const,
      payroll_employment_ein: original.employment_ein,
      payroll_hours_of_service: e.hours_of_service,
      payroll_social_security_medicare_wages: e.social_security_medicare_wages,
      enrollment_and_payroll_record_reference:
        e.enrollment_and_payroll_record_reference,
      employment_period: e.employment_period,
      plan_eligibility_periods: e.plan_eligibility_periods,
      enrollment_selections: e.enrollment_selections,
      coverage_tier: e.coverage_tier,
      covered_dependents: e.covered_dependents,
      monthly_premiums,
    };
  });
  const parsed = inputSchema.parse({
    ...common,
    qualifying_arrangement: "owned_multiple_qhp_monthly_eligibility",
    multiple_qhp_method: referenceMethod ? "reference_qhp" : "qhp_by_qhp",
    reference_shop_plan_reference: referenceMethod ? plans[0] : undefined,
    shop_plan_reference: plans[0],
    all_nonexcluded_payroll_employees_identified_confirmed: true,
    all_offered_qhps_and_monthly_eligibility_identified_confirmed: true,
    offered_qhps: plans.map((plan, index) => ({
      shop_plan_reference: plan,
      payer_employment_ein: original.employment_ein,
      shop_marketplace_identifier: original.shop_marketplace_identifier,
      qualified_shop_health_plan_confirmed: true,
      qualified_shop_plan_source_reference: `Synthetic QHP source-${index}`,
      employer_offering_source_reference: `Synthetic offering-${index}`,
      offering_period: period(`Synthetic offer-calendar-${index}`),
    })),
    monthly_plan_arrangements,
    employees,
    shop_review: {
      irs_table_tax_year: 2025,
      irs_table_source_url: "https://www.irs.gov/instructions/i8941",
      irs_table_state: "NY",
      irs_table_county: "Albany",
      irs_table_employee_only_average_premium: 9358,
      irs_table_family_average_premium: 24527,
      table_review_reference: "Synthetic multi-plan table review",
      employment_ein: original.employment_ein,
      payroll_ledger_reference: original.payroll_ledger_reference,
      shop_marketplace_identifier: original.shop_marketplace_identifier,
      employee_premium_reviews,
    },
  });
  if (!("schedule_c_business_reference" in parsed)) {
    throw new Error("Expected Schedule C multiple-QHP source");
  }
  return parsed as Extract<
    ReturnType<typeof inputSchema.parse>,
    { schedule_c_business_reference: string }
  >;
}
export function form8941MultiplePlanInputs(
  kind: MultiplePlanKind,
  receipts = 350000,
) {
  const input = form8941OwnedInputs(receipts),
    source = form8941MultiplePlanSource(kind),
    lines = calculateForm8941(source);
  if (!("monthly_plan_arrangements" in source)) {
    throw new Error("Expected owned multiple-QHP source");
  }
  return {
    ...input,
    f8941: source,
    schedule_c: input.schedule_c.map((b) => ({
      ...b,
      line_26_wages: source.employees.reduce(
        (sum, e) => sum + e.social_security_medicare_wages,
        0,
      ),
      line_14_employee_benefits: source.other_schedule_c_employee_benefits +
        lines.line4,
    })),
  };
}
export function form8941MultiplePlanReviewFixture(): PdfReviewFixture {
  const inputs = form8941MultiplePlanInputs("reference-list");
  return {
    id: "single-shop-multiple-qhp-reference-eligibility",
    inputs,
    filer: extractFilerIdentity(inputs.general)!,
    expectedPdfForms: [
      "f1040",
      "schedule1",
      "schedule2",
      "schedule3",
      "schedule_c",
      "schedule_se",
      "f3800",
      "form6251",
      "form8995",
      "f8941",
      "form8959",
      "form8960",
    ],
    reviewFocus: [
      "Two owned QHPs retain monthly eligible rosters, hypothetical reference contributions and actual employee enrollment selections",
      "Annual payroll includes a wholly unenrolled employee; actual enrollment and midyear hire/waiting/termination records drive separate Worksheet4 counts",
      "Full determined credit reduces gross premiums before SE/QBI/1040; source cents and every invoice/payment/reference join reconcile native and PDF",
    ],
  };
}

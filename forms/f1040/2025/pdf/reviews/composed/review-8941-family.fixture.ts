import { form8941PartYearSource } from "./review-8941-partyear.fixture.ts";
import { form8941OwnedInputs } from "./review-8941-owned.fixture.ts";
import { monthCoverageDates } from "../../../../nodes/inputs/f8941/shop_evidence.ts";
import { calculateForm8941 } from "../../../../nodes/inputs/f8941/index.ts";
import { extractFilerIdentity } from "../../../../mef/filer.ts";
import type { PdfReviewFixture } from "../../review-fixtures.ts";

/** Synthetic qualified plan records, uniform 50% in each composite billing tier. */
export function form8941FamilySource(allFamily = false, partYear = false) {
  const partial = form8941PartYearSource();
  const {
    employee_only_calendar_month_coverage_verified: _old,
    employees: _employees,
    shop_review,
    ...common
  } = partial;
  const employees = partial.employees.map((employee, index) => {
    const { tax_year_employee_only_shop_premium: _premium, ...base } = employee;
    const family = allFamily || index % 2 === 0;
    const first = partYear ? employee.enrollment_period.first_month : 1;
    const last = partYear ? employee.enrollment_period.last_month : 12;
    const months = last - first + 1;
    const dependents = family
      ? [{
        dependent_reference: `EMP-${index + 1}-SPOUSE`,
        dependent_ssn: `55566000${index + 1}`,
        relationship_to_employee: "spouse" as const,
        eligible_plan_dependent_confirmed: true as const,
        enrollment_source_reference: `Synthetic SHOP dependent policy-${
          index + 1
        }`,
      }, {
        dependent_reference: `EMP-${index + 1}-CHILD`,
        dependent_ssn: `66677000${index + 1}`,
        relationship_to_employee: "child" as const,
        eligible_plan_dependent_confirmed: true as const,
        enrollment_source_reference: `Synthetic SHOP child policy-${index + 1}`,
      }]
      : [];
    return {
      ...base,
      hours_of_service: partYear ? employee.hours_of_service : 2080,
      social_security_medicare_wages: partYear
        ? employee.social_security_medicare_wages
        : 20000,
      coverage_tier: family ? "family" as const : "employee_only" as const,
      covered_dependents_all_enrolled_for_employee_period_confirmed:
        true as const,
      covered_dependents: dependents,
      irs_2025_rating_area_average_premium: family ? 24527 : 9358,
      tax_year_shop_premium: months * (family ? 2400 : 1000),
      employer_premium_paid: months * (family ? 1200 : 500),
      enrollment_period: {
        ...employee.enrollment_period,
        first_month: first,
        last_month: last,
        coverage_start_date: monthCoverageDates(first).start,
        coverage_end_date: monthCoverageDates(last).end,
      },
    };
  });
  return {
    ...common,
    identified_shop_tier_calendar_month_coverage_confirmed: true as const,
    qualified_shop_health_plan_confirmed: true as const,
    qualified_shop_plan_source_reference:
      "Synthetic 2025 SHOP QHP certificate NY-PLAN-1",
    no_wellness_or_state_law_contribution_adjustment_confirmed: true as const,
    qualifying_arrangement: "uniform_percentage_each_tier" as const,
    insurer_billing_method: "composite_tier_rate" as const,
    no_salary_reduction_or_tobacco_surcharge_in_employer_premiums_confirmed:
      true as const,
    employees,
    shop_review: {
      ...shop_review,
      irs_table_family_average_premium: 24527,
      employee_premium_reviews: employees.map((employee, index) => ({
        ...shop_review.employee_premium_reviews[index],
        payroll_hours_of_service: index === 0
          ? 2300
          : employee.hours_of_service,
        payroll_social_security_medicare_wages:
          employee.social_security_medicare_wages,
        enrollment_period: employee.enrollment_period,
        coverage_tier: employee.coverage_tier,
        covered_dependents: employee.covered_dependents,
        monthly_premiums: Array.from({
          length: employee.enrollment_period.last_month -
            employee.enrollment_period.first_month + 1,
        }, (_, offset) => {
          const month = employee.enrollment_period.first_month + offset;
          const dates = monthCoverageDates(month);
          const family = employee.coverage_tier === "family";
          return {
            employee_ssn: employee.employee_ssn,
            payer_employment_ein: common.employment_ein,
            shop_plan_reference: common.shop_plan_reference,
            coverage_tier: employee.coverage_tier,
            covered_dependent_references: employee.covered_dependents.map((d) =>
              d.dependent_reference
            ),
            month,
            coverage_start_date: dates.start,
            coverage_end_date: dates.end,
            invoice_date: dates.start,
            payment_date: `2025-${String(month).padStart(2, "0")}-15`,
            billed_premium: family ? 2400 : 1000,
            employer_payment: family ? 1200 : 500,
            shop_invoice_reference: `Synthetic tier invoice-${
              index + 1
            }-${month}`,
            employer_payment_reference: `Synthetic tier payment-${
              index + 1
            }-${month}`,
          };
        }),
      })),
    },
  };
}
export function form8941FamilyInputs(
  receipts = 325000,
  allFamily = false,
  partYear = false,
) {
  const input = form8941OwnedInputs(receipts);
  const source = form8941FamilySource(allFamily, partYear);
  const lines = calculateForm8941(source);
  return {
    ...input,
    f8941: source,
    schedule_c: input.schedule_c.map((business) => ({
      ...business,
      line_26_wages: source.employees.reduce(
        (sum, e) => sum + e.social_security_medicare_wages,
        0,
      ),
      line_14_employee_benefits: source.other_schedule_c_employee_benefits +
        lines.line4,
    })),
  };
}
export function form8941FamilyReviewFixture(): PdfReviewFixture {
  const inputs = form8941FamilyInputs();
  return {
    id: "single-shop-mixed-family-tiers",
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
    ],
    reviewFocus: [
      "Owned full-year family and employee-only tiers retain dependent enrollment and distinct monthly employer payments",
      "Uniform 50% composite tiers use Albany family24527 and employee-only9358 table values; cap46149 and determined credit23075",
      "Full determined credit reduces gross benefits before SE/QBI/1040; source and tax-use allocation bind native and PDF packets",
    ],
  };
}

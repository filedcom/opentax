import { form8941DirectFixture } from "../../../../nodes/inputs/f8941/fixture.ts";
import { monthCoverageDates } from "../../../../nodes/inputs/f8941/shop_evidence.ts";
import { form8941OwnedInputs } from "./review-8941-owned.fixture.ts";
import { calculateForm8941 } from "../../../../nodes/inputs/f8941/index.ts";
import { extractFilerIdentity } from "../../../../mef/filer.ts";
import type { PdfReviewFixture } from "../../review-fixtures.ts";

/** Nonseasonal employee payroll is annual; coverage dates determine only premiums. */
export function form8941PartYearSource() {
  const full = form8941DirectFixture();
  const {
    full_year_employee_only_coverage_verified: _full,
    employees: _employees,
    shop_review,
    ...common
  } = full;
  const periods = [
    { first: 7, last: 12, hours: 2080, wages: 20000 },
    { first: 4, last: 12, hours: 2080, wages: 20000 },
    { first: 7, last: 12, hours: 1040, wages: 10000 },
    { first: 10, last: 12, hours: 520, wages: 5000 },
    { first: 3, last: 12, hours: 2080, wages: 20000 },
  ];
  const employees = full.employees.map((employee, index) => {
    const { full_year_employee_only_shop_premium: _premium, ...base } =
      employee;
    const period = periods[index];
    const count = period.last - period.first + 1;
    return {
      ...base,
      hours_of_service: period.hours,
      social_security_medicare_wages: period.wages,
      tax_year_employee_only_shop_premium: count * 1000,
      employer_premium_paid: count * 500,
      enrollment_period: {
        first_month: period.first,
        last_month: period.last,
        coverage_start_date: monthCoverageDates(period.first).start,
        coverage_end_date: monthCoverageDates(period.last).end,
        enrollment_source_reference: `Synthetic 2025 SHOP employee enrollment-${
          index + 1
        }`,
      },
    };
  });
  return {
    ...common,
    employee_only_calendar_month_coverage_verified: true as const,
    all_enrollment_invoice_payment_records_identified_confirmed: true as const,
    employees,
    shop_review: {
      ...shop_review,
      employee_premium_reviews: employees.map((employee, index) => ({
        ...shop_review.employee_premium_reviews[index],
        payroll_hours_of_service: index === 0
          ? 2300
          : employee.hours_of_service,
        payroll_social_security_medicare_wages:
          employee.social_security_medicare_wages,
        enrollment_period: employee.enrollment_period,
        monthly_premiums: Array.from({
          length: employee.enrollment_period.last_month -
            employee.enrollment_period.first_month + 1,
        }, (_, offset) => {
          const month = employee.enrollment_period.first_month + offset;
          const dates = monthCoverageDates(month);
          return {
            employee_ssn: employee.employee_ssn,
            payer_employment_ein: full.employment_ein,
            shop_plan_reference: full.shop_plan_reference,
            month,
            employee_only_coverage_verified: true as const,
            coverage_start_date: dates.start,
            coverage_end_date: dates.end,
            invoice_date: dates.start,
            payment_date: `2025-${String(month).padStart(2, "0")}-15`,
            billed_premium: 1000,
            employer_payment: 500,
            shop_invoice_reference: `Synthetic period invoice-${
              index + 1
            }-${month}`,
            employer_payment_reference: `Synthetic period payment-${
              index + 1
            }-${month}`,
          };
        }),
      })),
    },
  };
}
export function form8941PartYearInputs(receipts = 180000) {
  const input = form8941OwnedInputs(receipts);
  const source = form8941PartYearSource();
  const lines = calculateForm8941(source);
  return {
    ...input,
    f8941: source,
    schedule_c: input.schedule_c.map((business) => ({
      ...business,
      line_26_wages: source.employees.reduce(
        (sum, employee) => sum + employee.social_security_medicare_wages,
        0,
      ),
      line_14_employee_benefits: source.other_schedule_c_employee_benefits +
        lines.line4,
    })),
  };
}
export function form8941PartYearReviewFixture(): PdfReviewFixture {
  const inputs = form8941PartYearInputs();
  return {
    id: "single-shop-part-year-enrollment",
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
      "Five sourced enrollment periods total 34 employee-months; actual annual credited payroll 7800 hours and 75000 wages produce 3 FTEs and 25000 average wages",
      "Prorated Albany 9358 average premium retains fractional employee amounts before filed line 5 total 13257; determined credit 6629 reduces premiums even when current tax-use is limited",
      "Monthly policy/invoice/payment ownership and covered/paid 2025 dates match the public graph, native form and filled packet",
    ],
  };
}

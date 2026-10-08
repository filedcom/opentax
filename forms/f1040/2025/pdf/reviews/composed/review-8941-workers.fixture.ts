import { form8941MultiplePlanInputs } from "./review-8941-multiple-plans.fixture.ts";
import {
  calculateForm8941,
  inputSchema,
} from "../../../../nodes/inputs/f8941/index.ts";
import { monthCoverageDates } from "../../../../nodes/inputs/f8941/shop_evidence.ts";
import { extractFilerIdentity } from "../../../../mef/filer.ts";
import type { PdfReviewFixture } from "../../review-fixtures.ts";

const serviceDates = (days: 120 | 121) =>
  Array.from({ length: days }, (_, index) => {
    const day = new Date(Date.UTC(2025, 5, 1 + index));
    return day.toISOString().slice(0, 10);
  });
const excludedCoverage = (name: string, payment: number) => ({
  shop_plan_reference: "Synthetic-QHP-A",
  month: 6,
  coverage_start_date: monthCoverageDates(6).start,
  coverage_end_date: monthCoverageDates(6).end,
  invoice_date: "2025-06-05",
  payment_date: "2025-06-15",
  billed_premium: payment * 2,
  employer_payment: payment,
  shop_invoice_reference: `Excluded invoice ${name}`,
  employer_payment_reference: `Excluded payment ${name}`,
});

/** Sourced annual payroll, 120/121 service days, and excluded paid coverage. */
export function form8941WorkerInputs(days: 120 | 121, receipts = 350000) {
  const base = form8941MultiplePlanInputs("independent-mixed", receipts);
  const original = base.f8941;
  if (!("monthly_plan_arrangements" in original)) {
    throw new Error("Expected owned multiple-QHP source");
  }
  const seasonal_service = {
    seasonal_basis: "summer_only" as const,
    seasonal_nature_source_reference: "Summer-only employee hiring record",
    dated_service_record_reference: "Summer employee dated timecards",
    service_dates: serviceDates(days),
  };
  const excluded_workers = [{
    employee_reference: "Jane proprietor excluded",
    employee_ssn: original.owner_ssn,
    exclusion: "proprietor" as const,
    related_owner_ssn: original.owner_ssn,
    relationship_source_reference: "Owner identification and Schedule C",
    relationship_verified: true as const,
    payroll_record_reference: "Owner no-wages ledger",
    actual_hours_of_service: 0,
    actual_social_security_medicare_wages: 0,
    coverage_records: [excludedCoverage("owner", 100)],
  }, {
    employee_reference: "Jane related child excluded",
    employee_ssn: "444556666",
    exclusion: "owner_child" as const,
    related_owner_ssn: original.owner_ssn,
    relationship_source_reference: "Owner child relationship review",
    relationship_verified: true as const,
    payroll_record_reference: "Related child payroll ledger",
    actual_hours_of_service: 400,
    actual_social_security_medicare_wages: 5000,
    coverage_records: [excludedCoverage("child", 200)],
  }];
  const source = inputSchema.parse({
    ...original,
    excluded_owner_family_seasonal_and_nonbusiness_workers_none_verified: false,
    other_schedule_c_employee_benefits: 0,
    employees: original.employees.map((employee, index) =>
      index === 2 ? { ...employee, seasonal_service } : employee
    ),
    shop_review: {
      ...original.shop_review,
      employee_premium_reviews: original.shop_review.employee_premium_reviews
        .map((review, index) =>
          index === 2 ? { ...review, seasonal_service } : review
        ),
    },
    excluded_workers,
    excluded_worker_reviews: structuredClone(excluded_workers),
  });
  const lines = calculateForm8941(source);
  return {
    ...base,
    f8941: source,
    schedule_c: base.schedule_c.map((business) => ({
      ...business,
      line_26_wages: original.employees.reduce(
        (sum, employee) => sum + employee.social_security_medicare_wages,
        0,
      ) + 5000,
      line_14_employee_benefits: lines.line4,
    })),
  };
}

/** Joint-filer variant binds an excluded paid spouse to the actual filer. */
export function form8941SpouseWorkerInputs() {
  const base = form8941WorkerInputs(120);
  const source = base.f8941;
  if (!("monthly_plan_arrangements" in source)) {
    throw new Error("Expected owned multiple-QHP source");
  }
  const spouse = {
    employee_reference: "Sam proprietor spouse excluded",
    employee_ssn: "222334444",
    exclusion: "owner_spouse" as const,
    related_owner_ssn: source.owner_ssn,
    relationship_source_reference: "Reviewed 2025 marriage and spouse identity",
    relationship_verified: true as const,
    payroll_record_reference: "Spouse payroll ledger",
    actual_hours_of_service: 500,
    actual_social_security_medicare_wages: 6000,
    coverage_records: [excludedCoverage("spouse", 250)],
  };
  const householdDependent = {
    employee_reference: "Robin qualifying household dependent excluded",
    employee_ssn: "555667777",
    exclusion: "owner_household_dependent" as const,
    related_owner_ssn: source.owner_ssn,
    relationship_source_reference: "Reviewed household residency record",
    relationship_verified: true as const,
    dependent_qualifies_on_owner_2025_return_confirmed: true as const,
    dependent_qualification_source_reference:
      "Reviewed 2025 household dependent support and tax eligibility",
    payroll_record_reference: "Household dependent payroll ledger",
    actual_hours_of_service: 240,
    actual_social_security_medicare_wages: 3000,
    coverage_records: [excludedCoverage("household dependent", 150)],
  };
  const withSpouse = inputSchema.parse({
    ...source,
    excluded_workers: [
      ...(source.excluded_workers ?? []),
      spouse,
      householdDependent,
    ],
    excluded_worker_reviews: [
      ...(source.excluded_worker_reviews ?? []),
      structuredClone(spouse),
      structuredClone(householdDependent),
    ],
  });
  return {
    ...base,
    general: {
      ...base.general,
      filing_status: "mfj",
      spouse_first_name: "Sam",
      spouse_last_name: "Soleproprietor",
      spouse_ssn: "222334444",
      spouse_dob: "1986-06-15",
      dependents: [{
        first_name: "Robin",
        last_name: "Neighbor",
        name_control: "NEIG",
        ssn: "555-66-7777",
        dob: "1997-01-01",
        relationship: "other",
        irs_relationship_code: "OTHER",
        months_in_home: 12,
        lived_in_us_over_half_year: true,
        us_citizen_national_or_resident: true,
        provided_over_half_own_support: false,
        filed_joint_return_except_refund_only: false,
        gross_income: 3000,
      }],
    },
    f8941: withSpouse,
    schedule_c: base.schedule_c.map((business) => ({
      ...business,
      line_26_wages: business.line_26_wages + 9000,
    })),
  };
}

export function form8941WorkerReviewFixture(): PdfReviewFixture {
  const inputs = form8941WorkerInputs(120);
  return {
    id: "single-shop-seasonal-excluded-workers",
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
      "Dated summer timecards supply exactly 120 service days; annual real payroll wages remain in Schedule C while seasonal hours and wages are zero for the credit's FTE and wage worksheets",
      "Proprietor and related child paid SHOP coverage remains sourced but does not enter Form 8941 premiums or ordinary Schedule C benefits",
      "Credited worker premiums reduce Schedule C deduction by the full determined credit before SE, QBI, Form 3800 and Form 1040",
    ],
  };
}

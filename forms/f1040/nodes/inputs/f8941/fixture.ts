import { TS } from "../../types.ts";

/** Albany's 2025 employee-only average premium is $9,358 in IRS Table 2025. */
export function form8941DirectFixture() {
  return {
    owner_name: "Jane Soleproprietor",
    owner_ssn: "111223333",
    proprietor_recipient: TS.T,
    schedule_c_business_reference: "SHOP-BUSINESS-1",
    employment_ein: "123456789",
    payroll_ledger_reference: "PAYROLL-2025-SHOP",
    shop_marketplace_identifier: "NY-SHOP-2025",
    shop_plan_reference: "SHOP-PLAN-1",
    full_year_employee_only_coverage_verified: true as const,
    all_nonexcluded_employees_enrolled_verified: true as const,
    uniform_employer_contribution_basis_points: 5000,
    excluded_owner_family_seasonal_and_nonbusiness_workers_none_verified:
      true as const,
    no_other_trades_or_common_control_verified: true as const,
    no_state_premium_subsidy_or_credit_verified: true as const,
    no_pre_2024_positive_form8941_claim_or_predecessor_verified: true as const,
    credit_period_first_year: 2025 as const,
    other_schedule_c_employee_benefits: 1000,
    employees: Array.from({ length: 5 }, (_, index) => ({
      employee_reference: `EMP-${index + 1}`,
      hours_of_service: 2080,
      social_security_medicare_wages: 20_000,
      full_year_employee_only_shop_premium: 10_000,
      employer_premium_paid: 5000,
      irs_2025_rating_area_average_premium: 9358,
      rating_area_county: "Albany",
      rating_area_state: "NY",
      enrollment_and_payroll_record_reference: `SHOP-PAYROLL-${index + 1}`,
    })),
    shop_review: {
      irs_table_tax_year: 2025 as const,
      irs_table_source_url: "https://www.irs.gov/instructions/i8941" as const,
      irs_table_state: "NY",
      irs_table_county: "Albany",
      irs_table_employee_only_average_premium: 9358,
      table_review_reference: "IRS-8941-2025-NY-ALBANY-REVIEW",
      shop_marketplace_identifier: "NY-SHOP-2025",
      shop_plan_reference: "SHOP-PLAN-1",
      employment_ein: "123456789",
      employee_premium_reviews: Array.from({ length: 5 }, (_, index) => ({
        employee_reference: `EMP-${index + 1}`,
        enrollment_and_payroll_record_reference: `SHOP-PAYROLL-${index + 1}`,
        monthly_premiums: Array.from({ length: 12 }, (_, monthIndex) => ({
          month: monthIndex + 1,
          employee_only_coverage_verified: true as const,
          billed_premium: monthIndex < 8 ? 834 : 832,
          employer_payment: monthIndex < 8 ? 417 : 416,
          shop_invoice_reference: `SHOP-INV-${index + 1}-${monthIndex + 1}`,
          employer_payment_reference: `SHOP-PAID-${index + 1}-${
            monthIndex + 1
          }`,
        })),
      })),
    },
  };
}

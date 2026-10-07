import { z } from "zod";
import {
  arrangementWorksheet,
  cents,
  type MonthlyArrangement,
  premiumMoney,
} from "./arrangements.ts";

const sourceUrl = "https://www.irs.gov/instructions/i8941";

export const coveredDependentSchema = z.object({
  dependent_reference: z.string().trim().min(1),
  dependent_ssn: z.string().regex(/^\d{9}$/),
  relationship_to_employee: z.enum(["spouse", "child"]),
  eligible_plan_dependent_confirmed: z.literal(true),
  enrollment_source_reference: z.string().trim().min(1),
}).strict();
type CoveredDependent = z.infer<typeof coveredDependentSchema>;
export const coverageTierSchema = z.enum(["employee_only", "family"]);

export const enrollmentPeriodSchema = z.object({
  first_month: z.number().int().min(1).max(12),
  last_month: z.number().int().min(1).max(12),
  coverage_start_date: z.string().regex(/^2025-\d{2}-\d{2}$/),
  coverage_end_date: z.string().regex(/^2025-\d{2}-\d{2}$/),
  enrollment_source_reference: z.string().trim().min(1),
}).strict();
function validCalendarDate(value: string | undefined): boolean {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) &&
    date.toISOString().slice(0, 10) === value;
}

type EnrollmentPeriod = z.infer<typeof enrollmentPeriodSchema>;
export function monthCoverageDates(month: number) {
  const start = `2025-${String(month).padStart(2, "0")}-01`;
  const end = new Date(Date.UTC(2025, month, 0)).toISOString().slice(0, 10);
  return { start, end };
}
export function enrollmentMonthCount(
  employee: {
    readonly employee_reference: string;
    readonly enrollment_period?: EnrollmentPeriod;
  },
): number {
  const period = employee.enrollment_period;
  if (!period) return 12;
  if (
    period.first_month > period.last_month ||
    period.coverage_start_date !==
      monthCoverageDates(period.first_month).start ||
    period.coverage_end_date !== monthCoverageDates(period.last_month).end
  ) {
    throw new Error(
      "Form 8941 enrollment needs exact whole calendar months in 2025",
    );
  }
  return period.last_month - period.first_month + 1;
}
export function employeeTaxYearPremium(employee: {
  readonly full_year_employee_only_shop_premium?: number;
  readonly tax_year_employee_only_shop_premium?: number;
  readonly tax_year_shop_premium?: number;
}): number {
  return employee.tax_year_shop_premium ??
    employee.tax_year_employee_only_shop_premium ??
    employee.full_year_employee_only_shop_premium!;
}

const monthlyPremiumSchema = z.object({
  employee_ssn: z.string().regex(/^\d{9}$/),
  payer_employment_ein: z.string().regex(/^\d{9}$/),
  shop_plan_reference: z.string().trim().min(1),
  coverage_start_date: z.string().optional(),
  coverage_end_date: z.string().optional(),
  invoice_date: z.string().optional(),
  payment_date: z.string().optional(),
  month: z.number().int().min(1).max(12),
  employee_only_coverage_verified: z.literal(true).optional(),
  coverage_tier: coverageTierSchema.optional(),
  covered_dependent_references: z.array(z.string().trim().min(1)).optional(),
  billed_premium: premiumMoney.refine((n) => n > 0),
  employer_payment: premiumMoney,
  employer_policy_reference: z.string().trim().min(1).optional(),
  insured_quote_reference: z.string().trim().min(1).optional(),
  shop_invoice_reference: z.string().trim().min(1),
  employer_payment_reference: z.string().trim().min(1),
}).strict();

export const shopReviewSchema = z.object({
  irs_table_tax_year: z.literal(2025),
  irs_table_source_url: z.literal(sourceUrl),
  irs_table_state: z.string().regex(/^[A-Z]{2}$/),
  irs_table_county: z.string().trim().min(1),
  irs_table_employee_only_average_premium: z.number().int().positive(),
  irs_table_family_average_premium: z.number().int().positive().optional(),
  table_review_reference: z.string().trim().min(1),
  shop_marketplace_identifier: z.string().trim().min(1),
  shop_plan_reference: z.string().trim().min(1),
  employment_ein: z.string().regex(/^\d{9}$/),
  payroll_ledger_reference: z.string().trim().min(1),
  employee_premium_reviews: z.array(
    z.object({
      employee_ssn: z.string().regex(/^\d{9}$/),
      payroll_tax_year: z.literal(2025),
      payroll_employment_ein: z.string().regex(/^\d{9}$/),
      payroll_hours_of_service: z.number().int().positive(),
      payroll_social_security_medicare_wages: z.number().int().positive(),
      employee_reference: z.string().trim().min(1),
      enrollment_and_payroll_record_reference: z.string().trim().min(1),
      enrollment_period: enrollmentPeriodSchema.optional(),
      coverage_tier: coverageTierSchema.optional(),
      covered_dependents: z.array(coveredDependentSchema).max(10).optional(),
      monthly_premiums: z.array(monthlyPremiumSchema).min(1).max(12),
    }).strict(),
  ).min(1).max(24),
}).strict();

type ShopReview = z.infer<typeof shopReviewSchema>;

interface EmployeeWorksheetSource {
  readonly employee_ssn: string;
  readonly hours_of_service: number;
  readonly social_security_medicare_wages: number;
  readonly employee_reference: string;
  readonly enrollment_and_payroll_record_reference: string;
  readonly rating_area_state: string;
  readonly rating_area_county: string;
  readonly irs_2025_rating_area_average_premium: number;
  readonly full_year_employee_only_shop_premium?: number;
  readonly tax_year_employee_only_shop_premium?: number;
  readonly tax_year_shop_premium?: number;
  readonly coverage_tier?: "employee_only" | "family";
  readonly covered_dependents?: readonly CoveredDependent[];
  readonly enrollment_period?: EnrollmentPeriod;
  readonly employer_premium_paid: number;
}

interface ReviewSource {
  readonly owner_ssn: string;
  readonly payroll_ledger_reference: string;
  readonly shop_marketplace_identifier: string;
  readonly shop_plan_reference: string;
  readonly employment_ein: string;
  readonly uniform_employer_contribution_basis_points?: number;
  readonly monthly_arrangements?: readonly MonthlyArrangement[];
  readonly employees: readonly EmployeeWorksheetSource[];
  readonly shop_review: ShopReview;
}

/** A deliberately bounded 2025 table row with exact monthly worksheet joins. */
export function verifyForm8941ShopReview(source: ReviewSource): void {
  const review = source.shop_review;
  // The official 2025 table identifies Albany County, NY at $9,358 for
  // employee-only coverage and $24,527 for family coverage. Other rows need
  // their own reviewed source values.
  if (
    review.irs_table_state !== "NY" ||
    review.irs_table_county !== "Albany" ||
    review.irs_table_employee_only_average_premium !== 9358 ||
    (review.irs_table_family_average_premium !== undefined &&
      review.irs_table_family_average_premium !== 24527)
  ) {
    throw new Error("Form 8941 rating-area table row is not supported");
  }
  if (
    review.shop_marketplace_identifier !== source.shop_marketplace_identifier ||
    review.shop_plan_reference !== source.shop_plan_reference ||
    review.employment_ein !== source.employment_ein ||
    review.payroll_ledger_reference !== source.payroll_ledger_reference
  ) {
    throw new Error("Form 8941 SHOP review differs from employer or plan");
  }
  const employees = new Map(
    source.employees.map((employee) => [employee.employee_reference, employee]),
  );
  if (review.employee_premium_reviews.length !== employees.size) {
    throw new Error("Form 8941 SHOP review employee set is incomplete");
  }
  const seenEmployees = new Set<string>();
  const seenSSNs = new Set<string>();
  const seenDocuments = new Set<string>();
  const seenDependents = new Set<string>();
  const coveredSSNs = new Set(source.employees.map((e) => e.employee_ssn));
  coveredSSNs.add(source.owner_ssn);
  const tierMonthPremiums = new Map<string, number>();
  for (const item of review.employee_premium_reviews) {
    const employee = employees.get(item.employee_reference);
    if (!employee || seenEmployees.has(item.employee_reference)) {
      throw new Error(
        "Form 8941 SHOP review employee identity is duplicated or unknown",
      );
    }
    seenEmployees.add(item.employee_reference);
    if (
      item.employee_ssn !== employee.employee_ssn ||
      item.employee_ssn === source.owner_ssn ||
      seenSSNs.has(item.employee_ssn) ||
      item.payroll_employment_ein !== source.employment_ein ||
      Math.min(item.payroll_hours_of_service, 2080) !==
        employee.hours_of_service ||
      item.payroll_social_security_medicare_wages !==
        employee.social_security_medicare_wages
    ) {
      throw new Error("Form 8941 employee payroll ownership or amounts differ");
    }
    seenSSNs.add(item.employee_ssn);
    if (seenDocuments.has(item.enrollment_and_payroll_record_reference)) {
      throw new Error("Form 8941 payroll record is reused");
    }
    seenDocuments.add(item.enrollment_and_payroll_record_reference);
    if (
      item.enrollment_and_payroll_record_reference !==
        employee.enrollment_and_payroll_record_reference
    ) {
      throw new Error("Form 8941 SHOP review payroll source differs");
    }
    if (
      employee.rating_area_state !== review.irs_table_state ||
      employee.rating_area_county !== review.irs_table_county ||
      employee.irs_2025_rating_area_average_premium !==
        (employee.coverage_tier === "family"
          ? review.irs_table_family_average_premium
          : review.irs_table_employee_only_average_premium)
    ) {
      throw new Error("Form 8941 employee rating area differs from IRS table");
    }
    const dependents = employee.covered_dependents ?? [];
    if (employee.coverage_tier) {
      if (
        item.coverage_tier !== employee.coverage_tier ||
        JSON.stringify(item.covered_dependents) !==
          JSON.stringify(employee.covered_dependents) ||
        (employee.coverage_tier === "family"
          ? dependents.length === 0
          : dependents.length !== 0)
      ) {
        throw new Error(
          "Form 8941 family enrollment tier or dependent ownership differs",
        );
      }
      for (const dependent of dependents) {
        if (
          seenDependents.has(dependent.dependent_reference) ||
          coveredSSNs.has(dependent.dependent_ssn) ||
          seenDocuments.has(dependent.enrollment_source_reference)
        ) {
          throw new Error(
            "Form 8941 dependent enrollment identity or source is reused",
          );
        }
        seenDependents.add(dependent.dependent_reference);
        coveredSSNs.add(dependent.dependent_ssn);
        seenDocuments.add(dependent.enrollment_source_reference);
      }
    } else if (
      item.coverage_tier !== undefined || item.covered_dependents !== undefined
    ) {
      throw new Error("Form 8941 family evidence needs identified tier source");
    }
    const monthCount = enrollmentMonthCount(employee);
    if (
      JSON.stringify(employee.enrollment_period) !==
        JSON.stringify(item.enrollment_period)
    ) {
      throw new Error(
        "Form 8941 enrollment record differs from employee policy period",
      );
    }
    const months = new Set<number>();
    let billed = 0;
    let paid = 0;
    for (const month of item.monthly_premiums) {
      if (
        month.employee_ssn !== employee.employee_ssn ||
        month.payer_employment_ein !== source.employment_ein ||
        month.shop_plan_reference !== source.shop_plan_reference
      ) {
        throw new Error(
          "Form 8941 monthly invoice or payment ownership differs",
        );
      }
      if (employee.coverage_tier) {
        const expected = dependents.map((d) => d.dependent_reference).sort();
        const actual = [...(month.covered_dependent_references ?? [])].sort();
        if (
          month.coverage_tier !== employee.coverage_tier ||
          month.covered_dependent_references === undefined ||
          JSON.stringify(actual) !== JSON.stringify(expected) ||
          month.employee_only_coverage_verified !== undefined
        ) {
          throw new Error(
            "Form 8941 monthly covered tier or dependents differ from enrollment",
          );
        }
        const key = `${employee.coverage_tier}:${month.month}`;
        const existing = tierMonthPremiums.get(key);
        if (
          !source.monthly_arrangements && existing !== undefined &&
          existing !== month.billed_premium
        ) {
          throw new Error(
            "Form 8941 composite tier monthly premium differs across employees",
          );
        }
        tierMonthPremiums.set(key, month.billed_premium);
      } else if (
        month.employee_only_coverage_verified !== true ||
        month.coverage_tier !== undefined ||
        month.covered_dependent_references !== undefined
      ) {
        throw new Error(
          "Form 8941 employee-only monthly coverage evidence differs",
        );
      }
      if (employee.enrollment_period) {
        const dates = monthCoverageDates(month.month);
        if (
          month.month < employee.enrollment_period.first_month ||
          month.month > employee.enrollment_period.last_month ||
          month.coverage_start_date !== dates.start ||
          month.coverage_end_date !== dates.end ||
          !month.invoice_date || !month.payment_date ||
          !validCalendarDate(month.invoice_date) ||
          !validCalendarDate(month.payment_date) ||
          !month.payment_date.startsWith("2025-")
        ) {
          throw new Error(
            "Form 8941 invoice coverage or paid-tax-year dates differ from enrollment",
          );
        }
      } else if (
        month.coverage_start_date !== undefined ||
        month.coverage_end_date !== undefined ||
        month.invoice_date !== undefined || month.payment_date !== undefined
      ) {
        throw new Error(
          "Form 8941 dated invoice evidence needs an identified enrollment period",
        );
      }
      if (months.has(month.month)) {
        throw new Error("Form 8941 SHOP coverage month is duplicated");
      }
      months.add(month.month);
      for (
        const reference of [
          month.shop_invoice_reference,
          month.employer_payment_reference,
        ]
      ) {
        if (seenDocuments.has(reference)) {
          throw new Error("Form 8941 SHOP invoice or payment is reused");
        }
        seenDocuments.add(reference);
      }
      if (
        !source.monthly_arrangements &&
        (month.employer_policy_reference !== undefined ||
          month.insured_quote_reference !== undefined)
      ) {
        throw new Error(
          "Form 8941 invoice arrangement references need monthly owned rules",
        );
      }
      if (
        !source.monthly_arrangements && month.employer_payment !== Math.round(
            month.billed_premium *
              source.uniform_employer_contribution_basis_points! / 10000,
          )
      ) {
        throw new Error("Form 8941 monthly employer contribution differs");
      }
      billed += month.billed_premium;
      paid += month.employer_payment;
    }
    if (months.size !== monthCount) {
      throw new Error(
        "Form 8941 identified SHOP enrollment coverage is incomplete",
      );
    }
    if (
      cents(billed) !== cents(employeeTaxYearPremium(employee)) ||
      cents(paid) !== cents(employee.employer_premium_paid)
    ) {
      throw new Error(
        "Form 8941 monthly premiums differ from worksheet inputs",
      );
    }
  }
  if (source.monthly_arrangements) {
    arrangementWorksheet({
      ...source,
      monthly_arrangements: source.monthly_arrangements,
      employees: source.employees.map((e) => {
        if (!e.coverage_tier) {
          throw new Error("Form 8941 arrangement requires enrolled tier");
        }
        return { ...e, coverage_tier: e.coverage_tier };
      }),
    });
  }
}

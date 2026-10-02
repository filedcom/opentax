import { z } from "zod";

const sourceUrl = "https://www.irs.gov/instructions/i8941";

const monthlyPremiumSchema = z.object({
  month: z.number().int().min(1).max(12),
  employee_only_coverage_verified: z.literal(true),
  billed_premium: z.number().int().positive(),
  employer_payment: z.number().int().positive(),
  shop_invoice_reference: z.string().trim().min(1),
  employer_payment_reference: z.string().trim().min(1),
}).strict();

export const shopReviewSchema = z.object({
  irs_table_tax_year: z.literal(2025),
  irs_table_source_url: z.literal(sourceUrl),
  irs_table_state: z.string().regex(/^[A-Z]{2}$/),
  irs_table_county: z.string().trim().min(1),
  irs_table_employee_only_average_premium: z.number().int().positive(),
  table_review_reference: z.string().trim().min(1),
  shop_marketplace_identifier: z.string().trim().min(1),
  shop_plan_reference: z.string().trim().min(1),
  employment_ein: z.string().regex(/^\d{9}$/),
  employee_premium_reviews: z.array(
    z.object({
      employee_reference: z.string().trim().min(1),
      enrollment_and_payroll_record_reference: z.string().trim().min(1),
      monthly_premiums: z.array(monthlyPremiumSchema).length(12),
    }).strict(),
  ).min(1).max(24),
}).strict();

type ShopReview = z.infer<typeof shopReviewSchema>;

interface EmployeeWorksheetSource {
  readonly employee_reference: string;
  readonly enrollment_and_payroll_record_reference: string;
  readonly rating_area_state: string;
  readonly rating_area_county: string;
  readonly irs_2025_rating_area_average_premium: number;
  readonly full_year_employee_only_shop_premium: number;
  readonly employer_premium_paid: number;
}

interface ReviewSource {
  readonly shop_marketplace_identifier: string;
  readonly shop_plan_reference: string;
  readonly employment_ein: string;
  readonly uniform_employer_contribution_basis_points: number;
  readonly employees: readonly EmployeeWorksheetSource[];
  readonly shop_review: ShopReview;
}

/** A deliberately bounded 2025 table row with exact monthly worksheet joins. */
export function verifyForm8941ShopReview(source: ReviewSource): void {
  const review = source.shop_review;
  // The official 2025 table identifies Albany County, NY at $9,358 for
  // employee-only coverage. Other rows need their own authenticated values.
  if (
    review.irs_table_state !== "NY" ||
    review.irs_table_county !== "Albany" ||
    review.irs_table_employee_only_average_premium !== 9358
  ) {
    throw new Error("Form 8941 rating-area table row is not authenticated");
  }
  if (
    review.shop_marketplace_identifier !== source.shop_marketplace_identifier ||
    review.shop_plan_reference !== source.shop_plan_reference ||
    review.employment_ein !== source.employment_ein
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
  const seenDocuments = new Set<string>();
  for (const item of review.employee_premium_reviews) {
    const employee = employees.get(item.employee_reference);
    if (!employee || seenEmployees.has(item.employee_reference)) {
      throw new Error(
        "Form 8941 SHOP review employee identity is duplicated or unknown",
      );
    }
    seenEmployees.add(item.employee_reference);
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
        review.irs_table_employee_only_average_premium
    ) {
      throw new Error("Form 8941 employee rating area differs from IRS table");
    }
    const months = new Set<number>();
    let billed = 0;
    let paid = 0;
    for (const month of item.monthly_premiums) {
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
        month.employer_payment !== Math.round(
          month.billed_premium *
            source.uniform_employer_contribution_basis_points / 10000,
        )
      ) {
        throw new Error("Form 8941 monthly employer contribution differs");
      }
      billed += month.billed_premium;
      paid += month.employer_payment;
    }
    if (months.size !== 12) {
      throw new Error("Form 8941 full-year SHOP coverage is incomplete");
    }
    if (
      billed !== employee.full_year_employee_only_shop_premium ||
      paid !== employee.employer_premium_paid
    ) {
      throw new Error(
        "Form 8941 monthly premiums differ from worksheet inputs",
      );
    }
  }
}

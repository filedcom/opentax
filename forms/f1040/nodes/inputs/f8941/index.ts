import { z } from "zod";
import type { NodeResult } from "../../../../../core/types/tax-node.ts";
import { output, TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";
import { TS } from "../../types.ts";
import { f1040 } from "../../outputs/f1040/index.ts";
import { scheduleC as schedule_c } from "../schedule_c/index.ts";
import { f3800 } from "../f3800/index.ts";
import {
  coverageTierSchema,
  coveredDependentSchema,
  employeeTaxYearPremium,
  enrollmentMonthCount,
  enrollmentPeriodSchema,
  shopReviewSchema,
  verifyForm8941ShopReview,
} from "./shop_evidence.ts";

const amount = z.number().int().finite().nonnegative();
const employeeSchema = z.object({
  employee_ssn: z.string().regex(/^\d{9}$/),
  employee_reference: z.string().trim().min(1),
  hours_of_service: z.number().int().min(1).max(2080),
  social_security_medicare_wages: z.number().int().positive(),
  employer_premium_paid: z.number().int().positive(),
  irs_2025_rating_area_average_premium: z.number().int().positive(),
  rating_area_county: z.string().trim().min(1),
  rating_area_state: z.string().regex(/^[A-Z]{2}$/),
  enrollment_and_payroll_record_reference: z.string().trim().min(1),
}).strict();

const sourceSchema = z.object({
  owner_name: z.string().trim().min(1).max(35),
  owner_ssn: z.string().regex(/^\d{9}$/),
  proprietor_recipient: z.nativeEnum(TS),
  schedule_c_business_reference: z.string().trim().min(1),
  employment_ein: z.string().regex(/^\d{9}$/),
  payroll_ledger_reference: z.string().trim().min(1),
  shop_marketplace_identifier: z.string().trim().min(1).max(100),
  shop_plan_reference: z.string().trim().min(1),
  all_nonexcluded_employees_enrolled_verified: z.literal(true),
  uniform_employer_contribution_basis_points: z.number().int().min(5000).max(
    10000,
  ),
  excluded_owner_family_seasonal_and_nonbusiness_workers_none_verified: z
    .literal(true),
  no_other_trades_or_common_control_verified: z.literal(true),
  no_state_premium_subsidy_or_credit_verified: z.literal(true),
  no_pre_2024_positive_form8941_claim_or_predecessor_verified: z.literal(true),
  credit_period_first_year: z.union([z.literal(2024), z.literal(2025)]),
  first_year_filed_form8941: z.object({
    filed_2024_return_reference: z.string().trim().min(1),
    shop_line_a_yes_verified: z.literal(true),
    positive_line12_credit: z.number().int().positive(),
  }).strict().optional(),
  other_schedule_c_employee_benefits: amount,
  shop_review: shopReviewSchema,
}).strict();

/** Full-year compatibility and explicitly sourced whole-month enrollment. */
export const inputSchema = z.union([
  sourceSchema.extend({
    full_year_employee_only_coverage_verified: z.literal(true),
    employees: z.array(
      employeeSchema.extend({
        full_year_employee_only_shop_premium: z.number().int().positive(),
      }).strict(),
    ).min(1).max(24),
  }).strict(),
  sourceSchema.extend({
    employee_only_calendar_month_coverage_verified: z.literal(true),
    all_enrollment_invoice_payment_records_identified_confirmed: z.literal(
      true,
    ),
    employees: z.array(
      employeeSchema.extend({
        enrollment_period: enrollmentPeriodSchema,
        tax_year_employee_only_shop_premium: z.number().int().positive(),
      }).strict(),
    ).min(1).max(24),
  }).strict(),
  sourceSchema.extend({
    identified_shop_tier_calendar_month_coverage_confirmed: z.literal(true),
    qualified_shop_health_plan_confirmed: z.literal(true),
    qualified_shop_plan_source_reference: z.string().trim().min(1),
    no_wellness_or_state_law_contribution_adjustment_confirmed: z.literal(true),
    qualifying_arrangement: z.literal("uniform_percentage_each_tier"),
    insurer_billing_method: z.literal("composite_tier_rate"),
    no_salary_reduction_or_tobacco_surcharge_in_employer_premiums_confirmed: z
      .literal(true),
    all_enrollment_invoice_payment_records_identified_confirmed: z.literal(
      true,
    ),
    employees: z.array(
      employeeSchema.extend({
        enrollment_period: enrollmentPeriodSchema,
        tax_year_shop_premium: z.number().int().positive(),
        coverage_tier: coverageTierSchema,
        covered_dependents_all_enrolled_for_employee_period_confirmed: z
          .literal(true),
        covered_dependents: z.array(coveredDependentSchema).max(10),
      }).strict(),
    ).min(1).max(24),
  }).strict(),
]);

export type F8941Input = z.infer<typeof inputSchema>;

export interface Form8941Lines {
  readonly line1: number;
  readonly line2: number;
  readonly line3: number;
  readonly line4: number;
  readonly line5: number;
  readonly line6: number;
  readonly line7: number;
  readonly line8: number;
  readonly line9: number;
  readonly line10: 0;
  readonly line11: number;
  readonly line12: number;
  readonly line13: number;
  readonly line14: number;
  readonly line15: 0;
  readonly line16: number;
}

/** TY2025 Form 8941 lines 1–16 and Worksheets 1–7 for the bounded source. */
export function calculateForm8941(raw: unknown): Form8941Lines {
  const source = inputSchema.parse(raw);
  verifyForm8941ShopReview(source);
  if (
    (source.credit_period_first_year === 2024) !==
      Boolean(source.first_year_filed_form8941)
  ) {
    throw new Error(
      "Form 8941 credit-period history needs its first filed year",
    );
  }
  const references = new Set<string>();
  const enrollmentRecords = new Set<string>();
  const contribution = source.uniform_employer_contribution_basis_points /
    10000;
  const ratingArea = source.employees[0];
  for (const employee of source.employees) {
    if (
      references.has(employee.employee_reference) ||
      enrollmentRecords.has(employee.enrollment_and_payroll_record_reference)
    ) {
      throw new Error("Form 8941 employee payroll reference is duplicated");
    }
    references.add(employee.employee_reference);
    enrollmentRecords.add(employee.enrollment_and_payroll_record_reference);
    if (
      employee.rating_area_county !== ratingArea.rating_area_county ||
      employee.rating_area_state !== ratingArea.rating_area_state
    ) {
      throw new Error("Form 8941 bounded SHOP plan needs one rating area");
    }
    if (
      employee.employer_premium_paid !==
        Math.round(employeeTaxYearPremium(employee) * contribution)
    ) {
      throw new Error(
        "Form 8941 employee premium differs from uniform SHOP contribution",
      );
    }
  }
  const totalHours = source.employees.reduce(
    (sum, employee) => sum + employee.hours_of_service,
    0,
  );
  const totalWages = source.employees.reduce(
    (sum, employee) => sum + employee.social_security_medicare_wages,
    0,
  );
  const line1 = source.employees.length;
  const line2 = Math.max(1, Math.floor(totalHours / 2080));
  const line3 = Math.floor(totalWages / line2 / 1000) * 1000;
  if (line2 >= 25 || line3 >= 67_000) {
    throw new Error("Form 8941 FTE or wage ceiling bars the direct credit");
  }
  const line4 = source.employees.reduce(
    (sum, employee) => sum + employee.employer_premium_paid,
    0,
  );
  // Worksheet4(c): prorate the annual table premium only for enrolled periods.
  // Preserve the fractional row amounts and round their sum for the filed line.
  const line5 = Math.round(
    source.employees.reduce(
      (sum, employee) =>
        sum + employee.irs_2025_rating_area_average_premium *
          source.uniform_employer_contribution_basis_points *
          enrollmentMonthCount(employee),
      0,
    ) / 120000,
  );
  const line6 = Math.min(line4, line5);
  const line7 = Math.round(line6 * 0.5);
  const line8 = line2 <= 10
    ? line7
    : Math.max(0, Math.round(line7 * (1 - (line2 - 10) / 15)));
  // Worksheet 6 uses $33,300 in its numerator and denominator; the eligibility
  // discussion rounds its threshold to $33,000.
  const line9 = line3 <= 33_000 ? line8 : Math.max(
    0,
    Math.round(line8 - line7 * ((line3 - 33_300) / 33_300)),
  );
  const line10 = 0 as const;
  const line11 = line4;
  const line12 = Math.min(line9, line11);
  if (line12 <= 0) {
    throw new Error("Form 8941 direct source has no positive allowed credit");
  }
  const line13 = line1;
  const line14 = line2;
  const line15 = 0 as const;
  return {
    line1,
    line2,
    line3,
    line4,
    line5,
    line6,
    line7,
    line8,
    line9,
    line10,
    line11,
    line12,
    line13,
    line14,
    line15,
    line16: line12,
  };
}

class F8941Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f8941";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([f3800, schedule_c, f1040]);

  compute(_ctx: NodeContext, rawInput: F8941Input): NodeResult {
    const lines = calculateForm8941(rawInput);
    return {
      outputs: [
        output(f3800, {
          f8941_direct_employer_credit: {
            credit_amount: lines.line16,
            schedule_c_business_reference:
              rawInput.schedule_c_business_reference,
            shop_plan_reference: rawInput.shop_plan_reference,
            subject_to_passive_activity_limit: false,
          },
        }),
        output(f1040, { form8941_determined_credit: lines.line16 }),
        output(schedule_c, {
          form8941_premium_reductions: [{
            business_reference: rawInput.schedule_c_business_reference,
            credit_amount: lines.line16,
          }],
        }),
      ],
    };
  }
}

export const f8941 = new F8941Node();

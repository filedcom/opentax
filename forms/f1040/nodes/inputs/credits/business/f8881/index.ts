import { z } from "zod";
import type { NodeResult } from "../../../../../../../core/types/tax-node.ts";
import { output, TaxNode } from "../../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../../core/types/output-nodes.ts";
import { f3800 } from "../f3800/index.ts";
import type { NodeContext } from "../../../../../../../core/types/node-context.ts";

// TY2025 Form 8881, revision December 2025. The three parts must remain
// separate because Form 3800 places them on lines 1j, 1dd, and 1ee.
const dollars = z.number().int().nonnegative();
const reference = z.string().trim().min(1);
const eligibleEmployerCount = z.number().int().min(1).max(100);

export enum PlanType {
  Plan401k = "401k",
  Simple = "simple",
  Sep = "sep",
  DefBenefit = "defined_benefit",
  Other = "other",
}

const startupSchema = z.object({
  plan_effective_on: z.string().date(),
  first_credit_year: z.number().int().min(2023).max(2025),
  preceding_first_credit_year_qualified_employee_count: eligibleEmployerCount,
  eligible_non_hce_count: eligibleEmployerCount,
  startup_costs: dollars.positive(),
  cost_record_reference: reference,
  costs_paid_or_incurred_on: z.string().date().refine(
    (date) => date.startsWith("2025-"),
    { message: "Startup costs must be paid or incurred in 2025" },
  ),
  eligible_plan_confirmed: z.literal(true),
  no_substantially_same_employee_plan_in_prior_three_years_confirmed: z.literal(
    true,
  ),
  startup_cost_deduction_reduced_by_credit_confirmed: z.literal(true),
}).strict().superRefine((source, ctx) => {
  const effectiveYear = Number(source.plan_effective_on.slice(0, 4));
  if (
    source.first_credit_year !== effectiveYear &&
    source.first_credit_year !== effectiveYear - 1
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["first_credit_year"],
      message:
        "First credit year must be the plan-effective year or its elected preceding year",
    });
  }
});

const contributionSchema = z.object({
  plan_effective_on: z.string().date(),
  preceding_first_plan_year_qualified_employee_count: eligibleEmployerCount,
  preceding_2025_employee_count: eligibleEmployerCount,
  eligible_defined_contribution_plan_confirmed: z.literal(true),
  no_substantially_same_employee_plan_in_prior_three_years_confirmed: z.literal(
    true,
  ),
  contribution_deduction_reduced_by_credit_confirmed: z.literal(true),
  employees: z.array(
    z.object({
      employee_reference: reference,
      contribution_record_reference: reference,
      contributed_on: z.string().date().refine(
        (date) => date.startsWith("2025-"),
        { message: "Employer contribution must be made in 2025" },
      ),
      wages_2025: dollars.max(105_000),
      qualified_employer_contribution: dollars.positive(),
      elective_deferrals_excluded_confirmed: z.literal(true),
    }).strict(),
  ).min(1),
}).strict().superRefine((source, ctx) => {
  const planYear = Number(source.plan_effective_on.slice(0, 4));
  if (planYear < 2021 || planYear > 2025) {
    ctx.addIssue({
      code: "custom",
      path: ["plan_effective_on"],
      message: "2025 is outside the five-year contribution credit window",
    });
  }
  const employees = new Set<string>();
  const records = new Set<string>();
  source.employees.forEach((employee, index) => {
    if (
      employees.has(employee.employee_reference) ||
      records.has(employee.contribution_record_reference)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["employees", index],
        message: "Contribution employee or source record is duplicated",
      });
    }
    employees.add(employee.employee_reference);
    records.add(employee.contribution_record_reference);
  });
});

const autoEnrollmentSchema = z.object({
  first_credit_year: z.number().int().min(2023).max(2025),
  preceding_first_credit_year_qualified_employee_count: eligibleEmployerCount,
  arrangement_record_reference: reference,
  arrangement_first_included_on: z.string().date(),
  eligible_automatic_contribution_arrangement_confirmed: z.literal(true),
  qualified_employer_plan_confirmed: z.literal(true),
  maintained_in_2025_confirmed: z.literal(true),
}).strict().superRefine((source, ctx) => {
  if (
    Number(source.arrangement_first_included_on.slice(0, 4)) !==
      source.first_credit_year
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["arrangement_first_included_on"],
      message:
        "Auto-enrollment first-included date must match the first credit year",
    });
  }
});

const militarySpouseSchema = z.object({
  preceding_2025_qualified_employee_count: eligibleEmployerCount,
  eligible_defined_contribution_plan_confirmed: z.literal(true),
  participation_within_two_months_confirmed: z.literal(true),
  immediate_equal_contribution_and_vesting_confirmed: z.literal(true),
  employees: z.array(
    z.object({
      employee_reference: reference,
      spouse_active_duty_certification_reference: reference,
      contribution_record_reference: reference,
      contributed_on: z.string().date().refine(
        (date) => date.startsWith("2025-"),
        { message: "Military-spouse contribution must be made in 2025" },
      ),
      first_eligible_participation_year: z.number().int().min(2023).max(2025),
      non_hce_confirmed: z.literal(true),
      active_duty_spouse_at_hire_confirmed: z.literal(true),
      participated_in_2025_confirmed: z.literal(true),
      qualified_employer_contribution: dollars,
      elective_deferrals_excluded_confirmed: z.literal(true),
    }).strict(),
  ).min(1),
}).strict().superRefine((source, ctx) => {
  const employees = new Set<string>();
  source.employees.forEach((employee, index) => {
    if (employees.has(employee.employee_reference)) {
      ctx.addIssue({
        code: "custom",
        path: ["employees", index, "employee_reference"],
        message: "Military spouse employee is duplicated",
      });
    }
    employees.add(employee.employee_reference);
  });
});

export const inputSchema = z.object({
  schedule_c_business_reference: reference,
  plan_type: z.nativeEnum(PlanType),
  startup: startupSchema.optional(),
  contributions: contributionSchema.optional(),
  auto_enrollment: autoEnrollmentSchema.optional(),
  military_spouses: militarySpouseSchema.optional(),
}).strict().refine(
  (source) =>
    source.startup !== undefined || source.contributions !== undefined ||
    source.auto_enrollment !== undefined ||
    source.military_spouses !== undefined,
  { message: "Form 8881 needs a supported credit source" },
);

export type Form8881Input = z.infer<typeof inputSchema>;
export type Form8881Lines = {
  readonly line1: number;
  readonly line2: number;
  readonly line3: number;
  readonly line4: number;
  readonly line5: number;
  readonly line6a: number;
  readonly line6b: number;
  readonly line6c: number;
  readonly line6d: number;
  readonly line6e1: number;
  readonly line6e2: number;
  readonly line6e3: number;
  readonly line6e4: number;
  readonly line6f: number;
  readonly line6g: number;
  readonly line8: number;
  readonly line9: number;
  readonly line11: number;
  readonly line12: number;
  readonly line13: number;
  readonly line15: number;
};

export function calculateForm8881(input: Form8881Input): Form8881Lines {
  const source = inputSchema.parse(input);
  if (
    source.plan_type === PlanType.DefBenefit &&
    (source.contributions || source.military_spouses)
  ) {
    throw new Error(
      "Defined-benefit plan is ineligible for Form 8881 contribution or military-spouse credit",
    );
  }
  const startup = source.startup;
  const line1 = startup?.startup_costs ?? 0;
  const line2 = startup
    ? Math.round(
      line1 *
        (startup.preceding_first_credit_year_qualified_employee_count <= 50
          ? 1
          : 0.5),
    )
    : 0;
  const line3 = (startup?.eligible_non_hce_count ?? 0) * 250;
  const line4 = startup ? Math.min(5_000, Math.max(500, line3)) : 0;
  const line5 = Math.min(line2, line4);

  const contributions = source.contributions;
  const contributionYear = contributions
    ? 2025 - Number(contributions.plan_effective_on.slice(0, 4)) + 1
    : 0;
  const perEmployeeCap =
    [0, 1_000, 1_000, 1_334, 2_000, 4_000][contributionYear] ?? 0;
  const line6a = contributions?.preceding_2025_employee_count ?? 0;
  const line6b =
    contributions?.employees.filter((employee) =>
      employee.qualified_employer_contribution <= 1_000
    ).reduce(
      (sum, employee) => sum + employee.qualified_employer_contribution,
      0,
    ) ?? 0;
  const line6c =
    contributions?.employees.filter((employee) =>
      employee.qualified_employer_contribution > 1_000
    ).reduce(
      (sum, employee) =>
        sum +
        Math.min(employee.qualified_employer_contribution, perEmployeeCap),
      0,
    ) ?? 0;
  const line6d = line6b + line6c;
  const line6e1 = Math.max(0, line6a - 50);
  const line6e2 = line6e1 * 0.02;
  const line6e3 = Math.round(line6d * line6e2);
  const line6e4 = Math.max(0, line6d - line6e3);
  const line6f = line6a > 50 ? line6e4 : line6d;
  const contributionRate = [0, 1, 1, 0.75, 0.5, 0.25][contributionYear] ?? 0;
  // A third-year employee with $1,334 on line 6c would otherwise round
  // $1,000.50 up to $1,001, contrary to the $1,000-per-employee limit.
  const line6g = Math.min(
    Math.round(line6f * contributionRate),
    (contributions?.employees.length ?? 0) * 1_000,
  );
  const line8 = line5 + line6g;
  const line9 = source.auto_enrollment ? 500 : 0;
  const line11 = line9;
  const line12 = (source.military_spouses?.employees.length ?? 0) * 200;
  const line13 = source.military_spouses?.employees.reduce(
    (sum, employee) =>
      sum + Math.min(300, employee.qualified_employer_contribution),
    0,
  ) ?? 0;
  const line15 = line12 + line13;
  return {
    line1,
    line2,
    line3,
    line4,
    line5,
    line6a,
    line6b,
    line6c,
    line6d,
    line6e1,
    line6e2,
    line6e3,
    line6e4,
    line6f,
    line6g,
    line8,
    line9,
    line11,
    line12,
    line13,
    line15,
  };
}

class F8881Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f8881";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([f3800]);

  compute(_ctx: NodeContext, rawInput: Form8881Input): NodeResult {
    const lines = calculateForm8881(rawInput);
    return {
      outputs: [output(f3800, {
        f8881_credit: {
          schedule_c_business_reference: rawInput.schedule_c_business_reference,
          part_i_credit: lines.line8,
          part_ii_credit: lines.line11,
          part_iii_credit: lines.line15,
          subject_to_passive_activity_limit: false,
        },
      })],
    };
  }
}

export const f8881 = new F8881Node();

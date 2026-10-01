import { z } from "zod";
import type { NodeContext } from "../../../../../core/types/node-context.ts";
import type { NodeResult } from "../../../../../core/types/tax-node.ts";
import { output, TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { f3800 } from "../f3800/index.ts";

// January 2021 Form 8994 and December 2024 instructions apply to TY2025.
// This source covers one direct Schedule C employer, not a K-1 credit.
const reference = z.string().trim().min(1);
const dollars = z.number().finite().nonnegative().refine((amount) =>
  Number.isSafeInteger(Math.round(amount * 100)) &&
  Math.abs(amount * 100 - Math.round(amount * 100)) < 0.000001
);
const positiveDollars = dollars.refine((amount) => amount > 0);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value;
});
const ty2025Date = date.refine((value) => value.startsWith("2025-"));

const employeeSchema = z.object({
  employee_name: reference,
  employee_ssn: z.string().regex(/^\d{9}$/),
  payroll_ledger_reference: reference,
  prior_2024_compensation_record_reference: reference,
  prior_2024_compensation: dollars.refine((amount) => amount <= 93_000),
  at_least_one_year_employed_on_leave_start_confirmed: z.literal(true),
  qualifying_leave_purpose: z.enum([
    "birth_or_child_care",
    "adoption_or_foster_placement",
    "family_serious_health_condition",
    "own_serious_health_condition",
    "military_qualifying_exigency",
    "military_caregiver",
  ]),
  leave_start_date: ty2025Date,
  leave_end_date: ty2025Date,
  normal_hourly_wage: positiveDollars,
  usual_weekly_hours: z.number().finite().positive().max(168),
  policy_annual_leave_weeks_for_employee: z.number().finite().positive(),
  leave_hours: z.number().finite().positive(),
  leave_weeks: z.number().finite().positive().max(12),
  policy_wage_replacement_rate: z.number().finite().min(0.5).max(1),
  employer_paid_qualifying_leave_wages: positiveDollars,
  no_state_or_local_required_or_paid_wages_included_confirmed: z.literal(true),
  no_other_general_business_credit_wage_overlap_confirmed: z.literal(true),
  no_other_leave_purpose_wages_included_confirmed: z.literal(true),
}).strict().superRefine((employee, ctx) => {
  const expectedWages = Math.round(
    employee.normal_hourly_wage * employee.leave_hours *
      employee.policy_wage_replacement_rate * 100,
  ) / 100;
  if (
    employee.leave_end_date < employee.leave_start_date ||
    employee.leave_hours > employee.usual_weekly_hours * employee.leave_weeks ||
    employee.employer_paid_qualifying_leave_wages !== expectedWages
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["employer_paid_qualifying_leave_wages"],
      message:
        "Leave period, hours and employer-paid wages must reconcile to normal pay and policy rate",
    });
  }
});

export const inputSchema = z.object({
  source_type: z.literal("direct_schedule_c"),
  schedule_c_business_reference: reference,
  proprietor_ssn: z.string().regex(/^\d{9}$/),
  employer_ein: z.string().regex(/^\d{9}$/),
  written_policy_reference: reference,
  policy_adopted_date: date,
  policy_effective_date: date,
  full_time_annual_leave_weeks: z.number().finite().min(2),
  full_time_usual_weekly_hours: z.number().finite().min(30).max(168),
  all_qualifying_employee_classes_covered_confirmed: z.literal(true),
  policy_leave_specifically_designated_for_fmla_confirmed: z.literal(true),
  noninterference_language_and_compliance_confirmed: z.literal(true),
  no_pass_through_credit_confirmed: z.literal(true),
  no_controlled_group_or_common_control_confirmed: z.literal(true),
  schedule_c_wage_ledger_reference: reference,
  other_schedule_c_wages: dollars,
  employees: z.array(employeeSchema).min(1),
}).strict().superRefine((source, ctx) => {
  const policyStart = source.policy_adopted_date > source.policy_effective_date
    ? source.policy_adopted_date
    : source.policy_effective_date;
  const ssns = new Set<string>();
  const ledgers = new Set<string>();
  for (const employee of source.employees) {
    if (employee.leave_start_date < policyStart) {
      ctx.addIssue({
        code: "custom",
        path: ["employees"],
        message: "Written policy must precede credited leave",
      });
    }
    const minimumWeeks = 2 * Math.min(
      1,
      employee.usual_weekly_hours / source.full_time_usual_weekly_hours,
    );
    if (employee.policy_annual_leave_weeks_for_employee < minimumWeeks) {
      ctx.addIssue({
        code: "custom",
        path: ["employees"],
        message: "Policy leave is below the two-week prorated minimum",
      });
    }
    if (
      ssns.has(employee.employee_ssn) ||
      ledgers.has(employee.payroll_ledger_reference)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["employees"],
        message: "Each employee and payroll source must occur once",
      });
    }
    ssns.add(employee.employee_ssn);
    ledgers.add(employee.payroll_ledger_reference);
  }
});

export type F8994Input = z.infer<typeof inputSchema>;

export function calculateForm8994(raw: F8994Input) {
  const source = inputSchema.parse(raw);
  const employeeCredits = source.employees.map((employee) => {
    const applicableRate = Math.min(
      0.25,
      0.125 + 0.25 * (employee.policy_wage_replacement_rate - 0.5),
    );
    return {
      employee_ssn: employee.employee_ssn,
      qualified_wages: employee.employer_paid_qualifying_leave_wages,
      applicable_rate: applicableRate,
      credit: employee.employer_paid_qualifying_leave_wages * applicableRate,
    };
  });
  const line1 = Math.round(
    employeeCredits.reduce((sum, employee) => sum + employee.credit, 0),
  );
  return { line1, line2: 0, line3: line1, employeeCredits };
}

class F8994Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f8994";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([f3800]);

  compute(_ctx: NodeContext, rawInput: F8994Input): NodeResult {
    const source = inputSchema.parse(rawInput);
    const lines = calculateForm8994(source);
    return {
      outputs: [output(f3800, {
        f8994_direct_employer_credit: {
          credit_amount: lines.line3,
          schedule_c_business_reference: source.schedule_c_business_reference,
          schedule_c_wage_ledger_reference:
            source.schedule_c_wage_ledger_reference,
          subject_to_passive_activity_limit: false,
        },
      })],
    };
  }
}

export const f8994 = new F8994Node();

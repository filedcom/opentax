import { z } from "zod";
import type { NodeResult } from "../../../../../core/types/tax-node.ts";
import { output, TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";
import { f3800 } from "../f3800/index.ts";

// Form 8844 (Rev. March 2020), current for TY2025. The direct-employer
// contract covers one Schedule C business. Pass-through credits are separate
// Form 3800 sources and do not become a personal Form 8844.
const money = z.number().int().nonnegative();

export const itemSchema = z.object({
  employee_reference: z.string().trim().min(1),
  payroll_record_reference: z.string().trim().min(1),
  zone_designation_reference: z.string().trim().min(1),
  residence_zone_reference: z.string().trim().min(1),
  work_zone_reference: z.string().trim().min(1),
  qualified_zone_wages: money,
  wages_used_for_work_opportunity_credit: money,
  zone_designation_active_in_2025_confirmed: z.literal(true),
  substantially_all_services_in_zone_confirmed: z.literal(true),
  principal_residence_in_zone_confirmed: z.literal(true),
  ninety_day_employment_or_exception_confirmed: z.literal(true),
  no_excluded_employee_or_business_confirmed: z.literal(true),
  futa_wage_and_other_credit_exclusions_reviewed_confirmed: z.literal(true),
}).strict().superRefine((item, ctx) => {
  if (
    item.residence_zone_reference !== item.zone_designation_reference ||
    item.work_zone_reference !== item.zone_designation_reference
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["zone_designation_reference"],
      message:
        "Employee must live and work in the same designated empowerment zone",
    });
  }
  if (item.wages_used_for_work_opportunity_credit > item.qualified_zone_wages) {
    ctx.addIssue({
      code: "custom",
      path: ["wages_used_for_work_opportunity_credit"],
      message:
        "Form 5884 wages cannot exceed this employee's qualified zone wages",
    });
  }
});

export const inputSchema = z.object({
  schedule_c_business_reference: z.string().trim().min(1),
  payroll_ledger_reference: z.string().trim().min(1),
  f8844s: z.array(itemSchema).min(1),
}).strict().superRefine((input, ctx) => {
  const employees = new Set<string>();
  const payrollRows = new Set<string>();
  input.f8844s.forEach((item, index) => {
    if (employees.has(item.employee_reference)) {
      ctx.addIssue({
        code: "custom",
        path: ["f8844s", index, "employee_reference"],
        message: "Form 8844 employee is duplicated",
      });
    }
    if (payrollRows.has(item.payroll_record_reference)) {
      ctx.addIssue({
        code: "custom",
        path: ["f8844s", index, "payroll_record_reference"],
        message: "Form 8844 payroll row is duplicated",
      });
    }
    employees.add(item.employee_reference);
    payrollRows.add(item.payroll_record_reference);
  });
});

export type F8844Input = z.infer<typeof inputSchema>;

export function calculateForm8844(raw: F8844Input) {
  const source = inputSchema.parse(raw);
  const rows = source.f8844s.map((item) => {
    const eligibleWages = Math.min(
      item.qualified_zone_wages - item.wages_used_for_work_opportunity_credit,
      Math.max(0, 15_000 - item.wages_used_for_work_opportunity_credit),
    );
    return { item, eligibleWages };
  });
  const line1 = rows.reduce((sum, row) => sum + row.eligibleWages, 0);
  const line2 = line1 / 5;
  if (!Number.isSafeInteger(line1) || !Number.isSafeInteger(line2)) {
    throw new Error(
      "Form 8844 direct-employer credit needs whole-dollar source precision",
    );
  }
  return { rows, line1, line2, line3: 0, line4: line2 };
}

class F8844Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f8844";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([f3800]);

  compute(
    _ctx: NodeContext,
    rawInput: z.infer<typeof inputSchema>,
  ): NodeResult {
    const source = inputSchema.parse(rawInput);
    const lines = calculateForm8844(source);
    return {
      outputs: lines.line2 > 0
        ? [output(f3800, {
          f8844_direct_employer_credit: {
            credit_amount: lines.line2,
            schedule_c_business_reference: source.schedule_c_business_reference,
            payroll_ledger_reference: source.payroll_ledger_reference,
            subject_to_passive_activity_limit: false,
          },
        })]
        : [],
    };
  }
}

export const f8844 = new F8844Node();

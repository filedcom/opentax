import { z } from "zod";
import type { NodeOutput, NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { schedule3 } from "../../intermediate/schedule3/index.ts";

// ─── TY2025 Constants (IRC §45E — Small Employer Pension Plan Startup Costs) ──

// Max startup cost credit per year: $5,000
const MAX_STARTUP_CREDIT_PER_YEAR = 5000;

// Auto-enrollment credit: $500/year (§45E(e))
const AUTO_ENROLLMENT_CREDIT = 500;

// Credit years: 3
const CREDIT_YEARS = 3;

// 100% credit for ≤50 employees; 50% for 51–100
const SMALL_EMPLOYER_THRESHOLD = 50;
const LARGE_RATE = 0.50;
const SMALL_RATE = 1.00;

// Minimum employee earnings threshold for counting eligible employees: $5,000
// (Not used in credit calculation — used for eligibility determination)

export enum PlanType {
  Plan401k = "401k",
  Simple = "simple",
  Sep = "sep",
  DefBenefit = "defined_benefit",
  Other = "other",
}

export const inputSchema = z.object({
  plan_type: z.nativeEnum(PlanType),
  // Number of non-highly-compensated employees
  non_hce_count: z.number().int().nonnegative(),
  // Total number of employees ≤100 (determines rate tier)
  employee_count: z.number().int().nonnegative(),
  // Eligible startup costs incurred for this year
  startup_costs: z.number().nonnegative(),
  // Whether the plan includes an auto-enrollment feature (§401(k)(13) or §6433)
  has_auto_enrollment: z.boolean().optional(),
  // Tax year of claim (1, 2, or 3) — within the 3-year credit window
  credit_year: z.number().int().min(1).max(CREDIT_YEARS).optional(),
});

type F8881Input = z.infer<typeof inputSchema>;

function startupCreditRate(employeeCount: number): number {
  return employeeCount <= SMALL_EMPLOYER_THRESHOLD ? SMALL_RATE : LARGE_RATE;
}

function startupCredit(input: F8881Input): number {
  // Employer must have ≤100 eligible employees
  if (input.employee_count > 100) return 0;
  // Must have at least 1 non-HCE
  if (input.non_hce_count < 1) return 0;

  const rate = startupCreditRate(input.employee_count);
  const baseCredit = input.startup_costs * rate;
  return Math.min(baseCredit, MAX_STARTUP_CREDIT_PER_YEAR);
}

function autoEnrollmentCredit(input: F8881Input): number {
  if (input.has_auto_enrollment !== true) return 0;
  return AUTO_ENROLLMENT_CREDIT;
}

function buildOutputs(credit: number): NodeOutput[] {
  if (credit <= 0) return [];
  return [{ nodeType: schedule3.nodeType, fields: { line6z_general_business_credit: credit } }];
}

class F8881Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f8881";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule3]);

  compute(rawInput: F8881Input): NodeResult {
    const input = inputSchema.parse(rawInput);
    const credit = startupCredit(input) + autoEnrollmentCredit(input);
    return { outputs: buildOutputs(credit) };
  }
}

export const f8881 = new F8881Node();

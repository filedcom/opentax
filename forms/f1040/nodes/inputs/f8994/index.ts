import { z } from "zod";
import type { NodeOutput, NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { schedule3 } from "../../intermediate/aggregation/schedule3/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// ─── TY2025 Constants (IRC §45S) ─────────────────────────────────────────────

// Credit rate: 12.5% base, +0.25% per point above 50%, capped at 25%
const BASE_RATE = 0.125;
const RATE_INCREMENT = 0.0025; // per percentage point above 50%
const MAX_RATE = 0.25;

// Minimum wage replacement rate to qualify: 50%
const MIN_WAGE_PCT = 0.50;

// Form 8994 — Employer Credit for Paid Family and Medical Leave (IRC §45S)
//
// Eligible employers who provide qualifying paid family/medical leave may claim
// a credit equal to a percentage of wages paid during leave.
// Credit flows to Schedule 3 line 6z (general business credit).

const employeeSchema = z.object({
  // Wages paid during FMLA leave
  fmla_wages: z.number().nonnegative(),
  // Percentage of wages paid (as a decimal: 0.50 to 1.00)
  wage_replacement_pct: z.number().min(0).max(1),
  // Number of weeks of leave provided
  weeks_leave: z.number().nonnegative().optional(),
});

export const inputSchema = z.object({
  // List of qualifying employees with leave data
  employees: z.array(employeeSchema).optional(),
});

type EmployeeEntry = z.infer<typeof employeeSchema>;
type F8994Input = z.infer<typeof inputSchema>;

// Credit rate for a given wage replacement percentage
function creditRate(wagePct: number): number {
  if (wagePct < MIN_WAGE_PCT) return 0;
  // +0.25% for each point above 50%, capped at 25%
  const pointsAbove50 = Math.round((wagePct - MIN_WAGE_PCT) * 100);
  return Math.min(BASE_RATE + pointsAbove50 * RATE_INCREMENT, MAX_RATE);
}

function employeeCredit(e: EmployeeEntry): number {
  const rate = creditRate(e.wage_replacement_pct);
  return Math.round(e.fmla_wages * rate);
}

function totalCredit(employees: EmployeeEntry[]): number {
  return employees.reduce((sum, e) => sum + employeeCredit(e), 0);
}

function buildOutput(credit: number): NodeOutput[] {
  if (credit <= 0) return [];
  return [{ nodeType: schedule3.nodeType, fields: { line6z_general_business_credit: credit } }];
}

class F8994Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f8994";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule3]);

  compute(_ctx: NodeContext, rawInput: F8994Input): NodeResult {
    const input = inputSchema.parse(rawInput);
    const employees = input.employees ?? [];
    const credit = totalCredit(employees);
    return { outputs: buildOutput(credit) };
  }
}

export const f8994 = new F8994Node();

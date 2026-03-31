import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import { TaxNode, output } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { schedule2 } from "../schedule2/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// ─── TY2025 Constants (Rev Proc 2024-40; IRS Publication 926) ────────────────

// FICA threshold — wages that trigger household employment taxes (IRC §3510)
// If you pay any single household employee $2,800 or more in 2025, you must
// withhold and pay FICA taxes on ALL wages paid to that employee.
const FICA_THRESHOLD = 2_800;

// Social Security wage base TY2025 (IRC §3121(a)(1))
const SS_WAGE_BASE = 176_100;

// FICA rates — employer and employee share each pay:
// Social Security: 6.2% employer + 6.2% employee = 12.4% total
// Medicare: 1.45% employer + 1.45% employee = 2.9% total
// Combined: 7.65% employer + 7.65% employee = 15.3% total
const SS_RATE_EMPLOYER = 0.062;
const SS_RATE_EMPLOYEE = 0.062;
const MEDICARE_RATE_EMPLOYER = 0.0145;
const MEDICARE_RATE_EMPLOYEE = 0.0145;

// Federal Unemployment Tax (FUTA) — not computed here but threshold triggers filing
// FUTA threshold: $1,000 in any calendar quarter
const FUTA_THRESHOLD_QUARTERLY = 1_000;

// ─── Schema ───────────────────────────────────────────────────────────────────

export const inputSchema = z.object({
  // Total cash wages paid to all household employees during TY2025
  total_cash_wages: z.number().nonnegative().optional(),

  // FICA wages subject to Social Security and Medicare taxes
  // If total_cash_wages >= $2,800 threshold for any employee, all wages are subject to FICA
  // May equal total_cash_wages when threshold is met
  fica_wages: z.number().nonnegative().optional(),

  // Social Security wages (may differ if wages exceed SS wage base)
  ss_wages: z.number().nonnegative().optional(),

  // Medicare wages (all FICA wages — no wage base cap)
  medicare_wages: z.number().nonnegative().optional(),

  // Federal income tax withheld from household employee wages
  // Must withhold only if employee requests it (Form W-4)
  federal_income_tax_withheld: z.number().nonnegative().optional(),

  // Employee SS tax withheld (6.2% of SS wages)
  employee_ss_withheld: z.number().nonnegative().optional(),

  // Employee Medicare tax withheld (1.45% of Medicare wages)
  employee_medicare_withheld: z.number().nonnegative().optional(),

  // FUTA wages subject to federal unemployment tax
  // Generally wages up to $7,000 per employee
  futa_wages: z.number().nonnegative().optional(),

  // FUTA tax liability (6% of FUTA wages after state credit)
  // Net FUTA after state credit is typically 0.6%
  futa_tax: z.number().nonnegative().optional(),
});

type ScheduleHInput = z.infer<typeof inputSchema>;

// ─── Pure Helpers ─────────────────────────────────────────────────────────────

// Employer share of Social Security tax (6.2% of SS wages up to wage base)
function employerSsTax(ssWages: number): number {
  const cappedWages = Math.min(ssWages, SS_WAGE_BASE);
  return cappedWages * SS_RATE_EMPLOYER;
}

// Employer share of Medicare tax (1.45% — no wage base limit)
function employerMedicareTax(medicareWages: number): number {
  return medicareWages * MEDICARE_RATE_EMPLOYER;
}

// Total FICA wages — use explicit field or fall back to total cash wages if over threshold
function ficaWages(input: ScheduleHInput): number {
  if (input.fica_wages !== undefined) return input.fica_wages;
  const totalWages = input.total_cash_wages ?? 0;
  // Auto-apply threshold: if total wages >= FICA_THRESHOLD, all wages are FICA wages
  return totalWages >= FICA_THRESHOLD ? totalWages : 0;
}

// SS wages — capped at SS wage base
function ssWages(input: ScheduleHInput): number {
  if (input.ss_wages !== undefined) return input.ss_wages;
  return Math.min(ficaWages(input), SS_WAGE_BASE);
}

// Medicare wages — all FICA wages
function medicareWages(input: ScheduleHInput): number {
  return input.medicare_wages ?? ficaWages(input);
}

// Total household employment tax for Schedule H line 26
// = Employer SS + employer Medicare + employee SS withheld + employee Medicare withheld
//   + federal income tax withheld + FUTA
function totalHouseholdTax(input: ScheduleHInput): number {
  const ssWagesAmt = ssWages(input);
  const medicareWagesAmt = medicareWages(input);

  const empSsTax = employerSsTax(ssWagesAmt);
  const empMedicareTax = employerMedicareTax(medicareWagesAmt);

  // Employee share — use provided withholding amounts or compute from rates
  // Employee SS is also capped at SS_WAGE_BASE
  const cappedSsForEmployee = Math.min(ssWagesAmt, SS_WAGE_BASE);
  const empSsWithheld = input.employee_ss_withheld ??
    (cappedSsForEmployee * SS_RATE_EMPLOYEE);
  const empMedicareWithheld = input.employee_medicare_withheld ??
    (medicareWagesAmt * MEDICARE_RATE_EMPLOYEE);

  const fedWithheld = input.federal_income_tax_withheld ?? 0;
  const futa = input.futa_tax ?? 0;

  return Math.round(
    empSsTax + empMedicareTax + empSsWithheld + empMedicareWithheld + fedWithheld + futa,
  );
}

function buildOutput(totalTax: number): NodeOutput[] {
  if (totalTax <= 0) return [];
  return [output(schedule2, { line7a_household_employment: totalTax })];
}

// ─── Node Class ───────────────────────────────────────────────────────────────

class ScheduleHNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "schedule_h";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule2]);

  compute(_ctx: NodeContext, rawInput: ScheduleHInput): NodeResult {
    const input = inputSchema.parse(rawInput);

    // If no wages or tax data provided, no output
    const hasWages =
      (input.total_cash_wages ?? 0) > 0 ||
      (input.fica_wages ?? 0) > 0 ||
      (input.ss_wages ?? 0) > 0 ||
      (input.medicare_wages ?? 0) > 0 ||
      (input.employee_ss_withheld ?? 0) > 0 ||
      (input.employee_medicare_withheld ?? 0) > 0 ||
      (input.federal_income_tax_withheld ?? 0) > 0 ||
      (input.futa_tax ?? 0) > 0;

    if (!hasWages) return { outputs: [] };

    const totalTax = totalHouseholdTax(input);
    return { outputs: buildOutput(totalTax) };
  }
}

// ─── Singleton Export ─────────────────────────────────────────────────────────

export const schedule_h = new ScheduleHNode();

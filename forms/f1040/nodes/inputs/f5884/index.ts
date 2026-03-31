import { z } from "zod";
import type { NodeOutput, NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { schedule3 } from "../../intermediate/aggregation/schedule3/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// ─── TY2025 Constants (IRC §51) ───────────────────────────────────────────────

// Target group codes per IRS Form 5884 instructions
export enum TargetGroup {
  // Group 1: IV-A recipients (TANF)
  TanfRecipient = "1",
  // Group 2: Veterans (food stamp recipient)
  VeteranFoodStamp = "2",
  // Group 3: Ex-felons
  ExFelon = "3",
  // Group 4: Designated community residents (SNAP recipient, 18-39)
  DesignatedCommunityResident = "4",
  // Group 5: Vocational rehabilitation referral
  VocationalRehabilitation = "5",
  // Group 6: Summer youth employee (16-17, in empowerment zone)
  SummerYouth = "6",
  // Group 7: SNAP recipients (food stamps, 18-39)
  SnapRecipient = "7",
  // Group 8: SSI recipients
  SsiRecipient = "8",
  // Group 9: Long-term family assistance recipient (LTFA)
  LongTermFamilyAssistance = "9",
  // Group 10: Qualified long-term unemployment recipient
  LongTermUnemployment = "10",
}

// Credit rates per IRC §51(a) and §51(d)(8)
const RATE_LOW_HOURS = 0.25; // 120-399 hours worked
const RATE_HIGH_HOURS = 0.40; // 400+ hours worked
const RATE_LTFA_FIRST_YEAR = 0.40; // Long-term family assistance, year 1
const RATE_LTFA_SECOND_YEAR = 0.50; // Long-term family assistance, year 2

// Wage caps per group (IRC §51(b)(3))
const WAGE_CAP_STANDARD = 6000; // most groups, first-year
const WAGE_CAP_SUMMER_YOUTH = 3000; // group 6 summer youth
const WAGE_CAP_LTFA_FIRST = 10000; // group 9 LTFA, first year
const WAGE_CAP_LTFA_SECOND = 10000; // group 9 LTFA, second year
const WAGE_CAP_VETERAN_DISABLED_1YR = 12000; // disabled veteran 1-year
const WAGE_CAP_VETERAN_DISABLED_2YR = 14000; // disabled veteran long-term

// Per-item schema — one entry per employee/group
export const itemSchema = z.object({
  target_group: z.nativeEnum(TargetGroup),
  // First-year qualified wages (Line 1a/1b/1c depending on group)
  first_year_wages: z.number().nonnegative(),
  // Second-year wages (only for LTFA group, Line 2)
  second_year_wages: z.number().nonnegative().optional(),
  // Hours worked (determines rate tier; not required for LTFA computation)
  hours_worked: z.number().nonnegative().optional(),
  // Special veteran subcategory affects wage cap
  is_disabled_veteran: z.boolean().optional(),
  is_disabled_veteran_long_term: z.boolean().optional(),
});

export const inputSchema = z.object({
  f5884s: z.array(itemSchema).min(1),
});

type F5884Item = z.infer<typeof itemSchema>;

// Wage cap for an employee entry
function wageCap(item: F5884Item): number {
  if (item.target_group === TargetGroup.SummerYouth) return WAGE_CAP_SUMMER_YOUTH;
  if (item.target_group === TargetGroup.LongTermFamilyAssistance) return WAGE_CAP_LTFA_FIRST;
  if (item.is_disabled_veteran_long_term === true) return WAGE_CAP_VETERAN_DISABLED_2YR;
  if (item.is_disabled_veteran === true) return WAGE_CAP_VETERAN_DISABLED_1YR;
  return WAGE_CAP_STANDARD;
}

// Credit rate based on hours (not used for LTFA)
function standardRate(hours: number): number {
  if (hours >= 400) return RATE_HIGH_HOURS;
  if (hours >= 120) return RATE_LOW_HOURS;
  return 0;
}

// Credit for one employee entry
function employeeCredit(item: F5884Item): number {
  const hours = item.hours_worked ?? 0;

  if (item.target_group === TargetGroup.LongTermFamilyAssistance) {
    // IRC §51(d)(8): 40% first-year + 50% second-year, each capped at $10k
    const firstYearCredit = Math.min(item.first_year_wages, WAGE_CAP_LTFA_FIRST) * RATE_LTFA_FIRST_YEAR;
    const secondYearCredit = Math.min(item.second_year_wages ?? 0, WAGE_CAP_LTFA_SECOND) * RATE_LTFA_SECOND_YEAR;
    return firstYearCredit + secondYearCredit;
  }

  const rate = standardRate(hours);
  if (rate === 0) return 0;

  const cap = wageCap(item);
  return Math.min(item.first_year_wages, cap) * rate;
}

function totalCredit(items: F5884Item[]): number {
  return items.reduce((sum, item) => sum + employeeCredit(item), 0);
}

function buildOutputs(credit: number): NodeOutput[] {
  if (credit <= 0) return [];
  return [{ nodeType: schedule3.nodeType, fields: { line6z_general_business_credit: credit } }];
}

class F5884Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f5884";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule3]);

  compute(_ctx: NodeContext, rawInput: z.infer<typeof inputSchema>): NodeResult {
    const input = inputSchema.parse(rawInput);
    const credit = totalCredit(input.f5884s);
    return { outputs: buildOutputs(credit) };
  }
}

export const f5884 = new F5884Node();

import { z } from "zod";
import type { NodeOutput, NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode, output } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { f1040 } from "../../outputs/f1040/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// Household Employee Wages (IRC §3401(a)(3), §3121(a)(7))
// This node captures wages received BY a taxpayer who worked as a household
// employee (nanny, housekeeper, caretaker, etc.) for a private household employer.
// Wages flow to Form 1040 line 1b. Federal tax withheld flows to line 25a.
// NOTE: This is the EMPLOYEE side. Schedule H covers the EMPLOYER's obligations.

// Per-employer schema — one entry per W-2 / household employer
export const itemSchema = z.object({
  // Gross wages received (W-2 Box 1 equivalent)
  wages_received: z.number().nonnegative(),
  // Federal income tax withheld by household employer (W-2 Box 2)
  federal_income_tax_withheld: z.number().nonnegative().optional(),
  // Social security wages (W-2 Box 3)
  social_security_wages: z.number().nonnegative().optional(),
  // Medicare wages (W-2 Box 5)
  medicare_wages: z.number().nonnegative().optional(),
  // Social security tax withheld (W-2 Box 4)
  ss_tax_withheld: z.number().nonnegative().optional(),
  // Medicare tax withheld (W-2 Box 6)
  medicare_tax_withheld: z.number().nonnegative().optional(),
  // Employer name (informational)
  employer_name: z.string().optional(),
  // Employer EIN (informational)
  employer_ein: z.string().optional(),
});

export const inputSchema = z.object({
  household_wages: z.array(itemSchema).min(1),
});

type HouseholdWageItem = z.infer<typeof itemSchema>;
type HouseholdWageItems = HouseholdWageItem[];

function totalWages(items: HouseholdWageItems): number {
  return items.reduce((sum: number, item: HouseholdWageItem) => sum + item.wages_received, 0);
}

function totalWithholding(items: HouseholdWageItems): number {
  return items.reduce((sum: number, item: HouseholdWageItem) => sum + (item.federal_income_tax_withheld ?? 0), 0);
}

function f1040Output(items: HouseholdWageItems): NodeOutput[] {
  const wages = totalWages(items);
  if (wages === 0) return [];

  const withheld = totalWithholding(items);
  if (withheld > 0) {
    return [output(f1040, { line1b_household_wages: wages, line25a_w2_withheld: withheld })];
  }
  return [output(f1040, { line1b_household_wages: wages })];
}

class HouseholdWagesNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "household_wages";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([f1040]);

  compute(_ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
    const parsed = inputSchema.parse(input);
    return { outputs: f1040Output(parsed.household_wages) };
  }
}

export const household_wages = new HouseholdWagesNode();

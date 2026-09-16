import { z } from "zod";
import type { NodeOutput, NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { f1040 } from "../../outputs/f1040/index.ts";
import { IncomeCategory, form_1116 } from "../../intermediate/forms/form_1116/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// Foreign Employer Compensation (IRC §61; IRS Pub 54)
// US citizens and residents must report worldwide income including wages
// from foreign employers who did not issue a US W-2 and did not withhold
// US taxes. The taxpayer self-reports these amounts and converts to USD.
// The Foreign Earned Income Exclusion (Form 2555) is handled separately.

// Per-employer schema — one entry per foreign employer
export const itemSchema = z.object({
  // Name of the foreign employer
  foreign_employer_name: z.string(),
  // ISO 3166-1 alpha-2 country code of the foreign employer
  country_code: z.string(),
  // Amount in foreign currency (pre-conversion, for record-keeping)
  compensation_amount: z.number().nonnegative(),
  // ISO 4217 currency code (e.g., "EUR", "GBP", "JPY")
  currency: z.string().optional(),
  // Amount converted to US dollars at IRS-approved exchange rate
  compensation_usd: z.number().nonnegative(),
  // Optional description of the position/employment
  description: z.string().optional(),
  // Foreign income tax paid or accrued on this compensation, converted to USD.
  // Claimed on Form 1116 in the general limitation category — compensation for
  // personal services as an employee is general category income, not passive
  // (IRC §904(d)(1)(B); Form 1116 Part I box d and line 1b).
  foreign_tax_paid_usd: z.number().nonnegative().optional(),
});

export const inputSchema = z.object({
  fecs: z.array(itemSchema).min(1),
});

type FecItem = z.infer<typeof itemSchema>;
type FecItems = FecItem[];

function totalCompensationUsd(items: FecItems): number {
  return items.reduce((sum: number, item: FecItem) => sum + item.compensation_usd, 0);
}

function f1040Output(items: FecItems): NodeOutput[] {
  const total = totalCompensationUsd(items);
  if (total === 0) return [];
  return [{
    nodeType: f1040.nodeType,
    fields: { line1a_wages: total },
  }];
}

// Foreign tax on wages → Form 1116, general category.
// The §904(j) de minimis election that lets small amounts skip Form 1116 applies
// only to passive income shown on a payee statement, so wage tax files the form
// at any amount. The compensation that bore the tax is the line 1a numerator of
// the §904(a) limitation.
function form1116Output(items: FecItems): NodeOutput[] {
  const taxed = items.filter((item) => (item.foreign_tax_paid_usd ?? 0) > 0);
  if (taxed.length === 0) return [];
  const tax = taxed.reduce((sum: number, item: FecItem) => sum + item.foreign_tax_paid_usd!, 0);
  const income = taxed.reduce((sum: number, item: FecItem) => sum + item.compensation_usd, 0);
  return [{
    nodeType: form_1116.nodeType,
    fields: {
      foreign_tax_paid: tax,
      income_category: IncomeCategory.General,
      ...(income > 0 ? { foreign_income: income } : {}),
    },
  }];
}

class FecNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "fec";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([f1040, form_1116]);

  compute(_ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
    const parsed = inputSchema.parse(input);
    return {
      outputs: [
        ...f1040Output(parsed.fecs),
        ...form1116Output(parsed.fecs),
      ],
    };
  }
}

export const fec = new FecNode();

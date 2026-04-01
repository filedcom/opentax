import { z } from "zod";
import type { NodeOutput, NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { f1040 } from "../../outputs/f1040/index.ts";
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

class FecNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "fec";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([f1040]);

  compute(_ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
    const parsed = inputSchema.parse(input);
    return { outputs: f1040Output(parsed.fecs) };
  }
}

export const fec = new FecNode();

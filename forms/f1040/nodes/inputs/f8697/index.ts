import { z } from "zod";
import type { NodeOutput, NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { schedule1 } from "../../outputs/schedule1/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// Form 8697 — Interest Computation Under the Look-Back Method
// for Completed Long-Term Contracts (IRC §460(b))
//
// When a long-term contract is completed, the taxpayer recomputes income
// using actual (not estimated) progress completion percentages for each
// prior year. If tax was underpaid → interest owed to IRS (additional income).
// If tax was overpaid → interest receivable (deduction from income).
// Net interest routes to Schedule 1.

export enum ContractType {
  Regular = "regular",
  Simplified = "simplified",
}

// Per-affected-year schema
export const priorYearSchema = z.object({
  // The tax year affected by the look-back recomputation
  tax_year: z.number().int(),
  // Hypothetical tax computed under the look-back method for that year
  hypothetical_tax: z.number().nonnegative().optional(),
  // Actual tax reported/paid in that year
  actual_tax_paid: z.number().nonnegative().optional(),
});

// Per-item schema — one Form 8697 per completed contract
export const itemSchema = z.object({
  // Type of long-term contract method used
  contract_type: z.nativeEnum(ContractType),
  // Prior years affected by look-back recomputation
  prior_tax_years_affected: z.array(priorYearSchema).optional(),
  // Net overpayment of tax in prior years (interest receivable from IRS)
  overpayment_of_tax_prior_year: z.number().nonnegative().optional(),
  // Net underpayment of tax in prior years (interest owed to IRS)
  underpayment_of_tax_prior_year: z.number().nonnegative().optional(),
  // Applicable federal rate for look-back interest
  interest_rate: z.number().nonnegative().optional(),
  // Net interest amount (positive = owed to IRS, negative = receivable)
  net_interest: z.number().optional(),
});

export const inputSchema = z.object({
  f8697s: z.array(itemSchema).min(1),
});

type F8697Item = z.infer<typeof itemSchema>;
type F8697Items = F8697Item[];

// Total net interest across all contracts
function totalNetInterest(items: F8697Items): number {
  return items.reduce((sum, item) => sum + (item.net_interest ?? 0), 0);
}

function buildOutputs(items: F8697Items): NodeOutput[] {
  const net = totalNetInterest(items);
  if (net === 0) return [];

  if (net > 0) {
    // Interest owed to IRS — additional income on Schedule 1
    return [{
      nodeType: schedule1.nodeType,
      fields: { line8z_other_income: net },
    }];
  }

  // Interest receivable from IRS — deduction on Schedule 1
  return [{
    nodeType: schedule1.nodeType,
    fields: { line8z_other: net },
  }];
}

class F8697Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f8697";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule1]);

  compute(_ctx: NodeContext, rawInput: z.infer<typeof inputSchema>): NodeResult {
    const input = inputSchema.parse(rawInput);
    return { outputs: buildOutputs(input.f8697s) };
  }
}

export const f8697 = new F8697Node();

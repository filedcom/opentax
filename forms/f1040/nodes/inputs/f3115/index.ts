import { z } from "zod";
import type { NodeOutput, NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { schedule1 } from "../../outputs/schedule1/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// Form 3115 — Application for Change in Accounting Method
// Filed under IRC §446(e) and Rev. Proc. 2015-13 to request IRS consent
// for an accounting method change. The §481(a) adjustment is the cumulative
// difference in income/deductions between old and new methods through the
// beginning of the year of change.
//
// Positive §481(a) adjustment → additional income on Schedule 1 (line 8z_other_income)
// Negative §481(a) adjustment → deduction on Schedule 1 (line 8z_other, as negative)

export enum FilingType {
  Automatic = "automatic",
  AdvanceConsent = "advance_consent",
}

// Per-item schema — one Form 3115 per accounting method change request
export const itemSchema = z.object({
  // IRS-designated change number (DCN) from Rev. Proc. 2015-13 Appendix
  designated_change_number: z.string().min(1),
  // Whether filed under automatic change procedures or requires advance IRS consent
  filing_type: z.nativeEnum(FilingType),
  // Net §481(a) adjustment: positive = income, negative = deduction
  section_481_adjustment: z.number().optional(),
  // Number of years over which to spread the §481(a) adjustment (>=1)
  spread_period: z.number().int().min(1).optional(),
  // Description of the accounting method before the change
  accounting_method_before: z.string().optional(),
  // Description of the proposed accounting method
  accounting_method_proposed: z.string().optional(),
});

export const inputSchema = z.object({
  f3115s: z.array(itemSchema).min(1),
});

type F3115Item = z.infer<typeof itemSchema>;
type F3115Items = F3115Item[];

// Compute the current-year §481(a) amount for a single item
function annualAdjustment(item: F3115Item): number {
  const total = item.section_481_adjustment ?? 0;
  if (total === 0) return 0;
  const spread = item.spread_period ?? 1;
  return total / spread;
}

// Aggregate §481(a) amounts across all items
function totalAnnualAdjustment(items: F3115Items): number {
  return items.reduce((sum, item) => sum + annualAdjustment(item), 0);
}

// Build Schedule 1 output for §481(a) adjustment
function buildOutputs(items: F3115Items): NodeOutput[] {
  const netAdjustment = totalAnnualAdjustment(items);
  if (netAdjustment === 0) return [];

  if (netAdjustment > 0) {
    return [{
      nodeType: schedule1.nodeType,
      fields: { line8z_other_income: netAdjustment },
    }];
  }

  // Negative adjustment: deduction
  return [{
    nodeType: schedule1.nodeType,
    fields: { line8z_other: netAdjustment },
  }];
}

class F3115Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f3115";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule1]);

  compute(_ctx: NodeContext, rawInput: z.infer<typeof inputSchema>): NodeResult {
    const input = inputSchema.parse(rawInput);
    return { outputs: buildOutputs(input.f3115s) };
  }
}

export const f3115 = new F3115Node();

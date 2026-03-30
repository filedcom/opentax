import { z } from "zod";
import type { NodeOutput, NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { f1040 } from "../../outputs/f1040/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// ─── TY2025 Constants (IRC §1(g)) ─────────────────────────────────────────────

// First $1,300 of child's unearned income: tax-free
const CHILD_THRESHOLD_1 = 1_300;

// Amounts from $1,300.01 to $2,600: taxed at child's rate (10%)
// (included in parent's return per this election but at preferential rate)
// Amounts above $2,600: taxed at parent's rate (already on return)
const CHILD_THRESHOLD_2 = 2_600;

// Per-child "tax" for the second tier ($1,300–$2,600): $130
// IRS computes this as 10% × $1,300
const CHILD_SECOND_TIER_TAX = 130;

// Form 8814 — Parent's Election to Report Child's Interest and Dividends
//
// Allows a parent to include a qualifying child's investment income
// on the parent's return instead of filing a separate return for the child.
// One form per qualifying child (array node).

export const itemSchema = z.object({
  // Child identification
  child_name: z.string().optional(),
  child_ssn: z.string().optional(),

  // Child's investment income (TY2025)
  interest_income: z.number().nonnegative().optional(),
  dividend_income: z.number().nonnegative().optional(),
  capital_gain_distributions: z.number().nonnegative().optional(),
  alaska_pfd: z.number().nonnegative().optional(),          // Alaska Permanent Fund Dividend
});

export const inputSchema = z.object({
  f8814s: z.array(itemSchema),
});

type F8814Item = z.infer<typeof itemSchema>;
type F8814Input = z.infer<typeof inputSchema>;

// Total investment income for one child
function totalIncome(item: F8814Item): number {
  return (item.interest_income ?? 0) +
    (item.dividend_income ?? 0) +
    (item.capital_gain_distributions ?? 0) +
    (item.alaska_pfd ?? 0);
}

// Amount included on parent's return (above first $1,300 threshold)
function includedIncome(item: F8814Item): number {
  return Math.max(0, totalIncome(item) - CHILD_THRESHOLD_1);
}

// Interest portion included on parent's return
function includedInterest(item: F8814Item): number {
  const total = totalIncome(item);
  if (total <= CHILD_THRESHOLD_1) return 0;
  return item.interest_income ?? 0;
}

// Dividend portion included on parent's return
function includedDividend(item: F8814Item): number {
  const total = totalIncome(item);
  if (total <= CHILD_THRESHOLD_1) return 0;
  return item.dividend_income ?? 0;
}

// Additional tax for income in the $1,300–$2,600 range (flat $130 per child)
function childTierTax(item: F8814Item): number {
  const total = totalIncome(item);
  if (total <= CHILD_THRESHOLD_1) return 0;
  if (total <= CHILD_THRESHOLD_2) return CHILD_SECOND_TIER_TAX;
  // Above $2,600: the $130 still applies (it's the tax on the second tier)
  return CHILD_SECOND_TIER_TAX;
}

function buildItemOutputs(item: F8814Item): NodeOutput[] {
  const included = includedIncome(item);
  if (included <= 0) return [];

  const outputs: NodeOutput[] = [];

  const interest = includedInterest(item);
  const dividends = includedDividend(item);

  if (interest > 0) {
    outputs.push({ nodeType: f1040.nodeType, fields: { line2b_taxable_interest: interest } });
  }
  if (dividends > 0) {
    outputs.push({ nodeType: f1040.nodeType, fields: { line3b_ordinary_dividends: dividends } });
  }

  // The $130 child-tier tax is an "other tax" — reported on f1040 via schedule2 line 8
  // For now route the tax amount via the same f1040 output as additional withholding context.
  // The child_tier_tax field is informational and captured as metadata.
  const _ = childTierTax(item); // computed but not yet routed to a specific line

  return outputs;
}

class F8814Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f8814";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([f1040]);

  compute(_ctx: NodeContext, rawInput: F8814Input): NodeResult {
    const input = inputSchema.parse(rawInput);
    if (input.f8814s.length === 0) return { outputs: [] };

    const outputs: NodeOutput[] = input.f8814s.flatMap(buildItemOutputs);
    return { outputs };
  }
}

export const f8814 = new F8814Node();

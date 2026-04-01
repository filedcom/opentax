import { z } from "zod";
import type { NodeOutput, NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode, output } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { f1040 } from "../../outputs/f1040/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// TY2025 — Form 8288/8288-A: FIRPTA Withholding
// Under IRC §1445, when a foreign person disposes of US real property, the buyer must
// withhold a percentage of the gross sales price. The foreign seller claims the withheld
// amount as a credit against US tax liability (Form 1040 Line 25b).
// Reg. §1.1445-1; Rev. Proc. 2000-35.

// FIRPTA withholding rates:
// RATE_15: 15% — standard rate (IRC §1445(a))
// RATE_10: 10% — primary residence, gross sales price ≤ $1,000,000 (IRC §1445(b)(8))
// RATE_0:  0%  — primary residence, gross sales price < $300,000 (IRC §1445(b)(5))
export enum WithholdingRate {
  RATE_0 = "RATE_0",
  RATE_10 = "RATE_10",
  RATE_15 = "RATE_15",
}

// Per-item schema — each Form 8288-A covers one property disposition
export const itemSchema = z.object({
  // Street address of the US real property sold (Form 8288-A line 5)
  property_address: z.string(),
  // Total amount realized on the disposition (Form 8288-A line 6b)
  gross_sales_price: z.number().nonnegative(),
  // Withholding rate applied to gross sales price (IRC §1445(a); Reg. §1.1445-2)
  withholding_rate: z.nativeEnum(WithholdingRate),
  // Actual amount withheld by buyer and remitted to IRS (Form 8288-A line 8)
  amount_withheld: z.number().nonnegative(),
  // Name of the buyer/transferee who withheld (Form 8288-A line 2)
  buyer_name: z.string(),
  // TIN of the buyer (Form 8288-A line 3)
  buyer_tin: z.string(),
  // Date of disposition (Form 8288-A line 7)
  disposition_date: z.string(),
});

export const inputSchema = z.object({
  f8288s: z.array(itemSchema).min(1),
});

type F8288Item = z.infer<typeof itemSchema>;
type F8288Items = F8288Item[];

function totalWithheld(items: F8288Items): number {
  return items.reduce((sum, item) => sum + item.amount_withheld, 0);
}

function f1040Output(items: F8288Items): NodeOutput[] {
  const withheld = totalWithheld(items);
  if (withheld === 0) return [];
  // FIRPTA withholding is a payment credit against tax — flows to Form 1040 Line 25b
  return [output(f1040, { line25b_withheld_1099: withheld })];
}

class F8288Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f8288";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([f1040]);

  compute(_ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
    const parsed = inputSchema.parse(input);
    const { f8288s } = parsed;

    return { outputs: f1040Output(f8288s) };
  }
}

export const f8288 = new F8288Node();

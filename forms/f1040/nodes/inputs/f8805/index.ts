import { z } from "zod";
import type { NodeOutput, NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { schedule3 } from "../../intermediate/aggregation/schedule3/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// Form 8805 — Foreign Partner's Information Statement of Section 1446 Withholding Tax
// IRC §1446; Reg. §1.1446-3
//
// A partnership withholds §1446 tax on effectively connected income (ECI)
// allocable to foreign partners. The foreign partner receives Form 8805
// showing withholding paid, which they claim as a credit on their US return.
// Credit flows to Schedule 3 Part II (additional payments reducing tax liability).

// TY2025 withholding rates (IRC §1446(b)(2); Rev. Proc. 2024-40)
// 37% for individual foreign partners; 21% for corporate foreign partners
// (rates are informational — not computed here; withholding is reported as received)

// Per Form 8805 received schema — one per partnership
export const itemSchema = z.object({
  // Name of the partnership that withheld and issued Form 8805 (Form 8805 Box 1)
  partnership_name: z.string(),
  // EIN of the issuing partnership (Form 8805 Box 2)
  partnership_ein: z.string().optional(),
  // Ordinary effectively connected income allocable to this partner (Form 8805 Box 4)
  ordinary_eic_allocable: z.number().nonnegative().optional(),
  // §1446 withholding tax paid by the partnership on this partner's ECI (Form 8805 Box 6)
  section_1446_tax_withheld: z.number().nonnegative().optional(),
  // Total withholding tax (fallback when section_1446_tax_withheld is absent) (Form 8805 Box 8)
  total_tax_withheld: z.number().nonnegative().optional(),
});

export const inputSchema = z.object({
  f8805s: z.array(itemSchema).min(1),
});

type F8805Item = z.infer<typeof itemSchema>;

// Determine the credit amount for a single Form 8805 item.
// section_1446_tax_withheld takes precedence; fall back to total_tax_withheld.
// IRC §1446(d); Reg. §1.1446-3(d)
function itemCreditAmount(item: F8805Item): number {
  if ((item.section_1446_tax_withheld ?? 0) > 0) {
    return item.section_1446_tax_withheld!;
  }
  return item.total_tax_withheld ?? 0;
}

function totalCreditAmount(items: F8805Item[]): number {
  return items.reduce((sum, item) => sum + itemCreditAmount(item), 0);
}

function schedule3Output(items: F8805Item[]): NodeOutput[] {
  const total = totalCreditAmount(items);
  if (total === 0) return [];
  return [{ nodeType: schedule3.nodeType, fields: { line13_1446_withholding: total } }];
}

class F8805Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f8805";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule3]);

  compute(_ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
    const parsed = inputSchema.parse(input);
    return { outputs: schedule3Output(parsed.f8805s) };
  }
}

export const f8805 = new F8805Node();

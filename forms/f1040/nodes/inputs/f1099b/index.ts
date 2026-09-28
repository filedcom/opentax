import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import { output, TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { f1040 } from "../../outputs/f1040/index.ts";
import {
  form8949,
  type Form8949Part,
} from "../../intermediate/forms/form8949/index.ts";
import { schedule_b } from "../../intermediate/aggregation/schedule_b/index.ts";
import { form4952 } from "../../intermediate/forms/form4952/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

const LONG_TERM_PARTS = new Set(["D", "E", "F"]);

// Noncovered securities shift the Form 8949 reporting category:
// Part A (covered ST) → Part B (noncovered ST)
// Part D (covered LT) → Part E (noncovered LT)
// Other parts (B, C, E, F) are unchanged — they already represent noncovered/other.
const NONCOVERED_PART_SHIFT: Partial<Record<string, string>> = {
  A: "B",
  D: "E",
};

export const itemSchema = z.object({
  part: z.enum(["A", "B", "C", "D", "E", "F"]),
  description: z.string(),
  date_acquired: z.string(),
  date_sold: z.string(),
  proceeds: z.number().nonnegative(),
  cost_basis: z.number().nonnegative(),
  adjustment_codes: z.string().optional(),
  adjustment_amount: z.number().optional(),
  federal_withheld: z.number().nonnegative().optional(),
  // Box 1f: accrued market discount (IRC §1278) — ordinary income, not capital gain
  // When present, this amount should be treated as interest income on Schedule B,
  // and the corresponding capital gain reduced by this amount.
  box1f_accrued_market_discount: z.number().nonnegative().optional(),
  market_discount_payer_name: z.string().trim().min(1).optional(),
  // Affirm that this bond was held for investment and that its market
  // discount is not already included in Form 4952's manual other income.
  investment_property_for_form4952: z.boolean().optional(),
  // Box 1g: wash sale loss disallowed (IRC §1091) — added back to cost basis
  // as adjustment code "W". When provided explicitly, upstream can auto-populate
  // adjustment_codes and adjustment_amount rather than requiring manual entry.
  box1g_wash_sale_loss_disallowed: z.number().nonnegative().optional().describe(
    "Box 1g: wash sale loss disallowed (IRC §1091) — increases cost basis via adjustment code W",
  ),
  // Box 3 is shared by collectibles and QOF dispositions. Its checked state
  // alone cannot distinguish the two tax treatments.
  box3_transaction_type: z.enum(["collectibles", "qof"]).optional(),
  box3_collectibles: z.never().optional(),
  // Box 12 says whether basis was reported to the IRS, not whether the sale
  // involves a QOF.
  box12_basis_reported_to_irs: z.boolean().optional(),
  box12_qof_investment: z.never().optional(),
  // Noncovered security flag — basis was NOT reported to IRS (broker not required to report).
  // Transactions involving noncovered securities must use Form 8949 Part B (short-term)
  // or Part E (long-term) rather than Parts A/D.
  noncovered_security: z.boolean().optional().describe(
    "Security acquired before broker cost-basis reporting rules apply — basis not reported to IRS",
  ),
});

export const inputSchema = z.object({
  f1099bs: z.array(itemSchema).min(1),
});

type B99Item = z.infer<typeof itemSchema>;

// box1g_wash_sale_loss_disallowed: convenience field that auto-populates
// adjustment_codes "W" and adjustment_amount when not already set by the caller.
function resolveWashSale(
  item: B99Item,
): { codes: string | undefined; amount: number | undefined } {
  const washAmount = item.box1g_wash_sale_loss_disallowed ?? 0;
  if (
    washAmount <= 0 || item.adjustment_codes !== undefined ||
    item.adjustment_amount !== undefined
  ) {
    return { codes: item.adjustment_codes, amount: item.adjustment_amount };
  }
  return { codes: "W", amount: washAmount };
}

// noncovered_security: shifts Part A→B and Part D→E so the transaction lands
// in the correct Form 8949 box (basis not reported to IRS).
function resolvedPart(item: B99Item): Form8949Part {
  if (item.noncovered_security) {
    const shifted = NONCOVERED_PART_SHIFT[item.part];
    if (shifted !== undefined) return shifted as Form8949Part;
  }
  return item.part as Form8949Part;
}

function processItem(item: B99Item): NodeOutput[] {
  if (item.box3_transaction_type === "qof") {
    throw new Error(
      "1099-B QOF disposition needs the Form 8997 annual statement and reconciled Form 8949 reporting",
    );
  }
  const part = resolvedPart(item);
  if (
    item.box12_basis_reported_to_irs === true &&
      (item.noncovered_security === true || !["A", "D"].includes(part)) ||
    item.box12_basis_reported_to_irs === false &&
      !["B", "E"].includes(part)
  ) {
    throw new Error(
      "1099-B box 12 basis-reporting status conflicts with its Form 8949 category",
    );
  }
  const washSale = resolveWashSale(item);
  const hasMarketDiscount = (item.box1f_accrued_market_discount ?? 0) > 0;
  if (hasMarketDiscount && washSale.codes?.includes("D")) {
    throw new Error(
      "1099-B market discount is already present in Form 8949 adjustment code D",
    );
  }
  // 2025 Form 8949 accrued-market-discount worksheet, lines 3–5: only the
  // lesser of box 1f and positive proceeds less basis becomes ordinary interest.
  const taxableMarketDiscount = hasMarketDiscount
    ? Math.min(
      Math.max(0, item.proceeds - item.cost_basis),
      item.box1f_accrued_market_discount!,
    )
    : 0;
  if (taxableMarketDiscount > 0 && !item.market_discount_payer_name) {
    throw new Error(
      "1099-B market discount needs the taxable-interest payer name",
    );
  }
  const adjustmentCodes = hasMarketDiscount
    ? `${washSale.codes ?? ""}D`
    : washSale.codes;
  const adjustmentAmount = hasMarketDiscount
    ? (washSale.amount ?? 0) - taxableMarketDiscount
    : washSale.amount;
  const gainLoss = item.proceeds - item.cost_basis + (adjustmentAmount ?? 0);
  const isLongTerm = LONG_TERM_PARTS.has(part);

  const outputs: NodeOutput[] = [
    output(form8949, {
      transaction: {
        part,
        description: item.description,
        date_acquired: item.date_acquired,
        date_sold: item.date_sold,
        proceeds: item.proceeds,
        cost_basis: item.cost_basis,
        adjustment_codes: adjustmentCodes,
        adjustment_amount: adjustmentAmount,
        gain_loss: gainLoss,
        is_long_term: isLongTerm,
        collectibles: item.box3_transaction_type === "collectibles",
      },
    }),
  ];

  if ((item.federal_withheld ?? 0) > 0) {
    outputs.push(
      output(f1040, { line25b_withheld_1099: item.federal_withheld! }),
    );
  }

  // Code D removes this ordinary-interest share from Form 8949 capital gain.
  if (taxableMarketDiscount > 0) {
    outputs.push(output(schedule_b, {
      payer_name: item.market_discount_payer_name,
      taxable_interest_net: taxableMarketDiscount,
    }));
    if (item.investment_property_for_form4952 === true) {
      outputs.push(output(form4952, {
        source_1099_interest: taxableMarketDiscount,
      }));
    }
  }

  return outputs;
}

class F1099bNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f1099b";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([
    form8949,
    f1040,
    schedule_b,
    form4952,
  ]);

  compute(_ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
    const parsed = inputSchema.parse(input);
    return { outputs: parsed.f1099bs.flatMap(processItem) };
  }
}

export const f1099b = new F1099bNode();

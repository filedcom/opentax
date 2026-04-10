import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import { TaxNode, output } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { f1040 } from "../../outputs/f1040/index.ts";
import { form8949, type Form8949Part } from "../../intermediate/forms/form8949/index.ts";
import { schedule_b } from "../../intermediate/aggregation/schedule_b/index.ts";
import { form8997 } from "../../intermediate/forms/form8997/index.ts";
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
  // Box 1g: wash sale loss disallowed (IRC §1091) — added back to cost basis
  // as adjustment code "W". When provided explicitly, upstream can auto-populate
  // adjustment_codes and adjustment_amount rather than requiring manual entry.
  box1g_wash_sale_loss_disallowed: z.number().nonnegative().optional().describe("Box 1g: wash sale loss disallowed (IRC §1091) — increases cost basis via adjustment code W"),
  // Box 3: indicates proceeds are from collectibles (28% rate assets per IRC §1(h)(5))
  // or from a QOF investment (IRC §1400Z-2). Collectibles are taxed at a max 28% rate
  // rather than the standard 0/15/20% long-term capital gains rates.
  box3_collectibles: z.boolean().optional().describe("Box 3: collectibles gain subject to 28% maximum rate (IRC §1(h)(5))"),
  // Box 12: indicates this is a QOF (Qualified Opportunity Fund) investment
  // under IRC §1400Z-2. Gain may be deferred and is reported on Form 8997.
  box12_qof_investment: z.boolean().optional().describe("Box 12: proceeds from QOF (Qualified Opportunity Fund) — deferred gain per IRC §1400Z-2"),
  // Noncovered security flag — basis was NOT reported to IRS (broker not required to report).
  // Transactions involving noncovered securities must use Form 8949 Part B (short-term)
  // or Part E (long-term) rather than Parts A/D.
  noncovered_security: z.boolean().optional().describe("Security acquired before broker cost-basis reporting rules apply — basis not reported to IRS"),
});

export const inputSchema = z.object({
  f1099bs: z.array(itemSchema).min(1),
});

type B99Item = z.infer<typeof itemSchema>;

// box1g_wash_sale_loss_disallowed: convenience field that auto-populates
// adjustment_codes "W" and adjustment_amount when not already set by the caller.
function resolveWashSale(item: B99Item): { codes: string | undefined; amount: number | undefined } {
  const washAmount = item.box1g_wash_sale_loss_disallowed ?? 0;
  if (washAmount <= 0 || item.adjustment_codes !== undefined || item.adjustment_amount !== undefined) {
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
  const { codes: adjustmentCodes, amount: adjustmentAmount } = resolveWashSale(item);
  const part = resolvedPart(item);
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
        collectibles: item.box3_collectibles,
      },
    }),
  ];

  if ((item.federal_withheld ?? 0) > 0) {
    outputs.push(output(f1040, { line25b_withheld_1099: item.federal_withheld! }));
  }

  // Market discount (box 1f) = ordinary interest income per IRC §1278
  if ((item.box1f_accrued_market_discount ?? 0) > 0) {
    outputs.push(output(schedule_b, {
      payer_name: item.description,
      taxable_interest_net: item.box1f_accrued_market_discount!,
    }));
  }

  // box3_collectibles: wired — collectibles flag is passed to form8949's transactionSchema,
  // which routes long-term collectibles gains to rate_28_gain_worksheet.

  // box12_qof_investment: deferred gain per IRC §1400Z-2.
  // A QOF deferral means the taxpayer elected to roll the capital gain into a QOF
  // within 180 days. The 1099-B flags this with box 12; the actual gain amount is
  // proceeds - cost_basis (the gain being deferred). Form 8997 tracks the investment
  // lifecycle; we seed it here with the deferred gain amount.
  if (item.box12_qof_investment === true && gainLoss > 0) {
    outputs.push(output(form8997, {
      investments: [{
        deferred_gain: gainLoss,
        investment_date: item.date_sold,
      }],
    }));
  }

  return outputs;
}

class F1099bNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f1099b";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([form8949, f1040, schedule_b, form8997]);

  compute(_ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
    const parsed = inputSchema.parse(input);
    return { outputs: parsed.f1099bs.flatMap(processItem) };
  }
}

export const f1099b = new F1099bNode();

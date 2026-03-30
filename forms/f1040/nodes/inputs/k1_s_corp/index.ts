import { z } from "zod";
import type { NodeOutput, NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode, output } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { f1040 } from "../../outputs/f1040/index.ts";
import { schedule1 } from "../../outputs/schedule1/index.ts";
import { schedule_b } from "../../intermediate/schedule_b/index.ts";
import { schedule_d } from "../../intermediate/schedule_d/index.ts";
import { form8995 } from "../../intermediate/form8995/index.ts";
import { form_1116 } from "../../intermediate/form_1116/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// Schedule K-1 (Form 1120-S) — Shareholder's Share of Income, Deductions, Credits
//
// Issued by S corporations to shareholders.
// Ordinary business income does NOT trigger SE tax (unlike partnership guaranteed payments).
//
// IRS Instructions: https://www.irs.gov/instructions/i1120ssk
// IRC §1366 — pass-through taxation; IRC §199A — QBI deduction

// Per-item schema — one K-1 from one S corporation
export const itemSchema = z.object({
  // Identification
  corporation_name: z.string().min(1),

  // Box 1 — Ordinary business income/loss → Schedule E page 2 → Schedule 1 line 5
  box1_ordinary_business: z.number().optional(),

  // Box 2 — Net rental real estate income/loss → Schedule E
  box2_rental_re: z.number().optional(),

  // Box 3 — Other net rental income/loss → Schedule E
  box3_other_rental: z.number().optional(),

  // Box 4 — Interest income → Schedule B
  box4_interest: z.number().nonnegative().optional(),

  // Box 5a — Ordinary dividends → Schedule B
  box5a_ordinary_dividends: z.number().nonnegative().optional(),

  // Box 5b — Qualified dividends → Form 1040 line 3a
  box5b_qualified_dividends: z.number().nonnegative().optional(),

  // Box 6 — Royalties → Schedule E line 4
  box6_royalties: z.number().optional(),

  // Box 7 — Net STCG/loss → Schedule D line 5
  box7_net_st_cap_gain: z.number().optional(),

  // Box 8a — Net LTCG/loss → Schedule D line 12
  box8a_net_lt_cap_gain: z.number().optional(),

  // Box 9 — Net §1231 gain/loss (informational; full computation requires Form 4797)
  box9_net_1231: z.number().optional(),

  // Box 14 — Foreign taxes → Form 1116
  box14_foreign_tax: z.number().nonnegative().optional(),
  box14_foreign_income: z.number().nonnegative().optional(),

  // Box 17 — QBI/W-2 wages/UBIA for §199A deduction
  box17_w2_wages: z.number().nonnegative().optional(),
  box17_ubia: z.number().nonnegative().optional(),
});

export const inputSchema = z.object({
  k1_s_corps: z.array(itemSchema).min(1),
});

type K1SCorpItem = z.infer<typeof itemSchema>;
type K1SCorpItems = K1SCorpItem[];

// Aggregate Schedule E income (Box 1 + 2 + 3 + 6) → schedule1 line5_schedule_e
function schedule1Output(items: K1SCorpItems): NodeOutput[] {
  const total = items.reduce(
    (sum, item) =>
      sum +
      (item.box1_ordinary_business ?? 0) +
      (item.box2_rental_re ?? 0) +
      (item.box3_other_rental ?? 0) +
      (item.box6_royalties ?? 0),
    0,
  );
  if (total === 0) return [];
  return [output(schedule1, { line5_schedule_e: total })];
}

// Per-payer schedule_b entries for interest (Box 4)
function scheduleBInterestOutputs(items: K1SCorpItems): NodeOutput[] {
  return items
    .filter((item) => (item.box4_interest ?? 0) > 0)
    .map((item) =>
      output(schedule_b, {
        payer_name: item.corporation_name,
        taxable_interest_net: item.box4_interest!,
      })
    );
}

// Per-payer schedule_b entries for dividends (Box 5a)
function scheduleBDividendOutputs(items: K1SCorpItems): NodeOutput[] {
  return items
    .filter((item) => (item.box5a_ordinary_dividends ?? 0) > 0)
    .map((item) =>
      output(schedule_b, {
        payerName: item.corporation_name,
        ordinaryDividends: item.box5a_ordinary_dividends!,
      })
    );
}

// Aggregate qualified dividends (Box 5b) → f1040 line3a
function f1040QualDivOutput(items: K1SCorpItems): NodeOutput[] {
  const total = items.reduce((sum, item) => sum + (item.box5b_qualified_dividends ?? 0), 0);
  if (total <= 0) return [];
  return [output(f1040, { line3a_qualified_dividends: total })];
}

// Aggregate capital gains/losses → schedule_d (one merged output)
function scheduleDOutput(items: K1SCorpItems): NodeOutput[] {
  const totalSt = items.reduce((sum, item) => sum + (item.box7_net_st_cap_gain ?? 0), 0);
  const totalLt = items.reduce((sum, item) => sum + (item.box8a_net_lt_cap_gain ?? 0), 0);
  const hasSt = totalSt !== 0;
  const hasLt = totalLt !== 0;
  if (!hasSt && !hasLt) return [];

  if (hasSt && hasLt) {
    return [output(schedule_d, { line_5_k1_st: totalSt, line_12_k1_lt: totalLt })];
  }
  if (hasSt) {
    return [output(schedule_d, { line_5_k1_st: totalSt })];
  }
  return [output(schedule_d, { line_12_k1_lt: totalLt })];
}

// QBI routing: positive Box 1 ordinary income → form8995
// W-2 wages (Box 17 W) → form8995
function form8995Output(items: K1SCorpItems): NodeOutput[] {
  const totalQbi = items.reduce(
    (sum, item) => sum + Math.max(0, item.box1_ordinary_business ?? 0),
    0,
  );
  const totalW2 = items.reduce((sum, item) => sum + (item.box17_w2_wages ?? 0), 0);
  const totalUbia = items.reduce((sum, item) => sum + (item.box17_ubia ?? 0), 0);

  if (totalQbi <= 0 && totalW2 <= 0 && totalUbia <= 0) return [];

  const fields: Record<string, number> = {};
  if (totalQbi > 0) fields.qbi = totalQbi;
  if (totalW2 > 0) fields.w2_wages = totalW2;
  if (totalUbia > 0) fields.unadjusted_basis = totalUbia;

  return [output(form8995, fields as Parameters<typeof output<typeof form8995>>[1])];
}

// Route foreign taxes → form_1116
function form1116Outputs(items: K1SCorpItems): NodeOutput[] {
  return items
    .filter((item) => (item.box14_foreign_tax ?? 0) > 0)
    .map((item) =>
      output(form_1116, {
        foreign_tax_paid: item.box14_foreign_tax!,
      })
    );
}

class K1SCorpNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "k1_s_corp";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule1, schedule_b, f1040, schedule_d, form8995, form_1116]);

  compute(_ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
    const { k1_s_corps } = inputSchema.parse(input);

    const outputs: NodeOutput[] = [
      ...schedule1Output(k1_s_corps),
      ...scheduleBInterestOutputs(k1_s_corps),
      ...scheduleBDividendOutputs(k1_s_corps),
      ...f1040QualDivOutput(k1_s_corps),
      ...scheduleDOutput(k1_s_corps),
      ...form8995Output(k1_s_corps),
      ...form1116Outputs(k1_s_corps),
    ];

    return { outputs };
  }
}

export const k1SCorpNode = new K1SCorpNode();

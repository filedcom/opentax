import { z } from "zod";
import type { NodeOutput, NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode, output } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { f1040 } from "../../outputs/f1040/index.ts";
import { schedule1 } from "../../outputs/schedule1/index.ts";
import { schedule_b } from "../../intermediate/schedule_b/index.ts";
import { schedule_d } from "../../intermediate/schedule_d/index.ts";
import { schedule_se } from "../../intermediate/schedule_se/index.ts";
import { form8995 } from "../../intermediate/form8995/index.ts";
import { form_1116 } from "../../intermediate/form_1116/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// Schedule K-1 (Form 1065) — Partner's Share of Income, Deductions, Credits
//
// Issued by partnerships (including LLCs taxed as partnerships) to partners.
// Key difference from S corp K-1: guaranteed payments for services (Box 4a) are
// subject to SE tax; net partnership earnings (Box 14a) also drive Schedule SE.
//
// IRS Instructions: https://www.irs.gov/instructions/i1065sk1
// IRC §702 — partner's distributive share; IRC §1402 — SE earnings

// Per-item schema — one K-1 from one partnership
export const itemSchema = z.object({
  // Identification
  partnership_name: z.string().min(1),

  // Box 1 — Ordinary business income/loss → Schedule E page 2
  box1_ordinary_business: z.number().optional(),

  // Box 2 — Net rental real estate income/loss → Schedule E
  box2_rental_re: z.number().optional(),

  // Box 3 — Other net rental income/loss → Schedule E
  box3_other_rental: z.number().optional(),

  // Box 4a — Guaranteed payments for services → Schedule E + Schedule SE
  box4a_guaranteed_services: z.number().optional(),

  // Box 4b — Guaranteed payments for capital → Schedule E (not SE)
  box4b_guaranteed_capital: z.number().optional(),

  // Box 5 — Interest income → Schedule B
  box5_interest: z.number().nonnegative().optional(),

  // Box 6a — Ordinary dividends → Schedule B
  box6a_ordinary_dividends: z.number().nonnegative().optional(),

  // Box 6b — Qualified dividends → Form 1040 line 3a
  box6b_qualified_dividends: z.number().nonnegative().optional(),

  // Box 7 — Royalties → Schedule E line 4
  box7_royalties: z.number().optional(),

  // Box 8 — Net STCG/loss → Schedule D line 5
  box8_net_st_cap_gain: z.number().optional(),

  // Box 9a — Net LTCG/loss → Schedule D line 12
  box9a_net_lt_cap_gain: z.number().optional(),

  // Box 14a — Net SE earnings → Schedule SE
  // This is the definitive SE income figure from the partnership
  box14a_se_earnings: z.number().optional(),

  // Box 16 — Foreign taxes paid → Form 1116
  box16_foreign_tax: z.number().nonnegative().optional(),
  box16_foreign_income: z.number().nonnegative().optional(),

  // Box 20 code Z — Section 199A QBI information → Form 8995
  box20z_qbi: z.number().optional(),

  // Box 20 — W-2 wages for QBI limitation
  box20_w2_wages: z.number().nonnegative().optional(),

  // Box 20 — UBIA of qualified property
  box20_ubia: z.number().nonnegative().optional(),
});

export const inputSchema = z.object({
  k1_partnerships: z.array(itemSchema).min(1),
});

type K1PartnershipItem = z.infer<typeof itemSchema>;
type K1PartnershipItems = K1PartnershipItem[];

// Aggregate Schedule E income → schedule1 line5_schedule_e
// Includes: Box 1 + 2 + 3 + 4a + 4b + 7
function schedule1Output(items: K1PartnershipItems): NodeOutput[] {
  const total = items.reduce(
    (sum, item) =>
      sum +
      (item.box1_ordinary_business ?? 0) +
      (item.box2_rental_re ?? 0) +
      (item.box3_other_rental ?? 0) +
      (item.box4a_guaranteed_services ?? 0) +
      (item.box4b_guaranteed_capital ?? 0) +
      (item.box7_royalties ?? 0),
    0,
  );
  if (total === 0) return [];
  return [output(schedule1, { line5_schedule_e: total })];
}

// Per-payer schedule_b entries for interest (Box 5)
function scheduleBInterestOutputs(items: K1PartnershipItems): NodeOutput[] {
  return items
    .filter((item) => (item.box5_interest ?? 0) > 0)
    .map((item) =>
      output(schedule_b, {
        payer_name: item.partnership_name,
        taxable_interest_net: item.box5_interest!,
      })
    );
}

// Per-payer schedule_b entries for dividends (Box 6a)
function scheduleBDividendOutputs(items: K1PartnershipItems): NodeOutput[] {
  return items
    .filter((item) => (item.box6a_ordinary_dividends ?? 0) > 0)
    .map((item) =>
      output(schedule_b, {
        payerName: item.partnership_name,
        ordinaryDividends: item.box6a_ordinary_dividends!,
      })
    );
}

// Aggregate qualified dividends (Box 6b) → f1040 line3a
function f1040QualDivOutput(items: K1PartnershipItems): NodeOutput[] {
  const total = items.reduce((sum, item) => sum + (item.box6b_qualified_dividends ?? 0), 0);
  if (total <= 0) return [];
  return [output(f1040, { line3a_qualified_dividends: total })];
}

// Aggregate capital gains/losses → schedule_d (one merged output)
function scheduleDOutput(items: K1PartnershipItems): NodeOutput[] {
  const totalSt = items.reduce((sum, item) => sum + (item.box8_net_st_cap_gain ?? 0), 0);
  const totalLt = items.reduce((sum, item) => sum + (item.box9a_net_lt_cap_gain ?? 0), 0);
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

// SE tax routing: Box 14a (net SE earnings) takes priority over Box 4a
// Box 14a provided → route to schedule_se net_profit_schedule_c
// Box 4a only (no Box 14a) → route guaranteed services to schedule_se
function scheduleSEOutputs(items: K1PartnershipItems): NodeOutput[] {
  const outputs: NodeOutput[] = [];
  for (const item of items) {
    if ((item.box14a_se_earnings ?? 0) !== 0) {
      // Box 14a is the authoritative SE earnings from the partnership
      outputs.push(output(schedule_se, { net_profit_schedule_c: item.box14a_se_earnings! }));
    } else if ((item.box4a_guaranteed_services ?? 0) > 0) {
      // Fall back to Box 4a when Box 14a is absent
      outputs.push(output(schedule_se, { net_profit_schedule_c: item.box4a_guaranteed_services! }));
    }
  }
  return outputs;
}

// QBI routing: Box 20Z → form8995
function form8995Output(items: K1PartnershipItems): NodeOutput[] {
  const totalQbi = items.reduce((sum, item) => sum + (item.box20z_qbi ?? 0), 0);
  const totalW2 = items.reduce((sum, item) => sum + (item.box20_w2_wages ?? 0), 0);
  const totalUbia = items.reduce((sum, item) => sum + (item.box20_ubia ?? 0), 0);

  if (totalQbi === 0 && totalW2 <= 0 && totalUbia <= 0) return [];

  if (totalQbi !== 0 && totalW2 > 0) {
    return [output(form8995, { qbi: totalQbi, w2_wages: totalW2 })];
  }
  if (totalQbi !== 0) {
    return [output(form8995, { qbi: totalQbi })];
  }
  return [output(form8995, { w2_wages: totalW2 })];
}

// Route foreign taxes → form_1116
function form1116Outputs(items: K1PartnershipItems): NodeOutput[] {
  return items
    .filter((item) => (item.box16_foreign_tax ?? 0) > 0)
    .map((item) =>
      output(form_1116, {
        foreign_tax_paid: item.box16_foreign_tax!,
      })
    );
}

class K1PartnershipNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "k1_partnership";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([
    schedule1,
    schedule_b,
    f1040,
    schedule_d,
    schedule_se,
    form8995,
    form_1116,
  ]);

  compute(_ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
    const { k1_partnerships } = inputSchema.parse(input);

    const outputs: NodeOutput[] = [
      ...schedule1Output(k1_partnerships),
      ...scheduleBInterestOutputs(k1_partnerships),
      ...scheduleBDividendOutputs(k1_partnerships),
      ...f1040QualDivOutput(k1_partnerships),
      ...scheduleDOutput(k1_partnerships),
      ...scheduleSEOutputs(k1_partnerships),
      ...form8995Output(k1_partnerships),
      ...form1116Outputs(k1_partnerships),
    ];

    return { outputs };
  }
}

export const k1Partnership = new K1PartnershipNode();

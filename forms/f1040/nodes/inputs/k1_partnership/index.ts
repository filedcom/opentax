import { z } from "zod";
import type { NodeOutput, NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode, output } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { f1040 } from "../../outputs/f1040/index.ts";
import { schedule1 } from "../../outputs/schedule1/index.ts";
import { schedule_b } from "../../intermediate/aggregation/schedule_b/index.ts";
import { schedule_d } from "../../intermediate/aggregation/schedule_d/index.ts";
import { schedule_se } from "../../intermediate/forms/schedule_se/index.ts";
import { form8995 } from "../../intermediate/forms/form8995/index.ts";
import { form_1116 } from "../../intermediate/forms/form_1116/index.ts";
import { agi_aggregator } from "../../intermediate/aggregation/agi_aggregator/index.ts";
import { unrecaptured_1250_worksheet } from "../../intermediate/worksheets/unrecaptured_1250_worksheet/index.ts";
import { form6251 } from "../../intermediate/forms/form6251/index.ts";
import { income_tax_calculation } from "../../intermediate/worksheets/income_tax_calculation/index.ts";
import { form8960 } from "../../intermediate/forms/form8960/index.ts";
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

  // Box 9b — Unrecaptured §1250 gain → Unrecaptured §1250 Gain Worksheet
  // Partner's share of §1250 gain from partnership property; taxed at 25% max rate.
  box9b_unrecaptured_1250: z.number().nonnegative().optional(),

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

  // Box 20 — SSTB indicator (specified service trade or business)
  // When true, QBI deduction may be limited or disallowed based on taxable income
  box20_sstb: z.boolean().optional(),

  // Box 20 — Aggregation group identifier (§199A aggregation election)
  // Partners may aggregate multiple pass-throughs; group name ties K-1s together
  box20_aggregation_group: z.string().optional(),

  // Box 13 — Other deductions (various codes A-Z+)
  // Net total of deductible partnership items from Box 13 that reduce the
  // partner's income. Positive = deduction amount. Most common codes (e.g.,
  // charitable contributions code A, investment interest code B) are collapsed
  // to a single net figure for routing to Schedule A / AGI reduction.
  box13_deductions: z.number().nonnegative().optional(),

  // Box 17 — Alternative Minimum Tax (AMT) items (codes A-G)
  // Net adjustment to AMTI from partnership-level AMT preferences/adjustments.
  // Positive increases AMTI; negative decreases AMTI (e.g. AMT loss adjustments).
  // IRC §702(a)(7); Form 6251 Line 2 adjustments.
  box17_amt_adjustment: z.number().optional(),

  // ── Partner Basis Worksheet (K1P > "Basis Wkst" tab) ────────────────────────
  // These fields track outside basis — the partner's tax basis in the partnership.
  // Outside basis determines deductibility of losses (§704(d)) and gain/loss on
  // sale. They are worksheet fields, not K-1 boxes; carried forward each year.

  // Beginning-of-year outside basis
  basis_beginning: z.number().nonnegative().optional(),

  // Cash and property contributions made during the year
  basis_contributions: z.number().nonnegative().optional(),

  // Partner's share of income (increases basis)
  basis_share_of_income: z.number().optional(),

  // Partner's share of losses (decreases basis; reported as positive)
  basis_share_of_losses: z.number().nonnegative().optional(),

  // Distributions received (decrease basis; reported as positive)
  basis_distributions: z.number().nonnegative().optional(),

  // Increase in partner's share of liabilities (increases basis)
  basis_liabilities_assumed: z.number().nonnegative().optional(),

  // Decrease in partner's share of liabilities (decreases basis)
  basis_liabilities_relieved: z.number().nonnegative().optional(),

  // ── Pre-2018 Basis Carryover (K1P> "Pre-2018 Basis" tab) ────────────────────
  // Losses from pre-TCJA years suspended under §704(d) (basis limitation).
  // When basis became positive in a later year, these losses became deductible.
  // The TCJA (2017) changed passive activity interaction; these carryovers track
  // the amounts suspended before the new rules applied.

  // Pre-2018 ordinary losses suspended due to basis limitations
  pre2018_basis_ordinary_loss: z.number().nonnegative().optional(),

  // Pre-2018 short-term capital losses suspended due to basis limitations
  pre2018_basis_st_cap_loss: z.number().nonnegative().optional(),

  // Pre-2018 long-term capital losses suspended due to basis limitations
  pre2018_basis_lt_cap_loss: z.number().nonnegative().optional(),

  // Pre-2018 other losses suspended due to basis limitations
  pre2018_basis_other_loss: z.number().nonnegative().optional(),

  // ── Pre-2018 At-Risk Carryover (K1P> "Pre-2018 At-Risk" tab) ────────────────
  // Losses from pre-TCJA years suspended under §465 (at-risk limitation).
  // Tracked separately from basis carryovers per Drake software convention.

  // Pre-2018 ordinary losses suspended under at-risk rules (§465)
  pre2018_atrisk_ordinary_loss: z.number().nonnegative().optional(),

  // Pre-2018 short-term capital losses suspended under at-risk rules
  pre2018_atrisk_st_cap_loss: z.number().nonnegative().optional(),

  // Pre-2018 long-term capital losses suspended under at-risk rules
  pre2018_atrisk_lt_cap_loss: z.number().nonnegative().optional(),

  // Pre-2018 other losses suspended under at-risk rules
  pre2018_atrisk_other_loss: z.number().nonnegative().optional(),
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
  return [
    output(schedule1, { line5_schedule_e: total }),
    output(agi_aggregator, { line5_schedule_e: total }),
  ];
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

// Aggregate qualified dividends (Box 6b) → f1040 line3a + income_tax_calculation QDCGT worksheet
// IRC §1(h): qualified dividends from partnerships receive preferential 0%/15%/20% rates.
// Both outputs carry the same aggregated total; income_tax_calculation uses it for QDCGT.
function f1040QualDivOutput(items: K1PartnershipItems): NodeOutput[] {
  const total = items.reduce((sum, item) => sum + (item.box6b_qualified_dividends ?? 0), 0);
  if (total <= 0) return [];
  return [
    output(f1040, { line3a_qualified_dividends: total }),
    output(income_tax_calculation, { qualified_dividends: total }),
  ];
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

// NIIT routing: K-1 partnership income → Form 8960 lines 2 and 4a.
// IRC §1411(c)(1)(A)/(2)(A):
//   - line4a (passive income): Box 1 ordinary business + Box 2 rental + Box 3 other rental + Box 7 royalties
//   - line2 (ordinary dividends): Box 6a ordinary dividends from partnership investment portfolio
// Note: form8960 line2_ordinary_dividends is accumulable — f1099div also routes there.
// Sending as separate NodeOutput objects avoids merging issues and lets the executor
// accumulate them into an array that form8960 sums via normalizeArray.
function form8960Output(items: K1PartnershipItems): NodeOutput[] {
  const passiveTotal = items.reduce(
    (sum, item) =>
      sum +
      (item.box1_ordinary_business ?? 0) +
      (item.box2_rental_re ?? 0) +
      (item.box3_other_rental ?? 0) +
      (item.box7_royalties ?? 0),
    0,
  );
  const dividendTotal = items.reduce(
    (sum, item) => sum + (item.box6a_ordinary_dividends ?? 0),
    0,
  );
  const outputs: NodeOutput[] = [];
  if (passiveTotal !== 0) {
    outputs.push(output(form8960, { line4a_passive_income: passiveTotal }));
  }
  if (dividendTotal > 0) {
    outputs.push(output(form8960, { line2_ordinary_dividends: dividendTotal }));
  }
  return outputs;
}

// SE tax routing: aggregate all SE earnings across K-1s into a single output.
// Box 14a (net SE earnings) takes priority per item; Box 4a used as fallback.
// Aggregating prevents array accumulation in schedule_se when multiple K-1s are present.
function scheduleSEOutputs(items: K1PartnershipItems): NodeOutput[] {
  const total = items.reduce((sum, item) => {
    if ((item.box14a_se_earnings ?? 0) !== 0) return sum + item.box14a_se_earnings!;
    if ((item.box4a_guaranteed_services ?? 0) > 0) return sum + item.box4a_guaranteed_services!;
    return sum;
  }, 0);
  if (total === 0) return [];
  return [output(schedule_se, { net_profit_schedule_c: total })];
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

// Box 9b — Unrecaptured §1250 gain → unrecaptured_1250_worksheet
function unrecaptured1250Outputs(items: K1PartnershipItems): NodeOutput[] {
  const total = items.reduce((sum, item) => sum + (item.box9b_unrecaptured_1250 ?? 0), 0);
  if (total <= 0) return [];
  return [output(unrecaptured_1250_worksheet, { unrecaptured_1250_gain: total })];
}

// Box 13 deductions → schedule1 line8z_other_income (as negative / deduction)
// Partners deduct Box 13 items against income; most flow through Schedule A
// or reduce AGI. We aggregate to a single above-the-line offset via line8z.
function box13DeductionOutputs(items: K1PartnershipItems): NodeOutput[] {
  const total = items.reduce((sum, item) => sum + (item.box13_deductions ?? 0), 0);
  if (total <= 0) return [];
  return [output(schedule1, { line8z_other_income: -total })];
}

// Box 17 AMT items → form6251 other_adjustments
// Partnership-level AMT preferences/adjustments passed through to the partner.
// Routes to the catch-all other_adjustments field on Form 6251.
// IRC §702(a)(7); Form 6251 Lines 2a–2t, 3.
function form6251Outputs(items: K1PartnershipItems): NodeOutput[] {
  const total = items.reduce((sum, item) => sum + (item.box17_amt_adjustment ?? 0), 0);
  if (total === 0) return [];
  return [output(form6251, { other_adjustments: total })];
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
    agi_aggregator,
    schedule_b,
    f1040,
    schedule_d,
    schedule_se,
    form8995,
    form_1116,
    unrecaptured_1250_worksheet,
    form6251,
    income_tax_calculation,
    form8960,
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
      ...unrecaptured1250Outputs(k1_partnerships),
      ...box13DeductionOutputs(k1_partnerships),
      ...form6251Outputs(k1_partnerships),
      ...form8960Output(k1_partnerships),
    ];

    return { outputs };
  }
}

export const k1Partnership = new K1PartnershipNode();

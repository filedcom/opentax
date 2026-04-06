import { z } from "zod";
import type { NodeOutput, NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode, output } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { f1040 } from "../../outputs/f1040/index.ts";
import { schedule1 } from "../../outputs/schedule1/index.ts";
import { schedule_b } from "../../intermediate/aggregation/schedule_b/index.ts";
import { schedule_d } from "../../intermediate/aggregation/schedule_d/index.ts";
import { form8995 } from "../../intermediate/forms/form8995/index.ts";
import { form_1116 } from "../../intermediate/forms/form_1116/index.ts";
import { form7203 } from "../../intermediate/forms/form7203/index.ts";
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

  // Box 17 — QBI/W-2 wages/UBIA for §199A deduction (legacy fields retained for compat)
  box17_w2_wages: z.number().nonnegative().optional(),
  box17_ubia: z.number().nonnegative().optional(),

  // ── QBI fields (K-1 box 17 code V / K199 screen) ─────────────────────────
  // Qualified business income/loss amount per §199A
  qbi_amount: z.number().optional(),
  // W-2 wages allocable to the qualified trade or business
  w2_wages: z.number().nonnegative().optional(),
  // Unadjusted basis immediately after acquisition of qualified property
  ubia_qualified_property: z.number().nonnegative().optional(),
  // True when the trade/business is a specified service trade/business (SSTB)
  sstb_indicator: z.boolean().optional(),

  // ── Form 7203 basis fields (K1S > "Basis (7203)" tab) ────────────────────
  // Shareholder's stock basis at beginning of the tax year
  stock_basis_beginning: z.number().nonnegative().optional(),
  // Shareholder's debt basis at beginning of the tax year
  debt_basis_beginning: z.number().nonnegative().optional(),

  // ── Pre-2018 carryover fields ─────────────────────────────────────────────
  // Losses suspended in pre-2018 years (K1S > "Pre-2018 Basis" tab)
  pre2018_suspended_losses: z.number().nonnegative().optional(),
  // At-risk suspended losses from pre-2018 years (K1S > "Pre-2018 At-Risk" tab)
  pre2018_at_risk_suspended: z.number().nonnegative().optional(),
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

// QBI routing: box1 positive ordinary income or explicit qbi_amount → form8995 (non-SSTB)
// SSTB items route to form8995a via the sstb_qbi field.
// Dedicated qbi_amount / w2_wages / ubia_qualified_property fields take priority over
// the legacy box17_* fields when present.
function resolveQbiAmount(item: K1SCorpItem): number {
  if (item.qbi_amount !== undefined) return item.qbi_amount;
  return Math.max(0, item.box1_ordinary_business ?? 0);
}

function resolveW2Wages(item: K1SCorpItem): number {
  return (item.w2_wages ?? 0) + (item.box17_w2_wages ?? 0);
}

function resolveUbia(item: K1SCorpItem): number {
  return (item.ubia_qualified_property ?? 0) + (item.box17_ubia ?? 0);
}

function form8995Output(items: K1SCorpItems): NodeOutput[] {
  // Non-SSTB items → form8995
  const nonSstb = items.filter((item) => item.sstb_indicator !== true);
  const totalQbi = nonSstb.reduce((sum, item) => sum + resolveQbiAmount(item), 0);
  const totalW2 = nonSstb.reduce((sum, item) => sum + resolveW2Wages(item), 0);
  const totalUbia = nonSstb.reduce((sum, item) => sum + resolveUbia(item), 0);

  if (totalQbi <= 0 && totalW2 <= 0 && totalUbia <= 0) return [];

  const fields: Record<string, number> = {};
  if (totalQbi > 0) fields.qbi = totalQbi;
  if (totalW2 > 0) fields.w2_wages = totalW2;
  if (totalUbia > 0) fields.unadjusted_basis = totalUbia;

  return [output(form8995, fields as unknown as Parameters<typeof output<typeof form8995>>[1])];
}

// Route Form 7203 basis data when stock or debt basis fields are provided
function hasBasisData(item: K1SCorpItem): boolean {
  return (
    (item.stock_basis_beginning ?? 0) > 0 ||
    (item.debt_basis_beginning ?? 0) > 0 ||
    (item.pre2018_suspended_losses ?? 0) > 0 ||
    (item.pre2018_at_risk_suspended ?? 0) > 0
  );
}

function buildForm7203Fields(item: K1SCorpItem): Parameters<typeof output<typeof form7203>>[1] {
  const loss = Math.max(0, -(item.box1_ordinary_business ?? 0));
  // Pre-2018 suspended losses and at-risk suspended losses both map to
  // form7203 prior_year_unallowed_loss (Part III column b)
  const priorLoss = (item.pre2018_suspended_losses ?? 0) + (item.pre2018_at_risk_suspended ?? 0);
  // hasBasisData guarantees at least one field is set; cast satisfies AtLeastOne
  return {
    stock_basis_beginning: item.stock_basis_beginning,
    debt_basis_beginning: item.debt_basis_beginning,
    ordinary_loss: loss > 0 ? loss : undefined,
    prior_year_unallowed_loss: priorLoss > 0 ? priorLoss : undefined,
  } as Parameters<typeof output<typeof form7203>>[1];
}

function form7203Outputs(items: K1SCorpItems): NodeOutput[] {
  return items
    .filter(hasBasisData)
    .map((item) => output(form7203, buildForm7203Fields(item)));
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
  readonly outputNodes = new OutputNodes([schedule1, schedule_b, f1040, schedule_d, form8995, form_1116, form7203]);

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
      ...form7203Outputs(k1_s_corps),
    ];

    return { outputs };
  }
}

export const k1SCorpNode = new K1SCorpNode();

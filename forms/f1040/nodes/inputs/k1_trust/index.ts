import { z } from "zod";
import type { NodeOutput, NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode, output, type AtLeastOne } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { f1040 } from "../../outputs/f1040/index.ts";
import { schedule1 } from "../../outputs/schedule1/index.ts";
import { schedule_b } from "../../intermediate/aggregation/schedule_b/index.ts";
import { schedule_d } from "../../intermediate/aggregation/schedule_d/index.ts";
import { form_1116 } from "../../intermediate/forms/form_1116/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// Schedule K-1 (Form 1041) — Beneficiary's Share of Income, Deductions, Credits
//
// Issued by trusts and estates to beneficiaries.
// Each box routes to the beneficiary's Form 1040 as shown in the K-1 instructions.
//
// IRS Instructions for Schedule K-1 (Form 1041):
// https://www.irs.gov/instructions/i1041sk1

// Per-item schema — one Schedule K-1 (1041) from one trust or estate
export const itemSchema = z.object({
  // Identification
  estate_trust_name: z.string().min(1),

  // Distributable Net Income (DNI) — the ceiling on beneficiary inclusion
  // per IRC §662(a). If provided and total distributions exceed DNI, all
  // income characters are scaled proportionally per IRC §662(b).
  // Omit (or set equal/greater than total distributions) to apply no cap.
  distributable_net_income: z.number().nonnegative().optional(),

  // Box 1 — Interest income → Schedule B Part I
  box1_interest: z.number().nonnegative().optional(),

  // Box 2a — Ordinary dividends → Schedule B Part II
  box2a_ordinary_dividends: z.number().nonnegative().optional(),

  // Box 2b — Qualified dividends → Form 1040 line 3a
  box2b_qualified_dividends: z.number().nonnegative().optional(),

  // Box 3 — Net short-term capital gain/loss → Schedule D line 5 (K-1 ST)
  box3_net_st_cap_gain: z.number().optional(),

  // Box 4a — Net long-term capital gain/loss → Schedule D line 12 (K-1 LT)
  box4a_net_lt_cap_gain: z.number().optional(),

  // Box 4b — 28% rate gain (informational; used in Schedule D 28% Rate Gain Worksheet)
  box4b_28pct_rate_gain: z.number().nonnegative().optional(),

  // Box 4c — Unrecaptured §1250 gain (informational; Schedule D Worksheet line 11)
  box4c_unrecaptured_1250: z.number().nonnegative().optional(),

  // Box 5 — Other portfolio income/loss → Schedule 1 line 8z
  box5_other_portfolio: z.number().optional(),

  // Box 6 — Ordinary business income/loss → Schedule E page 2 → Schedule 1 line 5
  box6_ordinary_business: z.number().optional(),

  // Box 7 — Net rental real estate income/loss → Schedule E → Schedule 1 line 5
  box7_rental_real_estate: z.number().optional(),

  // Box 8 — Other rental income/loss → Schedule E → Schedule 1 line 5
  box8_other_rental: z.number().optional(),

  // Box 9 — Directly apportioned deductions (codes A–B)
  // Deductions allocated directly to the beneficiary (e.g. depreciation, depletion).
  // Reduce gross income of the same character; typically Schedule E or Schedule A.
  box9_directly_apportioned_deductions: z.number().nonnegative().optional().describe("Box 9 — Directly apportioned deductions"),

  // Box 10 — Estate tax deduction (IRD) — informational; Schedule A line 16
  box10_estate_tax_deduction: z.number().nonnegative().optional(),

  // Box 11 — Final year deductions (excess deductions on termination)
  box11_final_year_deductions: z.number().nonnegative().optional(),

  // Box 12 — Alternative minimum tax items (informational; Form 6251)
  box12_amt: z.number().optional(),

  // Box 13 — Credits and credit recapture → applicable credit form
  // Beneficiary's share of credits passed through from the trust (e.g. foreign tax credit).
  box13_credits: z.number().nonnegative().optional().describe("Box 13 — Credits and credit recapture"),

  // Box 14 — Foreign taxes → Form 1116
  box14_foreign_tax: z.number().nonnegative().optional(),
  box14_foreign_income: z.number().nonnegative().optional(),
});

export const inputSchema = z.object({
  k1_trusts: z.array(itemSchema).min(1),
});

type K1TrustItem = z.infer<typeof itemSchema>;
type K1TrustItems = K1TrustItem[];

// ─── DNI limitation (IRC §662) ────────────────────────────────────────────────

// Compute total positive income across all characters for DNI comparison.
// Losses are excluded from the total — they reduce DNI directly at the trust level.
function totalPositiveIncome(item: K1TrustItem): number {
  return (
    (item.box1_interest ?? 0) +
    (item.box2a_ordinary_dividends ?? 0) +
    Math.max(0, item.box3_net_st_cap_gain ?? 0) +
    Math.max(0, item.box4a_net_lt_cap_gain ?? 0) +
    Math.max(0, item.box5_other_portfolio ?? 0) +
    Math.max(0, item.box6_ordinary_business ?? 0) +
    Math.max(0, item.box7_rental_real_estate ?? 0) +
    Math.max(0, item.box8_other_rental ?? 0)
  );
}

// Apply the DNI limitation per IRC §662(a)/(b).
// If total distributions exceed DNI, scale every income character proportionally
// so that the beneficiary's total inclusion equals DNI.
// Losses pass through unchanged (they are not "distributed income").
function applyDniLimit(item: K1TrustItem): K1TrustItem {
  const dni = item.distributable_net_income;
  if (dni === undefined) return item;

  const total = totalPositiveIncome(item);
  if (total <= 0 || total <= dni) return item;

  const ratio = dni / total;

  return {
    ...item,
    box1_interest: item.box1_interest !== undefined
      ? item.box1_interest * ratio : undefined,
    box2a_ordinary_dividends: item.box2a_ordinary_dividends !== undefined
      ? item.box2a_ordinary_dividends * ratio : undefined,
    box2b_qualified_dividends: item.box2b_qualified_dividends !== undefined
      ? item.box2b_qualified_dividends * ratio : undefined,
    box3_net_st_cap_gain: item.box3_net_st_cap_gain !== undefined && item.box3_net_st_cap_gain > 0
      ? item.box3_net_st_cap_gain * ratio : item.box3_net_st_cap_gain,
    box4a_net_lt_cap_gain: item.box4a_net_lt_cap_gain !== undefined && item.box4a_net_lt_cap_gain > 0
      ? item.box4a_net_lt_cap_gain * ratio : item.box4a_net_lt_cap_gain,
    box5_other_portfolio: item.box5_other_portfolio !== undefined && item.box5_other_portfolio > 0
      ? item.box5_other_portfolio * ratio : item.box5_other_portfolio,
    box6_ordinary_business: item.box6_ordinary_business !== undefined && item.box6_ordinary_business > 0
      ? item.box6_ordinary_business * ratio : item.box6_ordinary_business,
    box7_rental_real_estate: item.box7_rental_real_estate !== undefined && item.box7_rental_real_estate > 0
      ? item.box7_rental_real_estate * ratio : item.box7_rental_real_estate,
    box8_other_rental: item.box8_other_rental !== undefined && item.box8_other_rental > 0
      ? item.box8_other_rental * ratio : item.box8_other_rental,
    box14_foreign_income: item.box14_foreign_income !== undefined
      ? item.box14_foreign_income * ratio : undefined,
  };
}

// ─── Output helpers ───────────────────────────────────────────────────────────

// Per-payer schedule_b entries for interest (Box 1)
function scheduleBInterestOutputs(items: K1TrustItems): NodeOutput[] {
  return items
    .filter((item) => (item.box1_interest ?? 0) > 0)
    .map((item) =>
      output(schedule_b, {
        payer_name: item.estate_trust_name,
        taxable_interest_net: item.box1_interest!,
      })
    );
}

// Per-payer schedule_b entries for dividends (Box 2a)
function scheduleBDividendOutputs(items: K1TrustItems): NodeOutput[] {
  return items
    .filter((item) => (item.box2a_ordinary_dividends ?? 0) > 0)
    .map((item) =>
      output(schedule_b, {
        payerName: item.estate_trust_name,
        ordinaryDividends: item.box2a_ordinary_dividends!,
      })
    );
}

// Aggregate qualified dividends (Box 2b) → f1040 line3a
function f1040QualDivOutput(items: K1TrustItems): NodeOutput[] {
  const total = items.reduce((sum, item) => sum + (item.box2b_qualified_dividends ?? 0), 0);
  if (total <= 0) return [];
  return [output(f1040, { line3a_qualified_dividends: total })];
}

// Aggregate capital gains/losses → schedule_d (one merged output)
function scheduleDOutput(items: K1TrustItems): NodeOutput[] {
  const totalSt = items.reduce((sum, item) => sum + (item.box3_net_st_cap_gain ?? 0), 0);
  const totalLt = items.reduce((sum, item) => sum + (item.box4a_net_lt_cap_gain ?? 0), 0);
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

// Aggregate pass-through income/loss → schedule1
// Box 6 (business) + Box 7 (rental RE) + Box 8 (other rental) → line5_schedule_e
// Box 5 (other portfolio) → line8z_other_income
function schedule1Output(items: K1TrustItems): NodeOutput[] {
  const scheduleETotal = items.reduce(
    (sum, item) =>
      sum +
      (item.box6_ordinary_business ?? 0) +
      (item.box7_rental_real_estate ?? 0) +
      (item.box8_other_rental ?? 0),
    0,
  );
  const otherPortfolioTotal = items.reduce((sum, item) => sum + (item.box5_other_portfolio ?? 0), 0);

  if (scheduleETotal === 0 && otherPortfolioTotal === 0) return [];
  if (scheduleETotal !== 0 && otherPortfolioTotal !== 0) {
    return [output(schedule1, { line5_schedule_e: scheduleETotal, line8z_other_income: otherPortfolioTotal })];
  }
  if (scheduleETotal !== 0) {
    return [output(schedule1, { line5_schedule_e: scheduleETotal })];
  }
  return [output(schedule1, { line8z_other_income: otherPortfolioTotal })];
}

// Route foreign taxes → form_1116 (one output per K-1 with foreign taxes)
function form1116Outputs(items: K1TrustItems): NodeOutput[] {
  return items
    .filter((item) => (item.box14_foreign_tax ?? 0) > 0)
    .map((item) =>
      output(form_1116, {
        foreign_tax_paid: item.box14_foreign_tax!,
      })
    );
}

// box9_directly_apportioned_deductions: deductions allocated directly to the beneficiary
// (depreciation, depletion, etc.) that reduce income of the same character per IRC §1041.
// Routed to schedule1 line8z_other_income as a negative adjustment to offset passthrough
// income, which is the closest available sink until a dedicated schedule_e sink is wired.
function apportionedDeductionOutputs(items: K1TrustItems): NodeOutput[] {
  const total = items.reduce((sum, item) => sum + (item.box9_directly_apportioned_deductions ?? 0), 0);
  if (total <= 0) return [];
  return [output(schedule1, { line8z_other_income: -total })];
}

// box13_credits: beneficiary's share of trust credits (e.g. foreign tax credit, rehab credit).
// The most common credit is foreign tax credit (code A). Routed to form_1116.foreign_tax_paid
// as a simplification — not all box13 credits are foreign tax, but form_1116 is the only
// credit node currently available in outputNodes.
function box13CreditsOutputs(items: K1TrustItems): NodeOutput[] {
  return items
    .filter((item) => (item.box13_credits ?? 0) > 0)
    .map((item) =>
      output(form_1116, {
        foreign_tax_paid: item.box13_credits!,
      })
    );
}

class K1TrustNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "k1_trust";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule_b, f1040, schedule_d, schedule1, form_1116]);

  compute(_ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
    const { k1_trusts } = inputSchema.parse(input);

    // Apply DNI limitation per IRC §662 before routing any income
    const limitedItems = k1_trusts.map(applyDniLimit);

    const outputs: NodeOutput[] = [
      ...scheduleBInterestOutputs(limitedItems),
      ...scheduleBDividendOutputs(limitedItems),
      ...f1040QualDivOutput(limitedItems),
      ...scheduleDOutput(limitedItems),
      ...schedule1Output(limitedItems),
      ...form1116Outputs(limitedItems),
      ...apportionedDeductionOutputs(limitedItems),
      ...box13CreditsOutputs(limitedItems),
    ];

    return { outputs };
  }
}

export const k1_trust = new K1TrustNode();

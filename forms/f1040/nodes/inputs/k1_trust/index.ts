import { z } from "zod";
import type { NodeOutput, NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode, output, type AtLeastOne } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { f1040 } from "../../outputs/f1040/index.ts";
import { schedule1 } from "../../outputs/schedule1/index.ts";
import { schedule_b } from "../../intermediate/schedule_b/index.ts";
import { schedule_d } from "../../intermediate/schedule_d/index.ts";
import { form_1116 } from "../../intermediate/form_1116/index.ts";

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

  // Box 10 — Estate tax deduction (IRD) — informational; Schedule A line 16
  box10_estate_tax_deduction: z.number().nonnegative().optional(),

  // Box 11 — Final year deductions (excess deductions on termination)
  box11_final_year_deductions: z.number().nonnegative().optional(),

  // Box 12 — Alternative minimum tax items (informational; Form 6251)
  box12_amt: z.number().optional(),

  // Box 14 — Foreign taxes → Form 1116
  box14_foreign_tax: z.number().nonnegative().optional(),
  box14_foreign_income: z.number().nonnegative().optional(),
});

export const inputSchema = z.object({
  k1_trusts: z.array(itemSchema).min(1),
});

type K1TrustItem = z.infer<typeof itemSchema>;
type K1TrustItems = K1TrustItem[];

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

class K1TrustNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "k1_trust";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule_b, f1040, schedule_d, schedule1, form_1116]);

  compute(input: z.infer<typeof inputSchema>): NodeResult {
    const { k1_trusts } = inputSchema.parse(input);

    const outputs: NodeOutput[] = [
      ...scheduleBInterestOutputs(k1_trusts),
      ...scheduleBDividendOutputs(k1_trusts),
      ...f1040QualDivOutput(k1_trusts),
      ...scheduleDOutput(k1_trusts),
      ...schedule1Output(k1_trusts),
      ...form1116Outputs(k1_trusts),
    ];

    return { outputs };
  }
}

export const k1_trust = new K1TrustNode();

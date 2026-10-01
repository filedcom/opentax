import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../core/types/output-nodes.ts";
import { agi_aggregator } from "../../aggregation/agi_aggregator/index.ts";
import { schedule2 } from "../../aggregation/schedule2/index.ts";
import { schedule1 } from "../../../outputs/schedule1/index.ts";
import { form8959 } from "../form8959/index.ts";
import { form8995 } from "../form8995/index.ts";
import { form7206 } from "../form7206/index.ts";
import type { NodeContext } from "../../../../../../core/types/node-context.ts";
import { CONFIG_BY_YEAR } from "../../../config/index.ts";
import {
  farmOptionalMethodLines,
  NET_EARNINGS_MULTIPLIER,
} from "./calculation.ts";

// ─── TY2025 Constants ──────────────────────────────────────────────────────────
// IRC §1402(b) — minimum SE earnings to owe SE tax
const SE_EARNINGS_THRESHOLD = 400;
// IRC §1401(a) — Social Security rate (employee + employer combined)
const SS_RATE = 0.124;
// IRC §1401(b) — Medicare rate (employee + employer combined)
const MEDICARE_RATE = 0.029;
// IRC §164(f) — deductible half of SE tax
const SE_DEDUCTION_RATE = 0.50;

// ─── Schema ───────────────────────────────────────────────────────────────────

export const inputSchema = z.object({
  // Net profit from Schedule C, line 31 (Sch SE Line 2)
  net_profit_schedule_c: z.number().optional(),
  // Net earnings from ministerial services (clergy without an approved Form 4361): wages,
  // housing allowance, parsonage rental value, less allowable expenses. Part of Sch SE Line 2
  // per the Schedule SE instructions and Pub 517.
  ministerial_se_earnings: z.number().optional(),
  // Net farm profit from Schedule F, line 34 (Sch SE Line 1a)
  net_profit_schedule_f: z.number().optional(),
  // An affirmative Part II farm optional method election. The farm profit is
  // used for eligibility, but is omitted from Part I line 1a when elected.
  farm_optional_method_elected: z.boolean().optional(),
  // Gross farm income from Schedule F line 9 (and farm K-1 box 14 code B, if
  // applicable), used for the Part II line 15 calculation.
  gross_farm_income: z.number().nonnegative().optional(),
  // Unreported tips from Form 4137, line 10 — offsets SS wage base (Sch SE Line 8b)
  unreported_tips_4137: z.number().nonnegative().optional(),
  // Wages subject to SE from Form 8919, line 10 — offsets SS wage base (Sch SE Line 8c)
  wages_8919: z.number().nonnegative().optional(),
  // W-2 SS wages (box 3 + box 7 tips) — offsets SS wage base (Sch SE Line 8a)
  // IRC §1402(b); Schedule SE Part I Lines 8a–8d
  w2_ss_wages: z.number().nonnegative().optional(),
});

type ScheduleSEInput = z.infer<typeof inputSchema>;

// ─── Pure helpers ──────────────────────────────────────────────────────────────

// Line 3 for the regular method; the farm election uses the shared Part II
// calculation, which skips Part I line 1a.
function combinedNetProfit(input: ScheduleSEInput): number {
  return (input.net_profit_schedule_c ?? 0) +
    (input.ministerial_se_earnings ?? 0) +
    (input.net_profit_schedule_f ?? 0);
}

// Line 4a: net earnings from self-employment
// If line 3 > 0: multiply by 92.35%; otherwise carry forward as-is (loss)
function netEarningsFromSE(line3: number): number {
  return line3 > 0 ? line3 * NET_EARNINGS_MULTIPLIER : line3;
}

// Line 9: remaining SS wage base after W-2/tip/form-8919 offsets (Sch SE lines 8a–8d)
// W-2 SS wages (box 3 + box 7) reduce the SE SS wage base per Schedule SE Line 8a.
// This prevents double-payment of SS tax on the same dollars (IRC §1402(b)).
// Unreported tips (Form 4137 Line 10) → Line 8b; Form 8919 wages → Line 8c.
// Line 8d = 8a + 8b + 8c; Line 9 = max(0, Line 7 − Line 8d).
function remainingWageBase(ssWageBase: number, input: ScheduleSEInput): number {
  return Math.max(
    0,
    ssWageBase -
      (input.w2_ss_wages ?? 0) -
      (input.unreported_tips_4137 ?? 0) -
      (input.wages_8919 ?? 0),
  );
}

// Line 10: Social Security portion of SE tax
function ssTax(line6: number, line9: number): number {
  return Math.min(line6, line9) * SS_RATE;
}

// Line 11: Medicare portion of SE tax
function medicareTax(line6: number): number {
  return line6 * MEDICARE_RATE;
}

// ─── Node class ───────────────────────────────────────────────────────────────

class ScheduleSENode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "schedule_se";
  readonly inputSchema = inputSchema;
  get outputNodes() {
    return new OutputNodes([
      schedule2,
      schedule1,
      agi_aggregator,
      form8959,
      form8995,
      form7206,
    ]);
  }

  compute(ctx: NodeContext, rawInput: ScheduleSEInput): NodeResult {
    const cfg = CONFIG_BY_YEAR[ctx.taxYear];
    if (!cfg) throw new Error(`No schedule_se config for year ${ctx.taxYear}`);
    const input = inputSchema.parse(rawInput);

    const optional = farmOptionalMethodLines(input);
    // The shared Part II calculation owns the elected line 3/4a/4b/4c/6
    // amounts. Without an election, use the regular farm-plus-nonfarm route.
    const line3 = optional?.line3 ?? combinedNetProfit(input);
    const line4a = optional?.line4a ?? netEarningsFromSE(line3);
    const line4c = optional?.line4c ?? line4a;
    const source = (line13Deduction: number) =>
      this.outputNodes.output(form7206, {
        schedule_se_source: {
          net_profit_schedule_c: input.net_profit_schedule_c ?? 0,
          net_profit_schedule_f: input.net_profit_schedule_f ?? 0,
          farm_optional_method_elected:
            input.farm_optional_method_elected === true,
          line13_deduction: line13Deduction,
        },
      });
    if (line4c < SE_EARNINGS_THRESHOLD) {
      return { outputs: [source(0)] };
    }

    // Line 6: total SE earnings (= line 4c; church employee income not in scope)
    const line6 = optional?.line6 ?? line4c;

    // Lines 8a–8d, 9: wage base offset and remaining base
    const line9 = remainingWageBase(cfg.ssWageBase, input);

    // Line 10: SS tax on the lesser of line 6 or remaining wage base
    const line10 = ssTax(line6, line9);

    // Line 11: Medicare tax on all SE earnings
    const line11 = medicareTax(line6);

    // Line 12: total SE tax → Schedule 2 line 4
    const line12 = line10 + line11;

    // Line 13: deductible half → Schedule 1 line 15
    const line13 = line12 * SE_DEDUCTION_RATE;

    const outputs: NodeOutput[] = [
      source(line13),
      this.outputNodes.output(schedule2, { line4_se_tax: line12 }),
      this.outputNodes.output(schedule1, { line15_se_deduction: line13 }),
      this.outputNodes.output(agi_aggregator, { line15_se_deduction: line13 }),
      // Route net earnings (line 6) to Form 8959 Part II for Additional Medicare Tax.
      // i8959 line 8: "Enter your self-employment income from Schedule SE (Form 1040),
      // Part I, line 6." That is after the 92.35% multiplier. IRC §3101(b)(2).
      this.outputNodes.output(form8959, { se_income: line6 }),
      // Line 13 is a deduction attributable to the trade or business, so it reduces QBI.
      // i8995, Determining Your Qualified Business Income: the items to consider include
      // the "deductible part of self-employment tax".
      this.outputNodes.output(form8995, { se_tax_deduction: line13 }),
    ];

    return { outputs };
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const schedule_se = new ScheduleSENode();

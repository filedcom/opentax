import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import { TaxNode, output } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { schedule2 } from "../schedule2/index.ts";
import { schedule1 } from "../../outputs/schedule1/index.ts";

// ─── TY2025 Constants ──────────────────────────────────────────────────────────
// Rev Proc 2024-40 §3.28; Schedule SE (Form 1040) 2025, Part I Line 7
const SS_WAGE_BASE = 176_100;
// IRC §1402(b) — minimum SE earnings to owe SE tax
const SE_EARNINGS_THRESHOLD = 400;
// IRC §1402(a)(12) — net-earnings multiplier (100% − employer SS/Medicare rate)
const NET_EARNINGS_MULTIPLIER = 0.9235;
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
  // Net farm profit from Schedule F, line 34 (Sch SE Line 1a)
  net_profit_schedule_f: z.number().optional(),
  // Unreported tips from Form 4137, line 10 — offsets SS wage base (Sch SE Line 8b)
  unreported_tips_4137: z.number().nonnegative().optional(),
  // Wages subject to SE from Form 8919, line 10 — offsets SS wage base (Sch SE Line 8c)
  wages_8919: z.number().nonnegative().optional(),
  // Combined W-2 SS wages (boxes 3+7) — offsets SS wage base (Sch SE Line 8a)
  w2_ss_wages: z.number().nonnegative().optional(),
});

type ScheduleSEInput = z.infer<typeof inputSchema>;

// ─── Pure helpers ──────────────────────────────────────────────────────────────

// Line 3: total self-employment income (farm + nonfarm)
function combinedNetProfit(input: ScheduleSEInput): number {
  return (input.net_profit_schedule_c ?? 0) + (input.net_profit_schedule_f ?? 0);
}

// Line 4a: net earnings from self-employment
// If line 3 > 0: multiply by 92.35%; otherwise carry forward as-is (loss)
function netEarningsFromSE(line3: number): number {
  return line3 > 0 ? line3 * NET_EARNINGS_MULTIPLIER : line3;
}

// Line 8d: total wages offsetting the SS wage base
function totalWageBaseOffset(input: ScheduleSEInput): number {
  return (input.w2_ss_wages ?? 0) +
    (input.unreported_tips_4137 ?? 0) +
    (input.wages_8919 ?? 0);
}

// Line 9: remaining SS wage base after W-2/tip/form-8919 offset
function remainingWageBase(input: ScheduleSEInput): number {
  return Math.max(0, SS_WAGE_BASE - totalWageBaseOffset(input));
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
  readonly outputNodes = new OutputNodes([schedule2, schedule1]);

  compute(rawInput: ScheduleSEInput): NodeResult {
    const input = inputSchema.parse(rawInput);

    // Line 3: combined farm + nonfarm net profit
    const line3 = combinedNetProfit(input);

    // Line 4a: net earnings from SE (92.35% multiplier when positive)
    const line4a = netEarningsFromSE(line3);

    // Line 4c: if < $400 → no SE tax owed (stop)
    if (line4a < SE_EARNINGS_THRESHOLD) {
      return { outputs: [] };
    }

    // Line 6: total SE earnings (= line 4a; church employee income not in scope)
    const line6 = line4a;

    // Lines 8a–8d, 9: wage base offset and remaining base
    const line9 = remainingWageBase(input);

    // Line 10: SS tax on the lesser of line 6 or remaining wage base
    const line10 = ssTax(line6, line9);

    // Line 11: Medicare tax on all SE earnings
    const line11 = medicareTax(line6);

    // Line 12: total SE tax → Schedule 2 line 4
    const line12 = line10 + line11;

    // Line 13: deductible half → Schedule 1 line 15
    const line13 = line12 * SE_DEDUCTION_RATE;

    const outputs: NodeOutput[] = [
      this.outputNodes.output(schedule2, { line4_se_tax: line12 }),
      this.outputNodes.output(schedule1, { line15_se_deduction: line13 }),
    ];

    return { outputs };
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const schedule_se = new ScheduleSENode();

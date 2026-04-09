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
import type { NodeContext } from "../../../../../../core/types/node-context.ts";
import { SS_WAGE_BASE_2025 } from "../../../config/2025.ts";

// ─── TY2025 Constants ──────────────────────────────────────────────────────────
// Rev Proc 2024-40 §3.28; Schedule SE (Form 1040) 2025, Part I Line 7
const SS_WAGE_BASE = SS_WAGE_BASE_2025;
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

// Line 9: remaining SS wage base after tip/form-8919 offset (Sch SE lines 8b–8d)
// W-2 wages do NOT reduce SE SS base; the W2/SE overlap is handled via excess SS credit
// on Schedule 3 line 11, not as a reduction in SE tax itself.
function remainingWageBase(input: ScheduleSEInput): number {
  return Math.max(
    0,
    SS_WAGE_BASE - (input.unreported_tips_4137 ?? 0) - (input.wages_8919 ?? 0),
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
  readonly outputNodes = new OutputNodes([schedule2, schedule1, agi_aggregator, form8959]);

  compute(_ctx: NodeContext, rawInput: ScheduleSEInput): NodeResult {
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
      this.outputNodes.output(agi_aggregator, { line15_se_deduction: line13 }),
      // Route SE net earnings to Form 8959 Part II for Additional Medicare Tax.
      // IRC §3101(b)(2): 0.9% additional medicare tax applies to SE income above threshold.
      // line6 = net SE earnings (before the deduction split); form8959 handles the threshold math.
      this.outputNodes.output(form8959, { se_income: line6 }),
    ];

    return { outputs };
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const schedule_se = new ScheduleSENode();

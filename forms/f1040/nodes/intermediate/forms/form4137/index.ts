import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../../core/types/tax-node.ts";
import { TaxNode, output } from "../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../core/types/output-nodes.ts";
import { f1040 } from "../../../outputs/f1040/index.ts";
import { schedule2 } from "../../aggregation/schedule2/index.ts";
import type { NodeContext } from "../../../../../../core/types/node-context.ts";
import { SS_WAGE_BASE_2025 } from "../../../config/2025.ts";

// ─── Constants — TY2025 ───────────────────────────────────────────────────────

// IRC §3121(a)(1); Form 4137 line 7 — TY2025 SS wage base
const SS_WAGE_BASE = SS_WAGE_BASE_2025;
// Form 4137 line 11 — employee SS tax rate
const SS_RATE = 0.062;
// Form 4137 line 12 — employee Medicare tax rate
const MEDICARE_RATE = 0.0145;

// ─── Schema ───────────────────────────────────────────────────────────────────

// Form 4137 input. The W2 node deposits `allocated_tips` (W-2 box 8 total).
// Additional fields come from the taxpayer's screen 4137 entries.
export const inputSchema = z.object({
  // W-2 box 8 allocated tips (sent by W2 node); used as the unreported tip
  // amount when total_tips_received is not provided.
  allocated_tips: z.number().nonnegative(),

  // Form 4137 line 2 — total cash/charge tips received from all employers.
  // When provided together with reported_tips, overrides the allocated_tips
  // shortcut and enables the full line-2 minus line-3 calculation.
  total_tips_received: z.number().nonnegative().optional(),

  // Form 4137 line 3 — total tips reported to employer(s).
  reported_tips: z.number().nonnegative().optional(),

  // Form 4137 line 5 — tips not required to report (< $20 in a calendar
  // month). These are NOT subject to SS or Medicare tax.
  sub_$20_tips: z.number().nonnegative().optional(),

  // Form 4137 line 8 — W-2 boxes 3 + 7 (SS wages + SS tips already subject
  // to withholding). Used to compute remaining SS wage base room.
  ss_wages_from_w2: z.number().nonnegative().optional(),
});

type Form4137Input = z.infer<typeof inputSchema>;

// ─── Pure Helper Functions ────────────────────────────────────────────────────

// Form 4137 line 4: total unreported tip income to include on Form 1040 line 1c.
// If the taxpayer provided total/reported breakdowns, use those; otherwise
// the allocated_tips amount (W-2 box 8) is the entire unreported amount.
function unreportedTips(input: Form4137Input): number {
  const total = input.total_tips_received ?? input.allocated_tips;
  const reported = input.reported_tips ?? 0;
  return Math.max(0, total - reported);
}

// Form 4137 line 6: unreported tips subject to Medicare tax.
// Excludes sub-$20/month tips (line 5) which are not subject to FICA.
function medicareSubjectTips(line4: number, sub20: number): number {
  return Math.max(0, line4 - sub20);
}

// Form 4137 line 9: remaining room under the SS wage base after prior wages/tips.
function ssWageBaseRoom(priorSsWages: number): number {
  return Math.max(0, SS_WAGE_BASE - priorSsWages);
}

// Form 4137 line 10: unreported tips subject to SS tax (capped at wage base room).
function ssSubjectTips(line6: number, line9: number): number {
  return Math.min(line6, line9);
}

// Form 4137 line 11: SS tax on unreported tips.
function ssTax(line10: number): number {
  return line10 * SS_RATE;
}

// Form 4137 line 12: Medicare tax on unreported tips.
function medicareTax(line6: number): number {
  return line6 * MEDICARE_RATE;
}

// Form 4137 line 13: total FICA tax on unreported tips → Schedule 2 line 5.
function totalFicaTax(line11: number, line12: number): number {
  return line11 + line12;
}

// Route unreported tip income to Form 1040 line 1c when > 0.
function f1040Output(line4: number): NodeOutput[] {
  if (line4 <= 0) return [];
  return [output(f1040, { line1c_unreported_tips: line4 })];
}

// Route total FICA tax to Schedule 2 line 5 when > 0.
function schedule2Output(line13: number): NodeOutput[] {
  if (line13 <= 0) return [];
  return [output(schedule2, { line5_unreported_tip_tax: line13 })];
}

// ─── Node ─────────────────────────────────────────────────────────────────────

class Form4137Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "form4137";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([f1040, schedule2]);

  compute(_ctx: NodeContext, input: Form4137Input): NodeResult {
    const line4 = unreportedTips(input);
    const sub20 = input.sub_$20_tips ?? 0;
    const line6 = medicareSubjectTips(line4, sub20);
    const line8 = input.ss_wages_from_w2 ?? 0;
    const line9 = ssWageBaseRoom(line8);
    const line10 = ssSubjectTips(line6, line9);
    const line11 = ssTax(line10);
    const line12 = medicareTax(line6);
    const line13 = totalFicaTax(line11, line12);

    const outputs: NodeOutput[] = [
      ...f1040Output(line4),
      ...schedule2Output(line13),
    ];

    return { outputs };
  }
}

export const form4137 = new Form4137Node();

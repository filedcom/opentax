import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../../core/types/tax-node.ts";
import { TaxNode, output } from "../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../core/types/output-nodes.ts";
import { schedule2 } from "../../aggregation/schedule2/index.ts";
import { f1040 } from "../../../outputs/f1040/index.ts";
import { FilingStatus } from "../../../types.ts";
import type { NodeContext } from "../../../../../../core/types/node-context.ts";
import {
  ADDITIONAL_MEDICARE_THRESHOLD_MFJ,
  ADDITIONAL_MEDICARE_THRESHOLD_MFS,
  ADDITIONAL_MEDICARE_THRESHOLD_OTHER,
} from "../../../config/2025.ts";

// ─── TY2025 Constants ──────────────────────────────────────────────────────────
// IRC §3101(b)(2); Form 8959 line 7 — Additional Medicare Tax rate
const AMT_RATE = 0.009;

// Threshold amounts — not indexed for inflation (Form 8959 instructions, TY2025)
const THRESHOLD_MFJ = ADDITIONAL_MEDICARE_THRESHOLD_MFJ;
const THRESHOLD_MFS = ADDITIONAL_MEDICARE_THRESHOLD_MFS;
const THRESHOLD_OTHER = ADDITIONAL_MEDICARE_THRESHOLD_OTHER; // Single, HOH, QSS

// ─── Schema ───────────────────────────────────────────────────────────────────

export const inputSchema = z.object({
  // Filing status — determines threshold (from general node)
  filing_status: z.nativeEnum(FilingStatus),

  // Part I: Medicare Wages & Tips
  // Line 1 — Total Medicare wages and tips (W-2 box 5, all employers)
  // IRC §3101(b); Form 8959 line 1
  medicare_wages: z.number().nonnegative().optional(),

  // Line 2 — Unreported tips from Form 4137 line 6
  // Form 8959 line 2
  unreported_tips: z.number().nonnegative().optional(),

  // Line 3 — Wages from Form 8919 line 6
  // Form 8959 line 3
  wages_8919: z.number().nonnegative().optional(),

  // Part II: Self-Employment Income
  // Line 8 — SE income from Schedule SE Part I line 6 (negative values allowed; treated as 0)
  // Form 8959 line 8
  se_income: z.number().optional(),

  // Part III: RRTA Compensation
  // Line 14 — Total RRTA compensation and tips (W-2 box 14)
  // Form 8959 line 14
  rrta_wages: z.number().nonnegative().optional(),

  // Part V: Withholding Reconciliation
  // Line 19 — Medicare tax withheld (W-2 box 6 sum, includes box 12 codes B + N)
  // Form 8959 line 19
  medicare_withheld: z.number().nonnegative().optional(),

  // Line 23 — Additional Medicare Tax withheld on RRTA compensation (W-2 box 14)
  // Form 8959 line 23
  rrta_medicare_withheld: z.number().nonnegative().optional(),
});

type Form8959Input = z.infer<typeof inputSchema>;

// ─── Pure helpers ──────────────────────────────────────────────────────────────

// Threshold for filing status
// Form 8959 line 5 / line 15; not indexed for inflation
function threshold(status: FilingStatus): number {
  if (status === FilingStatus.MFJ) return THRESHOLD_MFJ;
  if (status === FilingStatus.MFS) return THRESHOLD_MFS;
  return THRESHOLD_OTHER;
}

// Part I, Line 4: total Medicare wages + tips (all sources)
// Form 8959 line 4
function totalMedicareWages(input: Form8959Input): number {
  return (input.medicare_wages ?? 0) +
    (input.unreported_tips ?? 0) +
    (input.wages_8919 ?? 0);
}

// Part I, Line 6: excess Medicare wages above threshold
// Form 8959 line 6
function medicareWageExcess(line4: number, limit: number): number {
  return Math.max(0, line4 - limit);
}

// Part I, Line 7: Additional Medicare Tax on wages
// Form 8959 line 7
function partITax(line6: number): number {
  return line6 * AMT_RATE;
}

// Part II, Line 10: reduced SE income threshold
// Threshold is reduced (but not below zero) by total Medicare wages (line 4)
// Form 8959 line 10
function reducedSeThreshold(limit: number, line4: number): number {
  return Math.max(0, limit - line4);
}

// Part II, Line 11: excess SE income above reduced threshold
// SE income losses don't count — negative SE is treated as zero
// Form 8959 line 11-12
function seIncomeExcess(seIncome: number, line10: number): number {
  const positiveSeIncome = Math.max(0, seIncome);
  return Math.max(0, positiveSeIncome - line10);
}

// Part II, Line 13: Additional Medicare Tax on SE income
// Form 8959 line 13
function partIITax(seExcess: number): number {
  return seExcess * AMT_RATE;
}

// Part III, Line 16: excess RRTA compensation above threshold
// RRTA threshold is NOT reduced by wages (separate pool per instructions)
// Form 8959 line 16
function rrtaExcess(rrtaWages: number, limit: number): number {
  return Math.max(0, rrtaWages - limit);
}

// Part III, Line 17: Additional Medicare Tax on RRTA compensation
// Form 8959 line 17
function partIIITax(line16: number): number {
  return line16 * AMT_RATE;
}

// Round to cents to avoid IEEE-754 floating point drift
function toCents(n: number): number {
  return Math.round(n * 100) / 100;
}

// Part IV, Line 18: total Additional Medicare Tax
// Form 8959 line 18 → Schedule 2 line 11
function totalAmtTax(p1: number, p2: number, p3: number): number {
  return toCents(p1 + p2 + p3);
}

// Part V, Line 24: total Additional Medicare Tax withheld
// Form 8959 line 24 → Form 1040 line 25c
function totalWithheld(input: Form8959Input): number {
  return (input.medicare_withheld ?? 0) + (input.rrta_medicare_withheld ?? 0);
}

// Route total AMT to schedule2 line 11 when > 0
function schedule2Output(amtTotal: number): NodeOutput[] {
  if (amtTotal <= 0) return [];
  return [output(schedule2, { line11_additional_medicare: amtTotal })];
}

// Route total withholding to f1040 line 25c when > 0
function f1040Output(withheld: number): NodeOutput[] {
  if (withheld <= 0) return [];
  return [output(f1040, { line25c_additional_medicare_withheld: withheld })];
}

// ─── Node class ───────────────────────────────────────────────────────────────

class Form8959Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "form8959";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule2, f1040]);

  compute(_ctx: NodeContext, rawInput: Form8959Input): NodeResult {
    const input = inputSchema.parse(rawInput);

    const limit = threshold(input.filing_status);

    // Part I
    const line4 = totalMedicareWages(input);
    const line6 = medicareWageExcess(line4, limit);
    const line7 = partITax(line6);

    // Part II
    const line10 = reducedSeThreshold(limit, line4);
    const seExcess = seIncomeExcess(input.se_income ?? 0, line10);
    const line13 = partIITax(seExcess);

    // Part III
    const line16 = rrtaExcess(input.rrta_wages ?? 0, limit);
    const line17 = partIIITax(line16);

    // Part IV
    const line18 = totalAmtTax(line7, line13, line17);

    // Part V
    const line24 = totalWithheld(input);

    const outputs: NodeOutput[] = [
      ...schedule2Output(line18),
      ...f1040Output(line24),
    ];

    return { outputs };
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const form8959 = new Form8959Node();

import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../../core/types/tax-node.ts";
import { output, TaxNode } from "../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../core/types/output-nodes.ts";
import { schedule2 } from "../../aggregation/schedule2/index.ts";
import { f1040 } from "../../../outputs/f1040/index.ts";
import { FilingStatus } from "../../../types.ts";
import type { NodeContext } from "../../../../../../core/types/node-context.ts";
import { CONFIG_BY_YEAR, type F1040Config } from "../../../config/index.ts";

// ─── TY2025 Constants ──────────────────────────────────────────────────────────
// IRC §3101(b)(2); Form 8959 line 7 — Additional Medicare Tax rate
const AMT_RATE = 0.009;

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
  // Line 19 — Total Medicare tax withheld (W-2 box 6 sum, includes box 12 codes B + N)
  // Includes both regular (1.45%) and additional (0.9%) Medicare; regular portion
  // is subtracted in Part V (line 20) to isolate Additional Medicare Tax withheld.
  // Form 8959 line 19
  medicare_withheld: z.number().nonnegative().optional(),

  // Line 20 override wages — W-2 box 5 wages used only for line 20 regular Medicare
  // computation (line20 = box5 × 1.45%). When present, overrides line4 for line 20.
  // Required when box5 ≠ box1 (e.g., employer reports higher Medicare wages than
  // box 1 wages). If absent, falls back to line4 (same as medicare_wages).
  medicare_wages_box5: z.number().nonnegative().optional(),

  // Line 22 — Additional Medicare Tax withheld on RRTA compensation (W-2 box 14)
  // This is already the additional-only portion as reported on W-2 box 14.
  // Form 8959 line 22
  rrta_medicare_withheld: z.number().nonnegative().optional(),
});

const printFieldsSchema = z.object({
  line1_medicare_wages: z.number(),
  line2_unreported_tips: z.number(),
  line3_wages_8919: z.number(),
  line4_total_medicare_wages: z.number(),
  line5_threshold: z.number(),
  line6_wage_excess: z.number(),
  line7_wage_tax: z.number(),
  line8_se_income: z.number(),
  line9_threshold: z.number(),
  line10_medicare_wages: z.number(),
  line11_reduced_se_threshold: z.number(),
  line12_se_excess: z.number(),
  line13_se_tax: z.number(),
  line14_rrta_wages: z.number(),
  line15_threshold: z.number(),
  line16_rrta_excess: z.number(),
  line17_rrta_tax: z.number(),
  line18_total_tax: z.number(),
  line19_medicare_withheld: z.number(),
  line20_medicare_wages: z.number(),
  line21_regular_medicare_tax: z.number(),
  line22_additional_withheld: z.number(),
  line23_rrta_withheld: z.number(),
  line24_total_withheld: z.number(),
});

type Form8959Input = z.infer<typeof inputSchema>;
type Form8959PrintFields = z.infer<typeof printFieldsSchema>;

// ─── Pure helpers ──────────────────────────────────────────────────────────────

// Threshold for filing status
// Form 8959 line 5 / line 15; not indexed for inflation
// QSS uses MFJ threshold per IRC §3101(b)(2) and Form 8959 instructions
function threshold(status: FilingStatus, cfg: F1040Config): number {
  if (status === FilingStatus.MFJ) return cfg.additionalMedicareThresholdMfj;
  if (status === FilingStatus.QSS) return cfg.additionalMedicareThresholdMfj;
  if (status === FilingStatus.MFS) return cfg.additionalMedicareThresholdMfs;
  return cfg.additionalMedicareThresholdOther;
}

// Part I, Line 4: total Medicare wages + tips (all sources)
// Form 8959 line 1 = W-2 box 5 (Medicare wages). When medicare_wages_box5 is present
// (i.e., box5 ≠ box1), use it as the wage base for the threshold comparison.
// When absent (box5 == box1), fall back to medicare_wages (box1).
// Form 8959 line 4
function totalMedicareWages(input: Form8959Input): number {
  const wageBase = input.medicare_wages_box5 ?? input.medicare_wages ?? 0;
  return wageBase +
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

// Part V, Line 20: regular Medicare tax on wages = line4 × 1.45%
// Form 8959 line 20
function regularMedicareOnWages(line4: number): number {
  return toCents(line4 * 0.0145);
}

// Part V, Line 21: Additional Medicare Tax withheld from W-2 wages
// = max(0, line19 − line20); isolates the 0.9% additional portion
// Form 8959 line 21
// wagesForLine20: use box5 when available (for accurate regular Medicare subtraction),
// otherwise fall back to line4 (box1-based).
function additionalMedicareFromWages(
  medicareWithheld: number,
  wagesForLine20: number,
): number {
  return toCents(
    Math.max(0, medicareWithheld - regularMedicareOnWages(wagesForLine20)),
  );
}

// Part V, Line 24: total Additional Medicare Tax withheld
// = line21 (wages additional) + line22 (RRTA additional)
// Form 8959 line 24 → Form 1040 line 25c
function totalAdditionalWithheld(input: Form8959Input, line4: number): number {
  // Use box5 wages for line20 when provided; otherwise fall back to line4 (box1-based)
  const wagesForLine20 = input.medicare_wages_box5 ?? line4;
  const line21 = additionalMedicareFromWages(
    input.medicare_withheld ?? 0,
    wagesForLine20,
  );
  const line22 = input.rrta_medicare_withheld ?? 0;
  return toCents(line21 + line22);
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

function formOutput(fields: Form8959PrintFields): NodeOutput {
  return { nodeType: "form8959", fields: printFieldsSchema.parse(fields) };
}

// ─── Node class ───────────────────────────────────────────────────────────────

class Form8959Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "form8959";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule2, f1040]);

  compute(ctx: NodeContext, rawInput: Form8959Input): NodeResult {
    const cfg = CONFIG_BY_YEAR[ctx.taxYear];
    if (!cfg) throw new Error(`No f1040 config for year ${ctx.taxYear}`);
    const input = inputSchema.parse(rawInput);

    const limit = threshold(input.filing_status, cfg);

    // Part I
    const line1 = input.medicare_wages_box5 ?? input.medicare_wages ?? 0;
    const line2 = input.unreported_tips ?? 0;
    const line3 = input.wages_8919 ?? 0;
    const line4 = totalMedicareWages(input);
    const line6 = medicareWageExcess(line4, limit);
    const line7 = partITax(line6);

    // Part II
    const line8 = Math.max(0, input.se_income ?? 0);
    const line10 = reducedSeThreshold(limit, line4);
    const line12 = seIncomeExcess(line8, line10);
    const line13 = partIITax(line12);

    // Part III
    const line14 = input.rrta_wages ?? 0;
    const line16 = rrtaExcess(line14, limit);
    const line17 = partIIITax(line16);

    // Part IV
    const line18 = totalAmtTax(line7, line13, line17);

    // Part V
    const line19 = input.medicare_withheld ?? 0;
    const line20 = line1;
    const line21 = regularMedicareOnWages(line20);
    const line22 = additionalMedicareFromWages(line19, line20);
    const line23 = input.rrta_medicare_withheld ?? 0;
    const line24 = totalAdditionalWithheld(input, line4);

    const outputs: NodeOutput[] = [
      ...schedule2Output(line18),
      // Route excess Medicare withholding to 1040 line25c whenever present.
      // Employers may withhold the additional 0.9% Medicare rate before wages hit
      // the $200k threshold; that excess is always creditable (IRC §31; Form 8959 Part V).
      ...f1040Output(line24),
      ...(line18 > 0 || line24 > 0
        ? [formOutput({
          line1_medicare_wages: line1,
          line2_unreported_tips: line2,
          line3_wages_8919: line3,
          line4_total_medicare_wages: line4,
          line5_threshold: limit,
          line6_wage_excess: line6,
          line7_wage_tax: line7,
          line8_se_income: line8,
          line9_threshold: limit,
          line10_medicare_wages: line4,
          line11_reduced_se_threshold: line10,
          line12_se_excess: line12,
          line13_se_tax: line13,
          line14_rrta_wages: line14,
          line15_threshold: limit,
          line16_rrta_excess: line16,
          line17_rrta_tax: line17,
          line18_total_tax: line18,
          line19_medicare_withheld: line19,
          line20_medicare_wages: line20,
          line21_regular_medicare_tax: line21,
          line22_additional_withheld: line22,
          line23_rrta_withheld: line23,
          line24_total_withheld: line24,
        })]
        : []),
    ];

    return { outputs };
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const form8959 = new Form8959Node();

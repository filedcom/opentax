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
  taxpayer_ssn: z.string().optional(),
  spouse_ssn: z.string().optional(),
  ct2_taxpayer_ssn: z.string().optional(),
  ct2_spouse_ssn: z.string().optional(),

  // Part I line 1: separate source deposits are summed once, then printed
  // as total W-2 box 5 and substitute/household Medicare wages.
  w2_medicare_wages: z.number().nonnegative().optional(),
  f4852_medicare_wages: z.number().nonnegative().optional(),
  household_medicare_wages: z.number().nonnegative().optional(),

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
  w2_rrta_wages: z.number().nonnegative().optional(),
  ct2_rrta_wages: z.number().nonnegative().optional(),

  // Part V: Withholding Reconciliation
  // Line 19 — Total Medicare tax withheld (W-2 box 6 sum, includes box 12 codes B + N)
  // Includes both regular (1.45%) and additional (0.9%) Medicare; regular portion
  // is subtracted in Part V (line 20) to isolate Additional Medicare Tax withheld.
  // Form 8959 line 19
  w2_medicare_withheld: z.number().nonnegative().optional(),
  f4852_medicare_withheld: z.number().nonnegative().optional(),
  household_medicare_withheld: z.number().nonnegative().optional(),

  // Line 23 — Additional Medicare Tax withheld on RRTA compensation (W-2 box 14)
  // This is already the additional-only portion as reported on W-2 box 14.
  // Form 8959 line 23
  w2_rrta_medicare_withheld: z.number().nonnegative().optional(),
  ct2_rrta_medicare_tax_paid: z.number().nonnegative().optional(),
  // Filing is required when a single W-2 employer crosses the $200,000
  // withholding trigger, even if the return-wide filing-status threshold is not crossed.
  w2_single_over_withholding_threshold: z.boolean().optional(),
  f4852_single_over_withholding_threshold: z.boolean().optional(),
}).strict();

const printDollar = z.number().int().nonnegative().max(999_999_999_999_999);

export const printFieldsSchema = z.object({
  medicare_wages: printDollar.optional(),
  medicare_withheld: printDollar.optional(),
  rrta_wages: printDollar.optional(),
  rrta_medicare_withheld: printDollar.optional(),
  single_w2_over_withholding_threshold: z.boolean().optional(),
  line1_medicare_wages: printDollar,
  line2_unreported_tips: printDollar,
  line3_wages_8919: printDollar,
  line4_total_medicare_wages: printDollar,
  line5_threshold: printDollar,
  line6_wage_excess: printDollar,
  line7_wage_tax: printDollar,
  line8_se_income: printDollar,
  line9_threshold: printDollar,
  line10_medicare_wages: printDollar,
  line11_reduced_se_threshold: printDollar,
  line12_se_excess: printDollar,
  line13_se_tax: printDollar,
  line14_rrta_wages: printDollar,
  line15_threshold: printDollar,
  line16_rrta_excess: printDollar,
  line17_rrta_tax: printDollar,
  line18_total_tax: printDollar,
  line19_medicare_withheld: printDollar,
  line20_medicare_wages: printDollar,
  line21_regular_medicare_tax: printDollar,
  line22_additional_withheld: printDollar,
  line23_rrta_withheld: printDollar,
  line24_total_withheld: printDollar,
}).strict();

export type Form8959PrintFields = z.infer<typeof printFieldsSchema>;

type Form8959Input = z.infer<typeof inputSchema>;

// ─── Pure helpers ──────────────────────────────────────────────────────────────

// Threshold for filing status
// Form 8959 line 5 / line 15; not indexed for inflation
function threshold(status: FilingStatus, cfg: F1040Config): number {
  if (status === FilingStatus.MFJ) return cfg.additionalMedicareThresholdMfj;
  if (status === FilingStatus.MFS) return cfg.additionalMedicareThresholdMfs;
  return cfg.additionalMedicareThresholdOther;
}

function medicareWages(input: Form8959Input): number {
  return (input.w2_medicare_wages ?? 0) +
    (input.f4852_medicare_wages ?? 0) +
    (input.household_medicare_wages ?? 0);
}

function medicareWithheld(input: Form8959Input): number {
  return (input.w2_medicare_withheld ?? 0) +
    (input.f4852_medicare_withheld ?? 0) +
    (input.household_medicare_withheld ?? 0);
}

function singleW2FilingRequired(input: Form8959Input): boolean {
  return input.w2_single_over_withholding_threshold === true ||
    input.f4852_single_over_withholding_threshold === true;
}

// Part I, Line 6: excess Medicare wages above threshold
// Form 8959 line 6
function medicareWageExcess(line4: number, limit: number): number {
  return Math.max(0, line4 - limit);
}

// Part I, Line 7: Additional Medicare Tax on wages
// Form 8959 line 7
function partITax(line6: number): number {
  return Math.round(line6 * AMT_RATE);
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
  return Math.round(seExcess * AMT_RATE);
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
  return Math.round(line16 * AMT_RATE);
}

// The TY2025 IRS8959 XSD uses whole-dollar integer types. Keep cents while
// summing source records, then round each printed line once, as the Form 1040
// instructions direct when filing whole-dollar amounts.
function wholeDollar(amount: number): number {
  return Math.round(amount);
}

// Part IV, Line 18: total Additional Medicare Tax
// Form 8959 line 18 → Schedule 2 line 11
function totalAmtTax(p1: number, p2: number, p3: number): number {
  return p1 + p2 + p3;
}

// Part V, Line 21: regular Medicare tax on W-2 box 5 wages = line20 × 1.45%
// Form 8959 line 21
function regularMedicareOnWages(line4: number): number {
  return wholeDollar(line4 * 0.0145);
}

// Part V, Line 22: Additional Medicare Tax withheld from W-2 wages
// = max(0, line19 − line21); isolates the 0.9% additional portion
// Form 8959 line 22
function additionalMedicareFromWages(
  medicareWithheld: number,
  wagesForLine20: number,
): number {
  return Math.max(
    0,
    medicareWithheld - regularMedicareOnWages(wagesForLine20),
  );
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
    if (
      ((input.ct2_rrta_wages ?? 0) > 0 ||
        (input.ct2_rrta_medicare_tax_paid ?? 0) > 0) &&
      !input.ct2_taxpayer_ssn && !input.ct2_spouse_ssn
    ) {
      throw new Error("Form CT-2 amounts need a matching recipient SSN");
    }
    if (input.ct2_taxpayer_ssn) {
      if (
        !input.taxpayer_ssn ||
        input.ct2_taxpayer_ssn.replaceAll("-", "") !==
          input.taxpayer_ssn.replaceAll("-", "")
      ) {
        throw new Error("Taxpayer CT-2 SSN must match Form 1040 taxpayer SSN");
      }
    }
    if (input.ct2_spouse_ssn) {
      if (input.filing_status !== FilingStatus.MFJ) {
        throw new Error("Spouse CT-2 records require married filing jointly");
      }
      if (
        !input.spouse_ssn ||
        input.ct2_spouse_ssn.replaceAll("-", "") !==
          input.spouse_ssn.replaceAll("-", "")
      ) {
        throw new Error("Spouse CT-2 SSN must match Form 1040 spouse SSN");
      }
    }

    const limit = threshold(input.filing_status, cfg);

    // Part I
    const line1 = wholeDollar(medicareWages(input));
    const line2 = wholeDollar(input.unreported_tips ?? 0);
    const line3 = wholeDollar(input.wages_8919 ?? 0);
    const line4 = line1 + line2 + line3;
    const line6 = medicareWageExcess(line4, limit);
    const line7 = partITax(line6);

    // Part II
    const line8 = wholeDollar(Math.max(0, input.se_income ?? 0));
    const line10 = reducedSeThreshold(limit, line4);
    const line12 = seIncomeExcess(line8, line10);
    const line13 = partIITax(line12);

    // Part III
    const line14 = wholeDollar(
      (input.w2_rrta_wages ?? 0) + (input.ct2_rrta_wages ?? 0),
    );
    const line16 = rrtaExcess(line14, limit);
    const line17 = partIIITax(line16);

    // Part IV
    const line18 = totalAmtTax(line7, line13, line17);

    // Part V
    const line19 = wholeDollar(medicareWithheld(input));
    const line20 = line1;
    const line21 = regularMedicareOnWages(line20);
    const line22 = additionalMedicareFromWages(line19, line20);
    const line23 = wholeDollar(
      (input.w2_rrta_medicare_withheld ?? 0) +
        (input.ct2_rrta_medicare_tax_paid ?? 0),
    );
    const line24 = line22 + line23;

    const outputs: NodeOutput[] = [
      ...schedule2Output(line18),
      // Route excess Medicare withholding to 1040 line25c whenever present.
      // Employers may withhold the additional 0.9% Medicare rate before wages hit
      // the $200k threshold; that excess is always creditable (IRC §31; Form 8959 Part V).
      ...f1040Output(line24),
      ...(line18 > 0 || line24 > 0 || singleW2FilingRequired(input)
        ? [formOutput({
          ...(line1 > 0 && { medicare_wages: line1 }),
          ...(line19 > 0 && { medicare_withheld: line19 }),
          ...(line14 > 0 && { rrta_wages: line14 }),
          ...(line23 > 0 && { rrta_medicare_withheld: line23 }),
          ...(singleW2FilingRequired(input) && {
            single_w2_over_withholding_threshold: true,
          }),
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

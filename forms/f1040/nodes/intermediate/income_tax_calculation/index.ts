import { z } from "zod";
import type { NodeOutput, NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";
import { FilingStatus } from "../../types.ts";
import { f1040 } from "../../outputs/f1040/index.ts";
import { form6251 } from "../form6251/index.ts";

// ─── Constants — TY2025 Tax Brackets & QDCGT Thresholds ─────────────────────
// Source: Rev. Proc. 2024-40, §3.01–§3.02; IRC §1(a)–(d), §1(h)

type Bracket = { over: number; upTo: number; rate: number; base: number };

type YearBrackets = {
  mfj: ReadonlyArray<Bracket>;
  single: ReadonlyArray<Bracket>;
  hoh: ReadonlyArray<Bracket>;
  mfs: ReadonlyArray<Bracket>;
};

// IRC §1(a) — Married filing jointly / Qualifying surviving spouse
const MFJ_BRACKETS_2025: ReadonlyArray<Bracket> = [
  { over: 0,       upTo: 23_850,   rate: 0.10, base: 0 },
  { over: 23_850,  upTo: 96_950,   rate: 0.12, base: 2_385 },
  { over: 96_950,  upTo: 206_700,  rate: 0.22, base: 11_157 },
  { over: 206_700, upTo: 394_600,  rate: 0.24, base: 35_302 },
  { over: 394_600, upTo: 501_050,  rate: 0.32, base: 80_398 },
  { over: 501_050, upTo: 751_600,  rate: 0.35, base: 114_462 },
  { over: 751_600, upTo: Infinity, rate: 0.37, base: 202_154.50 },
];

// IRC §1(c) — Single
const SINGLE_BRACKETS_2025: ReadonlyArray<Bracket> = [
  { over: 0,       upTo: 11_925,   rate: 0.10, base: 0 },
  { over: 11_925,  upTo: 48_475,   rate: 0.12, base: 1_192.50 },
  { over: 48_475,  upTo: 103_350,  rate: 0.22, base: 5_578.50 },
  { over: 103_350, upTo: 197_300,  rate: 0.24, base: 17_651 },
  { over: 197_300, upTo: 250_525,  rate: 0.32, base: 40_199 },
  { over: 250_525, upTo: 626_350,  rate: 0.35, base: 57_231 },
  { over: 626_350, upTo: Infinity, rate: 0.37, base: 188_769.75 },
];

// IRC §1(b) — Head of household (wider brackets than Single)
const HOH_BRACKETS_2025: ReadonlyArray<Bracket> = [
  { over: 0,       upTo: 17_000,   rate: 0.10, base: 0 },
  { over: 17_000,  upTo: 64_850,   rate: 0.12, base: 1_700 },
  { over: 64_850,  upTo: 103_350,  rate: 0.22, base: 7_442 },
  { over: 103_350, upTo: 197_300,  rate: 0.24, base: 15_912 },
  { over: 197_300, upTo: 250_500,  rate: 0.32, base: 38_460 },
  { over: 250_500, upTo: 626_350,  rate: 0.35, base: 55_484 },
  { over: 626_350, upTo: Infinity, rate: 0.37, base: 187_031.50 },
];

// IRC §1(d) — Married filing separately (same lower brackets as Single, splits at $375,800)
const MFS_BRACKETS_2025: ReadonlyArray<Bracket> = [
  { over: 0,       upTo: 11_925,   rate: 0.10, base: 0 },
  { over: 11_925,  upTo: 48_475,   rate: 0.12, base: 1_192.50 },
  { over: 48_475,  upTo: 103_350,  rate: 0.22, base: 5_578.50 },
  { over: 103_350, upTo: 197_300,  rate: 0.24, base: 17_651 },
  { over: 197_300, upTo: 250_525,  rate: 0.32, base: 40_199 },
  { over: 250_525, upTo: 375_800,  rate: 0.35, base: 57_231 },
  { over: 375_800, upTo: Infinity, rate: 0.37, base: 101_077.25 },
];

const BRACKETS_BY_YEAR: Record<number, YearBrackets> = {
  2025: {
    mfj: MFJ_BRACKETS_2025,
    single: SINGLE_BRACKETS_2025,
    hoh: HOH_BRACKETS_2025,
    mfs: MFS_BRACKETS_2025,
  },
};

// ─── Constants — TY2025 QDCGT Rate Thresholds ────────────────────────────────
// Rev. Proc. 2024-40, §3.02; IRC §1(h)

// Top of 0% LTCG/QD bracket (income above this is subject to 15% or 20%)
const ZERO_RATE_CEILING_2025: Record<FilingStatus, number> = {
  [FilingStatus.Single]:  48_350,
  [FilingStatus.MFJ]:     96_700,
  [FilingStatus.MFS]:     48_350,
  [FilingStatus.HOH]:     64_750,
  [FilingStatus.QSS]:     96_700,
};

// Bottom of 20% LTCG/QD bracket (income above this is subject to 20%)
const TWENTY_RATE_FLOOR_2025: Record<FilingStatus, number> = {
  [FilingStatus.Single]:  533_400,
  [FilingStatus.MFJ]:     600_050,
  [FilingStatus.MFS]:     300_025,
  [FilingStatus.HOH]:     566_700,
  [FilingStatus.QSS]:     600_050,
};

type QdcgtThresholds = {
  zeroCeiling: Record<FilingStatus, number>;
  twentyFloor: Record<FilingStatus, number>;
};

const QDCGT_THRESHOLDS_BY_YEAR: Record<number, QdcgtThresholds> = {
  2025: {
    zeroCeiling: ZERO_RATE_CEILING_2025,
    twentyFloor: TWENTY_RATE_FLOOR_2025,
  },
};

// ─── Schema ───────────────────────────────────────────────────────────────────

// Income Tax Calculation — Form 1040 Line 16
//
// Phase 1: Bracket-table regular tax for all five filing statuses.
// Phase 2: Qualified Dividends and Capital Gain Tax Worksheet (QDCGTW).
//   When qualified_dividends or net_capital_gain is provided, applies
//   preferential 0%/15%/20% rates per IRC §1(h). The QDCGT result is
//   always ≤ the regular bracket result (the worksheet yields the minimum).
//
// IRC §1; Rev. Proc. 2024-40, §3.01–§3.02
export const inputSchema = z.object({
  // Form 1040 Line 15 — Taxable income (AGI minus deductions minus QBI deduction).
  taxable_income: z.number().nonnegative(),

  // Determines which bracket table to apply.
  filing_status: z.nativeEnum(FilingStatus),

  // ── QDCGT Worksheet inputs (optional) ────────────────────────────────────
  // Form 1040 Line 3a — Qualified dividends (from f1099div).
  qualified_dividends: z.number().nonnegative().optional(),
  // Net capital gain for preferential rate purposes (from schedule_d line 19).
  // Equal to min(line15, line16) when both are positive (i.e., line17 = Yes).
  net_capital_gain: z.number().nonnegative().optional(),
});

type IncomeTaxCalcInput = z.infer<typeof inputSchema>;

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function bracketsForStatus(
  status: FilingStatus,
  yearBrackets: YearBrackets,
): ReadonlyArray<Bracket> {
  if (status === FilingStatus.MFJ || status === FilingStatus.QSS) return yearBrackets.mfj;
  if (status === FilingStatus.HOH) return yearBrackets.hoh;
  if (status === FilingStatus.MFS) return yearBrackets.mfs;
  return yearBrackets.single;
}

// Compute tax using the pre-computed base amounts stored in each bracket.
// Equivalent to summing tax across every rate band the income passes through.
function taxFromBrackets(income: number, brackets: ReadonlyArray<Bracket>): number {
  if (income <= 0) return 0;
  const bracket = [...brackets].reverse().find((b) => income > b.over);
  if (!bracket) return 0;
  return bracket.base + (income - bracket.over) * bracket.rate;
}

// Apply the QDCGT worksheet (IRC §1(h)) when qualified dividends or net capital
// gains are present. Returns the worksheet tax, which is always ≤ regular tax.
//
// Worksheet lines (simplified):
//   pref_income (L5)  = min(qual_div + net_cg, taxable_income)
//   ordinary (L6)     = taxable_income - pref_income
//   in_zero (L10)     = max(0, min(taxable_income, zero_ceiling) - ordinary)
//   remaining (L11)   = pref_income - in_zero
//   avail_15 (L16)    = max(0, twenty_floor - max(ordinary, zero_ceiling))
//   in_fifteen (L17)  = min(remaining, avail_15)
//   in_twenty (L20)   = remaining - in_fifteen
//   worksheet_tax     = ordinary_bracket_tax + 15%×in_fifteen + 20%×in_twenty
function qdcgtTax(
  taxableIncome: number,
  qualDividends: number,
  netCapGain: number,
  status: FilingStatus,
  brackets: ReadonlyArray<Bracket>,
  thresholds: QdcgtThresholds,
): number {
  const prefIncome = Math.min(qualDividends + netCapGain, taxableIncome);
  if (prefIncome <= 0) return taxFromBrackets(taxableIncome, brackets);

  const ordinary = taxableIncome - prefIncome;
  const zeroCeiling = thresholds.zeroCeiling[status];
  const twentyFloor = thresholds.twentyFloor[status];

  // Amount of preferentially taxed income in the 0% bracket
  const inZero = Math.max(0, Math.min(taxableIncome, zeroCeiling) - ordinary);

  // Remaining preferential income subject to 15% or 20%
  const remaining = prefIncome - inZero;

  // Room available in the 15% bracket above the zero ceiling
  const availFifteen = Math.max(0, twentyFloor - Math.max(ordinary, zeroCeiling));

  const inFifteen = Math.min(remaining, availFifteen);
  const inTwenty = remaining - inFifteen;

  const prefTax = inFifteen * 0.15 + inTwenty * 0.20;
  const ordinaryTax = taxFromBrackets(ordinary, brackets);

  return prefTax + ordinaryTax;
}

// ─── Node class ───────────────────────────────────────────────────────────────

class IncomeTaxCalculationNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "income_tax_calculation";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([f1040, form6251]);

  compute(ctx: NodeContext, rawInput: IncomeTaxCalcInput): NodeResult {
    const yearBrackets = BRACKETS_BY_YEAR[ctx.taxYear];
    if (yearBrackets === undefined) {
      throw new Error(`No tax brackets for year ${ctx.taxYear}`);
    }

    const qdcgtThresholds = QDCGT_THRESHOLDS_BY_YEAR[ctx.taxYear];
    if (qdcgtThresholds === undefined) {
      throw new Error(`No QDCGT thresholds for year ${ctx.taxYear}`);
    }

    const input = inputSchema.parse(rawInput);

    if (input.taxable_income === 0) {
      return { outputs: [] };
    }

    const brackets = bracketsForStatus(input.filing_status, yearBrackets);
    const regularTax = taxFromBrackets(input.taxable_income, brackets);

    // Apply QDCGT worksheet when qualified dividends or net capital gain are present.
    const qualDiv = input.qualified_dividends ?? 0;
    const netCg = input.net_capital_gain ?? 0;
    const tax = (qualDiv > 0 || netCg > 0)
      ? qdcgtTax(input.taxable_income, qualDiv, netCg, input.filing_status, brackets, qdcgtThresholds)
      : regularTax;

    const outputs: NodeOutput[] = [
      this.outputNodes.output(f1040, { line16_income_tax: tax }),
      // Feed form6251 the regular bracket tax (not QDCGT) — AMT uses regular tax base.
      this.outputNodes.output(form6251, {
        regular_tax: regularTax,
        regular_tax_income: input.taxable_income,
        filing_status: input.filing_status,
      }),
    ];

    return { outputs };
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const income_tax_calculation = new IncomeTaxCalculationNode();

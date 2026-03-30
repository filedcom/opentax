import { z } from "zod";
import type { NodeOutput, NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";
import { FilingStatus } from "../../types.ts";
import { f1040 } from "../../outputs/f1040/index.ts";
import { form6251 } from "../form6251/index.ts";

// ─── Constants — TY2025 Tax Brackets ─────────────────────────────────────────
// Source: Rev. Proc. 2024-40, §3.01; IRC §1(a)–(d)

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

// ─── Schema ───────────────────────────────────────────────────────────────────

// Income Tax Calculation — Form 1040 Line 16
//
// Computes regular income tax from the rate tables for the given tax year.
// Receives taxable income (Line 15) and filing status from upstream nodes.
// Routes regular tax to form6251 so AMT can compare against it.
//
// Phase 1: Bracket-table regular tax only.
// Phase 2 (future): Qualified Dividends and Capital Gain Tax Worksheet
//   will layer in preferential 0%/15%/20% rates.
//
// IRC §1; Rev. Proc. 2024-40, §3.01
export const inputSchema = z.object({
  // Form 1040 Line 15 — Taxable income (AGI minus deductions minus QBI deduction).
  // Provided by the standard_deduction node once implemented.
  taxable_income: z.number().nonnegative(),

  // Determines which bracket table to apply.
  // Provided by the general node.
  filing_status: z.nativeEnum(FilingStatus),
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

    const input = inputSchema.parse(rawInput);

    if (input.taxable_income === 0) {
      return { outputs: [] };
    }

    const brackets = bracketsForStatus(input.filing_status, yearBrackets);
    const tax = taxFromBrackets(input.taxable_income, brackets);

    const outputs: NodeOutput[] = [
      this.outputNodes.output(f1040, { line16_income_tax: tax }),
      // Feed form6251 everything it needs to evaluate AMT independently.
      this.outputNodes.output(form6251, {
        regular_tax: tax,
        regular_tax_income: input.taxable_income,
        filing_status: input.filing_status,
      }),
    ];

    return { outputs };
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const income_tax_calculation = new IncomeTaxCalculationNode();

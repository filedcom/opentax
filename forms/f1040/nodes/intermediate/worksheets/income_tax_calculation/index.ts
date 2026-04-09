import { z } from "zod";
import type { NodeOutput, NodeResult } from "../../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../../../core/types/node-context.ts";
import { FilingStatus } from "../../../types.ts";
import { f1040 } from "../../../outputs/f1040/index.ts";
import { form6251 } from "../../forms/form6251/index.ts";
import { f8812 } from "../../../inputs/f8812/index.ts";
import { CONFIG_BY_YEAR } from "../../../config/index.ts";
import type { Bracket } from "../../../config/2025.ts";

// ─── Accumulable helper ───────────────────────────────────────────────────────

// Fields that may arrive from multiple upstream nodes (e.g. f1099div and k1_partnership
// both routing qualified_dividends) accumulate as arrays in the executor pending dict.
// Declaring them accumulable prevents Zod parse failure; sumField collapses to a scalar.
const accumulable = <T extends z.ZodTypeAny>(schema: T) =>
  z.union([schema, z.array(schema)]);

function sumField(value: number | number[] | undefined): number {
  if (value === undefined) return 0;
  if (Array.isArray(value)) return value.reduce((s: number, n: number) => s + n, 0);
  return value;
}

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
  // Form 1040 Line 3a — Qualified dividends (from f1099div, k1_partnership, k1_s_corp, etc.).
  // Accumulable: multiple upstream nodes may each deposit their portion; the executor
  // accumulates them as an array which sumField collapses to a single total.
  qualified_dividends: accumulable(z.number().nonnegative()).optional(),
  // Net capital gain for preferential rate purposes (from schedule_d line 19).
  // Equal to min(line15, line16) when both are positive (i.e., line17 = Yes).
  net_capital_gain: z.number().nonnegative().optional(),
  // Unrecaptured §1250 gain (from unrecaptured_1250_worksheet via schedule_d line 19).
  // Taxed at 25% rate per IRC §1(h)(1)(D).
  unrecaptured_1250_gain: z.number().nonnegative().optional(),
  // 28% rate gain (collectibles) from rate_28_gain_worksheet.
  // Taxed at 28% rate per IRC §1(h)(4)/(5).
  rate_28_gain: z.number().nonnegative().optional(),

  // ── §911(f) stacking rule (optional) ─────────────────────────────────────
  // Total foreign earned income exclusion (FEIE + housing) from Form 2555.
  // When present, applies the §911(f) stacking rule: the tax on non-excluded
  // income is computed as Tax(taxable_income + exclusion) - Tax(exclusion),
  // which pushes non-excluded income into the correct marginal brackets.
  // IRC §911(f); Form 2555 Instructions "Tax on Income Not Excluded".
  foreign_earned_income_exclusion: z.number().nonnegative().optional(),
});

type IncomeTaxCalcInput = z.infer<typeof inputSchema>;

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function bracketsForStatus(
  status: FilingStatus,
  cfg: { bracketsMfj: ReadonlyArray<Bracket>; bracketsSingle: ReadonlyArray<Bracket>; bracketsHoh: ReadonlyArray<Bracket>; bracketsMfs: ReadonlyArray<Bracket> },
): ReadonlyArray<Bracket> {
  if (status === FilingStatus.MFJ || status === FilingStatus.QSS) return cfg.bracketsMfj;
  if (status === FilingStatus.HOH) return cfg.bracketsHoh;
  if (status === FilingStatus.MFS) return cfg.bracketsMfs;
  return cfg.bracketsSingle;
}

// Compute tax using the pre-computed base amounts stored in each bracket.
// Equivalent to summing tax across every rate band the income passes through.
function taxFromBrackets(income: number, brackets: ReadonlyArray<Bracket>): number {
  if (income <= 0) return 0;
  const bracket = [...brackets].reverse().find((b) => income > b.over);
  if (!bracket) return 0;
  return bracket.base + (income - bracket.over) * bracket.rate;
}

// Apply the QDCGT / Schedule D Tax Worksheet (IRC §1(h)).
//
// When unrecaptured_1250_gain or rate_28_gain are present, this implements the
// Schedule D Tax Worksheet which adds 25% and 28% rate tiers before 15%/20%.
// Without those inputs it reduces to the simpler QDCGT worksheet.
//
// Tier order (per IRS Schedule D Tax Worksheet):
//   0%  — preferential income within the zero-rate ceiling
//   25% — unrecaptured §1250 gain (IRC §1(h)(1)(D)) within remaining pref income
//   28% — collectibles gain (IRC §1(h)(4)/(5)) within remaining after §1250
//   15% — remaining pref income within the 20% threshold
//   20% — remaining above the 20% threshold
//
// Result is capped at the regular bracket tax (worksheet is always ≤ regular).
function qdcgtTax(
  taxableIncome: number,
  qualDividends: number,
  netCapGain: number,
  status: FilingStatus,
  brackets: ReadonlyArray<Bracket>,
  zeroCeiling: Record<FilingStatus, number>,
  twentyFloor: Record<FilingStatus, number>,
  unrecaptured1250: number,
  rate28Gain: number,
): number {
  const prefIncome = Math.min(qualDividends + netCapGain, taxableIncome);
  if (prefIncome <= 0) return taxFromBrackets(taxableIncome, brackets);

  const ordinary = taxableIncome - prefIncome;
  const zeroCeilingVal = zeroCeiling[status];
  const twentyFloorVal = twentyFloor[status];

  // Amount of preferentially taxed income in the 0% bracket
  const inZero = Math.max(0, Math.min(taxableIncome, zeroCeilingVal) - ordinary);

  // Remaining preferential income above the zero-rate ceiling
  const remaining = prefIncome - inZero;

  // 25% tier: unrecaptured §1250 gain within remaining pref income
  const in25 = Math.min(remaining, unrecaptured1250);
  const remaining25 = remaining - in25;

  // 28% tier: collectibles gain within remaining after §1250
  const in28 = Math.min(remaining25, rate28Gain);
  const remaining28 = remaining25 - in28;

  // Room available in the 15% bracket above the zero ceiling
  const availFifteen = Math.max(0, twentyFloorVal - Math.max(ordinary, zeroCeilingVal));

  const inFifteen = Math.min(remaining28, availFifteen);
  const inTwenty = remaining28 - inFifteen;

  const prefTax = in25 * 0.25 + in28 * 0.28 + inFifteen * 0.15 + inTwenty * 0.20;
  const ordinaryTax = taxFromBrackets(ordinary, brackets);

  // Worksheet result is always ≤ regular bracket tax
  return Math.min(prefTax + ordinaryTax, taxFromBrackets(taxableIncome, brackets));
}

// ─── Node class ───────────────────────────────────────────────────────────────

class IncomeTaxCalculationNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "income_tax_calculation";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([f1040, form6251, f8812]);

  compute(ctx: NodeContext, rawInput: IncomeTaxCalcInput): NodeResult {
    const cfg = CONFIG_BY_YEAR[ctx.taxYear];
    if (!cfg) throw new Error(`No f1040 config for year ${ctx.taxYear}`);

    const input = inputSchema.parse(rawInput);

    if (input.taxable_income === 0) {
      // Still notify f8812 of zero tax liability so ACTC can be computed.
      return {
        outputs: [this.outputNodes.output(f8812, { auto_income_tax_liability: 0 })],
      };
    }

    const brackets = bracketsForStatus(input.filing_status, cfg);
    const floor = input.foreign_earned_income_exclusion ?? 0;

    // Apply QDCGT / Schedule D Tax Worksheet when preferential income is present.
    // qualified_dividends is accumulable: multiple upstream nodes (f1099div, k1_partnership, etc.)
    // may each deposit their portion; sumField collapses the accumulated array to a scalar.
    const qualDiv = sumField(input.qualified_dividends as number | number[] | undefined);
    const netCg = input.net_capital_gain ?? 0;
    const unrecaptured1250 = input.unrecaptured_1250_gain ?? 0;
    const rate28 = input.rate_28_gain ?? 0;
    const hasPrefIncome = qualDiv > 0 || netCg > 0;

    // §911(f) stacking rule: tax on non-excluded income =
    //   Tax(taxable + floor, with QDCGT) - Tax(floor, ordinary brackets)
    // This ensures non-excluded income is taxed at the marginal rate above the exclusion.
    let tax: number;
    if (floor > 0) {
      const stackedIncome = input.taxable_income + floor;
      const stackedTax = hasPrefIncome
        ? qdcgtTax(stackedIncome, qualDiv, netCg, input.filing_status, brackets, cfg.qdcgtZeroCeiling, cfg.qdcgtTwentyFloor, unrecaptured1250, rate28)
        : taxFromBrackets(stackedIncome, brackets);
      const floorTax = taxFromBrackets(floor, brackets);
      tax = Math.max(0, stackedTax - floorTax);
    } else if (hasPrefIncome) {
      tax = qdcgtTax(input.taxable_income, qualDiv, netCg, input.filing_status, brackets, cfg.qdcgtZeroCeiling, cfg.qdcgtTwentyFloor, unrecaptured1250, rate28);
    } else {
      tax = taxFromBrackets(input.taxable_income, brackets);
    }

    const regularTax = taxFromBrackets(input.taxable_income, brackets);

    const outputs: NodeOutput[] = [
      this.outputNodes.output(f1040, { line16_income_tax: tax }),
      // Feed form6251 the regular bracket tax (not QDCGT) — AMT uses regular tax base.
      // Also pass qualified_dividends and net_capital_gain for AMT QDCGT worksheet
      // per IRC §55(b)(3) so preferential rates apply within AMT too.
      this.outputNodes.output(form6251, {
        regular_tax: regularTax,
        regular_tax_income: input.taxable_income,
        filing_status: input.filing_status,
        ...(qualDiv > 0 ? { qualified_dividends: qualDiv } : {}),
        ...(netCg > 0 ? { net_capital_gain: netCg } : {}),
      }),
      // Feed f8812 the income tax liability for CTC nonrefundable limit calculation.
      this.outputNodes.output(f8812, { auto_income_tax_liability: tax }),
    ];

    return { outputs };
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const income_tax_calculation = new IncomeTaxCalculationNode();

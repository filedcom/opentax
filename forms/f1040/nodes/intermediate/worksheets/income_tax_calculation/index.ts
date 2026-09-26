import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../../../core/types/node-context.ts";
import { FilingStatus } from "../../../types.ts";
import { f1040 } from "../../../outputs/f1040/index.ts";
import { form6251 } from "../../forms/form6251/index.ts";
import { form_1116 } from "../../forms/form_1116/index.ts";
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
  if (Array.isArray(value)) {
    return value.reduce((s: number, n: number) => s + n, 0);
  }
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

  // Signed Form 6251 line 1b, calculated before the Form 1040 line 15 zero
  // floor and after adding back Schedule 1-A's enhanced senior deduction.
  form6251_line1b: z.number(),
  // Form 6251 line 2a chosen after standard-versus-itemized resolution.
  form6251_line2a: z.number().nonnegative(),

  // Determines which bracket table to apply.
  filing_status: z.nativeEnum(FilingStatus),

  // ── QDCGT Worksheet inputs (optional) ────────────────────────────────────
  // Form 1040 Line 3a — Qualified dividends (from f1099div, k1_partnership, k1_s_corp, etc.).
  // Accumulable: multiple upstream nodes may each deposit their portion; the executor
  // accumulates them as an array which sumField collapses to a single total.
  qualified_dividends: accumulable(z.number().nonnegative()).optional(),
  form8814_tax: z.number().nonnegative().optional(),
  form4972_tax: z.number().nonnegative().optional(),
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
  cfg: {
    bracketsMfj: ReadonlyArray<Bracket>;
    bracketsSingle: ReadonlyArray<Bracket>;
    bracketsHoh: ReadonlyArray<Bracket>;
    bracketsMfs: ReadonlyArray<Bracket>;
  },
): ReadonlyArray<Bracket> {
  if (status === FilingStatus.MFJ || status === FilingStatus.QSS) {
    return cfg.bracketsMfj;
  }
  if (status === FilingStatus.HOH) return cfg.bracketsHoh;
  if (status === FilingStatus.MFS) return cfg.bracketsMfs;
  return cfg.bracketsSingle;
}

// Compute tax using the pre-computed base amounts stored in each bracket.
// Equivalent to summing tax across every rate band the income passes through.
function taxFromBrackets(
  income: number,
  brackets: ReadonlyArray<Bracket>,
): number {
  if (income <= 0) return 0;
  const bracket = [...brackets].reverse().find((b) => income > b.over);
  if (!bracket) return 0;
  return bracket.base + (income - bracket.over) * bracket.rate;
}

// 2025 Schedule D Tax Worksheet, lines 1–47, for positive Schedule D lines
// 18/19 and a positive net capital gain. Form 4952 line 4g elections are
// rejected upstream until their source facts are incorporated.
function scheduleDTax(
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
  const line1 = taxableIncome;
  const line6 = qualDividends;
  const line9 = netCapGain;
  const line10 = line6 + line9;
  const line11 = rate28Gain + unrecaptured1250;
  const line12 = Math.min(line9, line11);
  const line13 = line10 - line12;
  const line14 = Math.max(0, line1 - line13);
  const line16 = Math.min(line1, zeroCeiling[status]);
  const line17 = Math.min(line14, line16);
  const line18 = Math.max(0, line1 - line10);
  const limit19 = status === FilingStatus.MFJ || status === FilingStatus.QSS
    ? 394_600
    : 197_300;
  const line19 = Math.min(line1, limit19);
  const line20 = Math.min(line14, line19);
  const line21 = Math.max(line18, line20);
  const line22 = line16 - line17;
  if (line1 === line16) {
    return Math.min(
      taxFromBrackets(line21, brackets),
      taxFromBrackets(line1, brackets),
    );
  }
  const line23 = Math.min(line1, line13);
  const line24 = line22;
  const line25 = Math.max(0, line23 - line24);
  const line27 = Math.min(line1, twentyFloor[status]);
  const line28 = line21 + line22;
  const line29 = Math.max(0, line27 - line28);
  const line30 = Math.min(line25, line29);
  const line31 = line30 * 0.15;
  const line32 = line24 + line30;
  if (line1 === line32) {
    return Math.min(
      line31 + taxFromBrackets(line21, brackets),
      taxFromBrackets(line1, brackets),
    );
  }
  const line33 = line23 - line32;
  const line34 = line33 * 0.20;
  const line35 = Math.min(line9, unrecaptured1250);
  const line36 = line10 + line21;
  const line38 = Math.max(0, line36 - line1);
  const line39 = Math.max(0, line35 - line38);
  const line40 = line39 * 0.25;
  const line41 = line21 + line22 + line30 + line33 + line39;
  const line42 = line1 - line41;
  const line43 = rate28Gain > 0 ? line42 * 0.28 : 0;
  const line44 = taxFromBrackets(line21, brackets);
  const line45 = line31 + line34 + line40 + line43 + line44;
  return Math.min(line45, taxFromBrackets(line1, brackets));
}

// Qualified Dividends and Capital Gain Tax Worksheet path (no Schedule D
// 25%/28% special gain). The result is capped at regular bracket tax.
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
  if (netCapGain > 0 && (unrecaptured1250 > 0 || rate28Gain > 0)) {
    return scheduleDTax(
      taxableIncome,
      qualDividends,
      netCapGain,
      status,
      brackets,
      zeroCeiling,
      twentyFloor,
      unrecaptured1250,
      rate28Gain,
    );
  }
  const prefIncome = Math.min(qualDividends + netCapGain, taxableIncome);
  if (prefIncome <= 0) return taxFromBrackets(taxableIncome, brackets);

  const ordinary = taxableIncome - prefIncome;
  const zeroCeilingVal = zeroCeiling[status];
  const twentyFloorVal = twentyFloor[status];

  // Amount of preferentially taxed income in the 0% bracket
  const inZero = Math.max(
    0,
    Math.min(taxableIncome, zeroCeilingVal) - ordinary,
  );

  // Remaining preferential income above the zero-rate ceiling
  const remaining = prefIncome - inZero;

  // Room available in the 15% bracket above the zero ceiling
  const availFifteen = Math.max(
    0,
    twentyFloorVal - Math.max(ordinary, zeroCeilingVal),
  );

  const inFifteen = Math.min(remaining, availFifteen);
  const inTwenty = remaining - inFifteen;

  const prefTax = inFifteen * 0.15 + inTwenty * 0.20;
  const ordinaryTax = taxFromBrackets(ordinary, brackets);

  // Worksheet result is always ≤ regular bracket tax
  return Math.min(
    prefTax + ordinaryTax,
    taxFromBrackets(taxableIncome, brackets),
  );
}

// ─── Node class ───────────────────────────────────────────────────────────────

class IncomeTaxCalculationNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "income_tax_calculation";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([f1040, form6251, f8812, form_1116]);

  compute(ctx: NodeContext, rawInput: IncomeTaxCalcInput): NodeResult {
    const cfg = CONFIG_BY_YEAR[ctx.taxYear];
    if (!cfg) throw new Error(`No f1040 config for year ${ctx.taxYear}`);

    const input = inputSchema.parse(rawInput);

    const brackets = bracketsForStatus(input.filing_status, cfg);
    const floor = input.foreign_earned_income_exclusion ?? 0;

    // Apply QDCGT / Schedule D Tax Worksheet when preferential income is present.
    // qualified_dividends is accumulable: multiple upstream nodes (f1099div, k1_partnership, etc.)
    // may each deposit their portion; sumField collapses the accumulated array to a scalar.
    const qualDiv = sumField(
      input.qualified_dividends as number | number[] | undefined,
    );
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
        ? qdcgtTax(
          stackedIncome,
          qualDiv,
          netCg,
          input.filing_status,
          brackets,
          cfg.qdcgtZeroCeiling,
          cfg.qdcgtTwentyFloor,
          unrecaptured1250,
          rate28,
        )
        : taxFromBrackets(stackedIncome, brackets);
      const floorTax = taxFromBrackets(floor, brackets);
      tax = Math.max(0, stackedTax - floorTax);
    } else if (hasPrefIncome) {
      tax = qdcgtTax(
        input.taxable_income,
        qualDiv,
        netCg,
        input.filing_status,
        brackets,
        cfg.qdcgtZeroCeiling,
        cfg.qdcgtTwentyFloor,
        unrecaptured1250,
        rate28,
      );
    } else {
      tax = taxFromBrackets(input.taxable_income, brackets);
    }

    const childElectionTax = input.form8814_tax ?? 0;
    const lumpSumTax = input.form4972_tax ?? 0;
    tax += childElectionTax + lumpSumTax;

    const outputs: NodeOutput[] = [
      this.outputNodes.output(f1040, {
        line16_income_tax: tax,
        ...(lumpSumTax > 0 ? { form4972_tax: lumpSumTax } : {}),
      }),
      // Form 6251 line 10 starts with Form 1040 line 16, including the
      // qualified-dividend/capital-gain rate calculation. Other line 10
      // adjustments still require their own source routing and audit.
      this.outputNodes.output(form6251, {
        regular_tax: tax,
        ...(lumpSumTax > 0 ? { form4972_tax: lumpSumTax } : {}),
        regular_tax_income: input.form6251_line1b,
        regular_taxable_income: input.taxable_income,
        line2a_taxes_paid: input.form6251_line2a,
        filing_status: input.filing_status,
        ...(qualDiv > 0 ? { qualified_dividends: qualDiv } : {}),
        ...(netCg > 0 ? { net_capital_gain: netCg } : {}),
        ...(unrecaptured1250 > 0
          ? { unrecaptured_1250_gain: unrecaptured1250 }
          : {}),
        ...(rate28 > 0 ? { rate_28_gain: rate28 } : {}),
        ...(floor > 0 ? { foreign_earned_income_exclusion: floor } : {}),
      }),
      // Feed f8812 the income tax liability for CTC nonrefundable limit calculation.
      this.outputNodes.output(f8812, { auto_income_tax_liability: tax }),
      // Form 1116 Part III line 20 — the base the §904(a) limitation multiplies.
      this.outputNodes.output(form_1116, {
        us_tax_before_credits: tax,
        worldwide_taxable_income: input.taxable_income,
      }),
    ];

    return { outputs };
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const income_tax_calculation = new IncomeTaxCalculationNode();

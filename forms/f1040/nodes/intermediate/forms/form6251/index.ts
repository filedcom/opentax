import { z } from "zod";
import type { NodeContext } from "../../../../../../core/types/node-context.ts";
import { OutputNodes } from "../../../../../../core/types/output-nodes.ts";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../../core/types/tax-node.ts";
import { FilingStatus } from "../../../types.ts";
import { schedule2 } from "../../aggregation/schedule2/index.ts";
import { f1040 } from "../../../outputs/f1040/index.ts";
import { CONFIG_BY_YEAR } from "../../../config/index.ts";
import { normalizeArray } from "../../../utils.ts";

// Phase-out rate: 25% of excess above threshold (IRC §55(d); Form 6251 Line 5 Worksheet, Step 5)
const PHASE_OUT_RATE = 0.25;
// 2025 Form 6251 line 4, married filing separately addition.
const MFS_LINE4_ADDITION_START = 900_350;
const MFS_LINE4_ADDITION_CAP = 68_500;

// ─── Schema ───────────────────────────────────────────────────────────────────

export const inputSchema = z.object({
  // Filing status determines exemption amounts and rate bracket thresholds
  filing_status: z.nativeEnum(FilingStatus),

  // Signed Form 6251 line 1b: AGI minus Form 1040 line 14 after removing
  // Schedule 1-A line 37. This is not the floored Form 1040 line 15 amount.
  regular_tax_income: z.number(),
  regular_taxable_income: z.number().nonnegative().optional(),

  // Form 6251 line 10 starts with Form 1040 line 16, removes Form 4972 tax,
  // adds Schedule 2 line 1z, and removes Schedule 3 line 1 and a negative
  // Form 8978 line 14. The Schedule J refigure still needs source routing.
  regular_tax: z.number().nonnegative(),
  form4972_tax: z.number().nonnegative().optional(),
  form8978_negative_line14: z.number().int().nonnegative().optional(),
  schedule2_line1z_tax: z.number().nonnegative().optional(),
  schedule3_line1_foreign_tax_credit: z.number().nonnegative().optional(),

  // Line 2i — ISO exercise adjustment.
  // Excess of FMV of stock acquired through ISO over exercise price.
  // Not recognized for regular tax but included in AMTI.
  // IRC §56(b)(3); Form 6251 Line 2i
  iso_adjustment: z.number().optional(),

  // Line 2l — Post-1986 depreciation adjustment.
  // Regular-tax depreciation deduction less AMT depreciation deduction.
  // IRC §56(a)(1); Form 6251 Line 2l
  depreciation_adjustment: z.number().optional(),
  // Bounded line 2l source: property-level reviewed AMT depreciation for
  // post-1998 non-1250 property using regular 200% declining balance.
  line2l_depreciation_workpaper: z.object({
    properties: z.array(
      z.object({
        property_id: z.string().trim().min(1),
        placed_in_service_year: z.number().int().min(1999).max(2025),
        regular_200_percent_declining_balance: z.literal(true),
        non_section1250_property: z.literal(true),
        no_special_allowance_or_section179_component: z.literal(true),
        not_passive_at_risk_limited_or_tax_shelter_farm: z.literal(true),
        no_inventory_capitalization_difference: z.literal(true),
        regular_tax_depreciation: z.number().int().nonnegative(),
        amt_depreciation: z.number().int().nonnegative(),
        reviewed_workpaper_reference: z.string().trim().min(1),
      }).strict(),
    ).min(1),
  }).strict().optional(),

  // Line 2f is reserved for a sourced ATNOLD. Nonzero direct amounts are
  // rejected below until the regular line-2e NOL and AMT NOL are refigured.
  nol_adjustment: z.number().optional(),

  // Line 2g — Tax-exempt interest income from private activity bonds.
  // Must be included in AMTI even though excluded for regular tax.
  // IRC §57(a)(5); Form 6251 Line 2g
  private_activity_bond_interest: z.number().nonnegative().optional(),
  // Line 2g — Private activity bond interest from 1099-INT/OID and 8814.
  // The other input receives 1099-DIV box 13; distinct source amounts add.
  line2g_pab_interest: z.union([
    z.number().nonnegative(),
    z.array(z.number().nonnegative()),
  ]).optional(),

  // Line 2h — 7% of qualified small business stock gain excluded under §1202.
  // IRC §57(a)(7); Form 6251 Line 2h
  qsbs_adjustment: z.number().nonnegative().optional(),

  // Line 2a — Taxes from Schedule A (state/local taxes deducted for regular tax)
  // AMT addback: taxes deducted on Schedule A are added back to AMTI.
  // IRC §56(b)(1)(A)(ii); Form 6251 Line 2a
  line2a_taxes_paid: z.number().nonnegative().optional(),

  // Line 2b — taxable state/local tax refunds included on Schedule 1 line 1.
  // The form prints the positive refund amount in parentheses; subtract it
  // from AMTI because the underlying tax deduction was disallowed for AMT.
  line2b_tax_refund: z.number().nonnegative().optional(),
  // Line 2d is the signed difference between regular and AMT depletion
  // allowed by the reviewed property-level source worksheet.
  line2d_depletion: z.number().int().finite().optional(),
  // Line 2j: signed K-1 (Form 1041) box 12 code A adjustment.
  line2j_estates_and_trusts: z.union([
    z.number().int().finite(),
    z.array(z.number().int().finite()),
  ]).optional(),
  // Identified, unadjusted Form 8949 rows whose AMT basis differs.
  // Positive short-term and long-term rows may coexist when the full Schedule D
  // source contains only these transactions. Loss rows have narrower bounds.
  line2k_8949_basis_dispositions: z.union([
    z.object({
      source_transaction_id: z.string().trim().min(1),
      part: z.enum(["A", "B", "C", "D", "E", "F"]),
      proceeds: z.number().int().nonnegative(),
      regular_basis: z.number().int().nonnegative(),
      amt_basis: z.number().int().nonnegative(),
      regular_gain: z.number().int().finite(),
      amt_gain: z.number().int().finite(),
    }),
    z.array(z.object({
      source_transaction_id: z.string().trim().min(1),
      part: z.enum(["A", "B", "C", "D", "E", "F"]),
      proceeds: z.number().int().nonnegative(),
      regular_basis: z.number().int().nonnegative(),
      amt_basis: z.number().int().nonnegative(),
      regular_gain: z.number().int().finite(),
      amt_gain: z.number().int().finite(),
    })).min(1),
  ]).optional(),
  line2k_8949_capital_audit: z.object({
    transactions: z.array(z.object({
      source_transaction_id: z.string(),
      part: z.enum([
        "A",
        "B",
        "C",
        "D",
        "E",
        "F",
        "G",
        "H",
        "I",
        "J",
        "K",
        "L",
      ]),
      proceeds: z.number(),
      cost_basis: z.number(),
      adjustment_codes: z.string().optional(),
      adjustment_amount: z.number().optional(),
      gain_loss: z.number(),
    })),
    has_other_capital_activity: z.boolean(),
  }).optional(),
  // Line 2o: current-year regular circulation-cost deduction less the AMT
  // deduction, sourced from the reviewed §59(e) expenditure record.
  line2o_circulation_costs: z.number().int().finite().optional(),

  // Legacy mixed AMT source bucket. It cannot identify the filed line and is
  // rejected below until its producers have line-specific AMT refigures.
  other_adjustments: z.number().optional(),

  // Line 8 — AMT Foreign Tax Credit (AMTFTC).
  // Offsets tentative minimum tax. Cannot reduce TMT below zero.
  // IRC §59(a); Form 6251 Line 8
  amtftc: z.number().nonnegative().optional(),

  // IRS filing instruction: a claimed personal-use Form 8911 credit requires
  // Form 6251 even when the final AMT amount is zero.
  must_file_for_credit: z.boolean().optional(),
  // Form 3800 separately requires the TMT computation and, for its ordinary
  // credit, a filed Form 6251 even when AMT is zero.
  must_file_for_gbc: z.boolean().optional(),
  // Form 8912 Part II line 8 needs computed AMT even when it is zero.
  must_compute_for_bond_credit: z.boolean().optional(),

  // AMT QDCGT inputs (IRC §55(b)(3)) — same preferential 0%/15%/20% rates
  // apply for AMT purposes, preventing over-taxation of investment income.
  // Routed from income_tax_calculation alongside regular_tax_income.
  qualified_dividends: z.number().nonnegative().optional(),
  net_capital_gain: z.number().nonnegative().optional(),
  form4952_regular_election: z.number().nonnegative().optional(),
  form4952_regular_elected_capital_gain: z.number().nonnegative().optional(),
  form4952_amt_election: z.number().nonnegative().optional(),
  form4952_amt_elected_capital_gain: z.number().nonnegative().optional(),
  form4952_amt_line2c_difference: z.number().optional(),
  taking_standard_deduction: z.boolean().optional(),
  unrecaptured_1250_gain: z.number().nonnegative().optional(),
  rate_28_gain: z.number().nonnegative().optional(),
  // Foreign Earned Income Tax Worksheet line 2b. This must be affirmed even
  // when zero; the Form 2555 exclusions alone do not determine disallowed
  // deductions or other exclusions related to excluded income.
  foreign_exclusion_disallowed_deductions: z.number().nonnegative().optional(),
  foreign_earned_income_exclusion: z.number().nonnegative().optional(),
});

type Form6251Input = z.infer<typeof inputSchema>;

function privateActivityBondInterest(input: Form6251Input): number {
  return (input.private_activity_bond_interest ?? 0) +
    normalizeArray(input.line2g_pab_interest).reduce(
      (sum, amount) => sum + amount,
      0,
    );
}

function estatesAndTrustsAdjustment(input: Form6251Input): number {
  return normalizeArray(input.line2j_estates_and_trusts).reduce(
    (sum, amount) => sum + amount,
    0,
  );
}

function line2kBasisDispositionAdjustment(input: Form6251Input): number {
  return normalizeArray(input.line2k_8949_basis_dispositions).reduce(
    (sum, row) => sum + row.amt_gain - row.regular_gain,
    0,
  );
}

// The fourth 2025 "Who Must File" test uses the signed total of lines 2c
// through 3. Mixed adjustments are rejected before this bounded calculation.
function knownLine2cThrough3Total(input: Form6251Input): number {
  return (input.taking_standard_deduction === true
    ? 0
    : (input.form4952_amt_line2c_difference ?? 0)) +
    (input.iso_adjustment ?? 0) +
    (input.line2d_depletion ?? 0) +
    estatesAndTrustsAdjustment(input) +
    line2kBasisDispositionAdjustment(input) +
    (input.line2o_circulation_costs ?? 0) +
    (input.depreciation_adjustment ?? 0) +
    (input.nol_adjustment ?? 0) +
    privateActivityBondInterest(input) +
    (input.qsbs_adjustment ?? 0);
}

function amtiWithoutKnownLine2cThrough3(input: Form6251Input): number {
  return computeAmti({
    ...input,
    form4952_amt_line2c_difference: 0,
    iso_adjustment: 0,
    line2d_depletion: 0,
    line2j_estates_and_trusts: 0,
    line2k_8949_basis_dispositions: undefined,
    line2o_circulation_costs: 0,
    depreciation_adjustment: 0,
    nol_adjustment: 0,
    private_activity_bond_interest: 0,
    line2g_pab_interest: 0,
    qsbs_adjustment: 0,
  });
}

// ─── Pure helpers ─────────────────────────────────────────────────────────────

// Form 6251 Line 4: Alternative Minimum Taxable Income (AMTI)
// AMTI = regular_tax_income + all adjustments and preference items
// IRC §55(b)(2); Form 6251 Lines 1–4
function computeAmtiBeforeMfsAddition(input: Form6251Input): number {
  return input.regular_tax_income +
    (input.line2a_taxes_paid ?? 0) +
    -(input.line2b_tax_refund ?? 0) +
    (input.taking_standard_deduction === true
      ? 0
      : (input.form4952_amt_line2c_difference ?? 0)) +
    (input.iso_adjustment ?? 0) +
    (input.line2d_depletion ?? 0) +
    estatesAndTrustsAdjustment(input) +
    line2kBasisDispositionAdjustment(input) +
    (input.line2o_circulation_costs ?? 0) +
    (input.depreciation_adjustment ?? 0) +
    (input.nol_adjustment ?? 0) +
    privateActivityBondInterest(input) +
    (input.qsbs_adjustment ?? 0);
}

function computeAmti(input: Form6251Input): number {
  const base = computeAmtiBeforeMfsAddition(input);
  if (input.filing_status !== FilingStatus.MFS) return base;
  const addition = Math.min(
    MFS_LINE4_ADDITION_CAP,
    Math.max(0, Math.round((base - MFS_LINE4_ADDITION_START) * 0.25)),
  );
  return base + addition;
}

// Form 6251 Line 5 Worksheet: compute the exemption amount with phase-out
// Full exemption phases out at 25¢ per dollar of AMTI above the threshold.
// Exemption = max(0, full_exemption − 25% × max(0, AMTI − phase_out_start))
// IRC §55(d); Form 6251 Instructions page 9
function computeExemption(
  amti: number,
  status: FilingStatus,
  exemption: Record<FilingStatus, number>,
  phaseOutStart: Record<FilingStatus, number>,
): number {
  const fullExemption = exemption[status];
  const start = phaseOutStart[status];
  const excess = Math.max(0, amti - start);
  const reduction = Math.floor(excess * PHASE_OUT_RATE);
  return Math.max(0, fullExemption - reduction);
}

// Form 6251 Line 6: Taxable excess (AMTI minus exemption)
// Line 6 = max(0, Line 4 − Line 5)
function computeTaxableExcess(amti: number, exemption: number): number {
  return Math.max(0, amti - exemption);
}

// Form 6251 Line 7: Tentative Minimum Tax using 26%/28% rate structure
// MFS filers use a halved bracket threshold ($119,550 vs $239,100).
// For line6 ≤ threshold:   TMT = line6 × 26%
// For line6 > threshold:   TMT = line6 × 28% − adjustment
// Source: IRS Instructions for Form 6251 (2025), "Line 7" / "What's New"
function computeTentativeMinimumTax(
  taxableExcess: number,
  status: FilingStatus,
  thresholdStandard: number,
  thresholdMfs: number,
  adjustmentStandard: number,
  adjustmentMfs: number,
): number {
  if (taxableExcess === 0) return 0;
  const threshold = status === FilingStatus.MFS
    ? thresholdMfs
    : thresholdStandard;
  const adjustment = status === FilingStatus.MFS
    ? adjustmentMfs
    : adjustmentStandard;
  if (taxableExcess <= threshold) {
    return Math.floor(taxableExcess * 0.26);
  }
  return Math.floor(taxableExcess * 0.28 - adjustment);
}

// 2025 Form 6251 Foreign Earned Income Tax Worksheet, ordinary-income branch.
function computeForeignEarnedIncomeTax(
  taxableExcess: number,
  excludedIncome: number,
  disallowedDeductions: number,
  status: FilingStatus,
  thresholdStandard: number,
  thresholdMfs: number,
  adjustmentStandard: number,
  adjustmentMfs: number,
): number {
  if (taxableExcess === 0) return 0;
  const line2c = Math.max(0, excludedIncome - disallowedDeductions);
  const line3 = taxableExcess + line2c;
  return computeTentativeMinimumTax(
    line3,
    status,
    thresholdStandard,
    thresholdMfs,
    adjustmentStandard,
    adjustmentMfs,
  ) - computeTentativeMinimumTax(
    line2c,
    status,
    thresholdStandard,
    thresholdMfs,
    adjustmentStandard,
    adjustmentMfs,
  );
}

// Form 6251 Line 9: TMT net of AMTFTC. Cannot be negative.
// Line 9 = max(0, Line 7 − Line 8)
function computeNetTmt(tmt: number, amtftc: number): number {
  return Math.max(0, tmt - amtftc);
}

// Form 6251 Line 11: AMT liability = max(0, net TMT − regular tax)
// Only positive when tentative minimum tax exceeds regular income tax.
// IRC §55(a); Form 6251 Line 11 → 2025 Schedule 2 Line 2
function computeAmt(netTmt: number, regularTax: number): number {
  return Math.max(0, netTmt - regularTax);
}

// Form 6251 Part III lines 13–15, 20, and 27 draw from either the QDCGT
// Worksheet or the Schedule D Tax Worksheet used for regular tax.
function partThreeWorksheetInputs(
  regularTaxableIncome: number,
  qualDividends: number,
  netCapGain: number,
  unrecaptured1250: number,
  rate28Gain: number,
  status: FilingStatus,
  form4952Election: number,
  electedCapitalGain: number,
): {
  line13: number;
  line14: number;
  line15: number;
  line20: number;
  line27: number;
} {
  const worksheetLine6 = Math.max(
    0,
    qualDividends - Math.max(0, form4952Election - electedCapitalGain),
  );
  const worksheetLine9 = Math.max(0, netCapGain - electedCapitalGain);
  const worksheetLine10 = worksheetLine6 + worksheetLine9;
  const useScheduleD = form4952Election > 0 ||
    (netCapGain > 0 && (unrecaptured1250 > 0 || rate28Gain > 0));
  if (!useScheduleD) {
    const regularWorksheetLine5 = Math.max(
      0,
      regularTaxableIncome - worksheetLine10,
    );
    return {
      line13: worksheetLine10,
      line14: 0,
      line15: worksheetLine10,
      line20: regularWorksheetLine5,
      line27: regularWorksheetLine5,
    };
  }

  // Schedule D Tax Worksheet lines 10–14 and 18–21, including Form 4952
  // line 4g amounts removed from preferential-rate income.
  const scheduleDLine9 = worksheetLine9;
  const scheduleDLine11 = rate28Gain + unrecaptured1250;
  const scheduleDLine12 = Math.min(scheduleDLine9, scheduleDLine11);
  const scheduleDLine13 = worksheetLine10 - scheduleDLine12;
  const scheduleDLine14 = Math.max(0, regularTaxableIncome - scheduleDLine13);
  const scheduleDLine18 = Math.max(0, regularTaxableIncome - worksheetLine10);
  const limit = status === FilingStatus.MFJ || status === FilingStatus.QSS
    ? 394_600
    : 197_300;
  const scheduleDLine19 = Math.min(regularTaxableIncome, limit);
  const scheduleDLine20 = Math.min(scheduleDLine14, scheduleDLine19);
  const scheduleDLine21 = Math.max(scheduleDLine18, scheduleDLine20);
  return {
    line13: scheduleDLine13,
    line14: unrecaptured1250,
    line15: Math.min(scheduleDLine13 + unrecaptured1250, worksheetLine10),
    line20: regularTaxableIncome > 0 ? scheduleDLine14 : 0,
    line27: regularTaxableIncome > 0 ? scheduleDLine21 : 0,
  };
}

// 2025 Form 6251 Part III, using the worksheet amounts above for both the
// regular QDCGT and Schedule D Tax Worksheet branches.
function computePartThree(
  taxableExcess: number,
  worksheet: ReturnType<typeof partThreeWorksheetInputs>,
  status: FilingStatus,
  zeroCeilingMap: Record<FilingStatus, number>,
  twentyFloorMap: Record<FilingStatus, number>,
  thresholdStandard: number,
  thresholdMfs: number,
  adjustmentStandard: number,
  adjustmentMfs: number,
): Record<string, number> {
  const line12 = taxableExcess;
  const { line13, line14, line15, line20, line27 } = worksheet;
  const line16 = Math.min(line12, line15);
  const line17 = line12 - line16;
  const amtOrdinaryTax = (income: number) =>
    computeTentativeMinimumTax(
      income,
      status,
      thresholdStandard,
      thresholdMfs,
      adjustmentStandard,
      adjustmentMfs,
    );
  const line18 = amtOrdinaryTax(line17);
  const line19 = zeroCeilingMap[status];
  const line21 = Math.max(0, line19 - line20);
  const line22 = Math.min(line12, line13);
  const line23 = Math.min(line21, line22);
  const line24 = line22 - line23;
  const line25 = twentyFloorMap[status];
  const line26 = line21;
  const line28 = line26 + line27;
  const line29 = Math.max(0, line25 - line28);
  const line30 = Math.min(line24, line29);
  const line31 = Math.floor(line30 * 0.15);
  const line32 = line23 + line30;
  const line33 = line22 - line32;
  const line34 = Math.floor(line33 * 0.20);
  const line35 = line17 + line32 + line33;
  const line36 = line12 - line35;
  const line37 = Math.floor(line36 * 0.25);
  const line38 = line18 + line31 + line34 + (line14 > 0 ? line37 : 0);
  const line39 = amtOrdinaryTax(line12);
  const line40 = Math.min(line38, line39);
  const additionalRateLinesApply = line32 !== line12;
  return {
    line12,
    line13,
    ...(line14 > 0 ? { line14 } : {}),
    line15,
    line16,
    line17,
    line18,
    line19,
    line20,
    line21,
    line22,
    line23,
    line24,
    line25,
    line26,
    line27,
    line28,
    line29,
    line30,
    line31,
    line32,
    ...(additionalRateLinesApply ? { line33, line34 } : {}),
    ...(additionalRateLinesApply && line14 > 0
      ? { line35, line36, line37 }
      : {}),
    line38,
    line39,
    line40,
  };
}

// ─── Node class ───────────────────────────────────────────────────────────────

class Form6251Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "form6251";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule2, f1040]);

  compute(ctx: NodeContext, rawInput: Form6251Input): NodeResult {
    const cfg = CONFIG_BY_YEAR[ctx.taxYear];
    if (!cfg) throw new Error(`No f1040 config for year ${ctx.taxYear}`);

    const input = inputSchema.parse(rawInput);
    const depreciationRows = input.line2l_depreciation_workpaper?.properties;
    if (
      ((input.depreciation_adjustment ?? 0) !== 0) !==
        (depreciationRows !== undefined) ||
      (depreciationRows !== undefined &&
        (new Set(depreciationRows.map((row) => row.property_id)).size !==
            depreciationRows.length ||
          depreciationRows.reduce(
              (sum, row) =>
                sum + row.regular_tax_depreciation - row.amt_depreciation,
              0,
            ) !== input.depreciation_adjustment))
    ) {
      throw new Error(
        "Form 6251 line 2l needs distinct reviewed property depreciation amounts reconciling to the signed adjustment",
      );
    }
    if ((input.other_adjustments ?? 0) !== 0) {
      throw new Error(
        "Form 6251 mixed other_adjustments needs line-specific AMT modeling before filing",
      );
    }
    if ((input.nol_adjustment ?? 0) !== 0) {
      throw new Error(
        "Form 6251 line 2f needs sourced regular NOL and AMT NOL refigures before filing",
      );
    }
    if (
      input.form4952_amt_line2c_difference !== undefined &&
      input.taking_standard_deduction === undefined
    ) {
      throw new Error(
        "Form 6251 line 2c needs the selected deduction method",
      );
    }
    const basisRows = normalizeArray(input.line2k_8949_basis_dispositions);
    const basisIds = new Set<string>();
    const shortTermBasisRows = basisRows.filter((row) =>
      ["A", "B", "C"].includes(row.part)
    );
    const longTermBasisRows = basisRows.filter((row) =>
      ["D", "E", "F"].includes(row.part)
    );
    const lossBasisRows = basisRows.filter((row) =>
      row.regular_gain < 0 || row.amt_gain < 0
    );
    if (lossBasisRows.length > 0) {
      // With no other capital activity, same-term gains offset losses before
      // Schedule D line 21 applies its separate regular and AMT limits.
      const regularNet = basisRows.reduce(
        (sum, row) => sum + row.regular_gain,
        0,
      );
      const amtNet = basisRows.reduce(
        (sum, row) => sum + row.amt_gain,
        0,
      );
      const lossLimit = input.filing_status === FilingStatus.MFS
        ? -1_500
        : -3_000;
      const oneTermOnly = shortTermBasisRows.length === basisRows.length ||
        longTermBasisRows.length === basisRows.length;
      const fullyDeductibleNetLoss = regularNet < 0 && amtNet < 0 &&
        regularNet >= lossLimit && amtNet >= lossLimit;
      // A positive net of short-term rows changes ordinary AMTI, not the
      // preferential Schedule D net capital gain or Form 6251 Part III.
      const positiveShortTermNet =
        shortTermBasisRows.length === basisRows.length &&
        regularNet > 0 && amtNet > 0;
      if (
        !oneTermOnly ||
        lossBasisRows.some((row) =>
          row.regular_gain >= 0 || row.amt_gain >= 0
        ) ||
        !(fullyDeductibleNetLoss || positiveShortTermNet) ||
        (input.qualified_dividends ?? 0) !== 0 ||
        (input.form4952_regular_election ?? 0) !== 0 ||
        (input.form4952_regular_elected_capital_gain ?? 0) !== 0 ||
        (input.form4952_amt_election ?? 0) !== 0 ||
        (input.form4952_amt_elected_capital_gain ?? 0) !== 0 ||
        (input.form4952_amt_line2c_difference ?? 0) !== 0 ||
        (input.unrecaptured_1250_gain ?? 0) !== 0 ||
        (input.rate_28_gain ?? 0) !== 0 ||
        (input.foreign_earned_income_exclusion ?? 0) !== 0
      ) {
        throw new Error(
          "Form 6251 line 2k AMT basis losses need one term of identified losses and gains with net losses within both regular and AMT Schedule D deduction limits or net positive short-term gains, with no preferential-rate or other capital activity",
        );
      }
    }
    for (const row of basisRows) {
      if (basisIds.has(row.source_transaction_id)) {
        throw new Error(
          "Form 6251 line 2k repeats a Form 8949 source transaction",
        );
      }
      basisIds.add(row.source_transaction_id);
      if (
        (row.regular_gain <= 0 || row.amt_gain <= 0) &&
        !lossBasisRows.includes(row)
      ) {
        throw new Error(
          "Form 6251 line 2k AMT basis gain must be positive under both bases",
        );
      }
      if (
        row.proceeds - row.regular_basis !== row.regular_gain ||
        row.proceeds - row.amt_basis !== row.amt_gain
      ) {
        throw new Error(
          "Form 6251 line 2k gains must reconcile to the identified Form 8949 proceeds and bases",
        );
      }
    }
    if (basisRows.length > 0) {
      const audit = input.line2k_8949_capital_audit;
      const auditedRows = audit?.transactions;
      if (
        !audit || audit.has_other_capital_activity || !auditedRows ||
        auditedRows.length !== basisRows.length ||
        auditedRows.some((audited) => {
          const source = basisRows.find((row) =>
            row.source_transaction_id === audited.source_transaction_id
          );
          return !source || audited.part !== source.part ||
            audited.proceeds !== source.proceeds ||
            audited.cost_basis !== source.regular_basis ||
            audited.gain_loss !== source.regular_gain ||
            (audited.adjustment_codes ?? "") !== "" ||
            (audited.adjustment_amount ?? 0) !== 0;
        })
      ) {
        throw new Error(
          "Form 6251 line 2k needs a complete Schedule D source audit containing only its identified Form 8949 dispositions",
        );
      }
    }
    const line2k = line2kBasisDispositionAdjustment(input);

    // Part I — AMTI (Line 4)
    const amti = computeAmti(input);

    // Part II — Exemption (Line 5)
    const exemption = computeExemption(
      amti,
      input.filing_status,
      cfg.amtExemption,
      cfg.amtPhaseOutStart,
    );

    // Line 6 — Taxable excess
    const taxableExcess = computeTaxableExcess(amti, exemption);

    // Line 7 and Part III — use the IRS worksheet when preferential income is present.
    const qualDiv = input.qualified_dividends ?? 0;
    const regularNetCg = input.net_capital_gain ?? 0;
    if (basisRows.length > 0) {
      const sourceRegularNetCapitalGain = longTermBasisRows.reduce(
        (sum, row) => sum + row.regular_gain,
        0,
      );
      if (
        regularNetCg !==
          (lossBasisRows.length > 0 ? 0 : sourceRegularNetCapitalGain) ||
        (shortTermBasisRows.length > 0 &&
          ((input.form4952_regular_election ?? 0) !== 0 ||
            (input.form4952_regular_elected_capital_gain ?? 0) !== 0 ||
            (input.form4952_amt_line2c_difference ?? 0) !== 0)) ||
        (input.form4952_amt_election ?? 0) !== 0 ||
        (input.form4952_amt_elected_capital_gain ?? 0) !== 0 ||
        (input.unrecaptured_1250_gain ?? 0) !== 0 ||
        (input.rate_28_gain ?? 0) !== 0 ||
        (input.foreign_earned_income_exclusion ?? 0) !== 0
      ) {
        throw new Error(
          "Form 6251 line 2k AMT basis path needs its identified rows to reconcile with regular Schedule D net capital gain, with no other capital activity, Form 4952, special-rate gain, or Form 2555",
        );
      }
      // With only audited positive short-term gains, Schedule D has no net
      // capital gain for either tax. Qualified dividends still use Part III;
      // keep this route to bases where neither worksheet caps that amount.
      if (
        shortTermBasisRows.length > 0 && longTermBasisRows.length === 0 &&
        qualDiv > 0 &&
        (qualDiv > (input.regular_taxable_income ?? 0) ||
          qualDiv > taxableExcess)
      ) {
        throw new Error(
          "Form 6251 short-term AMT basis with qualified dividends needs the dividend amount within regular and AMT taxable income",
        );
      }
    }
    // Positive short-term gains enter taxable income and line 2k, but never
    // become preferential net capital gain on the AMT Schedule D.
    const netCg = basisRows.length > 0
      ? lossBasisRows.length > 0
        ? 0
        : longTermBasisRows.reduce((sum, row) => sum + row.amt_gain, 0)
      : regularNetCg + line2k;
    const amtElection = input.form4952_amt_election ?? 0;
    const electedCapitalGain = input.form4952_amt_elected_capital_gain ?? 0;
    const regularElection = input.form4952_regular_election ?? 0;
    const regularElectedCapitalGain =
      input.form4952_regular_elected_capital_gain ?? 0;
    if (
      electedCapitalGain > amtElection || electedCapitalGain > netCg ||
      amtElection - electedCapitalGain > qualDiv
    ) {
      throw new Error(
        "Form 6251 AMT Form 4952 election exceeds its qualified-dividend or net-capital-gain source",
      );
    }
    if (
      regularElectedCapitalGain > regularElection ||
      regularElectedCapitalGain > regularNetCg ||
      regularElection - regularElectedCapitalGain > qualDiv
    ) {
      throw new Error(
        "Form 6251 regular Form 4952 election exceeds its qualified-dividend or net-capital-gain source",
      );
    }
    const foreignExclusion = input.foreign_earned_income_exclusion ?? 0;
    const hasPreferentialIncome = qualDiv > 0 || netCg > 0;
    const hasForeignWorksheet = foreignExclusion > 0 && taxableExcess > 0;
    const hasSpecialRateGain = netCg > 0 &&
      ((input.unrecaptured_1250_gain ?? 0) > 0 ||
        (input.rate_28_gain ?? 0) > 0);
    if (
      taxableExcess > 0 && (qualDiv > 0 || netCg > 0) &&
      input.regular_taxable_income === undefined
    ) {
      throw new Error(
        "Form 6251 Part III requires Form 1040 line 15 taxable income",
      );
    }
    if (
      hasForeignWorksheet &&
      input.foreign_exclusion_disallowed_deductions === undefined
    ) {
      throw new Error(
        "Form 6251 Foreign Earned Income Tax Worksheet needs line 2b disallowed deductions, including an explicit zero",
      );
    }
    const foreignLine2c = Math.max(
      0,
      foreignExclusion - (input.foreign_exclusion_disallowed_deductions ?? 0),
    );
    const regularCapitalGainExcess = Math.max(
      0,
      qualDiv + regularNetCg - (input.regular_taxable_income ?? 0),
    );
    const regularAdjustedNetCg = Math.max(
      0,
      regularNetCg - regularCapitalGainExcess,
    );
    const regularAdjustedQualDiv = Math.max(
      0,
      qualDiv - Math.max(0, regularCapitalGainExcess - regularNetCg),
    );
    const amtCapitalGainExcess = Math.max(
      0,
      qualDiv + netCg - taxableExcess,
    );
    const amtAdjustedNetCg = Math.max(0, netCg - amtCapitalGainExcess);
    const amtAdjustedQualDiv = Math.max(
      0,
      qualDiv - Math.max(0, amtCapitalGainExcess - netCg),
    );
    const foreignMatchingElection = amtElection > 0 &&
      regularElection === amtElection &&
      regularElectedCapitalGain === electedCapitalGain &&
      input.form4952_regular_election !== undefined &&
      input.form4952_regular_elected_capital_gain !== undefined &&
      regularCapitalGainExcess === 0 && amtCapitalGainExcess === 0 &&
      !hasSpecialRateGain && line2k === 0;
    if (
      hasForeignWorksheet && hasPreferentialIncome &&
      (((amtElection > 0 || regularElection > 0) &&
        !foreignMatchingElection) ||
        (hasSpecialRateGain &&
          (regularCapitalGainExcess > 0 || amtCapitalGainExcess > 0)))
    ) {
      throw new Error(
        "Form 6251 with Form 2555 needs the Part III Schedule D refigure for an unmatched Form 4952 election or special-rate gain",
      );
    }
    const regularBasisWorksheet =
      longTermBasisRows.some((row) => row.regular_gain > 0) &&
        taxableExcess > 0
        ? partThreeWorksheetInputs(
          input.regular_taxable_income!,
          qualDiv,
          regularNetCg,
          0,
          0,
          input.filing_status,
          0,
          0,
        )
        : undefined;
    const partThreeWorksheet = taxableExcess > 0 && hasPreferentialIncome
      ? hasForeignWorksheet
        ? foreignMatchingElection
          ? partThreeWorksheetInputs(
            input.regular_taxable_income! + foreignLine2c,
            qualDiv,
            netCg,
            0,
            0,
            input.filing_status,
            amtElection,
            electedCapitalGain,
          )
          : hasSpecialRateGain
          ? partThreeWorksheetInputs(
            input.regular_taxable_income! + foreignLine2c,
            qualDiv,
            netCg,
            input.unrecaptured_1250_gain ?? 0,
            input.rate_28_gain ?? 0,
            input.filing_status,
            0,
            0,
          )
          : {
            ...partThreeWorksheetInputs(
              input.regular_taxable_income! + foreignLine2c,
              regularAdjustedQualDiv,
              regularAdjustedNetCg,
              0,
              0,
              input.filing_status,
              0,
              0,
            ),
            line13: amtAdjustedQualDiv + amtAdjustedNetCg,
            line15: amtAdjustedQualDiv + amtAdjustedNetCg,
          }
        : {
          ...partThreeWorksheetInputs(
            input.regular_taxable_income!,
            qualDiv,
            netCg,
            input.unrecaptured_1250_gain ?? 0,
            input.rate_28_gain ?? 0,
            input.filing_status,
            input.form4952_amt_election ?? 0,
            input.form4952_amt_elected_capital_gain ?? 0,
          ),
          ...(regularBasisWorksheet
            ? {
              line20: regularBasisWorksheet.line20,
              line27: regularBasisWorksheet.line27,
            }
            : {}),
        }
      : undefined;
    const partThree = partThreeWorksheet
      ? computePartThree(
        taxableExcess + (hasForeignWorksheet ? foreignLine2c : 0),
        partThreeWorksheet,
        input.filing_status,
        cfg.qdcgtZeroCeiling,
        cfg.qdcgtTwentyFloor,
        cfg.amtBracket26ThresholdStandard,
        cfg.amtBracket26ThresholdMfs,
        cfg.amtBracketAdjustmentStandard,
        cfg.amtBracketAdjustmentMfs,
      )
      : undefined;
    let tmt: number;
    if (hasForeignWorksheet) {
      const excludedIncomeTax = computeTentativeMinimumTax(
        foreignLine2c,
        input.filing_status,
        cfg.amtBracket26ThresholdStandard,
        cfg.amtBracket26ThresholdMfs,
        cfg.amtBracketAdjustmentStandard,
        cfg.amtBracketAdjustmentMfs,
      );
      tmt = hasPreferentialIncome
        ? Math.max(0, partThree!.line40 - excludedIncomeTax)
        : computeForeignEarnedIncomeTax(
          taxableExcess,
          foreignExclusion,
          input.foreign_exclusion_disallowed_deductions!,
          input.filing_status,
          cfg.amtBracket26ThresholdStandard,
          cfg.amtBracket26ThresholdMfs,
          cfg.amtBracketAdjustmentStandard,
          cfg.amtBracketAdjustmentMfs,
        );
    } else {
      tmt = partThree?.line40 ?? computeTentativeMinimumTax(
        taxableExcess,
        input.filing_status,
        cfg.amtBracket26ThresholdStandard,
        cfg.amtBracket26ThresholdMfs,
        cfg.amtBracketAdjustmentStandard,
        cfg.amtBracketAdjustmentMfs,
      );
    }

    const adjustedRegularTax = Math.max(
      0,
      input.regular_tax - (input.form4972_tax ?? 0) +
        (input.schedule2_line1z_tax ?? 0) -
        (input.schedule3_line1_foreign_tax_credit ?? 0) -
        (input.form8978_negative_line14 ?? 0),
    );
    // 2025 Form 6251 line 8 is left blank when line 10 is at least line 7.
    // The AMTFTC remains a recordkeeping calculation, not a filed line here.
    const filedAmtftc = tmt > adjustedRegularTax ? input.amtftc : undefined;

    // Line 9 — Net TMT after the AMTFTC allowed on the filed line 8.
    const netTmt = computeNetTmt(tmt, filedAmtftc ?? 0);

    // Line 11 — AMT liability.
    const amt = computeAmt(netTmt, adjustedRegularTax);

    const negativeKnownAdjustments = knownLine2cThrough3Total(input) < 0;
    const alreadyMustFile = tmt > adjustedRegularTax ||
      input.must_file_for_credit === true ||
      input.must_file_for_gbc === true ||
      input.must_compute_for_bond_credit === true;
    const canRefigureForeignPreference = hasPreferentialIncome &&
      foreignExclusion > 0 &&
      regularElection === 0 && regularElectedCapitalGain === 0 &&
      (input.form4952_amt_election ?? 0) === 0 &&
      (input.form4952_amt_elected_capital_gain ?? 0) === 0 &&
      !hasSpecialRateGain;
    const canRefigureDomesticPreference = hasPreferentialIncome &&
      foreignExclusion === 0 &&
      ((input.form4952_amt_line2c_difference ?? 0) < 0 ||
        (input.line2o_circulation_costs ?? 0) < 0 ||
        estatesAndTrustsAdjustment(input) < 0) &&
      (input.iso_adjustment ?? 0) === 0 &&
      (input.line2d_depletion ?? 0) === 0 &&
      line2k === 0 &&
      (input.depreciation_adjustment ?? 0) === 0 &&
      (input.nol_adjustment ?? 0) === 0 &&
      privateActivityBondInterest(input) === 0 &&
      (input.qsbs_adjustment ?? 0) === 0 &&
      (input.form4952_amt_election ?? 0) === 0 &&
      (input.form4952_amt_elected_capital_gain ?? 0) === 0 &&
      !hasSpecialRateGain && regularCapitalGainExcess === 0;
    if (
      negativeKnownAdjustments && !alreadyMustFile &&
      (canRefigureForeignPreference || canRefigureDomesticPreference) &&
      input.regular_taxable_income === undefined
    ) {
      throw new Error(
        "Form 6251 preferential-rate counterfactual needs Form 1040 line 15 taxable income",
      );
    }
    if (
      negativeKnownAdjustments && !alreadyMustFile &&
      hasPreferentialIncome &&
      !canRefigureForeignPreference && !canRefigureDomesticPreference
    ) {
      throw new Error(
        "Form 6251 negative-adjustment filing test needs a refigured special-rate line 7",
      );
    }
    const canComputeCounterfactual = negativeKnownAdjustments &&
      (!hasPreferentialIncome || canRefigureForeignPreference ||
        canRefigureDomesticPreference);
    const counterfactualAmti = canComputeCounterfactual
      ? amtiWithoutKnownLine2cThrough3(input)
      : 0;
    const counterfactualExemption = canComputeCounterfactual
      ? computeExemption(
        counterfactualAmti,
        input.filing_status,
        cfg.amtExemption,
        cfg.amtPhaseOutStart,
      )
      : 0;
    const counterfactualTaxableExcess = canComputeCounterfactual
      ? computeTaxableExcess(counterfactualAmti, counterfactualExemption)
      : 0;
    if (
      counterfactualTaxableExcess > 0 && foreignExclusion > 0 &&
      input.foreign_exclusion_disallowed_deductions === undefined
    ) {
      throw new Error(
        "Form 6251 negative-adjustment Foreign Earned Income Tax Worksheet needs line 2b disallowed deductions, including an explicit zero",
      );
    }
    const counterfactualCapitalGainExcess = Math.max(
      0,
      qualDiv + netCg - counterfactualTaxableExcess,
    );
    if (
      canComputeCounterfactual && canRefigureDomesticPreference &&
      counterfactualCapitalGainExcess > 0
    ) {
      throw new Error(
        "Form 6251 domestic preferential-rate counterfactual needs the capital-gain-excess refigure",
      );
    }
    const counterfactualAdjustedNetCg = Math.max(
      0,
      netCg - counterfactualCapitalGainExcess,
    );
    const counterfactualAdjustedQualDiv = Math.max(
      0,
      qualDiv - Math.max(0, counterfactualCapitalGainExcess - netCg),
    );
    const counterfactualPreferentialWorksheet =
      canComputeCounterfactual && canRefigureDomesticPreference &&
        counterfactualTaxableExcess > 0
        ? partThreeWorksheetInputs(
          input.regular_taxable_income!,
          qualDiv,
          netCg,
          0,
          0,
          input.filing_status,
          0,
          0,
        )
        : canComputeCounterfactual && canRefigureForeignPreference &&
            counterfactualTaxableExcess > 0
        ? {
          ...partThreeWorksheetInputs(
            input.regular_taxable_income! + foreignLine2c,
            regularAdjustedQualDiv,
            regularAdjustedNetCg,
            0,
            0,
            input.filing_status,
            0,
            0,
          ),
          line13: counterfactualAdjustedQualDiv +
            counterfactualAdjustedNetCg,
          line15: counterfactualAdjustedQualDiv +
            counterfactualAdjustedNetCg,
        }
        : undefined;
    const counterfactualLine7 = !canComputeCounterfactual
      ? 0
      : counterfactualPreferentialWorksheet
      ? Math.max(
        0,
        computePartThree(
          counterfactualTaxableExcess + foreignLine2c,
          counterfactualPreferentialWorksheet,
          input.filing_status,
          cfg.qdcgtZeroCeiling,
          cfg.qdcgtTwentyFloor,
          cfg.amtBracket26ThresholdStandard,
          cfg.amtBracket26ThresholdMfs,
          cfg.amtBracketAdjustmentStandard,
          cfg.amtBracketAdjustmentMfs,
        ).line40 - computeTentativeMinimumTax(
          foreignLine2c,
          input.filing_status,
          cfg.amtBracket26ThresholdStandard,
          cfg.amtBracket26ThresholdMfs,
          cfg.amtBracketAdjustmentStandard,
          cfg.amtBracketAdjustmentMfs,
        ),
      )
      : foreignExclusion > 0
      ? computeForeignEarnedIncomeTax(
        counterfactualTaxableExcess,
        foreignExclusion,
        input.foreign_exclusion_disallowed_deductions!,
        input.filing_status,
        cfg.amtBracket26ThresholdStandard,
        cfg.amtBracket26ThresholdMfs,
        cfg.amtBracketAdjustmentStandard,
        cfg.amtBracketAdjustmentMfs,
      )
      : computeTentativeMinimumTax(
        counterfactualTaxableExcess,
        input.filing_status,
        cfg.amtBracket26ThresholdStandard,
        cfg.amtBracket26ThresholdMfs,
        cfg.amtBracketAdjustmentStandard,
        cfg.amtBracketAdjustmentMfs,
      );
    const mustFileForNegativeAdjustments = canComputeCounterfactual &&
      counterfactualLine7 > adjustedRegularTax;

    // 2025 instructions require attachment when line 7 exceeds line 10,
    // even if the AMT foreign tax credit reduces line 11 to zero.
    if (
      tmt <= adjustedRegularTax && input.must_file_for_credit !== true &&
      input.must_file_for_gbc !== true &&
      input.must_compute_for_bond_credit !== true &&
      !mustFileForNegativeAdjustments
    ) {
      return { outputs: [] };
    }

    const outputs: NodeOutput[] = [
      ...(amt > 0
        ? [this.outputNodes.output(schedule2, { line2_amt: amt })]
        : []),
      ...(input.must_file_for_gbc === true ||
          input.must_file_for_credit === true ||
          input.must_compute_for_bond_credit === true
        ? [this.outputNodes.output(f1040, {
          credit_limit_form6251_line9: netTmt,
          credit_limit_form6251_line11: amt,
        })]
        : []),
      {
        nodeType: this.nodeType,
        fields: {
          ...input,
          must_file_for_credit: input.must_file_for_credit === true ||
            input.must_file_for_gbc === true ||
            input.must_compute_for_bond_credit === true,
          must_file_for_negative_adjustments: mustFileForNegativeAdjustments,
          regular_tax: adjustedRegularTax,
          ...(input.form4952_amt_line2c_difference !== undefined &&
              input.taking_standard_deduction !== true
            ? {
              line2c_investment_interest: input.form4952_amt_line2c_difference,
            }
            : {}),
          private_activity_bond_interest: privateActivityBondInterest(input),
          ...(input.line2j_estates_and_trusts !== undefined
            ? { line2j_estates_and_trusts: estatesAndTrustsAdjustment(input) }
            : {}),
          ...(basisRows.length > 0 ? { line2k_disposition: line2k } : {}),
          amtftc: filedAmtftc,
          amti,
          exemption,
          taxable_excess: taxableExcess,
          tentative_tax: tmt,
          net_tmt: netTmt,
          line11_amt: amt,
          ...partThree,
        },
      },
    ];

    return { outputs };
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const form6251 = new Form6251Node();

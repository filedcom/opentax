import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import { TaxNode, output } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { schedule2 } from "../schedule2/index.ts";
import { FilingStatus } from "../../types.ts";

// ─── TY2025 Constants ──────────────────────────────────────────────────────────
// IRC §1411(a)(1); Form 8960 line 17 — Net Investment Income Tax rate
const NIIT_RATE = 0.038;

// Threshold amounts — not indexed for inflation (Form 8960 instructions, TY2025)
// Form 8960 line 14
const THRESHOLD_MFJ = 250_000;
const THRESHOLD_MFS = 125_000;
const THRESHOLD_OTHER = 200_000; // Single, HOH, QSS

// ─── Schema ───────────────────────────────────────────────────────────────────

export const inputSchema = z.object({
  // Part III: Filing status — determines MAGI threshold
  // Form 8960 line 14
  filing_status: z.nativeEnum(FilingStatus),

  // Part III: Modified Adjusted Gross Income
  // For most individuals = AGI from Form 1040/1040-SR
  // IRC §1411(d); Form 8960 line 13
  magi: z.number().nonnegative(),

  // Part I: Investment Income components

  // Line 1 — Taxable interest (Form 1040 line 2b / Schedule B)
  // IRC §1411(c)(1)(A); Form 8960 line 1
  line1_taxable_interest: z.number().optional(),

  // Line 2 — Ordinary dividends (Form 1040 line 3b / Schedule B)
  // IRC §1411(c)(1)(A); Form 8960 line 2
  line2_ordinary_dividends: z.number().optional(),

  // Line 3 — Annuities subject to NIIT (non-qualified retirement plan annuities)
  // IRC §1411(c)(1)(A); Form 8960 line 3
  line3_annuities: z.number().optional(),

  // Line 4a — Income from passive trades/businesses/rentals (Schedules C, E, F)
  // IRC §1411(c)(2)(A); Form 8960 line 4a
  line4a_passive_income: z.number().optional(),

  // Line 4b — Rental net income from Schedule E (carry_to_8960=true items)
  // Adjustments for non-NIIT income; negative values reduce NII
  // IRC §1411(c)(1)(A); Form 8960 line 4b
  line4b_rental_net: z.number().optional(),

  // Line 5a — Net gain from disposition of property (Schedule D / Form 8949)
  // IRC §1411(c)(1)(A)(iii); Form 8960 line 5a
  line5a_net_gain: z.number().optional(),

  // Line 5b — Adjustment for gains/losses excluded from NII
  // Enter excluded gains as negative, excluded losses as positive
  // IRC §1411(c)(1)(A)(iii); Form 8960 line 5b
  line5b_net_gain_adjustment: z.number().optional(),

  // Line 7 — Other modifications to investment income
  // Includes §1411 NOL (negative), §62(a)(1) deductions (negative), other items
  // Form 8960 line 7
  line7_other_modifications: z.number().optional(),

  // Part II: Investment Expenses allocable to NII

  // Line 9a — Investment interest expense (Schedule A line 9 / Form 4952)
  // IRC §163(d); Form 8960 line 9a
  line9a_investment_interest_expense: z.number().nonnegative().optional(),

  // Line 9b — State, local, and foreign income taxes allocable to NII
  // IRC §164; Form 8960 line 9b
  line9b_state_local_tax: z.number().nonnegative().optional(),

  // Line 10 — Additional deductions/modifications allocable to NII
  // IRC §1411(c)(1)(B); Form 8960 line 10
  line10_additional_modifications: z.number().nonnegative().optional(),
});

type Form8960Input = z.infer<typeof inputSchema>;

// ─── Pure helpers ──────────────────────────────────────────────────────────────

// MAGI threshold by filing status
// Form 8960 line 14; not indexed for inflation (TY2025)
function threshold(status: FilingStatus): number {
  if (status === FilingStatus.MFJ) return THRESHOLD_MFJ;
  if (status === FilingStatus.QSS) return THRESHOLD_MFJ;
  if (status === FilingStatus.MFS) return THRESHOLD_MFS;
  return THRESHOLD_OTHER; // Single, HOH
}

// Part I, Line 8: Total NII gross (sum of lines 1–7)
// Lines 4b, 5b, 7 can be negative (adjustments/exclusions)
// Form 8960 line 8
function niiGross(input: Form8960Input): number {
  return (
    (input.line1_taxable_interest ?? 0) +
    (input.line2_ordinary_dividends ?? 0) +
    (input.line3_annuities ?? 0) +
    (input.line4a_passive_income ?? 0) +
    (input.line4b_rental_net ?? 0) +
    (input.line5a_net_gain ?? 0) +
    (input.line5b_net_gain_adjustment ?? 0) +
    (input.line7_other_modifications ?? 0)
  );
}

// Part II, Line 11: Total investment expenses allocable to NII
// Form 8960 line 11
function totalDeductions(input: Form8960Input): number {
  return (
    (input.line9a_investment_interest_expense ?? 0) +
    (input.line9b_state_local_tax ?? 0) +
    (input.line10_additional_modifications ?? 0)
  );
}

// Part III, Line 12: Net Investment Income = max(0, gross − deductions)
// Form 8960 line 12
function netInvestmentIncome(gross: number, deductions: number): number {
  return Math.max(0, gross - deductions);
}

// Part III, Line 15: MAGI excess above threshold = max(0, MAGI − threshold)
// Form 8960 line 15
function magiExcess(magi: number, limit: number): number {
  return Math.max(0, magi - limit);
}

// Part III, Line 16: Lesser of NII (line 12) or MAGI excess (line 15)
// Form 8960 line 16
function taxableBase(nii: number, excess: number): number {
  return Math.min(nii, excess);
}

// Round to cents to avoid IEEE-754 floating point drift
function toCents(n: number): number {
  return Math.round(n * 100) / 100;
}

// Part III, Line 17: Net Investment Income Tax = line16 × 3.8%
// Form 8960 line 17 → Schedule 2 line 12
function niitTax(base: number): number {
  return toCents(base * NIIT_RATE);
}

// Route NIIT to schedule2 line 12 when > 0
function schedule2Output(niit: number): NodeOutput[] {
  if (niit <= 0) return [];
  return [output(schedule2, { line12_niit: niit })];
}

// ─── Node class ───────────────────────────────────────────────────────────────

class Form8960Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "form8960";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule2]);

  compute(rawInput: Form8960Input): NodeResult {
    const input = inputSchema.parse(rawInput);

    const limit = threshold(input.filing_status);
    const excess = magiExcess(input.magi, limit);

    // Early return: MAGI at or below threshold → no NIIT
    if (excess <= 0) return { outputs: [] };

    // Part I
    const gross = niiGross(input);

    // Part II
    const deductions = totalDeductions(input);

    // Part III
    const nii = netInvestmentIncome(gross, deductions);

    // Early return: no NII → no NIIT
    if (nii <= 0) return { outputs: [] };

    const base = taxableBase(nii, excess);
    const niit = niitTax(base);

    return { outputs: schedule2Output(niit) };
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const form8960 = new Form8960Node();

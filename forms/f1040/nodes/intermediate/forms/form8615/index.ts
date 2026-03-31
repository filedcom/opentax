import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../../core/types/tax-node.ts";
import { TaxNode, output } from "../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../core/types/output-nodes.ts";
import { FilingStatus, filingStatusSchema } from "../../../types.ts";
import { schedule2 } from "../../aggregation/schedule2/index.ts";
import type { NodeContext } from "../../../../../../core/types/node-context.ts";

// ─── Constants — TY2025 ───────────────────────────────────────────────────────

// IRC §1(g)(4)(A)(ii)(I); Rev. Proc. 2024-40 — TY2025 unearned income threshold.
// Net unearned income above this amount is taxed at the parent's rate.
const UNEARNED_INCOME_THRESHOLD = 2_600;

// IRC §1(g)(4)(A)(ii)(II) — standard deduction floor for computing net unearned income.
// (Greater of $1,300 or earned income + $450, but the floor is $1,300.)
const STANDARD_DEDUCTION_FLOOR = 1_300;

// TY2025 tax brackets for computing tax at parent's rate
// Source: Rev. Proc. 2024-40, §3.01 (Married Filing Jointly / QSS)
const MFJ_BRACKETS: ReadonlyArray<{ over: number; upTo: number; rate: number; base: number }> = [
  { over: 0,       upTo: 23_850,   rate: 0.10, base: 0 },
  { over: 23_850,  upTo: 96_950,   rate: 0.12, base: 2_385 },
  { over: 96_950,  upTo: 206_700,  rate: 0.22, base: 11_157 },
  { over: 206_700, upTo: 394_600,  rate: 0.24, base: 35_302 },
  { over: 394_600, upTo: 501_050,  rate: 0.32, base: 80_398 },
  { over: 501_050, upTo: 751_600,  rate: 0.35, base: 114_462 },
  { over: 751_600, upTo: Infinity, rate: 0.37, base: 202_154.50 },
];

// Single / HOH / QSS brackets
const SINGLE_BRACKETS: ReadonlyArray<{ over: number; upTo: number; rate: number; base: number }> = [
  { over: 0,       upTo: 11_925,   rate: 0.10, base: 0 },
  { over: 11_925,  upTo: 48_475,   rate: 0.12, base: 1_192.50 },
  { over: 48_475,  upTo: 103_350,  rate: 0.22, base: 5_578.50 },
  { over: 103_350, upTo: 197_300,  rate: 0.24, base: 17_651 },
  { over: 197_300, upTo: 250_525,  rate: 0.32, base: 40_199 },
  { over: 250_525, upTo: 626_350,  rate: 0.35, base: 57_231 },
  { over: 626_350, upTo: Infinity, rate: 0.37, base: 188_769.75 },
];

// MFS brackets
const MFS_BRACKETS: ReadonlyArray<{ over: number; upTo: number; rate: number; base: number }> = [
  { over: 0,       upTo: 11_925,   rate: 0.10, base: 0 },
  { over: 11_925,  upTo: 48_475,   rate: 0.12, base: 1_192.50 },
  { over: 48_475,  upTo: 103_350,  rate: 0.22, base: 5_578.50 },
  { over: 103_350, upTo: 197_300,  rate: 0.24, base: 17_651 },
  { over: 197_300, upTo: 250_525,  rate: 0.32, base: 40_199 },
  { over: 250_525, upTo: 375_800,  rate: 0.35, base: 57_231 },
  { over: 375_800, upTo: Infinity, rate: 0.37, base: 101_077.25 },
];

// ─── Schema ───────────────────────────────────────────────────────────────────

// Form 8615 — Tax for Certain Children Who Have Unearned Income
// IRC §1(g); TY2025 instructions.
//
// The "kiddie tax" applies when:
//   - Child is under age 19 (or under 24 if full-time student), AND
//   - Child has net unearned income above $2,600 (TY2025), AND
//   - At least one parent was alive at year end
//
// Net unearned income above the threshold is taxed at the parent's marginal rate.

export const inputSchema = z.object({
  // Child's net unearned income (Form 8615 line 6).
  // = gross unearned income − $1,300 − additional $1,300 standard deduction
  // IRC §1(g)(4)(A)(ii)
  // Provided pre-computed (the engine does not derive the $1,300 floors).
  net_unearned_income: z.number().nonnegative().optional(),

  // Parent's taxable income (Form 8615 line 7).
  // Used as the base for computing tax at parent's rate.
  parent_taxable_income: z.number().nonnegative().optional(),

  // Parent's filing status (determines which bracket table to use).
  parent_filing_status: filingStatusSchema.optional(),

  // Parent's regular tax liability (Form 8615 line 8).
  // Tax on parent's taxable income alone (before adding child's NUI).
  parent_tax: z.number().nonnegative().optional(),
});

type Form8615Input = z.infer<typeof inputSchema>;

// ─── Pure helpers ─────────────────────────────────────────────────────────────

type Bracket = { over: number; upTo: number; rate: number; base: number };

// Select the bracket table for the parent's filing status.
function bracketsForStatus(
  status: FilingStatus | undefined,
): ReadonlyArray<Bracket> {
  if (status === FilingStatus.MFJ || status === FilingStatus.QSS) {
    return MFJ_BRACKETS;
  }
  if (status === FilingStatus.MFS) {
    return MFS_BRACKETS;
  }
  return SINGLE_BRACKETS;
}

// Compute regular income tax from a bracket table.
function taxFromBrackets(income: number, brackets: ReadonlyArray<Bracket>): number {
  if (income <= 0) return 0;
  const bracket = [...brackets].reverse().find((b) => income > b.over);
  if (!bracket) return 0;
  return bracket.base + (income - bracket.over) * bracket.rate;
}

// Net unearned income subject to kiddie tax (amounts above threshold).
// Form 8615 line 6.
function taxableNUI(nui: number): number {
  return Math.max(0, nui - UNEARNED_INCOME_THRESHOLD);
}

// Kiddie tax: tax on (parent_income + taxable_nui) − parent_tax.
// Form 8615 line 13 / line 15.
// IRC §1(g)(1)
function kiddietax(
  parentIncome: number,
  taxableNui: number,
  parentTax: number,
  brackets: ReadonlyArray<Bracket>,
): number {
  if (taxableNui <= 0) return 0;
  const combinedTax = taxFromBrackets(parentIncome + taxableNui, brackets);
  const incrementalTax = combinedTax - parentTax;
  return Math.max(0, incrementalTax);
}

// ─── Node class ───────────────────────────────────────────────────────────────

class Form8615Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "form8615";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule2]);

  compute(_ctx: NodeContext, rawInput: Form8615Input): NodeResult {
    const input = inputSchema.parse(rawInput);

    const nui = input.net_unearned_income ?? 0;
    const taxableNui = taxableNUI(nui);

    // No unearned income above threshold → no kiddie tax
    if (taxableNui === 0) {
      return { outputs: [] };
    }

    const parentIncome = input.parent_taxable_income ?? 0;
    const parentTax = input.parent_tax ?? 0;
    const brackets = bracketsForStatus(input.parent_filing_status);

    const kTax = kiddietax(parentIncome, taxableNui, parentTax, brackets);

    if (kTax <= 0) {
      return { outputs: [] };
    }

    const outputs: NodeOutput[] = [
      output(schedule2, { line17d_kiddie_tax: kTax }),
    ];

    return { outputs };
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const form8615 = new Form8615Node();

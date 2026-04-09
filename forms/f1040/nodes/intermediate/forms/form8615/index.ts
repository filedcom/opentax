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
import { CONFIG_BY_YEAR } from "../../../config/index.ts";

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
  cfg: import("../../../config/index.ts").F1040Config,
): ReadonlyArray<Bracket> {
  if (status === FilingStatus.MFJ || status === FilingStatus.QSS) {
    return cfg.bracketsMfj;
  }
  if (status === FilingStatus.MFS) {
    return cfg.bracketsMfs;
  }
  return cfg.bracketsSingle;
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
function taxableNUI(nui: number, threshold: number): number {
  return Math.max(0, nui - threshold);
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

  compute(ctx: NodeContext, rawInput: Form8615Input): NodeResult {
    const cfg = CONFIG_BY_YEAR[ctx.taxYear];
    if (!cfg) throw new Error(`No f1040 config for year ${ctx.taxYear}`);
    const input = inputSchema.parse(rawInput);

    const nui = input.net_unearned_income ?? 0;
    const taxableNui = taxableNUI(nui, cfg.kiddieUnearnedIncomeThreshold);

    // No unearned income above threshold → no kiddie tax
    if (taxableNui === 0) {
      return { outputs: [] };
    }

    const parentIncome = input.parent_taxable_income ?? 0;
    const parentTax = input.parent_tax ?? 0;
    const brackets = bracketsForStatus(input.parent_filing_status, cfg);

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

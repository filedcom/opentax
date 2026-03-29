import { z } from "zod";
import type { NodeOutput, NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { schedule3 } from "../../intermediate/schedule3/index.ts";

// ─── Enums ────────────────────────────────────────────────────────────────────

// IRC §904 — separate credit limitation computed per income category
export enum IncomeCategory {
  // Passive income (dividends, interest, rents, royalties) — most 1099 sources
  // IRC §904(d)(1)(A)
  Passive = "passive",
  // General category — wages, business income from foreign employer
  // IRC §904(d)(1)(B)
  General = "general",
  // Section 951A (GILTI) — global intangible low-taxed income
  Section951A = "section_951a",
  // Foreign branch category income — IRC §904(d)(1)(B)
  Branch = "branch",
  // Certain income re-sourced by treaty — IRC §904(d)(6)
  Treaty = "treaty",
  // Section 901(j) income — sanctioned countries
  Section901j = "section_901j",
}

// Filing status — determines de minimis threshold (applied upstream, carried for context)
export enum FilingStatus {
  Single = "single",
  MFJ = "mfj",
  MFS = "mfs",
  HOH = "hoh",
  QSS = "qss",
}

// ─── Schema ───────────────────────────────────────────────────────────────────

export const inputSchema = z.object({
  // Foreign taxes paid or accrued (Part II) — routed here from f1099div/f1099int
  // when total exceeds the de minimis threshold ($300 single / $600 MFJ)
  // IRC §901; Form 1116 Part II
  foreign_tax_paid: z.number().nonnegative(),

  // Gross foreign source income in the applicable category (Part I, Line 1a)
  // IRC §904(d)
  foreign_income: z.number().nonnegative(),

  // Worldwide gross income from all sources (Part I, Line 3e)
  // Used as the denominator of the FTC limitation fraction
  // IRC §904(a)
  total_income: z.number().nonnegative(),

  // Regular US tax liability before credits (Part III, Line 20)
  // = Form 1040 line 16, minus AMT allocable to Form 4972 income
  // IRC §904(a); does NOT include NIIT (§1411)
  us_tax_before_credits: z.number().nonnegative(),

  // Income category — separate Form 1116 must be filed per category
  // IRC §904(d)
  income_category: z.nativeEnum(IncomeCategory),

  // Filing status — drives de minimis threshold (applied upstream)
  filing_status: z.nativeEnum(FilingStatus),
});

type Form1116Input = z.infer<typeof inputSchema>;

// ─── Pure Helper Functions ────────────────────────────────────────────────────

// Part I, Line 3f — limitation fraction = foreign_income / total_income
// Capped at 1.0 per IRC §904(a); treated as 1.0 if total_income is zero to avoid
// division by zero (degenerate case where all income is foreign)
// IRC §904(a)
function limitationFraction(input: Form1116Input): number {
  if (input.total_income <= 0) {
    return input.foreign_income > 0 ? 1.0 : 0;
  }
  return Math.min(1.0, input.foreign_income / input.total_income);
}

// Part III, Line 21 — FTC limitation = us_tax × fraction
// IRC §904(a)
function ftcLimit(input: Form1116Input): number {
  return input.us_tax_before_credits * limitationFraction(input);
}

// Part III, Line 24 — allowed credit = min(foreign_taxes_paid, ftc_limit)
// IRC §904(a)
function allowedCredit(input: Form1116Input): number {
  return Math.min(input.foreign_tax_paid, ftcLimit(input));
}

// Route allowed credit → Schedule 3, Part I, Line 1
// Only emit when credit > 0
function schedule3Output(credit: number): NodeOutput[] {
  if (credit <= 0) return [];
  return [{ nodeType: schedule3.nodeType, input: { line1_foreign_tax_credit: credit } }];
}

// ─── Node Class ───────────────────────────────────────────────────────────────

class Form1116Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "form_1116";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule3]);

  compute(rawInput: Form1116Input): NodeResult {
    const input = inputSchema.parse(rawInput);

    // No foreign income or no taxes paid → no credit possible
    if (input.foreign_income <= 0 || input.foreign_tax_paid <= 0) {
      return { outputs: [] };
    }

    const credit = allowedCredit(input);

    return { outputs: schedule3Output(credit) };
  }
}

// ─── Singleton Export ─────────────────────────────────────────────────────────

export const form1116 = new Form1116Node();

// Re-export the original name expected by upstream nodes and registry
export { form1116 as form_1116 };

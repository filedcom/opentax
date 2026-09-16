import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../../core/types/tax-node.ts";
import { TaxNode, output } from "../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../core/types/output-nodes.ts";
import { schedule3 } from "../../aggregation/schedule3/index.ts";
import { form6251 } from "../form6251/index.ts";
import type { NodeContext } from "../../../../../../core/types/node-context.ts";

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

// Several feeders (f1099int, f1099div, the K-1 nodes, fec) can each deposit their
// own share, which the executor accumulates as an array. Declaring those fields
// accumulable keeps the Zod parse alive; sumField collapses them to a scalar.
const accumulable = <T extends z.ZodTypeAny>(schema: T) =>
  z.union([schema, z.array(schema)]);

export const inputSchema = z.object({
  // Foreign taxes paid or accrued (Part II) — routed here from f1099div/f1099int
  // when total exceeds the de minimis threshold ($300 single / $600 MFJ), and
  // from fec at any amount (§904(j) covers only 1099-reported passive income).
  // Optional because the §904 limitation inputs below reach this node on every
  // return; absent foreign tax there is simply no credit.
  // IRC §901; Form 1116 Part II
  foreign_tax_paid: accumulable(z.number().nonnegative()).optional(),

  // Gross foreign source income in the applicable category (Part I, Line 1a)
  // IRC §904(d). When absent, full-credit simplified mode is used (fraction = 1).
  foreign_income: accumulable(z.number().nonnegative()).optional(),

  // Worldwide gross income from all sources (Part I, Line 3e)
  // Used as the denominator of the FTC limitation fraction.
  // IRC §904(a). When absent, full-credit simplified mode is used (fraction = 1).
  total_income: z.number().nonnegative().optional(),

  // Regular US tax liability before credits (Part III, Line 20)
  // = Form 1040 line 16, minus AMT allocable to Form 4972 income
  // IRC §904(a); does NOT include NIIT (§1411).
  // When absent, no FTC limitation is applied (full credit).
  us_tax_before_credits: z.number().nonnegative().optional(),

  // Tentative minimum tax (Form 6251 Line 7) before AMTFTC.
  // Required to compute the AMT Foreign Tax Credit per IRC §59(a).
  // The AMT FTC limitation = TMT × (foreign_income / total_income), capped at TMT.
  // When omitted, no AMT FTC output is emitted.
  tentative_minimum_tax: z.number().nonnegative().optional(),

  // Income category — separate Form 1116 must be filed per category
  // IRC §904(d). Optional; defaults to passive.
  income_category: z.nativeEnum(IncomeCategory).optional(),

  // Filing status — drives de minimis threshold (applied upstream). Optional.
  filing_status: z.nativeEnum(FilingStatus).optional(),
});

type Form1116Input = z.infer<typeof inputSchema>;

// Accumulated fields collapsed to scalars, so the helpers below stay arithmetic.
type ResolvedInput = {
  foreign_tax_paid: number;
  foreign_income?: number;
  total_income?: number;
  us_tax_before_credits?: number;
  tentative_minimum_tax?: number;
};

// ─── Pure Helper Functions ────────────────────────────────────────────────────

function sumField(value: number | number[] | undefined): number | undefined {
  if (value === undefined) return undefined;
  if (Array.isArray(value)) return value.reduce((sum: number, n: number) => sum + n, 0);
  return value;
}

function resolve(input: Form1116Input): ResolvedInput {
  return {
    foreign_tax_paid: sumField(input.foreign_tax_paid) ?? 0,
    foreign_income: sumField(input.foreign_income),
    total_income: input.total_income,
    us_tax_before_credits: input.us_tax_before_credits,
    tentative_minimum_tax: input.tentative_minimum_tax,
  };
}

// Part I, Line 3f — limitation fraction = foreign_income / total_income
// When inputs are absent (simplified mode), returns 1.0 (full credit, no limitation).
// Capped at 1.0 per IRC §904(a).
// IRC §904(a)
function limitationFraction(input: ResolvedInput): number {
  const foreignIncome = input.foreign_income;
  const totalIncome = input.total_income;
  if (foreignIncome === undefined || totalIncome === undefined) return 1.0;
  if (totalIncome <= 0) return foreignIncome > 0 ? 1.0 : 0;
  return Math.min(1.0, foreignIncome / totalIncome);
}

// Part III, Line 21 — FTC limitation = us_tax × fraction
// When us_tax_before_credits is absent, no limitation is applied.
// IRC §904(a)
function ftcLimit(input: ResolvedInput): number {
  const usTax = input.us_tax_before_credits;
  if (usTax === undefined) return input.foreign_tax_paid; // no limitation → full credit
  return usTax * limitationFraction(input);
}

// Part III, Line 24 — allowed credit = min(foreign_taxes_paid, ftc_limit)
// IRC §904(a)
function allowedCredit(input: ResolvedInput): number {
  return Math.min(input.foreign_tax_paid, ftcLimit(input));
}

// Route allowed credit → Schedule 3, Part I, Line 1
// Only emit when credit > 0
function schedule3Output(credit: number): NodeOutput[] {
  if (credit <= 0) return [];
  return [output(schedule3, { line1_foreign_tax_credit: credit })];
}

// AMT FTC limitation (IRC §59(a), Form 6251 Line 8 instructions):
// AMT FTC limit = TMT × (foreign_income / total_income), capped at TMT.
// The limitation fraction mirrors the regular FTC fraction (IRC §904(a)) but
// applies against the tentative minimum tax rather than regular US tax.
function amtFtcLimit(tmt: number, fraction: number): number {
  return Math.min(tmt, tmt * fraction);
}

// AMT FTC allowed = min(foreign_taxes_paid, amtFtcLimit)
// Cannot reduce TMT below zero (enforced in form6251 computeNetTmt).
function allowedAmtFtc(input: ResolvedInput): number {
  const tmt = input.tentative_minimum_tax;
  if (tmt === undefined || tmt <= 0) return 0;
  const fraction = limitationFraction(input);
  const limit = amtFtcLimit(tmt, fraction);
  return Math.min(input.foreign_tax_paid, limit);
}

// Route AMT FTC → Form 6251 Line 8 (amtftc).
// Only emit when AMT FTC > 0.
function form6251Output(amtFtc: number): NodeOutput[] {
  if (amtFtc <= 0) return [];
  return [output(form6251, { amtftc: amtFtc })];
}

// ─── Node Class ───────────────────────────────────────────────────────────────

class Form1116Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "form_1116";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule3, form6251]);

  compute(_ctx: NodeContext, rawInput: Form1116Input): NodeResult {
    const input = resolve(inputSchema.parse(rawInput));

    // No taxes paid → no credit possible
    if (input.foreign_tax_paid <= 0) {
      return { outputs: [] };
    }
    // When foreign_income is explicitly zero, no credit (income-based guard)
    if (input.foreign_income !== undefined && input.foreign_income <= 0) {
      return { outputs: [] };
    }

    const credit = allowedCredit(input);
    const amtFtc = allowedAmtFtc(input);

    return {
      outputs: [
        ...schedule3Output(credit),
        ...form6251Output(amtFtc),
      ],
    };
  }
}

// ─── Singleton Export ─────────────────────────────────────────────────────────

export const form1116 = new Form1116Node();

// Re-export the original name expected by upstream nodes and registry
export { form1116 as form_1116 };

import { z } from "zod";
import type { NodeOutput, NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { schedule2 } from "../schedule2/index.ts";

// ─── Constants — TY2025 ───────────────────────────────────────────────────────

// IRC §72(t)(1) — standard early distribution additional tax rate
const EARLY_DIST_RATE = 0.10;
// IRC §72(t)(6) — SIMPLE IRA rate when distributed within first 2 years of participation
const SIMPLE_IRA_EARLY_RATE = 0.25;
// IRC §4973 — excess contribution excise tax rate (Parts III–VIII)
const EXCESS_CONTRIB_RATE = 0.06;
// IRC §4979 — Part II ESA/ABLE distribution penalty rate
const ESA_ABLE_RATE = 0.10;

// ─── Schema ───────────────────────────────────────────────────────────────────

export const inputSchema = z.object({
  // ── Part I: Early Distributions (line 1–4) ──────────────────────────────
  // Line 1: Early distributions includible in income (from f1099r, code 1)
  early_distribution: z.number().nonnegative().optional(),
  // Line 2: Exception amount (portion not subject to tax)
  early_distribution_exception: z.number().nonnegative().optional(),
  // Line 1 (25% rate): SIMPLE IRA early distribution within first 2 years (code S)
  simple_ira_early_distribution: z.number().nonnegative().optional(),

  // ── Part II: ESA/QTP/ABLE Distributions (line 5–8) ──────────────────────
  // Line 5: Taxable distributions from Coverdell ESA, QTP, or ABLE account
  esa_able_distribution: z.number().nonnegative().optional(),
  // Line 6: Exception amount for ESA/ABLE distributions
  esa_able_exception: z.number().nonnegative().optional(),

  // ── Part III: Excess Contributions to Traditional IRAs (line 9–17) ──────
  // Line 16: Total excess contributions to traditional IRAs
  excess_traditional_ira: z.number().nonnegative().optional(),
  // FMV of traditional IRAs on Dec 31, 2025 (caps the 6% tax base)
  traditional_ira_value: z.number().nonnegative().optional(),

  // ── Part IV: Excess Contributions to Roth IRAs (line 18–25) ─────────────
  // Line 24: Total excess contributions to Roth IRAs
  excess_roth_ira: z.number().nonnegative().optional(),
  // FMV of Roth IRAs on Dec 31, 2025 (caps the 6% tax base)
  roth_ira_value: z.number().nonnegative().optional(),

  // ── Part V: Excess Contributions to Coverdell ESAs (line 26–33) ─────────
  // Line 32: Total excess contributions to Coverdell ESAs
  excess_coverdell_esa: z.number().nonnegative().optional(),
  // FMV of Coverdell ESAs on Dec 31, 2025 (caps the 6% tax base)
  coverdell_esa_value: z.number().nonnegative().optional(),

  // ── Part VI: Excess Contributions to Archer MSAs (line 34–41) ───────────
  // Line 40: Total excess contributions to Archer MSAs
  excess_archer_msa: z.number().nonnegative().optional(),
  // FMV of Archer MSAs on Dec 31, 2025 (caps the 6% tax base)
  archer_msa_value: z.number().nonnegative().optional(),

  // ── Part VII: Excess Contributions to HSAs (line 42–49) ─────────────────
  // Line 48: Total excess contributions to HSAs
  excess_hsa: z.number().nonnegative().optional(),
  // FMV of HSAs on Dec 31, 2025 (caps the 6% tax base)
  hsa_value: z.number().nonnegative().optional(),

  // ── Part VIII: Excess Contributions to ABLE Accounts (line 50–51) ───────
  // Line 50: Excess contributions to ABLE account
  excess_able: z.number().nonnegative().optional(),
  // FMV of ABLE account on Dec 31, 2025 (caps the 6% tax base)
  able_value: z.number().nonnegative().optional(),
});

type Form5329Input = z.infer<typeof inputSchema>;

// ─── Pure Helper Functions ────────────────────────────────────────────────────

// Part I, Line 4: 10% additional tax on early distributions (non-SIMPLE IRA)
// IRC §72(t)(1); Form 5329 line 4 → Schedule 2 line 8
function partI_regularTax(input: Form5329Input): number {
  const dist = input.early_distribution ?? 0;
  if (dist <= 0) return 0;
  const exception = input.early_distribution_exception ?? 0;
  const netSubjectToTax = Math.max(0, dist - exception);
  return netSubjectToTax * EARLY_DIST_RATE;
}

// Part I, Line 4 (25%): Additional tax on SIMPLE IRA early distribution
// IRC §72(t)(6); applies when distribution within first 2 years of plan participation
function partI_simpleTax(input: Form5329Input): number {
  const dist = input.simple_ira_early_distribution ?? 0;
  if (dist <= 0) return 0;
  return dist * SIMPLE_IRA_EARLY_RATE;
}

// Part II, Line 8: 10% additional tax on taxable ESA/QTP/ABLE distributions
// IRC §530(d)(4), §529(c)(7); Form 5329 line 8 → Schedule 2 line 8
function partII_tax(input: Form5329Input): number {
  const dist = input.esa_able_distribution ?? 0;
  if (dist <= 0) return 0;
  const exception = input.esa_able_exception ?? 0;
  const netSubjectToTax = Math.max(0, dist - exception);
  return netSubjectToTax * ESA_ABLE_RATE;
}

// 6% excise on excess account contributions: min(excess, account_value) × 6%
// When account FMV not provided, use excess amount as the base (conservative default)
// IRC §4973; Form 5329 Parts III–VIII
function excessContribTax(excess: number, accountValue?: number): number {
  if (excess <= 0) return 0;
  const base = accountValue !== undefined ? Math.min(excess, accountValue) : excess;
  return base * EXCESS_CONTRIB_RATE;
}

// Part III, Line 17: 6% excise on excess traditional IRA contributions
// IRC §4973(a); Form 5329 line 17 → Schedule 2 line 8
function partIII_tax(input: Form5329Input): number {
  return excessContribTax(input.excess_traditional_ira ?? 0, input.traditional_ira_value);
}

// Part IV, Line 25: 6% excise on excess Roth IRA contributions
// IRC §4973(f); Form 5329 line 25 → Schedule 2 line 8
function partIV_tax(input: Form5329Input): number {
  return excessContribTax(input.excess_roth_ira ?? 0, input.roth_ira_value);
}

// Part V, Line 33: 6% excise on excess Coverdell ESA contributions
// IRC §4973(e); Form 5329 line 33 → Schedule 2 line 8
function partV_tax(input: Form5329Input): number {
  return excessContribTax(input.excess_coverdell_esa ?? 0, input.coverdell_esa_value);
}

// Part VI, Line 41: 6% excise on excess Archer MSA contributions
// IRC §4973(d); Form 5329 line 41 → Schedule 2 line 8
function partVI_tax(input: Form5329Input): number {
  return excessContribTax(input.excess_archer_msa ?? 0, input.archer_msa_value);
}

// Part VII, Line 49: 6% excise on excess HSA contributions
// IRC §4973(a)(2); Form 5329 line 49 → Schedule 2 line 8
function partVII_tax(input: Form5329Input): number {
  return excessContribTax(input.excess_hsa ?? 0, input.hsa_value);
}

// Part VIII, Line 51: 6% excise on excess ABLE account contributions
// IRC §4973(h); Form 5329 line 51 → Schedule 2 line 8
function partVIII_tax(input: Form5329Input): number {
  return excessContribTax(input.excess_able ?? 0, input.able_value);
}

// Total of all Form 5329 penalty taxes across all parts
function totalTax(input: Form5329Input): number {
  return (
    partI_regularTax(input) +
    partI_simpleTax(input) +
    partII_tax(input) +
    partIII_tax(input) +
    partIV_tax(input) +
    partV_tax(input) +
    partVI_tax(input) +
    partVII_tax(input) +
    partVIII_tax(input)
  );
}

// Route total Form 5329 tax to Schedule 2 line 8 when > 0
function schedule2Output(total: number): NodeOutput[] {
  if (total <= 0) return [];
  return [{ nodeType: schedule2.nodeType, input: { line8_form5329_tax: total } }];
}

// ─── Node class ───────────────────────────────────────────────────────────────

class Form5329Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "form5329";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule2]);

  compute(rawInput: Form5329Input): NodeResult {
    const input = inputSchema.parse(rawInput);
    const total = totalTax(input);
    return { outputs: schedule2Output(total) };
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const form5329 = new Form5329Node();

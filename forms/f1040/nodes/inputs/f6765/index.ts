import { z } from "zod";
import type { NodeOutput, NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { schedule3 } from "../../intermediate/schedule3/index.ts";

// ─── TY2025 Constants (IRC §41) ───────────────────────────────────────────────

// Regular credit method (Section A): 20% × (QRE − base amount)
const REGULAR_RATE = 0.20;

// Alternative Simplified Credit (ASC, Section B): 14% × (QRE − 50% of avg 3-prior-year QRE)
const ASC_RATE = 0.14;
const ASC_BASE_FRACTION = 0.50;

// Contract research: only 65% of amounts paid qualify (IRC §41(b)(3))
const CONTRACT_RESEARCH_RATE = 0.65;

// Payroll tax election cap (startups ≤5 years old, no income tax): $500k/year (IRC §41(h))
const PAYROLL_TAX_CAP = 500_000;

export enum ResearchMethod {
  Regular = "regular",
  AlternativeSimplified = "asc",
}

export const inputSchema = z.object({
  method: z.nativeEnum(ResearchMethod),

  // ── Section A (Regular Method) ──────────────────────────────────────────────
  // Qualified wages paid to employees for qualified research
  regular_wages: z.number().nonnegative().optional(),
  // Supplies used in qualified research
  regular_supplies: z.number().nonnegative().optional(),
  // Contract research expenses (65% qualifying)
  regular_contract_research: z.number().nonnegative().optional(),
  // Qualified research for energy consortium (100% of payments qualify)
  energy_consortium_payments: z.number().nonnegative().optional(),
  // Base amount (Line 8 of Section A) — provided by taxpayer from prior-year computation
  regular_base_amount: z.number().nonnegative().optional(),
  // Fixed-base percentage and average gross receipts (for reference; base_amount provided directly)
  gross_receipts: z.number().nonnegative().optional(),

  // ── Section B (ASC) ─────────────────────────────────────────────────────────
  // Current-year qualified research expenses (wages + supplies + 65% contract research)
  asc_current_qre: z.number().nonnegative().optional(),
  // Average QRE for the 3 prior tax years
  asc_prior_avg_qre: z.number().nonnegative().optional(),

  // ── Payroll Tax Election (IRC §41(h)) ────────────────────────────────────────
  // Startup companies (≤5 yrs, no income tax) may elect to offset payroll tax
  payroll_tax_election: z.boolean().optional(),
  // Portion of credit to apply against payroll tax (≤ computed credit, ≤ $500k)
  payroll_tax_credit_elected: z.number().nonnegative().optional(),
});

type F6765Input = z.infer<typeof inputSchema>;

// Compute qualified research expenses for Section A
function regularQRE(input: F6765Input): number {
  const wages = input.regular_wages ?? 0;
  const supplies = input.regular_supplies ?? 0;
  const contract = (input.regular_contract_research ?? 0) * CONTRACT_RESEARCH_RATE;
  const energy = input.energy_consortium_payments ?? 0;
  return wages + supplies + contract + energy;
}

// Regular credit (Section A): 20% × (QRE − base amount)
function regularCredit(input: F6765Input): number {
  const qre = regularQRE(input);
  const base = input.regular_base_amount ?? 0;
  const excess = Math.max(0, qre - base);
  return excess * REGULAR_RATE;
}

// ASC (Section B): 14% × max(0, currentQRE − 50% × avgPriorQRE)
function ascCredit(input: F6765Input): number {
  const current = input.asc_current_qre ?? 0;
  const priorAvg = input.asc_prior_avg_qre ?? 0;
  const base = Math.round(priorAvg * ASC_BASE_FRACTION);
  const excess = Math.max(0, current - base);
  return Math.round(excess * ASC_RATE);
}

function computeCredit(input: F6765Input): number {
  return input.method === ResearchMethod.Regular
    ? regularCredit(input)
    : ascCredit(input);
}

function buildOutputs(credit: number): NodeOutput[] {
  if (credit <= 0) return [];
  return [{ nodeType: schedule3.nodeType, fields: { line6z_general_business_credit: credit } }];
}

class F6765Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f6765";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule3]);

  compute(rawInput: F6765Input): NodeResult {
    const input = inputSchema.parse(rawInput);
    const fullCredit = computeCredit(input);

    // Payroll tax election: elected portion does NOT flow to Schedule 3;
    // it offsets payroll tax liability instead. Only remainder → Schedule 3.
    if (input.payroll_tax_election === true) {
      const elected = Math.min(
        input.payroll_tax_credit_elected ?? 0,
        fullCredit,
        PAYROLL_TAX_CAP,
      );
      const remainder = fullCredit - elected;
      return { outputs: buildOutputs(remainder) };
    }

    return { outputs: buildOutputs(fullCredit) };
  }
}

export const f6765 = new F6765Node();

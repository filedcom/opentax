import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import { TaxNode, output, type AtLeastOne } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { f1040 } from "../../outputs/f1040/index.ts";
import { schedule3 } from "../../intermediate/schedule3/index.ts";
import { filingStatusSchema } from "../../types.ts";

// ─── Schemas ─────────────────────────────────────────────────────────────────

// Per-child schema — one entry per eligible child on Part I / Part II
export const childSchema = z.object({
  // Qualified adoption expenses paid (Part II Line 5 — excluding employer-reimbursed amounts)
  qualified_expenses: z.number().nonnegative(),
  // Child with special needs determination by state/Indian tribal government (Part I Col d)
  special_needs: z.boolean(),
  // Total adoption credit claimed for this child in prior years (Part II Line 3)
  prior_year_credit: z.number().nonnegative().optional(),
  // Foreign adoption: adoption must be final before credit is allowed
  adoption_is_final: z.boolean().optional(),
  // Foreign child flag — requires adoption_is_final = true for credit
  is_foreign_child: z.boolean().optional(),
});

// Node input schema — flat input combining W-2 Box 12T and direct filer data
export const inputSchema = z.object({
  // Employer-provided adoption benefits from W-2 Box 12T (Part III Line 22)
  adoption_benefits: z.number().nonnegative().optional(),
  // Per-child data for Part I / Part II credit calculation
  children: z.array(childSchema).optional(),
  // Modified adjusted gross income — Line 7 (credit) and Line 25 (exclusion)
  magi: z.number().nonnegative().optional(),
  // Income tax liability for credit limit worksheet (Line 17)
  // If omitted, nonrefundable credit is not limited (treated as unconstrained)
  income_tax_liability: z.number().nonnegative().optional(),
  // Filing status — MFS generally cannot claim credit or exclusion
  filing_status: filingStatusSchema.optional(),
});

type ChildItem = z.infer<typeof childSchema>;
type Form8839Input = z.infer<typeof inputSchema>;

// ─── Pure helpers ─────────────────────────────────────────────────────────────

// Phase-out fraction for both Part II credit and Part III exclusion.
// Fraction = (MAGI - phaseOutStart) / phaseOutRange, clamped to [0, 1], rounded to 3 decimal places.
// IRC §23(b)(2); IRC §137(b)(2)
function phaseOutFraction(magi: number, phaseOutStart: number, phaseOutRange: number): number {
  if (magi <= phaseOutStart) return 0;
  const raw = (magi - phaseOutStart) / phaseOutRange;
  return Math.round(Math.min(1, raw) * 1000) / 1000;
}

// Returns true if this filer is blocked from claiming credit/exclusion due to MFS status.
// MFS filers cannot claim unless legally separated or living apart (we accept an exception
// flag; without it, MFS is blocked). IRC §23(f)(2); IRC §137(f)(2)
function isBlockedByMfs(input: Form8839Input): boolean {
  return input.filing_status === "mfs";
}

// Per-child credit before phase-out (Part II Lines 2-6).
// Special needs: full maxCreditPerChild minus prior year credit, regardless of expenses.
// Domestic/foreign: capped at min(MAX - prior, expenses).
function perChildBaseline(child: ChildItem, maxCreditPerChild: number): number {
  const prior = child.prior_year_credit ?? 0;
  const remaining = Math.max(0, maxCreditPerChild - prior);

  if (child.special_needs) {
    // Special needs: entitled to full remaining max even with $0 expenses
    return remaining;
  }

  // Foreign child without finalized adoption: no credit
  if (child.is_foreign_child && child.adoption_is_final !== true) {
    return 0;
  }

  return Math.min(remaining, child.qualified_expenses);
}

// Per-child credit after phase-out (Part II Line 11a).
function perChildAllowed(child: ChildItem, fraction: number, maxCreditPerChild: number): number {
  const baseline = perChildBaseline(child, maxCreditPerChild);
  return Math.round(baseline * (1 - fraction) * 100) / 100;
}

// Per-child refundable amount (Part II Line 11b): capped at maxRefundablePerChild per child.
function perChildRefundable(allowed: number, maxRefundablePerChild: number): number {
  return Math.min(allowed, maxRefundablePerChild);
}

// Total refundable credit across all children (Part II Line 13 → Form 1040 Line 30).
function totalRefundable(
  children: ChildItem[],
  fraction: number,
  maxCreditPerChild: number,
  maxRefundablePerChild: number,
): number {
  return children.reduce((sum, child) => {
    const allowed = perChildAllowed(child, fraction, maxCreditPerChild);
    return sum + perChildRefundable(allowed, maxRefundablePerChild);
  }, 0);
}

// Total credit across all children (Part II Line 12 = sum of Line 11a).
function totalCredit(
  children: ChildItem[],
  fraction: number,
  maxCreditPerChild: number,
): number {
  return children.reduce(
    (sum, child) => sum + perChildAllowed(child, fraction, maxCreditPerChild),
    0,
  );
}

// Nonrefundable credit = total credit minus refundable portion, then limited by tax liability.
// Part II Line 17 → Schedule 3 Line 6c.
function nonrefundableCredit(
  total: number,
  refundable: number,
  taxLiability: number | undefined,
): number {
  const raw = total - refundable;
  if (raw <= 0) return 0;
  // Credit limit worksheet: nonrefundable portion cannot exceed tax liability
  const limit = taxLiability ?? Infinity;
  return Math.min(raw, limit);
}

// Employer-provided adoption benefits excluded from income (Part III).
// Max exclusion maxCreditPerChild per child, subject to the same phase-out as the credit.
// Returns { excluded, taxable } pair.
function exclusionAmounts(
  adoptionBenefits: number,
  childCount: number,
  fraction: number,
  maxCreditPerChild: number,
): { excluded: number; taxable: number } {
  if (adoptionBenefits <= 0 || childCount <= 0) {
    return { excluded: 0, taxable: 0 };
  }

  const maxExclusion = maxCreditPerChild * childCount;
  const cappedBenefits = Math.min(adoptionBenefits, maxExclusion);

  // Phase-out applies to the excluded amount
  const excludedBeforePhaseOut = cappedBenefits;
  const excluded = Math.round(excludedBeforePhaseOut * (1 - fraction) * 100) / 100;
  const taxable = adoptionBenefits - excluded;

  return { excluded, taxable: Math.max(0, taxable) };
}

// Build credit outputs (Part II).
function creditOutputs(
  input: Form8839Input,
  fraction: number,
  maxCreditPerChild: number,
  maxRefundablePerChild: number,
): NodeOutput[] {
  const children = input.children ?? [];
  if (children.length === 0) return [];

  const refundable = totalRefundable(children, fraction, maxCreditPerChild, maxRefundablePerChild);
  const total = totalCredit(children, fraction, maxCreditPerChild);
  const nonrefundable = nonrefundableCredit(total, refundable, input.income_tax_liability);

  const outputs: NodeOutput[] = [];

  if (refundable > 0) {
    outputs.push(output(f1040, { line30_refundable_adoption: refundable }));
  }

  if (nonrefundable > 0) {
    outputs.push(output(schedule3, { line6c_adoption_credit: nonrefundable }));
  }

  return outputs;
}

// Build exclusion output (Part III) — taxable employer benefits on f1040 line 1f.
function exclusionOutputs(
  input: Form8839Input,
  fraction: number,
  maxCreditPerChild: number,
): NodeOutput[] {
  const benefits = input.adoption_benefits ?? 0;
  if (benefits <= 0) return [];

  const childCount = (input.children ?? []).length;
  const { taxable } = exclusionAmounts(benefits, childCount, fraction, maxCreditPerChild);

  if (taxable <= 0) return [];

  return [output(f1040, { line1f_taxable_adoption_benefits: Math.round(taxable * 100) / 100 })];
}

// Merge multiple f1040 outputs into one (avoid duplicate nodeType entries).
function mergeF1040Outputs(outputs: NodeOutput[]): NodeOutput[] {
  const f1040Outputs = outputs.filter((o) => o.nodeType === f1040.nodeType);
  const otherOutputs = outputs.filter((o) => o.nodeType !== f1040.nodeType);

  if (f1040Outputs.length === 0) return otherOutputs;

  const merged = f1040Outputs.reduce(
    (acc, o) => ({ ...acc, ...o.fields }),
    {} as Partial<z.infer<typeof f1040["inputSchema"]>>,
  );

  return [...otherOutputs, output(f1040, merged as AtLeastOne<z.infer<typeof f1040["inputSchema"]>>)];
}

// ─── Node class ───────────────────────────────────────────────────────────────

class Form8839Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "form8839";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule3, f1040]);

  // TY2025 — IRS Instructions for Form 8839 (Dec 8 2025) / Rev Proc 2024-40
  protected readonly maxCreditPerChild = 17280;
  protected readonly maxRefundablePerChild = 5000;
  protected readonly phaseOutStart = 259190;
  protected readonly phaseOutRange = 40000; // $259,190 to $299,190

  compute(rawInput: Form8839Input): NodeResult {
    const input = inputSchema.parse(rawInput);

    const children = input.children ?? [];
    const magi = input.magi ?? 0;

    // MFS filers cannot claim (without exception)
    if (isBlockedByMfs(input)) {
      return { outputs: [] };
    }

    const fraction = phaseOutFraction(magi, this.phaseOutStart, this.phaseOutRange);

    // If fully phased out, no credit or exclusion benefit
    if (fraction >= 1) {
      return { outputs: [] };
    }

    const normalized: Form8839Input = { ...input, children, magi };

    const outputs = mergeF1040Outputs([
      ...creditOutputs(normalized, fraction, this.maxCreditPerChild, this.maxRefundablePerChild),
      ...exclusionOutputs(normalized, fraction, this.maxCreditPerChild),
    ]);

    return { outputs };
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const form8839 = new Form8839Node();

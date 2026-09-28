import { z } from "zod";
import type { NodeResult } from "../../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../core/types/output-nodes.ts";
import { filingStatusSchema } from "../../../types.ts";
import type { NodeContext } from "../../../../../../core/types/node-context.ts";

// ─── Schemas ─────────────────────────────────────────────────────────────────

// Per-child schema — one entry per eligible child on Part I / Part II
export const filingDetailsSchema = z.object({
  first_name: z.string().min(1).max(20),
  last_name: z.string().min(1).max(35),
  birth_year: z.number().int().min(2008).max(2025),
  ssn: z.string().regex(/^\d{9}$/),
  finalization_date: z.string().regex(/^2025-\d{2}-\d{2}$/).refine(
    (value) =>
      !Number.isNaN(Date.parse(value)) &&
      new Date(value).toISOString().slice(0, 10) === value,
  ),
  expenses_paid_in_2025_confirmed: z.literal(true),
  no_employer_reimbursement_confirmed: z.literal(true),
});

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
  // Identifying and timing facts required to file the bounded TY2025 route.
  filing_details: filingDetailsSchema.optional(),
});

// Node input schema — flat input combining W-2 Box 12T and direct filer data
export const inputSchema = z.object({
  // Employer-provided adoption benefits from W-2 Box 12T (Part III Line 22)
  adoption_benefits: z.number().nonnegative().optional(),
  // Per-child data for Part I / Part II credit calculation
  children: z.array(childSchema).optional(),
  // Modified adjusted gross income — Line 7 (credit) and Line 25 (exclusion)
  magi: z.number().nonnegative().optional(),
  // Completed Credit Limit Worksheet line 5, entered on Form 8839 line 17.
  // Required when a nonrefundable current-year credit remains after line 13.
  credit_limit_worksheet_line5: z.number().nonnegative().optional(),
  // Filing status — MFS generally cannot claim credit or exclusion
  filing_status: filingStatusSchema.optional(),
});

type ChildItem = z.infer<typeof childSchema>;
export type Form8839Input = z.infer<typeof inputSchema>;

// ─── Pure helpers ─────────────────────────────────────────────────────────────

// Phase-out fraction for both Part II credit and Part III exclusion.
// Fraction = (MAGI - phaseOutStart) / phaseOutRange, clamped to [0, 1], rounded to 3 decimal places.
// IRC §23(b)(2); IRC §137(b)(2)
function phaseOutFraction(
  magi: number,
  phaseOutStart: number,
  phaseOutRange: number,
): number {
  if (magi <= phaseOutStart) return 0;
  const raw = (magi - phaseOutStart) / phaseOutRange;
  return Math.round(Math.min(1, raw) * 1000) / 1000;
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
function perChildAllowed(
  child: ChildItem,
  fraction: number,
  maxCreditPerChild: number,
): number {
  const baseline = perChildBaseline(child, maxCreditPerChild);
  const line10Phaseout = Math.round(baseline * fraction * 100) / 100;
  return Math.max(0, Math.round((baseline - line10Phaseout) * 100) / 100);
}

export function calculateForm8839Credit(input: Form8839Input) {
  if (input.magi === undefined) {
    throw new Error("Form 8839 credit needs sourced MAGI");
  }
  const fraction = phaseOutFraction(input.magi, 259_190, 40_000);
  const perChild = (input.children ?? []).map((child) => {
    const line2 = 17_280;
    const line3 = child.prior_year_credit ?? 0;
    const line4 = Math.max(0, line2 - line3);
    const line5 = child.qualified_expenses;
    const line6 = perChildBaseline(child, line2);
    const line10 = Math.round(line6 * fraction * 100) / 100;
    const line11a = perChildAllowed(child, fraction, line2);
    const line11b = Math.min(line11a, 5_000);
    return { line2, line3, line4, line5, line6, line10, line11a, line11b };
  });
  const line11c = perChild.reduce((sum, child) => sum + child.line11b, 0);
  const line12 = perChild.reduce((sum, child) => sum + child.line11a, 0);
  const line14 = Math.round((line12 - line11c) * 100) / 100;
  if (line14 > 0 && input.credit_limit_worksheet_line5 === undefined) {
    throw new Error(
      "Form 8839 nonrefundable credit needs Credit Limit Worksheet line 5",
    );
  }
  const line17 = input.credit_limit_worksheet_line5;
  if (line17 !== undefined && line17 > line14) {
    throw new Error(
      "Form 8839 Credit Limit Worksheet line 5 cannot exceed Form 8839 line 16",
    );
  }
  const line18 = Math.min(line14, line17 ?? 0);
  return { fraction, perChild, line11c, line12, line14, line17, line18 };
}

// The active filing route is closed until source documents and finalized-return
// facts can substantiate eligibility, expenses, MAGI, and credit capacity.
class Form8839Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "form8839";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([]);

  compute(_ctx: NodeContext, rawInput: Form8839Input): NodeResult {
    const input = inputSchema.parse(rawInput);
    if (
      (input.children?.length ?? 0) > 0 || (input.adoption_benefits ?? 0) > 0
    ) {
      throw new Error(
        "Form 8839 filing needs source-verified adoption eligibility, unreimbursed expenses, finalized-return MAGI, and credit-limit capacity",
      );
    }
    return { outputs: [] };
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const form8839 = new Form8839Node();

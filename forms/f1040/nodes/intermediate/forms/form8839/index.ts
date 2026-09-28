import { z } from "zod";
import type { NodeResult } from "../../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../core/types/output-nodes.ts";
import { filingStatusSchema } from "../../../types.ts";
import type { NodeContext } from "../../../../../../core/types/node-context.ts";

// ─── Schemas ─────────────────────────────────────────────────────────────────

const sourceDocumentIdSchema = z.string().min(1);
const dateSchema = z.string().regex(/^20\d{2}-\d{2}-\d{2}$/).refine(
  (value) =>
    !Number.isNaN(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value,
);

export const adoptionExpenseSchema = z.object({
  source_document_id: sourceDocumentIdSchema,
  paid_date: dateSchema,
  category: z.enum(["adoption_fee", "attorney_fee", "court_cost", "travel"]),
  payee: z.string().min(1),
  amount: z.number().nonnegative(),
  reimbursed_amount: z.number().nonnegative(),
  reimbursement_source_document_id: sourceDocumentIdSchema.optional(),
}).strict().superRefine((expense, ctx) => {
  if (expense.reimbursed_amount > expense.amount) {
    ctx.addIssue({ code: "custom", message: "reimbursement exceeds expense" });
  }
  if (
    expense.reimbursed_amount > 0 &&
    !expense.reimbursement_source_document_id
  ) {
    ctx.addIssue({
      code: "custom",
      message: "reimbursed expense needs reimbursement source document",
    });
  }
});

// One domestic adoption finalized in 2025, with record identifiers for
// independent review. Record identifiers do not themselves verify contents.
export const childSchema = z.object({
  first_name: z.string().min(1).max(20),
  last_name: z.string().min(1).max(35),
  birth_year: z.number().int().min(2008).max(2025),
  ssn: z.string().regex(/^\d{9}$/),
  final_decree: z.object({
    source_document_id: sourceDocumentIdSchema,
    finalization_date: dateSchema.refine((date) => date.startsWith("2025-")),
    issuing_jurisdiction: z.string().min(1),
    child_origin: z.literal("US"),
  }).strict(),
  special_needs_determination: z.object({
    source_document_id: sourceDocumentIdSchema,
    agency_name: z.string().min(1),
    determination_date: dateSchema,
  }).strict().optional(),
  expenses: z.array(adoptionExpenseSchema),
  prior_filed_form8839: z.object({
    source_document_id: sourceDocumentIdSchema,
    line3: z.number().nonnegative(),
    line6: z.number().nonnegative(),
  }).strict().optional(),
}).strict();

// Node input schema — flat input combining W-2 Box 12T and direct filer data
export const inputSchema = z.object({
  // Employer-provided adoption benefits from W-2 Box 12T (Part III Line 22)
  adoption_benefits: z.number().nonnegative().optional(),
  // Per-child data for Part I / Part II credit calculation
  children: z.array(childSchema).optional(),
  // Filing status — MFS generally cannot claim credit or exclusion
  filing_status: filingStatusSchema.optional(),
}).strict();

const amountSchema = z.number().finite().nonnegative();
const agiSchema = z.number().finite();

// A pre-adoption-credit return snapshot. These values must be produced by a
// future finalized-return stage, not supplied as Form 8839 source assertions.
export const finalizedReturnCreditContextSchema = z.object({
  form1040_line11b_agi: agiSchema,
  form1040_line18_tax_before_credits: amountSchema,
  magi_additions: z.object({
    puerto_rico_excluded_income: amountSchema,
    form2555_line45: amountSchema,
    form2555_line50: amountSchema,
    form4563_line15: amountSchema,
  }).strict(),
  child_credit_priority: z.discriminatedUnion("basis", [
    z.object({ basis: z.literal("form1040_line19"), amount: amountSchema }),
    z.object({
      basis: z.literal("schedule8812_worksheet_b_line14"),
      amount: amountSchema,
    }),
  ]),
  schedule3_priority: z.object({
    line1: amountSchema,
    line2: amountSchema,
    line3: amountSchema,
    line4: amountSchema,
    line5b: amountSchema,
    line6d: amountSchema,
    line6f: amountSchema,
    line6g: amountSchema,
    line6l: amountSchema,
    line6m: amountSchema,
  }).strict(),
}).strict();

type ChildItem = z.infer<typeof childSchema>;
export type Form8839Input = z.infer<typeof inputSchema>;
export type FinalizedReturnCreditContext = z.infer<
  typeof finalizedReturnCreditContextSchema
>;

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

function priorFiledCredit(child: ChildItem): number {
  return (child.prior_filed_form8839?.line3 ?? 0) +
    (child.prior_filed_form8839?.line6 ?? 0);
}

function qualifiedUnreimbursedExpenses(child: ChildItem): number {
  return child.expenses.reduce((total, expense) => {
    if (!/^202[45]-/.test(expense.paid_date)) {
      throw new Error(
        "Form 8839 domestic 2025-final adoption needs 2024/2025 payment dates",
      );
    }
    return total + expense.amount - expense.reimbursed_amount;
  }, 0);
}

// Per-child credit before phase-out (Part II Lines 2-6).
// A 2025-final U.S. special-needs adoption uses the remaining maximum even
// when the reviewed receipt ledger has no paid expenses.
function perChildBaseline(child: ChildItem, maxCreditPerChild: number): number {
  const prior = priorFiledCredit(child);
  const remaining = Math.max(0, maxCreditPerChild - prior);

  if (child.special_needs_determination) {
    return remaining;
  }
  return Math.min(remaining, qualifiedUnreimbursedExpenses(child));
}

// Per-child credit after phase-out (Part II Line 11a).
function perChildAllowed(
  line6: number,
  fraction: number,
): number {
  const line10Phaseout = Math.round(line6 * fraction * 100) / 100;
  return Math.max(0, Math.round((line6 - line10Phaseout) * 100) / 100);
}

function finalizedMagi(context: FinalizedReturnCreditContext): number {
  const additions = context.magi_additions;
  return context.form1040_line11b_agi +
    additions.puerto_rico_excluded_income + additions.form2555_line45 +
    additions.form2555_line50 + additions.form4563_line15;
}

function creditLimitWorksheetPriority(
  context: FinalizedReturnCreditContext,
): number {
  const lines = context.schedule3_priority;
  return context.child_credit_priority.amount + lines.line1 + lines.line2 +
    lines.line3 + lines.line4 + lines.line5b + lines.line6d + lines.line6f +
    lines.line6g + lines.line6l + lines.line6m;
}

export function prepareForm8839Credit(input: Form8839Input) {
  const sourced = inputSchema.parse(input);
  const perChild = (sourced.children ?? []).map((child) => {
    const line2 = 17_280;
    const line3 = priorFiledCredit(child);
    if (line3 > line2) {
      throw new Error(
        "Form 8839 prior-year credit cannot exceed the per-child maximum",
      );
    }
    const line4 = Math.max(0, line2 - line3);
    // 2025 instructions, Part II line 5: for a qualifying special-needs
    // adoption finalized in 2025, enter the remaining statutory maximum,
    // not the actual cash expenses paid.
    const line5 = child.special_needs_determination
      ? line4
      : qualifiedUnreimbursedExpenses(child);
    const line6 = perChildBaseline(child, line2);
    return { line2, line3, line4, line5, line6 };
  });
  return { perChild, adoptionBenefits: sourced.adoption_benefits ?? 0 };
}

export type PreparedForm8839Credit = ReturnType<typeof prepareForm8839Credit>;

export function settleForm8839Credit(
  prepared: PreparedForm8839Credit,
  finalizedReturn: FinalizedReturnCreditContext,
) {
  if (prepared.adoptionBenefits > 0) {
    throw new Error(
      "Form 8839 credit settlement needs Part III employer-benefit exclusion before MAGI",
    );
  }
  const context = finalizedReturnCreditContextSchema.parse(finalizedReturn);
  const magi = finalizedMagi(context);
  const fraction = phaseOutFraction(magi, 259_190, 40_000);
  const perChild = prepared.perChild.map((base) => {
    const line10 = Math.round(base.line6 * fraction * 100) / 100;
    const line11a = perChildAllowed(base.line6, fraction);
    const line11b = Math.min(line11a, 5_000);
    return { ...base, line10, line11a, line11b };
  });
  const line11c = perChild.reduce((sum, child) => sum + child.line11b, 0);
  const line12 = perChild.reduce((sum, child) => sum + child.line11a, 0);
  const line13 = line11c;
  const line14 = Math.round((line12 - line13) * 100) / 100;
  const priority = creditLimitWorksheetPriority(context);
  const capacity = Math.max(
    0,
    context.form1040_line18_tax_before_credits - priority,
  );
  const line17 = Math.min(line14, capacity);
  const line18 = line17;
  return {
    magi,
    fraction,
    perChild,
    line11c,
    line12,
    line13,
    line14,
    creditLimitWorksheet: {
      line1: line14,
      line2: context.form1040_line18_tax_before_credits,
      line3: priority,
      line4: capacity,
      line5: line17,
    },
    line17,
    line18,
  };
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

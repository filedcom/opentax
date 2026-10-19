import { z } from "zod";
import type { NodeResult } from "../../../../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../../../core/types/output-nodes.ts";
import { filingStatusSchema } from "../../../../../types.ts";
import { CONFIG_BY_YEAR } from "../../../../../config/index.ts";
import type { NodeContext } from "../../../../../../../../core/types/node-context.ts";

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

// One domestic adoption finalized in the return's tax year, with record
// identifiers for independent review. Record identifiers do not themselves
// verify contents.
export const childSchema = z.object({
  first_name: z.string().min(1).max(20),
  last_name: z.string().min(1).max(35),
  birth_year: z.number().int(),
  ssn: z.string().regex(/^\d{9}$/),
  final_decree: z.object({
    source_document_id: sourceDocumentIdSchema,
    finalization_date: dateSchema,
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

function yearOf(date: string): number {
  return Number(date.slice(0, 4));
}

/**
 * A domestic adoption's credit is claimed for the year its decree becomes
 * final; that year's Form 8839 amounts apply (IRC 23(a)(2)).
 */
export function adoptionFinalYear(input: Form8839Input): number | undefined {
  const years = new Set(
    (input.children ?? []).map((child) =>
      yearOf(child.final_decree.finalization_date)
    ),
  );
  if (years.size > 1) {
    throw new Error("Form 8839 children need one adoption-final tax year");
  }
  return [...years][0];
}

/** The adoption claimed is final in the return's tax year. */
export function assertForm8839TaxYear(
  input: Form8839Input,
  taxYear: number,
): void {
  const year = adoptionFinalYear(inputSchema.parse(input));
  if (year !== undefined && year !== taxYear) {
    throw new Error(
      `Form 8839 domestic adoption must become final in ${taxYear}`,
    );
  }
}

function adoptionAmounts(taxYear: number) {
  const cfg = CONFIG_BY_YEAR[taxYear];
  if (!cfg) throw new Error(`No Form 8839 amounts for TY${taxYear}`);
  return {
    maximum: cfg.adoptionCreditMax,
    refundable: cfg.adoptionCreditRefundableMax,
    phaseoutStart: cfg.adoptionPhaseoutStart,
    phaseoutRange: cfg.adoptionPhaseoutRange,
  };
}

// Expenses paid the year before the adoption is final, or in that year, are
// claimed for the final year (Form 8839 instructions, line 5).
function qualifiedUnreimbursedExpenses(
  child: ChildItem,
  finalYear: number,
): number {
  return child.expenses.reduce((total, expense) => {
    const paid = yearOf(expense.paid_date);
    if (paid !== finalYear - 1 && paid !== finalYear) {
      throw new Error(
        `Form 8839 domestic ${finalYear}-final adoption needs ${
          finalYear - 1
        }/${finalYear} payment dates`,
      );
    }
    return total + expense.amount - expense.reimbursed_amount;
  }, 0);
}

// Per-child credit before phase-out (Part II Lines 2-6).
// A U.S. special-needs adoption final in the tax year uses the remaining
// maximum even when the reviewed receipt ledger has no paid expenses.
function perChildBaseline(
  child: ChildItem,
  maxCreditPerChild: number,
  finalYear: number,
): number {
  const prior = priorFiledCredit(child);
  const remaining = Math.max(0, maxCreditPerChild - prior);

  if (child.special_needs_determination) {
    return remaining;
  }
  return Math.min(remaining, qualifiedUnreimbursedExpenses(child, finalYear));
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
  const taxYear = adoptionFinalYear(sourced);
  const perChild = (sourced.children ?? []).map((child) => {
    const finalYear = taxYear!;
    // Line 1 column (c): a child must be under 18 at the end of the year
    // unless physically or mentally unable to care for themselves.
    if (child.birth_year > finalYear || child.birth_year < finalYear - 17) {
      throw new Error(
        `Form 8839 child must be born from ${finalYear - 17} through ${finalYear}`,
      );
    }
    const line2 = adoptionAmounts(finalYear).maximum;
    const line3 = priorFiledCredit(child);
    if (line3 > line2) {
      throw new Error(
        "Form 8839 prior-year credit cannot exceed the per-child maximum",
      );
    }
    const line4 = Math.max(0, line2 - line3);
    // Instructions, Part II line 5: for a qualifying special-needs adoption
    // final in the tax year, enter the remaining statutory maximum, not the
    // actual cash expenses paid.
    const line5 = child.special_needs_determination
      ? line4
      : qualifiedUnreimbursedExpenses(child, finalYear);
    const line6 = perChildBaseline(child, line2, finalYear);
    return { line2, line3, line4, line5, line6 };
  });
  return {
    taxYear,
    perChild,
    adoptionBenefits: sourced.adoption_benefits ?? 0,
  };
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
  const amounts = prepared.taxYear === undefined
    ? undefined
    : adoptionAmounts(prepared.taxYear);
  const fraction = amounts
    ? phaseOutFraction(magi, amounts.phaseoutStart, amounts.phaseoutRange)
    : 0;
  const perChild = prepared.perChild.map((base) => {
    const line10 = Math.round(base.line6 * fraction * 100) / 100;
    const line11a = perChildAllowed(base.line6, fraction);
    const line11b = Math.min(line11a, amounts!.refundable);
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
    taxYear: prepared.taxYear,
    phaseoutStart: amounts?.phaseoutStart,
    phaseoutEnd: amounts && amounts.phaseoutStart + amounts.phaseoutRange,
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
        "Form 8839 filing needs reviewed adoption evidence and late return credit settlement",
      );
    }
    return { outputs: [] };
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const form8839 = new Form8839Node();

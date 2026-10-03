import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import { output, TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { agi_aggregator } from "../../intermediate/aggregation/agi_aggregator/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// TY2025 — Form 1098-E: Student Loan Interest Statement
// Deduction flows to Schedule 1 Part II line 21 through the AGI aggregator.
// IRC §221: student loan interest deduction, capped at $2,500.
// The AGI aggregator applies the MAGI phaseout and sends the final amount to
// Schedule 1 and Form 1040.

// ── Constants ─────────────────────────────────────────────────────────────────

const STUDENT_LOAN_INTEREST_CAP = 2_500; // IRC §221(b)(1)

// ── Schemas ───────────────────────────────────────────────────────────────────

export const itemSchema = z.object({
  // Box 1 — Student loan interest received by lender
  box1_student_loan_interest: z.number().nonnegative(),
  // Box 2 — If checked, box 1 does NOT include loan origination fees paid before September 1, 2004
  // IRC §221(d)(2): origination fees paid before 9/1/2004 are separately deductible as interest
  // when this box is checked, taxpayer may have additional deductible interest not captured in box1
  box2_origination_fees_excluded: z.boolean().optional().describe(
    "If checked, box 1 does not include loan origination fees paid before September 1, 2004",
  ),
  // Copy B identifies the lender and borrower; the account box is optional
  // for one account but required by the issuer for multiple accounts.
  lender_name: z.string().trim().min(1).optional(),
  lender_tin: z.string().regex(/^\d{2}-?\d{7}$/).optional(),
  borrower_tin: z.string().regex(
    /^(?:\d{3}-?\d{2}-?\d{4}|[Xx*]{3}-?[Xx*]{2}-?\d{4})$/,
  ).optional(),
  borrower_name: z.string().trim().min(1).optional(),
  borrower_owner_review_reference: z.string().trim().min(1).optional(),
  account_number: z.string().trim().min(1).optional(),
  source_document_reference: z.string().trim().min(1).optional(),
});

export const inputSchema = z.object({
  f1098es: z.array(itemSchema).min(1),
}).superRefine(({ f1098es }, ctx) => {
  for (const [index, item] of f1098es.entries()) {
    if (item.box1_student_loan_interest <= 0) continue;
    for (const prior of f1098es.slice(0, index)) {
      if (prior.box1_student_loan_interest <= 0) continue;
      const lender = item.lender_tin?.replace(/\D/g, "");
      const priorLender = prior.lender_tin?.replace(/\D/g, "");
      const lenderName = item.lender_name?.trim().toLowerCase();
      const priorLenderName = prior.lender_name?.trim().toLowerCase();
      const borrower = item.borrower_tin?.replace(/\D/g, "");
      const priorBorrower = prior.borrower_tin?.replace(/\D/g, "");
      if (
        !borrower || borrower !== priorBorrower ||
        (lender && priorLender
          ? lender !== priorLender
          : !lenderName || lenderName !== priorLenderName)
      ) continue;
      if (
        item.source_document_reference &&
        item.source_document_reference === prior.source_document_reference
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["f1098es", index],
          message: "1098-E repeats the same issued lender statement",
        });
      }
      if (
        (!item.account_number && !item.source_document_reference) ||
        (!prior.account_number && !prior.source_document_reference)
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["f1098es", index],
          message:
            "1098-E copies from one lender and borrower need distinct accounts or issued references",
        });
      }
    }
  }
});

type F1098EItem = z.infer<typeof itemSchema>;
type F1098EItems = F1098EItem[];

// ── Pure helpers ──────────────────────────────────────────────────────────────

// Note: box2_origination_fees_excluded is schema-only — no compute adjustment needed.
// When box 2 is checked, box1 already EXCLUDES pre-2004 origination fees, meaning
// the taxpayer may have additional deductible interest the engine cannot recover
// (the fee amount is not reported anywhere on the form). The field is captured in
// the schema for user awareness and potential future enrichment; the deduction here
// is correctly based solely on box1_student_loan_interest as reported.
function totalInterest(items: F1098EItems): number {
  return items.reduce((sum, item) => sum + item.box1_student_loan_interest, 0);
}

function allowedDeduction(items: F1098EItems): number {
  return Math.min(totalInterest(items), STUDENT_LOAN_INTEREST_CAP);
}

function agiOutput(items: F1098EItems): NodeOutput[] {
  const deduction = allowedDeduction(items);
  if (deduction === 0) return [];
  return [output(agi_aggregator, { line21_student_loan_interest: deduction })];
}

// ── Node class ────────────────────────────────────────────────────────────────

class F1098ENode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f1098e";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([agi_aggregator]);

  compute(_ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
    const parsed = inputSchema.parse(input);
    const outputs: NodeOutput[] = [
      ...agiOutput(parsed.f1098es),
    ];
    return { outputs };
  }
}

// ── Singleton export ──────────────────────────────────────────────────────────

export const f1098e = new F1098ENode();

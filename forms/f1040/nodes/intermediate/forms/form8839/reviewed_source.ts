import { z } from "zod";
import { FilingStatus } from "../../../types.ts";
import { type Form8839Input, inputSchema } from "./index.ts";

const documentId = z.string().trim().min(1);
const sha256 = z.string().regex(/^[a-f0-9]{64}$/);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value;
});
const positiveWholeDollar = z.number().refine(
  (value) => Number.isSafeInteger(value) && value > 0,
);

// A reviewer's structured transcription of identified documents, not proof
// that this program obtained the bytes or authenticated their contents.
export const reviewedDomestic8839SourceSchema = z.object({
  reviewed_by: z.string().trim().min(1),
  reviewed_on: date,
  adoption_case_reference: documentId,
  decree: z.object({
    source_document_id: documentId,
    document_sha256: sha256,
    child_first_name: z.string().trim().min(1),
    child_last_name: z.string().trim().min(1),
    child_ssn: z.string().regex(/^\d{9}$/),
    finalization_date: date,
    issuing_jurisdiction: z.string().trim().min(1),
    child_origin: z.literal("US"),
    taxpayer_named_as_adoptive_parent_confirmed: z.literal(true),
  }).strict(),
  reviewed_facts: z.object({
    child_us_citizen_or_resident_when_effort_began_confirmed: z.literal(true),
    child_under_18_on_2025_12_31_confirmed: z.literal(true),
    child_not_taxpayers_spouses_child_confirmed: z.literal(true),
    no_other_nonspouse_taxpayer_claim_confirmed: z.literal(true),
    no_prior_form8839_claim_for_child_confirmed: z.literal(true),
    no_employer_adoption_benefits_confirmed: z.literal(true),
    no_government_or_other_reimbursement_confirmed: z.literal(true),
    no_other_federal_credit_or_deduction_for_expenses_confirmed: z.literal(
      true,
    ),
    no_surrogacy_or_illegal_expenses_confirmed: z.literal(true),
  }).strict(),
  expenses: z.array(
    z.object({
      source_document_id: documentId,
      receipt_sha256: sha256,
      payment_proof_document_id: documentId,
      payment_proof_sha256: sha256,
      paid_date: date,
      category: z.enum([
        "adoption_fee",
        "attorney_fee",
        "court_cost",
        "travel",
      ]),
      payee: z.string().trim().min(1),
      amount: positiveWholeDollar,
      directly_related_to_legal_adoption_confirmed: z.literal(true),
    }).strict(),
  ).min(1),
}).strict();

export type ReviewedDomestic8839Source = z.infer<
  typeof reviewedDomestic8839SourceSchema
>;

/**
 * Preflight only. It does not verify document bytes, authenticate a decree,
 * supply return-wide MAGI, or make Form 8839 fileable.
 */
export function assertReviewedDomestic8839Source(
  rawInput: Form8839Input,
  rawReview: unknown,
): void {
  const input = inputSchema.parse(rawInput);
  const review = reviewedDomestic8839SourceSchema.parse(rawReview);
  if (
    input.filing_status !== FilingStatus.Single ||
    (input.adoption_benefits ?? 0) !== 0 ||
    input.children?.length !== 1
  ) {
    throw new Error(
      "Form 8839 reviewed route requires one single-filer child without employer benefits",
    );
  }
  const child = input.children?.[0];
  if (
    !child || child.special_needs_determination || child.prior_filed_form8839 ||
    child.birth_year < 2008 || child.expenses.length === 0 ||
    review.reviewed_on < child.final_decree.finalization_date
  ) {
    throw new Error(
      "Form 8839 reviewed route excludes special needs, prior claims, and unsourced child timing",
    );
  }
  const decree = review.decree;
  if (
    decree.source_document_id !== child.final_decree.source_document_id ||
    decree.child_first_name !== child.first_name ||
    decree.child_last_name !== child.last_name ||
    decree.child_ssn !== child.ssn ||
    decree.finalization_date !== child.final_decree.finalization_date ||
    decree.issuing_jurisdiction !== child.final_decree.issuing_jurisdiction ||
    decree.child_origin !== child.final_decree.child_origin
  ) {
    throw new Error(
      "Form 8839 reviewed decree does not match the child ledger",
    );
  }
  const sourceExpenses = new Map(child.expenses.map((expense) =>
    [
      expense.source_document_id,
      expense,
    ] as const
  ));
  const reviewedIds = new Set(
    review.expenses.map((expense) => expense.source_document_id),
  );
  const paymentProofIds = new Set(
    review.expenses.map((expense) => expense.payment_proof_document_id),
  );
  if (
    sourceExpenses.size !== child.expenses.length ||
    reviewedIds.size !== review.expenses.length ||
    paymentProofIds.size !== review.expenses.length ||
    review.expenses.length !== child.expenses.length ||
    sourceExpenses.has(decree.source_document_id) ||
    paymentProofIds.has(decree.source_document_id) ||
    [...paymentProofIds].some((id) => sourceExpenses.has(id))
  ) {
    throw new Error("Form 8839 reviewed expense documents must match uniquely");
  }
  for (const evidence of review.expenses) {
    const expense = sourceExpenses.get(evidence.source_document_id);
    if (
      !expense ||
      expense.source_document_id === evidence.payment_proof_document_id ||
      expense.paid_date !== evidence.paid_date ||
      expense.category !== evidence.category ||
      expense.payee !== evidence.payee ||
      expense.amount !== evidence.amount ||
      expense.reimbursed_amount !== 0 ||
      expense.reimbursement_source_document_id !== undefined ||
      !/^202[45]-/.test(expense.paid_date)
    ) {
      throw new Error(
        "Form 8839 reviewed payment does not match a qualified unreimbursed expense",
      );
    }
  }
}

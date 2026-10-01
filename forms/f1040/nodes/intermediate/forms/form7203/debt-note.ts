import { z } from "zod";
import { reviewedPriorReducedNoteSchema } from "./prior-reduced-note.ts";
import type { ReviewedStockLossLedger } from "./stock-ledger.ts";

const sourceReference = z.string().trim().min(1);
const ty2025Date = z.string().regex(/^2025-\d{2}-\d{2}$/).refine((value) =>
  !Number.isNaN(Date.parse(value)) &&
  new Date(value).toISOString().slice(0, 10) === value
);

const principalRepaymentSchema = z.object({
  formal_note_id: sourceReference,
  date: ty2025Date,
  amount: z.number().int().positive().refine(Number.isSafeInteger),
  corporate_loan_ledger_reference: sourceReference,
  shareholder_bank_deposit_reference: sourceReference,
  principal_only_confirmed: z.literal(true),
}).strict();

export function sumPrincipalRepayments(
  payments: readonly { amount: number }[] | undefined,
): number {
  return (payments ?? []).reduce((total, payment) => total + payment.amount, 0);
}

// Source contract for one or two new formal shareholder notes. Each listed
// The first note may have two dated principal repayments; a second note retains
// one repayment in its separately bounded source route.
export const reviewedNewFormalNotesSchema = z.object({
  kind: z.literal("new_2025_formal_notes"),
  shareholder_ssn: z.string().regex(/^\d{9}$/),
  corporation_ein: z.string().regex(/^\d{9}$/),
  k1_source_document_reference: sourceReference,
  beginning_stock_basis: z.number().int().nonnegative(),
  beginning_stock_basis_workpaper_reference: sourceReference,
  current_box1_ordinary_loss: z.number().int().positive(),
  formal_note_id: sourceReference,
  signed_note_document_reference: sourceReference,
  note_execution_date: ty2025Date,
  shareholder_lender_ssn: z.string().regex(/^\d{9}$/),
  corporate_borrower_ein: z.string().regex(/^\d{9}$/),
  bank_transfer_reference: sourceReference,
  cash_advance_amount: z.number().int().positive().refine(Number.isSafeInteger),
  second_formal_note: z.object({
    formal_note_id: sourceReference,
    signed_note_document_reference: sourceReference,
    note_execution_date: ty2025Date,
    shareholder_lender_ssn: z.string().regex(/^\d{9}$/),
    corporate_borrower_ein: z.string().regex(/^\d{9}$/),
    bank_transfer_reference: sourceReference,
    cash_advance_amount: z.number().int().positive().refine(
      Number.isSafeInteger,
    ),
    corporation_received_funds_confirmed: z.literal(true),
    shareholder_funded_directly_confirmed: z.literal(true),
    not_a_guarantee_or_cosign_confirmed: z.literal(true),
    beginning_note_face_amount: z.literal(0),
    beginning_note_debt_basis: z.literal(0),
    no_2025_repayments_confirmed: z.boolean(),
    principal_repayment: principalRepaymentSchema.optional(),
    no_prior_reduced_debt_basis_confirmed: z.literal(true),
  }).strict().optional(),
  corporation_received_funds_confirmed: z.literal(true),
  shareholder_funded_directly_confirmed: z.literal(true),
  not_a_guarantee_or_cosign_confirmed: z.literal(true),
  beginning_note_face_amount: z.literal(0),
  beginning_note_debt_basis: z.literal(0),
  no_other_shareholder_debt_confirmed: z.literal(true),
  no_2025_repayments_confirmed: z.boolean(),
  principal_repayments: z.array(principalRepaymentSchema).min(1).max(2)
    .optional(),
  no_prior_reduced_debt_basis_confirmed: z.literal(true),
  no_other_2025_basis_changes_confirmed: z.literal(true),
  no_prior_suspended_losses_confirmed: z.literal(true),
}).strict().superRefine((note, ctx) => {
  const references = [
    note.k1_source_document_reference,
    note.beginning_stock_basis_workpaper_reference,
    note.formal_note_id,
    note.signed_note_document_reference,
    note.bank_transfer_reference,
    ...(note.second_formal_note
      ? [
        note.second_formal_note.formal_note_id,
        note.second_formal_note.signed_note_document_reference,
        note.second_formal_note.bank_transfer_reference,
      ]
      : []),
    ...(note.principal_repayments ?? []).flatMap((payment) => [
      payment.corporate_loan_ledger_reference,
      payment.shareholder_bank_deposit_reference,
    ]),
    ...(note.second_formal_note?.principal_repayment
      ? [
        note.second_formal_note.principal_repayment
          .corporate_loan_ledger_reference,
        note.second_formal_note.principal_repayment
          .shareholder_bank_deposit_reference,
      ]
      : []),
  ];
  if (
    note.shareholder_ssn !== note.shareholder_lender_ssn ||
    note.corporation_ein !== note.corporate_borrower_ein ||
    (note.second_formal_note !== undefined &&
      (note.principal_repayments?.length ?? 0) > 1) ||
    (note.second_formal_note !== undefined &&
      (note.second_formal_note.shareholder_lender_ssn !==
          note.shareholder_ssn ||
        note.second_formal_note.corporate_borrower_ein !==
          note.corporation_ein ||
        note.second_formal_note.no_2025_repayments_confirmed ===
          (note.second_formal_note.principal_repayment !== undefined))) ||
    new Set(references).size !== references.length ||
    note.no_2025_repayments_confirmed ===
      ((note.principal_repayments?.length ?? 0) > 0) ||
    (note.principal_repayments ?? []).some((payment, index) =>
      payment.formal_note_id !== note.formal_note_id ||
      payment.date <= note.note_execution_date ||
      (index > 0 &&
        payment.date <= note.principal_repayments![index - 1].date)
    ) ||
    sumPrincipalRepayments(note.principal_repayments) >=
      note.cash_advance_amount ||
    (note.second_formal_note?.principal_repayment !== undefined &&
      (note.second_formal_note.principal_repayment.formal_note_id !==
          note.second_formal_note.formal_note_id ||
        note.second_formal_note.principal_repayment.date <=
          note.second_formal_note.note_execution_date ||
        note.second_formal_note.principal_repayment.amount >=
          note.second_formal_note.cash_advance_amount))
  ) {
    ctx.addIssue({
      code: "custom",
      message:
        "Form 7203 note needs matching lender/borrower identity, distinct loan records, and any principal repayment after the advance and below the note face amount",
    });
  }
});

export const reviewedForm7203DebtEvidenceSchema = z.union([
  reviewedNewFormalNotesSchema,
  reviewedPriorReducedNoteSchema,
]);

export type ReviewedNewFormalNotes = z.infer<
  typeof reviewedNewFormalNotesSchema
>;

export function reconcileCashCapitalAndNewNote(
  ledger: ReviewedStockLossLedger,
  note: ReviewedNewFormalNotes,
): number {
  const contribution = ledger.cash_capital_contribution;
  if (!contribution || note.second_formal_note) {
    throw new Error(
      "Form 7203 combined capital-and-debt route needs one new formal note",
    );
  }
  const references = [
    ledger.beginning_basis_workpaper_reference,
    contribution.bank_transfer_reference,
    contribution.corporate_capital_account_reference,
    note.k1_source_document_reference,
    note.formal_note_id,
    note.signed_note_document_reference,
    note.bank_transfer_reference,
    ...(note.principal_repayments ?? []).flatMap((payment) => [
      payment.corporate_loan_ledger_reference,
      payment.shareholder_bank_deposit_reference,
    ]),
  ];
  if (
    ledger.shareholder_ssn !== note.shareholder_ssn ||
    ledger.corporation_ein !== note.corporation_ein ||
    ledger.beginning_stock_basis !== note.beginning_stock_basis ||
    ledger.beginning_basis_workpaper_reference !==
      note.beginning_stock_basis_workpaper_reference ||
    new Set(references).size !== references.length
  ) {
    throw new Error(
      "Form 7203 cash capital and formal note need one owner/corporation and distinct capital, debt, K-1, and opening-basis records",
    );
  }
  return contribution.amount;
}

export function reconcileNewFormalNotes(
  raw: unknown,
  k1: {
    corporation_ein?: string;
    source_document_reference?: string;
    recipient_tin?: string;
    box1_ordinary_business?: number;
    box16_code_e_loan_repayment?: number;
  },
) {
  const note = reviewedNewFormalNotesSchema.parse(raw);
  const loss = -(k1.box1_ordinary_business ?? 0);
  if (
    !k1.corporation_ein || !k1.source_document_reference ||
    !k1.recipient_tin ||
    note.corporation_ein !== k1.corporation_ein ||
    note.k1_source_document_reference !== k1.source_document_reference ||
    note.shareholder_ssn !== k1.recipient_tin ||
    note.current_box1_ordinary_loss !== loss ||
    (k1.box16_code_e_loan_repayment ?? 0) !==
      (sumPrincipalRepayments(note.principal_repayments) +
        (note.second_formal_note?.principal_repayment?.amount ?? 0))
  ) {
    throw new Error(
      "Form 7203 formal-note debt candidate must match the identified shareholder, corporation, K-1 source, box-1 loss, and box-16 repayment",
    );
  }
  const stockSupportedLoss = Math.min(loss, note.beginning_stock_basis);
  const debtSupportedLossCandidate = Math.min(
    loss - stockSupportedLoss,
    note.cash_advance_amount -
      sumPrincipalRepayments(note.principal_repayments) +
      (note.second_formal_note?.cash_advance_amount ?? 0) -
      (note.second_formal_note?.principal_repayment?.amount ?? 0),
  );
  if (
    note.second_formal_note &&
    !Number.isSafeInteger(
      debtSupportedLossCandidate *
        (note.cash_advance_amount -
          sumPrincipalRepayments(note.principal_repayments)) /
        (note.cash_advance_amount -
          sumPrincipalRepayments(note.principal_repayments) +
          note.second_formal_note.cash_advance_amount -
          (note.second_formal_note.principal_repayment?.amount ?? 0)),
    )
  ) {
    throw new Error(
      "Form 7203 two-note bounded loss needs exact whole-dollar pro rata debt allocation",
    );
  }
  if (debtSupportedLossCandidate <= 0) {
    throw new Error(
      "Form 7203 one-note debt candidate needs a current loss beyond reviewed stock basis",
    );
  }
  return { note, stockSupportedLoss, debtSupportedLossCandidate };
}

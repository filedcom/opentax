import { z } from "zod";

const reference = z.string().trim().min(1);
const digest = z.string().regex(/^[a-f0-9]{64}$/);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) =>
  !Number.isNaN(Date.parse(value)) &&
  new Date(value).toISOString().slice(0, 10) === value
);

/** A reviewed workpaper candidate; the executor does not yet retain these
 * prior filing and loan bytes, so this branch cannot authorize export. */
export const reviewedPriorReducedNoteSchema = z.object({
  kind: z.literal("prior_reduced_formal_note_repayment"),
  shareholder_ssn: z.string().regex(/^\d{9}$/),
  corporation_ein: z.string().regex(/^\d{9}$/),
  k1_source_document_reference: reference,
  beginning_stock_basis: z.number().int().nonnegative(),
  beginning_stock_basis_workpaper_reference: reference,
  current_box1_ordinary_loss: z.number().int().positive(),
  formal_note_id: reference,
  signed_note_document_reference: reference,
  signed_note_sha256: digest,
  note_execution_date: date.refine((value) => value < "2025-01-01"),
  shareholder_lender_ssn: z.string().regex(/^\d{9}$/),
  corporate_borrower_ein: z.string().regex(/^\d{9}$/),
  prior_filed_return_reference: reference,
  prior_filed_return_sha256: digest,
  prior_accepted_acknowledgement_reference: reference,
  prior_accepted_acknowledgement_sha256: digest,
  prior_filed_form7203_reference: reference,
  prior_filed_form7203_sha256: digest,
  prior_form7203_line20_ending_face: z.number().int().positive(),
  prior_form7203_line31_ending_basis: z.number().int().positive(),
  opening_note_face_amount: z.number().int().positive(),
  opening_note_debt_basis: z.number().int().positive(),
  principal_repayment: z.object({
    formal_note_id: reference,
    date: date.refine((value) => value.startsWith("2025-")),
    amount: z.number().int().positive(),
    corporate_loan_ledger_reference: reference,
    corporate_loan_ledger_sha256: digest,
    shareholder_bank_deposit_reference: reference,
    shareholder_bank_deposit_sha256: digest,
    principal_only_confirmed: z.literal(true),
  }).strict(),
  no_other_shareholder_debt_confirmed: z.literal(true),
  no_2025_advances_confirmed: z.literal(true),
  no_2025_basis_restoration_confirmed: z.literal(true),
  no_other_2025_basis_changes_confirmed: z.literal(true),
  no_prior_suspended_losses_confirmed: z.literal(true),
}).strict().superRefine((source, ctx) => {
  const references = [
    source.k1_source_document_reference,
    source.beginning_stock_basis_workpaper_reference,
    source.formal_note_id,
    source.signed_note_document_reference,
    source.prior_filed_return_reference,
    source.prior_accepted_acknowledgement_reference,
    source.prior_filed_form7203_reference,
    source.principal_repayment.corporate_loan_ledger_reference,
    source.principal_repayment.shareholder_bank_deposit_reference,
  ];
  const digests = [
    source.signed_note_sha256,
    source.prior_filed_return_sha256,
    source.prior_accepted_acknowledgement_sha256,
    source.prior_filed_form7203_sha256,
    source.principal_repayment.corporate_loan_ledger_sha256,
    source.principal_repayment.shareholder_bank_deposit_sha256,
  ];
  if (
    source.shareholder_ssn !== source.shareholder_lender_ssn ||
    source.corporation_ein !== source.corporate_borrower_ein ||
    source.principal_repayment.formal_note_id !== source.formal_note_id ||
    source.principal_repayment.date <= source.note_execution_date ||
    source.principal_repayment.amount >= source.opening_note_face_amount ||
    source.opening_note_debt_basis >= source.opening_note_face_amount ||
    source.prior_form7203_line20_ending_face !==
      source.opening_note_face_amount ||
    source.prior_form7203_line31_ending_basis !==
      source.opening_note_debt_basis ||
    new Set(references).size !== references.length ||
    new Set(digests).size !== digests.length
  ) {
    ctx.addIssue({
      code: "custom",
      message:
        "Form 7203 prior reduced note needs one matched prior filed balance, signed note, and identified 2025 principal payment",
    });
  }
});

export type ReviewedPriorReducedNote = z.infer<
  typeof reviewedPriorReducedNoteSchema
>;

/** Computes the bounded Part II workpaper, without authorizing filing. */
export function calculatePriorReducedNoteWorkpaper(
  raw: unknown,
  k1: {
    corporation_ein?: string;
    source_document_reference?: string;
    recipient_tin?: string;
    box1_ordinary_business?: number;
    box16_code_e_loan_repayment?: number;
  },
) {
  const source = reviewedPriorReducedNoteSchema.parse(raw);
  const repayment = source.principal_repayment.amount;
  if (
    k1.corporation_ein !== source.corporation_ein ||
    k1.source_document_reference !== source.k1_source_document_reference ||
    k1.recipient_tin !== source.shareholder_ssn ||
    -(k1.box1_ordinary_business ?? 0) !==
      source.current_box1_ordinary_loss ||
    k1.box16_code_e_loan_repayment !== repayment
  ) {
    throw new Error(
      "Form 7203 prior reduced note must match the current shareholder K-1 loss and code E repayment",
    );
  }
  const ratioScaled = source.opening_note_debt_basis * 10_000 /
    source.opening_note_face_amount;
  const nontaxableRepayment = repayment * ratioScaled / 10_000;
  if (
    !Number.isSafeInteger(ratioScaled) ||
    !Number.isSafeInteger(nontaxableRepayment)
  ) {
    throw new Error(
      "Form 7203 prior reduced note needs an exact four-decimal repayment ratio and whole-dollar nontaxable repayment",
    );
  }
  const reportableGain = repayment - nontaxableRepayment;
  const debtBasisBeforeLoss = source.opening_note_debt_basis -
    nontaxableRepayment;
  const allowedStockLoss = Math.min(
    source.current_box1_ordinary_loss,
    source.beginning_stock_basis,
  );
  const allowedDebtLoss = Math.min(
    source.current_box1_ordinary_loss - allowedStockLoss,
    debtBasisBeforeLoss,
  );
  return {
    source,
    line16_opening_face: source.opening_note_face_amount,
    line19_principal_repayment: repayment,
    line20_ending_face: source.opening_note_face_amount - repayment,
    line21_opening_basis: source.opening_note_debt_basis,
    line25_basis_ratio: (ratioScaled / 10_000).toFixed(4),
    line26_nontaxable_repayment: nontaxableRepayment,
    line27_basis_before_loss: debtBasisBeforeLoss,
    line30_allowed_debt_loss: allowedDebtLoss,
    line31_ending_basis: debtBasisBeforeLoss - allowedDebtLoss,
    line34_reportable_gain: reportableGain,
    allowed_stock_loss: allowedStockLoss,
    allowed_schedule_e_loss: allowedStockLoss + allowedDebtLoss,
  };
}

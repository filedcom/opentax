import {
  notePrincipalRepaid,
  principalRepayments,
} from "./repayment-inventory.ts";
import {
  additionalPrincipalRepayments,
  allocateDebtInventory,
  allocateThreeDebtReductions,
  allocateTwoDebtReductions,
} from "./debt-allocation.ts";
import {
  ownedMixedDebtRecordsSchema,
  ownedOpenAccountRecordsSchema,
} from "./owned-current-source.ts";
import { replayOpenAccount } from "./open-account.ts";
import { z } from "zod";
import {
  ownedCurrentDebtRecordsSchema,
  reconcileOwnedCurrentDebt,
} from "./owned-current-source.ts";
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

// Each current written note retains its complete dated principal repayments.
const newFormalNotesBaseSchema = z.object({
  kind: z.enum(["new_2025_formal_notes", "owned_2025_formal_notes"]),
  open_account_net_advance_amount: z.never().optional(),
  owned_current_records: ownedCurrentDebtRecordsSchema.optional(),
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
  additional_formal_notes: z.never().optional(),
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
    principal_repayments: z.array(principalRepaymentSchema).min(1).optional(),
    no_prior_reduced_debt_basis_confirmed: z.literal(true),
  }).strict().superRefine((note, ctx) => {
    if (!note.principal_repayments) return;
    if (
      note.principal_repayment ||
      note.principal_repayments.some((payment, index, payments) =>
        payment.formal_note_id !== note.formal_note_id ||
        payment.date <= note.note_execution_date ||
        (index > 0 && payment.date <= payments[index - 1].date)
      )
    ) {
      ctx.addIssue({
        code: "custom",
        message:
          "Dated principal repayments need one ordered inventory for their own written note",
      });
    }
  }).optional(),
  corporation_received_funds_confirmed: z.literal(true),
  shareholder_funded_directly_confirmed: z.literal(true),
  not_a_guarantee_or_cosign_confirmed: z.literal(true),
  beginning_note_face_amount: z.literal(0),
  beginning_note_debt_basis: z.literal(0),
  no_other_shareholder_debt_confirmed: z.literal(true),
  no_2025_repayments_confirmed: z.boolean(),
  principal_repayments: z.array(principalRepaymentSchema).min(1)
    .optional(),
  no_prior_reduced_debt_basis_confirmed: z.literal(true),
  no_other_2025_basis_changes_confirmed: z.literal(true),
  no_prior_suspended_losses_confirmed: z.literal(true),
}).strict();
export const reviewedNewFormalNotesSchema = newFormalNotesBaseSchema
  .superRefine((note, ctx) => {
    if (
      note.second_formal_note?.principal_repayment &&
      note.second_formal_note.principal_repayments
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Form7203 note must use one principal repayment inventory",
      });
      return;
    }
    if (
      note.kind === "owned_2025_formal_notes" && !note.owned_current_records
    ) {
      ctx.addIssue({
        code: "custom",
        message:
          "Owned Form7203 notes require complete current funding and stock-basis source records",
      });
    }
    if (note.owned_current_records) {
      try {
        reconcileOwnedCurrentDebt(note.owned_current_records, note);
      } catch (error) {
        ctx.addIssue({ code: "custom", message: String(error) });
      }
    }
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
      ...principalRepayments(note.second_formal_note).flatMap(
        (payment) => [
          payment.corporate_loan_ledger_reference,
          payment.shareholder_bank_deposit_reference,
        ],
      ),
    ];
    if (
      note.shareholder_ssn !== note.shareholder_lender_ssn ||
      note.corporation_ein !== note.corporate_borrower_ein ||
      (note.second_formal_note !== undefined &&
        (note.second_formal_note.shareholder_lender_ssn !==
            note.shareholder_ssn ||
          note.second_formal_note.corporate_borrower_ein !==
            note.corporation_ein ||
          note.second_formal_note.no_2025_repayments_confirmed ===
            (principalRepayments(note.second_formal_note).length > 0))) ||
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
      (note.second_formal_note !== undefined &&
        (principalRepayments(note.second_formal_note).some((
          payment,
          index,
          payments,
        ) =>
          payment.formal_note_id !== note.second_formal_note!.formal_note_id ||
          payment.date <= note.second_formal_note!.note_execution_date ||
          (index > 0 && payment.date <= payments[index - 1].date)
        ) ||
          notePrincipalRepaid(note.second_formal_note) >=
            note.second_formal_note.cash_advance_amount))
    ) {
      ctx.addIssue({
        code: "custom",
        message:
          "Form 7203 note needs matching lender/borrower identity, distinct loan records, and any principal repayment after the advance and below the note face amount",
      });
    }
  });

export const reviewedOpenAccountSchema = newFormalNotesBaseSchema.omit({
  formal_note_id: true,
  signed_note_document_reference: true,
  note_execution_date: true,
  bank_transfer_reference: true,
  shareholder_lender_ssn: true,
  corporate_borrower_ein: true,
  no_2025_repayments_confirmed: true,
  principal_repayments: true,
  second_formal_note: true,
}).extend({
  kind: z.literal("owned_2025_open_account"),
  owned_current_records: ownedOpenAccountRecordsSchema,
  cash_advance_amount: z.number().int().nonnegative().refine(
    Number.isSafeInteger,
  ),
  formal_note_id: z.never().optional(),
  signed_note_document_reference: z.never().optional(),
  note_execution_date: z.never().optional(),
  bank_transfer_reference: z.never().optional(),
  principal_repayments: z.never().optional(),
  second_formal_note: z.never().optional(),
}).superRefine((note, ctx) => {
  try {
    reconcileOwnedCurrentDebt(note.owned_current_records, note);
  } catch (error) {
    ctx.addIssue({ code: "custom", message: String(error) });
  }
});
export const reviewedMixedCurrentDebtSchema = newFormalNotesBaseSchema.extend({
  kind: z.literal("owned_2025_formal_and_open_account"),
  owned_current_records: ownedMixedDebtRecordsSchema,
  additional_formal_notes: z.array(
    newFormalNotesBaseSchema.shape.second_formal_note.unwrap(),
  ).min(1).optional(),
  open_account_net_advance_amount: z.number().int().nonnegative().refine(
    Number.isSafeInteger,
  ),
}).superRefine((note, ctx) => {
  try {
    const r = reconcileOwnedCurrentDebt(note.owned_current_records, note);
    if (
      note.additional_formal_notes &&
      (!note.second_formal_note ||
        note.additional_formal_notes.some((n) =>
          n.shareholder_lender_ssn !== note.shareholder_ssn ||
          n.corporate_borrower_ein !== note.corporation_ein ||
          n.no_2025_repayments_confirmed === (principalRepayments(n).length > 0)
        ))
    ) {
      throw Error(
        "Additional written notes need complete distinct current owner/instrument/repayment sources",
      );
    }
    if (
      note.shareholder_lender_ssn !== note.shareholder_ssn ||
      note.corporate_borrower_ein !== note.corporation_ein ||
      note.no_2025_repayments_confirmed === (r.repayments > 0) ||
      (note.second_formal_note &&
        (note.second_formal_note.shareholder_lender_ssn !==
            note.shareholder_ssn ||
          note.second_formal_note.corporate_borrower_ein !==
            note.corporation_ein ||
          note.second_formal_note.no_2025_repayments_confirmed ===
            (principalRepayments(note.second_formal_note).length > 0)))
    ) {
      throw Error(
        "Mixed direct-debt instrument owner/borrower/complete repayment facts conflict",
      );
    }
  } catch (error) {
    ctx.addIssue({ code: "custom", message: String(error) });
  }
});
const reviewedCurrentDebtSchema = z.union([
  reviewedNewFormalNotesSchema,
  reviewedOpenAccountSchema,
  reviewedMixedCurrentDebtSchema,
]);
export const reviewedForm7203DebtEvidenceSchema = z.union([
  reviewedCurrentDebtSchema,
  reviewedPriorReducedNoteSchema,
]);

export type ReviewedNewFormalNotes = z.infer<
  typeof reviewedCurrentDebtSchema
>;

export function reconcileCashCapitalAndNewNote(
  ledger: ReviewedStockLossLedger,
  note: ReviewedNewFormalNotes,
): number {
  const contribution = ledger.cash_capital_contribution;
  if (
    !contribution ||
    (note.second_formal_note &&
      note.kind !== "owned_2025_formal_and_open_account")
  ) {
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
  ].filter((r): r is string => r !== undefined);
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
  const note = reviewedCurrentDebtSchema.parse(raw);
  const loss = -(k1.box1_ordinary_business ?? 0);
  if (
    !k1.corporation_ein || !k1.source_document_reference ||
    !k1.recipient_tin ||
    note.corporation_ein !== k1.corporation_ein ||
    note.k1_source_document_reference !== k1.source_document_reference ||
    note.shareholder_ssn !== k1.recipient_tin ||
    note.current_box1_ordinary_loss !== loss ||
    (k1.box16_code_e_loan_repayment ?? 0) !==
      actualCurrentDebtRepayments(note)
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
      notePrincipalRepaid(note.second_formal_note) +
      (note.open_account_net_advance_amount ?? 0) +
      (note.additional_formal_notes ?? []).reduce(
        (n, r) => n + r.cash_advance_amount - notePrincipalRepaid(r),
        0,
      ),
  );
  if (
    note.second_formal_note &&
    note.kind !== "owned_2025_formal_and_open_account" &&
    !Number.isSafeInteger(
      debtSupportedLossCandidate *
        (note.cash_advance_amount -
          sumPrincipalRepayments(note.principal_repayments)) /
        (note.cash_advance_amount -
          sumPrincipalRepayments(note.principal_repayments) +
          note.second_formal_note.cash_advance_amount -
          notePrincipalRepaid(note.second_formal_note)),
    )
  ) {
    throw new Error(
      "Form 7203 two-note bounded loss needs exact whole-dollar pro rata debt allocation",
    );
  }
  if (
    debtSupportedLossCandidate <= 0 &&
    note.kind !== "owned_2025_open_account" &&
    note.kind !== "owned_2025_formal_and_open_account"
  ) {
    throw new Error(
      "Form 7203 one-note debt candidate needs a current loss beyond reviewed stock basis",
    );
  }
  return { note, stockSupportedLoss, debtSupportedLossCandidate };
}

export { totalCurrentDebtAdvances } from "./debt-allocation.ts";
export function actualCurrentDebtRepayments(note: ReviewedNewFormalNotes) {
  if (note.kind === "owned_2025_formal_and_open_account") {
    return sumPrincipalRepayments(note.principal_repayments) +
      replayOpenAccount(
        note.owned_current_records
          .complete_current_shareholder_debt_inventory.at(-1),
      ).repayments +
      notePrincipalRepaid(note.second_formal_note) +
      additionalPrincipalRepayments(note);
  }
  return note.kind === "owned_2025_open_account"
    ? replayOpenAccount(
      note.owned_current_records.complete_current_shareholder_debt_inventory[0],
    ).repayments
    : sumPrincipalRepayments(note.principal_repayments) +
      notePrincipalRepaid(note.second_formal_note) +
      additionalPrincipalRepayments(note);
}

/** Current calculated ledger consequences only; this is not accepted next-year basis history. */
export function currentOpenAccountCarry(
  note: ReviewedNewFormalNotes | undefined,
  allowedDebt: number,
): Record<string, number> {
  if (
    note?.kind !== "owned_2025_open_account" &&
    note?.kind !== "owned_2025_formal_and_open_account"
  ) return {};
  const mixed = note.kind === "owned_2025_formal_and_open_account";
  const r = replayOpenAccount(
    note.owned_current_records
      .complete_current_shareholder_debt_inventory[
        mixed
          ? note.owned_current_records
            .complete_current_shareholder_debt_inventory.length - 1
          : 0
      ],
  );
  const formalCapacity = mixed
    ? note.cash_advance_amount -
      sumPrincipalRepayments(note.principal_repayments)
    : 0;
  if (mixed && note.additional_formal_notes) {
    const notes = [
      note,
      ...(note.second_formal_note ? [note.second_formal_note] : []),
      ...note.additional_formal_notes,
    ];
    const caps = [
      formalCapacity,
      ...notes.slice(1).map((n) =>
        n.cash_advance_amount -
        notePrincipalRepaid(n)
      ),
      r.endingPrincipal,
    ];
    const allocation = allocateDebtInventory(allowedDebt, caps),
      key = `${note.shareholder_ssn}_${note.corporation_ein}`;
    const result: Record<string, number> = {};
    [...notes.map((n) => n.formal_note_id), r.source.account_reference].forEach(
      (id, i) => {
        const label = `current_debt_${id}`;
        result[`${label}_principal_7203_${key}`] = caps[i];
        result[`${label}_debt_basis_7203_${key}`] = allocation.basis[i];
        result[`${label}_exact_loss_numerator_7203_${key}`] =
          allocation.exact[i].numerator;
        result[`${label}_exact_basis_numerator_7203_${key}`] =
          allocation.exact[i].basisNumerator;
      },
    );
    result[`mixed_debt_exact_loss_denominator_7203_${key}`] =
      allocation.exact[0].denominator;
    result[`open_account_next_year_separate_debt_7203_${key}`] =
      r.endingPrincipal > 25000 ? 1 : 0;
    return result;
  }
  if (mixed && note.second_formal_note) {
    const secondCapacity = note.second_formal_note.cash_advance_amount -
      notePrincipalRepaid(note.second_formal_note);
    const allocation = allocateThreeDebtReductions(allowedDebt, [
      formalCapacity,
      secondCapacity,
      r.endingPrincipal,
    ]);
    const key = `${note.shareholder_ssn}_${note.corporation_ein}`;
    const labels = ["formal_note", "second_formal_note", "open_account"];
    const caps = [formalCapacity, secondCapacity, r.endingPrincipal];
    const result: Record<string, number> = {};
    labels.forEach((label, i) => {
      result[`${label}_principal_7203_${key}`] = caps[i];
      result[`${label}_debt_basis_7203_${key}`] = allocation.basis[i];
      result[`${label}_exact_loss_numerator_7203_${key}`] =
        allocation.exact[i].numerator;
      result[`${label}_exact_basis_numerator_7203_${key}`] =
        allocation.exact[i].basisNumerator;
    });
    result[`mixed_debt_exact_loss_denominator_7203_${key}`] =
      allocation.exact[0].denominator;
    result[`open_account_next_year_separate_debt_7203_${key}`] =
      r.endingPrincipal > 25000 ? 1 : 0;
    return result;
  }
  const allocation = mixed
    ? allocateTwoDebtReductions(allowedDebt, formalCapacity, r.endingPrincipal)
    : undefined;
  const openLoss = allocation?.second ?? allowedDebt;
  const key = `${note.shareholder_ssn}_${note.corporation_ein}`;
  return {
    ...(allocation
      ? {
        [`formal_note_principal_7203_${key}`]: formalCapacity,
        [`formal_note_debt_basis_7203_${key}`]: allocation.firstBasis,
        [`formal_note_exact_basis_numerator_7203_${key}`]: Number(
          BigInt(formalCapacity) * BigInt(allocation.exact[0].denominator) -
            BigInt(allocation.exact[0].numerator),
        ),
        [`open_account_exact_basis_numerator_7203_${key}`]: Number(
          BigInt(r.endingPrincipal) * BigInt(allocation.exact[1].denominator) -
            BigInt(allocation.exact[1].numerator),
        ),
        [`formal_note_exact_loss_numerator_7203_${key}`]: Number(
          allocation.exact[0].numerator,
        ),
        [`open_account_exact_loss_numerator_7203_${key}`]: Number(
          allocation.exact[1].numerator,
        ),
        [`mixed_debt_exact_loss_denominator_7203_${key}`]: Number(
          allocation.exact[0].denominator,
        ),
      }
      : {}),
    [`open_account_principal_7203_${key}`]: r.endingPrincipal,
    [`open_account_debt_basis_7203_${key}`]: r.endingPrincipal - openLoss,
    [`open_account_next_year_separate_debt_7203_${key}`]:
      r.endingPrincipal > 25000 ? 1 : 0,
  };
}

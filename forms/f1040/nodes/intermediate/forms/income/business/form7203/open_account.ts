import { z } from "zod";
const ref = z.string().trim().min(1), tin = z.string().regex(/^\d{9}$/);
const money = z.number().int().nonnegative().refine(Number.isSafeInteger);
const date = z.string().regex(/^2025-\d{2}-\d{2}$/).refine((s) => {
  const t = Date.parse(`${s}T00:00:00Z`);
  return Number.isFinite(t) && new Date(t).toISOString().slice(0, 10) === s;
});
/** A ledger/bank record is not a written debt instrument or external authentication. */
export const openAccountRecordSchema = z.object({
  debt_record_kind: z.literal(
    "current_open_account_without_written_instrument",
  ),
  shareholder_ssn: tin,
  corporation_ein: tin,
  account_reference: ref,
  principal_ledger_reference: ref,
  creditor_account_owner_ssn: tin,
  creditor_kind: z.literal("individual_shareholder"),
  debtor_kind: z.literal("direct_s_corporation"),
  debt_character: z.literal("unconditional_bona_fide_cash_loan"),
  conversion_or_equity_right: z.literal("none"),
  guarantee_or_cosign_only: z.literal(false),
  oral_creditor_terms_record: z.object({
    record_reference: ref,
    agreed_on: date,
    shareholder_ssn: tin,
    corporation_ein: tin,
    terms_character: z.literal(
      "retained_record_of_oral_demand_principal_and_interest_obligation_not_a_written_instrument",
    ),
    creditor_enforcement_right: z.literal(
      "direct_principal_and_interest_claim",
    ),
    interest_rate_numerator: z.literal(5),
    interest_rate_denominator: z.literal(100),
    creditor_tax_method: z.literal("cash"),
    corporation_tax_method: z.literal("cash"),
    current_interest_payments: z.literal(0),
  }).strict(),
  no_separate_written_instrument: z.literal(true),
  opening_principal: z.literal(0),
  opening_basis: z.literal(0),
  transactions: z.array(
    z.object({
      date,
      kind: z.enum(["advance", "repayment"]),
      amount: money.refine((n) => n > 0),
      transaction_reference: ref,
      shareholder_bank_reference: ref,
      corporate_bank_reference: ref,
      shareholder_ssn: tin,
      corporation_ein: tin,
      funds_origin: z.literal(
        "shareholder_existing_personal_cash_or_corporate_principal_repayment",
      ),
      interest_amount: z.literal(0),
      shareholder_cash_before: money,
      shareholder_cash_after: money,
      corporate_cash_before: money,
      corporate_cash_after: money,
      closing_principal: money,
    }).strict(),
  ).min(1).max(12),
}).strict();
export function replayOpenAccount(raw: unknown) {
  const source = openAccountRecordSchema.parse(raw);
  let principal = 0, advances = 0, repayments = 0, peak = 0;
  const terms = source.oral_creditor_terms_record;
  if (
    terms.shareholder_ssn !== source.shareholder_ssn ||
    terms.corporation_ein !== source.corporation_ein ||
    terms.agreed_on > source.transactions[0].date
  ) {
    throw Error(
      "Open-account oral creditor terms conflict with direct owner/borrower funding",
    );
  }
  const references = [
    source.account_reference,
    source.principal_ledger_reference,
    terms.record_reference,
  ];
  for (const [i, t] of source.transactions.entries()) {
    const sign = t.kind === "advance" ? 1 : -1;
    principal += sign * t.amount;
    if (
      t.shareholder_ssn !== source.shareholder_ssn ||
      t.corporation_ein !== source.corporation_ein ||
      source.creditor_account_owner_ssn !== source.shareholder_ssn ||
      (i > 0 && t.date <= source.transactions[i - 1].date) || principal < 0 ||
      principal !== t.closing_principal ||
      t.shareholder_cash_before - t.shareholder_cash_after !==
        sign * t.amount ||
      t.corporate_cash_after - t.corporate_cash_before !== sign * t.amount
    ) {
      throw Error(
        "Owned open-account direct cash/principal timeline conflicts",
      );
    }
    references.push(
      t.transaction_reference,
      t.shareholder_bank_reference,
      t.corporate_bank_reference,
    );
    if (sign === 1) advances += t.amount;
    else repayments += t.amount;
    peak = Math.max(peak, principal);
  }
  if (new Set(references).size !== references.length) {
    throw Error("Owned open-account source references collide");
  }
  return {
    source,
    advances,
    repayments,
    netAdvance: advances - repayments,
    endingPrincipal: principal,
    peakPrincipal: peak,
    nextYearTreatment: principal > 25000
      ? "separately_tracked_debt_under_1_1367_2_a_2_ii"
      : "open_account",
    nextYearOpeningFace: principal,
  };
}

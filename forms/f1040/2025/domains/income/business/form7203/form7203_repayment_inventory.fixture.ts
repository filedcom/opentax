import { assertExists } from "@std/assert";
import { z } from "zod";
import { inputSchema as k1Schema } from "../../../../../nodes/inputs/income/rental-passthrough/k1_s_corp/index.ts";
import { inputSchema as generalSchema } from "../../../../../nodes/inputs/general/filing/general/index.ts";
import { w2ItemSchema } from "../../../../../nodes/inputs/income/wages/w2/index.ts";
import { reviewedMixedCurrentDebtSchema } from "../../../../../nodes/intermediate/forms/income/business/form7203/debt-note.ts";
import {
  overflowDebtCases,
  overflowDebtInputs,
  overflowFamilyInputs,
} from "./form7203_overflow_debt.fixture.ts";

type K1 = z.infer<typeof k1Schema>["k1_s_corps"][number];
function withDatedRepayments(k1: K1): K1 {
  const note = reviewedMixedCurrentDebtSchema.parse(k1.form7203_debt_evidence);
  const source = note.owned_current_records;
  const replacementRows = new Map<
    string,
    typeof source.complete_current_corporate_bank_ledger.transactions
  >();
  for (const record of source.complete_current_shareholder_debt_inventory) {
    if (!("formal_note_id" in record)) continue;
    const repayments = record.repayments.flatMap((payment) => {
      const first = Math.floor(payment.principal_amount / 3);
      const amounts = [first, first, payment.principal_amount - first * 2];
      let shareholderCash = payment.shareholder_cash_before;
      const parts = amounts.map((amount, i) => {
        const date = new Date(`${payment.date}T00:00:00Z`);
        date.setUTCDate(date.getUTCDate() - 2 + i);
        const before = shareholderCash;
        shareholderCash += amount;
        return {
          ...payment,
          date: date.toISOString().slice(0, 10),
          principal_amount: amount,
          corporate_loan_ledger_reference:
            `${payment.corporate_loan_ledger_reference} part${i + 1}`,
          shareholder_bank_deposit_reference:
            `${payment.shareholder_bank_deposit_reference} part${i + 1}`,
          corporate_bank_reference: `${payment.corporate_bank_reference} part${
            i + 1
          }`,
          shareholder_cash_before: before,
          shareholder_cash_after: shareholderCash,
        };
      });
      const bankRow = source.complete_current_corporate_bank_ledger.transactions
        .find((t) =>
          t.transaction_reference === payment.corporate_loan_ledger_reference
        );
      assertExists(bankRow);
      replacementRows.set(
        payment.corporate_loan_ledger_reference,
        parts.map((part) => ({
          ...bankRow,
          date: part.date,
          transaction_reference: part.corporate_loan_ledger_reference,
          corporate_bank_record_reference: part.corporate_bank_reference,
          amount: part.principal_amount,
        })),
      );
      return parts;
    });
    record.repayments = repayments;
    let principal = record.stated_principal;
    record.principal_entries = [
      record.principal_entries[0],
      ...repayments.map((payment) => {
        principal -= payment.principal_amount;
        return {
          date: payment.date,
          transaction_reference: payment.corporate_loan_ledger_reference,
          kind: "repayment" as const,
          principal_amount: payment.principal_amount,
          closing_principal: principal,
        };
      }),
    ];
    const outer = record.formal_note_id === note.formal_note_id
      ? note
      : [note.second_formal_note, ...(note.additional_formal_notes ?? [])].find(
        (n) => n?.formal_note_id === record.formal_note_id,
      );
    assertExists(outer);
    if ("principal_repayment" in outer) outer.principal_repayment = undefined;
    outer.principal_repayments = repayments.length
      ? repayments.map((payment) => ({
        formal_note_id: record.formal_note_id,
        date: payment.date,
        amount: payment.principal_amount,
        corporate_loan_ledger_reference:
          payment.corporate_loan_ledger_reference,
        shareholder_bank_deposit_reference:
          payment.shareholder_bank_deposit_reference,
        principal_only_confirmed: true as const,
      }))
      : undefined;
  }
  const bank = source.complete_current_corporate_bank_ledger;
  bank.transactions = bank.transactions.flatMap((t) =>
    replacementRows.get(t.transaction_reference) ?? [t]
  ).sort((a, b) => a.date.localeCompare(b.date));
  const snapshots = new Map<
    string,
    { corporate_cash_before: number; corporate_cash_after: number }
  >();
  if (source.current_cash_capital_record) {
    snapshots.set(
      source.current_cash_capital_record.transfer_reference,
      source.current_cash_capital_record,
    );
  }
  for (const r of source.complete_current_shareholder_debt_inventory) {
    if ("formal_note_id" in r) {
      snapshots.set(r.funding.transfer_reference, r.funding);
      for (const payment of r.repayments) {
        snapshots.set(payment.corporate_loan_ledger_reference, payment);
      }
    } else {for (const t of r.transactions) {
        snapshots.set(t.transaction_reference, t);
      }}
  }
  let cash = bank.opening_cash;
  for (const t of bank.transactions) {
    t.cash_before = cash;
    cash += [
        "capital",
        "note_advance",
        "receipt",
        "open_account_advance",
        "nonshareholder_credit_advance",
      ].includes(t.kind)
      ? t.amount
      : -t.amount;
    t.cash_after = cash;
    const record = snapshots.get(t.transaction_reference);
    if (record) {
      record.corporate_cash_before = t.cash_before;
      record.corporate_cash_after = t.cash_after;
    }
  }
  bank.closing_cash = cash;
  return { ...k1, form7203_debt_evidence: note };
}

export const repaymentCases = [...overflowDebtCases, {
  id: "independent_owners",
  allowed: 7600,
}] as const;
export function repaymentInventoryInputs(entry: typeof repaymentCases[number]) {
  const base = "base" in entry
    ? overflowDebtInputs(entry)
    : overflowFamilyInputs();
  const k1s = k1Schema.parse({ k1_s_corps: base.inputs.k1_s_corp }).k1_s_corps;
  return {
    general: generalSchema.parse(base.inputs.general),
    w2: z.array(w2ItemSchema).parse(base.inputs.w2),
    k1_s_corp: k1s.map(withDatedRepayments),
  };
}

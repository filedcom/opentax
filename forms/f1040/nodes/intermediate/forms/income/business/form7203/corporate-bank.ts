import { z } from "zod";
import { isDeepStrictEqual } from "node:util";
const ref = z.string().trim().min(1),
  tin = z.string().regex(/^\d{9}$/),
  amount = z.number().int().nonnegative().refine(Number.isSafeInteger);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((s) => {
  const t = Date.parse(s + "T00:00:00Z");
  return !Number.isNaN(t) && new Date(t).toISOString().slice(0, 10) === s;
});
export const corporateBankLedgerSchema = z.object({
  account_reference: ref,
  opening_balance_record_reference: ref,
  opening_cash: amount,
  closing_cash: amount,
  transactions: z.array(
    z.object({
      date,
      transaction_reference: ref,
      corporate_bank_record_reference: ref,
      kind: z.enum([
        "capital",
        "note_advance",
        "receipt",
        "ordinary_cost",
        "principal_repayment",
        "open_account_advance",
        "open_account_repayment",
        "nonshareholder_credit_advance",
      ]),
      shareholder_ssn: tin.optional(),
      formal_note_id: ref.optional(),
      open_account_reference: ref.optional(),
      credit_reference: ref.optional(),
      amount: amount.refine((n) => n > 0),
      cash_before: amount,
      cash_after: amount,
    }).strict(),
  ).min(1),
}).strict();

export function assertOwnedCorporateBankRecord(
  s: any,
  bank: z.infer<typeof corporateBankLedgerSchema>,
  declaredOwnerSsns: string[],
) {
  const a = s.current_corporate_ordinary_account;
  if (
    bank.transactions.some((t) =>
      [
        "capital",
        "note_advance",
        "principal_repayment",
        "open_account_advance",
        "open_account_repayment",
      ].includes(t.kind) && !t.shareholder_ssn
    )
  ) {
    throw Error(
      "Unjoined shareholder capital/debt bank funding requires its actual owned source",
    );
  }
  let cash = bank.opening_cash;
  const refs = new Set<string>();
  let previous = "2025-01-01";
  for (const t of bank.transactions) {
    if (
      !t.date.startsWith("2025-") || t.date < previous ||
      refs.has(t.transaction_reference) || t.cash_before !== cash ||
      t.cash_after !==
        cash +
          ([
              "capital",
              "note_advance",
              "open_account_advance",
              "receipt",
              "nonshareholder_credit_advance",
            ]
              .includes(t.kind)
            ? t.amount
            : -t.amount)
    ) throw Error("Complete corporate bank rollforward conflicts");
    previous = t.date;
    refs.add(t.transaction_reference);
    cash = t.cash_after;
  }
  if (cash !== bank.closing_cash) {
    throw Error("Corporate closing cash conflicts");
  }
  const ownEvents: any[] = [];
  const cap = s.current_cash_capital_record;
  if (cap) {
    ownEvents.push({
      date: cap.contributed_on,
      transaction_reference: cap.transfer_reference,
      kind: "capital",
      corporate_bank_record_reference: cap.corporate_bank_reference,
      shareholder_ssn: s.shareholder_ssn,
      amount: cap.paid_cash,
      cash_before: cap.corporate_cash_before,
      cash_after: cap.corporate_cash_after,
    });
  }
  for (const n of s.complete_current_shareholder_debt_inventory) {
    if (
      n.debt_record_kind === "current_open_account_without_written_instrument"
    ) {
      for (const t of n.transactions) {
        ownEvents.push({
          date: t.date,
          transaction_reference: t.transaction_reference,
          kind: t.kind === "advance"
            ? "open_account_advance"
            : "open_account_repayment",
          corporate_bank_record_reference: t.corporate_bank_reference,
          shareholder_ssn: s.shareholder_ssn,
          open_account_reference: n.account_reference,
          amount: t.amount,
          cash_before: t.corporate_cash_before,
          cash_after: t.corporate_cash_after,
        });
      }
      continue;
    }
    ownEvents.push({
      date: n.executed_on,
      transaction_reference: n.funding.transfer_reference,
      kind: "note_advance",
      corporate_bank_record_reference: n.funding.corporate_bank_reference,
      shareholder_ssn: s.shareholder_ssn,
      formal_note_id: n.formal_note_id,
      amount: n.stated_principal,
      cash_before: n.funding.corporate_cash_before,
      cash_after: n.funding.corporate_cash_after,
    });
    for (const p of n.repayments) {
      ownEvents.push({
        date: p.date,
        transaction_reference: p.corporate_loan_ledger_reference,
        kind: "principal_repayment",
        corporate_bank_record_reference: p.corporate_bank_reference,
        shareholder_ssn: s.shareholder_ssn,
        formal_note_id: n.formal_note_id,
        amount: p.principal_amount,
        cash_before: p.corporate_cash_before,
        cash_after: p.corporate_cash_after,
      });
    }
  }
  const actualOwn = bank.transactions.filter((t) =>
    t.shareholder_ssn === s.shareholder_ssn
  );
  if (
    !isDeepStrictEqual(
      [...ownEvents].sort((a, b) => a.date.localeCompare(b.date)),
      actualOwn,
    )
  ) {
    throw Error(
      "Owned note/capital/repayment transactions must match actual shared corporate bank ledger",
    );
  }
  const operating = bank.transactions.filter((t) =>
    t.kind === "receipt" || t.kind === "ordinary_cost"
  );
  const expectedOperating = [
    ...a.receipts.map((r: any) => ({ ...r, kind: "receipt" })),
    ...a.paid_ordinary_costs.map((r: any) => ({ ...r, kind: "ordinary_cost" })),
  ];
  if (
    operating.length !== expectedOperating.length ||
    expectedOperating.some((r: any) =>
      !operating.some((t) =>
        t.kind === r.kind && t.transaction_reference === r.reference &&
        t.date === r.date && t.amount === r.amount && !t.shareholder_ssn &&
        !t.formal_note_id && !t.open_account_reference
      )
    ) ||
    bank.transactions.some((t) =>
      t.shareholder_ssn &&
      !declaredOwnerSsns.includes(t.shareholder_ssn)
    )
  ) throw Error("Complete corporate operating/source inventory conflicts");
}

export const unrelatedCorporateCreditSchema = z.object({
  corporation_ein: tin,
  creditor_ein: tin,
  creditor_name: ref,
  credit_reference: ref,
  instrument_reference: ref,
  creditor_relationship: z.literal("unrelated_regulated_bank"),
  no_shareholder_guarantee_or_cosign: z.literal(true),
  no_shareholder_funding_or_creditor_ownership: z.literal(true),
  no_shareholder_basis_or_qbi_claim: z.literal(true),
  executed_on: date,
  maturity_date: date,
  opening_principal: z.literal(0),
  principal: amount.refine((n) => n > 0),
  annual_interest_rate_numerator: amount.refine((n) => n > 0),
  annual_interest_rate_denominator: amount.refine((n) => n > 0),
  interest_method: z.literal("cash_no_current_payment_or_deduction"),
  current_interest_paid: z.literal(0),
  funding: z.object({
    date,
    transaction_reference: ref,
    creditor_bank_reference: ref,
    corporate_bank_record_reference: ref,
    creditor_ein: tin,
    corporation_ein: tin,
    bank_debit: amount,
    bank_credit: amount,
    creditor_cash_before: amount,
    creditor_cash_after: amount,
    cash_before: amount,
    cash_after: amount,
  }).strict(),
  closing_record_reference: ref,
  closing_principal: amount,
  no_current_principal_repayments: z.literal(true),
}).strict();

export function assertMixedCorporateCashSource(s: any) {
  const bank = corporateBankLedgerSchema.parse(
    s.complete_current_corporate_bank_ledger,
  );
  const loans = z.array(unrelatedCorporateCreditSchema).min(1).max(2).parse(
    s.complete_unrelated_corporate_credit_inventory,
  );
  const identityReferences = s.complete_current_shareholder_debt_inventory
    .flatMap((r: any) =>
      r.debt_record_kind
        ? [
          r.account_reference,
          r.principal_ledger_reference,
          r.oral_creditor_terms_record.record_reference,
        ]
        : [
          r.formal_note_id,
          r.instrument_reference,
          r.principal_ledger_reference,
        ]
    );
  const allReferences = [
    ...identityReferences,
    ...loans.flatMap(
      (l) => [
        l.credit_reference,
        l.instrument_reference,
        l.closing_record_reference,
      ],
    ),
  ];
  if (new Set(allReferences).size !== allReferences.length) {
    throw Error("Corporate and shareholder credit identities must be distinct");
  }
  if (
    new Set(bank.transactions.map((t) => t.corporate_bank_record_reference))
      .size !== bank.transactions.length
  ) {
    throw Error(
      "Mixed corporate bank transactions need distinct retained bank records",
    );
  }
  const references = new Set<string>();
  for (const loan of loans) {
    const f = loan.funding;
    if (
      loan.corporation_ein !== s.corporation_ein ||
      loan.creditor_ein === s.corporation_ein ||
      f.corporation_ein !== s.corporation_ein ||
      f.creditor_ein !== loan.creditor_ein ||
      !loan.executed_on.startsWith("2025-") || f.date !== loan.executed_on ||
      loan.maturity_date <= loan.executed_on ||
      f.bank_debit !== loan.principal || f.bank_credit !== loan.principal ||
      f.creditor_cash_after !== f.creditor_cash_before - loan.principal ||
      f.cash_after !== f.cash_before + loan.principal ||
      loan.closing_principal !== loan.principal ||
      references.has(loan.credit_reference)
    ) throw Error("Unrelated corporate credit source conflicts");
    references.add(loan.credit_reference);
    const actual = bank.transactions.filter((t) =>
      t.credit_reference === loan.credit_reference
    );
    const expected = {
      date: f.date,
      transaction_reference: f.transaction_reference,
      corporate_bank_record_reference: f.corporate_bank_record_reference,
      kind: "nonshareholder_credit_advance",
      credit_reference: loan.credit_reference,
      amount: loan.principal,
      cash_before: f.cash_before,
      cash_after: f.cash_after,
    };
    if (!isDeepStrictEqual(actual, [expected])) {
      throw Error("Corporate bank credit transfer conflicts");
    }
  }
  if (
    bank.transactions.some((t) =>
      t.kind === "nonshareholder_credit_advance" &&
      !references.has(t.credit_reference!)
    )
  ) throw Error("Corporate credit inventory is incomplete");
  if (
    bank.opening_cash !==
      s.opening_stock_record.original_cash_bank_record.corporate_cash_after
  ) {
    throw Error(
      "Mixed corporate opening cash must match original stock payment",
    );
  }
  assertOwnedCorporateBankRecord(s, bank, [s.shareholder_ssn]);
  return { bank, loans };
}

import { z } from "zod";
import { isDeepStrictEqual } from "node:util";
const ref = z.string().trim().min(1),
  tin = z.string().regex(/^\d{9}$/),
  amount = z.number().int().nonnegative().refine(Number.isSafeInteger);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((s) => {
  const t = Date.parse(s + "T00:00:00Z");
  return !Number.isNaN(t) && new Date(t).toISOString().slice(0, 10) === s;
});
export const shareholderSourceInventorySchema = z.array(
  z.object({
    shareholder_ssn: tin,
    corporation_ein: tin,
    document_reference: ref,
    section199a_statement_reference: ref,
    ordinary_loss: amount.refine((n) => n > 0),
  }).strict(),
).min(1).max(4);
export const coOwnedCorporateInventorySchema = z.object({
  corporation_ein: tin,
  corporation_name: ref,
  tax_year: z.literal(2025),
  record_reference: ref,
  complete_unchanged_stock_register: z.array(
    z.object({
      shareholder_ssn: tin,
      original_stock_register_reference: ref,
      original_cash_payment_reference: ref,
      corporate_receipt_reference: ref,
      acquired_on: date,
      shares: amount.refine((n) => n > 0),
      price_per_share: amount,
      paid_cash: amount,
      corporate_cash_before: amount,
      corporate_cash_after: amount,
      held_from: z.literal("2025-01-01"),
      held_through: z.literal("2025-12-31"),
    }).strict(),
  ).length(2),
  no_current_stock_changes_or_allocation_elections: z.literal(true),
  complete_current_issued_shareholder_inventory:
    shareholderSourceInventorySchema,
  current_account: z.object({
    account_reference: ref,
    receipts: z.array(
      z.object({ reference: ref, date, payer_reference: ref, amount }).strict(),
    ).min(1),
    paid_ordinary_costs: z.array(
      z.object({
        reference: ref,
        date,
        payee_reference: ref,
        amount,
        purpose: z.literal("ordinary_service_business_operating_cost"),
      }).strict(),
    ).min(1),
  }).strict(),
  corporate_bank_ledger: z.object({
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
        ]),
        shareholder_ssn: tin.optional(),
        formal_note_id: ref.optional(),
        open_account_reference: ref.optional(),
        amount: amount.refine((n) => n > 0),
        cash_before: amount,
        cash_after: amount,
      }).strict(),
    ).min(1),
  }).strict(),
}).strict();
/** A shared issuer needs one stock register, issued inventory and corporate bank ledger.
 * These retained contract records are not outside issuer/bank authentication. */
export function assertCoOwnedCorporateRecord(s: any) {
  const c = coOwnedCorporateInventorySchema.parse(
      s.co_owned_corporate_inventory,
    ),
    a = s.current_corporate_ordinary_account,
    k = s.issued_k1_record,
    stock = s.opening_stock_record;
  const blocks = c.complete_unchanged_stock_register,
    total = blocks.reduce((n, b) => n + b.shares, 0),
    b = blocks.find((b) => b.shareholder_ssn === s.shareholder_ssn);
  if (
    new Set(blocks.map((b) => b.shareholder_ssn)).size !== 2 || !b ||
    c.corporation_ein !== s.corporation_ein ||
    c.corporation_name !== k.corporation_name ||
    b.original_stock_register_reference !==
      stock.original_stock_register_reference ||
    b.original_cash_payment_reference !==
      stock.original_cash_payment_reference ||
    b.corporate_receipt_reference !==
      stock.original_cash_bank_record.corporate_receipt_reference ||
    b.acquired_on !== stock.acquired_on ||
    b.shares !== stock.original_shares_issued ||
    b.price_per_share !== stock.original_cash_price_per_share ||
    b.paid_cash !== stock.original_paid_cash ||
    b.corporate_cash_before !==
      stock.original_cash_bank_record.corporate_cash_before ||
    b.corporate_cash_after !==
      stock.original_cash_bank_record.corporate_cash_after ||
    a.shareholder_ownership_numerator * total !==
      b.shares * a.shareholder_ownership_denominator ||
    !isDeepStrictEqual(c.current_account, {
      account_reference: a.account_reference,
      receipts: a.receipts,
      paid_ordinary_costs: a.paid_ordinary_costs,
    })
  ) {
    throw Error(
      "Co-owned corporation stock allocation, original payment and current books must reconcile",
    );
  }
  let originalCash = blocks[0].corporate_cash_before;
  for (const row of blocks) {
    if (
      row.paid_cash !== row.shares * row.price_per_share ||
      row.corporate_cash_before !== originalCash ||
      row.corporate_cash_after !== originalCash + row.paid_cash
    ) throw Error("Shared original stock payment register conflicts");
    originalCash = row.corporate_cash_after;
  }
  const issuerRows = c.complete_current_issued_shareholder_inventory;
  if (
    issuerRows.length !== blocks.length ||
    new Set(issuerRows.map((r) => r.shareholder_ssn)).size !== blocks.length ||
    issuerRows.some((r) =>
      !blocks.some((b) => b.shareholder_ssn === r.shareholder_ssn) ||
      r.corporation_ein !== c.corporation_ein
    ) || !issuerRows.some((r) =>
      r.shareholder_ssn === k.shareholder_ssn &&
      r.document_reference === k.document_reference &&
      r.section199a_statement_reference === k.section199a_statement_reference &&
      r.ordinary_loss === k.box1_ordinary_loss
    )
  ) throw Error("Complete co-owned issued K1/QBI inventory conflicts");
  const corporateLoss =
    a.paid_ordinary_costs.reduce((n: any, r: any) => n + r.amount, 0) -
    a.receipts.reduce((n: any, r: any) => n + r.amount, 0);
  if (
    issuerRows.some((r) => {
      const b = blocks.find((b) => b.shareholder_ssn === r.shareholder_ssn)!;
      return r.ordinary_loss * total !== corporateLoss * b.shares;
    })
  ) {
    throw Error(
      "Issued owner losses must equal unchanged daily-share corporate allocation",
    );
  }
  const bank = c.corporate_bank_ledger;
  let cash = bank.opening_cash;
  const refs = new Set<string>();
  let previous = "2025-01-01";
  for (const t of bank.transactions) {
    if (
      !t.date.startsWith("2025-") || t.date < previous ||
      refs.has(t.transaction_reference) || t.cash_before !== cash ||
      t.cash_after !==
        cash +
          (["capital", "note_advance", "open_account_advance", "receipt"]
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
      !blocks.some((b) => b.shareholder_ssn === t.shareholder_ssn)
    )
  ) throw Error("Complete corporate operating/source inventory conflicts");
  return c;
}

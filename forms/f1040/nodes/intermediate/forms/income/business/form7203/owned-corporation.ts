import {
  assertOwnedCorporateBankRecord,
  corporateBankLedgerSchema,
} from "./corporate-bank.ts";
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
  corporate_bank_ledger: corporateBankLedgerSchema,
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
  if (
    c.corporate_bank_ledger.transactions.some((t) =>
      t.kind === "nonshareholder_credit_advance" ||
      t.credit_reference !== undefined
    )
  ) {
    throw Error(
      "Legacy shared corporate source cannot assert unreviewed unrelated credit",
    );
  }
  assertOwnedCorporateBankRecord(
    s,
    c.corporate_bank_ledger,
    blocks.map((b) => b.shareholder_ssn),
  );
  return c;
}

import { z } from "zod";
const ref = z.string().trim().min(1);
const tin = z.string().regex(/^\d{9}$/);
const amount = z.number().int().nonnegative().refine(Number.isSafeInteger);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((s) => {
  const n = Date.parse(`${s}T00:00:00Z`);
  return !Number.isNaN(n) && new Date(n).toISOString().slice(0, 10) === s;
}, "Owned loan source needs an actual calendar date");
const identity = { shareholder_ssn: tin, corporation_ein: tin };
const noteRecord = z.object({
  ...identity,
  formal_note_id: ref,
  instrument_reference: ref,
  executed_on: date,
  creditor_kind: z.literal("individual_shareholder"),
  debtor_kind: z.literal("direct_s_corporation"),
  creditor_account_owner_ssn: tin,
  debt_character: z.literal("unconditional_bona_fide_cash_loan"),
  maturity_date: date,
  stated_principal: amount.refine((n) => n > 0),
  annual_interest_rate_numerator: amount,
  annual_interest_rate_denominator: amount.refine((n) => n > 0),
  creditor_enforcement_right: z.literal("direct_principal_and_interest_claim"),
  conversion_or_equity_right: z.literal("none"),
  guarantee_or_cosign_only: z.literal(false),
  funding: z.object({
    shareholder_bank_reference: ref,
    corporate_bank_reference: ref,
    transfer_reference: ref,
    transferred_on: date,
    payer_ssn: tin,
    payee_ein: tin,
    funds_origin: z.literal("shareholder_existing_personal_cash"),
    shareholder_cash_before: amount,
    shareholder_cash_after: amount,
    corporate_cash_before: amount,
    corporate_cash_after: amount,
    bank_debit: amount.refine((n) => n > 0),
    bank_credit: amount.refine((n) => n > 0),
  }).strict(),
  principal_ledger_reference: ref,
  principal_entries: z.array(
    z.object({
      date,
      transaction_reference: ref,
      kind: z.enum(["advance", "repayment"]),
      principal_amount: amount.refine((n) => n > 0),
      closing_principal: amount,
    }).strict(),
  ).min(1).max(3),
  repayments: z.array(
    z.object({
      date,
      corporate_loan_ledger_reference: ref,
      shareholder_bank_deposit_reference: ref,
      corporate_bank_reference: ref,
      formal_note_id: ref,
      payer_ein: tin,
      payee_ssn: tin,
      principal_amount: amount.refine((n) => n > 0),
      interest_amount: z.literal(0),
      corporate_cash_before: amount,
      corporate_cash_after: amount,
      shareholder_cash_before: amount,
      shareholder_cash_after: amount,
    }).strict(),
  ).max(2),
}).strict();

/** Current source-contract records, not an IRS acknowledgement or externally
 * authenticated signature. Older reduced debt remains a separate closed route. */
export const ownedCurrentDebtRecordsSchema = z.object({
  ...identity,
  tax_year: z.literal(2025),
  evidence_kind: z.literal(
    "retained_current_record_contract_not_external_authentication",
  ),
  complete_current_shareholder_debt_inventory: z.array(noteRecord).min(1).max(
    2,
  ),
  no_other_guaranteed_corporate_or_passthrough_debt: z.literal(true),
  opening_stock_record: z.object({
    ...identity,
    workpaper_reference: ref,
    original_stock_register_reference: ref,
    original_cash_payment_reference: ref,
    acquired_on: date,
    original_paid_cash: amount,
    original_shares_issued: amount.refine((n) => n > 0),
    original_cash_price_per_share: amount,
    original_cash_bank_record: z.object({
      payer_ssn: tin,
      payee_ein: tin,
      paid_on: date,
      bank_debit: amount,
      corporate_bank_credit: amount,
      shareholder_cash_before: amount,
      shareholder_cash_after: amount,
      corporate_cash_before: amount,
      corporate_cash_after: amount,
      corporate_receipt_reference: ref,
    }).strict(),
    original_stock_block: z.literal("single_original_cash_issued_block"),
    prior_annual_basis_records: z.array(
      z.object({
        tax_year: z.number().int().min(2019).max(2024),
        corporation_annual_account_reference: ref,
        shareholder_basis_review_reference: ref,
        ordinary_income: z.literal(0),
        distributions: z.literal(0),
        nondeductible_expenses: z.literal(0),
        deducted_losses: z.literal(0),
        tax_exempt_income: z.literal(0),
        stock_transactions: z.literal(0),
        debt_basis_reductions: z.literal(0),
        suspended_losses: z.literal(0),
      }).strict(),
    ).min(1).max(6),
  }).strict(),
  current_cash_capital_record: z.object({
    shareholder_ssn: tin,
    corporation_ein: tin,
    contributed_on: date,
    transfer_reference: ref,
    corporate_capital_account_reference: ref,
    shareholder_bank_reference: ref,
    corporate_bank_reference: ref,
    paid_cash: amount.refine((n) => n > 0),
    shareholder_cash_before: amount,
    shareholder_cash_after: amount,
    corporate_cash_before: amount,
    corporate_cash_after: amount,
    corporate_bank_credit: amount,
    transaction_character: z.literal("cash_capital_no_new_shares_not_debt"),
  }).strict().optional(),
  current_corporate_ordinary_account: z.object({
    corporation_ein: tin,
    tax_year: z.literal(2025),
    account_reference: ref,
    receipts: z.array(
      z.object({ reference: ref, date, payer_reference: ref, amount: amount })
        .strict(),
    ).min(1),
    paid_ordinary_costs: z.array(
      z.object({
        reference: ref,
        date,
        payee_reference: ref,
        amount: amount,
        purpose: z.literal("ordinary_service_business_operating_cost"),
      }).strict(),
    ).min(1),
    shareholder_ownership_numerator: z.literal(1),
    shareholder_ownership_denominator: z.literal(1),
    no_other_ordinary_book_tax_adjustments: z.literal(true),
  }).strict(),
  shareholder_participation_records: z.object({
    shareholder_ssn: tin,
    corporation_ein: tin,
    log_reference: ref,
    monthly_service_hours: z.array(
      z.object({ month: z.number().int().min(1).max(12), hours: amount })
        .strict(),
    ).length(12),
  }).strict(),
  issued_k1_record: z.object({
    ...identity,
    document_reference: ref,
    tax_year: z.literal(2025),
    box1_ordinary_loss: amount.refine((n) => n > 0),
    box16_code_e_principal_repayments: amount,
    corporation_name: ref,
    section199a_statement_reference: ref,
    qualified_us_business_reference: ref,
    qualified_us_business_name: ref,
    qualified_us_business_ein: tin,
    qualified_business_ordinary_loss_before_basis: amount.refine((n) => n > 0),
    no_other_qbi_items_or_adjustments: z.literal(true),
    no_prior_qbi_or_reit_ptp_loss_carryforward: z.literal(true),
    no_other_shareholder_trades_or_businesses: z.literal(true),
    not_a_specified_service_or_cooperative_business: z.literal(true),
  }).strict(),
}).strict();
export type OwnedCurrentDebtRecords = z.infer<
  typeof ownedCurrentDebtRecordsSchema
>;

interface NewNote {
  kind: string;
  shareholder_ssn: string;
  corporation_ein: string;
  k1_source_document_reference: string;
  beginning_stock_basis: number;
  beginning_stock_basis_workpaper_reference: string;
  current_box1_ordinary_loss: number;
  formal_note_id: string;
  signed_note_document_reference: string;
  note_execution_date: string;
  bank_transfer_reference: string;
  cash_advance_amount: number;
  principal_repayments?: readonly {
    formal_note_id: string;
    date: string;
    amount: number;
    corporate_loan_ledger_reference: string;
    shareholder_bank_deposit_reference: string;
  }[];
  second_formal_note?: {
    formal_note_id: string;
    signed_note_document_reference: string;
    note_execution_date: string;
    bank_transfer_reference: string;
    cash_advance_amount: number;
    principal_repayment?: {
      formal_note_id: string;
      date: string;
      amount: number;
      corporate_loan_ledger_reference: string;
      shareholder_bank_deposit_reference: string;
    };
  };
}
function fail(message: string): never {
  throw Error(`Owned Form7203 debt source: ${message}`);
}
export function reconcileOwnedCurrentDebt(raw: unknown, note: NewNote) {
  const s = ownedCurrentDebtRecordsSchema.parse(raw);
  const stock = s.opening_stock_record, k = s.issued_k1_record;
  if (
    s.shareholder_ssn !== note.shareholder_ssn ||
    s.corporation_ein !== note.corporation_ein ||
    stock.shareholder_ssn !== s.shareholder_ssn ||
    stock.corporation_ein !== s.corporation_ein ||
    stock.workpaper_reference !==
      note.beginning_stock_basis_workpaper_reference ||
    stock.original_paid_cash !== note.beginning_stock_basis ||
    k.shareholder_ssn !== s.shareholder_ssn ||
    k.corporation_ein !== s.corporation_ein ||
    k.document_reference !== note.k1_source_document_reference ||
    k.box1_ordinary_loss !== note.current_box1_ordinary_loss ||
    k.qualified_business_ordinary_loss_before_basis !== k.box1_ordinary_loss ||
    k.qualified_us_business_ein !== s.corporation_ein
  ) {
    fail(
      "stock, issued K1/QBI statement and borrower/lender must independently join",
    );
  }
  const account = s.current_corporate_ordinary_account,
    participation = s.shareholder_participation_records;
  if (
    account.corporation_ein !== s.corporation_ein ||
    account.paid_ordinary_costs.some((r) => !r.date.startsWith("2025-")) ||
    account.receipts.some((r) => !r.date.startsWith("2025-")) ||
    account.paid_ordinary_costs.reduce((n, r) => n + r.amount, 0) -
          account.receipts.reduce((n, r) => n + r.amount, 0) !==
      k.box1_ordinary_loss ||
    participation.shareholder_ssn !== s.shareholder_ssn ||
    participation.corporation_ein !== s.corporation_ein ||
    participation.monthly_service_hours.some((r, i) => r.month !== i + 1) ||
    participation.monthly_service_hours.reduce((n, r) => n + r.hours, 0) <= 500
  ) {
    fail(
      "current corporate ordinary accounts/complete shareholder service logs do not support issued loss and nonpassive treatment",
    );
  }
  const capital = s.current_cash_capital_record;
  if (
    capital &&
    (capital.shareholder_ssn !== s.shareholder_ssn ||
      capital.corporation_ein !== s.corporation_ein ||
      !capital.contributed_on.startsWith("2025-") ||
      capital.paid_cash !== capital.corporate_bank_credit ||
      capital.shareholder_cash_before - capital.shareholder_cash_after !==
        capital.paid_cash ||
      capital.corporate_cash_after - capital.corporate_cash_before !==
        capital.corporate_bank_credit)
  ) {
    fail(
      "current cash capital transaction is not independently funded and credited to the owned corporation",
    );
  }
  const originalCash = stock.original_cash_bank_record;
  if (
    originalCash.payer_ssn !== s.shareholder_ssn ||
    originalCash.payee_ein !== s.corporation_ein ||
    originalCash.paid_on !== stock.acquired_on ||
    stock.original_shares_issued * stock.original_cash_price_per_share !==
      stock.original_paid_cash ||
    originalCash.bank_debit !== stock.original_paid_cash ||
    originalCash.corporate_bank_credit !== originalCash.bank_debit ||
    originalCash.shareholder_cash_before -
          originalCash.shareholder_cash_after !== originalCash.bank_debit ||
    originalCash.corporate_cash_after - originalCash.corporate_cash_before !==
      originalCash.corporate_bank_credit
  ) {
    fail(
      "original stock-register price/quantity and owned payment banks do not prove opening basis",
    );
  }
  const firstYear = Number(stock.acquired_on.slice(0, 4));
  if (
    firstYear < 2019 || firstYear > 2024 ||
    stock.prior_annual_basis_records.length !== 2025 - firstYear ||
    stock.prior_annual_basis_records.some((r, i) =>
      r.tax_year !== firstYear + i
    )
  ) {
    fail(
      "missing complete prior stock-basis records; prior nonzero basis activity needs its separate proved history",
    );
  }
  const expected = [
    { ...note, payments: note.principal_repayments ?? [] },
    ...(note.second_formal_note
      ? [{
        ...note.second_formal_note,
        payments: note.second_formal_note.principal_repayment
          ? [note.second_formal_note.principal_repayment]
          : [],
      }]
      : []),
  ];
  if (
    s.complete_current_shareholder_debt_inventory.length !== expected.length
  ) fail("complete debt inventory does not match formal notes");
  const refs = [
    ...(capital
      ? [
        capital.transfer_reference,
        capital.corporate_capital_account_reference,
        capital.shareholder_bank_reference,
        capital.corporate_bank_reference,
      ]
      : []),
    account.account_reference,
    participation.log_reference,
    ...account.receipts.map((r) => r.reference),
    ...account.paid_ordinary_costs.map((r) => r.reference),
    originalCash.corporate_receipt_reference,
    stock.workpaper_reference,
    stock.original_stock_register_reference,
    stock.original_cash_payment_reference,
    k.document_reference,
    k.section199a_statement_reference,
    ...stock.prior_annual_basis_records.flatMap((
      r,
    ) => [
      r.corporation_annual_account_reference,
      r.shareholder_basis_review_reference,
    ]),
  ];
  let capacity = 0, repaid = 0;
  for (let i = 0; i < expected.length; i++) {
    const n = expected[i],
      r = s.complete_current_shareholder_debt_inventory[i],
      f = r.funding;
    refs.push(
      r.instrument_reference,
      f.shareholder_bank_reference,
      f.corporate_bank_reference,
      r.principal_ledger_reference,
    );
    if (
      r.shareholder_ssn !== s.shareholder_ssn ||
      r.corporation_ein !== s.corporation_ein ||
      r.creditor_account_owner_ssn !== s.shareholder_ssn ||
      r.formal_note_id !== n.formal_note_id ||
      r.instrument_reference !== n.signed_note_document_reference ||
      r.executed_on !== n.note_execution_date ||
      !r.executed_on.startsWith("2025-") || r.maturity_date <= r.executed_on ||
      r.stated_principal !== n.cash_advance_amount ||
      f.transfer_reference !== n.bank_transfer_reference ||
      f.transferred_on !== r.executed_on || f.payer_ssn !== s.shareholder_ssn ||
      f.payee_ein !== s.corporation_ein ||
      f.bank_debit !== r.stated_principal || f.bank_credit !== f.bank_debit ||
      f.shareholder_cash_before - f.shareholder_cash_after !== f.bank_debit ||
      f.corporate_cash_after - f.corporate_cash_before !== f.bank_credit
    ) {
      fail(
        "direct owned funding, instrument, bank debit/credit and actual cash balances do not reconcile",
      );
    }
    if (
      r.repayments.length !== n.payments.length ||
      r.principal_entries.length !== 1 + r.repayments.length
    ) fail("complete loan principal/repayment inventory is missing");
    let face = r.stated_principal;
    const first = r.principal_entries[0];
    if (
      first.kind !== "advance" || first.date !== r.executed_on ||
      first.transaction_reference !== f.transfer_reference ||
      first.principal_amount !== face || first.closing_principal !== face
    ) fail("corporate original principal ledger conflicts with direct funding");
    for (let j = 0; j < r.repayments.length; j++) {
      const p = r.repayments[j],
        expectedPayment = n.payments[j],
        e = r.principal_entries[j + 1];
      refs.push(
        p.corporate_loan_ledger_reference,
        p.shareholder_bank_deposit_reference,
        p.corporate_bank_reference,
      );
      if (
        p.formal_note_id !== n.formal_note_id ||
        p.payer_ein !== s.corporation_ein ||
        p.payee_ssn !== s.shareholder_ssn || p.date !== expectedPayment.date ||
        p.date <= r.executed_on ||
        p.principal_amount !== expectedPayment.amount ||
        p.corporate_loan_ledger_reference !==
          expectedPayment.corporate_loan_ledger_reference ||
        p.shareholder_bank_deposit_reference !==
          expectedPayment.shareholder_bank_deposit_reference ||
        p.corporate_cash_before - p.corporate_cash_after !==
          p.principal_amount ||
        p.shareholder_cash_after - p.shareholder_cash_before !==
          p.principal_amount ||
        e.kind !== "repayment" || e.date !== p.date ||
        e.transaction_reference !== p.corporate_loan_ledger_reference ||
        e.principal_amount !== p.principal_amount ||
        e.closing_principal !== face - p.principal_amount
      ) {
        fail(
          "owned repayment banks, note and corporate principal rollforward do not reconcile",
        );
      }
      face -= p.principal_amount;
      repaid += p.principal_amount;
    }
    if (face <= 0) {
      fail(
        "existing partial-repayment route requires a remaining positive note",
      );
    }
    capacity += face;
  }
  if (new Set(refs).size !== refs.length) {
    fail("distinct source records overlap");
  }
  if (k.box16_code_e_principal_repayments !== repaid) {
    fail("issued K1 codeE is not actual principal repayments");
  }
  const allowedStock = Math.min(
    k.box1_ordinary_loss,
    stock.original_paid_cash + (capital?.paid_cash ?? 0),
  );
  const allowedDebt = Math.min(k.box1_ordinary_loss - allowedStock, capacity);
  return {
    source: s,
    beginningStock: stock.original_paid_cash,
    currentCashCapital: capital?.paid_cash ?? 0,
    remainingDebtFace: capacity,
    repayments: repaid,
    allowedStock,
    allowedDebt,
    allowedLoss: allowedStock + allowedDebt,
    suspendedLoss: k.box1_ordinary_loss - allowedStock - allowedDebt,
    restoration: 0,
    repaymentGain: 0,
    qualifiedLoss: -(allowedStock + allowedDebt),
    basisSuspendedQualifiedLoss: k.box1_ordinary_loss - allowedStock -
      allowedDebt,
  };
}

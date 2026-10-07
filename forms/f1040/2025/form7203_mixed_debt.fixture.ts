import { filer, ownedDebtInputs } from "./form7203_owned_debt.fixture.ts";
import {
  spouseOwnedDebtCases,
  spouseOwnedDebtInputs,
  spouseOwnedSource,
} from "./form7203_spouse_owned_debt.fixture.ts";
import { toOpenAccount } from "./form7203_open_account.fixture.ts";
export const mixedDebtCases = [
  {
    id: "fractional_columns",
    owner: "T",
    formalRepayment: 400,
    events: [1400],
    allowed: 4000,
  },
  {
    id: "limited_unequal",
    owner: "T",
    formalRepayment: 400,
    events: [500],
    allowed: 3600,
  },
  {
    id: "open_fully_repaid",
    owner: "T",
    formalRepayment: 0,
    events: [2000, -2000],
    allowed: 3500,
  },
  {
    id: "formal_fully_repaid",
    owner: "T",
    formalRepayment: 2000,
    events: [2000],
    allowed: 3500,
  },
  {
    id: "both_fully_repaid",
    owner: "T",
    formalRepayment: 2000,
    events: [2000, -2000],
    allowed: 1500,
  },
  {
    id: "spouse_fractional",
    owner: "S",
    formalRepayment: 400,
    events: [1400],
    allowed: 4000,
  },
  {
    id: "spouse_net_advance",
    owner: "S",
    formalRepayment: 400,
    events: [2000, -400, 800],
    allowed: 4000,
  },
] as const;
/** Constructed complete current contract records, not external bank/issuer authentication. */
export function mixedDebtSource(c: typeof mixedDebtCases[number]) {
  const k: any = spouseOwnedSource(c.owner, c.formalRepayment > 0),
    n = k.form7203_debt_evidence,
    s = n.owned_current_records;
  if (c.formalRepayment) {
    n.principal_repayments[0].amount = c.formalRepayment;
    const r = s.complete_current_shareholder_debt_inventory[0];
    r.repayments[0].principal_amount = c.formalRepayment;
    r.repayments[0].shareholder_cash_after =
      r.repayments[0].shareholder_cash_before + c.formalRepayment;
    r.principal_entries[1].principal_amount = c.formalRepayment;
    r.principal_entries[1].closing_principal = 2000 - c.formalRepayment;
  }
  const formal = s.complete_current_shareholder_debt_inventory[0];
  const converted = toOpenAccount(structuredClone(k), c.events);
  const open = converted.form7203_debt_evidence.owned_current_records
    .complete_current_shareholder_debt_inventory[0];
  open.transactions.forEach((t: any, i: number) =>
    t.date = `2025-${[8, 9, 12][i]}-20`.replace("-8-", "-08-").replace(
      "-9-",
      "-09-",
    )
  );
  open.oral_creditor_terms_record.agreed_on = open.transactions[0].date;
  n.kind = "owned_2025_formal_and_open_account";
  n.open_account_net_advance_amount = c.events.reduce((a, b) => a + b, 0);
  n.no_2025_repayments_confirmed =
    !(c.formalRepayment || c.events.some((x) => x < 0));
  s.complete_current_shareholder_debt_inventory = [formal, open];
  delete s.no_other_guaranteed_corporate_or_passthrough_debt;
  s.no_other_shareholder_guarantees_or_basis_claimed_debt = true;
  const paid = c.formalRepayment +
    c.events.filter((x) => x < 0).reduce((a, b) => a - b, 0);
  s.issued_k1_record.box16_code_e_principal_repayments = paid;
  if (paid) k.box16_code_e_loan_repayment = paid;
  else delete k.box16_code_e_loan_repayment;
  const prefix = `${n.shareholder_ssn} ${n.corporation_ein} bank credit`;
  const credit: any = {
    corporation_ein: n.corporation_ein,
    creditor_ein: "765432109",
    creditor_name: "Constructed unrelated regulated bank",
    credit_reference: prefix,
    instrument_reference: prefix + " instrument",
    creditor_relationship: "unrelated_regulated_bank",
    no_shareholder_guarantee_or_cosign: true,
    no_shareholder_funding_or_creditor_ownership: true,
    no_shareholder_basis_or_qbi_claim: true,
    executed_on: "2025-01-20",
    maturity_date: "2028-01-20",
    opening_principal: 0,
    principal: 5000,
    annual_interest_rate_numerator: 6,
    annual_interest_rate_denominator: 100,
    interest_method: "cash_no_current_payment_or_deduction",
    current_interest_paid: 0,
    funding: {
      date: "2025-01-20",
      transaction_reference: prefix + " transfer",
      creditor_bank_reference: prefix + " creditor debit",
      corporate_bank_record_reference: prefix + " corporate credit",
      creditor_ein: "765432109",
      corporation_ein: n.corporation_ein,
      bank_debit: 5000,
      bank_credit: 5000,
      creditor_cash_before: 100000,
      creditor_cash_after: 95000,
      cash_before: 500,
      cash_after: 5500,
    },
    closing_record_reference: prefix + " year-end principal",
    closing_principal: 5000,
    no_current_principal_repayments: true,
  };
  s.complete_unrelated_corporate_credit_inventory = [credit];
  const rows: any[] = [{
    date: credit.executed_on,
    transaction_reference: credit.funding.transaction_reference,
    corporate_bank_record_reference:
      credit.funding.corporate_bank_record_reference,
    kind: "nonshareholder_credit_advance",
    credit_reference: prefix,
    amount: 5000,
  }];
  const cap = s.current_cash_capital_record;
  rows.push({
    date: cap.contributed_on,
    transaction_reference: cap.transfer_reference,
    corporate_bank_record_reference: cap.corporate_bank_reference,
    kind: "capital",
    shareholder_ssn: n.shareholder_ssn,
    amount: 1000,
    source: cap,
  });
  rows.push({
    date: formal.executed_on,
    transaction_reference: formal.funding.transfer_reference,
    corporate_bank_record_reference: formal.funding.corporate_bank_reference,
    kind: "note_advance",
    shareholder_ssn: n.shareholder_ssn,
    formal_note_id: formal.formal_note_id,
    amount: 2000,
    source: formal.funding,
  });
  for (const r of s.current_corporate_ordinary_account.receipts) {
    rows.push({
      date: r.date,
      transaction_reference: r.reference,
      corporate_bank_record_reference: r.reference + " bank",
      kind: "receipt",
      amount: r.amount,
    });
  }
  for (const r of s.current_corporate_ordinary_account.paid_ordinary_costs) {
    rows.push({
      date: r.date,
      transaction_reference: r.reference,
      corporate_bank_record_reference: r.reference + " bank",
      kind: "ordinary_cost",
      amount: r.amount,
    });
  }
  for (const r of formal.repayments) {
    rows.push({
      date: r.date,
      transaction_reference: r.corporate_loan_ledger_reference,
      corporate_bank_record_reference: r.corporate_bank_reference,
      kind: "principal_repayment",
      shareholder_ssn: n.shareholder_ssn,
      formal_note_id: formal.formal_note_id,
      amount: r.principal_amount,
      source: r,
    });
  }
  for (const t of open.transactions) {
    rows.push({
      date: t.date,
      transaction_reference: t.transaction_reference,
      corporate_bank_record_reference: t.corporate_bank_reference,
      kind: t.kind === "advance"
        ? "open_account_advance"
        : "open_account_repayment",
      shareholder_ssn: n.shareholder_ssn,
      open_account_reference: open.account_reference,
      amount: t.amount,
      source: t,
    });
  }
  rows.sort((a, b) => a.date.localeCompare(b.date));
  let cash = 500;
  for (const r of rows) {
    r.cash_before = cash;
    cash += [
        "capital",
        "note_advance",
        "receipt",
        "open_account_advance",
        "nonshareholder_credit_advance",
      ].includes(r.kind)
      ? r.amount
      : -r.amount;
    r.cash_after = cash;
    if (r.source) {
      r.source.corporate_cash_before = r.cash_before;
      r.source.corporate_cash_after = r.cash_after;
      delete r.source;
    }
  }
  s.complete_current_corporate_bank_ledger = {
    account_reference: prefix + " complete corporate bank",
    opening_balance_record_reference: prefix + " opening cash",
    opening_cash: 500,
    closing_cash: cash,
    transactions: rows,
  };
  return k;
}
export function mixedDebtInputs(c: typeof mixedDebtCases[number]) {
  if (c.owner === "T") {
    return { inputs: ownedDebtInputs(mixedDebtSource(c)), filer };
  }
  const built = spouseOwnedDebtInputs(spouseOwnedDebtCases[1]);
  built.inputs.k1_s_corp = [mixedDebtSource(c)];
  return built;
}
export const mixedFamilyCase = {
  id: "independent_owner_capacities",
  owner: "both",
  allowed: 7600,
} as const;
export function mixedFamilyInputs() {
  const built = spouseOwnedDebtInputs(spouseOwnedDebtCases[1]);
  built.inputs.k1_s_corp = [
    mixedDebtSource(mixedDebtCases[1]),
    mixedDebtSource(mixedDebtCases[5]),
  ];
  return built;
}

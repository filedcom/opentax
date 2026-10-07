import {
  mixedDebtCases,
  mixedDebtInputs,
} from "./form7203_mixed_debt.fixture.ts";
import { ownedDebtSource } from "./form7203_owned_debt.fixture.ts";
export const twoNotesOpenCases = [
  { id: "primary_fractional", base: 0, secondRepayment: 200, allowed: 4000 },
  { id: "primary_limited", base: 1, secondRepayment: 1000, allowed: 3600 },
  {
    id: "first_formal_fully_repaid",
    base: 3,
    secondRepayment: 200,
    allowed: 4000,
  },
  { id: "open_fully_repaid", base: 2, secondRepayment: 200, allowed: 4000 },
  {
    id: "all_three_fully_repaid",
    base: 4,
    secondRepayment: 1000,
    allowed: 1500,
  },
  { id: "spouse_fractional", base: 5, secondRepayment: 200, allowed: 4000 },
  { id: "spouse_net_advance", base: 6, secondRepayment: 200, allowed: 4000 },
] as const;
/** New constructed contracts; no original source archive is rewritten. */
export function twoNotesOpenInputs(c: typeof twoNotesOpenCases[number]) {
  const built = mixedDebtInputs(mixedDebtCases[c.base]),
    k: any = built.inputs.k1_s_corp[0],
    n = k.form7203_debt_evidence,
    s = n.owned_current_records;
  const template: any = ownedDebtSource([], true, true).form7203_debt_evidence;
  function own(v: any, key = ""): any {
    if (Array.isArray(v)) return v.map((x) => own(x));
    if (v && typeof v === "object") {
      return Object.fromEntries(
        Object.entries(v).map(([k, x]) => [k, own(x, k)]),
      );
    }
    if (v === "123456789") return n.shareholder_ssn;
    if (v === "987654321") return n.corporation_ein;
    if (
      typeof v === "string" &&
      (key.endsWith("_reference") || key.endsWith("_id"))
    ) return v + ` new three-debt ${n.shareholder_ssn}`;
    return v;
  }
  const second = own(template.second_formal_note),
    record = own(
      template.owned_current_records
        .complete_current_shareholder_debt_inventory[1],
    );
  if (c.secondRepayment) {
    second.principal_repayment.amount = c.secondRepayment;
    record.repayments[0].principal_amount = c.secondRepayment;
    record.repayments[0].shareholder_cash_after =
      record.repayments[0].shareholder_cash_before + c.secondRepayment;
    record.principal_entries[1].principal_amount = c.secondRepayment;
    record.principal_entries[1].closing_principal = 1000 - c.secondRepayment;
  } else {
    delete second.principal_repayment;
    second.no_2025_repayments_confirmed = true;
    record.repayments = [];
    record.principal_entries = record.principal_entries.slice(0, 1);
  }
  n.second_formal_note = second;
  s.complete_current_shareholder_debt_inventory.splice(1, 0, record);
  const bank = s.complete_current_corporate_bank_ledger;
  bank.transactions.push({
    date: record.executed_on,
    transaction_reference: record.funding.transfer_reference,
    corporate_bank_record_reference: record.funding.corporate_bank_reference,
    kind: "note_advance",
    shareholder_ssn: n.shareholder_ssn,
    formal_note_id: record.formal_note_id,
    amount: 1000,
  });
  for (const r of record.repayments) {
    bank.transactions.push({
      date: r.date,
      transaction_reference: r.corporate_loan_ledger_reference,
      corporate_bank_record_reference: r.corporate_bank_reference,
      kind: "principal_repayment",
      shareholder_ssn: n.shareholder_ssn,
      formal_note_id: record.formal_note_id,
      amount: r.principal_amount,
    });
  }
  bank.transactions.sort((a: any, b: any) => a.date.localeCompare(b.date));
  let cash = bank.opening_cash;
  const snapshots = new Map<string, any>();
  snapshots.set(
    s.current_cash_capital_record.transfer_reference,
    s.current_cash_capital_record,
  );
  for (const r of s.complete_current_shareholder_debt_inventory) {
    if (r.transactions) {
      for (const t of r.transactions) {
        snapshots.set(t.transaction_reference, t);
      }
    } else {
      snapshots.set(r.funding.transfer_reference, r.funding);
      for (const p of r.repayments) {
        snapshots.set(p.corporate_loan_ledger_reference, p);
      }
    }
  }
  for (const row of bank.transactions) {
    row.cash_before = cash;
    cash += [
        "capital",
        "note_advance",
        "receipt",
        "open_account_advance",
        "nonshareholder_credit_advance",
      ].includes(row.kind)
      ? row.amount
      : -row.amount;
    row.cash_after = cash;
    const source = snapshots.get(row.transaction_reference);
    if (source) {
      source.corporate_cash_before = row.cash_before;
      source.corporate_cash_after = row.cash_after;
    }
  }
  bank.closing_cash = cash;
  const repaid = (k.box16_code_e_loan_repayment ?? 0) + c.secondRepayment;
  k.box16_code_e_loan_repayment = repaid;
  s.issued_k1_record.box16_code_e_principal_repayments = repaid;
  n.no_2025_repayments_confirmed = !repaid;
  return built;
}
export const twoNotesFamilyCase = {
  id: "independent_owners",
  allowed: 7600,
} as const;
export function twoNotesFamilyInputs() {
  const built = twoNotesOpenInputs(twoNotesOpenCases[5]);
  built.inputs.k1_s_corp = [
    twoNotesOpenInputs(twoNotesOpenCases[1]).inputs.k1_s_corp[0],
    built.inputs.k1_s_corp[0],
  ];
  return built;
}

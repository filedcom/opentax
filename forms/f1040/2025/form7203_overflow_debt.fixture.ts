import {
  twoNotesOpenCases,
  twoNotesOpenInputs,
} from "./form7203_two_notes_open.fixture.ts";

export const overflowDebtCases = [
  {
    id: "four_fractional",
    base: 0,
    extras: [[750, 150]],
    allowed: 4000,
    lossColumns: [909, 455, 341, 795],
  },
  {
    id: "four_limited",
    base: 1,
    extras: [[750, 750]],
    allowed: 3600,
    lossColumns: [1600, 0, 0, 500],
  },
  {
    id: "four_fully_repaid",
    base: 4,
    extras: [[750, 750]],
    allowed: 1500,
    lossColumns: [0, 0, 0, 0],
  },
  {
    id: "seven_fractional",
    base: 0,
    extras: [[750, 150], [500, 100], [300, 50], [200, 50]],
    allowed: 4000,
    lossColumns: [769, 385, 289, 192, 120, 72, 673],
  },
  {
    id: "spouse_four_net",
    base: 6,
    extras: [[750, 150]],
    allowed: 4000,
    lossColumns: [741, 370, 278, 1111],
  },
] as const;

/** New authored source contracts, not regenerated or rewritten retained evidence. */
export function overflowDebtInputs(c: typeof overflowDebtCases[number]) {
  const built = twoNotesOpenInputs(twoNotesOpenCases[c.base]),
    k: any = built.inputs.k1_s_corp[0],
    n = k.form7203_debt_evidence,
    s = n.owned_current_records;
  const templateNote = structuredClone(n.second_formal_note),
    templateRecord = structuredClone(
      s.complete_current_shareholder_debt_inventory[1],
    );
  n.additional_formal_notes = [];
  for (const [i, [advance, repayment]] of c.extras.entries()) {
    const prefix = ` additional written debt ${i + 3} ${n.shareholder_ssn}`;
    function distinct(v: any, key = ""): any {
      if (Array.isArray(v)) return v.map((x) => distinct(x));
      if (v && typeof v === "object") {
        return Object.fromEntries(
          Object.entries(v).map(([k, x]) => [k, distinct(x, k)]),
        );
      }
      return typeof v === "string" &&
          (key.endsWith("_reference") || key.endsWith("_id"))
        ? v + prefix
        : v;
    }
    const note = distinct(templateNote),
      record = distinct(templateRecord),
      date = `2025-0${6 + i}-10`;
    note.cash_advance_amount = advance;
    note.note_execution_date = date;
    note.principal_repayment.amount = repayment;
    record.stated_principal = advance;
    record.executed_on = date;
    record.funding.transferred_on = date;
    record.funding.bank_debit = advance;
    record.funding.bank_credit = advance;
    record.funding.shareholder_cash_after =
      record.funding.shareholder_cash_before - advance;
    Object.assign(record.principal_entries[0], {
      date,
      principal_amount: advance,
      closing_principal: advance,
    });
    record.repayments[0].principal_amount = repayment;
    record.repayments[0].shareholder_cash_after =
      record.repayments[0].shareholder_cash_before + repayment;
    record.principal_entries[1].principal_amount = repayment;
    record.principal_entries[1].closing_principal = advance - repayment;
    n.additional_formal_notes.push(note);
    s.complete_current_shareholder_debt_inventory.splice(-1, 0, record);
    const bank = s.complete_current_corporate_bank_ledger;
    bank.transactions.push({
      date,
      transaction_reference: record.funding.transfer_reference,
      corporate_bank_record_reference: record.funding.corporate_bank_reference,
      kind: "note_advance",
      shareholder_ssn: n.shareholder_ssn,
      formal_note_id: record.formal_note_id,
      amount: advance,
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
  }
  const bank = s.complete_current_corporate_bank_ledger;
  bank.transactions.sort((a: any, b: any) => a.date.localeCompare(b.date));
  const snapshots = new Map<string, any>([[
    s.current_cash_capital_record.transfer_reference,
    s.current_cash_capital_record,
  ]]);
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
  let cash = bank.opening_cash;
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
  const repayment = c.extras.reduce((a, r) => a + r[1], 0);
  k.box16_code_e_loan_repayment += repayment;
  s.issued_k1_record.box16_code_e_principal_repayments += repayment;
  return built;
}
export function overflowFamilyInputs() {
  const built = overflowDebtInputs(overflowDebtCases[4]);
  // Use the actual spouse source identity factory before constructing the seven-debt family.
  const sevenSpouse = {
    ...overflowDebtCases[3],
    base: 5,
  } as unknown as typeof overflowDebtCases[number];
  built.inputs.k1_s_corp = [
    overflowDebtInputs(overflowDebtCases[1]).inputs.k1_s_corp[0],
    overflowDebtInputs(sevenSpouse).inputs.k1_s_corp[0],
  ];
  return built;
}

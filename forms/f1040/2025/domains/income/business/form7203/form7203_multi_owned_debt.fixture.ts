import {
  spouseOwnedDebtCases,
  spouseOwnedDebtInputs,
  spouseOwnedSource,
} from "./form7203_spouse_owned_debt.fixture.ts";
export const multiOwnedDebtCases = [
  {
    id: "same_corporation",
    kind: "shared",
    large: false,
    repaid: false,
    allowed: 7000,
    suspended: 1000,
    tax: 1153,
    pages: 10,
    businesses: 1,
    individual: [3500, 3500],
  },
  {
    id: "same_corporation_unequal",
    kind: "shared",
    large: true,
    repaid: false,
    allowed: 7500,
    suspended: 500,
    tax: 1103,
    pages: 10,
    businesses: 1,
    individual: [4000, 3500],
  },
  {
    id: "same_corporation_repaid",
    kind: "shared",
    large: true,
    repaid: true,
    allowed: 7100,
    suspended: 900,
    tax: 1143,
    pages: 10,
    businesses: 1,
    individual: [4000, 3100],
  },
  {
    id: "one_owner_two_corporations",
    kind: "oneowner",
    large: true,
    repaid: false,
    allowed: 7500,
    suspended: 500,
    tax: 1103,
    pages: 10,
    businesses: 2,
    individual: [4000, 3500],
  },
  {
    id: "three_owned_copies",
    kind: "three",
    large: false,
    repaid: false,
    allowed: 11000,
    suspended: 1000,
    tax: 753,
    pages: 12,
    businesses: 2,
    individual: [3500, 3500, 4000],
  },
  {
    id: "four_owned_copies",
    kind: "four",
    large: true,
    repaid: true,
    allowed: 13700,
    suspended: 2300,
    tax: 483,
    pages: 14,
    businesses: 3,
    individual: [4000, 3100, 3500, 3100],
  },
];
function changeLoan(k: any, principal: number) {
  const n = k.form7203_debt_evidence;
  n.cash_advance_amount = principal;
  const r =
    n.owned_current_records.complete_current_shareholder_debt_inventory[0];
  r.stated_principal = principal;
  Object.assign(r.funding, {
    bank_debit: principal,
    bank_credit: principal,
    shareholder_cash_after: r.funding.shareholder_cash_before - principal,
    corporate_cash_after: r.funding.corporate_cash_before + principal,
  });
  Object.assign(r.principal_entries[0], {
    principal_amount: principal,
    closing_principal: principal,
  });
  for (const p of r.repayments) {
    p.shareholder_cash_before = r.funding.shareholder_cash_after;
    p.shareholder_cash_after = p.shareholder_cash_before + p.principal_amount;
    p.corporate_cash_before = r.funding.corporate_cash_after - 4000;
    p.corporate_cash_after = p.corporate_cash_before - p.principal_amount;
  }
  if (r.principal_entries.length > 1) {
    r.principal_entries[1].closing_principal = principal -
      r.repayments[0].principal_amount;
  }
}
function anotherCorporation(k: any, ein: string, name: string) {
  function convert(v: any, key = ""): any {
    if (Array.isArray(v)) return v.map((x) => convert(x));
    if (v && typeof v === "object") {
      return Object.fromEntries(
        Object.entries(v).map(([k, x]) => [k, convert(x, k)]),
      );
    }
    if (typeof v === "string") {
      if (v === k.corporation_ein) return ein;
      if (v === k.corporation_name) return name;
      if (key.endsWith("_reference") || key.endsWith("_id")) {
        return v + " additional corporation";
      }
    }
    return v;
  }
  return convert(k);
}
const inventoryEntry = (k: any) => ({
  shareholder_ssn: k.recipient_tin,
  corporation_ein: k.corporation_ein,
  document_reference: k.source_document_reference,
  section199a_statement_reference:
    k.form7203_debt_evidence.owned_current_records.issued_k1_record
      .section199a_statement_reference,
  ordinary_loss: -k.box1_ordinary_business,
});
function sharedCorporation(large: boolean, repaid: boolean) {
  const t = spouseOwnedSource("T"), s = spouseOwnedSource("S", repaid);
  if (large) changeLoan(t, 3000);
  function replace(v: any): any {
    if (Array.isArray(v)) return v.map(replace);
    if (v && typeof v === "object") {
      return Object.fromEntries(
        Object.entries(v).map(([k, x]) => [k, replace(x)]),
      );
    }
    if (v === "876543210") return "987654321";
    if (v === "Spouse Service S Corp") return "Test S Corp";
    return v;
  }
  const owners = [t, replace(s)];
  for (const k of owners) {
    const r = k.form7203_debt_evidence.owned_current_records,
      a = r.current_corporate_ordinary_account;
    a.account_reference = "shared current corporate service accounts";
    a.receipts = [{
      reference: "shared corporate customer payment",
      date: "2025-06-01",
      payer_reference: "shared complete service customer invoice",
      amount: 12000,
    }];
    a.paid_ordinary_costs = [{
      reference: "shared corporate operations payment",
      date: "2025-07-01",
      payee_reference: "shared service operations vendor",
      amount: 20000,
      purpose: "ordinary_service_business_operating_cost",
    }];
    a.shareholder_ownership_numerator = 1;
    a.shareholder_ownership_denominator = 2;
    r.issued_k1_record.qualified_us_business_reference =
      "shared owned US service trade";
  }
  const events: any[] = [];
  for (const k of owners) {
    const r = k.form7203_debt_evidence.owned_current_records,
      c = r.current_cash_capital_record;
    events.push({
      date: c.contributed_on,
      transaction_reference: c.transfer_reference,
      kind: "capital",
      shareholder_ssn: k.recipient_tin,
      amount: c.paid_cash,
      source: c,
    });
    for (const n of r.complete_current_shareholder_debt_inventory) {
      events.push({
        date: n.executed_on,
        transaction_reference: n.funding.transfer_reference,
        kind: "note_advance",
        shareholder_ssn: k.recipient_tin,
        formal_note_id: n.formal_note_id,
        amount: n.stated_principal,
        source: n.funding,
      });
      for (const p of n.repayments) {
        events.push({
          date: p.date,
          transaction_reference: p.corporate_loan_ledger_reference,
          kind: "principal_repayment",
          shareholder_ssn: k.recipient_tin,
          formal_note_id: n.formal_note_id,
          amount: p.principal_amount,
          source: p,
        });
      }
    }
  }
  const a = t.form7203_debt_evidence.owned_current_records
    .current_corporate_ordinary_account;
  for (const r of a.receipts) {
    events.push({
      date: r.date,
      transaction_reference: r.reference,
      kind: "receipt",
      amount: r.amount,
    });
  }
  for (const r of a.paid_ordinary_costs) {
    events.push({
      date: r.date,
      transaction_reference: r.reference,
      kind: "ordinary_cost",
      amount: r.amount,
    });
  }
  events.sort((a, b) => a.date.localeCompare(b.date));
  let cash = 10000;
  const transactions = events.map(({ source, ...r }) => {
    const before = cash;
    cash += ["capital", "note_advance", "receipt"].includes(r.kind)
      ? r.amount
      : -r.amount;
    if (source) {
      source.corporate_cash_before = before;
      source.corporate_cash_after = cash;
    }
    return {
      ...r,
      corporate_bank_record_reference: source?.corporate_bank_reference ??
        `shared bank entry ${r.transaction_reference}`,
      cash_before: before,
      cash_after: cash,
    };
  });
  let stockCash = 0;
  const blocks = owners.map((k) => {
    const b =
      k.form7203_debt_evidence.owned_current_records.opening_stock_record;
    const before = stockCash;
    stockCash += b.original_paid_cash;
    b.original_cash_bank_record.corporate_cash_before = before;
    b.original_cash_bank_record.corporate_cash_after = stockCash;
    return {
      shareholder_ssn: k.recipient_tin,
      original_stock_register_reference: b.original_stock_register_reference,
      original_cash_payment_reference: b.original_cash_payment_reference,
      corporate_receipt_reference:
        b.original_cash_bank_record.corporate_receipt_reference,
      acquired_on: b.acquired_on,
      shares: b.original_shares_issued,
      price_per_share: b.original_cash_price_per_share,
      paid_cash: b.original_paid_cash,
      corporate_cash_before: before,
      corporate_cash_after: stockCash,
      held_from: "2025-01-01",
      held_through: "2025-12-31",
    };
  });
  const shared = {
    corporation_ein: "987654321",
    corporation_name: "Test S Corp",
    tax_year: 2025,
    record_reference: "shared complete corporate source inventory",
    complete_unchanged_stock_register: blocks,
    no_current_stock_changes_or_allocation_elections: true,
    complete_current_issued_shareholder_inventory: owners.map(inventoryEntry),
    current_account: {
      account_reference: a.account_reference,
      receipts: a.receipts,
      paid_ordinary_costs: a.paid_ordinary_costs,
    },
    corporate_bank_ledger: {
      account_reference: "shared corporate current bank account",
      opening_balance_record_reference:
        "shared corporate bank opening statement",
      opening_cash: 10000,
      closing_cash: cash,
      transactions,
    },
  };
  for (const k of owners) {
    k.form7203_debt_evidence.owned_current_records
      .co_owned_corporate_inventory = structuredClone(shared);
  }
  return owners;
}
export function multiOwnedDebtInputs(spec: typeof multiOwnedDebtCases[number]) {
  const base = spouseOwnedDebtInputs(spouseOwnedDebtCases[0]);
  let sources: any[];
  if (spec.kind === "oneowner") {
    const t = spouseOwnedSource("T");
    changeLoan(t, 3000);
    sources = [
      t,
      anotherCorporation(
        spouseOwnedSource("T"),
        "765432109",
        "Additional Primary Service S Corp",
      ),
    ];
  } else {
    sources = sharedCorporation(spec.large, spec.repaid);
    if (spec.kind === "three") {
      const t = anotherCorporation(
        spouseOwnedSource("T"),
        "765432109",
        "Additional Primary Service S Corp",
      );
      changeLoan(t, 3000);
      sources.push(t);
    }
    if (spec.kind === "four") {
      sources.push(
        anotherCorporation(
          spouseOwnedSource("T"),
          "765432109",
          "Additional Primary Service S Corp",
        ),
        anotherCorporation(
          spouseOwnedSource("S", true),
          "654321098",
          "Additional Spouse Service S Corp",
        ),
      );
    }
  }
  for (const k of sources) {
    const owned = sources.filter((s) => s.recipient_tin === k.recipient_tin);
    k.form7203_debt_evidence.owned_current_records
      .complete_current_shareholder_source_inventory = owned.map(
        inventoryEntry,
      );
    k.form7203_debt_evidence.owned_current_records.issued_k1_record
      .no_other_shareholder_trades_or_businesses = owned.length === 1;
    k.form7203_stock_loss_ledger.no_other_schedule_e_activity =
      owned.length === 1;
  }
  base.inputs.k1_s_corp = sources;
  return base;
}

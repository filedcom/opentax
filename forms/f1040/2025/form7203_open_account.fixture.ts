import {
  filer as singleFiler,
  ownedDebtInputs,
  ownedDebtSource,
} from "./form7203_owned_debt.fixture.ts";
import {
  multiOwnedDebtCases,
  multiOwnedDebtInputs,
} from "./form7203_multi_owned_debt.fixture.ts";
import {
  spouseOwnedDebtCases,
  spouseOwnedDebtInputs,
} from "./form7203_spouse_owned_debt.fixture.ts";
export const openAccountCases = [
  {
    id: "net_advance",
    events: [2000, -400, 800],
    allowed: 3900,
    carry: 100,
    pages: 8,
  },
  {
    id: "fully_repaid",
    events: [2000, -2000],
    allowed: 1500,
    carry: 2500,
    pages: 8,
  },
  { id: "year_end_25000", events: [25000], allowed: 4000, carry: 0, pages: 8 },
  { id: "year_end_25001", events: [25001], allowed: 4000, carry: 0, pages: 8 },
  {
    id: "peak_not_year_end",
    events: [28000, -4000],
    allowed: 4000,
    carry: 0,
    pages: 8,
  },
  { id: "spouse_accounts", events: [], allowed: 6600, carry: 1400, pages: 10 },
  { id: "shared_mixed_debt", events: [], allowed: 7100, carry: 900, pages: 10 },
  {
    id: "one_owner_two_accounts",
    events: [],
    allowed: 7100,
    carry: 900,
    pages: 10,
  },
] as const;
/** New constructed current bank/account contracts; the earlier formal-note specimens are not altered. */
export function toOpenAccount(k: any, events?: readonly number[]) {
  const n = k.form7203_debt_evidence,
    s = n.owned_current_records,
    old = s.complete_current_shareholder_debt_inventory[0];
  const id = `open account ${n.shareholder_ssn} ${n.corporation_ein}`;
  let principal = 0,
    shareholder = old.funding.shareholder_cash_before,
    corporate = old.funding.corporate_cash_before;
  const transactions = events
    ? events.map((amount, i) => {
      const result = {
        date: `2025-${[3, 6, 9][i].toString().padStart(2, "0")}-10`,
        kind: amount > 0 ? "advance" : "repayment",
        amount: Math.abs(amount),
        transaction_reference: `${id} transfer ${i}`,
        shareholder_bank_reference: `${id} shareholder bank ${i}`,
        corporate_bank_reference: `${id} corporate bank ${i}`,
        shareholder_ssn: n.shareholder_ssn,
        corporation_ein: n.corporation_ein,
        funds_origin:
          "shareholder_existing_personal_cash_or_corporate_principal_repayment",
        interest_amount: 0,
        shareholder_cash_before: shareholder,
        shareholder_cash_after: shareholder - amount,
        corporate_cash_before: corporate,
        corporate_cash_after: corporate + amount,
        closing_principal: principal + amount,
      };
      shareholder -= amount;
      corporate += amount;
      principal += amount;
      return result;
    })
    : [
      {
        date: old.executed_on,
        kind: "advance",
        amount: old.stated_principal,
        transaction_reference: old.funding.transfer_reference,
        shareholder_bank_reference: old.funding.shareholder_bank_reference,
        corporate_bank_reference: old.funding.corporate_bank_reference,
        shareholder_ssn: n.shareholder_ssn,
        corporation_ein: n.corporation_ein,
        funds_origin:
          "shareholder_existing_personal_cash_or_corporate_principal_repayment",
        interest_amount: 0,
        shareholder_cash_before: old.funding.shareholder_cash_before,
        shareholder_cash_after: old.funding.shareholder_cash_after,
        corporate_cash_before: old.funding.corporate_cash_before,
        corporate_cash_after: old.funding.corporate_cash_after,
        closing_principal: old.stated_principal,
      },
      ...old.repayments.map((r: any) => {
        principal = old.stated_principal - r.principal_amount;
        return {
          ...r,
          kind: "repayment",
          amount: r.principal_amount,
          transaction_reference: r.corporate_loan_ledger_reference,
          shareholder_bank_reference: r.shareholder_bank_deposit_reference,
          shareholder_ssn: n.shareholder_ssn,
          corporation_ein: n.corporation_ein,
          funds_origin:
            "shareholder_existing_personal_cash_or_corporate_principal_repayment",
          closing_principal: principal,
        };
      }).map((r: any) => {
        const {
          formal_note_id,
          payer_ein,
          payee_ssn,
          principal_amount,
          corporate_loan_ledger_reference,
          shareholder_bank_deposit_reference,
          ...result
        } = r;
        return result;
      }),
    ];
  const account = {
    debt_record_kind: "current_open_account_without_written_instrument",
    shareholder_ssn: n.shareholder_ssn,
    corporation_ein: n.corporation_ein,
    account_reference: id,
    principal_ledger_reference: `${id} complete principal ledger`,
    creditor_account_owner_ssn: n.shareholder_ssn,
    creditor_kind: "individual_shareholder",
    debtor_kind: "direct_s_corporation",
    debt_character: "unconditional_bona_fide_cash_loan",
    oral_creditor_terms_record: {
      record_reference: `${id} oral creditor terms ledger`,
      agreed_on: transactions[0].date,
      shareholder_ssn: n.shareholder_ssn,
      corporation_ein: n.corporation_ein,
      terms_character:
        "retained_record_of_oral_demand_principal_and_interest_obligation_not_a_written_instrument",
      creditor_enforcement_right: "direct_principal_and_interest_claim",
      interest_rate_numerator: 5,
      interest_rate_denominator: 100,
      creditor_tax_method: "cash",
      corporation_tax_method: "cash",
      current_interest_payments: 0,
    },
    conversion_or_equity_right: "none",
    guarantee_or_cosign_only: false,
    no_separate_written_instrument: true,
    opening_principal: 0,
    opening_basis: 0,
    transactions,
  };
  n.kind = "owned_2025_open_account";
  for (
    const key of [
      "formal_note_id",
      "signed_note_document_reference",
      "note_execution_date",
      "bank_transfer_reference",
      "shareholder_lender_ssn",
      "corporate_borrower_ein",
      "no_2025_repayments_confirmed",
      "principal_repayments",
      "second_formal_note",
    ]
  ) delete n[key];
  n.cash_advance_amount = transactions.reduce(
    (v, t) => v + (t.kind === "advance" ? t.amount : -t.amount),
    0,
  );
  s.complete_current_shareholder_debt_inventory = [account];
  const repaid = transactions.filter((t) => t.kind === "repayment").reduce(
    (v, t) => v + t.amount,
    0,
  );
  s.issued_k1_record.box16_code_e_principal_repayments = repaid;
  k.box16_code_e_loan_repayment = repaid;
  return k;
}
export function openAccountInputs(spec: typeof openAccountCases[number]) {
  if (spec.id === "shared_mixed_debt") {
    const built = multiOwnedDebtInputs(
      multiOwnedDebtCases.find((c) => c.id === "same_corporation_repaid")!,
    );
    const inputs: any = built.inputs, sources = inputs.k1_s_corp;
    const old = sources[1].form7203_debt_evidence.owned_current_records
      .complete_current_shareholder_debt_inventory[0];
    const oldId = old.formal_note_id;
    toOpenAccount(sources[1]);
    for (const k of sources) {
      for (
        const t of k.form7203_debt_evidence.owned_current_records
          .co_owned_corporate_inventory.corporate_bank_ledger.transactions
      ) {
        if (t.formal_note_id === oldId) {
          delete t.formal_note_id;
          t.open_account_reference =
            sources[1].form7203_debt_evidence.owned_current_records
              .complete_current_shareholder_debt_inventory[0].account_reference;
          t.kind = t.kind === "note_advance"
            ? "open_account_advance"
            : "open_account_repayment";
        }
      }
    }
    return built;
  }
  if (spec.id === "one_owner_two_accounts") {
    const built = multiOwnedDebtInputs(
      multiOwnedDebtCases.find((c) => c.id === "one_owner_two_corporations")!,
    );
    const inputs: any = built.inputs;
    toOpenAccount(inputs.k1_s_corp[0]);
    toOpenAccount(inputs.k1_s_corp[1], [2000, -400]);
    return built;
  }
  if (spec.id === "spouse_accounts") {
    const built = spouseOwnedDebtInputs(
      spouseOwnedDebtCases.find((c) => c.id === "independent_spouses")!,
    );
    const inputs: any = built.inputs;
    toOpenAccount(inputs.k1_s_corp[0], [2000]);
    toOpenAccount(inputs.k1_s_corp[1], [2000, -400]);
    return built;
  }
  const source = ownedDebtSource([], false, true);
  // New threshold records use actual owned bank cash sufficient to fund the unchanged debt amount.
  source.form7203_debt_evidence.owned_current_records
    .complete_current_shareholder_debt_inventory[0].funding
    .shareholder_cash_before = 50000;
  return {
    inputs: ownedDebtInputs(toOpenAccount(source, spec.events)),
    filer: singleFiler,
  };
}

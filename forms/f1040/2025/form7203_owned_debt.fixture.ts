import { f1040_2025 } from "./index.ts";
import { FilingStatus as InputFilingStatus } from "../nodes/types.ts";
import { FilingStatus as MefFilingStatus } from "../mef/header.ts";
const ledger = {
  shareholder_ssn: "123456789",
  shareholder_name_as_on_k1: "Alex Taxpayer",
  corporation_ein: "987654321",
  beginning_stock_basis: 500,
  beginning_basis_workpaper_reference: "2024 stock basis workpaper",

  original_shareholder: true,
  all_shares_one_stock_block: true,
  no_current_year_stock_transactions: true,
  no_section_1367_1_g_election: true,
  no_other_2025_stock_basis_changes: true,
  no_other_schedule_e_activity: true,
  materially_participated_in_s_corporation: true,
  material_participation_workpaper_reference: "2025 participation log",
  no_shareholder_debt_or_repayments: false,
  no_prior_year_suspended_losses: true,
  no_at_risk_or_passive_limitation: true,
};

const note = {
  kind: "owned_2025_formal_notes",
  shareholder_ssn: "123456789",
  corporation_ein: "987654321",
  k1_source_document_reference: "2025 signed S corporation K-1",
  beginning_stock_basis: 500,
  beginning_stock_basis_workpaper_reference: "2024 stock basis workpaper",
  current_box1_ordinary_loss: 4_000,
  formal_note_id: "formal note 2025-01",
  signed_note_document_reference: "signed formal note 2025-01",
  note_execution_date: "2025-03-10",
  shareholder_lender_ssn: "123456789",
  corporate_borrower_ein: "987654321",
  bank_transfer_reference: "shareholder bank loan transfer 2025-03-10",
  cash_advance_amount: 2_000,
  corporation_received_funds_confirmed: true,
  shareholder_funded_directly_confirmed: true,
  not_a_guarantee_or_cosign_confirmed: true,
  beginning_note_face_amount: 0,
  beginning_note_debt_basis: 0,
  no_other_shareholder_debt_confirmed: true,
  no_2025_repayments_confirmed: true,
  no_prior_reduced_debt_basis_confirmed: true,
  no_other_2025_basis_changes_confirmed: true,
  no_prior_suspended_losses_confirmed: true,
};

const source = {
  corporation_name: "Test S Corp",
  corporation_ein: "987654321",
  source_document_reference: "2025 signed S corporation K-1",
  recipient_tin: "123456789",
  box1_ordinary_business: -4_000,
  form7203_stock_loss_ledger: ledger,
  form7203_debt_evidence: note,
};

export const filer = {
  primarySSN: "123456789",
  firstNameWithInitial: "Alex",
  lastName: "Taxpayer",
  nameLine1: "Alex Taxpayer",
  fullName: "Alex Taxpayer",
  nameControl: "TAXP",
  filingStatus: MefFilingStatus.Single,
  address: {
    line1: "1 Main St",
    city: "Wilmington",
    state: "DE",
    zip: "19801",
  },
};

export function ownedDebtInputs(k1: Record<string, unknown> = source) {
  return {
    general: {
      filing_status: InputFilingStatus.Single,
      taxpayer_first_name: "Alex",
      taxpayer_last_name: "Taxpayer",
      taxpayer_ssn: "123-45-6789",
      taxpayer_dob: "1985-06-15",
      address_line1: "1 Main St",
      address_city: "Wilmington",
      address_state: "DE",
      address_zip: "19801",
      digital_assets: false,
    },
    w2: [{
      employer_ein: "123456789",
      employer_name: "Test Employer",
      employer_address_line1: "2 Main St",
      employer_address_city: "Wilmington",
      employer_address_state: "DE",
      employer_address_zip: "19801",
      employee_ssn: "123-45-6789",
      box1_wages: 50_000,
      box2_fed_withheld: 8_000,
    }],
    k1_s_corp: [k1],
  };
}

export function filedReturn(k1: Record<string, unknown> = source) {
  return f1040_2025.executeReturn(ownedDebtInputs(k1));
}

export function ownedDebtSource(
  repayments: number[] = [],
  second = false,
  capital = false,
) {
  const k = structuredClone(source) as any;
  const n = k.form7203_debt_evidence;
  if (capital) {
    k.form7203_stock_loss_ledger.cash_capital_contribution = {
      amount: 1000,
      contributed_date: "2025-02-10",
      shareholder_ssn: n.shareholder_ssn,
      corporation_ein: n.corporation_ein,
      bank_transfer_reference: "owned current cash capital transfer",
      corporate_capital_account_reference:
        "owned corporate cash capital ledger",
      cash_received_by_corporation_confirmed: true,
      no_shares_issued_confirmed: true,
      not_a_shareholder_loan_confirmed: true,
    };
  }

  n.principal_repayments = repayments.map((amount, i) => ({
    formal_note_id: n.formal_note_id,
    date: `2025-${i === 0 ? "08" : "09"}-15`,
    amount,
    corporate_loan_ledger_reference: `first note corporate repayment ${i + 1}`,
    shareholder_bank_deposit_reference: `first note shareholder deposit ${
      i + 1
    }`,
    principal_only_confirmed: true,
  }));
  if (!repayments.length) delete n.principal_repayments;
  n.no_2025_repayments_confirmed = !repayments.length && !second;
  if (second) {
    n.second_formal_note = {
      formal_note_id: "formal note 2025-02",
      signed_note_document_reference: "second executed formal note",
      note_execution_date: "2025-04-10",
      shareholder_lender_ssn: n.shareholder_ssn,
      corporate_borrower_ein: n.corporation_ein,
      bank_transfer_reference: "second note cash transfer",
      cash_advance_amount: 1000,
      corporation_received_funds_confirmed: true,
      shareholder_funded_directly_confirmed: true,
      not_a_guarantee_or_cosign_confirmed: true,
      beginning_note_face_amount: 0,
      beginning_note_debt_basis: 0,
      no_2025_repayments_confirmed: false,
      no_prior_reduced_debt_basis_confirmed: true,
      principal_repayment: {
        formal_note_id: "formal note 2025-02",
        date: "2025-10-15",
        amount: 200,
        corporate_loan_ledger_reference: "second corporate repayment",
        shareholder_bank_deposit_reference: "second shareholder deposit",
        principal_only_confirmed: true,
      },
    };
  }
  const makeRecord = (a: any, payments: any[], index: number) => {
    let face = a.cash_advance_amount;
    return {
      shareholder_ssn: n.shareholder_ssn,
      corporation_ein: n.corporation_ein,
      formal_note_id: a.formal_note_id,
      instrument_reference: a.signed_note_document_reference,
      executed_on: a.note_execution_date,
      creditor_kind: "individual_shareholder",
      debtor_kind: "direct_s_corporation",
      creditor_account_owner_ssn: n.shareholder_ssn,
      debt_character: "unconditional_bona_fide_cash_loan",
      maturity_date: "2028-12-31",
      stated_principal: face,
      annual_interest_rate_numerator: 5,
      annual_interest_rate_denominator: 100,
      creditor_enforcement_right: "direct_principal_and_interest_claim",
      conversion_or_equity_right: "none",
      guarantee_or_cosign_only: false,
      funding: {
        shareholder_bank_reference: `owned shareholder funding bank ${index}`,
        corporate_bank_reference: `owned corporate funding bank ${index}`,
        transfer_reference: a.bank_transfer_reference,
        transferred_on: a.note_execution_date,
        payer_ssn: n.shareholder_ssn,
        payee_ein: n.corporation_ein,
        funds_origin: "shareholder_existing_personal_cash",
        shareholder_cash_before: 20000,
        shareholder_cash_after: 20000 - face,
        corporate_cash_before: 10000,
        corporate_cash_after: 10000 + face,
        bank_debit: face,
        bank_credit: face,
      },
      principal_ledger_reference: `complete corporate note ledger ${index}`,
      principal_entries: [
        {
          date: a.note_execution_date,
          transaction_reference: a.bank_transfer_reference,
          kind: "advance",
          principal_amount: face,
          closing_principal: face,
        },
        ...payments.map((p) => ({
          date: p.date,
          transaction_reference: p.corporate_loan_ledger_reference,
          kind: "repayment",
          principal_amount: p.amount,
          closing_principal: face -= p.amount,
        })),
      ],
      repayments: payments.map((p) => ({
        date: p.date,
        corporate_loan_ledger_reference: p.corporate_loan_ledger_reference,
        shareholder_bank_deposit_reference:
          p.shareholder_bank_deposit_reference,
        corporate_bank_reference:
          `owned corporation repayment bank ${index} ${p.date}`,
        formal_note_id: a.formal_note_id,
        payer_ein: n.corporation_ein,
        payee_ssn: n.shareholder_ssn,
        principal_amount: p.amount,
        interest_amount: 0,
        corporate_cash_before: 10000,
        corporate_cash_after: 10000 - p.amount,
        shareholder_cash_before: 20000,
        shareholder_cash_after: 20000 + p.amount,
      })),
    };
  };
  const paid = repayments.reduce((a, b) => a + b, 0) + (second ? 200 : 0);
  if (paid) k.box16_code_e_loan_repayment = paid;
  n.owned_current_records = {
    shareholder_ssn: n.shareholder_ssn,
    corporation_ein: n.corporation_ein,
    tax_year: 2025,
    evidence_kind:
      "retained_current_record_contract_not_external_authentication",
    complete_current_shareholder_debt_inventory: [
      makeRecord(n, n.principal_repayments ?? [], 1),
      ...(second
        ? [
          makeRecord(n.second_formal_note, [
            n.second_formal_note.principal_repayment,
          ], 2),
        ]
        : []),
    ],
    no_other_guaranteed_corporate_or_passthrough_debt: true,
    opening_stock_record: {
      shareholder_ssn: n.shareholder_ssn,
      corporation_ein: n.corporation_ein,
      workpaper_reference: n.beginning_stock_basis_workpaper_reference,
      original_stock_register_reference: "original 2019 stock register",
      original_cash_payment_reference: "original shareholder 2019 payment",
      acquired_on: "2019-01-15",
      original_paid_cash: 500,
      original_shares_issued: 100,
      original_cash_price_per_share: 5,
      original_cash_bank_record: {
        payer_ssn: n.shareholder_ssn,
        payee_ein: n.corporation_ein,
        paid_on: "2019-01-15",
        bank_debit: 500,
        corporate_bank_credit: 500,
        shareholder_cash_before: 5000,
        shareholder_cash_after: 4500,
        corporate_cash_before: 0,
        corporate_cash_after: 500,
        corporate_receipt_reference: "corporate stock payment receipt",
      },
      original_stock_block: "single_original_cash_issued_block",
      prior_annual_basis_records: Array.from({ length: 6 }, (_, i) => ({
        tax_year: 2019 + i,
        corporation_annual_account_reference:
          `corporate ordinary/basis accounts ${2019 + i}`,
        shareholder_basis_review_reference: `owned shareholder basis review ${
          2019 + i
        }`,
        ordinary_income: 0,
        distributions: 0,
        nondeductible_expenses: 0,
        deducted_losses: 0,
        tax_exempt_income: 0,
        stock_transactions: 0,
        debt_basis_reductions: 0,
        suspended_losses: 0,
      })),
    },
    current_corporate_ordinary_account: {
      corporation_ein: n.corporation_ein,
      tax_year: 2025,
      account_reference: "current corporate service accounts",
      receipts: [{
        reference: "corporate service cash receipt",
        date: "2025-06-01",
        payer_reference: "customer service invoice",
        amount: 6000,
      }],
      paid_ordinary_costs: [{
        reference: "corporate ordinary service cost payment",
        date: "2025-07-01",
        payee_reference: "service operations vendor",
        amount: 10000,
        purpose: "ordinary_service_business_operating_cost",
      }],
      shareholder_ownership_numerator: 1,
      shareholder_ownership_denominator: 1,
      no_other_ordinary_book_tax_adjustments: true,
    },
    shareholder_participation_records: {
      shareholder_ssn: n.shareholder_ssn,
      corporation_ein: n.corporation_ein,
      log_reference: "2025 participation log",
      monthly_service_hours: Array.from(
        { length: 12 },
        (_, i) => ({ month: i + 1, hours: 50 }),
      ),
    },
    issued_k1_record: {
      shareholder_ssn: n.shareholder_ssn,
      corporation_ein: n.corporation_ein,
      document_reference: k.source_document_reference,
      tax_year: 2025,
      box1_ordinary_loss: 4000,
      box16_code_e_principal_repayments: paid,
      corporation_name: k.corporation_name,
      section199a_statement_reference:
        "issued corporate 199A ordinary-loss statement",
      qualified_us_business_reference: "owned US service trade",
      qualified_us_business_name: k.corporation_name,
      qualified_us_business_ein: n.corporation_ein,
      qualified_business_ordinary_loss_before_basis: 4000,
      no_other_qbi_items_or_adjustments: true,
      no_prior_qbi_or_reit_ptp_loss_carryforward: true,
      no_other_shareholder_trades_or_businesses: true,
      not_a_specified_service_or_cooperative_business: true,
    },
  };
  if (capital) {
    n.owned_current_records.current_cash_capital_record = {
      shareholder_ssn: n.shareholder_ssn,
      corporation_ein: n.corporation_ein,
      contributed_on: "2025-02-10",
      transfer_reference: "owned current cash capital transfer",
      corporate_capital_account_reference:
        "owned corporate cash capital ledger",
      shareholder_bank_reference: "owned shareholder capital payment bank",
      corporate_bank_reference: "owned corporation capital received bank",
      paid_cash: 1000,
      shareholder_cash_before: 20000,
      shareholder_cash_after: 19000,
      corporate_cash_before: 10000,
      corporate_cash_after: 11000,
      corporate_bank_credit: 1000,
      transaction_character: "cash_capital_no_new_shares_not_debt",
    };
  }
  // Same owned accounts: current funding, receipts/costs, and principal repayments.
  let shareholderCash = 20000 - (capital ? 1000 : 0),
    corporateCash = 10000 + (capital ? 1000 : 0);
  for (
    const record of n.owned_current_records
      .complete_current_shareholder_debt_inventory
  ) {
    record.funding.shareholder_cash_before = shareholderCash;
    record.funding.shareholder_cash_after = shareholderCash -=
      record.stated_principal;
    record.funding.corporate_cash_before = corporateCash;
    record.funding.corporate_cash_after = corporateCash +=
      record.stated_principal;
  }
  corporateCash += 6000 - 10000;
  for (
    const record of n.owned_current_records
      .complete_current_shareholder_debt_inventory
  ) {
    for (const payment of record.repayments) {
      payment.corporate_cash_before = corporateCash;
      payment.corporate_cash_after = corporateCash -= payment.principal_amount;
      payment.shareholder_cash_before = shareholderCash;
      payment.shareholder_cash_after = shareholderCash +=
        payment.principal_amount;
    }
  }
  return k;
}
export const ownedDebtCases = [{
  id: "new_note",
  capital: true,
  repayments: [],
  second: false,
  allowed: 3500,
  carry: 500,
}, {
  id: "partial_repayment",
  capital: true,
  repayments: [400],
  second: false,
  allowed: 3100,
  carry: 900,
}, {
  id: "two_repayments",
  capital: false,
  repayments: [200, 200],
  second: false,
  allowed: 2100,
  carry: 1900,
}, {
  id: "two_notes",
  capital: false,
  repayments: [400],
  second: true,
  allowed: 2900,
  carry: 1100,
}];

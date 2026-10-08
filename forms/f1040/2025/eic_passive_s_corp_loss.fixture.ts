import { passiveK1Inputs, passiveK1Item } from "./eic_passive_k1.fixture.ts";
import type { PassiveSCorpLossK1Facts } from "../nodes/inputs/k1_s_corp_passive_loss_source.ts";

// Constructed record contract, not an authenticated corporate return or K-1.
export function passiveSCorpLossRecords(cashAmount = 6000) {
  const owner = "111223333", ein = "123456789";
  const identity = { shareholder_ssn: owner, corporation_ein: ein };
  const source: any = {
    ...identity,
    tax_year: 2025,
    evidence_kind: "current_record_contract_not_external_authentication",
    corporation_name: "Example services",
    activity_id: "2025-S-123456789-111223333",
    activity_name: "Example services activity",
    organization: {
      corporation_ein: ein,
      formed_on: "2025-01-01",
      trade_started_on: "2025-01-02",
      organization_record_reference: "Organization document",
      activity_statement_reference: "Complete sole activity statement",
      predecessor_or_preexisting_activity: false,
      grouped_with_other_activity: false,
      sole_activity: "domestic_nonrental_ordinary_trade",
    },
    stock_subscription: {
      ...identity,
      stock_register_reference: "First issued stock register",
      subscription_reference: "Original cash subscription",
      issued_on: "2025-01-01",
      shares_issued: cashAmount,
      cash_price_per_share: 1,
      all_outstanding_shares_owned: true,
      cash_payment: {
        payer_ssn: owner,
        payee_ein: ein,
        paid_on: "2025-01-01",
        transfer_reference: "Stock subscription transfer",
        shareholder_bank_reference: "Personal cash bank record",
        corporate_bank_reference: "Corporate cash bank record",
        shareholder_cash_before: 10000,
        shareholder_cash_after: 10000 - cashAmount,
        corporate_cash_before: 0,
        corporate_cash_after: cashAmount,
        shareholder_bank_debit: cashAmount,
        corporate_bank_credit: cashAmount,
        funds_origin: "unborrowed_personal_cash",
      },
    },
    complete_stock_and_at_risk_review: {
      stock_transactions_record_reference:
        "Complete stock transaction inventory",
      debt_inventory_record_reference: "Complete shareholder debt inventory",
      loss_protection_review_reference:
        "Complete loss protection agreements review",
      no_other_stock_basis_changes: true,
      no_shareholder_debt_or_guarantees: true,
      no_nonrecourse_or_related_person_funding: true,
      no_reimbursement_stop_loss_or_other_protection: true,
      no_distributions_or_at_risk_withdrawals: true,
      no_prior_basis_at_risk_passive_or_qbi_losses: true,
      no_section1367g_election: true,
    },
    participation: {
      ...identity,
      participation_workpaper_reference:
        "Owner and spouse participation workpaper",
      marital_status_record_reference: "Full year marital status record",
      spouse: { status: "unmarried_all_year" },
      monthly_service_records: Array.from({ length: 12 }, (_, i) => ({
        month: i + 1,
        owner_service_hours: 0,
        spouse_service_hours: 0,
        service_record_reference: `Month ${i + 1} complete service inventory`,
      })),
      nonowner_operator: {
        operator_tin: "222334444",
        service_record_reference: "Independent operator annual services",
        annual_service_hours: 800,
      },
    },
    annual_ordinary_tax_account: {
      corporation_ein: ein,
      tax_year: 2025,
      account_reference: "Complete accrual ordinary tax account",
      accounting_method: "accrual",
      taxable_receipts: [{
        earned_on: "2025-06-01",
        source_reference: "Ordinary service invoice",
        taxable_amount: 1000,
      }],
      deductible_incurred_operating_costs: [{
        incurred_on: "2025-06-01",
        source_reference: "Deductible ordinary accrued expenses ledger",
        deductible_amount: 5000,
      }],
      no_other_ordinary_book_tax_adjustments: true,
      no_separately_stated_income_deductions_or_credits: true,
    },
    issued_k1: {
      ...identity,
      tax_year: 2025,
      shareholder_name_as_on_k1: "Alex Example",
      corporation_name: "Example services",
      document_reference: "Issued current K1 record",
      box1_ordinary_loss: 4000,
      section199a_statement_reference:
        "Issued domestic non SSTB QBI loss statement",
      qualified_domestic_non_sstb_ordinary_loss: 4000,
      no_other_qbi_items_or_owner_adjustments: true,
    },
  };
  const k1: PassiveSCorpLossK1Facts = {
    corporation_ein: ein,
    corporation_name: "Example services",
    recipient_tin: owner,
    source_document_reference: source.issued_k1.document_reference,
    box1_ordinary_business: -4000,
    eic_passive_activity_review: {
      recipient_tin: owner,
      box1: "passive",
      activity_statement_reference:
        source.organization.activity_statement_reference,
      participation_workpaper_reference:
        source.participation.participation_workpaper_reference,
    },
  };
  return { source, k1 };
}

export function passiveSCorpLossReturnInputs(
  cash: number,
  income: number,
  investment = 11950,
) {
  const i = passiveK1Inputs();
  delete i.f4835;
  delete i.k1_partnership;
  const { source, k1 } = passiveSCorpLossRecords(cash);
  i.k1_s_corp = [{ ...k1, first_year_passive_loss_source: source }];
  if (income > 0) {
    i.k1_partnership = [
      passiveK1Item("partnership", "box2", income, "111223333", "987654321"),
    ];
  }
  i.f1099int[0].box8 = investment - Math.max(0, income - Math.min(cash, 4000));
  return i;
}

export function passiveSCorpJointLossReturnInputs(
  spouseOwned: boolean,
  investment = 11950,
) {
  const i = passiveSCorpLossReturnInputs(1000, 3000, investment);
  Object.assign(i.general, {
    filing_status: "mfj",
    spouse_first_name: "Casey",
    spouse_last_name: "Example",
    spouse_ssn: "444556666",
    spouse_dob: "1985-07-01",
    spouse_ssn_valid_for_employment: true,
    spouse_ssn_issued_before_due_date: true,
    spouse_tin_issued_by_due_date: true,
    spouse_can_be_claimed_as_dependent: false,
  });
  i.general.eic_tax_residency_review.spouse_status_record_reference =
    "Spouse all-year residency record";
  i.w2[0].box1_wages = 10000;
  const item = i.k1_s_corp[0], source = item.first_year_passive_loss_source;
  const owner = spouseOwned ? "444556666" : "111223333";
  for (
    const row of [
      source,
      source.stock_subscription,
      source.participation,
      source.issued_k1,
    ]
  ) row.shareholder_ssn = owner;
  source.stock_subscription.cash_payment.payer_ssn = owner;
  source.issued_k1.shareholder_name_as_on_k1 = spouseOwned
    ? "Casey Example"
    : "Alex Example";
  source.participation.spouse = {
    status: "married_same_spouse_all_year",
    spouse_ssn: spouseOwned ? "111223333" : "444556666",
    spouse_participation_record_reference:
      "Other spouse nonparticipation records",
  };
  item.recipient_tin = item.eic_passive_activity_review.recipient_tin = owner;
  return i;
}

/** Combined current source contract; references are constructed, not authenticated bytes. */
export function passiveSCorpCombinedLossReturnInputs(
  cash: number,
  income: number,
  investment = 11950,
  jointOwner?: "primary" | "spouse",
) {
  const i = jointOwner
    ? passiveSCorpJointLossReturnInputs(jointOwner === "spouse", investment)
    : passiveSCorpLossReturnInputs(cash, income, investment);
  i.k1_partnership = [
    passiveK1Item(
      "partnership",
      "box2",
      income * 0.4,
      "111223333",
      "987654321",
    ),
    passiveK1Item(
      "partnership",
      "box3",
      income * 0.6,
      jointOwner ? "444556666" : "111223333",
      "876543219",
    ),
  ];
  i.f1099int[0].box8 = investment - Math.max(0, income - Math.min(cash, 4000)) -
    5;
  i.f1099int[0].box1 = 3;
  i.f1099div = [{
    payerName: "Constructed dividend issuer",
    payerTin: "876543210",
    source_document_reference: "Constructed 2025 dividend copy",
    account_number: "DIV-2025",
    recipient_tin: jointOwner ? "444556666" : "111223333",
    isNominee: false,
    box11: false,
    box1a: 2,
  }];
  return i;
}

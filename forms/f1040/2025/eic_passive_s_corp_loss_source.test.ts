import { assertEquals, assertThrows } from "@std/assert";
import {
  firstYearPassiveSCorpLossStages,
  type PassiveSCorpLossK1Facts,
} from "../nodes/inputs/k1_s_corp_passive_loss_source.ts";

// Constructed record contract, not an authenticated corporate return or K-1.
function records(cashAmount = 6000) {
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

for (
  const [cash, allowed, suspended, ending] of [
    [1000, 1000, 3000, 0],
    [4000, 4000, 0, 0],
    [6000, 4000, 0, 2000],
  ]
) {
  Deno.test(`Passive S-corporation loss applies cash basis ${cash} before at-risk and PAL`, () => {
    const { source, k1 } = records(cash);
    const before = structuredClone(source);
    const stages = firstYearPassiveSCorpLossStages(source, k1);
    assertEquals(stages.basisAllowedLoss, allowed);
    assertEquals(stages.basisSuspendedLoss, suspended);
    assertEquals(stages.endingStockBasis, ending);
    assertEquals(stages.atRiskAmountBeforeLoss, cash);
    assertEquals(stages.atRiskAllowedLoss, allowed);
    assertEquals(stages.atRiskSuspendedLoss, 0);
    assertEquals(stages.passiveLossBefore8582, allowed);
    assertEquals(stages.qualifiedOrdinaryLossBefore8582, allowed);
    assertEquals(stages.externalAuthenticationVerified, false);
    assertEquals(stages.filingRouteAdmitted, false);
    assertEquals(source, before);
  });
}

Deno.test("Passive S-corporation records include the nonowner spouse even when the spouse owns no stock", () => {
  const { source, k1 } = records();
  source.participation.spouse = {
    status: "married_same_spouse_all_year",
    spouse_ssn: "444556666",
    spouse_participation_record_reference:
      "Nonowner spouse complete services record",
  };
  assertEquals(
    firstYearPassiveSCorpLossStages(source, k1).passiveLossBefore8582,
    4000,
  );
  source.participation.monthly_service_records[6].spouse_service_hours = 500;
  assertThrows(() => firstYearPassiveSCorpLossStages(source, k1));
});

Deno.test("A spouse operating the activity cannot be represented as an independent nonowner operator", () => {
  const { source, k1 } = records();
  source.participation.spouse = {
    status: "married_same_spouse_all_year",
    spouse_ssn: "222334444",
    spouse_participation_record_reference: "Spouse complete services record",
  };
  assertThrows(() => firstYearPassiveSCorpLossStages(source, k1));
});

Deno.test("Cash share-price multiplication cannot create an inexact basis amount", () => {
  const { source, k1 } = records();
  source.stock_subscription.shares_issued = Number.MAX_SAFE_INTEGER;
  source.stock_subscription.cash_price_per_share = 2;
  assertThrows(() => firstYearPassiveSCorpLossStages(source, k1));
});

const mutations: [string, (s: any, k: any) => void][] = [
  [
    "wrong stock owner",
    (s) => s.stock_subscription.shareholder_ssn = "444556666",
  ],
  [
    "wrong corporate bank recipient",
    (s) => s.stock_subscription.cash_payment.payee_ein = "987654321",
  ],
  ["wrong K1 recipient", (_, k) => k.recipient_tin = "444556666"],
  [
    "wrong issued statement identity",
    (s) => s.issued_k1.corporation_ein = "987654321",
  ],
  [
    "wrong K1 statement reference",
    (_, k) => k.source_document_reference = "Different K1",
  ],
  [
    "different classification",
    (_, k) => k.eic_passive_activity_review.box1 = "nonpassive",
  ],
  [
    "missing bank debit",
    (s) => delete s.stock_subscription.cash_payment.shareholder_bank_debit,
  ],
  [
    "bank cash mismatch",
    (s) => s.stock_subscription.cash_payment.shareholder_cash_after += 1,
  ],
  [
    "share price mismatch",
    (s) => s.stock_subscription.cash_price_per_share = 2,
  ],
  [
    "borrowed stock funding",
    (s) => s.stock_subscription.cash_payment.funds_origin = "borrowed_cash",
  ],
  [
    "loss protection",
    (s) =>
      s.complete_stock_and_at_risk_review
        .no_reimbursement_stop_loss_or_other_protection = false,
  ],
  [
    "additional basis transactions",
    (s) =>
      s.complete_stock_and_at_risk_review.no_other_stock_basis_changes = false,
  ],
  [
    "prior loss history",
    (s) =>
      s.complete_stock_and_at_risk_review
        .no_prior_basis_at_risk_passive_or_qbi_losses = false,
  ],
  [
    "predecessor activity",
    (s) => s.organization.predecessor_or_preexisting_activity = true,
  ],
  ["prior formation year", (s) => s.organization.formed_on = "2024-12-31"],
  ["late stock issue", (s) => s.stock_subscription.issued_on = "2025-02-01"],
  [
    "pre-start accrued expense",
    (s) =>
      s.annual_ordinary_tax_account.deductible_incurred_operating_costs[0]
        .incurred_on = "2025-01-01",
  ],
  [
    "missing participation month",
    (s) => s.participation.monthly_service_records.pop(),
  ],
  [
    "duplicate participation month",
    (s) => s.participation.monthly_service_records[1].month = 1,
  ],
  [
    "owner services",
    (s) => s.participation.monthly_service_records[0].owner_service_hours = 1,
  ],
  [
    "owner is operator",
    (s) => s.participation.nonowner_operator.operator_tin = s.shareholder_ssn,
  ],
  [
    "source reference reuse",
    (s) =>
      s.stock_subscription.cash_payment.corporate_bank_reference =
        s.stock_subscription.cash_payment.shareholder_bank_reference,
  ],
  [
    "ordinary account loss mismatch",
    (s) =>
      s.annual_ordinary_tax_account.taxable_receipts[0].taxable_amount += 1,
  ],
  [
    "issued QBI mismatch",
    (s) => s.issued_k1.qualified_domestic_non_sstb_ordinary_loss -= 1,
  ],
  ["fractional loss", (_, k) => k.box1_ordinary_business = -4000.5],
  [
    "unsafe aggregate",
    (s) =>
      s.annual_ordinary_tax_account.taxable_receipts.push({
        earned_on: "2025-10-01",
        source_reference: "Huge receipts",
        taxable_amount: Number.MAX_SAFE_INTEGER,
      }),
  ],
  ["unreviewed extra source fields", (s) => s.basis_override = 100000],
];
for (const [name, mutate] of mutations) {
  Deno.test(`Passive S-corporation source rejects ${name}`, () => {
    const { source, k1 } = records();
    mutate(source, k1);
    assertThrows(() => firstYearPassiveSCorpLossStages(source, k1));
  });
}

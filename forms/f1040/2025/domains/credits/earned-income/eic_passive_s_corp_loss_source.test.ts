import { assertEquals, assertThrows } from "@std/assert";
import {
  firstYearPassiveSCorpLossStages,
} from "../../../../nodes/inputs/k1_s_corp_passive_loss_source.ts";

import { passiveSCorpLossRecords as records } from "./eic_passive_s_corp_loss.fixture.ts";

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

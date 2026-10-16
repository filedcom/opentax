import { assertEquals, assertThrows } from "@std/assert";
import { calculateHsaCurrentContributions2026 as calculate } from "./hsa-current-contributions.ts";
import { hsaLimits2026 } from "./hsa-contribution-limits.fixture.ts";
import type { HsaContributionLimits2026 } from "./hsa-contribution-limits.ts";
import { FilingStatus } from "../../nodes/types.ts";
import { hsaCurrentContributions } from "../../nodes/intermediate/forms/adjustments/health/form8889/current-contributions.ts";
import {
  hsaExactAmount,
  hsaExactArithmetic as math,
} from "../../nodes/intermediate/forms/adjustments/health/form8889/exact-amount.ts";

function amounts(
  s: HsaContributionLimits2026,
  personal: number,
  employer: number,
) {
  const a = s.claim.accounts[0];
  // Leave the $500 prior-year employer payment and its current W-2 reporting.
  a.receipts[1].amount = employer;
  a.receipts[2].amount = personal;
  a.receipts = a.receipts.slice(0, 3).filter((r) => r.amount > 0);
  s.wage_sources[0].box12_entries![0].amount = employer + 500;
  a.form5498sa.box2_calendar_year_contributions = employer + personal + 500;
  a.form5498sa.box3_following_year_contributions_for_2026 = 0;
}
function decemberOnly(s: HsaContributionLimits2026) {
  for (const owner of s.household_eligibility.owners) {
    owner.plans[0].effective_from = "2026-12-01";
    for (const m of owner.months.slice(0, 11)) m.plan_references = [];
  }
}
Deno.test("2026 HSA current Part I derives personal and payroll amounts from reconciled dated funding", () => {
  const s = hsaLimits2026(), before = structuredClone(s);
  const r = calculate(s).owners[0].current_contributions;
  assertEquals(r.filed_current_lines, {
    line2: 1500,
    line8: 4400,
    line9: 1250,
    line10: 0,
    line11: 1250,
    line12: 3150,
    line13_before_prior_excess: 1500,
  });
  assertEquals(
    r.before_withdrawals_and_prior_excess.unusedPersonalLimit,
    hsaExactAmount(1650, 1),
  );
  assertEquals(s, before);
});
Deno.test("2026 HSA separates employer and personal gross excess instead of deducting payroll", () => {
  const s = hsaLimits2026();
  amounts(s, 700, 5000);
  const r = calculate(s).owners[0].current_contributions;
  assertEquals(
    r.before_withdrawals_and_prior_excess.employerExcess,
    hsaExactAmount(600, 1),
  );
  assertEquals(
    r.before_withdrawals_and_prior_excess.personalExcess,
    hsaExactAmount(700, 1),
  );
  assertEquals(r.filed_current_lines.line13_before_prior_excess, 0);
  assertEquals("additional_tax" in r, false);
  assertEquals("employer_excess_income" in r, false);
});
Deno.test("2026 HSA personal excess retains a cent even when the printed deduction exhausts printed contributions", () => {
  const s = hsaLimits2026();
  amounts(s, 3400.01, 1000);
  const r = calculate(s).owners[0].current_contributions;
  assertEquals(r.filed_current_lines.line2, 3400);
  assertEquals(r.filed_current_lines.line13_before_prior_excess, 3400);
  assertEquals(
    r.before_withdrawals_and_prior_excess.personalExcess,
    hsaExactAmount(1, 100),
  );
});
Deno.test("2026 HSA employer excess retains a cent without creating a personal deduction", () => {
  const s = hsaLimits2026();
  amounts(s, 0, 4400.01);
  const r = calculate(s).owners[0].current_contributions;
  assertEquals(r.filed_current_lines.line9, 4400);
  assertEquals(
    r.before_withdrawals_and_prior_excess.employerExcess,
    hsaExactAmount(1, 100),
  );
  assertEquals(r.filed_current_lines.line13_before_prior_excess, 0);
});
Deno.test("2026 HSA subtracts source cents from exact monthly fractions before projecting lines", () => {
  const s = hsaLimits2026(true);
  decemberOnly(s);
  amounts(s, 400, 100.49);
  const r = calculate(s).owners[0].current_contributions;
  assertEquals(
    r.before_withdrawals_and_prior_excess.currentPersonalDeduction,
    hsaExactAmount(79228, 300),
  );
  assertEquals(
    r.before_withdrawals_and_prior_excess.personalExcess,
    hsaExactAmount(40772, 300),
  );
  // Exact deduction rounds to 264, but filed line 12 is filed 365 - 100 = 265.
  assertEquals(r.filed_current_lines.line12, 265);
  assertEquals(r.filed_current_lines.line13_before_prior_excess, 265);
});
Deno.test("2026 HSA last-month exposure follows actual funding rather than the unused full-year limit", () => {
  const s = hsaLimits2026();
  decemberOnly(s);
  s.limit_review.basis = "last_month";
  s.limit_review.last_month_testing_obligation_acknowledged = true;
  amounts(s, 200, 100);
  assertEquals(
    calculate(s).owners[0].current_contributions
      .gross_contribution_last_month_exposure,
    hsaExactAmount(0, 1),
  );
  amounts(s, 700, 100);
  assertEquals(
    calculate(s).owners[0].current_contributions
      .gross_contribution_last_month_exposure,
    hsaExactAmount(1300, 3),
  );
  amounts(s, 5000, 100);
  assertEquals(
    calculate(s).owners[0].current_contributions
      .gross_contribution_last_month_exposure,
    hsaExactAmount(12100, 3),
  );
});
Deno.test("2026 HSA joint owner deductions cannot consume the other owner's allocation", () => {
  const s = hsaLimits2026(true);
  amounts(s, 5000, 0);
  const r = calculate(s);
  assertEquals(
    r.owners.map((o) =>
      o.current_contributions.filed_current_lines.line13_before_prior_excess
    ),
    [4375, 0],
  );
  assertEquals(
    r.owners[0].current_contributions.before_withdrawals_and_prior_excess
      .personalExcess,
    hsaExactAmount(625, 1),
  );
  assertEquals(
    r.owners[1].current_contributions.before_withdrawals_and_prior_excess
      .unusedPersonalLimit,
    hsaExactAmount(4375, 1),
  );
});
Deno.test("2026 HSA separate return excludes supporting spouse account calculations from the return workpaper", () => {
  const s = hsaLimits2026(true);
  s.filing_status = FilingStatus.MFS;
  const spouse = s.claim.accounts.pop()!;
  s.limit_review.separate_return_spouse_accounts = {
    record_reference: "spouse-inventory",
    complete_spouse_hsa_account_inventory_verified: true,
    accounts: [{
      trustee_tin: spouse.trustee_tin,
      account_number: spouse.account_number,
      source_document_reference: "spouse-statement",
    }],
  };
  assertEquals(calculate(s).owners.map((o) => o.owner_tin), [s.taxpayer_ssn]);
});
Deno.test("2026 HSA cannot treat a reported IRA deposit as an already qualified funding distribution", () => {
  const s = hsaLimits2026(), a = s.claim.accounts[0];
  a.receipts.push({
    kind: "ira_funding_transfer",
    record_reference: "ira-transfer",
    custodian_transaction_identifier: "tx-ira",
    statement_reference: "ira-ledger",
    received_on: "2026-06-01",
    amount: 100,
    source_account_or_payment_reference: "ira-payment",
    originating_owner_tin: a.owner_tin,
    originating_ira_type: "traditional",
    ira_distribution_source_reference: "1099r",
    direct_trustee_transfer_verified: true,
  });
  a.form5498sa.box2_calendar_year_contributions += 100;
  assertThrows(() => calculate(s), Error, "tax-treatment reconciliation");
});
Deno.test("2026 HSA current calculation still rejects changed statement evidence and fractional cents", () => {
  for (const delta of [1, .001]) {
    const s = hsaLimits2026();
    s.claim.accounts[0].receipts[2].amount += delta;
    assertThrows(() => calculate(s));
  }
});
Deno.test("shared HSA contribution arithmetic reserves qualified funding before employer and personal amounts", () => {
  assertEquals(hsaCurrentContributions(4400, 1000, 2000, 3000), {
    employerAndFunding: 5000,
    remainingPersonalLimit: 0,
    currentPersonalDeduction: 0,
    personalExcess: 1000,
    employerExcess: 600,
    unusedPersonalLimit: 0,
  });
  assertEquals(hsaCurrentContributions(4400, 500, 1000, 1000), {
    employerAndFunding: 2000,
    remainingPersonalLimit: 2400,
    currentPersonalDeduction: 500,
    personalExcess: 0,
    employerExcess: 0,
    unusedPersonalLimit: 1900,
  });
});
Deno.test("HSA rational operations reduce large intermediate products before JSON serialization", () => {
  const a = hsaExactAmount(1, 9999991);
  assertEquals(math.add(a, a), hsaExactAmount(2, 9999991));
  assertEquals(
    math.subtractFloorZero(a, hsaExactAmount(2, 9999991)),
    hsaExactAmount(0, 1),
  );
  assertEquals(
    math.add(hsaExactAmount(1, 3), hsaExactAmount(1, 100)),
    hsaExactAmount(103, 300),
  );
  assertThrows(
    () =>
      math.add(
        hsaExactAmount(Number.MAX_SAFE_INTEGER, 1),
        hsaExactAmount(1, 1),
      ),
    Error,
    "JSON-safe",
  );
});

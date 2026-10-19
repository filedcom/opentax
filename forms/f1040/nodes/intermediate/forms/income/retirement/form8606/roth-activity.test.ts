import { test } from "bun:test";
import { assertEquals, assertThrows } from "@std/assert";
import { assertRothActivityTaxYear, reviewedRothActivity } from "./roth-activity.ts";

const account = {
  custodian_ein: "123456790",
  account_number: "ACCOUNT-ROTH",
};

function review(
  contributionYear: number,
  distributedOn: string,
  dateOfBirth = "1985-06-15",
) {
  const code = dateOfBirth < "1960-01-01" ? "T" : "J";
  return {
    owner_identity: {
      source_document_reference: "owner-birth-record",
      owner_ssn: "111223333",
      date_of_birth: dateOfBirth,
    },
    inventory: {
      source_document_reference: "owned-account-review",
      owner_ssn: "111223333",
      accounts: [account],
      all_owned_roth_iras_and_activity_included: true,
      all_owned_accounts_are_ordinary_roth_not_sep_or_simple: true,
      no_contributions_before_listed_inventory: true,
      no_prior_distributions_or_returned_contributions: true,
      no_conversions_or_qualified_plan_rollovers: true,
      no_inherited_accounts_or_transferred_basis: true,
      all_regular_contributions_eligible_no_excess_confirmed: true,
      no_other_current_roth_distribution: true,
      no_homebuyer_disaster_repayment_qcd_hsa_or_rollover: true,
    },
    contributions: [{
      form5498: {
        source_document_reference: `issued-5498-${contributionYear}`,
        tax_year: contributionYear,
        owner_ssn: "111223333",
        ...account,
        roth_ira_confirmed: true,
        box10_roth_contributions: 5_000,
        box2_rollover_contributions: 0,
        box3_roth_conversion_amount: 0,
      },
      receipts: [{
        source_document_reference: `receipt-${contributionYear}`,
        owner_ssn: "111223333",
        ...account,
        designated_tax_year: contributionYear,
        received_on: `${contributionYear}-02-01`,
        amount: 5_000,
      }],
    }],
    payment: {
      source_document_reference: "custodian-payment",
      owner_ssn: "111223333",
      ...account,
      distribution_reference: "payment-1",
      distributed_on: distributedOn,
      gross_distribution: 7_000,
      distribution_code: code,
    },
    form1099r_source_document_reference: "completed-4852",
  };
}

test("TY2026 Roth activity reads a 2026 contribution and payment", () => {
  const facts = reviewedRothActivity(review(2026, "2026-10-01"));
  assertEquals(facts.basis, 5_000);
  assertEquals(facts.taxable, 2_000);
  assertRothActivityTaxYear(review(2026, "2026-10-01"), 2026);
  assertThrows(
    () => assertRothActivityTaxYear(review(2025, "2025-10-01"), 2026),
    Error,
    "must be a 2026 distribution",
  );
});

test("Roth activity rejects a contribution year after the payment year", () => {
  assertThrows(
    () => reviewedRothActivity(review(2027, "2026-10-01")),
    Error,
    "contribution before payment",
  );
});

// IRC 408A(d)(2)(B): a 2026 distribution after age 59 1/2 is qualified when
// the first contribution year is 2021 or earlier.
test("Roth five-year period is counted from the payment's year", () => {
  assertEquals(
    reviewedRothActivity(review(2021, "2026-10-01", "1950-01-01")).qualified,
    true,
  );
  assertEquals(
    reviewedRothActivity(review(2022, "2026-10-01", "1950-01-01")).qualified,
    false,
  );
  assertEquals(
    reviewedRothActivity(review(2020, "2025-10-01", "1950-01-01")).qualified,
    true,
  );
  assertEquals(
    reviewedRothActivity(review(2021, "2025-10-01", "1950-01-01")).qualified,
    false,
  );
});

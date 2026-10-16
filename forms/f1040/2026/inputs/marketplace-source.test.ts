import { assertEquals, assertThrows } from "@std/assert";
import { FilingStatus } from "../../nodes/types.ts";
import { calculateForm8962_2026 } from "../form8962.ts";
import {
  calculateMarketplaceSources2026,
  type MarketplaceSource2026,
} from "./marketplace-source.ts";
import {
  marketplaceCopy2026,
  marketplaceSource2026,
} from "./marketplace.fixture.ts";

function prepare(raw = marketplaceSource2026()) {
  return calculateMarketplaceSources2026(raw);
}
function credit(source: MarketplaceSource2026, income = 62_600) {
  const {
    monthly_premiums,
    monthly_slcsps,
    monthly_aptcs,
    annual_premium,
    annual_slcsp,
    annual_aptc,
    annual_line11_eligible,
  } = prepare(source);
  return calculateForm8962_2026({
    monthly_premiums,
    monthly_slcsps,
    monthly_aptcs,
    annual_premium,
    annual_slcsp,
    annual_aptc,
    annual_line11_eligible,
    filing_status: FilingStatus.Single,
    household_size: 1,
    fpl_region: "contiguous",
    taxpayer_modified_agi: income,
    dependents_modified_agi: 0,
    dependent_income_complete: true,
  });
}

Deno.test("2026 Marketplace copies retain cents and reproduce the PTC cliff", () => {
  const raw = marketplaceSource2026(),
    held = structuredClone(raw),
    r = prepare(raw);
  assertEquals(r.monthly_premiums, Array(12).fill(416.67));
  assertEquals(r.annual_line11_eligible, true);
  assertEquals(r.current_document_references, ["marketplace-issued-1"]);
  assertEquals(r.source_input.claim.month_reviews.length, 12);
  assertEquals(credit(raw).schedule3.line9_premium_tax_credit, 765);
  assertEquals(
    credit(raw, 62_601).schedule2.line1a_excess_advance_premium,
    3_000,
  );
  assertEquals(raw, held);
});

Deno.test("2026 Marketplace chooses the corrected document and rejects stale review or lineage", () => {
  const original = marketplaceCopy2026("old"),
    corrected = marketplaceCopy2026("new");
  original.annual_aptc = 10; // Issuer error retained for history, corrected below.
  corrected.policy_number = original.policy_number;
  corrected.corrected_box_checked = true;
  corrected.supersedes_document_reference = original.source_document_reference;
  const raw = marketplaceSource2026([corrected]);
  raw.claim.copies.unshift(original);
  assertEquals(prepare(raw).current_document_references, ["new"]);
  assertEquals(prepare(raw).excluded_document_references, ["old"]);
  assertEquals(prepare(raw).annual_aptc, 3_000);
  const stale = structuredClone(raw);
  stale.claim.month_reviews[0].source_document_reference = "old";
  assertThrows(() => prepare(stale), Error, "each current-copy month");
  const wrong = structuredClone(raw);
  wrong.claim.copies[1].supersedes_document_reference = "different-copy";
  assertThrows(() => prepare(wrong), Error, "superseded statement");
});

Deno.test("2026 Marketplace rejects ambiguous current and corrected copies", () => {
  const raw = marketplaceSource2026();
  const duplicate = {
    ...raw.claim.copies[0],
    source_document_reference: "duplicate",
  };
  assertThrows(
    () =>
      prepare({
        ...raw,
        claim: { ...raw.claim, copies: [...raw.claim.copies, duplicate] },
      }),
    Error,
    "repeats a current",
  );
  duplicate.corrected_box_checked = true;
  duplicate.supersedes_document_reference = "marketplace-issued-1";
  const correctedAgain = {
    ...duplicate,
    source_document_reference: "another-correction",
  };
  assertThrows(
    () =>
      prepare({
        ...raw,
        claim: { ...raw.claim, copies: [duplicate, correctedAgain] },
      }),
    Error,
    "ambiguous corrected",
  );
});

Deno.test("2026 Marketplace VOID copies remove the original and its advance payments", () => {
  const raw = marketplaceSource2026(), original = raw.claim.copies[0];
  raw.claim.copies.push({
    ...original,
    source_document_reference: "void-notice",
    void_box_checked: true,
    voids_document_reference: original.source_document_reference,
  });
  raw.claim.month_reviews = [];
  const r = prepare(raw);
  assertEquals(r.current_document_references, []);
  assertEquals(r.annual_aptc, 0);
  assertEquals(r.annual_line11_eligible, false);
  assertEquals(credit(raw).fields, { filing_required: false });
  const wrong = structuredClone(raw);
  wrong.claim.copies[1].policy_number = "unrelated";
  assertThrows(() => prepare(wrong), Error, "same policy");
});

Deno.test("2026 Marketplace combines enrollment and advances but counts same-state SLCSP once", () => {
  const raw = marketplaceSource2026([
    marketplaceCopy2026("one"),
    marketplaceCopy2026("two"),
  ]);
  const r = prepare(raw);
  assertEquals(r.annual_premium, 10_000.08);
  assertEquals(r.annual_slcsp, 9_999.96);
  assertEquals(r.annual_aptc, 6_000);
  assertEquals(credit(raw).schedule2.line1a_excess_advance_premium, 2_235);
  raw.claim.copies[1].monthly_slcsps = Array(12).fill(900);
  raw.claim.copies[1].annual_slcsp = 10_800;
  raw.claim.month_reviews.filter((r) => r.source_document_reference === "two")
    .forEach((r) => r.applicable_slcsp.amount = 900);
  assertThrows(() => prepare(raw), Error, "same-state policies disagree");
});

Deno.test("2026 Marketplace state benchmarks cover the entire eligible family", () => {
  const a = marketplaceCopy2026("one"),
    b = marketplaceCopy2026("two", "400001045");
  const sameState = marketplaceSource2026([a, b]);
  assertEquals(prepare(sameState).annual_slcsp, 9_999.96);
  sameState.claim.month_reviews[0].applicable_slcsp.coverage_family_tins.pop();
  assertThrows(() => prepare(sameState), Error, "complete eligible family");
  b.coverage_state = "AK";
  const different = marketplaceSource2026([a, b]);
  assertEquals(prepare(different).annual_slcsp, 19_999.92);
  const overlap = marketplaceSource2026([a, {
    ...b,
    recipient_ssn: a.recipient_ssn,
    covered_individuals: a.covered_individuals,
  }]);
  assertThrows(() => prepare(overlap), Error, "same-person interstate overlap");
});

Deno.test("2026 Marketplace no-advance and mixed-advance months require full payment", () => {
  const copy = marketplaceCopy2026();
  copy.monthly_aptcs = [...Array(6).fill(0), ...Array(6).fill(250)];
  copy.annual_aptc = 1_500;
  const raw = marketplaceSource2026([copy]);
  assertEquals(prepare(raw).annual_aptc, 1_500);
  assertEquals(credit(raw).schedule3.line9_premium_tax_credit, 2_265);
  raw.claim.month_reviews[0].premium_payment.amount -= 0.01;
  assertThrows(() => prepare(raw), Error, "full premium payment");
});

Deno.test("2026 Marketplace payment comparisons use cents without floating-point underpayment", () => {
  const copy = marketplaceCopy2026();
  copy.monthly_premiums = Array(12).fill(0.8);
  copy.annual_premium = 9.6;
  copy.monthly_aptcs = Array(12).fill(0.7);
  copy.annual_aptc = 8.4;
  const raw = marketplaceSource2026([copy]);
  assertEquals(raw.claim.month_reviews[0].premium_payment.amount, 0.1);
  assertEquals(prepare(raw).annual_premium, 9.6);
});

Deno.test("2026 Marketplace payment deadline and review chronology use the actual coverage year", () => {
  const raw = marketplaceSource2026();
  raw.claim.reviewed_on = "2027-04-20";
  raw.claim.month_reviews[0].premium_payment.paid_on = "2027-04-15";
  raw.claim.month_reviews[0].coverage_eligibility_review.reviewed_on =
    "2027-04-15";
  prepare(raw);
  raw.claim.month_reviews[0].premium_payment.paid_on = "2027-04-16";
  raw.claim.month_reviews[0].coverage_eligibility_review.reviewed_on =
    "2027-04-16";
  assertThrows(() => prepare(raw), Error, "full premium payment");
});

Deno.test("2026 Marketplace missing benchmarks require a retained determination", () => {
  const copy = marketplaceCopy2026();
  copy.monthly_slcsps = Array(12).fill(0);
  copy.annual_slcsp = 0;
  copy.monthly_aptcs = Array(12).fill(0);
  copy.annual_aptc = 0;
  const raw = marketplaceSource2026([copy]);
  for (const row of raw.claim.month_reviews) {
    row.applicable_slcsp.amount = 833.33;
    row.applicable_slcsp.basis = "marketplace_determination";
    row.applicable_slcsp.determination = {
      reason: "no_aptc",
      document_reference: `marketplace-lookup-${row.month}`,
      document_sha256: "a".repeat(64),
      determined_on: "2026-01-01",
    };
  }
  assertEquals(prepare(raw).annual_slcsp, 9_999.96);
  delete raw.claim.month_reviews[0].applicable_slcsp.determination;
  assertThrows(() => prepare(raw), Error, "dated determination");
});

Deno.test("2026 Marketplace changing coverage family requires monthly calculation", () => {
  const copy = marketplaceCopy2026();
  copy.covered_individuals.push({
    individual_tin: "400001045",
    enrolled_from: "2026-07-01",
    enrolled_through: "2026-12-31",
  });
  const raw = marketplaceSource2026([copy]);
  assertEquals(prepare(raw).annual_line11_eligible, false);
  raw.claim.month_reviews[0].coverage_eligibility_review.individuals.push(
    raw.claim.month_reviews[6].coverage_eligibility_review.individuals[1],
  );
  assertThrows(() => prepare(raw), Error, "persons disagree");
});

Deno.test("2026 Marketplace rejects incomplete, duplicate, stale-year and other-family source facts", () => {
  const mutations: Array<(raw: MarketplaceSource2026) => void> = [
    (r) => r.claim.month_reviews.pop(),
    (r) => r.claim.month_reviews.push(r.claim.month_reviews[0]),
    (r) => {
      r.tax_family_tins = ["999999999"];
    },
    (r) => {
      r.claim.copies[0].annual_aptc += 0.01;
    },
    (r) => {
      r.claim.month_reviews[1].premium_payment.reference =
        r.claim.month_reviews[0].premium_payment.reference;
    },
    (r) => {
      r.claim.month_reviews[0].coverage_eligibility_review.tax_year =
        2025 as 2026;
    },
    (r) => {
      r.claim.copies[0].tax_year = 2025 as 2026;
    },
    (r) => {
      r.claim.month_reviews[0].coverage_eligibility_review.individuals[0]
        .employer_sponsored_mec_enrolled = true as false;
    },
    (r) => {
      r.claim.copies[0].covered_individuals[0].enrolled_from = "2026-01-15";
    },
    (r) => {
      r.claim.month_reviews[0].applicable_slcsp.amount += 1;
    },
    (r) => {
      r.claim.month_reviews[0].applicable_slcsp.reviewed_on = "2025-12-31";
    },
  ];
  for (const change of mutations) {
    const raw = marketplaceSource2026();
    change(raw);
    assertThrows(() => prepare(raw));
  }
});

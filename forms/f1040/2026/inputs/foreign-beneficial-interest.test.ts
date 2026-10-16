import { assert, assertEquals, assertThrows } from "@std/assert";
import {
  type ForeignAssetSource2026,
  prepareForeignAssets2026,
} from "./foreign-assets-source.ts";
import { foreignBeneficialFixture2026 } from "./foreign-beneficial-interest.fixture.ts";
import {
  foreignAssetEvidence2026 as evidence,
  foreignAssetsFixture2026,
} from "./foreign-assets.fixture.ts";
import { FilingStatus } from "../../nodes/types.ts";

Deno.test("2026 known foreign pension estate and deferred interests separate threshold peaks from year-end reported values", () => {
  for (
    const kind of [
      "foreign_pension",
      "foreign_estate",
      "foreign_deferred_compensation",
    ] as const
  ) {
    const s = foreignBeneficialFixture2026(kind), before = structuredClone(s);
    const r = prepareForeignAssets2026(s);
    assertEquals(s, before);
    assertEquals(r.threshold.maximum_usd_exact, "80000.00000000000");
    assertEquals(r.threshold.year_end_usd_exact, "55000.00000000000");
    assertEquals(r.threshold.filingRequired, true);
    assertEquals(r.summary.partII.otherMaximumValueUsd, 55000);
    assertEquals(r.asset_values[0].maximum_reported_dollars, 55000);
    assertEquals(r.asset_values[0].threshold_maximum_date, "2026-06-30");
    assertEquals(r.asset_values[0].reported_value_date, "2026-12-31");
    assertEquals(
      r.beneficial_interest_workpapers[0].reported_value_basis,
      "year_end_beneficial_interest",
    );
    assertEquals(r.requires_tax_item_return_binding, true);
    assertEquals(r.tax_items, []); // valuation distributions do not manufacture taxable income
    assertEquals(r.filing_ready, false);
    assertEquals(JSON.parse(JSON.stringify(r)).threshold, r.threshold);
  }
});

Deno.test("2026 unknown foreign pension estate and deferred values derive their fallback from actual cash and property distributions", () => {
  for (
    const kind of [
      "foreign_pension",
      "foreign_estate",
      "foreign_deferred_compensation",
    ] as const
  ) {
    const s = foreignBeneficialFixture2026(kind, false),
      r = prepareForeignAssets2026(s);
    assertEquals(r.threshold.maximum_usd_exact, "15000.00000000000");
    assertEquals(r.threshold.year_end_usd_exact, "15000.00000000000");
    assertEquals(r.threshold.filingRequired, false);
    assertEquals(r.summary.partII.otherMaximumValueUsd, 15000);
    assertEquals(
      r.beneficial_interest_workpapers[0].distributions_year_end_native,
      12000,
    );
    assertEquals(
      r.snapshots[0].values[0].valuation_basis,
      "beneficial_interest_fallback",
    );
    assertEquals(
      r.source_input.claim.valuation_snapshots[0].values[0].native_value,
      undefined,
    );
    s.claim.valuation_snapshots[0].values[0].native_value = 0;
    assertThrows(
      () => prepareForeignAssets2026(s),
      Error,
      "not an entered snapshot value",
    );
  }
});

Deno.test("2026 foreign trust reported value combines distributions and reviewed section 7520 rights separately from known FMV", () => {
  const s = foreignBeneficialFixture2026("foreign_trust_beneficiary"),
    r = prepareForeignAssets2026(s);
  assertEquals(r.threshold.maximum_usd_exact, "80000.00000000000");
  assertEquals(r.summary.partII.otherMaximumValueUsd, 52500);
  const w = r.beneficial_interest_workpapers[0];
  assertEquals(w.distributions_year_end_native, 12000);
  assertEquals(w.mandatory_rights_year_end_native, 30000);
  assertEquals(w.reported_maximum_native, 42000);
  assertEquals(w.reported_value_basis, "distributions_plus_mandatory_rights");
  assert(
    w.documents.some((d) =>
      d.document_reference === "section7520-year-end-valuation"
    ),
  );
});

Deno.test("2026 unknown foreign trust threshold uses distributions and mandatory rights without an invented portfolio balance", () => {
  const s = foreignBeneficialFixture2026("foreign_trust_beneficiary", false),
    r = prepareForeignAssets2026(s);
  assertEquals(r.threshold.maximum_usd_exact, "52500.00000000000");
  assertEquals(r.threshold.year_end_usd_exact, "52500.00000000000");
  assertEquals(r.threshold.filingRequired, true);
  assertEquals(r.asset_values[0].maximum_reported_dollars, 52500);
  assertEquals(
    r.beneficial_interest_workpapers[0].threshold_fallback_native,
    42000,
  );
});

Deno.test("2026 unknown zero-distribution foreign interests remain reportable assets when another account crosses the threshold", () => {
  for (
    const kind of ["foreign_trust_beneficiary", "foreign_pension"] as const
  ) {
    const s = foreignBeneficialFixture2026(kind, false),
      ordinary = foreignAssetsFixture2026();
    const b = s.claim.assets[0].beneficial_interest!;
    b.distributions = [];
    if (b.kind === "foreign_trust_beneficiary") {
      b.mandatory_distribution_rights = {
        kind: "none",
        governing_instrument_document: evidence("no-mandatory-rights"),
        no_mandatory_distribution_right_at_year_end_verified: true,
      };
    }
    s.claim.assets.push(ordinary.claim.assets[0]);
    s.claim.valuation_snapshots.forEach((snapshot, i) =>
      snapshot.values.push(ordinary.claim.valuation_snapshots[i].values[0])
    );
    const r = prepareForeignAssets2026(s);
    assertEquals(r.threshold.filingRequired, true);
    assertEquals(r.summary.partI.depositAccountCount, 1);
    assertEquals(r.summary.partII.otherAssetCount, 1);
    assertEquals(r.summary.partII.otherMaximumValueUsd, 0);
    assertEquals(r.requires_tax_item_return_binding, false);
  }
});

Deno.test("2026 beneficial-interest distributions retain cents before the year-end FX conversion and whole-dollar display", () => {
  const s = foreignBeneficialFixture2026("foreign_pension", false),
    b = s.claim.assets[0].beneficial_interest!;
  b.distributions = [0, 1].map((n) => ({
    kind: "cash",
    record_reference: `small-distribution-${n}`,
    received_on: "2026-06-01",
    recipient_tin: s.taxpayer_ssn,
    currency_code: "CHF",
    amount_native: 0.20,
    receipt_document: evidence(`small-receipt-${n}`),
  }));
  const r = prepareForeignAssets2026(s);
  assertEquals(r.threshold.maximum_usd_exact, "0.50000000000");
  assertEquals(r.summary.partII.otherMaximumValueUsd, 1);
});

Deno.test("2026 unknown terminated pension retains annual distribution reporting while year-end threshold value is zero", () => {
  const s = foreignBeneficialFixture2026("foreign_pension", false);
  s.claim.assets[0].closed_or_disposed_date = "2026-12-31";
  const r = prepareForeignAssets2026(s);
  assertEquals(r.threshold.maximum_usd_exact, "15000.00000000000");
  assertEquals(r.threshold.year_end_usd_exact, "0.00000000000");
  assertEquals(r.summary.partII.otherMaximumValueUsd, 15000);
  assertEquals(r.summary.partII.anyAssetOpenedOrClosed, true);
  s.claim.valuation_snapshots.shift();
  assertThrows(
    () => prepareForeignAssets2026(s),
    Error,
    "active holding-period observation",
  );
});

Deno.test("2026 known beneficial year-end value must match the actual source snapshot and closure", () => {
  const s = foreignBeneficialFixture2026();
  s.claim.valuation_snapshots[1].values[0].native_value = 44001;
  assertThrows(
    () => prepareForeignAssets2026(s),
    Error,
    "actual interest valuation document",
  );
  const closed = foreignBeneficialFixture2026();
  closed.claim.assets[0].closed_or_disposed_date = "2026-12-31";
  assertThrows(
    () => prepareForeignAssets2026(closed),
    Error,
    "zero known year-end value",
  );
  const b = closed.claim.assets[0].beneficial_interest!;
  assert(
    b.kind !== "foreign_trust_beneficiary" &&
      b.year_end_interest.kind === "known",
  );
  b.year_end_interest.value_native = 0;
  closed.claim.valuation_snapshots[1].values[0].native_value = 0;
  const r = prepareForeignAssets2026(closed);
  assertEquals(r.threshold.maximum_usd_exact, "80000.00000000000");
  assertEquals(r.summary.partII.otherMaximumValueUsd, 0);
});

Deno.test("2026 trust termination requires reviewed absence of continuing mandatory rights", () => {
  const s = foreignBeneficialFixture2026("foreign_trust_beneficiary", false);
  const a = s.claim.assets[0], b = a.beneficial_interest!;
  assert(b.kind === "foreign_trust_beneficiary");
  a.closed_or_disposed_date = "2026-12-31";
  assertThrows(
    () => prepareForeignAssets2026(s),
    Error,
    "cannot retain mandatory rights",
  );
  b.mandatory_distribution_rights = {
    kind: "none",
    governing_instrument_document: evidence("trust-termination-instrument"),
    no_mandatory_distribution_right_at_year_end_verified: true,
  };
  assertEquals(
    prepareForeignAssets2026(s).summary.partII.otherMaximumValueUsd,
    15000,
  );
});

Deno.test("2026 foreign beneficial reviews require actual individual owners and consistent availability", () => {
  const s = foreignBeneficialFixture2026();
  s.filing_status = FilingStatus.MFJ;
  s.spouse_ssn = "444556666";
  s.claim.assets[0].owner = "spouse";
  const b = s.claim.assets[0].beneficial_interest!;
  assertThrows(
    () => prepareForeignAssets2026(s),
    Error,
    "actual individual owner",
  );
  b.beneficiary_tin = s.spouse_ssn;
  b.distributions.forEach((d) => d.recipient_tin = s.spouse_ssn!);
  assertEquals(
    prepareForeignAssets2026(s).summary.partII.otherMaximumValueUsd,
    55000,
  );
  s.claim.assets[0].owner = "joint_with_spouse";
  assertThrows(
    () => prepareForeignAssets2026(s),
    Error,
    "joint interests need separate ownership reconciliation",
  );
  const mixed = foreignBeneficialFixture2026("foreign_pension", false),
    m = mixed.claim.assets[0].beneficial_interest!;
  assert(m.kind !== "foreign_trust_beneficiary");
  m.year_end_interest = {
    kind: "known",
    valued_on: "2026-12-31",
    value_native: 44000,
    source_document: evidence("known-year-end"),
  };
  assertThrows(
    () => prepareForeignAssets2026(mixed),
    Error,
    "reconciled annual availability workpaper",
  );
});

Deno.test("2026 beneficial distributions reject wrong recipients, currencies, dates and duplicate source records", () => {
  const mutations: [string, (s: ForeignAssetSource2026) => void][] = [
    [
      "actual beneficiary",
      (s) =>
        s.claim.assets[0].beneficial_interest!.distributions[0].recipient_tin =
          "999887777",
    ],
    [
      "currency",
      (s) =>
        s.claim.assets[0].beneficial_interest!.distributions[0].currency_code =
          "USD",
    ],
    [
      "receipt date",
      (s) =>
        s.claim.assets[0].beneficial_interest!.distributions[0].received_on =
          "2025-05-01",
    ],
    [
      "holding-period",
      (s) => s.claim.assets[0].opened_or_acquired_date = "2026-06-01",
    ],
    ["repeats a source record", (s) => {
      const b = s.claim.assets[0].beneficial_interest!;
      b.distributions.push(structuredClone(b.distributions[0]));
    }],
  ];
  for (const [message, mutate] of mutations) {
    const s = foreignBeneficialFixture2026("foreign_pension", false);
    mutate(s);
    assertThrows(() => prepareForeignAssets2026(s), Error, message);
  }
});

Deno.test("2026 beneficial appraisal and rights evidence require year-end dates and consistent copies", () => {
  const s = foreignBeneficialFixture2026("foreign_trust_beneficiary", false),
    b = s.claim.assets[0].beneficial_interest!;
  assert(
    b.kind === "foreign_trust_beneficiary" &&
      b.mandatory_distribution_rights.kind === "section7520_valuation",
  );
  b.mandatory_distribution_rights.section7520_valuation_document = {
    ...b.interest_and_beneficiary_document,
    document_sha256: "f".repeat(64),
  };
  assertThrows(
    () => prepareForeignAssets2026(s),
    Error,
    "conflicting document copies",
  );
  const early = foreignBeneficialFixture2026();
  early.claim.assets[0].beneficial_interest!.reviewed_on = "2026-10-01";
  assertThrows(() => prepareForeignAssets2026(early), Error, "completed year");
  const wrongDate = foreignBeneficialFixture2026();
  const raw = JSON.parse(JSON.stringify(wrongDate));
  raw.claim.assets[0].beneficial_interest.distributions[1].valued_on =
    "2026-08-01";
  assertThrows(() => prepareForeignAssets2026(raw));
});

Deno.test("2026 non-grantor trust beneficiary 3520 exception retains threshold value and awaits actual filing binding", () => {
  const s = foreignBeneficialFixture2026("foreign_trust_beneficiary", false),
    a = s.claim.assets[0];
  a.exception_form_reference = "beneficiary-3520-copy";
  s.claim.exception_forms = [{
    ...evidence("beneficiary-3520-document"),
    record_reference: a.exception_form_reference,
    form: "3520",
    tax_year: 2026,
    owner_tin: s.taxpayer_ssn,
    timely_filed_or_included_in_current_return_reviewed: true,
    foreign_trust_beneficiary_part_iii_reviewed: true,
    asset_references: [a.asset_id],
  }];
  const r = prepareForeignAssets2026(s);
  assertEquals(r.threshold.filingRequired, true);
  assertEquals(r.threshold.year_end_usd_exact, "52500.00000000000");
  assertEquals(r.summary.partII.otherAssetCount, 0);
  assertEquals(r.summary.partIV["3520"], 1);
  assertEquals(r.requires_exception_filing_binding, true);
  assertEquals(r.requires_tax_item_return_binding, true);
  delete s.claim.exception_forms[0].foreign_trust_beneficiary_part_iii_reviewed;
  assertThrows(
    () => prepareForeignAssets2026(s),
    Error,
    "reviewed Form 3520 Part III",
  );
  s.claim.exception_forms[0].form = "3520-A";
  assertThrows(() => prepareForeignAssets2026(s), Error, "paired 3520/3520-A");
});

Deno.test("2026 known beneficial snapshots and correctly classified workpapers cannot be omitted or substituted", () => {
  const s = foreignBeneficialFixture2026();
  delete s.claim.valuation_snapshots[0].values[0].native_value;
  assertThrows(
    () => prepareForeignAssets2026(s),
    Error,
    "actual source snapshot amount",
  );
  const mismatch = foreignBeneficialFixture2026("foreign_estate");
  mismatch.claim.assets[0].foreign_entity_type = "corporation";
  assertThrows(
    () => prepareForeignAssets2026(mismatch),
    Error,
    "does not match the asset classification",
  );
  const orphan = foreignAssetsFixture2026();
  orphan.claim.assets[0].beneficial_interest =
    foreignBeneficialFixture2026().claim.assets[0].beneficial_interest;
  assertThrows(
    () => prepareForeignAssets2026(orphan),
    Error,
    "corresponding beneficial-interest workpaper",
  );
});

import { assertEquals, assertThrows } from "@std/assert";
import {
  foreignAssetClaim2026Schema,
  prepareForeignAssets2026,
} from "./foreign-assets-source.ts";
import {
  foreignAssetEvidence2026 as evidence,
  foreignAssetsFixture2026,
} from "./foreign-assets.fixture.ts";
import {
  createForm8938Schemas,
  ForeignAssetType,
} from "../../nodes/inputs/general/foreign/f8938/index.ts";
import { form8938AbroadEligibilityFixture } from "../../nodes/inputs/general/foreign/f8938/eligibility-fixture.ts";
import { FilingStatus } from "../../nodes/types.ts";

function usd(peak = 80000, end = 55000) {
  const s = foreignAssetsFixture2026(), a = s.claim.assets[0];
  a.currency_code = "USD";
  a.fx.source = "usd_no_conversion";
  a.fx.usd_per_currency_unit = 1;
  s.claim.valuation_snapshots[0].values[0].native_value = peak;
  s.claim.valuation_snapshots[1].values[0].native_value = end;
  return s;
}
function twoAssets() {
  const s = usd(), other = structuredClone(s.claim.assets[0]);
  other.asset_id = "foreign-bank-2";
  other.asset_identifier = "CH-1002";
  s.claim.assets.push(other);
  for (const snapshot of s.claim.valuation_snapshots) {
    snapshot.values.push({
      asset_reference: other.asset_id,
      native_value: 0,
      source_document: evidence(`other-${snapshot.record_reference}`),
    });
  }
  return s;
}

Deno.test("2026 foreign asset source values drive the shared threshold and summary without caller aggregates", () => {
  const s = foreignAssetsFixture2026(),
    before = structuredClone(s),
    r = prepareForeignAssets2026(s);
  assertEquals(s, before);
  assertEquals(r.threshold, {
    yearEndThreshold: 50000,
    anyTimeThreshold: 75000,
    filingRequired: true,
    year_end_usd_exact: "55000.00000000000",
    maximum_usd_exact: "80000.00000000000",
    peak_date: "2026-06-30",
  });
  assertEquals(r.summary.partI.depositAccountCount, 1);
  assertEquals(r.summary.partI.depositMaximumValueUsd, 80000);
  assertEquals(r.asset_values[0].threshold_maximum_date, "2026-06-30");
  assertEquals(r.filing_ready, false);
  assertEquals(JSON.parse(JSON.stringify(r)), r);
  assertThrows(() =>
    foreignAssetClaim2026Schema.parse({
      ...s.claim,
      max_value_all_assets: 999999,
    })
  );
});

Deno.test("2026 foreign portfolio peak uses contemporaneous values rather than adding separate account peaks", () => {
  const s = twoAssets();
  s.claim.valuation_snapshots[0].values[0].native_value = 60000;
  const middle = structuredClone(s.claim.valuation_snapshots[0]);
  middle.record_reference = "september-portfolio";
  middle.valued_on = "2026-09-30";
  middle.values[0].native_value = 0;
  middle.values[1].native_value = 60000;
  s.claim.valuation_snapshots.push(middle);
  s.claim.valuation_snapshots[1].values.forEach((v) => v.native_value = 20000);
  const r = prepareForeignAssets2026(s);
  assertEquals(r.threshold.filingRequired, false);
  assertEquals(r.threshold.maximum_usd_exact, "60000.00000000000");
  assertEquals(r.summary.partI.depositMaximumValueUsd, 120000);
  s.claim.assets.reverse();
  s.claim.valuation_snapshots.reverse().forEach((v) => v.values.reverse());
  assertEquals(prepareForeignAssets2026(s).threshold, r.threshold);
});

Deno.test("2026 foreign threshold equality and sub-cent converted excess are distinct before display rounding", () => {
  assertEquals(
    prepareForeignAssets2026(usd(75000, 50000)).threshold.filingRequired,
    false,
  );
  assertEquals(
    prepareForeignAssets2026(usd(75000.01, 50000)).threshold.filingRequired,
    true,
  );
  assertEquals(
    prepareForeignAssets2026(usd(75000, 50000.01)).threshold.filingRequired,
    true,
  );
  const s = foreignAssetsFixture2026();
  s.claim.assets[0].fx.usd_per_currency_unit = 0.0001;
  s.claim.valuation_snapshots.forEach((v) =>
    v.values[0].native_value = 500000000.01
  );
  const r = prepareForeignAssets2026(s);
  assertEquals(r.threshold.year_end_usd_exact, "50000.00000100000");
  assertEquals(r.threshold.filingRequired, true);
  assertEquals(r.summary.partI.depositMaximumValueUsd, 50000);
});

Deno.test("2026 joint foreign assets count once and MFS threshold shares do not halve reported maxima", () => {
  const joint = usd(150000, 100000);
  joint.filing_status = FilingStatus.MFJ;
  joint.spouse_ssn = "444556666";
  joint.claim.assets[0].owner = "joint_with_spouse";
  const r = prepareForeignAssets2026(joint);
  assertEquals(r.threshold.filingRequired, false);
  assertEquals(r.summary.partI.depositAccountCount, 1);
  joint.filing_status = FilingStatus.MFS;
  joint.claim.spouse_specified_status_review = {
    ...evidence("spouse-status"),
    spouse_tin: joint.spouse_ssn,
    is_specified_individual: true,
  };
  assertEquals(prepareForeignAssets2026(joint).threshold.filingRequired, false);
  joint.claim.valuation_snapshots[0].values[0].native_value = 160000;
  joint.claim.valuation_snapshots[1].values[0].native_value = 110000;
  const mfs = prepareForeignAssets2026(joint);
  assertEquals(mfs.threshold.maximum_usd_exact, "80000.00000000000");
  assertEquals(mfs.threshold.year_end_usd_exact, "55000.00000000000");
  assertEquals(mfs.threshold.filingRequired, true);
  assertEquals(mfs.summary.partI.depositMaximumValueUsd, 160000);
  joint.claim.spouse_specified_status_review.is_specified_individual = false;
  assertEquals(
    prepareForeignAssets2026(joint).threshold.maximum_usd_exact,
    "160000.00000000000",
  );
  delete joint.claim.spouse_specified_status_review;
  assertThrows(
    () => prepareForeignAssets2026(joint),
    Error,
    "specified-status evidence",
  );
});

Deno.test("2026 abroad thresholds reuse actual tax-home and complete qualifying-period evidence", () => {
  const s = foreignAssetsFixture2026();
  const e = form8938AbroadEligibilityFixture(
    "physical_presence_330_days",
    "2025-10-01",
    "2026-09-30",
  );
  for (const doc of Object.values(e)) doc.reviewed_on = "2027-02-01";
  s.claim.eligibility_evidence = e;
  s.claim.residence = {
    location: "qualifying_abroad",
    foreign_tax_home_country: "CH",
    presence_test: "physical_presence_330_days",
    qualifying_period_start: "2025-10-01",
    qualifying_period_end: "2026-09-30",
    full_days_abroad_in_period: 330,
  };
  const r = prepareForeignAssets2026(s);
  assertEquals(r.threshold.yearEndThreshold, 200000);
  assertEquals(r.threshold.anyTimeThreshold, 300000);
  assertEquals(r.threshold.filingRequired, false);
  s.claim.residence.full_days_abroad_in_period = 329;
  assertThrows(
    () => prepareForeignAssets2026(s),
    Error,
    "330 full foreign days",
  );
  s.claim.residence.full_days_abroad_in_period = 330;
  delete s.claim.eligibility_evidence.foreign_tax_home;
  assertThrows(() => prepareForeignAssets2026(s), Error, "matching tax-home");
});

Deno.test("2026 no-return-required determination and surviving-spouse status use shared thresholds", () => {
  const s = usd(500000, 400000);
  s.claim.annual_income_tax_return_required = false;
  s.claim.eligibility_evidence.return_requirement.determination_basis =
    "no_filing_requirement_workpaper";
  assertEquals(prepareForeignAssets2026(s).threshold.filingRequired, false);
  s.claim.annual_income_tax_return_required = true;
  assertThrows(() => prepareForeignAssets2026(s), Error, "filing requirement");
  s.claim.eligibility_evidence.return_requirement.determination_basis =
    "gross_income_threshold_workpaper";
  s.filing_status = FilingStatus.QSS;
  assertEquals(prepareForeignAssets2026(s).threshold.yearEndThreshold, 50000);
});

Deno.test("2026 excepted assets remain in threshold totals and form copies are counted once pending filing binding", () => {
  const s = twoAssets();
  for (const a of s.claim.assets) {
    a.exception_form_reference = "pfic-return-copy";
    a.asset_type = ForeignAssetType.ForeignStock;
    a.foreign_entity_type = "corporation";
  }
  s.claim.exception_forms = [{
    ...evidence("pfic-document"),
    record_reference: "pfic-return-copy",
    form: "8621",
    tax_year: 2026,
    owner_tin: s.taxpayer_ssn,
    timely_filed_or_included_in_current_return_reviewed: true,
    asset_references: s.claim.assets.map((a) => a.asset_id),
  }];
  const r = prepareForeignAssets2026(s);
  assertEquals(r.threshold.filingRequired, true);
  assertEquals(r.summary.partI.depositAccountCount, 0);
  assertEquals(r.summary.partIV["8621"], 1);
  assertEquals(r.requires_exception_filing_binding, true);
  s.claim.assets[0].asset_type = ForeignAssetType.DepositAccount;
  assertThrows(
    () => prepareForeignAssets2026(s),
    Error,
    "actual foreign entity interest",
  );
  s.claim.assets[0].asset_type = ForeignAssetType.ForeignStock;
  s.claim.exception_forms[0].asset_references.pop();
  assertThrows(
    () => prepareForeignAssets2026(s),
    Error,
    "exactly its reviewed assets",
  );
});

Deno.test("2026 foreign asset acquisition flags distinguish current from prior holding periods", () => {
  const s = usd();
  const a = s.claim.assets[0];
  a.asset_type = ForeignAssetType.ForeignStock;
  a.foreign_entity_type = "corporation";
  a.opened_or_acquired_date = "2020-01-01";
  assertEquals(
    prepareForeignAssets2026(s).summary.partII.anyAssetOpenedOrClosed,
    false,
  );
  a.opened_or_acquired_date = "2026-01-01";
  assertEquals(
    prepareForeignAssets2026(s).summary.partII.anyAssetOpenedOrClosed,
    true,
  );
  a.opened_or_acquired_date = "2026-07-01";
  assertThrows(
    () => prepareForeignAssets2026(s),
    Error,
    "outside its holding period",
  );
});

Deno.test("2026 closed account keeps its closing-day maximum but has zero in the distinct year-end observation", () => {
  const s = usd(80000, 0);
  s.claim.assets[0].closed_or_disposed_date = "2026-12-31";
  s.claim.valuation_snapshots[0].valued_on = "2026-12-31";
  const r = prepareForeignAssets2026(s);
  assertEquals(r.threshold.maximum_usd_exact, "80000.00000000000");
  assertEquals(r.summary.partI.anyAccountClosed, true);
  s.claim.valuation_snapshots[1].values[0].native_value = 1;
  assertThrows(
    () => prepareForeignAssets2026(s),
    Error,
    "outside its holding period",
  );
});

Deno.test("2026 foreign asset snapshots require complete unduplicated identities and exactly one year end", () => {
  const s = twoAssets();
  s.claim.valuation_snapshots[0].values.pop();
  assertThrows(
    () => prepareForeignAssets2026(s),
    Error,
    "complete asset inventory",
  );
  const missing = usd();
  missing.claim.valuation_snapshots.pop();
  assertThrows(
    () => prepareForeignAssets2026(missing),
    Error,
    "actual year-end snapshot",
  );
  const duplicate = twoAssets();
  duplicate.claim.assets[1].asset_identifier =
    duplicate.claim.assets[0].asset_identifier;
  assertThrows(
    () => prepareForeignAssets2026(duplicate),
    Error,
    "same account or asset identity",
  );
  const dupEnd = usd();
  const extra = structuredClone(dupEnd.claim.valuation_snapshots[1]);
  extra.record_reference = "second-year-end";
  dupEnd.claim.valuation_snapshots.push(extra);
  assertThrows(
    () => prepareForeignAssets2026(dupEnd),
    Error,
    "actual year-end snapshot",
  );
});

Deno.test("2026 foreign asset sources reject mismatched filer, review chronology and unreviewed FX substitution", () => {
  const wrongOwner = foreignAssetsFixture2026();
  wrongOwner.taxpayer_ssn = "999887777";
  assertThrows(
    () => prepareForeignAssets2026(wrongOwner),
    Error,
    "actual taxpayer",
  );
  const early = foreignAssetsFixture2026();
  early.claim.eligibility_evidence.return_requirement.reviewed_on =
    "2026-11-30";
  assertThrows(
    () => prepareForeignAssets2026(early),
    Error,
    "completed-year filing evidence",
  );
  const alt = foreignAssetsFixture2026();
  alt.claim.assets[0].fx.source = "other_public_source";
  assertThrows(() => prepareForeignAssets2026(alt), Error, "unavailability");
  alt.claim.assets[0].fx.treasury_rate_unavailable_verified = true;
  assertEquals(prepareForeignAssets2026(alt).threshold.filingRequired, true);
});

Deno.test("2026 source tax items retain source identities without inventing filed locations or emitting income", () => {
  const s = usd();
  s.claim.assets[0].tax_items = [{
    record_reference: "bank-interest-item",
    return_source_reference: "bank-interest-statement",
    kind: "interest",
    amount_usd: 200.25,
    source_document: evidence("interest-document"),
  }];
  const r = prepareForeignAssets2026(s);
  assertEquals(r.requires_tax_item_return_binding, true);
  assertEquals(r.tax_items[0].amount_usd, 200.25);
  assertEquals(
    r.tax_items[0].return_source_reference,
    "bank-interest-statement",
  );
  assertEquals(r.valuation_input.assets[0].tax_items, []);
  assertEquals(r.filing_ready, false);
});

Deno.test("2026 foreign asset summary rounds category totals after summing source cents", () => {
  const s = twoAssets();
  for (const snapshot of s.claim.valuation_snapshots) {
    snapshot.values.forEach((v) => v.native_value = 0.25);
  }
  assertEquals(
    prepareForeignAssets2026(s).summary.partI.depositMaximumValueUsd,
    1,
  );
});

Deno.test("2026 trust and pension interests require their specific valuation workpapers", () => {
  for (
    const type of [
      ForeignAssetType.ForeignTrustInterest,
      ForeignAssetType.ForeignPensionInterest,
    ]
  ) {
    const s = usd();
    s.claim.assets[0].asset_type = type;
    assertThrows(
      () => prepareForeignAssets2026(s),
      Error,
      "distribution and beneficial-interest valuation workpaper",
    );
  }
});

Deno.test("2026 reusable foreign asset schema validates 2026 dates while default 2025 dates stay separate", () => {
  const r = prepareForeignAssets2026(usd());
  createForm8938Schemas(2026).inputSchema.parse(r.valuation_input);
  assertThrows(
    () => createForm8938Schemas(2025).inputSchema.parse(r.valuation_input),
    Error,
    "last-day-of-year",
  );
});

Deno.test("2026 foreign asset evidence rejects conflicting copies and rates too small to retain", () => {
  const s = usd();
  s.claim.valuation_snapshots[1].values[0].source_document = {
    ...s.claim.valuation_snapshots[0].values[0].source_document,
    document_sha256: "c".repeat(64),
  };
  assertThrows(
    () => prepareForeignAssets2026(s),
    Error,
    "conflicting document copies",
  );
  const tiny = foreignAssetsFixture2026();
  tiny.claim.assets[0].fx.usd_per_currency_unit = 1e-14;
  assertThrows(() => prepareForeignAssets2026(tiny));
});

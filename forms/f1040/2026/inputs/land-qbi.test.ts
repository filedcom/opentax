import { assertEquals, assertThrows } from "@std/assert";
import {
  calculateLandQbi2026,
  type LandQbiSource2026,
  landQbiSource2026Schema,
} from "./land-qbi.ts";
import { landQbiFixture2026 } from "./land-qbi.fixture.ts";

function addSale(f: LandQbiSource2026, net: number, short = false) {
  const sales =
    f.loss_sources.loss_sources.capital_sources.land_sources_2026!.source.claim
      .sales;
  const s = structuredClone(sales[0]), suffix = String(sales.length + 1);
  Object.assign(s, {
    sale_reference: `sale-${suffix}`,
    property_reference: `parcel-${suffix}`,
    activity_reference: `activity-${suffix}`,
    acquisition_record_reference: `acquisition-${suffix}`,
    acquired_on: short ? "2026-01-01" : "2015-01-01",
    purchase_price: net < 0 ? 100000 - net : 100000,
  });
  Object.assign(s.closing, {
    closing_record_reference: `closing-${suffix}`,
    gross_sales_price: net < 0 ? 100000 : 100000 + net,
    selling_expenses: [],
  });
  sales.push(s);
  f.loss_sources.allocation_review.land_activities.push({
    ...f.loss_sources.allocation_review.land_activities[0],
    activity_reference: s.activity_reference,
  });
  f.review.activities.push({
    ...f.review.activities[0],
    activity_reference: s.activity_reference,
    record_reference: `qbi-${suffix}`,
  });
}
Deno.test("2026 land QBI includes ordinary recapture but excludes the capital remainder", () => {
  const f = landQbiFixture2026(),
    before = structuredClone(f),
    r = calculateLandQbi2026(f);
  assertEquals([
    r.qbi,
    r.active_qbi,
    r.capital_gain_excluded_from_qbi,
    r.qualified_suspended_loss,
  ], [5000, 5000, 40000, 0]);
  assertEquals(r.rows[0].ordinary_section1231, 5000);
  assertEquals(r.rows[0].sale_references, ["sale-1"]);
  assertEquals(f, before);
  const history =
    f.loss_sources.loss_sources.capital_sources.land_sources_2026!.source.claim
      .prior_history;
  history.opening_period_losses = [];
  history.filed_years = history.filed_years.map((y) => ({
    ...y,
    filed_line7_net_gain_loss: 0,
    section1231_loss_taken_into_account: 0,
    filed_line8_nonrecaptured_loss: undefined,
    filed_line12_recaptured_gain: undefined,
  }));
  assertEquals(calculateLandQbi2026(f).qbi, 0);
  assertEquals(calculateLandQbi2026(f).capital_gain_excluded_from_qbi, 45000);
  assertEquals(calculateLandQbi2026(landQbiFixture2026(4000)).qbi, 4000);
});
Deno.test("2026 land QBI retains allowed current loss separately from the suspended 461 origin", () => {
  const r = calculateLandQbi2026(landQbiFixture2026(-400000));
  assertEquals([
    r.qbi,
    r.active_qbi,
    r.qualified_suspended_loss,
    r.nonqualified_suspended_loss,
  ], [-256000, -256000, 144000, 0]);
  assertEquals(r.rows[0].ordinary_before_limit, -400000);
  assertEquals(r.rows[0].ordinary_after_limit, -256000);
  assertEquals(r.loss.finalized_loss!.amount_taken_into_account, 256000);
});
Deno.test("2026 land QBI applies taxpayer-wide netting before activity qualification", () => {
  const f = landQbiFixture2026(60000);
  addSale(f, -15000);
  const r = calculateLandQbi2026(f);
  assertEquals(
    r.rows.map((r) => [r.ordinary_section1231, r.capital_section1231]),
    [[5000, 55000], [0, -15000]],
  );
  assertEquals(r.qbi, 5000);
  // A loss in another activity is capital under the overall gain branch.
  f.review.activities[0].treatment = {
    kind: "foreign_business",
    not_effectively_connected_with_us_trade_or_business: true,
  };
  assertEquals(calculateLandQbi2026(f).qbi, 0);
});
Deno.test("2026 land QBI separates qualified and foreign loss origins after source allocation", () => {
  const f = landQbiFixture2026(-300000);
  addSale(f, -100000);
  f.review.activities[1].treatment = {
    kind: "foreign_business",
    not_effectively_connected_with_us_trade_or_business: true,
  };
  const r = calculateLandQbi2026(f);
  assertEquals([
    r.qbi,
    r.qualified_suspended_loss,
    r.nonqualified_suspended_loss,
  ], [-192000, 108000, 36000]);
  assertEquals(r.rows.map((r) => r.ordinary_after_limit), [-192000, -64000]);
  f.review.activities.reverse();
  f.loss_sources.loss_sources.capital_sources.land_sources_2026!.source.claim
    .sales.reverse();
  const again = calculateLandQbi2026(f);
  assertEquals([
    again.qbi,
    again.qualified_suspended_loss,
    again.nonqualified_suspended_loss,
  ], [-192000, 108000, 36000]);
});
Deno.test("2026 land QBI retains short-term losses and material participation independently", () => {
  const f = landQbiFixture2026(4000);
  addSale(f, -400000, true);
  f.review.activities[0].materially_participated = false;
  const r = calculateLandQbi2026(f);
  assertEquals(r.qbi, -256000);
  assertEquals(r.active_qbi, -260000);
  assertEquals(r.rows.map((r) => r.disallowed_short_term_loss), [0, 140000]);
  assertEquals(r.qualified_suspended_loss, 140000);
  assertEquals(r.loss.finalized_loss, undefined);
});
Deno.test("2026 land QBI needs exact source reviews and rejects calculated amount overrides", () => {
  const f = landQbiFixture2026();
  f.review.activities.push(structuredClone(f.review.activities[0]));
  assertThrows(
    () => calculateLandQbi2026(f),
    Error,
    "every land owner/activity once",
  );
  f.review.activities.pop();
  f.review.activities[0].activity_reference = "wrong";
  assertThrows(
    () => calculateLandQbi2026(f),
    Error,
    "every land owner/activity once",
  );
  assertEquals(
    landQbiSource2026Schema.safeParse({ ...landQbiFixture2026(), qbi: 5000 })
      .success,
    false,
  );
});

import { assertEquals, assertThrows } from "@std/assert";
import { form1062Fixture2026 } from "./form1062.fixture.ts";
import {
  form1062Election2026Schema,
  resolveForm1062Sources2026,
} from "./form1062-source.ts";
const run = (f = form1062Fixture2026()) =>
  resolveForm1062Sources2026(f.land, f.election);
Deno.test("2026 Form 1062 sources derive Schedule A from land records and retain ten-year evidence", () => {
  const f = form1062Fixture2026(),
    before = structuredClone(f),
    r = run(f),
    s = r.schedules[0];
  assertEquals(s.lines, {
    line9: 100000,
    line10: 95000,
    line11: 50000,
    line12: 50000,
    line13: 45000,
  });
  assertEquals([r.schedule_count, r.elected_gain, r.filing_ready], [
    1,
    45000,
    false,
  ]);
  assertEquals(s.farming_history_workpaper.from, "2016-06-03");
  assertEquals(s.farming_history_workpaper.through, "2026-06-02");
  assertEquals(s.farming_history_workpaper.supported_days, 3652);
  assertEquals(s.farming_history_workpaper.gaps, []);
  assertEquals(s.covenant_required_period, {
    from: "2026-06-03",
    through: "2036-06-02",
  });
  assertEquals(f, before);
});
Deno.test("2026 Form 1062 preserves distinct original and adjusted basis", () => {
  const f = form1062Fixture2026(), sale = f.land.claim.sales[0];
  sale.capitalized_acquisition_costs = [{
    record_reference: "deed-fees",
    date: sale.acquired_on,
    description: "Capitalized fees",
    amount: 2500,
  }];
  sale.basis_adjustments = [{
    record_reference: "improvement",
    date: "2018-01-01",
    description: "Permanent improvement",
    amount: 10000,
    direction: "increase",
  }];
  const s = run(f).schedules[0];
  assertEquals([s.lines.line11, s.lines.line12, s.lines.line13], [
    52500,
    62500,
    32500,
  ]);
});
Deno.test("2026 Form 1062 retains history gaps for a substantive substantially-all review", () => {
  const f = form1062Fixture2026(), h = f.election.sales[0].farming_history;
  h.periods[0].through = "2025-12-31";
  assertThrows(() => run(f), Error, "actual farming-history gaps");
  h.substantially_all_ten_years_review.interruptions_explanation =
    "Synthetic review of temporary pre-sale interruption";
  const r = run(f);
  assertEquals(r.schedules[0].farming_history_workpaper.gaps, [{
    from: "2026-01-01",
    through: "2026-06-02",
  }]);
  h.periods[0].through = "2015-12-31";
  assertThrows(() => run(f), Error, "actual farming-history gaps");
});
Deno.test("2026 Form 1062 checks original ownership and nonoverlapping farming periods", () => {
  const f = form1062Fixture2026();
  f.land.claim.sales[0].acquired_on = "2017-01-01";
  assertThrows(() => run(f), Error, "ten-year use period");
  const g = form1062Fixture2026(), h = g.election.sales[0].farming_history;
  h.periods.push({ ...h.periods[0], record_reference: "overlap" });
  assertThrows(() => run(g), Error, "nonoverlapping periods");
  h.periods.pop();
  h.periods[0].from = "2015-05-31";
  assertThrows(() => run(g), Error, "within ownership");
});
Deno.test("2026 Form 1062 qualified leases retain tenant evidence", () => {
  const f = form1062Fixture2026(), e = f.election.sales[0];
  e.farming_history.periods[0].use = {
    kind: "leased_to_qualified_farmer",
    tenant: { ...e.buyer, tin: "345678912" },
  };
  assertEquals(run(f).elected_gain, 45000);
  e.farming_history.periods[0].use.tenant.tin = e.owner_tin;
  assertThrows(() => run(f), Error, "separate qualified tenant");
});
Deno.test("2026 Form 1062 cannot substitute a covenant from another property, owner or buyer", () => {
  const mutations = [
    { property_reference: "other-parcel" },
    { seller_tin: "987654321" },
    { buyer_tin: "345678912" },
    { executed_on: "2026-06-03" },
    { effective_from: "2026-06-04" },
    { effective_through: "2036-06-01" },
  ];
  for (const mutation of mutations) {
    const f = form1062Fixture2026();
    Object.assign(f.election.sales[0].covenant, mutation);
    assertThrows(() => run(f), Error, "full ten-year restriction");
  }
});
Deno.test("2026 Form 1062 reconciles elected subsets and prevents duplicate claims", () => {
  const f = form1062Fixture2026();
  const sale = structuredClone(f.land.claim.sales[0]);
  sale.sale_reference = "sale-2";
  sale.property_reference = "parcel-2";
  sale.acquisition_record_reference = "purchase-2";
  sale.closing.closing_record_reference = "closing-2";
  sale.closing.selling_expenses[0].record_reference = "commission-2";
  f.land.claim.sales.push(sale);
  assertEquals(run(f).schedule_count, 1);
  const second = structuredClone(f.election.sales[0]);
  second.sale_reference = "sale-2";
  second.property_reference = second.covenant.property_reference = "parcel-2";
  f.election.sales.push(second);
  assertEquals([
    run(f).schedule_count,
    run(f).elected_gain,
    run(f).covenant_claims.length,
  ], [2, 90000, 1]);
  second.covenant.sha256 = "b".repeat(64);
  assertThrows(() => run(f), Error, "conflicting digests");
  second.covenant.sha256 = "a".repeat(64);
  second.sale_reference = "sale-1";
  assertThrows(() => run(f), Error, "Duplicate Form 1062");
});
Deno.test("2026 Form 1062 rejects mismatched source references, loss elections and asserted amounts", () => {
  const f = form1062Fixture2026();
  f.election.land_inventory_reference = "wrong";
  assertThrows(() => run(f), Error, "actual land inventory");
  const g = form1062Fixture2026();
  g.election.sales[0].owner_tin = "987654321";
  assertThrows(() => run(g), Error, "return owner");
  const h = form1062Fixture2026();
  h.land.claim.sales[0].closing.gross_sales_price = 10000;
  assertThrows(() => run(h), Error, "recognized gain");
  assertEquals(
    form1062Election2026Schema.safeParse({
      ...form1062Fixture2026().election,
      elected_gain: 45000,
    }).success,
    false,
  );
});
Deno.test("2026 Form 1062 stops unresolved whole-dollar disagreement with Form 4797", () => {
  const f = form1062Fixture2026(), sale = f.land.claim.sales[0];
  sale.closing.gross_sales_price = 100000.4;
  sale.closing.selling_expenses[0].amount = 5000.6;
  assertThrows(() => run(f), Error, "coordinated rounding");
});

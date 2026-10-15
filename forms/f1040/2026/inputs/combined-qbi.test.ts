import { wage } from "./business.fixture.ts";
import { assert, assertEquals, assertThrows } from "@std/assert";
import {
  combinedQbiFixture2026,
  combinedQbiSelectionFixture2026,
} from "./combined-qbi.fixture.ts";
import {
  combinedQbiCalculator2026,
  resolveCombinedQbi2026,
} from "./combined-qbi.ts";
import { calculateDeductionSelection2026 } from "../nodes/standard_deduction.ts";
import {
  businessGraphFixture2026,
  businessQbiFixture2026,
} from "./business-qbi.fixture.ts";
import { sourceRegistry2026 } from "../source-registry.ts";
import { FilingStatus } from "../../nodes/types.ts";
const form = (
  r: ReturnType<ReturnType<typeof combinedQbiCalculator2026>["evaluate"]>,
) =>
  r.forms.form8995 as {
    lines: Record<string, number>;
    rows: { qbi: number }[];
    loss_attribution: {
      qualified_suspended_loss: number;
      nonqualified_suspended_loss: number;
    };
  };
Deno.test("2026 combined QBI nets C after SE with ordinary land recapture and uses capital gain once", () => {
  const f = combinedQbiFixture2026(),
    before = structuredClone(f),
    r = resolveCombinedQbi2026(f);
  assertEquals(r.rows.map((r) => r.qbi), [9293, 5000]);
  assertEquals(r.qbi, 14293);
  assertEquals(r.active_qbi_before_rounding, 14293);
  const calc = combinedQbiCalculator2026(f);
  assertEquals(calc.evaluate(50000).deduction, 2000);
  assertEquals(calc.evaluate(60000).deduction, 2859);
  assertEquals(form(calc.evaluate(50000)).lines.line12, 40000);
  assertEquals(f, before);
});
Deno.test("2026 combined QBI applies one prior loss and keeps the 461 origin separate", () => {
  const f = combinedQbiFixture2026(-400000, [-200000]);
  f.prior_losses = {
    kind: "form8995_2025",
    tax_year: 2025,
    return_reference: "filed2025",
    taxpayer_tin: "123456789",
    filing_status: FilingStatus.Single,
    ownership_and_filing_unit_unchanged: true,
    line16_business_loss_carryforward: 3000,
    line17_reit_ptp_loss_carryforward: 1250,
  };
  const r = resolveCombinedQbi2026(f),
    q = form(combinedQbiCalculator2026(f).evaluate(100000));
  assertEquals(r.rows.map((r) => r.qbi), [-85333, -170667]);
  assertEquals([q.lines.line2, q.lines.line3, q.lines.line18, q.lines.line19], [
    -256000,
    3000,
    259000,
    1250,
  ]);
  assertEquals(q.loss_attribution.qualified_suspended_loss, 344000);
  assertEquals(r.land.loss.finalized_loss!.amount_taken_into_account, 170667);
  assertEquals(q.rows.reduce((n, r) => n + r.qbi, 0), q.lines.line2);
});
Deno.test("2026 combined QBI preserves nonqualified foreign loss without printing it as qualified", () => {
  const f = combinedQbiFixture2026(-400000, [-200000]);
  f.land_sources.review.activities[0].treatment = {
    kind: "foreign_business",
    not_effectively_connected_with_us_trade_or_business: true,
  };
  const r = resolveCombinedQbi2026(f);
  assertEquals(r.rows.length, 1);
  assertEquals(r.qbi, -85333);
  assertEquals([
    r.loss_attribution.qualified_suspended_loss,
    r.loss_attribution.nonqualified_suspended_loss,
  ], [114667, 229333]);
});
Deno.test("2026 combined QBI returns disallowed half-SE cents to the original C sources", () => {
  const f = combinedQbiFixture2026(-400000, [10001, 19999]);
  const r = resolveCombinedQbi2026(f),
    c = r.rows.filter((r) => r.source_kind === "schedule_c");
  const se = r.loss_attribution.source_buckets.find((b) =>
    b.kind === "deductible_half_se"
  )!;
  assertEquals(
    Math.round(
      c.reduce((n, r) => n + r.allocated_disallowed_se_deduction, 0) * 100,
    ),
    se.disallowed_loss * 100,
  );
  for (const row of c) {
    const base = r.business!.rows.find((b) =>
      b.business_reference === row.business_reference
    )!;
    assert(
      row.allocated_disallowed_se_deduction >= 0 &&
        row.allocated_disallowed_se_deduction <= base.allocated_se_deduction,
    );
    assertEquals(
      Math.round(row.qbi_before_rounding * 100),
      Math.round(base.qbi_before_rounding * 100) +
        Math.round(row.allocated_disallowed_se_deduction * 100),
    );
  }
  assertEquals(Math.round(r.active_qbi_before_rounding), -256000);
  f.land_sources.loss_sources.loss_sources.business_sources!.businesses
    .reverse();
  f.business_review!.businesses.reverse();
  const after = resolveCombinedQbi2026(f);
  assertEquals(after.qbi, r.qbi);
  const sort = (x: typeof r) =>
    x.rows.map(
      (r) => [r.business_reference, r.qbi, r.allocated_disallowed_se_deduction],
    ).sort();
  assertEquals(sort(after), sort(r));
});
Deno.test("2026 land-only QBI retains a single active minimum after prior losses", () => {
  const f = combinedQbiFixture2026(1000, []);
  f.prior_losses = {
    kind: "form8995_2025",
    tax_year: 2025,
    return_reference: "prior",
    taxpayer_tin: "123456789",
    filing_status: FilingStatus.Single,
    ownership_and_filing_unit_unchanged: true,
    line16_business_loss_carryforward: 5000,
    line17_reit_ptp_loss_carryforward: 0,
  };
  const q = form(combinedQbiCalculator2026(f).evaluate(10000));
  assertEquals([q.lines.line16, q.lines.line17, q.lines.line18], [
    400,
    400,
    4000,
  ]);
  f.land_sources.review.activities[0].materially_participated = false;
  assertEquals(combinedQbiCalculator2026(f).evaluate(10000).deduction, 0);
});
Deno.test("2026 combined QBI evaluates each deduction candidate against its own taxable income", () => {
  const f = combinedQbiSelectionFixture2026(combinedQbiFixture2026(), 60000);
  f.itemized_before_overall_limit = 20000;
  f.itemized_taxes = 0;
  const r = calculateDeductionSelection2026(f).resolution;
  assertEquals(r.selected.line12eStandardOrItemized, 20000);
  assertEquals(r.selected.line13bQbi, 400);
  assertEquals(r.selected.line15TaxableIncome, 39600);
  const q = r.selected.qbi.forms.form8995 as { lines: Record<string, number> };
  assertEquals([q.lines.line11, q.lines.line12, q.lines.line17], [
    40000,
    40000,
    400,
  ]);
});
Deno.test("2026 combined deduction owner rejects duplicate sources and stale finalized capital records", () => {
  const f = combinedQbiSelectionFixture2026();
  assertThrows(
    () =>
      calculateDeductionSelection2026({
        ...f,
        business_sources_2026: businessQbiFixture2026(),
      }),
    Error,
    "duplicate owners",
  );
  const changed = structuredClone(f);
  changed.capital_sources_2026!.digital_assets_answer = true;
  assertThrows(
    () => calculateDeductionSelection2026(changed),
    Error,
    "identical finalized capital",
  );
  assertThrows(
    () =>
      calculateDeductionSelection2026({
        ...f,
        capital_sources_2026: undefined,
      }),
    Error,
    "identical finalized capital",
  );
  assertThrows(
    () =>
      calculateDeductionSelection2026({
        ...f,
        filing_status: FilingStatus.HOH,
      }),
    Error,
    "identical finalized capital",
  );
  assertThrows(
    () => calculateDeductionSelection2026({ ...f, agi: -1 }),
    Error,
    "NOL/carryover owner",
  );
  assertThrows(
    () => calculateDeductionSelection2026({ ...f, taxpayer_dob: "2010-01-01" }),
    Error,
    "child-tax",
  );
});
Deno.test("2026 combined QBI requires complete reviews and preserves the public land boundary", () => {
  const f = combinedQbiFixture2026();
  assertThrows(
    () => resolveCombinedQbi2026({ ...f, business_review: undefined }),
    Error,
    "component review",
  );
  assertThrows(
    () =>
      resolveCombinedQbi2026({
        ...combinedQbiFixture2026(45000, []),
        business_review: f.business_review,
      }),
    Error,
    "component review",
  );
  assertEquals(
    sourceRegistry2026.start.inputSchema.safeParse({
      ...businessGraphFixture2026(),
      combined_qbi: f,
    }).success,
    false,
  );
  f.prior_losses = {
    kind: "form8995_2025",
    tax_year: 2025,
    return_reference: "prior",
    taxpayer_tin: "987654321",
    filing_status: FilingStatus.Single,
    ownership_and_filing_unit_unchanged: true,
    line16_business_loss_carryforward: 0,
    line17_reit_ptp_loss_carryforward: 0,
  };
  assertThrows(() => resolveCombinedQbi2026(f), Error, "unchanged ownership");
});
Deno.test("2026 combined QBI retains the distinct MFS simplified threshold and land EIN", () => {
  const f = combinedQbiFixture2026(45000, []),
    l = f.land_sources.loss_sources.loss_sources;
  l.filing_status =
    l.capital_sources.filing_status =
    l.capital_sources
      .land_sources_2026!.source.filing_status =
      FilingStatus.MFS;
  f.land_sources.review.activities[0].ein = "123456780";
  assertEquals(
    resolveCombinedQbi2026(f).rows[0].identification_number,
    "123456780",
  );
  const c = combinedQbiCalculator2026(f);
  assertEquals(c.evaluate(201775).deduction, 1000);
  assertThrows(() => c.evaluate(201776), Error, "Form 8995-A");
});

Deno.test("2026 combined QBI retains statutory-employee loss without a 461 allocation", () => {
  const f = combinedQbiFixture2026(-400000, [-100000]);
  const c = f.land_sources.loss_sources.loss_sources.business_sources!;
  c.businesses[0].kind = "statutory_employee";
  c.businesses[0].expenses[0].amount = 200000;
  c.w2s = [{
    ...wage("123456789", 100000),
    box13_statutory_employee: true,
    schedule_c_business_reference: c.businesses[0].business_reference,
  }];
  const r = resolveCombinedQbi2026(f);
  assertEquals(r.qbi, -356000);
  assertEquals(r.rows[0].allocated_excess_business_loss, 0);
  assertEquals(r.loss_attribution.qualified_suspended_loss, 144000);
});

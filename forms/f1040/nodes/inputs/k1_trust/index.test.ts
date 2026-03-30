import { assertEquals, assertThrows } from "@std/assert";
import { k1_trust } from "./index.ts";

function minimalItem(overrides: Record<string, unknown> = {}) {
  return {
    estate_trust_name: "Test Trust",
    ...overrides,
  };
}

function compute(items: ReturnType<typeof minimalItem>[]) {
  return k1_trust.compute({ k1_trusts: items });
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// ── 1. Input schema validation ────────────────────────────────────────────────

Deno.test("empty array throws", () => {
  assertThrows(() => k1_trust.compute({ k1_trusts: [] }), Error);
});

Deno.test("missing estate_trust_name throws", () => {
  assertThrows(
    () => k1_trust.compute({ k1_trusts: [{ box1_interest: 100 } as unknown as ReturnType<typeof minimalItem>] }),
    Error,
  );
});

Deno.test("negative box1_interest throws", () => {
  assertThrows(() => compute([minimalItem({ box1_interest: -1 })]), Error);
});

Deno.test("negative box2a_ordinary_dividends throws", () => {
  assertThrows(() => compute([minimalItem({ box2a_ordinary_dividends: -5 })]), Error);
});

Deno.test("negative box2b_qualified_dividends throws", () => {
  assertThrows(() => compute([minimalItem({ box2b_qualified_dividends: -10 })]), Error);
});

// ── 2. Per-box routing ────────────────────────────────────────────────────────

Deno.test("box1_interest routes to schedule_b taxable_interest_net", () => {
  const result = compute([minimalItem({ box1_interest: 500 })]);
  const out = findOutput(result, "schedule_b");
  assertEquals(out?.fields.taxable_interest_net, 500);
});

Deno.test("zero box1_interest does not route to schedule_b", () => {
  const result = compute([minimalItem()]);
  const out = findOutput(result, "schedule_b");
  assertEquals(out, undefined);
});

Deno.test("box2a_ordinary_dividends routes to schedule_b ordinaryDividends", () => {
  const result = compute([minimalItem({ box2a_ordinary_dividends: 800 })]);
  const out = findOutput(result, "schedule_b");
  assertEquals(out?.fields.ordinaryDividends, 800);
});

Deno.test("box2b_qualified_dividends routes to f1040 line3a", () => {
  const result = compute([minimalItem({ box2b_qualified_dividends: 300 })]);
  const out = findOutput(result, "f1040");
  assertEquals(out?.fields.line3a_qualified_dividends, 300);
});

Deno.test("zero box2b does not route to f1040", () => {
  const result = compute([minimalItem()]);
  const out = findOutput(result, "f1040");
  assertEquals(out, undefined);
});

Deno.test("box3_net_st_cap_gain routes to schedule_d line_5_k1_st", () => {
  const result = compute([minimalItem({ box3_net_st_cap_gain: 1000 })]);
  const out = findOutput(result, "schedule_d");
  assertEquals(out?.fields.line_5_k1_st, 1000);
});

Deno.test("negative box3 (short-term loss) routes to schedule_d", () => {
  const result = compute([minimalItem({ box3_net_st_cap_gain: -400 })]);
  const out = findOutput(result, "schedule_d");
  assertEquals(out?.fields.line_5_k1_st, -400);
});

Deno.test("zero box3 does not route to schedule_d", () => {
  const result = compute([minimalItem()]);
  const out = findOutput(result, "schedule_d");
  assertEquals(out, undefined);
});

Deno.test("box4a_net_lt_cap_gain routes to schedule_d line_12_k1_lt", () => {
  const result = compute([minimalItem({ box4a_net_lt_cap_gain: 2000 })]);
  const out = findOutput(result, "schedule_d");
  assertEquals(out?.fields.line_12_k1_lt, 2000);
});

Deno.test("negative box4a (long-term loss) routes to schedule_d", () => {
  const result = compute([minimalItem({ box4a_net_lt_cap_gain: -600 })]);
  const out = findOutput(result, "schedule_d");
  assertEquals(out?.fields.line_12_k1_lt, -600);
});

Deno.test("box5_other_portfolio routes to schedule1 line8z_other_income", () => {
  const result = compute([minimalItem({ box5_other_portfolio: 750 })]);
  const out = findOutput(result, "schedule1");
  assertEquals(out?.fields.line8z_other_income, 750);
});

Deno.test("box6_ordinary_business routes to schedule1 line5_schedule_e", () => {
  const result = compute([minimalItem({ box6_ordinary_business: 4000 })]);
  const out = findOutput(result, "schedule1");
  assertEquals(out?.fields.line5_schedule_e, 4000);
});

Deno.test("negative box6 (business loss) routes to schedule1", () => {
  const result = compute([minimalItem({ box6_ordinary_business: -1500 })]);
  const out = findOutput(result, "schedule1");
  assertEquals(out?.fields.line5_schedule_e, -1500);
});

Deno.test("box7_rental_real_estate routes to schedule1 line5_schedule_e", () => {
  const result = compute([minimalItem({ box7_rental_real_estate: 2500 })]);
  const out = findOutput(result, "schedule1");
  assertEquals(out?.fields.line5_schedule_e, 2500);
});

Deno.test("box8_other_rental routes to schedule1 line5_schedule_e", () => {
  const result = compute([minimalItem({ box8_other_rental: 1200 })]);
  const out = findOutput(result, "schedule1");
  assertEquals(out?.fields.line5_schedule_e, 1200);
});

Deno.test("box14_foreign_tax routes to form_1116", () => {
  const result = compute([minimalItem({ box14_foreign_tax: 150 })]);
  const out = findOutput(result, "form_1116");
  assertEquals(out?.fields.foreign_tax_paid, 150);
});

Deno.test("zero box14 does not route to form_1116", () => {
  const result = compute([minimalItem()]);
  const out = findOutput(result, "form_1116");
  assertEquals(out, undefined);
});

// ── 3. Aggregation across multiple K-1s ──────────────────────────────────────

Deno.test("box1_interest sums across multiple K-1s to schedule_b (separate entries)", () => {
  const result = compute([
    minimalItem({ box1_interest: 300 }),
    minimalItem({ estate_trust_name: "Second Trust", box1_interest: 200 }),
  ]);
  const sbOutputs = result.outputs.filter((o) => o.nodeType === "schedule_b");
  // Each K-1 produces its own schedule_b entry
  assertEquals(sbOutputs.length >= 2, true);
});

Deno.test("box2b_qualified_dividends sums across K-1s to f1040", () => {
  const result = compute([
    minimalItem({ box2b_qualified_dividends: 200 }),
    minimalItem({ estate_trust_name: "Trust B", box2b_qualified_dividends: 300 }),
  ]);
  const out = findOutput(result, "f1040");
  assertEquals(out?.fields.line3a_qualified_dividends, 500);
});

Deno.test("box3 STCG sums across K-1s to schedule_d", () => {
  const result = compute([
    minimalItem({ box3_net_st_cap_gain: 1000 }),
    minimalItem({ estate_trust_name: "Trust B", box3_net_st_cap_gain: 500 }),
  ]);
  const out = findOutput(result, "schedule_d");
  assertEquals(out?.fields.line_5_k1_st, 1500);
});

Deno.test("box6 business income sums across K-1s to schedule1", () => {
  const result = compute([
    minimalItem({ box6_ordinary_business: 2000 }),
    minimalItem({ estate_trust_name: "Trust B", box6_ordinary_business: 1000 }),
  ]);
  const out = findOutput(result, "schedule1");
  assertEquals(out?.fields.line5_schedule_e, 3000);
});

Deno.test("box6+box7+box8 combined routes to schedule1 line5_schedule_e", () => {
  const result = compute([
    minimalItem({
      box6_ordinary_business: 1000,
      box7_rental_real_estate: 500,
      box8_other_rental: 300,
    }),
  ]);
  const out = findOutput(result, "schedule1");
  // 1000 + 500 + 300 = 1800
  assertEquals(out?.fields.line5_schedule_e, 1800);
});

// ── 7. Informational fields ───────────────────────────────────────────────────

Deno.test("estate_trust_name does not produce tax output alone", () => {
  const result = compute([minimalItem()]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("box10_estate_tax_deduction does not produce tax output", () => {
  const r1 = compute([minimalItem()]);
  const r2 = compute([minimalItem({ box10_estate_tax_deduction: 5000 })]);
  assertEquals(r1.outputs.length, r2.outputs.length);
});

// ── 8. Edge cases ─────────────────────────────────────────────────────────────

Deno.test("all-zero K-1 produces no outputs", () => {
  const result = compute([minimalItem()]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("K-1 with both STCG and LTCG produces single merged schedule_d output", () => {
  const result = compute([minimalItem({ box3_net_st_cap_gain: 500, box4a_net_lt_cap_gain: 1000 })]);
  const sdOutputs = result.outputs.filter((o) => o.nodeType === "schedule_d");
  assertEquals(sdOutputs.length, 1);
  assertEquals(sdOutputs[0].fields.line_5_k1_st, 500);
  assertEquals(sdOutputs[0].fields.line_12_k1_lt, 1000);
});

// ── 9. Smoke test ─────────────────────────────────────────────────────────────

Deno.test("smoke test — K-1 with all major boxes", () => {
  const result = compute([
    minimalItem({
      box1_interest: 500,
      box2a_ordinary_dividends: 800,
      box2b_qualified_dividends: 600,
      box3_net_st_cap_gain: 1000,
      box4a_net_lt_cap_gain: 2000,
      box5_other_portfolio: 300,
      box6_ordinary_business: 5000,
      box7_rental_real_estate: 1500,
      box14_foreign_tax: 100,
    }),
  ]);
  const sb = findOutput(result, "schedule_b");
  assertEquals(sb?.fields.taxable_interest_net, 500);
  const f1040 = findOutput(result, "f1040");
  assertEquals(f1040?.fields.line3a_qualified_dividends, 600);
  const sd = findOutput(result, "schedule_d");
  assertEquals(sd?.fields.line_5_k1_st, 1000);
  assertEquals(sd?.fields.line_12_k1_lt, 2000);
  const sch1 = findOutput(result, "schedule1");
  // box5=300 (other_income) + box6=5000 + box7=1500 = schedule_e total 6500
  assertEquals(sch1?.fields.line5_schedule_e, 6500);
  const f1116 = findOutput(result, "form_1116");
  assertEquals(f1116?.fields.foreign_tax_paid, 100);
});

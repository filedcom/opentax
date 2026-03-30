import { assertEquals, assertThrows } from "@std/assert";
import { k1Partnership } from "./index.ts";

function minimalItem(overrides: Record<string, unknown> = {}) {
  return {
    partnership_name: "Test Partnership",
    ...overrides,
  };
}

function compute(items: ReturnType<typeof minimalItem>[]) {
  return k1Partnership.compute({ taxYear: 2025 }, { k1_partnerships: items });
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// ── 1. Input schema validation ────────────────────────────────────────────────

Deno.test("empty array throws", () => {
  assertThrows(() => k1Partnership.compute({ taxYear: 2025 }, { k1_partnerships: [] }), Error);
});

Deno.test("missing partnership_name throws", () => {
  assertThrows(
    () => k1Partnership.compute({ taxYear: 2025 }, { k1_partnerships: [{ box1_ordinary_business: 100 } as unknown as ReturnType<typeof minimalItem>] }),
    Error,
  );
});

Deno.test("negative box5_interest throws", () => {
  assertThrows(() => compute([minimalItem({ box5_interest: -1 })]), Error);
});

Deno.test("negative box6a_ordinary_dividends throws", () => {
  assertThrows(() => compute([minimalItem({ box6a_ordinary_dividends: -5 })]), Error);
});

Deno.test("negative box6b_qualified_dividends throws", () => {
  assertThrows(() => compute([minimalItem({ box6b_qualified_dividends: -10 })]), Error);
});

// ── 2. Per-box routing ────────────────────────────────────────────────────────

Deno.test("box1_ordinary_business routes to schedule1 line5_schedule_e", () => {
  const result = compute([minimalItem({ box1_ordinary_business: 8000 })]);
  const out = findOutput(result, "schedule1");
  assertEquals(out?.fields.line5_schedule_e, 8000);
});

Deno.test("negative box1 (loss) routes to schedule1", () => {
  const result = compute([minimalItem({ box1_ordinary_business: -3000 })]);
  const out = findOutput(result, "schedule1");
  assertEquals(out?.fields.line5_schedule_e, -3000);
});

Deno.test("zero box1 does not route to schedule1", () => {
  const result = compute([minimalItem()]);
  const out = findOutput(result, "schedule1");
  assertEquals(out, undefined);
});

Deno.test("box2_rental_re routes to schedule1 line5_schedule_e", () => {
  const result = compute([minimalItem({ box2_rental_re: 2500 })]);
  const out = findOutput(result, "schedule1");
  assertEquals(out?.fields.line5_schedule_e, 2500);
});

Deno.test("box3_other_rental routes to schedule1 line5_schedule_e", () => {
  const result = compute([minimalItem({ box3_other_rental: 1200 })]);
  const out = findOutput(result, "schedule1");
  assertEquals(out?.fields.line5_schedule_e, 1200);
});

Deno.test("box4a_guaranteed_services routes to schedule1", () => {
  const result = compute([minimalItem({ box4a_guaranteed_services: 5000 })]);
  const out = findOutput(result, "schedule1");
  assertEquals(out?.fields.line5_schedule_e, 5000);
});

Deno.test("box4a_guaranteed_services routes to schedule_se", () => {
  const result = compute([minimalItem({ box4a_guaranteed_services: 5000 })]);
  const out = findOutput(result, "schedule_se");
  assertEquals(out !== undefined, true);
});

Deno.test("box4b_guaranteed_capital routes to schedule1 but not schedule_se", () => {
  const result = compute([minimalItem({ box4b_guaranteed_capital: 2000 })]);
  const sch1 = findOutput(result, "schedule1");
  assertEquals(sch1?.fields.line5_schedule_e, 2000);
  const schSe = findOutput(result, "schedule_se");
  assertEquals(schSe, undefined);
});

Deno.test("box7_royalties routes to schedule1 line5_schedule_e", () => {
  const result = compute([minimalItem({ box7_royalties: 700 })]);
  const out = findOutput(result, "schedule1");
  assertEquals(out?.fields.line5_schedule_e, 700);
});

Deno.test("box5_interest routes to schedule_b taxable_interest_net", () => {
  const result = compute([minimalItem({ box5_interest: 350 })]);
  const out = findOutput(result, "schedule_b");
  assertEquals(out?.fields.taxable_interest_net, 350);
});

Deno.test("zero box5_interest does not route to schedule_b", () => {
  const result = compute([minimalItem()]);
  const out = findOutput(result, "schedule_b");
  assertEquals(out, undefined);
});

Deno.test("box6a_ordinary_dividends routes to schedule_b ordinaryDividends", () => {
  const result = compute([minimalItem({ box6a_ordinary_dividends: 500 })]);
  const out = findOutput(result, "schedule_b");
  assertEquals(out?.fields.ordinaryDividends, 500);
});

Deno.test("box6b_qualified_dividends routes to f1040 line3a", () => {
  const result = compute([minimalItem({ box6b_qualified_dividends: 350 })]);
  const out = findOutput(result, "f1040");
  assertEquals(out?.fields.line3a_qualified_dividends, 350);
});

Deno.test("zero box6b does not route to f1040", () => {
  const result = compute([minimalItem()]);
  const out = findOutput(result, "f1040");
  assertEquals(out, undefined);
});

Deno.test("box8_net_st_cap_gain routes to schedule_d line_5_k1_st", () => {
  const result = compute([minimalItem({ box8_net_st_cap_gain: 1000 })]);
  const out = findOutput(result, "schedule_d");
  assertEquals(out?.fields.line_5_k1_st, 1000);
});

Deno.test("negative box8 routes to schedule_d as loss", () => {
  const result = compute([minimalItem({ box8_net_st_cap_gain: -500 })]);
  const out = findOutput(result, "schedule_d");
  assertEquals(out?.fields.line_5_k1_st, -500);
});

Deno.test("box9a_net_lt_cap_gain routes to schedule_d line_12_k1_lt", () => {
  const result = compute([minimalItem({ box9a_net_lt_cap_gain: 2500 })]);
  const out = findOutput(result, "schedule_d");
  assertEquals(out?.fields.line_12_k1_lt, 2500);
});

Deno.test("box14a_se_earnings routes to schedule_se", () => {
  const result = compute([minimalItem({ box14a_se_earnings: 10000 })]);
  const out = findOutput(result, "schedule_se");
  assertEquals(out !== undefined, true);
});

Deno.test("zero box14a does not route to schedule_se (no other SE income)", () => {
  const result = compute([minimalItem({ box1_ordinary_business: 5000 })]);
  const out = findOutput(result, "schedule_se");
  assertEquals(out, undefined);
});

Deno.test("box20z_qbi routes to form8995 qbi", () => {
  const result = compute([minimalItem({ box20z_qbi: 12000 })]);
  const out = findOutput(result, "form8995");
  assertEquals(out?.fields.qbi, 12000);
});

Deno.test("box20_w2_wages routes to form8995 w2_wages", () => {
  const result = compute([minimalItem({ box20z_qbi: 10000, box20_w2_wages: 6000 })]);
  const out = findOutput(result, "form8995");
  assertEquals(out?.fields.w2_wages, 6000);
});

Deno.test("box16_foreign_tax routes to form_1116", () => {
  const result = compute([minimalItem({ box16_foreign_tax: 180 })]);
  const out = findOutput(result, "form_1116");
  assertEquals(out?.fields.foreign_tax_paid, 180);
});

Deno.test("zero box16_foreign_tax does not route to form_1116", () => {
  const result = compute([minimalItem()]);
  const out = findOutput(result, "form_1116");
  assertEquals(out, undefined);
});

// ── 3. Aggregation across multiple K-1s ──────────────────────────────────────

Deno.test("box1 sums across K-1s to schedule1", () => {
  const result = compute([
    minimalItem({ box1_ordinary_business: 4000 }),
    minimalItem({ partnership_name: "Fund B", box1_ordinary_business: 3000 }),
  ]);
  const out = findOutput(result, "schedule1");
  assertEquals(out?.fields.line5_schedule_e, 7000);
});

Deno.test("box6b sums across K-1s to f1040 line3a", () => {
  const result = compute([
    minimalItem({ box6b_qualified_dividends: 200 }),
    minimalItem({ partnership_name: "Fund B", box6b_qualified_dividends: 300 }),
  ]);
  const out = findOutput(result, "f1040");
  assertEquals(out?.fields.line3a_qualified_dividends, 500);
});

Deno.test("box8 STCG sums across K-1s to schedule_d", () => {
  const result = compute([
    minimalItem({ box8_net_st_cap_gain: 1000 }),
    minimalItem({ partnership_name: "Fund B", box8_net_st_cap_gain: 500 }),
  ]);
  const out = findOutput(result, "schedule_d");
  assertEquals(out?.fields.line_5_k1_st, 1500);
});

Deno.test("box1+box2+box3+box4a+box4b+box7 combined in schedule1", () => {
  const result = compute([
    minimalItem({
      box1_ordinary_business: 2000,
      box2_rental_re: 1000,
      box3_other_rental: 500,
      box4a_guaranteed_services: 3000,
      box4b_guaranteed_capital: 500,
      box7_royalties: 400,
    }),
  ]);
  const out = findOutput(result, "schedule1");
  assertEquals(out?.fields.line5_schedule_e, 7400); // 2000+1000+500+3000+500+400
});

// ── 7. Informational fields ───────────────────────────────────────────────────

Deno.test("partnership_name alone produces no outputs", () => {
  const result = compute([minimalItem()]);
  assertEquals(result.outputs.length, 0);
});

// ── 8. Edge cases ─────────────────────────────────────────────────────────────

Deno.test("all-zero K-1 produces no outputs", () => {
  const result = compute([minimalItem()]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("STCG and LTCG produce single merged schedule_d output", () => {
  const result = compute([minimalItem({ box8_net_st_cap_gain: 800, box9a_net_lt_cap_gain: 1200 })]);
  const sdOutputs = result.outputs.filter((o) => o.nodeType === "schedule_d");
  assertEquals(sdOutputs.length, 1);
  assertEquals(sdOutputs[0].fields.line_5_k1_st, 800);
  assertEquals(sdOutputs[0].fields.line_12_k1_lt, 1200);
});

// ── 9. Smoke test ─────────────────────────────────────────────────────────────

Deno.test("smoke test — K-1 with all major boxes", () => {
  const result = compute([
    minimalItem({
      box1_ordinary_business: 20000,
      box4a_guaranteed_services: 5000,
      box5_interest: 400,
      box6a_ordinary_dividends: 600,
      box6b_qualified_dividends: 500,
      box8_net_st_cap_gain: 1000,
      box9a_net_lt_cap_gain: 3000,
      box14a_se_earnings: 25000,
      box16_foreign_tax: 200,
      box20z_qbi: 20000,
      box20_w2_wages: 10000,
    }),
  ]);
  // schedule1: box1 (20000) + box4a (5000) = 25000
  const sch1 = findOutput(result, "schedule1");
  assertEquals(sch1?.fields.line5_schedule_e, 25000);
  const f1040 = findOutput(result, "f1040");
  assertEquals(f1040?.fields.line3a_qualified_dividends, 500);
  const sd = findOutput(result, "schedule_d");
  assertEquals(sd?.fields.line_5_k1_st, 1000);
  assertEquals(sd?.fields.line_12_k1_lt, 3000);
  const schSe = findOutput(result, "schedule_se");
  assertEquals(schSe !== undefined, true);
  const f8995 = findOutput(result, "form8995");
  assertEquals(f8995?.fields.qbi, 20000);
  assertEquals(f8995?.fields.w2_wages, 10000);
  const f1116 = findOutput(result, "form_1116");
  assertEquals(f1116?.fields.foreign_tax_paid, 200);
});

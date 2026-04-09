import { assertEquals, assertThrows } from "@std/assert";
import { k1SCorpNode } from "./index.ts";

function minimalItem(overrides: Record<string, unknown> = {}) {
  return {
    corporation_name: "Test S Corp",
    ...overrides,
  };
}

function compute(items: ReturnType<typeof minimalItem>[]) {
  return k1SCorpNode.compute({ taxYear: 2025, formType: "f1040" }, { k1_s_corps: items });
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// ── 1. Input schema validation ────────────────────────────────────────────────

Deno.test("empty array throws", () => {
  assertThrows(() => k1SCorpNode.compute({ taxYear: 2025, formType: "f1040" }, { k1_s_corps: [] }), Error);
});

Deno.test("missing corporation_name throws", () => {
  assertThrows(
    () => k1SCorpNode.compute({ taxYear: 2025, formType: "f1040" }, { k1_s_corps: [{ box1_ordinary_business: 100 } as unknown as ReturnType<typeof minimalItem>] }),
    Error,
  );
});

Deno.test("negative box4_interest throws", () => {
  assertThrows(() => compute([minimalItem({ box4_interest: -1 })]), Error);
});

Deno.test("negative box5a_ordinary_dividends throws", () => {
  assertThrows(() => compute([minimalItem({ box5a_ordinary_dividends: -5 })]), Error);
});

Deno.test("negative box5b_qualified_dividends throws", () => {
  assertThrows(() => compute([minimalItem({ box5b_qualified_dividends: -10 })]), Error);
});

// ── 2. Per-box routing ────────────────────────────────────────────────────────

Deno.test("box1_ordinary_business routes to schedule1 line5_schedule_e", () => {
  const result = compute([minimalItem({ box1_ordinary_business: 5000 })]);
  const out = findOutput(result, "schedule1");
  assertEquals(out?.fields.line5_schedule_e, 5000);
});

Deno.test("negative box1 (loss) routes to schedule1 line5_schedule_e", () => {
  const result = compute([minimalItem({ box1_ordinary_business: -2000 })]);
  const out = findOutput(result, "schedule1");
  assertEquals(out?.fields.line5_schedule_e, -2000);
});

Deno.test("zero box1 does not route to schedule1", () => {
  const result = compute([minimalItem()]);
  const out = findOutput(result, "schedule1");
  assertEquals(out, undefined);
});

Deno.test("box2_rental_re routes to schedule1 line5_schedule_e", () => {
  const result = compute([minimalItem({ box2_rental_re: 3000 })]);
  const out = findOutput(result, "schedule1");
  assertEquals(out?.fields.line5_schedule_e, 3000);
});

Deno.test("box3_other_rental routes to schedule1 line5_schedule_e", () => {
  const result = compute([minimalItem({ box3_other_rental: 1500 })]);
  const out = findOutput(result, "schedule1");
  assertEquals(out?.fields.line5_schedule_e, 1500);
});

Deno.test("box6_royalties routes to schedule1 line5_schedule_e", () => {
  const result = compute([minimalItem({ box6_royalties: 800 })]);
  const out = findOutput(result, "schedule1");
  assertEquals(out?.fields.line5_schedule_e, 800);
});

Deno.test("box4_interest routes to schedule_b taxable_interest_net", () => {
  const result = compute([minimalItem({ box4_interest: 400 })]);
  const out = findOutput(result, "schedule_b");
  assertEquals(out?.fields.taxable_interest_net, 400);
});

Deno.test("zero box4_interest does not route to schedule_b", () => {
  const result = compute([minimalItem()]);
  const out = findOutput(result, "schedule_b");
  assertEquals(out, undefined);
});

Deno.test("box5a_ordinary_dividends routes to schedule_b ordinaryDividends", () => {
  const result = compute([minimalItem({ box5a_ordinary_dividends: 600 })]);
  const out = findOutput(result, "schedule_b");
  assertEquals(out?.fields.ordinaryDividends, 600);
});

Deno.test("box5b_qualified_dividends routes to f1040 line3a", () => {
  const result = compute([minimalItem({ box5b_qualified_dividends: 400 })]);
  const out = findOutput(result, "f1040");
  assertEquals(out?.fields.line3a_qualified_dividends, 400);
});

Deno.test("zero box5b does not route to f1040", () => {
  const result = compute([minimalItem()]);
  const out = findOutput(result, "f1040");
  assertEquals(out, undefined);
});

Deno.test("box7_net_st_cap_gain routes to schedule_d line_5_k1_st", () => {
  const result = compute([minimalItem({ box7_net_st_cap_gain: 1000 })]);
  const out = findOutput(result, "schedule_d");
  assertEquals(out?.fields.line_5_k1_st, 1000);
});

Deno.test("negative box7 routes to schedule_d as loss", () => {
  const result = compute([minimalItem({ box7_net_st_cap_gain: -300 })]);
  const out = findOutput(result, "schedule_d");
  assertEquals(out?.fields.line_5_k1_st, -300);
});

Deno.test("box8a_net_lt_cap_gain routes to schedule_d line_12_k1_lt", () => {
  const result = compute([minimalItem({ box8a_net_lt_cap_gain: 2000 })]);
  const out = findOutput(result, "schedule_d");
  assertEquals(out?.fields.line_12_k1_lt, 2000);
});

Deno.test("positive box1 routes to form8995 as qbi", () => {
  const result = compute([minimalItem({ box1_ordinary_business: 10000 })]);
  const out = findOutput(result, "form8995");
  assertEquals(out?.fields.qbi, 10000);
});

Deno.test("negative box1 does not route to form8995", () => {
  const result = compute([minimalItem({ box1_ordinary_business: -5000 })]);
  const out = findOutput(result, "form8995");
  assertEquals(out, undefined);
});

Deno.test("box17_w2_wages routes to form8995 w2_wages", () => {
  const result = compute([minimalItem({ box1_ordinary_business: 10000, box17_w2_wages: 5000 })]);
  const out = findOutput(result, "form8995");
  assertEquals(out?.fields.w2_wages, 5000);
});

Deno.test("box14_foreign_tax routes to form_1116", () => {
  const result = compute([minimalItem({ box14_foreign_tax: 200 })]);
  const out = findOutput(result, "form_1116");
  assertEquals(out?.fields.foreign_tax_paid, 200);
});

Deno.test("zero box14_foreign_tax does not route to form_1116", () => {
  const result = compute([minimalItem()]);
  const out = findOutput(result, "form_1116");
  assertEquals(out, undefined);
});

// ── 3. Aggregation across multiple K-1s ──────────────────────────────────────

Deno.test("box1 sums across K-1s to schedule1 line5_schedule_e", () => {
  const result = compute([
    minimalItem({ box1_ordinary_business: 3000 }),
    minimalItem({ corporation_name: "Corp B", box1_ordinary_business: 2000 }),
  ]);
  const out = findOutput(result, "schedule1");
  assertEquals(out?.fields.line5_schedule_e, 5000);
});

Deno.test("box5b sums across K-1s to f1040 line3a", () => {
  const result = compute([
    minimalItem({ box5b_qualified_dividends: 300 }),
    minimalItem({ corporation_name: "Corp B", box5b_qualified_dividends: 200 }),
  ]);
  const out = findOutput(result, "f1040");
  assertEquals(out?.fields.line3a_qualified_dividends, 500);
});

Deno.test("box7 STCG sums across K-1s to schedule_d", () => {
  const result = compute([
    minimalItem({ box7_net_st_cap_gain: 1000 }),
    minimalItem({ corporation_name: "Corp B", box7_net_st_cap_gain: 500 }),
  ]);
  const out = findOutput(result, "schedule_d");
  assertEquals(out?.fields.line_5_k1_st, 1500);
});

Deno.test("box1+box2+box3+box6 combined in schedule1 line5_schedule_e", () => {
  const result = compute([
    minimalItem({
      box1_ordinary_business: 2000,
      box2_rental_re: 1000,
      box3_other_rental: 500,
      box6_royalties: 300,
    }),
  ]);
  const out = findOutput(result, "schedule1");
  assertEquals(out?.fields.line5_schedule_e, 3800);
});

// ── 7. Informational fields ───────────────────────────────────────────────────

Deno.test("corporation_name alone produces no outputs", () => {
  const result = compute([minimalItem()]);
  assertEquals(result.outputs.length, 0);
});

// ── 8. Edge cases ─────────────────────────────────────────────────────────────

Deno.test("all-zero K-1 produces no outputs", () => {
  const result = compute([minimalItem()]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("STCG and LTCG produce single merged schedule_d output", () => {
  const result = compute([minimalItem({ box7_net_st_cap_gain: 500, box8a_net_lt_cap_gain: 1000 })]);
  const sdOutputs = result.outputs.filter((o) => o.nodeType === "schedule_d");
  assertEquals(sdOutputs.length, 1);
  assertEquals(sdOutputs[0].fields.line_5_k1_st, 500);
  assertEquals(sdOutputs[0].fields.line_12_k1_lt, 1000);
});

// ── 4. QBI dedicated fields (K199 screen) ─────────────────────────────────────

Deno.test("qbi_amount routes to form8995 qbi (non-SSTB)", () => {
  const result = compute([minimalItem({ qbi_amount: 12000 })]);
  const out = findOutput(result, "form8995");
  assertEquals(out?.fields.qbi, 12000);
});

Deno.test("qbi_amount overrides box1 for form8995 routing", () => {
  // qbi_amount provided: use it directly instead of clamping box1
  const result = compute([minimalItem({ box1_ordinary_business: 5000, qbi_amount: 8000 })]);
  const out = findOutput(result, "form8995");
  // resolveQbiAmount returns qbi_amount (8000) for the non-SSTB item
  assertEquals(out?.fields.qbi, 8000);
});

Deno.test("w2_wages field routes to form8995 w2_wages", () => {
  const result = compute([minimalItem({ qbi_amount: 5000, w2_wages: 3000 })]);
  const out = findOutput(result, "form8995");
  assertEquals(out?.fields.w2_wages, 3000);
});

Deno.test("ubia_qualified_property routes to form8995 unadjusted_basis", () => {
  const result = compute([minimalItem({ qbi_amount: 5000, ubia_qualified_property: 50000 })]);
  const out = findOutput(result, "form8995");
  assertEquals(out?.fields.unadjusted_basis, 50000);
});

Deno.test("sstb_indicator true excludes item from form8995 non-SSTB pool", () => {
  // SSTB item should not contribute to form8995 (would go to form8995a instead)
  const result = compute([minimalItem({ qbi_amount: 10000, sstb_indicator: true })]);
  const out = findOutput(result, "form8995");
  assertEquals(out, undefined);
});

Deno.test("mixed SSTB and non-SSTB: only non-SSTB routes to form8995", () => {
  const result = compute([
    minimalItem({ corporation_name: "Corp A", qbi_amount: 8000, sstb_indicator: false }),
    minimalItem({ corporation_name: "Corp B", qbi_amount: 5000, sstb_indicator: true }),
  ]);
  const out = findOutput(result, "form8995");
  // Only Corp A's 8000 should appear
  assertEquals(out?.fields.qbi, 8000);
});

Deno.test("negative qbi_amount does not route to form8995", () => {
  const result = compute([minimalItem({ qbi_amount: -3000 })]);
  const out = findOutput(result, "form8995");
  assertEquals(out, undefined);
});

Deno.test("box17_w2_wages and w2_wages are additive in form8995", () => {
  const result = compute([minimalItem({ box1_ordinary_business: 10000, box17_w2_wages: 2000, w2_wages: 3000 })]);
  const out = findOutput(result, "form8995");
  assertEquals(out?.fields.w2_wages, 5000);
});

// ── 5. Form 7203 basis routing (K1S > "Basis (7203)" tab) ────────────────────

Deno.test("stock_basis_beginning routes to form7203", () => {
  const result = compute([minimalItem({ stock_basis_beginning: 10000 })]);
  const out = findOutput(result, "form7203");
  assertEquals(out?.fields.stock_basis_beginning, 10000);
});

Deno.test("debt_basis_beginning routes to form7203", () => {
  const result = compute([minimalItem({ debt_basis_beginning: 5000 })]);
  const out = findOutput(result, "form7203");
  assertEquals(out?.fields.debt_basis_beginning, 5000);
});

Deno.test("no basis fields does not route to form7203", () => {
  const result = compute([minimalItem({ box1_ordinary_business: 10000 })]);
  const out = findOutput(result, "form7203");
  assertEquals(out, undefined);
});

Deno.test("loss with stock basis routes ordinary_loss to form7203", () => {
  const result = compute([minimalItem({ box1_ordinary_business: -4000, stock_basis_beginning: 3000 })]);
  const out = findOutput(result, "form7203");
  assertEquals(out?.fields.ordinary_loss, 4000);
});

// ── 6. Pre-2018 carryover fields ──────────────────────────────────────────────

Deno.test("pre2018_suspended_losses routes to form7203 as prior_year_unallowed_loss", () => {
  const result = compute([minimalItem({ pre2018_suspended_losses: 7000 })]);
  const out = findOutput(result, "form7203");
  assertEquals(out?.fields.prior_year_unallowed_loss, 7000);
});

Deno.test("pre2018_at_risk_suspended routes to form7203 as prior_year_unallowed_loss", () => {
  const result = compute([minimalItem({ pre2018_at_risk_suspended: 2500 })]);
  const out = findOutput(result, "form7203");
  assertEquals(out?.fields.prior_year_unallowed_loss, 2500);
});

Deno.test("negative pre2018_suspended_losses throws", () => {
  assertThrows(() => compute([minimalItem({ pre2018_suspended_losses: -100 })]), Error);
});

Deno.test("negative pre2018_at_risk_suspended throws", () => {
  assertThrows(() => compute([minimalItem({ pre2018_at_risk_suspended: -50 })]), Error);
});

// ── 9. Smoke test ─────────────────────────────────────────────────────────────

Deno.test("smoke test — K-1 with all major boxes", () => {
  const result = compute([
    minimalItem({
      box1_ordinary_business: 15000,
      box2_rental_re: 2000,
      box4_interest: 300,
      box5a_ordinary_dividends: 500,
      box5b_qualified_dividends: 400,
      box7_net_st_cap_gain: 800,
      box8a_net_lt_cap_gain: 1500,
      box17_w2_wages: 8000,
      box14_foreign_tax: 150,
    }),
  ]);
  const sch1 = findOutput(result, "schedule1");
  assertEquals(sch1?.fields.line5_schedule_e, 17000); // 15000 + 2000
  const f1040 = findOutput(result, "f1040");
  assertEquals(f1040?.fields.line3a_qualified_dividends, 400);
  const sd = findOutput(result, "schedule_d");
  assertEquals(sd?.fields.line_5_k1_st, 800);
  assertEquals(sd?.fields.line_12_k1_lt, 1500);
  const f8995 = findOutput(result, "form8995");
  assertEquals(f8995?.fields.qbi, 15000);
  assertEquals(f8995?.fields.w2_wages, 8000);
  const f1116 = findOutput(result, "form_1116");
  assertEquals(f1116?.fields.foreign_tax_paid, 150);
});

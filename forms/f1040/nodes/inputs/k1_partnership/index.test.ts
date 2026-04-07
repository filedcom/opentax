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

Deno.test("box4a_guaranteed_services routes to schedule_se net_profit_schedule_c", () => {
  const result = compute([minimalItem({ box4a_guaranteed_services: 5000 })]);
  const out = findOutput(result, "schedule_se");
  assertEquals(out?.fields.net_profit_schedule_c, 5000);
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

Deno.test("box14a_se_earnings routes to schedule_se net_profit_schedule_c", () => {
  const result = compute([minimalItem({ box14a_se_earnings: 10000 })]);
  const out = findOutput(result, "schedule_se");
  assertEquals(out?.fields.net_profit_schedule_c, 10000);
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

// ── 5. QBI extended fields (K199 screen) ─────────────────────────────────────

Deno.test("box20_sstb true is accepted and does not produce extra outputs", () => {
  // SSTB indicator is informational in this node — Form 8995-A handles phaseout.
  // The field must be accepted by the schema without throwing.
  const result = compute([minimalItem({ box20z_qbi: 10000, box20_sstb: true })]);
  const out = findOutput(result, "form8995");
  assertEquals(out?.fields.qbi, 10000);
});

Deno.test("box20_sstb false is accepted", () => {
  const result = compute([minimalItem({ box20z_qbi: 5000, box20_sstb: false })]);
  const out = findOutput(result, "form8995");
  assertEquals(out?.fields.qbi, 5000);
});

Deno.test("box20_aggregation_group is accepted and does not affect routing", () => {
  const result = compute([minimalItem({ box20z_qbi: 8000, box20_aggregation_group: "GroupA" })]);
  const out = findOutput(result, "form8995");
  assertEquals(out?.fields.qbi, 8000);
});

// ── 6. Partner Basis Worksheet fields (K1P > "Basis Wkst" tab) ───────────────

Deno.test("basis_beginning is accepted (informational; no routing output)", () => {
  const result = compute([minimalItem({ basis_beginning: 50000 })]);
  // Basis fields are worksheet-only; they do not route to downstream nodes.
  assertEquals(result.outputs.length, 0);
});

Deno.test("basis_contributions is accepted", () => {
  const result = compute([minimalItem({ basis_contributions: 10000 })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("basis_share_of_income is accepted", () => {
  const result = compute([minimalItem({ basis_share_of_income: 3000 })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("basis_share_of_losses is accepted", () => {
  const result = compute([minimalItem({ basis_share_of_losses: 2000 })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("basis_distributions is accepted", () => {
  const result = compute([minimalItem({ basis_distributions: 5000 })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("basis_liabilities_assumed is accepted", () => {
  const result = compute([minimalItem({ basis_liabilities_assumed: 15000 })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("basis_liabilities_relieved is accepted", () => {
  const result = compute([minimalItem({ basis_liabilities_relieved: 5000 })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("negative basis_beginning throws (nonnegative constraint)", () => {
  assertThrows(() => compute([minimalItem({ basis_beginning: -100 })]), Error);
});

Deno.test("basis worksheet fields alongside income produce correct income routing", () => {
  // Basis fields are stored but do not affect routing of income boxes.
  const result = compute([
    minimalItem({
      box1_ordinary_business: 12000,
      basis_beginning: 30000,
      basis_contributions: 5000,
      basis_distributions: 2000,
    }),
  ]);
  const sch1 = findOutput(result, "schedule1");
  assertEquals(sch1?.fields.line5_schedule_e, 12000);
});

// ── 7. Pre-2018 Basis Carryover fields (K1P> "Pre-2018 Basis" tab) ───────────

Deno.test("pre2018_basis_ordinary_loss is accepted (informational; no routing output)", () => {
  const result = compute([minimalItem({ pre2018_basis_ordinary_loss: 4000 })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("pre2018_basis_st_cap_loss is accepted", () => {
  const result = compute([minimalItem({ pre2018_basis_st_cap_loss: 1500 })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("pre2018_basis_lt_cap_loss is accepted", () => {
  const result = compute([minimalItem({ pre2018_basis_lt_cap_loss: 2500 })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("pre2018_basis_other_loss is accepted", () => {
  const result = compute([minimalItem({ pre2018_basis_other_loss: 1000 })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("negative pre2018_basis_ordinary_loss throws (nonnegative constraint)", () => {
  assertThrows(() => compute([minimalItem({ pre2018_basis_ordinary_loss: -500 })]), Error);
});

// ── 8. Pre-2018 At-Risk Carryover fields (K1P> "Pre-2018 At-Risk" tab) ───────

Deno.test("pre2018_atrisk_ordinary_loss is accepted (informational; no routing output)", () => {
  const result = compute([minimalItem({ pre2018_atrisk_ordinary_loss: 6000 })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("pre2018_atrisk_st_cap_loss is accepted", () => {
  const result = compute([minimalItem({ pre2018_atrisk_st_cap_loss: 2000 })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("pre2018_atrisk_lt_cap_loss is accepted", () => {
  const result = compute([minimalItem({ pre2018_atrisk_lt_cap_loss: 3000 })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("pre2018_atrisk_other_loss is accepted", () => {
  const result = compute([minimalItem({ pre2018_atrisk_other_loss: 1500 })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("negative pre2018_atrisk_ordinary_loss throws (nonnegative constraint)", () => {
  assertThrows(() => compute([minimalItem({ pre2018_atrisk_ordinary_loss: -100 })]), Error);
});

Deno.test("pre-2018 carryover fields alongside QBI produce correct QBI routing", () => {
  const result = compute([
    minimalItem({
      box20z_qbi: 15000,
      pre2018_basis_ordinary_loss: 3000,
      pre2018_atrisk_ordinary_loss: 2000,
    }),
  ]);
  const f8995 = findOutput(result, "form8995");
  assertEquals(f8995?.fields.qbi, 15000);
});

// ── 9. Informational fields ───────────────────────────────────────────────────

Deno.test("partnership_name alone produces no outputs", () => {
  const result = compute([minimalItem()]);
  assertEquals(result.outputs.length, 0);
});

// ── 10. Edge cases ────────────────────────────────────────────────────────────

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

// ── 11. SE tax priority and multiple K-1 aggregation ─────────────────────────

Deno.test("box14a takes priority over box4a for schedule_se when both present", () => {
  // Box 14a is the authoritative SE earnings figure; box4a fallback only when 14a absent
  const result = compute([minimalItem({ box4a_guaranteed_services: 5000, box14a_se_earnings: 12000 })]);
  const out = findOutput(result, "schedule_se");
  assertEquals(out?.fields.net_profit_schedule_c, 12000);
});

Deno.test("box14a_se_earnings from two K-1s produces two separate schedule_se outputs", () => {
  // Each partnership issues its own SE earnings; each produces a distinct SE output
  const result = compute([
    minimalItem({ box14a_se_earnings: 8000 }),
    minimalItem({ partnership_name: "Fund B", box14a_se_earnings: 6000 }),
  ]);
  const seOutputs = result.outputs.filter((o) => o.nodeType === "schedule_se");
  assertEquals(seOutputs.length, 2);
  const total = seOutputs.reduce((sum, o) => sum + (o.fields.net_profit_schedule_c as number), 0);
  assertEquals(total, 14000);
});

Deno.test("box20z_qbi sums across K-1s to form8995 qbi", () => {
  const result = compute([
    minimalItem({ box20z_qbi: 10000 }),
    minimalItem({ partnership_name: "Fund B", box20z_qbi: 5000 }),
  ]);
  const out = findOutput(result, "form8995");
  assertEquals(out?.fields.qbi, 15000);
});

Deno.test("box20_w2_wages sums across K-1s to form8995 w2_wages", () => {
  const result = compute([
    minimalItem({ box20z_qbi: 8000, box20_w2_wages: 4000 }),
    minimalItem({ partnership_name: "Fund B", box20z_qbi: 4000, box20_w2_wages: 2000 }),
  ]);
  const out = findOutput(result, "form8995");
  assertEquals(out?.fields.w2_wages, 6000);
});

Deno.test("loss K-1 (box1 negative) does not suppress QBI from a second profitable K-1", () => {
  const result = compute([
    minimalItem({ box1_ordinary_business: -3000 }),
    minimalItem({ partnership_name: "Fund B", box20z_qbi: 7000 }),
  ]);
  // schedule1 nets to -3000 + 0 = -3000
  const sch1 = findOutput(result, "schedule1");
  assertEquals(sch1?.fields.line5_schedule_e, -3000);
  // QBI routes only from the second K-1
  const f8995 = findOutput(result, "form8995");
  assertEquals(f8995?.fields.qbi, 7000);
});

// ── 12. Smoke test ────────────────────────────────────────────────────────────

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
  assertEquals(schSe?.fields.net_profit_schedule_c, 25000);
  const f8995 = findOutput(result, "form8995");
  assertEquals(f8995?.fields.qbi, 20000);
  assertEquals(f8995?.fields.w2_wages, 10000);
  const f1116 = findOutput(result, "form_1116");
  assertEquals(f1116?.fields.foreign_tax_paid, 200);
});

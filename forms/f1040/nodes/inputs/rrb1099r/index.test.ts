import { assertEquals, assertThrows } from "@std/assert";
import { rrb1099r } from "./index.ts";

function minimalItem(overrides: Record<string, unknown> = {}) {
  return { payer_name: "RRB", ...overrides };
}

function compute(items: ReturnType<typeof minimalItem>[]) {
  return rrb1099r.compute({ taxYear: 2025 }, { rrb1099rs: items });
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

function f1040Fields(result: ReturnType<typeof compute>) {
  return (findOutput(result, "f1040")?.fields ?? {}) as Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// 1. Input Validation
// ---------------------------------------------------------------------------

Deno.test("rrb1099r: empty array throws (min(1) constraint)", () => {
  assertThrows(
    () => rrb1099r.compute({ taxYear: 2025 }, { rrb1099rs: [] }),
    Error,
  );
});

Deno.test("rrb1099r: missing payer_name throws", () => {
  // Cast to any to bypass compile-time type check — verifies runtime Zod validation
  // deno-lint-ignore no-explicit-any
  const badInput = { rrb1099rs: [{ box3_sseb_gross: 1000 }] } as any;
  assertThrows(
    () => rrb1099r.compute({ taxYear: 2025 }, badInput),
    Error,
  );
});

Deno.test("rrb1099r: negative box3_sseb_gross throws", () => {
  assertThrows(
    () => compute([minimalItem({ box3_sseb_gross: -100 })]),
    Error,
  );
});

Deno.test("rrb1099r: negative box8_tier2_gross throws", () => {
  assertThrows(
    () => compute([minimalItem({ box8_tier2_gross: -1 })]),
    Error,
  );
});

Deno.test("rrb1099r: item with only payer_name (no dollar amounts) produces no output", () => {
  const result = compute([minimalItem()]);
  assertEquals(result.outputs.length, 0);
});

// ---------------------------------------------------------------------------
// 2. SSEB (Tier 1 SS-equivalent) → f1040 line 6a
// ---------------------------------------------------------------------------

Deno.test("rrb1099r: box3_sseb_gross routes to f1040 line6a_ss_gross", () => {
  const result = compute([minimalItem({ box3_sseb_gross: 12000 })]);
  assertEquals(f1040Fields(result).line6a_ss_gross, 12000);
});

Deno.test("rrb1099r: SSEB net computed from box3 minus box4 when box5 absent", () => {
  const result = compute([minimalItem({ box3_sseb_gross: 12000, box4_sseb_repaid: 2000 })]);
  assertEquals(f1040Fields(result).line6a_ss_gross, 10000);
});

Deno.test("rrb1099r: box5_sseb_net takes precedence over box3 minus box4", () => {
  const result = compute([minimalItem({
    box3_sseb_gross: 12000,
    box4_sseb_repaid: 2000,
    box5_sseb_net: 9500,
  })]);
  assertEquals(f1040Fields(result).line6a_ss_gross, 9500);
});

Deno.test("rrb1099r: repayment exactly equals gross produces zero SSEB — no line6a", () => {
  const result = compute([minimalItem({ box3_sseb_gross: 5000, box4_sseb_repaid: 5000 })]);
  assertEquals(f1040Fields(result).line6a_ss_gross, undefined);
});

Deno.test("rrb1099r: repayment exceeding gross floors SSEB at 0 — no line6a", () => {
  const result = compute([minimalItem({ box3_sseb_gross: 1000, box4_sseb_repaid: 5000 })]);
  assertEquals(f1040Fields(result).line6a_ss_gross, undefined);
});

Deno.test("rrb1099r: zero box3_sseb_gross produces no line6a_ss_gross", () => {
  const result = compute([minimalItem({ box3_sseb_gross: 0 })]);
  assertEquals(f1040Fields(result).line6a_ss_gross, undefined);
});

// ---------------------------------------------------------------------------
// 3. Tier 2 pension → f1040 lines 5a / 5b
// ---------------------------------------------------------------------------

Deno.test("rrb1099r: box8_tier2_gross routes to f1040 line5a_pension_gross", () => {
  const result = compute([minimalItem({ box8_tier2_gross: 8000 })]);
  assertEquals(f1040Fields(result).line5a_pension_gross, 8000);
});

Deno.test("rrb1099r: Tier 2 fully taxable when no box9 and no simplified method", () => {
  const result = compute([minimalItem({ box8_tier2_gross: 8000 })]);
  assertEquals(f1040Fields(result).line5b_pension_taxable, 8000);
});

Deno.test("rrb1099r: box9_tier2_taxable used when box2a absent and no SM", () => {
  const result = compute([minimalItem({ box8_tier2_gross: 8000, box9_tier2_taxable: 6000 })]);
  assertEquals(f1040Fields(result).line5b_pension_taxable, 6000);
});

Deno.test("rrb1099r: box2a_taxable_amount takes precedence over box9_tier2_taxable", () => {
  const result = compute([minimalItem({
    box8_tier2_gross: 8000,
    box9_tier2_taxable: 6000,
    box2a_taxable_amount: 5000,
  })]);
  assertEquals(f1040Fields(result).line5b_pension_taxable, 5000);
});

Deno.test("rrb1099r: box2a_taxable_amount takes precedence over simplified method", () => {
  const result = compute([minimalItem({
    box8_tier2_gross: 8000,
    box2a_taxable_amount: 5000,
    simplified_method_flag: true,
    box5b_employee_contributions: 20000,
    age_at_annuity_start: 62,
  })]);
  assertEquals(f1040Fields(result).line5b_pension_taxable, 5000);
});

Deno.test("rrb1099r: zero box8_tier2_gross produces no line5a or line5b", () => {
  const result = compute([minimalItem({ box8_tier2_gross: 0 })]);
  assertEquals(f1040Fields(result).line5a_pension_gross, undefined);
  assertEquals(f1040Fields(result).line5b_pension_taxable, undefined);
});

Deno.test("rrb1099r: line5b_pension_taxable emitted as 0 when Tier 2 gross present but fully excluded", () => {
  // SM with cost still remaining, annual exclusion >= gross → taxable is 0
  const result = compute([minimalItem({
    box8_tier2_gross: 100,
    simplified_method_flag: true,
    box5b_employee_contributions: 100000,
    age_at_annuity_start: 55,
    prior_excludable_recovered: 0,
  })]);
  // annual exclusion = (100000 / 360) * 12 = ~3333 > 100 → min(3333, 100) = 100 → taxable = 0
  assertEquals(f1040Fields(result).line5a_pension_gross, 100);
  assertEquals(f1040Fields(result).line5b_pension_taxable, 0);
});

// ---------------------------------------------------------------------------
// 4. Simplified Method — age bracket coverage (IRC §72(d)(1)(B)(iv))
// ---------------------------------------------------------------------------

Deno.test("rrb1099r: SM age ≤ 55 uses 360 months", () => {
  // cost=3600, age=55, prior=0 → annual_exclusion = (3600/360)*12 = 120
  const result = compute([minimalItem({
    box8_tier2_gross: 10000,
    simplified_method_flag: true,
    box5b_employee_contributions: 3600,
    age_at_annuity_start: 55,
    prior_excludable_recovered: 0,
  })]);
  assertEquals(f1040Fields(result).line5b_pension_taxable, 10000 - 120);
});

Deno.test("rrb1099r: SM age 56 uses 310 months", () => {
  // cost=3100, age=56 → annual_exclusion = (3100/310)*12 = 120
  const result = compute([minimalItem({
    box8_tier2_gross: 10000,
    simplified_method_flag: true,
    box5b_employee_contributions: 3100,
    age_at_annuity_start: 56,
    prior_excludable_recovered: 0,
  })]);
  assertEquals(f1040Fields(result).line5b_pension_taxable, 10000 - 120);
});

Deno.test("rrb1099r: SM age 60 uses 310 months", () => {
  const result = compute([minimalItem({
    box8_tier2_gross: 10000,
    simplified_method_flag: true,
    box5b_employee_contributions: 3100,
    age_at_annuity_start: 60,
    prior_excludable_recovered: 0,
  })]);
  assertEquals(f1040Fields(result).line5b_pension_taxable, 10000 - 120);
});

Deno.test("rrb1099r: SM age 61 uses 260 months", () => {
  // cost=2600, age=61 → annual_exclusion = (2600/260)*12 = 120
  const result = compute([minimalItem({
    box8_tier2_gross: 10000,
    simplified_method_flag: true,
    box5b_employee_contributions: 2600,
    age_at_annuity_start: 61,
    prior_excludable_recovered: 0,
  })]);
  assertEquals(f1040Fields(result).line5b_pension_taxable, 10000 - 120);
});

Deno.test("rrb1099r: SM age 65 uses 260 months", () => {
  const result = compute([minimalItem({
    box8_tier2_gross: 10000,
    simplified_method_flag: true,
    box5b_employee_contributions: 2600,
    age_at_annuity_start: 65,
    prior_excludable_recovered: 0,
  })]);
  assertEquals(f1040Fields(result).line5b_pension_taxable, 10000 - 120);
});

Deno.test("rrb1099r: SM age 66 uses 210 months", () => {
  // cost=2100, age=66 → annual_exclusion = (2100/210)*12 = 120
  const result = compute([minimalItem({
    box8_tier2_gross: 10000,
    simplified_method_flag: true,
    box5b_employee_contributions: 2100,
    age_at_annuity_start: 66,
    prior_excludable_recovered: 0,
  })]);
  assertEquals(f1040Fields(result).line5b_pension_taxable, 10000 - 120);
});

Deno.test("rrb1099r: SM age 70 uses 210 months", () => {
  const result = compute([minimalItem({
    box8_tier2_gross: 10000,
    simplified_method_flag: true,
    box5b_employee_contributions: 2100,
    age_at_annuity_start: 70,
    prior_excludable_recovered: 0,
  })]);
  assertEquals(f1040Fields(result).line5b_pension_taxable, 10000 - 120);
});

Deno.test("rrb1099r: SM age 71 uses 160 months", () => {
  // cost=1600, age=71 → annual_exclusion = (1600/160)*12 = 120
  const result = compute([minimalItem({
    box8_tier2_gross: 10000,
    simplified_method_flag: true,
    box5b_employee_contributions: 1600,
    age_at_annuity_start: 71,
    prior_excludable_recovered: 0,
  })]);
  assertEquals(f1040Fields(result).line5b_pension_taxable, 10000 - 120);
});

Deno.test("rrb1099r: SM prior_excludable_recovered reduces remaining cost", () => {
  // cost=2600, prior=1300, remaining=1300, age=61 (260 months)
  // annual_exclusion = (1300/260)*12 = 60
  const result = compute([minimalItem({
    box8_tier2_gross: 10000,
    simplified_method_flag: true,
    box5b_employee_contributions: 2600,
    age_at_annuity_start: 61,
    prior_excludable_recovered: 1300,
  })]);
  assertEquals(f1040Fields(result).line5b_pension_taxable, 10000 - 60);
});

Deno.test("rrb1099r: SM cost fully recovered (prior >= cost) → full gross taxable", () => {
  const result = compute([minimalItem({
    box8_tier2_gross: 8000,
    simplified_method_flag: true,
    box5b_employee_contributions: 5000,
    age_at_annuity_start: 62,
    prior_excludable_recovered: 5000,
  })]);
  assertEquals(f1040Fields(result).line5b_pension_taxable, 8000);
});

Deno.test("rrb1099r: SM exclusion capped at box8_tier2_gross (cannot exceed distribution)", () => {
  // Large cost relative to small gross; annual_exclusion would exceed gross
  // cost=100000, age=55, prior=0 → annual_exclusion = (100000/360)*12 ≈ 3333
  // but capped at gross=500 → taxable = 0
  const result = compute([minimalItem({
    box8_tier2_gross: 500,
    simplified_method_flag: true,
    box5b_employee_contributions: 100000,
    age_at_annuity_start: 55,
    prior_excludable_recovered: 0,
  })]);
  assertEquals(f1040Fields(result).line5b_pension_taxable, 0);
});

// ---------------------------------------------------------------------------
// 5. Withholding → f1040 line 25b
// ---------------------------------------------------------------------------

Deno.test("rrb1099r: box7_sseb_withheld routes to f1040 line25b_withheld_1099", () => {
  const result = compute([minimalItem({ box3_sseb_gross: 12000, box7_sseb_withheld: 1200 })]);
  assertEquals(f1040Fields(result).line25b_withheld_1099, 1200);
});

Deno.test("rrb1099r: box10_tier2_withheld routes to f1040 line25b_withheld_1099", () => {
  const result = compute([minimalItem({ box8_tier2_gross: 8000, box10_tier2_withheld: 800 })]);
  assertEquals(f1040Fields(result).line25b_withheld_1099, 800);
});

Deno.test("rrb1099r: box7 + box10 withholding summed to single line25b value", () => {
  const result = compute([minimalItem({
    box3_sseb_gross: 12000,
    box7_sseb_withheld: 1200,
    box8_tier2_gross: 8000,
    box10_tier2_withheld: 800,
  })]);
  assertEquals(f1040Fields(result).line25b_withheld_1099, 2000);
});

Deno.test("rrb1099r: zero withholding produces no line25b_withheld_1099", () => {
  const result = compute([minimalItem({ box3_sseb_gross: 12000 })]);
  assertEquals(f1040Fields(result).line25b_withheld_1099, undefined);
});

// ---------------------------------------------------------------------------
// 6. Aggregation across multiple items
// ---------------------------------------------------------------------------

Deno.test("rrb1099r: multiple items — SSEB summed to single line6a_ss_gross", () => {
  const result = compute([
    minimalItem({ box3_sseb_gross: 5000 }),
    minimalItem({ payer_name: "RRB B", box3_sseb_gross: 7000 }),
  ]);
  assertEquals(f1040Fields(result).line6a_ss_gross, 12000);
});

Deno.test("rrb1099r: multiple items — Tier 2 gross summed to single line5a_pension_gross", () => {
  const result = compute([
    minimalItem({ box8_tier2_gross: 5000 }),
    minimalItem({ payer_name: "RRB B", box8_tier2_gross: 3000 }),
  ]);
  assertEquals(f1040Fields(result).line5a_pension_gross, 8000);
});

Deno.test("rrb1099r: multiple items — Tier 2 taxable summed to single line5b_pension_taxable", () => {
  const result = compute([
    minimalItem({ box8_tier2_gross: 5000, box9_tier2_taxable: 4000 }),
    minimalItem({ payer_name: "RRB B", box8_tier2_gross: 3000, box9_tier2_taxable: 2500 }),
  ]);
  assertEquals(f1040Fields(result).line5b_pension_taxable, 6500);
});

Deno.test("rrb1099r: multiple items — withholding summed across all items", () => {
  const result = compute([
    minimalItem({ box3_sseb_gross: 5000, box7_sseb_withheld: 500 }),
    minimalItem({ payer_name: "RRB B", box8_tier2_gross: 3000, box10_tier2_withheld: 300 }),
  ]);
  assertEquals(f1040Fields(result).line25b_withheld_1099, 800);
});

Deno.test("rrb1099r: mixed items — one SSEB-only, one Tier2-only, both aggregated correctly", () => {
  const result = compute([
    minimalItem({ box3_sseb_gross: 10000, box7_sseb_withheld: 1000 }),
    minimalItem({ payer_name: "RRB B", box8_tier2_gross: 6000, box9_tier2_taxable: 5000, box10_tier2_withheld: 600 }),
  ]);
  assertEquals(f1040Fields(result).line6a_ss_gross, 10000);
  assertEquals(f1040Fields(result).line5a_pension_gross, 6000);
  assertEquals(f1040Fields(result).line5b_pension_taxable, 5000);
  assertEquals(f1040Fields(result).line25b_withheld_1099, 1600);
});

// ---------------------------------------------------------------------------
// 7. Output routing — single f1040 output object
// ---------------------------------------------------------------------------

Deno.test("rrb1099r: all fields merge into exactly one f1040 output", () => {
  const result = compute([minimalItem({
    box3_sseb_gross: 12000,
    box8_tier2_gross: 8000,
    box7_sseb_withheld: 1200,
  })]);
  const f1040Outputs = result.outputs.filter((o) => o.nodeType === "f1040");
  assertEquals(f1040Outputs.length, 1);
});

Deno.test("rrb1099r: does not route to schedule1", () => {
  const result = compute([minimalItem({ box3_sseb_gross: 12000 })]);
  const sched1 = findOutput(result, "schedule1");
  assertEquals(sched1, undefined);
});

Deno.test("rrb1099r: no income produces zero outputs total", () => {
  const result = compute([minimalItem()]);
  assertEquals(result.outputs.length, 0);
});

// ---------------------------------------------------------------------------
// 8. Smoke test — comprehensive with all major fields populated
// ---------------------------------------------------------------------------

Deno.test("rrb1099r: smoke test — SSEB + Tier2 SM + withholding all present", () => {
  // Two items: one with SSEB, one with Tier2 + SM
  const result = compute([
    minimalItem({
      box3_sseb_gross: 15000,
      box4_sseb_repaid: 500,
      box7_sseb_withheld: 1500,
    }),
    minimalItem({
      payer_name: "RRB Tier2",
      box8_tier2_gross: 10000,
      simplified_method_flag: true,
      box5b_employee_contributions: 2600,
      age_at_annuity_start: 65,
      prior_excludable_recovered: 0,
      box10_tier2_withheld: 1000,
    }),
  ]);

  const fields = f1040Fields(result);

  // SSEB net: 15000 - 500 = 14500
  assertEquals(fields.line6a_ss_gross, 14500);

  // Tier2 gross
  assertEquals(fields.line5a_pension_gross, 10000);

  // SM: cost=2600, age=65 → 260 months → annual_exclusion = (2600/260)*12 = 120
  // taxable = 10000 - 120 = 9880
  assertEquals(fields.line5b_pension_taxable, 9880);

  // Withholding: 1500 + 1000 = 2500
  assertEquals(fields.line25b_withheld_1099, 2500);

  // Exactly one f1040 output
  assertEquals(result.outputs.filter((o) => o.nodeType === "f1040").length, 1);
});

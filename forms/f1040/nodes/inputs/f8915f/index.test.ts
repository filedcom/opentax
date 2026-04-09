import { assertEquals, assertThrows } from "@std/assert";
import { f8915f } from "./index.ts";

function minimalItem(overrides: Record<string, unknown> = {}) {
  return { ...overrides };
}

function compute(items: ReturnType<typeof minimalItem>[]) {
  return f8915f.compute({ taxYear: 2025, formType: "f1040" }, { f8915fs: items });
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// =============================================================================
// 1. Input Schema Validation
// =============================================================================

Deno.test("f8915f.inputSchema: valid minimal item passes", () => {
  const parsed = f8915f.inputSchema.safeParse({ f8915fs: [{}] });
  assertEquals(parsed.success, true);
});

Deno.test("f8915f.inputSchema: empty array fails (min 1)", () => {
  const parsed = f8915f.inputSchema.safeParse({ f8915fs: [] });
  assertEquals(parsed.success, false);
});

Deno.test("f8915f.inputSchema: negative total_distribution fails", () => {
  const parsed = f8915f.inputSchema.safeParse({
    f8915fs: [{ total_distribution: -1000 }],
  });
  assertEquals(parsed.success, false);
});

Deno.test("f8915f.inputSchema: negative amount_reported_prior_year1 fails", () => {
  const parsed = f8915f.inputSchema.safeParse({
    f8915fs: [{ amount_reported_prior_year1: -500 }],
  });
  assertEquals(parsed.success, false);
});

Deno.test("f8915f.inputSchema: negative amount_reported_prior_year2 fails", () => {
  const parsed = f8915f.inputSchema.safeParse({
    f8915fs: [{ amount_reported_prior_year2: -500 }],
  });
  assertEquals(parsed.success, false);
});

Deno.test("f8915f.inputSchema: negative repayments_this_year fails", () => {
  const parsed = f8915f.inputSchema.safeParse({
    f8915fs: [{ repayments_this_year: -200 }],
  });
  assertEquals(parsed.success, false);
});

Deno.test("f8915f.inputSchema: valid full item passes", () => {
  const parsed = f8915f.inputSchema.safeParse({
    f8915fs: [{
      disaster_type: "COVID-19",
      distribution_year: 2020,
      total_distribution: 30000,
      amount_reported_prior_year1: 10000,
      amount_reported_prior_year2: 10000,
      repayments_this_year: 0,
      elect_full_inclusion: false,
    }],
  });
  assertEquals(parsed.success, true);
});

// =============================================================================
// 2. Three-Year Spreading — Default (1/3 per year)
// =============================================================================

Deno.test("f8915f.compute: year 1 spreading — reports 1/3 of total", () => {
  // No prior-year amounts — this is first year
  const result = compute([minimalItem({
    total_distribution: 30000,
    amount_reported_prior_year1: 0,
    amount_reported_prior_year2: 0,
  })]);
  const out = findOutput(result, "schedule1");
  assertEquals(out?.fields.line8z_other_income, 10000);
});

Deno.test("f8915f.compute: year 2 spreading — reports up to 1/3, given prior year 1 reported", () => {
  // Prior year 1 reported 10000, now report up to another 10000
  const result = compute([minimalItem({
    total_distribution: 30000,
    amount_reported_prior_year1: 10000,
    amount_reported_prior_year2: 0,
  })]);
  const out = findOutput(result, "schedule1");
  assertEquals(out?.fields.line8z_other_income, 10000);
});

Deno.test("f8915f.compute: year 3 spreading — reports remaining balance", () => {
  // Prior years reported 20000, remaining = 10000
  const result = compute([minimalItem({
    total_distribution: 30000,
    amount_reported_prior_year1: 10000,
    amount_reported_prior_year2: 10000,
  })]);
  const out = findOutput(result, "schedule1");
  assertEquals(out?.fields.line8z_other_income, 10000);
});

Deno.test("f8915f.compute: spreading complete — no income output", () => {
  // Both prior years sum to total — nothing remaining
  const result = compute([minimalItem({
    total_distribution: 30000,
    amount_reported_prior_year1: 15000,
    amount_reported_prior_year2: 15000,
  })]);
  assertEquals(findOutput(result, "schedule1"), undefined);
});

Deno.test("f8915f.compute: no distribution — no output", () => {
  const result = compute([minimalItem({})]);
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 3. Elect Full Inclusion
// =============================================================================

Deno.test("f8915f.compute: elect_full_inclusion = true — reports all remaining in one year", () => {
  // 30000 total, 5000 already reported, elect full = reports 25000 this year
  const result = compute([minimalItem({
    total_distribution: 30000,
    amount_reported_prior_year1: 5000,
    amount_reported_prior_year2: 0,
    elect_full_inclusion: true,
  })]);
  const out = findOutput(result, "schedule1");
  assertEquals(out?.fields.line8z_other_income, 25000);
});

Deno.test("f8915f.compute: elect_full_inclusion = true, year 1 — reports full total", () => {
  const result = compute([minimalItem({
    total_distribution: 30000,
    elect_full_inclusion: true,
  })]);
  const out = findOutput(result, "schedule1");
  assertEquals(out?.fields.line8z_other_income, 30000);
});

Deno.test("f8915f.compute: elect_full_inclusion = false — uses 1/3 spreading", () => {
  const result = compute([minimalItem({
    total_distribution: 30000,
    elect_full_inclusion: false,
  })]);
  const out = findOutput(result, "schedule1");
  assertEquals(out?.fields.line8z_other_income, 10000);
});

// =============================================================================
// 4. Repayments Reduce Income
// =============================================================================

Deno.test("f8915f.compute: repayments reduce reportable income", () => {
  // reportable = 10000, repayments = 4000, net = 6000
  const result = compute([minimalItem({
    total_distribution: 30000,
    repayments_this_year: 4000,
  })]);
  const out = findOutput(result, "schedule1");
  assertEquals(out?.fields.line8z_other_income, 6000);
});

Deno.test("f8915f.compute: repayments equal reportable — no income output", () => {
  // reportable = 10000, repayments = 10000, net = 0
  const result = compute([minimalItem({
    total_distribution: 30000,
    repayments_this_year: 10000,
  })]);
  assertEquals(findOutput(result, "schedule1"), undefined);
});

Deno.test("f8915f.compute: repayments exceed reportable — excess creates negative income (credit)", () => {
  // reportable = 10000, repayments = 15000, excess = 5000 → schedule1 credit of -5000
  const result = compute([minimalItem({
    total_distribution: 30000,
    repayments_this_year: 15000,
  })]);
  const out = findOutput(result, "schedule1");
  assertEquals(out?.fields.line8z_other_income, -5000);
});

Deno.test("f8915f.compute: full repayment of entire distribution — large credit", () => {
  // reportable = 10000 (1/3), repayments = 30000 → credit = 20000
  const result = compute([minimalItem({
    total_distribution: 30000,
    repayments_this_year: 30000,
  })]);
  const out = findOutput(result, "schedule1");
  assertEquals(out?.fields.line8z_other_income, -20000);
});

// =============================================================================
// 5. Hard Validation
// =============================================================================

Deno.test("f8915f.compute: throws on negative total_distribution", () => {
  assertThrows(
    () => compute([minimalItem({ total_distribution: -1000 })]),
    Error,
  );
});

Deno.test("f8915f.compute: throws on negative repayments_this_year", () => {
  assertThrows(
    () => compute([minimalItem({ repayments_this_year: -500 })]),
    Error,
  );
});

Deno.test("f8915f.compute: zero total_distribution does not throw", () => {
  const result = compute([minimalItem({ total_distribution: 0 })]);
  assertEquals(Array.isArray(result.outputs), true);
});

// =============================================================================
// 6. Aggregation — Multiple Form 8915-F Items
// =============================================================================

Deno.test("f8915f.compute: multiple 8915-F items — income aggregated", () => {
  const result = compute([
    minimalItem({ total_distribution: 30000 }),                // reportable = 10000
    minimalItem({ total_distribution: 60000 }),                // reportable = 20000
  ]);
  const out = findOutput(result, "schedule1");
  assertEquals(out?.fields.line8z_other_income, 30000);
});

Deno.test("f8915f.compute: multiple items, one with zero remaining — only active emits", () => {
  const result = compute([
    minimalItem({ total_distribution: 30000 }),                // reportable = 10000
    minimalItem({                                               // spreading complete
      total_distribution: 30000,
      amount_reported_prior_year1: 15000,
      amount_reported_prior_year2: 15000,
    }),
  ]);
  const out = findOutput(result, "schedule1");
  assertEquals(out?.fields.line8z_other_income, 10000);
});

// =============================================================================
// 7. Edge Cases
// =============================================================================

Deno.test("f8915f.compute: remaining less than 1/3 — reports only remaining", () => {
  // total=30000, prior1=10000, prior2=9000 → remaining=11000, 1/3=10000 → report min(10000, 11000) = 10000
  const result = compute([minimalItem({
    total_distribution: 30000,
    amount_reported_prior_year1: 10000,
    amount_reported_prior_year2: 9000,
  })]);
  const out = findOutput(result, "schedule1");
  // remaining=11000, one_third=10000 → reportable=10000
  assertEquals(out?.fields.line8z_other_income, 10000);
});

Deno.test("f8915f.compute: remaining less than 1/3 cap — reports actual remaining", () => {
  // total=30000, prior1=10000, prior2=15000 → remaining=5000, 1/3=10000 → report 5000
  const result = compute([minimalItem({
    total_distribution: 30000,
    amount_reported_prior_year1: 10000,
    amount_reported_prior_year2: 15000,
  })]);
  const out = findOutput(result, "schedule1");
  assertEquals(out?.fields.line8z_other_income, 5000);
});

Deno.test("f8915f.compute: disaster_type and distribution_year are informational — no effect on calculation", () => {
  const result1 = compute([minimalItem({ total_distribution: 30000, disaster_type: "COVID-19", distribution_year: 2020 })]);
  const result2 = compute([minimalItem({ total_distribution: 30000 })]);
  const out1 = findOutput(result1, "schedule1");
  const out2 = findOutput(result2, "schedule1");
  assertEquals(out1?.fields.line8z_other_income, out2?.fields.line8z_other_income);
});

// =============================================================================
// 8. Smoke Test
// =============================================================================

Deno.test("f8915f.compute: smoke test — year 3 distribution with partial repayment", () => {
  // COVID distribution: total=90000, year 1 reported 30000, year 2 reported 30000
  // Year 3 reportable = 30000 (remaining), repayments = 10000
  // net_income = 30000 - 10000 = 20000
  const result = compute([
    minimalItem({
      disaster_type: "COVID-19",
      distribution_year: 2020,
      total_distribution: 90000,
      amount_reported_prior_year1: 30000,
      amount_reported_prior_year2: 30000,
      repayments_this_year: 10000,
      elect_full_inclusion: false,
    }),
  ]);
  const out = findOutput(result, "schedule1");
  assertEquals(out?.fields.line8z_other_income, 20000);
});

import { assertEquals, assertThrows } from "@std/assert";
import { f8915d } from "./index.ts";

function minimalItem(overrides: Record<string, unknown> = {}) {
  return { ...overrides };
}

function compute(items: ReturnType<typeof minimalItem>[]) {
  return f8915d.compute({ taxYear: 2025, formType: "f1040" }, { f8915ds: items });
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// =============================================================================
// 1. Input Schema Validation
// =============================================================================

Deno.test("f8915d.inputSchema: valid minimal item passes", () => {
  const parsed = f8915d.inputSchema.safeParse({ f8915ds: [{}] });
  assertEquals(parsed.success, true);
});

Deno.test("f8915d.inputSchema: empty array fails (min 1)", () => {
  const parsed = f8915d.inputSchema.safeParse({ f8915ds: [] });
  assertEquals(parsed.success, false);
});

Deno.test("f8915d.inputSchema: negative total_2019_distribution fails", () => {
  const parsed = f8915d.inputSchema.safeParse({
    f8915ds: [{ total_2019_distribution: -1000 }],
  });
  assertEquals(parsed.success, false);
});

Deno.test("f8915d.inputSchema: negative amount_previously_reported_2019 fails", () => {
  const parsed = f8915d.inputSchema.safeParse({
    f8915ds: [{ amount_previously_reported_2019: -500 }],
  });
  assertEquals(parsed.success, false);
});

Deno.test("f8915d.inputSchema: negative amount_previously_reported_2020 fails", () => {
  const parsed = f8915d.inputSchema.safeParse({
    f8915ds: [{ amount_previously_reported_2020: -500 }],
  });
  assertEquals(parsed.success, false);
});

Deno.test("f8915d.inputSchema: negative amount_previously_reported_2021 fails", () => {
  const parsed = f8915d.inputSchema.safeParse({
    f8915ds: [{ amount_previously_reported_2021: -500 }],
  });
  assertEquals(parsed.success, false);
});

Deno.test("f8915d.inputSchema: negative repayments_in_2025 fails", () => {
  const parsed = f8915d.inputSchema.safeParse({
    f8915ds: [{ repayments_in_2025: -200 }],
  });
  assertEquals(parsed.success, false);
});

Deno.test("f8915d.inputSchema: valid full item passes", () => {
  const parsed = f8915d.inputSchema.safeParse({
    f8915ds: [{
      total_2019_distribution: 30000,
      amount_previously_reported_2019: 10000,
      amount_previously_reported_2020: 10000,
      amount_previously_reported_2021: 10000,
      repayments_in_2025: 0,
    }],
  });
  assertEquals(parsed.success, true);
});

// =============================================================================
// 2. Spreading Complete — No Income Remaining
// =============================================================================

Deno.test("f8915d.compute: spreading complete — no income output", () => {
  // All three years reported, nothing remaining
  const result = compute([minimalItem({
    total_2019_distribution: 30000,
    amount_previously_reported_2019: 10000,
    amount_previously_reported_2020: 10000,
    amount_previously_reported_2021: 10000,
  })]);
  assertEquals(findOutput(result, "schedule1"), undefined);
});

Deno.test("f8915d.compute: spreading complete with uneven splits — still no income", () => {
  const result = compute([minimalItem({
    total_2019_distribution: 30000,
    amount_previously_reported_2019: 15000,
    amount_previously_reported_2020: 10000,
    amount_previously_reported_2021: 5000,
  })]);
  assertEquals(findOutput(result, "schedule1"), undefined);
});

Deno.test("f8915d.compute: no distribution — no output", () => {
  const result = compute([minimalItem({})]);
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 3. Catch-Up Income (Remaining Unreported)
// =============================================================================

Deno.test("f8915d.compute: unreported amount — routes remaining as income", () => {
  // total=30000, only 20000 reported in prior years → remaining 10000
  const result = compute([minimalItem({
    total_2019_distribution: 30000,
    amount_previously_reported_2019: 10000,
    amount_previously_reported_2020: 10000,
    amount_previously_reported_2021: 0,
  })]);
  const out = findOutput(result, "schedule1");
  assertEquals(out?.fields.line8z_other_income, 10000);
});

Deno.test("f8915d.compute: fully unreported (no prior amounts) — routes full total as income", () => {
  const result = compute([minimalItem({
    total_2019_distribution: 30000,
  })]);
  const out = findOutput(result, "schedule1");
  assertEquals(out?.fields.line8z_other_income, 30000);
});

// =============================================================================
// 4. Repayments in 2025
// =============================================================================

Deno.test("f8915d.compute: repayment against remaining income reduces net", () => {
  // remaining=10000, repayments=4000, net=6000
  const result = compute([minimalItem({
    total_2019_distribution: 30000,
    amount_previously_reported_2019: 10000,
    amount_previously_reported_2020: 10000,
    repayments_in_2025: 4000,
  })]);
  const out = findOutput(result, "schedule1");
  assertEquals(out?.fields.line8z_other_income, 6000);
});

Deno.test("f8915d.compute: repayment equals remaining income — no output", () => {
  // remaining=10000, repayments=10000, net=0
  const result = compute([minimalItem({
    total_2019_distribution: 30000,
    amount_previously_reported_2019: 10000,
    amount_previously_reported_2020: 10000,
    repayments_in_2025: 10000,
  })]);
  assertEquals(findOutput(result, "schedule1"), undefined);
});

Deno.test("f8915d.compute: repayments with spreading complete — full repayment is excess credit", () => {
  // spreading complete (30000 reported), repayments=10000 → credit of -10000
  const result = compute([minimalItem({
    total_2019_distribution: 30000,
    amount_previously_reported_2019: 10000,
    amount_previously_reported_2020: 10000,
    amount_previously_reported_2021: 10000,
    repayments_in_2025: 10000,
  })]);
  const out = findOutput(result, "schedule1");
  assertEquals(out?.fields.line8z_other_income, -10000);
});

Deno.test("f8915d.compute: large repayment against zero remaining — full credit", () => {
  // spreading complete, large repayment in 2025
  const result = compute([minimalItem({
    total_2019_distribution: 30000,
    amount_previously_reported_2019: 10000,
    amount_previously_reported_2020: 10000,
    amount_previously_reported_2021: 10000,
    repayments_in_2025: 30000,
  })]);
  const out = findOutput(result, "schedule1");
  assertEquals(out?.fields.line8z_other_income, -30000);
});

Deno.test("f8915d.compute: repayment exceeds remaining income — excess credit", () => {
  // remaining=10000, repayments=15000, net = 10000-15000 = -5000 (credit)
  const result = compute([minimalItem({
    total_2019_distribution: 30000,
    amount_previously_reported_2019: 10000,
    amount_previously_reported_2020: 10000,
    repayments_in_2025: 15000,
  })]);
  const out = findOutput(result, "schedule1");
  assertEquals(out?.fields.line8z_other_income, -5000);
});

// =============================================================================
// 5. Hard Validation
// =============================================================================

Deno.test("f8915d.compute: throws on negative total_2019_distribution", () => {
  assertThrows(
    () => compute([minimalItem({ total_2019_distribution: -1000 })]),
    Error,
  );
});

Deno.test("f8915d.compute: throws on negative repayments_in_2025", () => {
  assertThrows(
    () => compute([minimalItem({ repayments_in_2025: -500 })]),
    Error,
  );
});

Deno.test("f8915d.compute: zero total does not throw", () => {
  const result = compute([minimalItem({ total_2019_distribution: 0 })]);
  assertEquals(Array.isArray(result.outputs), true);
});

// =============================================================================
// 6. Aggregation — Multiple Form 8915-D Items
// =============================================================================

Deno.test("f8915d.compute: multiple 8915-D items — income aggregated", () => {
  const result = compute([
    minimalItem({ total_2019_distribution: 30000 }),         // remaining = 30000
    minimalItem({ total_2019_distribution: 15000 }),         // remaining = 15000
  ]);
  const out = findOutput(result, "schedule1");
  assertEquals(out?.fields.line8z_other_income, 45000);
});

Deno.test("f8915d.compute: multiple items, one complete and one with repayment credit", () => {
  const result = compute([
    minimalItem({
      total_2019_distribution: 30000,
      amount_previously_reported_2019: 10000,
      amount_previously_reported_2020: 10000,
      amount_previously_reported_2021: 10000,
      repayments_in_2025: 5000,  // credit of -5000
    }),
    minimalItem({
      total_2019_distribution: 20000,
      amount_previously_reported_2019: 10000,
      amount_previously_reported_2020: 10000,
      amount_previously_reported_2021: 0,   // remaining = 0 (already 20000 reported)
    }),
  ]);
  // item1: -5000 credit; item2: 0; net = -5000
  const out = findOutput(result, "schedule1");
  assertEquals(out?.fields.line8z_other_income, -5000);
});

// =============================================================================
// 7. Edge Cases
// =============================================================================

Deno.test("f8915d.compute: only repayments_in_2025 with no distribution — no output", () => {
  // No distribution entered — repayments have nothing to apply against
  const result = compute([minimalItem({ repayments_in_2025: 5000 })]);
  // repayments with no total → no income, excess = repayments - 0 = 5000 → negative -5000?
  // Actually: remaining=max(0, 0-0)=0, excess=max(0, 5000-0)=5000 → credit of -5000
  // BUT since total_2019_distribution=0, there was never any income to repay.
  // The engine should handle this by checking total > 0 before emitting.
  // Per design: if no distribution, no credit either (nothing to repay).
  assertEquals(findOutput(result, "schedule1"), undefined);
});

Deno.test("f8915d.compute: prior years sum exceeds total — no remaining income", () => {
  // Guard against data entry errors where prior amounts exceed total
  const result = compute([minimalItem({
    total_2019_distribution: 20000,
    amount_previously_reported_2019: 10000,
    amount_previously_reported_2020: 10000,
    amount_previously_reported_2021: 5000,  // sum=25000 > 20000
  })]);
  // remaining = max(0, 20000 - 25000) = 0
  assertEquals(findOutput(result, "schedule1"), undefined);
});

// =============================================================================
// 8. Smoke Test
// =============================================================================

Deno.test("f8915d.compute: smoke test — 2019 disaster, spreading complete, repayment in 2025", () => {
  // Taxpayer had $90,000 2019 disaster distribution
  // Reported $30,000 in 2019, 2020, 2021 each (spreading complete)
  // In 2025, repaid $15,000 → pure credit
  const result = compute([
    minimalItem({
      total_2019_distribution: 90000,
      amount_previously_reported_2019: 30000,
      amount_previously_reported_2020: 30000,
      amount_previously_reported_2021: 30000,
      repayments_in_2025: 15000,
    }),
  ]);
  const out = findOutput(result, "schedule1");
  assertEquals(out?.fields.line8z_other_income, -15000);
});

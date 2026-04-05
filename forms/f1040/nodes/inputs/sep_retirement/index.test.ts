import { assertEquals, assertThrows } from "@std/assert";
import { sep_retirement, PlanType } from "./index.ts";
import { fieldsOf } from "../../../../../core/test-utils/output.ts";
import { schedule1 } from "../../outputs/schedule1/index.ts";
import { agi_aggregator } from "../../intermediate/aggregation/agi_aggregator/index.ts";

function minimalItem(overrides: Record<string, unknown> = {}) {
  return { plan_type: PlanType.SEP, ...overrides };
}

function compute(items: ReturnType<typeof minimalItem>[]) {
  return sep_retirement.compute({ taxYear: 2025 }, { sep_retirements: items });
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o: { nodeType: string }) => o.nodeType === nodeType);
}

// =============================================================================
// 1. Input Schema Validation
// =============================================================================

Deno.test("sep_retirement.inputSchema: valid minimal SEP item passes", () => {
  const parsed = sep_retirement.inputSchema.safeParse({
    sep_retirements: [{ plan_type: PlanType.SEP }],
  });
  assertEquals(parsed.success, true);
});

Deno.test("sep_retirement.inputSchema: empty array fails (min 1)", () => {
  const parsed = sep_retirement.inputSchema.safeParse({ sep_retirements: [] });
  assertEquals(parsed.success, false);
});

Deno.test("sep_retirement.inputSchema: invalid plan_type fails", () => {
  const parsed = sep_retirement.inputSchema.safeParse({
    sep_retirements: [{ plan_type: "INVALID_PLAN" }],
  });
  assertEquals(parsed.success, false);
});

Deno.test("sep_retirement.inputSchema: negative sep_contribution fails", () => {
  const parsed = sep_retirement.inputSchema.safeParse({
    sep_retirements: [{ plan_type: PlanType.SEP, sep_contribution: -100 }],
  });
  assertEquals(parsed.success, false);
});

Deno.test("sep_retirement.inputSchema: negative net_self_employment_compensation fails", () => {
  const parsed = sep_retirement.inputSchema.safeParse({
    sep_retirements: [{ plan_type: PlanType.SEP, net_self_employment_compensation: -1000 }],
  });
  assertEquals(parsed.success, false);
});

Deno.test("sep_retirement.inputSchema: negative simple_employee_contribution fails", () => {
  const parsed = sep_retirement.inputSchema.safeParse({
    sep_retirements: [{ plan_type: PlanType.SIMPLE, simple_employee_contribution: -500 }],
  });
  assertEquals(parsed.success, false);
});

Deno.test("sep_retirement.inputSchema: negative solo401k_employee_deferral fails", () => {
  const parsed = sep_retirement.inputSchema.safeParse({
    sep_retirements: [{ plan_type: PlanType.SOLO_401K, solo401k_employee_deferral: -1000 }],
  });
  assertEquals(parsed.success, false);
});

Deno.test("sep_retirement.inputSchema: valid full SIMPLE item passes", () => {
  const parsed = sep_retirement.inputSchema.safeParse({
    sep_retirements: [{
      plan_type: PlanType.SIMPLE,
      simple_employee_contribution: 16500,
      simple_employer_contribution: 5000,
      age_50_or_over: false,
    }],
  });
  assertEquals(parsed.success, true);
});

// =============================================================================
// 2. SEP-IRA Routing and Calculation
// =============================================================================

Deno.test("sep_retirement.compute: SEP with contribution and SE compensation routes to schedule1 line16", () => {
  const result = compute([minimalItem({
    plan_type: PlanType.SEP,
    sep_contribution: 20000,
    net_self_employment_compensation: 100000,
  })]);
  const out = findOutput(result, "schedule1");
  assertEquals(out !== undefined, true);
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line16_sep_simple, 20000);
});

Deno.test("sep_retirement.compute: SEP contribution capped at 25% of net SE compensation", () => {
  // 25% of 80000 = 20000, contribution is 30000 — capped at 20000
  const result = compute([minimalItem({
    plan_type: PlanType.SEP,
    sep_contribution: 30000,
    net_self_employment_compensation: 80000,
  })]);
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line16_sep_simple, 20000);
});

Deno.test("sep_retirement.compute: SEP contribution capped at $70,000 annual limit", () => {
  // 25% of 400000 = 100000 — but hard cap is 70000
  const result = compute([minimalItem({
    plan_type: PlanType.SEP,
    sep_contribution: 80000,
    net_self_employment_compensation: 400000,
  })]);
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line16_sep_simple, 70000);
});

Deno.test("sep_retirement.compute: SEP no contribution — no output", () => {
  const result = compute([minimalItem({
    plan_type: PlanType.SEP,
    net_self_employment_compensation: 100000,
  })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("sep_retirement.compute: SEP zero contribution — no output", () => {
  const result = compute([minimalItem({
    plan_type: PlanType.SEP,
    sep_contribution: 0,
    net_self_employment_compensation: 100000,
  })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("sep_retirement.compute: SEP contribution without SE compensation — capped at $70,000 only", () => {
  // No SE compensation provided — only absolute $70,000 limit applies
  const result = compute([minimalItem({
    plan_type: PlanType.SEP,
    sep_contribution: 50000,
  })]);
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line16_sep_simple, 50000);
});

// =============================================================================
// 3. SIMPLE IRA Routing and Calculation
// =============================================================================

Deno.test("sep_retirement.compute: SIMPLE with employee and employer contributions routes to schedule1", () => {
  const result = compute([minimalItem({
    plan_type: PlanType.SIMPLE,
    simple_employee_contribution: 10000,
    simple_employer_contribution: 3000,
  })]);
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line16_sep_simple, 13000);
});

Deno.test("sep_retirement.compute: SIMPLE employee contribution capped at $16,500 when age under 50", () => {
  // Over-contribution: 20000 capped at 16500; employer 2000 total = 18500
  const result = compute([minimalItem({
    plan_type: PlanType.SIMPLE,
    simple_employee_contribution: 20000,
    simple_employer_contribution: 2000,
    age_50_or_over: false,
  })]);
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line16_sep_simple, 18500);
});

Deno.test("sep_retirement.compute: SIMPLE employee catch-up limit $19,500 when age 50+", () => {
  // age 50+: cap = 19500; employee 20000 capped at 19500; employer 1000 = 20500
  const result = compute([minimalItem({
    plan_type: PlanType.SIMPLE,
    simple_employee_contribution: 20000,
    simple_employer_contribution: 1000,
    age_50_or_over: true,
  })]);
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line16_sep_simple, 20500);
});

Deno.test("sep_retirement.compute: SIMPLE employee at exactly $16,500 limit passes through", () => {
  const result = compute([minimalItem({
    plan_type: PlanType.SIMPLE,
    simple_employee_contribution: 16500,
    age_50_or_over: false,
  })]);
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line16_sep_simple, 16500);
});

Deno.test("sep_retirement.compute: SIMPLE with only employer contribution routes correctly", () => {
  const result = compute([minimalItem({
    plan_type: PlanType.SIMPLE,
    simple_employer_contribution: 5000,
  })]);
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line16_sep_simple, 5000);
});

Deno.test("sep_retirement.compute: SIMPLE zero contributions — no output", () => {
  const result = compute([minimalItem({
    plan_type: PlanType.SIMPLE,
    simple_employee_contribution: 0,
    simple_employer_contribution: 0,
  })]);
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 4. Solo 401(k) Routing and Calculation
// =============================================================================

Deno.test("sep_retirement.compute: Solo 401k with employee and employer routes to schedule1", () => {
  const result = compute([minimalItem({
    plan_type: PlanType.SOLO_401K,
    solo401k_employee_deferral: 20000,
    solo401k_employer_contribution: 10000,
  })]);
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line16_sep_simple, 30000);
});

Deno.test("sep_retirement.compute: Solo 401k employee deferral capped at $23,500", () => {
  // employee 30000 capped at 23500; employer 5000 = 28500
  const result = compute([minimalItem({
    plan_type: PlanType.SOLO_401K,
    solo401k_employee_deferral: 30000,
    solo401k_employer_contribution: 5000,
  })]);
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line16_sep_simple, 28500);
});

Deno.test("sep_retirement.compute: Solo 401k combined limit $70,000 enforced", () => {
  // employee 23500 + employer 50000 = 73500 — capped at 70000
  const result = compute([minimalItem({
    plan_type: PlanType.SOLO_401K,
    solo401k_employee_deferral: 23500,
    solo401k_employer_contribution: 50000,
  })]);
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line16_sep_simple, 70000);
});

Deno.test("sep_retirement.compute: Solo 401k at exactly $70,000 combined passes through", () => {
  const result = compute([minimalItem({
    plan_type: PlanType.SOLO_401K,
    solo401k_employee_deferral: 23500,
    solo401k_employer_contribution: 45500,
  })]);
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line16_sep_simple, 69000);
});

Deno.test("sep_retirement.compute: Solo 401k with only employee deferral", () => {
  const result = compute([minimalItem({
    plan_type: PlanType.SOLO_401K,
    solo401k_employee_deferral: 15000,
  })]);
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line16_sep_simple, 15000);
});

Deno.test("sep_retirement.compute: Solo 401k zero contributions — no output", () => {
  const result = compute([minimalItem({
    plan_type: PlanType.SOLO_401K,
    solo401k_employee_deferral: 0,
    solo401k_employer_contribution: 0,
  })]);
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 5. Aggregation — Multiple Plans
// =============================================================================

Deno.test("sep_retirement.compute: multiple plans — deductions summed", () => {
  const result = compute([
    minimalItem({ plan_type: PlanType.SEP, sep_contribution: 10000, net_self_employment_compensation: 100000 }),
    minimalItem({ plan_type: PlanType.SIMPLE, simple_employee_contribution: 5000, simple_employer_contribution: 1000 }),
  ]);
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line16_sep_simple, 16000);
});

Deno.test("sep_retirement.compute: multiple plans — only one output to schedule1", () => {
  const result = compute([
    minimalItem({ plan_type: PlanType.SEP, sep_contribution: 10000 }),
    minimalItem({ plan_type: PlanType.SOLO_401K, solo401k_employee_deferral: 5000 }),
  ]);
  const schedule1Outputs = result.outputs.filter((o: { nodeType: string }) => o.nodeType === "schedule1");
  assertEquals(schedule1Outputs.length, 1);
});

// =============================================================================
// 6. Thresholds — at/above/below constants
// =============================================================================

Deno.test("sep_retirement.compute: SEP below 25% limit — contribution passes through unchanged", () => {
  // 25% of 100000 = 25000; contribution 10000 < 25000 — passes through
  const result = compute([minimalItem({
    plan_type: PlanType.SEP,
    sep_contribution: 10000,
    net_self_employment_compensation: 100000,
  })]);
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line16_sep_simple, 10000);
});

Deno.test("sep_retirement.compute: SEP exactly at $70,000 limit", () => {
  const result = compute([minimalItem({
    plan_type: PlanType.SEP,
    sep_contribution: 69000,
    net_self_employment_compensation: 400000,
  })]);
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line16_sep_simple, 69000);
});

Deno.test("sep_retirement.compute: SEP above $70,000 limit — capped at 70000", () => {
  const result = compute([minimalItem({
    plan_type: PlanType.SEP,
    sep_contribution: 70000,
    net_self_employment_compensation: 400000,
  })]);
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line16_sep_simple, 70000);
});

Deno.test("sep_retirement.compute: SIMPLE exactly at $16,500 under-50 limit passes through", () => {
  const result = compute([minimalItem({
    plan_type: PlanType.SIMPLE,
    simple_employee_contribution: 16500,
    age_50_or_over: false,
  })]);
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line16_sep_simple, 16500);
});

Deno.test("sep_retirement.compute: SIMPLE exactly at $19,500 age-50+ limit passes through", () => {
  const result = compute([minimalItem({
    plan_type: PlanType.SIMPLE,
    simple_employee_contribution: 19500,
    age_50_or_over: true,
  })]);
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line16_sep_simple, 19500);
});

Deno.test("sep_retirement.compute: Solo 401k exactly at $23,500 employee limit passes through", () => {
  const result = compute([minimalItem({
    plan_type: PlanType.SOLO_401K,
    solo401k_employee_deferral: 23500,
  })]);
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line16_sep_simple, 23500);
});

// =============================================================================
// 7. Edge Cases
// =============================================================================

Deno.test("sep_retirement.compute: SEP contribution with SE compensation exactly at 25% boundary", () => {
  // 25% of 80000 = 20000; contribution = 20000 — exactly at boundary
  const result = compute([minimalItem({
    plan_type: PlanType.SEP,
    sep_contribution: 20000,
    net_self_employment_compensation: 80000,
  })]);
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line16_sep_simple, 20000);
});

Deno.test("sep_retirement.compute: empty SEP item (no contribution fields) — no output", () => {
  const result = compute([minimalItem({ plan_type: PlanType.SEP })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("sep_retirement.compute: SIMPLE age_50_or_over omitted — uses under-50 limit", () => {
  // age_50_or_over omitted, should use 16500 limit
  const result = compute([minimalItem({
    plan_type: PlanType.SIMPLE,
    simple_employee_contribution: 18000,
  })]);
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line16_sep_simple, 16500);
});

Deno.test("sep_retirement.compute: throws on negative simple_employer_contribution via compute", () => {
  assertThrows(() => compute([minimalItem({
    plan_type: PlanType.SIMPLE,
    simple_employer_contribution: -100,
  })]), Error);
});

// =============================================================================
// 8. AGI Aggregator Routing (above-the-line deduction must reduce AGI)
// =============================================================================

Deno.test("sep_retirement.compute: SEP deduction also routes to agi_aggregator.line16_sep_simple", () => {
  const result = compute([minimalItem({
    plan_type: PlanType.SEP,
    sep_contribution: 15000,
    net_self_employment_compensation: 100000,
  })]);
  const agiFields = fieldsOf(result.outputs, agi_aggregator)!;
  assertEquals(agiFields.line16_sep_simple, 15000);
});

Deno.test("sep_retirement.compute: agi_aggregator output matches schedule1 output", () => {
  const result = compute([minimalItem({
    plan_type: PlanType.SIMPLE,
    simple_employee_contribution: 10000,
    simple_employer_contribution: 2000,
  })]);
  const s1Fields = fieldsOf(result.outputs, schedule1)!;
  const agiFields = fieldsOf(result.outputs, agi_aggregator)!;
  assertEquals(s1Fields.line16_sep_simple, agiFields.line16_sep_simple);
});

Deno.test("sep_retirement.compute: zero deduction — no agi_aggregator output", () => {
  const result = compute([minimalItem({ plan_type: PlanType.SEP })]);
  const out = result.outputs.find((o: { nodeType: string }) => o.nodeType === "agi_aggregator");
  assertEquals(out, undefined);
});

// =============================================================================
// 9. Smoke Test
// =============================================================================

Deno.test("sep_retirement.compute: smoke test — three plan types, all limits", () => {
  const result = compute([
    // SEP: 25% of 200000 = 50000; contribution 45000 < 50000 → 45000
    minimalItem({
      plan_type: PlanType.SEP,
      sep_contribution: 45000,
      net_self_employment_compensation: 200000,
    }),
    // SIMPLE: employee 16500 (under 50) + employer 4000 = 20500
    minimalItem({
      plan_type: PlanType.SIMPLE,
      simple_employee_contribution: 16500,
      simple_employer_contribution: 4000,
      age_50_or_over: false,
    }),
    // Solo 401k: employee 23500 + employer 20000 = 43500 (under 69000)
    minimalItem({
      plan_type: PlanType.SOLO_401K,
      solo401k_employee_deferral: 23500,
      solo401k_employer_contribution: 20000,
    }),
  ]);
  // Total: 45000 + 20500 + 43500 = 109000
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line16_sep_simple, 109000);
  // Only one schedule1 output emitted
  const s1Outputs = result.outputs.filter((o: { nodeType: string }) => o.nodeType === "schedule1");
  assertEquals(s1Outputs.length, 1);
});

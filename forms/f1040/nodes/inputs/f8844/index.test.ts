import { assertEquals, assertThrows } from "@std/assert";
import { f8844 } from "./index.ts";
import { fieldsOf } from "../../../../../core/test-utils/output.ts";
import { schedule3 } from "../../intermediate/aggregation/schedule3/index.ts";

function minimalItem(overrides: Record<string, unknown> = {}) {
  return {
    qualified_zone_wages: 0,
    employee_lives_in_zone: true,
    employee_works_in_zone: true,
    ...overrides,
  };
}

function compute(items: ReturnType<typeof minimalItem>[]) {
  return f8844.compute({ taxYear: 2025, formType: "f1040" }, { f8844s: items });
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// =============================================================================
// 1. Input Schema Validation
// =============================================================================

Deno.test("f8844.inputSchema: valid minimal item passes", () => {
  const parsed = f8844.inputSchema.safeParse({ f8844s: [minimalItem()] });
  assertEquals(parsed.success, true);
});

Deno.test("f8844.inputSchema: empty array fails (min 1)", () => {
  const parsed = f8844.inputSchema.safeParse({ f8844s: [] });
  assertEquals(parsed.success, false);
});

Deno.test("f8844.inputSchema: negative qualified_zone_wages fails", () => {
  const parsed = f8844.inputSchema.safeParse({
    f8844s: [minimalItem({ qualified_zone_wages: -100 })],
  });
  assertEquals(parsed.success, false);
});

// =============================================================================
// 2. Qualification — Both Location Tests Required
// =============================================================================

Deno.test("f8844.compute: employee_lives_in_zone = false — no credit for that employee", () => {
  const result = compute([minimalItem({
    qualified_zone_wages: 15_000,
    employee_lives_in_zone: false,
  })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8844.compute: employee_works_in_zone = false — no credit for that employee", () => {
  const result = compute([minimalItem({
    qualified_zone_wages: 15_000,
    employee_works_in_zone: false,
  })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8844.compute: both zones false — no credit", () => {
  const result = compute([minimalItem({
    qualified_zone_wages: 15_000,
    employee_lives_in_zone: false,
    employee_works_in_zone: false,
  })]);
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 3. Wage Cap ($15,000 per employee)
// =============================================================================

Deno.test("f8844.compute: wages below cap — credit = 20% of wages", () => {
  // $10,000 × 20% = $2,000
  const result = compute([minimalItem({ qualified_zone_wages: 10_000 })]);
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6z_general_business_credit, 2_000);
});

Deno.test("f8844.compute: wages at cap ($15,000) — credit = $3,000", () => {
  const result = compute([minimalItem({ qualified_zone_wages: 15_000 })]);
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6z_general_business_credit, 3_000);
});

Deno.test("f8844.compute: wages above cap ($20,000) — credit still = $3,000", () => {
  const result = compute([minimalItem({ qualified_zone_wages: 20_000 })]);
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6z_general_business_credit, 3_000);
});

Deno.test("f8844.compute: wages = 0 — no credit output", () => {
  const result = compute([minimalItem({ qualified_zone_wages: 0 })]);
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 4. Aggregation — Multiple Employees
// =============================================================================

Deno.test("f8844.compute: two qualified employees — credits summed", () => {
  // Emp 1: $10,000 → $2,000
  // Emp 2: $15,000 → $3,000
  // Total: $5,000
  const result = compute([
    minimalItem({ qualified_zone_wages: 10_000 }),
    minimalItem({ qualified_zone_wages: 15_000 }),
  ]);
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6z_general_business_credit, 5_000);
});

Deno.test("f8844.compute: mixed qualified/disqualified employees — only qualified count", () => {
  // Emp 1: qualified, $12,000 → $2,400
  // Emp 2: lives outside zone, $20,000 → $0
  const result = compute([
    minimalItem({ qualified_zone_wages: 12_000 }),
    minimalItem({ qualified_zone_wages: 20_000, employee_lives_in_zone: false }),
  ]);
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6z_general_business_credit, 2_400);
});

Deno.test("f8844.compute: multiple employees all above cap — each capped at $3,000", () => {
  // 3 employees × $3,000 = $9,000
  const result = compute([
    minimalItem({ qualified_zone_wages: 50_000 }),
    minimalItem({ qualified_zone_wages: 30_000 }),
    minimalItem({ qualified_zone_wages: 20_000 }),
  ]);
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6z_general_business_credit, 9_000);
});

// =============================================================================
// 5. Output Routing
// =============================================================================

Deno.test("f8844.compute: routes to schedule3 line6z_general_business_credit", () => {
  const result = compute([minimalItem({ qualified_zone_wages: 5_000 })]);
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6z_general_business_credit, 1_000); // 20% × $5,000
});

Deno.test("f8844.compute: does not route to schedule2", () => {
  const result = compute([minimalItem({ qualified_zone_wages: 5_000 })]);
  const out = findOutput(result, "schedule2");
  assertEquals(out, undefined);
});

// =============================================================================
// 6. Hard Validation
// =============================================================================

Deno.test("f8844.compute: throws on negative qualified_zone_wages", () => {
  assertThrows(() => compute([minimalItem({ qualified_zone_wages: -500 })]), Error);
});

// =============================================================================
// 7. Edge Cases
// =============================================================================

Deno.test("f8844.compute: employee_name only — no credit (wages = 0)", () => {
  const result = compute([minimalItem({ employee_name: "John Doe", qualified_zone_wages: 0 })]);
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 8. Smoke Test
// =============================================================================

Deno.test("f8844.compute: smoke test — multiple employees with varied wages and qualifications", () => {
  const result = compute([
    minimalItem({
      employee_name: "Alice",
      qualified_zone_wages: 14_000,
      employee_lives_in_zone: true,
      employee_works_in_zone: true,
    }),
    minimalItem({
      employee_name: "Bob",
      qualified_zone_wages: 25_000,   // above cap
      employee_lives_in_zone: true,
      employee_works_in_zone: true,
    }),
    minimalItem({
      employee_name: "Carol",
      qualified_zone_wages: 20_000,
      employee_lives_in_zone: false,  // doesn't live in zone — disqualified
      employee_works_in_zone: true,
    }),
    minimalItem({
      employee_name: "Dave",
      qualified_zone_wages: 8_000,
      employee_lives_in_zone: true,
      employee_works_in_zone: true,
    }),
  ]);
  // Alice: min(14000, 15000) × 20% = 2,800
  // Bob: min(25000, 15000) × 20% = 3,000
  // Carol: disqualified → 0
  // Dave: 8,000 × 20% = 1,600
  // Total: 7,400
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6z_general_business_credit, 7_400);
});

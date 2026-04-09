import { assertEquals, assertThrows } from "@std/assert";
import { f3903 } from "./index.ts";
import { fieldsOf } from "../../../../../core/test-utils/output.ts";
import { schedule1 } from "../../outputs/schedule1/index.ts";

function minimalItem(overrides: Record<string, unknown> = {}) {
  return { ...overrides };
}

function compute(items: ReturnType<typeof minimalItem>[]) {
  return f3903.compute({ taxYear: 2025, formType: "f1040" }, { f3903s: items });
}

// =============================================================================
// 1. Input Schema Validation
// =============================================================================

Deno.test("f3903.inputSchema: valid minimal item passes", () => {
  const parsed = f3903.inputSchema.safeParse({ f3903s: [{}] });
  assertEquals(parsed.success, true);
});

Deno.test("f3903.inputSchema: empty array fails (min 1)", () => {
  const parsed = f3903.inputSchema.safeParse({ f3903s: [] });
  assertEquals(parsed.success, false);
});

Deno.test("f3903.inputSchema: negative transportation_storage fails", () => {
  const parsed = f3903.inputSchema.safeParse({ f3903s: [{ transportation_storage: -100 }] });
  assertEquals(parsed.success, false);
});

Deno.test("f3903.inputSchema: negative travel_expenses fails", () => {
  const parsed = f3903.inputSchema.safeParse({ f3903s: [{ travel_expenses: -50 }] });
  assertEquals(parsed.success, false);
});

Deno.test("f3903.inputSchema: negative employer_reimbursements fails", () => {
  const parsed = f3903.inputSchema.safeParse({ f3903s: [{ employer_reimbursements: -200 }] });
  assertEquals(parsed.success, false);
});

Deno.test("f3903.inputSchema: valid full item passes", () => {
  const parsed = f3903.inputSchema.safeParse({
    f3903s: [{
      transportation_storage: 2000,
      travel_expenses: 500,
      employer_reimbursements: 0,
      active_duty_military: true,
      move_description: "PCS to Fort Bragg",
    }],
  });
  assertEquals(parsed.success, true);
});

// =============================================================================
// 2. Per-Field Routing
// =============================================================================

Deno.test("f3903.compute: military move routes net deduction to schedule1 line14_moving_expenses", () => {
  const result = compute([minimalItem({
    transportation_storage: 2000,
    travel_expenses: 500,
    active_duty_military: true,
  })]);
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line14_moving_expenses, 2500);
});

Deno.test("f3903.compute: non-military move — no output (TCJA suspension)", () => {
  const result = compute([minimalItem({
    transportation_storage: 3000,
    travel_expenses: 800,
    active_duty_military: false,
  })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("f3903.compute: active_duty_military omitted — no output", () => {
  const result = compute([minimalItem({
    transportation_storage: 1500,
    travel_expenses: 400,
  })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("f3903.compute: empty item — no output", () => {
  const result = compute([minimalItem()]);
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 3. Net Deduction (Expenses - Reimbursements)
// =============================================================================

Deno.test("f3903.compute: reimbursements reduce deduction", () => {
  // $3000 expenses - $1000 reimbursed = $2000 net
  const result = compute([minimalItem({
    transportation_storage: 2000,
    travel_expenses: 1000,
    employer_reimbursements: 1000,
    active_duty_military: true,
  })]);
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line14_moving_expenses, 2000);
});

Deno.test("f3903.compute: reimbursements equal expenses — no deduction", () => {
  const result = compute([minimalItem({
    transportation_storage: 1500,
    travel_expenses: 500,
    employer_reimbursements: 2000,
    active_duty_military: true,
  })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("f3903.compute: reimbursements exceed expenses — no deduction (floors at 0)", () => {
  const result = compute([minimalItem({
    transportation_storage: 1000,
    employer_reimbursements: 2000,
    active_duty_military: true,
  })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("f3903.compute: total_expenses overrides sum of lines 1+2", () => {
  // Explicit total provided — should use total_expenses not transportation + travel
  const result = compute([minimalItem({
    total_expenses: 4000,
    employer_reimbursements: 1000,
    active_duty_military: true,
  })]);
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line14_moving_expenses, 3000);
});

// =============================================================================
// 4. Aggregation — Multiple Moves
// =============================================================================

Deno.test("f3903.compute: multiple military moves — deductions summed", () => {
  const result = compute([
    minimalItem({ transportation_storage: 1500, active_duty_military: true }),
    minimalItem({ transportation_storage: 2500, active_duty_military: true }),
  ]);
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line14_moving_expenses, 4000);
});

Deno.test("f3903.compute: mixed military and non-military — only military routes", () => {
  const result = compute([
    minimalItem({ transportation_storage: 1000, active_duty_military: true }),
    minimalItem({ transportation_storage: 5000, active_duty_military: false }),
  ]);
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line14_moving_expenses, 1000);
});

Deno.test("f3903.compute: multiple military moves with reimbursements — each netted then summed", () => {
  const result = compute([
    minimalItem({ transportation_storage: 3000, employer_reimbursements: 1000, active_duty_military: true }),
    minimalItem({ transportation_storage: 2000, employer_reimbursements: 500, active_duty_military: true }),
  ]);
  // (3000-1000) + (2000-500) = 2000 + 1500 = 3500
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line14_moving_expenses, 3500);
});

// =============================================================================
// 5. Informational Fields — no outputs
// =============================================================================

Deno.test("f3903.compute: move_description only — no outputs", () => {
  const result = compute([minimalItem({ move_description: "PCS" })]);
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 6. Hard Validation
// =============================================================================

Deno.test("f3903.compute: throws on negative transportation_storage", () => {
  assertThrows(() => compute([minimalItem({ transportation_storage: -100 })]), Error);
});

Deno.test("f3903.compute: throws on negative employer_reimbursements", () => {
  assertThrows(() => compute([minimalItem({ employer_reimbursements: -200 })]), Error);
});

Deno.test("f3903.compute: zero expenses do not throw", () => {
  const result = compute([minimalItem({ transportation_storage: 0, active_duty_military: true })]);
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 7. Edge Cases
// =============================================================================

Deno.test("f3903.compute: only travel expenses (no storage) — routes correctly", () => {
  const result = compute([minimalItem({ travel_expenses: 800, active_duty_military: true })]);
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line14_moving_expenses, 800);
});

Deno.test("f3903.compute: only storage (no travel) — routes correctly", () => {
  const result = compute([minimalItem({ transportation_storage: 3000, active_duty_military: true })]);
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line14_moving_expenses, 3000);
});

// =============================================================================
// 8. Smoke Test
// =============================================================================

Deno.test("f3903.compute: smoke test — multiple moves, mixed military/civilian", () => {
  const result = compute([
    minimalItem({
      transportation_storage: 5000,
      travel_expenses: 800,
      employer_reimbursements: 1500,
      active_duty_military: true,
      move_description: "PCS from Camp Lejeune to Fort Hood",
    }),
    minimalItem({
      transportation_storage: 3000,
      travel_expenses: 400,
      employer_reimbursements: 0,
      active_duty_military: false,  // civilian — not deductible
    }),
    minimalItem({
      total_expenses: 2200,
      employer_reimbursements: 200,
      active_duty_military: true,
      move_description: "Second PCS within year",
    }),
  ]);

  // Military move 1: (5000+800) - 1500 = 4300
  // Civilian: excluded
  // Military move 2: 2200 - 200 = 2000
  // Total: 6300
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line14_moving_expenses, 6300);
});

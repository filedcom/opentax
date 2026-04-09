import { assertEquals, assertThrows } from "@std/assert";
import { f8917 } from "./index.ts";

function minimalItem(overrides: Record<string, unknown> = {}) {
  return { ...overrides };
}

function compute(items: ReturnType<typeof minimalItem>[]) {
  return f8917.compute({ taxYear: 2025, formType: "f1040" }, { f8917s: items });
}

// =============================================================================
// 1. Input Schema Validation
// =============================================================================

Deno.test("f8917.inputSchema: valid minimal item passes", () => {
  const parsed = f8917.inputSchema.safeParse({ f8917s: [{}] });
  assertEquals(parsed.success, true);
});

Deno.test("f8917.inputSchema: empty array fails (min 1)", () => {
  const parsed = f8917.inputSchema.safeParse({ f8917s: [] });
  assertEquals(parsed.success, false);
});

Deno.test("f8917.inputSchema: negative tuition_and_fees_paid fails", () => {
  const parsed = f8917.inputSchema.safeParse({
    f8917s: [{ tuition_and_fees_paid: -100 }],
  });
  assertEquals(parsed.success, false);
});

Deno.test("f8917.inputSchema: valid full item passes", () => {
  const parsed = f8917.inputSchema.safeParse({
    f8917s: [{
      tuition_and_fees_paid: 5000,
      student_name: "Jane Doe",
      student_ssn: "123-45-6789",
    }],
  });
  assertEquals(parsed.success, true);
});

// =============================================================================
// 2. TY2025 — No Federal Output (Deduction Expired)
// =============================================================================

Deno.test("f8917.compute: TY2025 — no federal output for any tuition paid", () => {
  const result = compute([minimalItem({ tuition_and_fees_paid: 5000 })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8917.compute: TY2025 — no output for maximum tuition scenario", () => {
  const result = compute([minimalItem({ tuition_and_fees_paid: 10000 })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8917.compute: TY2025 — no output for zero tuition", () => {
  const result = compute([minimalItem({ tuition_and_fees_paid: 0 })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8917.compute: TY2025 — empty item produces no output", () => {
  const result = compute([minimalItem()]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8917.compute: TY2025 — multiple items produce no output", () => {
  const result = compute([
    minimalItem({ tuition_and_fees_paid: 3000 }),
    minimalItem({ tuition_and_fees_paid: 2000 }),
  ]);
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 3. Hard Validation
// =============================================================================

Deno.test("f8917.compute: throws on negative tuition_and_fees_paid", () => {
  assertThrows(() => compute([minimalItem({ tuition_and_fees_paid: -500 })]), Error);
});

// =============================================================================
// 4. Informational Fields — no outputs
// =============================================================================

Deno.test("f8917.compute: student_name and student_ssn only — no output", () => {
  const result = compute([minimalItem({
    student_name: "John Doe",
    student_ssn: "987-65-4321",
  })]);
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 5. Smoke Test
// =============================================================================

Deno.test("f8917.compute: smoke test — full item with tuition and student info", () => {
  const result = compute([
    minimalItem({
      tuition_and_fees_paid: 5000,
      student_name: "Alice Smith",
      student_ssn: "111-22-3333",
    }),
    minimalItem({
      tuition_and_fees_paid: 3000,
      student_name: "Bob Smith",
      student_ssn: "444-55-6666",
    }),
  ]);
  // TY2025: deduction expired — no federal outputs regardless of amounts
  assertEquals(result.outputs.length, 0);
});

import { assertEquals, assertThrows } from "@std/assert";
import { f8820 } from "./index.ts";
import { fieldsOf } from "../../../../../core/test-utils/output.ts";
import { schedule3 } from "../../intermediate/aggregation/schedule3/index.ts";

function minimalItem(overrides: Record<string, unknown> = {}) {
  return { ...overrides };
}

function compute(items: ReturnType<typeof minimalItem>[]) {
  return f8820.compute({ taxYear: 2025, formType: "f1040" }, { f8820s: items });
}

// =============================================================================
// 1. Input Schema Validation
// =============================================================================

Deno.test("f8820.inputSchema: valid minimal item passes", () => {
  const parsed = f8820.inputSchema.safeParse({ f8820s: [{}] });
  assertEquals(parsed.success, true);
});

Deno.test("f8820.inputSchema: empty array fails (min 1)", () => {
  const parsed = f8820.inputSchema.safeParse({ f8820s: [] });
  assertEquals(parsed.success, false);
});

Deno.test("f8820.inputSchema: negative qualified_clinical_testing_expenses fails", () => {
  const parsed = f8820.inputSchema.safeParse({
    f8820s: [{ qualified_clinical_testing_expenses: -100 }],
  });
  assertEquals(parsed.success, false);
});

Deno.test("f8820.inputSchema: valid full item passes", () => {
  const parsed = f8820.inputSchema.safeParse({
    f8820s: [{
      qualified_clinical_testing_expenses: 100000,
      is_small_biotech: true,
    }],
  });
  assertEquals(parsed.success, true);
});

Deno.test("f8820.inputSchema: zero expenses passes", () => {
  const parsed = f8820.inputSchema.safeParse({
    f8820s: [{ qualified_clinical_testing_expenses: 0 }],
  });
  assertEquals(parsed.success, true);
});

// =============================================================================
// 2. Per-Field Routing and Calculation (25% rate, IRC §45C(a))
// =============================================================================

Deno.test("f8820.compute: expenses route to schedule3 as GBC", () => {
  const result = compute([minimalItem({ qualified_clinical_testing_expenses: 100000 })]);
  assertEquals(result.outputs.length, 1);
  assertEquals(result.outputs[0].nodeType, "schedule3");
});

Deno.test("f8820.compute: credit = 25% of qualified expenses", () => {
  const result = compute([minimalItem({ qualified_clinical_testing_expenses: 100000 })]);
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6z_general_business_credit, 25000);
});

Deno.test("f8820.compute: zero expenses — no output", () => {
  const result = compute([minimalItem({ qualified_clinical_testing_expenses: 0 })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8820.compute: absent expenses — no output", () => {
  const result = compute([minimalItem()]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8820.compute: is_small_biotech flag does not change 25% rate", () => {
  const withSmallBiotech = compute([minimalItem({
    qualified_clinical_testing_expenses: 200000,
    is_small_biotech: true,
  })]);
  const withoutFlag = compute([minimalItem({
    qualified_clinical_testing_expenses: 200000,
    is_small_biotech: false,
  })]);
  const fieldsSmall = fieldsOf(withSmallBiotech.outputs, schedule3)!;
  const fieldsNormal = fieldsOf(withoutFlag.outputs, schedule3)!;
  assertEquals(fieldsSmall.line6z_general_business_credit, 50000);
  assertEquals(fieldsNormal.line6z_general_business_credit, 50000);
});

// =============================================================================
// 3. Aggregation — Multiple Items
// =============================================================================

Deno.test("f8820.compute: multiple items — expenses summed before applying 25%", () => {
  const result = compute([
    minimalItem({ qualified_clinical_testing_expenses: 100000 }),
    minimalItem({ qualified_clinical_testing_expenses: 200000 }),
  ]);
  const fields = fieldsOf(result.outputs, schedule3)!;
  // (100000 + 200000) × 0.25 = 75000
  assertEquals(fields.line6z_general_business_credit, 75000);
});

Deno.test("f8820.compute: one zero + one nonzero — credit from nonzero only", () => {
  const result = compute([
    minimalItem({ qualified_clinical_testing_expenses: 0 }),
    minimalItem({ qualified_clinical_testing_expenses: 80000 }),
  ]);
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6z_general_business_credit, 20000);
});

// =============================================================================
// 4. Thresholds
// =============================================================================

Deno.test("f8820.compute: $1 of expenses produces $0.25 credit", () => {
  const result = compute([minimalItem({ qualified_clinical_testing_expenses: 1 })]);
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6z_general_business_credit, 0.25);
});

Deno.test("f8820.compute: large expenses — 25% rate applies consistently", () => {
  const result = compute([minimalItem({ qualified_clinical_testing_expenses: 1000000 })]);
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6z_general_business_credit, 250000);
});

// =============================================================================
// 5. Output Count
// =============================================================================

Deno.test("f8820.compute: single output node when credit present", () => {
  const result = compute([minimalItem({ qualified_clinical_testing_expenses: 100000 })]);
  assertEquals(result.outputs.length, 1);
});

// =============================================================================
// 6. Hard Validation
// =============================================================================

Deno.test("f8820.compute: throws on negative qualified_clinical_testing_expenses", () => {
  assertThrows(() => compute([minimalItem({ qualified_clinical_testing_expenses: -100 })]), Error);
});

// =============================================================================
// 7. Smoke Test
// =============================================================================

Deno.test("f8820.compute: smoke test — small biotech with large expenses", () => {
  const result = compute([
    minimalItem({
      qualified_clinical_testing_expenses: 400000,
      is_small_biotech: true,
    }),
  ]);
  // 400000 × 0.25 = 100000
  const fields = fieldsOf(result.outputs, schedule3)!;
  assertEquals(fields.line6z_general_business_credit, 100000);
  assertEquals(result.outputs.length, 1);
});

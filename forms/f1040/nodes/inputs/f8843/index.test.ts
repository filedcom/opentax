import { assertEquals, assertThrows } from "@std/assert";
import { f8843, ExemptCategory } from "./index.ts";

function minimalItem(overrides: Record<string, unknown> = {}) {
  return {
    exempt_category: ExemptCategory.STUDENT,
    days_excluded_current_year: 90,
    ...overrides,
  };
}

function compute(items: ReturnType<typeof minimalItem>[]) {
  return f8843.compute({ taxYear: 2025 }, { f8843s: items });
}

// =============================================================================
// 1. Input Schema Validation
// =============================================================================

Deno.test("f8843.inputSchema: valid minimal item passes", () => {
  const parsed = f8843.inputSchema.safeParse({
    f8843s: [{ exempt_category: ExemptCategory.STUDENT, days_excluded_current_year: 100 }],
  });
  assertEquals(parsed.success, true);
});

Deno.test("f8843.inputSchema: empty array fails (min 1)", () => {
  const parsed = f8843.inputSchema.safeParse({ f8843s: [] });
  assertEquals(parsed.success, false);
});

Deno.test("f8843.inputSchema: missing exempt_category fails", () => {
  const parsed = f8843.inputSchema.safeParse({
    f8843s: [{ days_excluded_current_year: 90 }],
  });
  assertEquals(parsed.success, false);
});

Deno.test("f8843.inputSchema: missing days_excluded_current_year fails", () => {
  const parsed = f8843.inputSchema.safeParse({
    f8843s: [{ exempt_category: ExemptCategory.STUDENT }],
  });
  assertEquals(parsed.success, false);
});

Deno.test("f8843.inputSchema: invalid exempt_category fails", () => {
  const parsed = f8843.inputSchema.safeParse({
    f8843s: [{ exempt_category: "INVALID_CAT", days_excluded_current_year: 90 }],
  });
  assertEquals(parsed.success, false);
});

Deno.test("f8843.inputSchema: negative days_excluded_current_year fails", () => {
  const parsed = f8843.inputSchema.safeParse({
    f8843s: [{ exempt_category: ExemptCategory.STUDENT, days_excluded_current_year: -1 }],
  });
  assertEquals(parsed.success, false);
});

Deno.test("f8843.inputSchema: TEACHER_TRAINEE category passes", () => {
  const parsed = f8843.inputSchema.safeParse({
    f8843s: [{ exempt_category: ExemptCategory.TEACHER_TRAINEE, days_excluded_current_year: 60 }],
  });
  assertEquals(parsed.success, true);
});

Deno.test("f8843.inputSchema: GOVERNMENT_OFFICIAL category passes", () => {
  const parsed = f8843.inputSchema.safeParse({
    f8843s: [{ exempt_category: ExemptCategory.GOVERNMENT_OFFICIAL, days_excluded_current_year: 200 }],
  });
  assertEquals(parsed.success, true);
});

Deno.test("f8843.inputSchema: ATHLETE category passes", () => {
  const parsed = f8843.inputSchema.safeParse({
    f8843s: [{ exempt_category: ExemptCategory.ATHLETE, days_excluded_current_year: 10 }],
  });
  assertEquals(parsed.success, true);
});

Deno.test("f8843.inputSchema: MEDICAL category passes", () => {
  const parsed = f8843.inputSchema.safeParse({
    f8843s: [{ exempt_category: ExemptCategory.MEDICAL, days_excluded_current_year: 45 }],
  });
  assertEquals(parsed.success, true);
});

Deno.test("f8843.inputSchema: valid full item passes", () => {
  const parsed = f8843.inputSchema.safeParse({
    f8843s: [{
      exempt_category: ExemptCategory.STUDENT,
      visa_type: "F-1",
      country_of_citizenship: "India",
      days_excluded_current_year: 120,
      supervising_academic_institution: "MIT",
    }],
  });
  assertEquals(parsed.success, true);
});

// =============================================================================
// 2. Output Routing — Statement Only
// =============================================================================

Deno.test("f8843.compute: single item — returns no outputs (statement only)", () => {
  const result = compute([minimalItem()]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8843.compute: result.outputs is an array", () => {
  const result = compute([minimalItem()]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("f8843.compute: full item — still no outputs", () => {
  const result = compute([minimalItem({
    visa_type: "F-1",
    country_of_citizenship: "China",
    supervising_academic_institution: "Stanford",
  })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8843.compute: multiple categories — no outputs", () => {
  const result = compute([
    minimalItem({ exempt_category: ExemptCategory.STUDENT }),
    minimalItem({ exempt_category: ExemptCategory.TEACHER_TRAINEE }),
  ]);
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 3. Hard Validation
// =============================================================================

Deno.test("f8843.compute: throws on negative days_excluded_current_year", () => {
  assertThrows(
    () => compute([minimalItem({ days_excluded_current_year: -1 })]),
    Error,
  );
});

Deno.test("f8843.compute: throws on days_excluded_current_year > 366", () => {
  assertThrows(
    () => compute([minimalItem({ days_excluded_current_year: 367 })]),
    Error,
  );
});

Deno.test("f8843.compute: days_excluded_current_year = 366 does not throw", () => {
  const result = compute([minimalItem({ days_excluded_current_year: 366 })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8843.compute: zero days does not throw", () => {
  const result = compute([minimalItem({ days_excluded_current_year: 0 })]);
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 4. Edge Cases
// =============================================================================

Deno.test("f8843.compute: MEDICAL category with no visa_type — no outputs", () => {
  const result = compute([minimalItem({ exempt_category: ExemptCategory.MEDICAL, days_excluded_current_year: 30 })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8843.compute: GOVERNMENT_OFFICIAL with no supervising institution — no outputs", () => {
  const result = compute([minimalItem({ exempt_category: ExemptCategory.GOVERNMENT_OFFICIAL, days_excluded_current_year: 365 })]);
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 5. Smoke Test
// =============================================================================

Deno.test("f8843.compute: smoke test — multiple exempt categories, all no outputs", () => {
  const result = f8843.compute({ taxYear: 2025 }, {
    f8843s: [
      {
        exempt_category: ExemptCategory.STUDENT,
        visa_type: "F-1",
        country_of_citizenship: "India",
        days_excluded_current_year: 120,
        supervising_academic_institution: "MIT",
      },
      {
        exempt_category: ExemptCategory.TEACHER_TRAINEE,
        visa_type: "J-1",
        country_of_citizenship: "Germany",
        days_excluded_current_year: 90,
      },
      {
        exempt_category: ExemptCategory.MEDICAL,
        days_excluded_current_year: 30,
      },
    ],
  });
  assertEquals(result.outputs.length, 0);
});

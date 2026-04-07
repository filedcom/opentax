import { assertEquals, assertThrows } from "@std/assert";
import { f8857, ReliefType } from "./index.ts";

function compute(input: Record<string, unknown>) {
  return f8857.compute({ taxYear: 2025 }, input as Parameters<typeof f8857.compute>[1]);
}

// =============================================================================
// 1. Administrative Form — Always Zero Outputs
// =============================================================================

Deno.test("f8857.compute: empty input produces no outputs", () => {
  const result = compute({});
  assertEquals(result.outputs, []);
});

Deno.test("f8857.compute: innocent spouse relief — no tax outputs", () => {
  const result = compute({ relief_type: ReliefType.InnocentSpouse });
  assertEquals(result.outputs, []);
});

Deno.test("f8857.compute: separation of liability relief — no tax outputs", () => {
  const result = compute({ relief_type: ReliefType.SeparationOfLiability });
  assertEquals(result.outputs, []);
});

Deno.test("f8857.compute: equitable relief — no tax outputs", () => {
  const result = compute({ relief_type: ReliefType.Equitable });
  assertEquals(result.outputs, []);
});

// =============================================================================
// 2. Schema Validation
// =============================================================================

Deno.test("f8857.inputSchema: invalid relief_type rejected", () => {
  const parsed = f8857.inputSchema.safeParse({ relief_type: "other" });
  assertEquals(parsed.success, false);
});

Deno.test("f8857.inputSchema: non-integer tax_years element rejected", () => {
  const parsed = f8857.inputSchema.safeParse({ tax_years: ["2022"] });
  assertEquals(parsed.success, false);
});

Deno.test("f8857.compute: throws on invalid relief_type", () => {
  assertThrows(() => compute({ relief_type: "invalid" }), Error);
});

Deno.test("f8857.compute: throws on non-integer tax_years element", () => {
  assertThrows(() => compute({ tax_years: ["twenty-twenty-two"] }), Error);
});

// =============================================================================
// 3. Smoke Test
// =============================================================================

Deno.test("f8857.compute: full innocent spouse request produces no outputs", () => {
  const result = compute({
    relief_type: ReliefType.InnocentSpouse,
    tax_years: [2022, 2023],
    erroneous_items: ["Unreported income from spouse's consulting business"],
    knowledge_indicator: false,
    economic_hardship: true,
    requesting_spouse_name: "Jane Smith",
    requesting_spouse_ssn: "123-45-6789",
  });
  assertEquals(result.outputs, []);
});

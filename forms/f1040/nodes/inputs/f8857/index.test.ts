import { assertEquals, assertThrows } from "@std/assert";
import { f8857 } from "./index.ts";

function compute(input: Record<string, unknown>) {
  return f8857.compute({ taxYear: 2025 }, input as Parameters<typeof f8857.compute>[1]);
}

// =============================================================================
// 1. Input Schema Validation
// =============================================================================

Deno.test("f8857.inputSchema: empty input passes", () => {
  const parsed = f8857.inputSchema.safeParse({});
  assertEquals(parsed.success, true);
});

Deno.test("f8857.inputSchema: valid relief_type innocent_spouse passes", () => {
  const parsed = f8857.inputSchema.safeParse({ relief_type: "innocent_spouse" });
  assertEquals(parsed.success, true);
});

Deno.test("f8857.inputSchema: valid relief_type separation_of_liability passes", () => {
  const parsed = f8857.inputSchema.safeParse({ relief_type: "separation_of_liability" });
  assertEquals(parsed.success, true);
});

Deno.test("f8857.inputSchema: valid relief_type equitable passes", () => {
  const parsed = f8857.inputSchema.safeParse({ relief_type: "equitable" });
  assertEquals(parsed.success, true);
});

Deno.test("f8857.inputSchema: invalid relief_type fails", () => {
  const parsed = f8857.inputSchema.safeParse({ relief_type: "other" });
  assertEquals(parsed.success, false);
});

Deno.test("f8857.inputSchema: valid tax_years array passes", () => {
  const parsed = f8857.inputSchema.safeParse({ tax_years: [2022, 2023] });
  assertEquals(parsed.success, true);
});

Deno.test("f8857.inputSchema: empty tax_years array passes", () => {
  const parsed = f8857.inputSchema.safeParse({ tax_years: [] });
  assertEquals(parsed.success, true);
});

Deno.test("f8857.inputSchema: non-integer tax_years element fails", () => {
  const parsed = f8857.inputSchema.safeParse({ tax_years: ["2022"] });
  assertEquals(parsed.success, false);
});

Deno.test("f8857.inputSchema: valid erroneous_items array passes", () => {
  const parsed = f8857.inputSchema.safeParse({
    erroneous_items: ["Unreported income from spouse's business"],
  });
  assertEquals(parsed.success, true);
});

Deno.test("f8857.inputSchema: valid knowledge_indicator boolean passes", () => {
  const parsed = f8857.inputSchema.safeParse({ knowledge_indicator: false });
  assertEquals(parsed.success, true);
});

Deno.test("f8857.inputSchema: valid economic_hardship boolean passes", () => {
  const parsed = f8857.inputSchema.safeParse({ economic_hardship: true });
  assertEquals(parsed.success, true);
});

Deno.test("f8857.inputSchema: valid requesting_spouse_name passes", () => {
  const parsed = f8857.inputSchema.safeParse({ requesting_spouse_name: "Jane Doe" });
  assertEquals(parsed.success, true);
});

// =============================================================================
// 2. Administrative Form — No Tax Outputs
// =============================================================================

Deno.test("f8857.compute: empty input produces no outputs", () => {
  const result = compute({});
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8857.compute: relief_type innocent_spouse — no tax outputs", () => {
  const result = compute({ relief_type: "innocent_spouse" });
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8857.compute: relief_type separation_of_liability — no tax outputs", () => {
  const result = compute({ relief_type: "separation_of_liability" });
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8857.compute: relief_type equitable — no tax outputs", () => {
  const result = compute({ relief_type: "equitable" });
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8857.compute: tax_years set — no tax outputs", () => {
  const result = compute({ tax_years: [2022, 2023] });
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8857.compute: knowledge_indicator false — no tax outputs", () => {
  const result = compute({ knowledge_indicator: false });
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8857.compute: economic_hardship true — no tax outputs", () => {
  const result = compute({ economic_hardship: true });
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8857.compute: erroneous_items set — no tax outputs", () => {
  const result = compute({ erroneous_items: ["Unreported self-employment income"] });
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 3. Hard Validation (schema boundary)
// =============================================================================

Deno.test("f8857.compute: throws on invalid relief_type", () => {
  assertThrows(() => compute({ relief_type: "invalid" }), Error);
});

Deno.test("f8857.compute: throws on non-integer tax_years element", () => {
  assertThrows(() => compute({ tax_years: ["twenty-twenty-two"] }), Error);
});

Deno.test("f8857.compute: knowledge_indicator true does not throw", () => {
  const result = compute({ knowledge_indicator: true });
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 4. Smoke Test
// =============================================================================

Deno.test("f8857.compute: smoke test — full innocent spouse request produces no outputs", () => {
  const result = compute({
    relief_type: "innocent_spouse",
    tax_years: [2022, 2023],
    erroneous_items: ["Unreported income from spouse's consulting business"],
    knowledge_indicator: false,
    economic_hardship: true,
    requesting_spouse_name: "Jane Smith",
    requesting_spouse_ssn: "123-45-6789",
  });
  assertEquals(result.outputs.length, 0);
  assertEquals(Array.isArray(result.outputs), true);
});

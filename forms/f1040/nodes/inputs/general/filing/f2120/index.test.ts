import { assertEquals, assertThrows } from "@std/assert";
import { f2120 } from "./index.ts";

function compute(input: Record<string, unknown>) {
  return f2120.compute({ taxYear: 2025, formType: "f1040" }, input as Parameters<typeof f2120.compute>[1]);
}

// =============================================================================
// 1. Input Schema Validation
// =============================================================================

Deno.test("f2120.inputSchema: empty input passes", () => {
  const parsed = f2120.inputSchema.safeParse({});
  assertEquals(parsed.success, true);
});

Deno.test("f2120.inputSchema: valid dependent_name passes", () => {
  const parsed = f2120.inputSchema.safeParse({ dependent_name: "Jane Doe" });
  assertEquals(parsed.success, true);
});

Deno.test("f2120.inputSchema: valid dependent_ssn passes", () => {
  const parsed = f2120.inputSchema.safeParse({ dependent_ssn: "123-45-6789" });
  assertEquals(parsed.success, true);
});

Deno.test("f2120.inputSchema: valid calendar_year passes", () => {
  const parsed = f2120.inputSchema.safeParse({ calendar_year: 2024 });
  assertEquals(parsed.success, true);
});

Deno.test("f2120.inputSchema: valid claiming_taxpayer_name passes", () => {
  const parsed = f2120.inputSchema.safeParse({ claiming_taxpayer_name: "John Smith" });
  assertEquals(parsed.success, true);
});

Deno.test("f2120.inputSchema: valid providing_party_names array passes", () => {
  const parsed = f2120.inputSchema.safeParse({
    providing_party_names: ["Alice Brown", "Bob Jones"],
  });
  assertEquals(parsed.success, true);
});

Deno.test("f2120.inputSchema: providing_party_names empty array passes", () => {
  const parsed = f2120.inputSchema.safeParse({ providing_party_names: [] });
  assertEquals(parsed.success, true);
});

Deno.test("f2120.inputSchema: non-string providing_party_names element fails", () => {
  const parsed = f2120.inputSchema.safeParse({ providing_party_names: [123] });
  assertEquals(parsed.success, false);
});

// =============================================================================
// 2. Administrative Form — No Tax Outputs
// =============================================================================

Deno.test("f2120.compute: empty input produces no outputs", () => {
  const result = compute({});
  assertEquals(result.outputs.length, 0);
});

Deno.test("f2120.compute: dependent_name set — no tax outputs", () => {
  const result = compute({ dependent_name: "Jane Doe" });
  assertEquals(result.outputs.length, 0);
});

Deno.test("f2120.compute: dependent_ssn set — no tax outputs", () => {
  const result = compute({ dependent_ssn: "123-45-6789" });
  assertEquals(result.outputs.length, 0);
});

Deno.test("f2120.compute: providing_party_names set — no tax outputs", () => {
  const result = compute({ providing_party_names: ["Alice Brown", "Bob Jones"] });
  assertEquals(result.outputs.length, 0);
});

Deno.test("f2120.compute: claiming_taxpayer set — no tax outputs", () => {
  const result = compute({
    claiming_taxpayer_name: "John Smith",
    claiming_taxpayer_ssn: "987-65-4321",
  });
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 3. Hard Validation (schema boundary)
// =============================================================================

Deno.test("f2120.compute: throws on non-string providing_party_names element", () => {
  assertThrows(() => compute({ providing_party_names: [99] }), Error);
});

Deno.test("f2120.compute: non-integer calendar_year fails schema", () => {
  const parsed = f2120.inputSchema.safeParse({ calendar_year: "two-thousand" });
  assertEquals(parsed.success, false);
});

// =============================================================================
// 4. Smoke Test
// =============================================================================

Deno.test("f2120.compute: smoke test — full multiple support declaration produces no outputs", () => {
  const result = compute({
    dependent_name: "Mary Smith",
    dependent_ssn: "555-44-3333",
    calendar_year: 2024,
    claiming_taxpayer_name: "John Smith",
    claiming_taxpayer_ssn: "987-65-4321",
    providing_party_names: ["Alice Brown", "Bob Jones"],
  });
  assertEquals(result.outputs, []);
});

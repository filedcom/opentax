import { assertEquals } from "@std/assert";
import { f56 } from "./index.ts";

function minimalInput(overrides: Record<string, unknown> = {}) {
  return {
    fiduciary_type: "executor",
    fiduciary_name: "Jane Doe",
    fiduciary_address: "123 Main St, Springfield, IL 62701",
    effective_date: "01/15/2025",
    ...overrides,
  };
}

function compute(input: ReturnType<typeof minimalInput>) {
  return f56.compute({ taxYear: 2025 }, input as Parameters<typeof f56.compute>[1]);
}

// =============================================================================
// 1. Input Schema Validation
// =============================================================================

Deno.test("f56.inputSchema: valid minimal input passes", () => {
  const parsed = f56.inputSchema.safeParse(minimalInput());
  assertEquals(parsed.success, true);
});

Deno.test("f56.inputSchema: missing fiduciary_type fails", () => {
  const { fiduciary_type: _removed, ...rest } = minimalInput();
  const parsed = f56.inputSchema.safeParse(rest);
  assertEquals(parsed.success, false);
});

Deno.test("f56.inputSchema: missing fiduciary_name fails", () => {
  const { fiduciary_name: _removed, ...rest } = minimalInput();
  const parsed = f56.inputSchema.safeParse(rest);
  assertEquals(parsed.success, false);
});

Deno.test("f56.inputSchema: missing fiduciary_address fails", () => {
  const { fiduciary_address: _removed, ...rest } = minimalInput();
  const parsed = f56.inputSchema.safeParse(rest);
  assertEquals(parsed.success, false);
});

Deno.test("f56.inputSchema: missing effective_date fails", () => {
  const { effective_date: _removed, ...rest } = minimalInput();
  const parsed = f56.inputSchema.safeParse(rest);
  assertEquals(parsed.success, false);
});

Deno.test("f56.inputSchema: invalid fiduciary_type fails", () => {
  const parsed = f56.inputSchema.safeParse(minimalInput({ fiduciary_type: "unknown_type" }));
  assertEquals(parsed.success, false);
});

Deno.test("f56.inputSchema: all valid fiduciary types pass", () => {
  const types = ["executor", "administrator", "trustee", "guardian", "conservator", "receiver", "assignee", "other"];
  for (const fiduciary_type of types) {
    const parsed = f56.inputSchema.safeParse(minimalInput({ fiduciary_type }));
    assertEquals(parsed.success, true, `Expected ${fiduciary_type} to pass`);
  }
});

Deno.test("f56.inputSchema: optional estate_or_trust_name accepted", () => {
  const parsed = f56.inputSchema.safeParse(minimalInput({ estate_or_trust_name: "Estate of John Smith" }));
  assertEquals(parsed.success, true);
});

Deno.test("f56.inputSchema: optional revocation_termination_date accepted", () => {
  const parsed = f56.inputSchema.safeParse(minimalInput({ revocation_termination_date: "12/31/2025" }));
  assertEquals(parsed.success, true);
});

// =============================================================================
// 2. Compute — No Outputs (Administrative Form)
// =============================================================================

Deno.test("f56.compute: returns empty outputs for minimal input", () => {
  const result = compute(minimalInput());
  assertEquals(result.outputs.length, 0);
});

Deno.test("f56.compute: returns empty outputs for all fiduciary types", () => {
  const types = ["executor", "administrator", "trustee", "guardian", "conservator", "receiver", "assignee", "other"];
  for (const fiduciary_type of types) {
    const result = compute(minimalInput({ fiduciary_type }));
    assertEquals(result.outputs.length, 0);
  }
});

// =============================================================================
// 3. Edge Cases
// =============================================================================

Deno.test("f56.compute: with revocation_termination_date still produces no outputs", () => {
  const result = compute(minimalInput({ revocation_termination_date: "06/30/2025" }));
  assertEquals(result.outputs.length, 0);
});

Deno.test("f56.compute: with estate_or_trust_name still produces no outputs", () => {
  const result = compute(minimalInput({ estate_or_trust_name: "Estate of Jane Smith" }));
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 4. Smoke Test
// =============================================================================

Deno.test("f56.compute: smoke test — fully populated form produces no outputs", () => {
  const result = compute(minimalInput({
    fiduciary_type: "executor",
    fiduciary_name: "Robert Johnson",
    fiduciary_address: "456 Elm Street, Chicago, IL 60601",
    estate_or_trust_name: "Estate of Mary Johnson",
    effective_date: "03/01/2025",
    revocation_termination_date: "12/31/2025",
  }));
  assertEquals(result.outputs.length, 0);
});

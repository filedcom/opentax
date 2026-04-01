import { assertEquals, assertThrows } from "@std/assert";
import { qsehra } from "./index.ts";

function minimalItem(overrides: Record<string, unknown> = {}) {
  return {
    qsehra_amount_offered: 0,
    qsehra_amount_received: 0,
    has_minimum_essential_coverage: true,
    is_self_only_coverage: true,
    ...overrides,
  };
}

function compute(input: ReturnType<typeof minimalItem>) {
  return qsehra.compute({ taxYear: 2025 }, input);
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// =============================================================================
// 1. Input Schema Validation
// =============================================================================

Deno.test("qsehra.inputSchema: valid minimal item passes", () => {
  const parsed = qsehra.inputSchema.safeParse(minimalItem());
  assertEquals(parsed.success, true);
});

Deno.test("qsehra.inputSchema: negative qsehra_amount_offered fails", () => {
  const parsed = qsehra.inputSchema.safeParse(minimalItem({ qsehra_amount_offered: -100 }));
  assertEquals(parsed.success, false);
});

Deno.test("qsehra.inputSchema: negative qsehra_amount_received fails", () => {
  const parsed = qsehra.inputSchema.safeParse(minimalItem({ qsehra_amount_received: -50 }));
  assertEquals(parsed.success, false);
});

Deno.test("qsehra.inputSchema: valid full item passes", () => {
  const parsed = qsehra.inputSchema.safeParse(minimalItem({
    qsehra_amount_offered: 6350,
    qsehra_amount_received: 5000,
    has_minimum_essential_coverage: true,
    is_self_only_coverage: true,
  }));
  assertEquals(parsed.success, true);
});

Deno.test("qsehra.inputSchema: family coverage (is_self_only_coverage=false) passes", () => {
  const parsed = qsehra.inputSchema.safeParse(minimalItem({
    qsehra_amount_offered: 12800,
    qsehra_amount_received: 10000,
    has_minimum_essential_coverage: true,
    is_self_only_coverage: false,
  }));
  assertEquals(parsed.success, true);
});

// =============================================================================
// 2. Routing with MEC — routes to form8962
// =============================================================================

Deno.test("qsehra.compute: has_mec=true + qsehra_offered > 0 → routes to form8962", () => {
  const result = compute(minimalItem({
    qsehra_amount_offered: 5000,
    qsehra_amount_received: 5000,
    has_minimum_essential_coverage: true,
  }));
  const out = findOutput(result, "form8962");
  assertEquals(out !== undefined, true);
  assertEquals(out!.fields.qsehra_amount_offered, 5000);
});

Deno.test("qsehra.compute: has_mec=true → does NOT route to f1040 as income", () => {
  const result = compute(minimalItem({
    qsehra_amount_offered: 5000,
    qsehra_amount_received: 5000,
    has_minimum_essential_coverage: true,
  }));
  const f1040Out = findOutput(result, "f1040");
  assertEquals(f1040Out, undefined);
});

// =============================================================================
// 3. Routing without MEC — routes to f1040 as income
// =============================================================================

Deno.test("qsehra.compute: has_mec=false + received > 0 → routes received amount to f1040 as income", () => {
  const result = compute(minimalItem({
    qsehra_amount_offered: 6000,
    qsehra_amount_received: 4500,
    has_minimum_essential_coverage: false,
  }));
  const out = findOutput(result, "f1040");
  assertEquals(out !== undefined, true);
  assertEquals(out!.fields.line1a_wages, 4500);
});

Deno.test("qsehra.compute: has_mec=false → does NOT route to form8962", () => {
  const result = compute(minimalItem({
    qsehra_amount_offered: 6000,
    qsehra_amount_received: 4500,
    has_minimum_essential_coverage: false,
  }));
  const form8962Out = findOutput(result, "form8962");
  assertEquals(form8962Out, undefined);
});

// =============================================================================
// 4. Zero Amounts — No Output
// =============================================================================

Deno.test("qsehra.compute: all zeros → no output", () => {
  const result = compute(minimalItem({
    qsehra_amount_offered: 0,
    qsehra_amount_received: 0,
    has_minimum_essential_coverage: true,
  }));
  assertEquals(result.outputs.length, 0);
});

Deno.test("qsehra.compute: has_mec=false + received=0 → no output", () => {
  const result = compute(minimalItem({
    qsehra_amount_offered: 5000,
    qsehra_amount_received: 0,
    has_minimum_essential_coverage: false,
  }));
  assertEquals(result.outputs.length, 0);
});

Deno.test("qsehra.compute: has_mec=true + offered=0 → no output", () => {
  const result = compute(minimalItem({
    qsehra_amount_offered: 0,
    qsehra_amount_received: 0,
    has_minimum_essential_coverage: true,
  }));
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 5. Thresholds — Self-Only vs Family Limits (TY2025)
// =============================================================================

Deno.test("qsehra.compute: self-only at limit ($6,350) with MEC → routes full amount to form8962", () => {
  const result = compute(minimalItem({
    qsehra_amount_offered: 6350,
    qsehra_amount_received: 6350,
    has_minimum_essential_coverage: true,
    is_self_only_coverage: true,
  }));
  const out = findOutput(result, "form8962");
  assertEquals(out !== undefined, true);
  assertEquals(out!.fields.qsehra_amount_offered, 6350);
});

Deno.test("qsehra.compute: family at limit ($12,800) with MEC → routes full amount to form8962", () => {
  const result = compute(minimalItem({
    qsehra_amount_offered: 12800,
    qsehra_amount_received: 12800,
    has_minimum_essential_coverage: true,
    is_self_only_coverage: false,
  }));
  const out = findOutput(result, "form8962");
  assertEquals(out !== undefined, true);
  assertEquals(out!.fields.qsehra_amount_offered, 12800);
});

// =============================================================================
// 6. Hard Validation
// =============================================================================

Deno.test("qsehra.compute: throws on negative qsehra_amount_offered", () => {
  assertThrows(() => compute(minimalItem({ qsehra_amount_offered: -500 })), Error);
});

Deno.test("qsehra.compute: zero qsehra_amount_offered does not throw", () => {
  const result = compute(minimalItem({ qsehra_amount_offered: 0 }));
  assertEquals(Array.isArray(result.outputs), true);
});

// =============================================================================
// 7. Edge Cases
// =============================================================================

Deno.test("qsehra.compute: is_self_only_coverage is informational for routing — does not change output destination", () => {
  const selfOnly = compute(minimalItem({
    qsehra_amount_offered: 4000,
    has_minimum_essential_coverage: true,
    is_self_only_coverage: true,
  }));
  const family = compute(minimalItem({
    qsehra_amount_offered: 4000,
    has_minimum_essential_coverage: true,
    is_self_only_coverage: false,
  }));
  // Both should route to form8962 with the same offered amount
  assertEquals(
    findOutput(selfOnly, "form8962")!.fields.qsehra_amount_offered,
    findOutput(family, "form8962")!.fields.qsehra_amount_offered,
  );
});

Deno.test("qsehra.compute: offered > received with MEC — routes offered amount (not received) to form8962", () => {
  // PTC reduction uses offered amount, per IRC §36B(c)(2)(C)(iv)
  const result = compute(minimalItem({
    qsehra_amount_offered: 6000,
    qsehra_amount_received: 3000,
    has_minimum_essential_coverage: true,
  }));
  const out = findOutput(result, "form8962");
  assertEquals(out!.fields.qsehra_amount_offered, 6000);
});

// =============================================================================
// 8. Smoke Test
// =============================================================================

Deno.test("qsehra.compute: smoke test — self-only with MEC, full annual amount", () => {
  const result = compute(minimalItem({
    qsehra_amount_offered: 6350,
    qsehra_amount_received: 5200,
    has_minimum_essential_coverage: true,
    is_self_only_coverage: true,
  }));

  // Has MEC → routes to form8962, not f1040
  const form8962Out = findOutput(result, "form8962");
  assertEquals(form8962Out !== undefined, true);
  assertEquals(form8962Out!.fields.qsehra_amount_offered, 6350);
  const f1040Out = findOutput(result, "f1040");
  assertEquals(f1040Out, undefined);
  assertEquals(result.outputs.length, 1);
});

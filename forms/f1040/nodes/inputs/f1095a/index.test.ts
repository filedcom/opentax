import { assertEquals, assertThrows } from "@std/assert";
import { f1095a } from "./index.ts";

function minimalItem(overrides: Record<string, unknown> = {}) {
  return {
    issuer_name: "Test Marketplace",
    ...overrides,
  };
}

function compute(items: ReturnType<typeof minimalItem>[]) {
  return f1095a.compute({ taxYear: 2025 }, { f1095as: items });
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// ── 1. Input schema validation ────────────────────────────────────────────────

Deno.test("empty array throws", () => {
  assertThrows(() => f1095a.compute({ taxYear: 2025 }, { f1095as: [] }), Error);
});

Deno.test("missing issuer_name throws", () => {
  assertThrows(
    () => f1095a.compute({ taxYear: 2025 }, { f1095as: [{ annual_premium: 100 } as unknown as ReturnType<typeof minimalItem>] }),
    Error,
  );
});

Deno.test("negative annual_premium throws", () => {
  assertThrows(
    () => compute([minimalItem({ annual_premium: -1 })]),
    Error,
  );
});

Deno.test("negative annual_slcsp throws", () => {
  assertThrows(
    () => compute([minimalItem({ annual_slcsp: -50 })]),
    Error,
  );
});

Deno.test("negative annual_aptc throws", () => {
  assertThrows(
    () => compute([minimalItem({ annual_aptc: -100 })]),
    Error,
  );
});

// ── 2. Per-box routing ────────────────────────────────────────────────────────

Deno.test("annual_premium routes to form8962", () => {
  const result = compute([minimalItem({ annual_premium: 1200 })]);
  const out = findOutput(result, "form8962");
  assertEquals(out?.fields.annual_premium, 1200);
});

Deno.test("annual_slcsp routes to form8962", () => {
  const result = compute([minimalItem({ annual_slcsp: 1500 })]);
  const out = findOutput(result, "form8962");
  assertEquals(out?.fields.annual_slcsp, 1500);
});

Deno.test("annual_aptc routes to form8962", () => {
  const result = compute([minimalItem({ annual_aptc: 800 })]);
  const out = findOutput(result, "form8962");
  assertEquals(out?.fields.annual_aptc, 800);
});

Deno.test("zero annual values does not route to form8962", () => {
  const result = compute([minimalItem()]);
  const out = findOutput(result, "form8962");
  assertEquals(out, undefined);
});

Deno.test("monthly premiums route to form8962", () => {
  const result = compute([
    minimalItem({
      monthly_premiums: [100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100],
    }),
  ]);
  const out = findOutput(result, "form8962");
  assertEquals(Array.isArray(out?.fields.monthly_premiums), true);
  assertEquals((out?.fields.monthly_premiums as number[])[0], 100);
});

Deno.test("monthly slcsp routes to form8962", () => {
  const result = compute([
    minimalItem({
      monthly_slcsps: [120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120, 120],
    }),
  ]);
  const out = findOutput(result, "form8962");
  assertEquals(Array.isArray(out?.fields.monthly_slcsps), true);
  assertEquals((out?.fields.monthly_slcsps as number[])[0], 120);
});

Deno.test("monthly aptc routes to form8962", () => {
  const result = compute([
    minimalItem({
      monthly_aptcs: [60, 60, 60, 60, 60, 60, 60, 60, 60, 60, 60, 60],
    }),
  ]);
  const out = findOutput(result, "form8962");
  assertEquals(Array.isArray(out?.fields.monthly_aptcs), true);
  assertEquals((out?.fields.monthly_aptcs as number[])[5], 60);
});

Deno.test("issuer_name alone does not produce form8962 output", () => {
  const result = compute([minimalItem()]);
  const out = findOutput(result, "form8962");
  assertEquals(out, undefined);
});

// ── 3. Aggregation across multiple policies ────────────────────────────────────

Deno.test("annual_premium sums across multiple policies", () => {
  const result = compute([
    minimalItem({ annual_premium: 600 }),
    minimalItem({ issuer_name: "Second Plan", annual_premium: 400 }),
  ]);
  const out = findOutput(result, "form8962");
  assertEquals(out?.fields.annual_premium, 1000);
});

Deno.test("annual_slcsp sums across multiple policies", () => {
  const result = compute([
    minimalItem({ annual_slcsp: 700 }),
    minimalItem({ issuer_name: "Plan B", annual_slcsp: 300 }),
  ]);
  const out = findOutput(result, "form8962");
  assertEquals(out?.fields.annual_slcsp, 1000);
});

Deno.test("annual_aptc sums across multiple policies", () => {
  const result = compute([
    minimalItem({ annual_aptc: 500 }),
    minimalItem({ issuer_name: "Plan B", annual_aptc: 250 }),
  ]);
  const out = findOutput(result, "form8962");
  assertEquals(out?.fields.annual_aptc, 750);
});

// ── 7. Informational fields ───────────────────────────────────────────────────

Deno.test("policy_number does not produce tax output", () => {
  const withoutPolicyNumber = compute([minimalItem()]);
  const withPolicyNumber = compute([minimalItem({ policy_number: "POL123" })]);
  assertEquals(withoutPolicyNumber.outputs.length, withPolicyNumber.outputs.length);
});

// ── 8. Edge cases ─────────────────────────────────────────────────────────────

Deno.test("all-zero monthly arrays does not route to form8962", () => {
  const result = compute([
    minimalItem({
      monthly_premiums: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      monthly_slcsps: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      monthly_aptcs: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    }),
  ]);
  const out = findOutput(result, "form8962");
  assertEquals(out, undefined);
});

Deno.test("no APTC paid routes annual premium and slcsp to form8962", () => {
  const result = compute([
    minimalItem({ annual_premium: 1200, annual_slcsp: 1500, annual_aptc: 0 }),
  ]);
  const out = findOutput(result, "form8962");
  assertEquals(out?.fields.annual_premium, 1200);
  assertEquals(out?.fields.annual_slcsp, 1500);
});

Deno.test("multiple policies aggregate monthly arrays", () => {
  const result = compute([
    minimalItem({
      monthly_premiums: [100, 100, 100, 100, 100, 100, 0, 0, 0, 0, 0, 0],
    }),
    minimalItem({
      issuer_name: "Second Marketplace",
      monthly_premiums: [0, 0, 0, 0, 0, 0, 200, 200, 200, 200, 200, 200],
    }),
  ]);
  const out = findOutput(result, "form8962");
  const premiums = out?.fields.monthly_premiums as number[];
  assertEquals(premiums[0], 100);
  assertEquals(premiums[6], 200);
});

// ── 9. Smoke test ─────────────────────────────────────────────────────────────

Deno.test("smoke test — full 1095-A with all major fields", () => {
  const result = compute([
    minimalItem({
      policy_number: "MP-2025-001",
      annual_premium: 14400,
      annual_slcsp: 18000,
      annual_aptc: 9600,
      monthly_premiums: [1200, 1200, 1200, 1200, 1200, 1200, 1200, 1200, 1200, 1200, 1200, 1200],
      monthly_slcsps: [1500, 1500, 1500, 1500, 1500, 1500, 1500, 1500, 1500, 1500, 1500, 1500],
      monthly_aptcs: [800, 800, 800, 800, 800, 800, 800, 800, 800, 800, 800, 800],
    }),
  ]);
  const out = findOutput(result, "form8962");
  assertEquals(out?.fields.annual_premium, 14400);
  assertEquals(out?.fields.annual_slcsp, 18000);
  assertEquals(out?.fields.annual_aptc, 9600);
  assertEquals(Array.isArray(out?.fields.monthly_premiums), true);
  assertEquals(Array.isArray(out?.fields.monthly_slcsps), true);
  assertEquals(Array.isArray(out?.fields.monthly_aptcs), true);
  assertEquals((out?.fields.monthly_premiums as number[]).length, 12);
});

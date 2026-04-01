import { assertEquals, assertThrows } from "@std/assert";
import { PartyType, f8594 } from "./index.ts";

function compute(input: Record<string, unknown>) {
  return f8594.compute({ taxYear: 2025 }, input as Parameters<typeof f8594.compute>[1]);
}

// =============================================================================
// 1. Input Validation — required fields and type constraints
// =============================================================================

Deno.test("f8594.inputSchema: minimal valid seller input passes", () => {
  const parsed = f8594.inputSchema.safeParse({
    party_type: PartyType.Seller,
    sale_date: "2025-06-15",
    total_sale_price: 500000,
  });
  assertEquals(parsed.success, true);
});

Deno.test("f8594.inputSchema: minimal valid buyer input passes", () => {
  const parsed = f8594.inputSchema.safeParse({
    party_type: PartyType.Buyer,
    sale_date: "2025-06-15",
    total_sale_price: 500000,
  });
  assertEquals(parsed.success, true);
});

Deno.test("f8594.inputSchema: missing party_type fails", () => {
  const parsed = f8594.inputSchema.safeParse({
    sale_date: "2025-06-15",
    total_sale_price: 500000,
  });
  assertEquals(parsed.success, false);
});

Deno.test("f8594.inputSchema: invalid party_type fails", () => {
  const parsed = f8594.inputSchema.safeParse({
    party_type: "unknown_party",
    sale_date: "2025-06-15",
    total_sale_price: 500000,
  });
  assertEquals(parsed.success, false);
});

Deno.test("f8594.inputSchema: missing sale_date fails", () => {
  const parsed = f8594.inputSchema.safeParse({
    party_type: PartyType.Seller,
    total_sale_price: 500000,
  });
  assertEquals(parsed.success, false);
});

Deno.test("f8594.inputSchema: missing total_sale_price fails", () => {
  const parsed = f8594.inputSchema.safeParse({
    party_type: PartyType.Seller,
    sale_date: "2025-06-15",
  });
  assertEquals(parsed.success, false);
});

Deno.test("f8594.inputSchema: negative total_sale_price fails", () => {
  const parsed = f8594.inputSchema.safeParse({
    party_type: PartyType.Seller,
    sale_date: "2025-06-15",
    total_sale_price: -1000,
  });
  assertEquals(parsed.success, false);
});

Deno.test("f8594.inputSchema: negative class allocation fails", () => {
  const parsed = f8594.inputSchema.safeParse({
    party_type: PartyType.Seller,
    sale_date: "2025-06-15",
    total_sale_price: 500000,
    allocation_class_i: -100,
  });
  assertEquals(parsed.success, false);
});

Deno.test("f8594.inputSchema: full allocation with all 7 classes passes", () => {
  const parsed = f8594.inputSchema.safeParse({
    party_type: PartyType.Seller,
    sale_date: "2025-06-15",
    total_sale_price: 700000,
    allocation_class_i: 100000,
    allocation_class_ii: 50000,
    allocation_class_iii: 75000,
    allocation_class_iv: 100000,
    allocation_class_v: 125000,
    allocation_class_vi: 100000,
    allocation_class_vii: 150000,
  });
  assertEquals(parsed.success, true);
});

// =============================================================================
// 2. Party type routing
// =============================================================================

Deno.test("f8594.compute: seller party returns no monetary outputs (informational)", () => {
  const result = compute({
    party_type: PartyType.Seller,
    sale_date: "2025-01-15",
    total_sale_price: 500000,
  });
  assertEquals(result.outputs, []);
});

Deno.test("f8594.compute: buyer party returns no monetary outputs (informational)", () => {
  const result = compute({
    party_type: PartyType.Buyer,
    sale_date: "2025-01-15",
    total_sale_price: 500000,
  });
  assertEquals(result.outputs, []);
});

// =============================================================================
// 3. Class allocation tests
// =============================================================================

Deno.test("f8594.compute: all class allocations present — no outputs", () => {
  const result = compute({
    party_type: PartyType.Seller,
    sale_date: "2025-06-15",
    total_sale_price: 700000,
    allocation_class_i: 100000,
    allocation_class_ii: 50000,
    allocation_class_iii: 75000,
    allocation_class_iv: 100000,
    allocation_class_v: 125000,
    allocation_class_vi: 100000,
    allocation_class_vii: 150000,
  });
  assertEquals(result.outputs, []);
});

Deno.test("f8594.compute: only Class VII (goodwill residual) — no outputs", () => {
  const result = compute({
    party_type: PartyType.Buyer,
    sale_date: "2025-03-01",
    total_sale_price: 250000,
    allocation_class_vii: 250000,
  });
  assertEquals(result.outputs, []);
});

Deno.test("f8594.compute: partial allocation (only some classes) — no outputs", () => {
  const result = compute({
    party_type: PartyType.Seller,
    sale_date: "2025-09-30",
    total_sale_price: 300000,
    allocation_class_iv: 50000,
    allocation_class_v: 100000,
    allocation_class_vii: 150000,
  });
  assertEquals(result.outputs, []);
});

// =============================================================================
// 4. Hard validation rules
// =============================================================================

Deno.test("f8594.compute: throws on missing party_type", () => {
  assertThrows(() => compute({
    sale_date: "2025-01-01",
    total_sale_price: 100000,
  }), Error);
});

Deno.test("f8594.compute: throws on missing sale_date", () => {
  assertThrows(() => compute({
    party_type: PartyType.Seller,
    total_sale_price: 100000,
  }), Error);
});

Deno.test("f8594.compute: throws on missing total_sale_price", () => {
  assertThrows(() => compute({
    party_type: PartyType.Buyer,
    sale_date: "2025-01-01",
  }), Error);
});

Deno.test("f8594.compute: throws on invalid party_type", () => {
  assertThrows(() => compute({
    party_type: "neither",
    sale_date: "2025-01-01",
    total_sale_price: 100000,
  }), Error);
});

// =============================================================================
// 5. Smoke test — full population
// =============================================================================

Deno.test("f8594.compute: smoke test — full seller allocation returns empty outputs", () => {
  const result = compute({
    party_type: PartyType.Seller,
    sale_date: "2025-07-01",
    total_sale_price: 1000000,
    allocation_class_i: 50000,
    allocation_class_ii: 100000,
    allocation_class_iii: 150000,
    allocation_class_iv: 200000,
    allocation_class_v: 200000,
    allocation_class_vi: 150000,
    allocation_class_vii: 150000,
  });
  assertEquals(Array.isArray(result.outputs), true);
  assertEquals(result.outputs.length, 0);
});

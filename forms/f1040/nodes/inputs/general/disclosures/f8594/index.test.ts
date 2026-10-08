import { assertEquals, assertThrows } from "@std/assert";
import { PartyType, f8594 } from "./index.ts";

function compute(input: Record<string, unknown>) {
  return f8594.compute({ taxYear: 2025, formType: "f1040" }, input as Parameters<typeof f8594.compute>[1]);
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

Deno.test("f8594.inputSchema: all PartyType enum values are accepted", () => {
  for (const partyType of Object.values(PartyType)) {
    const parsed = f8594.inputSchema.safeParse({
      party_type: partyType,
      sale_date: "2025-06-15",
      total_sale_price: 500000,
    });
    assertEquals(parsed.success, true, `PartyType.${partyType} should be valid`);
  }
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
// 2. Informational form — always produces no outputs regardless of inputs
// =============================================================================

Deno.test("f8594.compute: seller party returns no outputs (informational form only)", () => {
  const result = compute({
    party_type: PartyType.Seller,
    sale_date: "2025-01-15",
    total_sale_price: 500000,
  });
  assertEquals(result.outputs, []);
});

Deno.test("f8594.compute: buyer party returns no outputs (informational form only)", () => {
  const result = compute({
    party_type: PartyType.Buyer,
    sale_date: "2025-01-15",
    total_sale_price: 500000,
  });
  assertEquals(result.outputs, []);
});

Deno.test("f8594.compute: all 7 class allocations present — no outputs", () => {
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

// =============================================================================
// 3. Hard validation rules
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
// 4. Smoke test — full population
// =============================================================================

Deno.test("f8594.compute: smoke test — full seller allocation with all 7 classes returns empty outputs", () => {
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
  assertEquals(result.outputs, []);
});

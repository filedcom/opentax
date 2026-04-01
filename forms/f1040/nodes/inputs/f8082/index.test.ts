import { assertEquals, assertThrows } from "@std/assert";
import { f8082, EntityType } from "./index.ts";

function minimalItem(overrides: Record<string, unknown> = {}) {
  return {
    entity_type: EntityType.PARTNERSHIP,
    entity_name: "Acme Partners LLC",
    entity_ein: "12-3456789",
    schedule_k1_item_description: "Ordinary income",
    amount_as_reported: 10000,
    amount_as_claimed: 8000,
    ...overrides,
  };
}

function compute(items: ReturnType<typeof minimalItem>[]) {
  return f8082.compute({ taxYear: 2025 }, { f8082s: items });
}

// =============================================================================
// 1. Input Schema Validation
// =============================================================================

Deno.test("f8082.inputSchema: valid minimal item passes", () => {
  const parsed = f8082.inputSchema.safeParse({ f8082s: [minimalItem()] });
  assertEquals(parsed.success, true);
});

Deno.test("f8082.inputSchema: empty array fails (min 1)", () => {
  const parsed = f8082.inputSchema.safeParse({ f8082s: [] });
  assertEquals(parsed.success, false);
});

Deno.test("f8082.inputSchema: missing entity_type fails", () => {
  const item = minimalItem();
  delete (item as Record<string, unknown>).entity_type;
  const parsed = f8082.inputSchema.safeParse({ f8082s: [item] });
  assertEquals(parsed.success, false);
});

Deno.test("f8082.inputSchema: missing entity_name fails", () => {
  const item = minimalItem();
  delete (item as Record<string, unknown>).entity_name;
  const parsed = f8082.inputSchema.safeParse({ f8082s: [item] });
  assertEquals(parsed.success, false);
});

Deno.test("f8082.inputSchema: missing entity_ein fails", () => {
  const item = minimalItem();
  delete (item as Record<string, unknown>).entity_ein;
  const parsed = f8082.inputSchema.safeParse({ f8082s: [item] });
  assertEquals(parsed.success, false);
});

Deno.test("f8082.inputSchema: missing schedule_k1_item_description fails", () => {
  const item = minimalItem();
  delete (item as Record<string, unknown>).schedule_k1_item_description;
  const parsed = f8082.inputSchema.safeParse({ f8082s: [item] });
  assertEquals(parsed.success, false);
});

Deno.test("f8082.inputSchema: missing amount_as_reported fails", () => {
  const item = minimalItem();
  delete (item as Record<string, unknown>).amount_as_reported;
  const parsed = f8082.inputSchema.safeParse({ f8082s: [item] });
  assertEquals(parsed.success, false);
});

Deno.test("f8082.inputSchema: missing amount_as_claimed fails", () => {
  const item = minimalItem();
  delete (item as Record<string, unknown>).amount_as_claimed;
  const parsed = f8082.inputSchema.safeParse({ f8082s: [item] });
  assertEquals(parsed.success, false);
});

Deno.test("f8082.inputSchema: invalid entity_type fails", () => {
  const parsed = f8082.inputSchema.safeParse({
    f8082s: [minimalItem({ entity_type: "INVALID_ENTITY" })],
  });
  assertEquals(parsed.success, false);
});

Deno.test("f8082.inputSchema: all valid entity types pass", () => {
  for (const et of Object.values(EntityType)) {
    const parsed = f8082.inputSchema.safeParse({ f8082s: [minimalItem({ entity_type: et })] });
    assertEquals(parsed.success, true);
  }
});

Deno.test("f8082.inputSchema: reason_for_inconsistency optional", () => {
  const parsed = f8082.inputSchema.safeParse({
    f8082s: [minimalItem({ reason_for_inconsistency: "Entity used different depreciation method" })],
  });
  assertEquals(parsed.success, true);
});

Deno.test("f8082.inputSchema: amount_as_reported can be negative (loss)", () => {
  const parsed = f8082.inputSchema.safeParse({
    f8082s: [minimalItem({ amount_as_reported: -5000 })],
  });
  assertEquals(parsed.success, true);
});

Deno.test("f8082.inputSchema: amount_as_claimed can be negative (loss)", () => {
  const parsed = f8082.inputSchema.safeParse({
    f8082s: [minimalItem({ amount_as_claimed: -3000 })],
  });
  assertEquals(parsed.success, true);
});

// =============================================================================
// 2. Output Routing — notice form, no downstream outputs
// =============================================================================

Deno.test("f8082.compute: partnership item — no outputs (notice form)", () => {
  const result = compute([minimalItem({ entity_type: EntityType.PARTNERSHIP })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8082.compute: s_corp item — no outputs", () => {
  const result = compute([minimalItem({ entity_type: EntityType.S_CORP })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8082.compute: trust item — no outputs", () => {
  const result = compute([minimalItem({ entity_type: EntityType.TRUST })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8082.compute: estate item — no outputs", () => {
  const result = compute([minimalItem({ entity_type: EntityType.ESTATE })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8082.compute: result.outputs is an array (does_not_throw)", () => {
  const result = compute([minimalItem()]);
  assertEquals(Array.isArray(result.outputs), true);
});

// =============================================================================
// 3. Aggregation — multiple items
// =============================================================================

Deno.test("f8082.compute: multiple items — still no outputs", () => {
  const result = compute([
    minimalItem({ entity_type: EntityType.PARTNERSHIP, amount_as_reported: 50000, amount_as_claimed: 40000 }),
    minimalItem({ entity_type: EntityType.S_CORP, amount_as_reported: 10000, amount_as_claimed: 10000 }),
    minimalItem({ entity_type: EntityType.TRUST, amount_as_reported: -1000, amount_as_claimed: -2000 }),
  ]);
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 4. Hard Validation — invalid data throws
// =============================================================================

Deno.test("f8082.compute: throws on empty items array", () => {
  assertThrows(() => f8082.compute({ taxYear: 2025 }, { f8082s: [] }), Error);
});

Deno.test("f8082.compute: throws on invalid entity_type", () => {
  assertThrows(
    () => compute([minimalItem({ entity_type: "LLCPARTNER" })]),
    Error,
  );
});

// =============================================================================
// 5. Edge Cases
// =============================================================================

Deno.test("f8082.compute: amounts equal (no inconsistency difference) — still no outputs", () => {
  const result = compute([minimalItem({ amount_as_reported: 5000, amount_as_claimed: 5000 })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8082.compute: zero amounts — no outputs", () => {
  const result = compute([minimalItem({ amount_as_reported: 0, amount_as_claimed: 0 })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8082.compute: reason_for_inconsistency present — no outputs", () => {
  const result = compute([minimalItem({ reason_for_inconsistency: "Different depreciation method elected" })]);
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 6. Smoke Test
// =============================================================================

Deno.test("f8082.compute: smoke test — comprehensive item, no outputs", () => {
  const result = compute([
    minimalItem({
      entity_type: EntityType.PARTNERSHIP,
      entity_name: "Oakwood Capital Partners LP",
      entity_ein: "98-7654321",
      schedule_k1_item_description: "Net section 1231 gain",
      amount_as_reported: 25000,
      amount_as_claimed: 18000,
      reason_for_inconsistency: "Taxpayer allocated gain based on different method per partnership agreement",
    }),
    minimalItem({
      entity_type: EntityType.S_CORP,
      entity_name: "River Valley S Corp Inc",
      entity_ein: "55-1234567",
      schedule_k1_item_description: "Separately stated deduction",
      amount_as_reported: 8000,
      amount_as_claimed: 12000,
      reason_for_inconsistency: "Deduction disallowed by entity but allowed at shareholder level",
    }),
  ]);
  assertEquals(result.outputs.length, 0);
  assertEquals(Array.isArray(result.outputs), true);
});

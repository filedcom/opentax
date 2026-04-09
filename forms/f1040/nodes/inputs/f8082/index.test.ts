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
  return f8082.compute({ taxYear: 2025, formType: "f1040" }, { f8082s: items });
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
// 2. Output Routing — notice form produces no downstream outputs
// =============================================================================

Deno.test("f8082.compute: all entity types produce no outputs (notice form only)", () => {
  // Form 8082 is a disclosure attachment; it never routes tax amounts downstream
  for (const et of Object.values(EntityType)) {
    const result = compute([minimalItem({ entity_type: et })]);
    assertEquals(result.outputs.length, 0);
  }
});

Deno.test("f8082.compute: multiple inconsistency items produce no outputs", () => {
  const result = compute([
    minimalItem({ entity_type: EntityType.PARTNERSHIP, amount_as_reported: 50000, amount_as_claimed: 40000 }),
    minimalItem({ entity_type: EntityType.S_CORP, amount_as_reported: 10000, amount_as_claimed: 10000 }),
    minimalItem({ entity_type: EntityType.TRUST, amount_as_reported: -1000, amount_as_claimed: -2000 }),
  ]);
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 3. Schema captures inconsistency amounts correctly
// =============================================================================

Deno.test("f8082.inputSchema: parsed item preserves amount_as_reported and amount_as_claimed", () => {
  const item = minimalItem({ amount_as_reported: 25000, amount_as_claimed: 18000 });
  const parsed = f8082.inputSchema.parse({ f8082s: [item] });
  assertEquals(parsed.f8082s[0].amount_as_reported, 25000);
  assertEquals(parsed.f8082s[0].amount_as_claimed, 18000);
});

Deno.test("f8082.inputSchema: parsed item captures entity metadata", () => {
  const item = minimalItem({
    entity_type: EntityType.PARTNERSHIP,
    entity_name: "Oakwood Capital LP",
    entity_ein: "98-7654321",
    schedule_k1_item_description: "Net section 1231 gain",
  });
  const parsed = f8082.inputSchema.parse({ f8082s: [item] });
  assertEquals(parsed.f8082s[0].entity_type, EntityType.PARTNERSHIP);
  assertEquals(parsed.f8082s[0].entity_name, "Oakwood Capital LP");
  assertEquals(parsed.f8082s[0].entity_ein, "98-7654321");
  assertEquals(parsed.f8082s[0].schedule_k1_item_description, "Net section 1231 gain");
});

Deno.test("f8082.inputSchema: negative amounts (losses) round-trip correctly", () => {
  const parsed = f8082.inputSchema.parse({
    f8082s: [minimalItem({ amount_as_reported: -5000, amount_as_claimed: -3000 })],
  });
  assertEquals(parsed.f8082s[0].amount_as_reported, -5000);
  assertEquals(parsed.f8082s[0].amount_as_claimed, -3000);
});

Deno.test("f8082.inputSchema: reason_for_inconsistency round-trips when present", () => {
  const reason = "Taxpayer used MACRS; entity used ADS";
  const parsed = f8082.inputSchema.parse({
    f8082s: [minimalItem({ reason_for_inconsistency: reason })],
  });
  assertEquals(parsed.f8082s[0].reason_for_inconsistency, reason);
});

// =============================================================================
// 4. Hard Validation — invalid data throws
// =============================================================================

Deno.test("f8082.compute: throws on empty items array", () => {
  assertThrows(() => f8082.compute({ taxYear: 2025, formType: "f1040" }, { f8082s: [] }), Error);
});

Deno.test("f8082.compute: throws on invalid entity_type", () => {
  assertThrows(
    () => compute([minimalItem({ entity_type: "LLCPARTNER" })]),
    Error,
  );
});

// =============================================================================
// 5. Smoke Test
// =============================================================================

Deno.test("f8082.compute: smoke test — two inconsistency items, all entity metadata captured, no outputs", () => {
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
});

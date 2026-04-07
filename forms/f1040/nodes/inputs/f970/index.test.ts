import { assertEquals, assertThrows } from "@std/assert";
import { f970, InventoryMethodBefore } from "./index.ts";

function minimalItem(overrides: Record<string, unknown> = {}) {
  return {
    business_name: "Acme Goods Inc",
    employer_id: "12-3456789",
    first_year_lifo_elected: 2025,
    inventory_method_before: InventoryMethodBefore.Cost,
    ...overrides,
  };
}

function compute(items: ReturnType<typeof minimalItem>[]) {
  return f970.compute({ taxYear: 2025 }, { f970s: items } as Parameters<typeof f970.compute>[1]);
}

// ── Input validation ──────────────────────────────────────────────────────────

Deno.test("f970: throws when f970s array is empty", () => {
  assertThrows(() => compute([]), Error);
});

Deno.test("f970: throws when business_name is missing", () => {
  assertThrows(
    () => compute([minimalItem({ business_name: "" })]),
    Error,
  );
});

Deno.test("f970: throws when employer_id is missing", () => {
  assertThrows(
    () => compute([minimalItem({ employer_id: "" })]),
    Error,
  );
});

Deno.test("f970: throws when book_value_first_year is negative", () => {
  assertThrows(
    () => compute([minimalItem({ book_value_first_year: -1 })]),
    Error,
  );
});

Deno.test("f970: throws when inventory_method_before is invalid", () => {
  assertThrows(
    () => compute([minimalItem({ inventory_method_before: "invalid_method" })]),
    Error,
  );
});

// ── Valid inputs ───────────────────────────────────────────────────────────────

Deno.test("f970: minimal valid item produces no outputs", () => {
  const result = compute([minimalItem()]);
  assertEquals(result.outputs, []);
});

Deno.test("f970: all InventoryMethodBefore enum values produce no outputs", () => {
  for (const method of Object.values(InventoryMethodBefore)) {
    const result = compute([minimalItem({ inventory_method_before: method })]);
    assertEquals(result.outputs, []);
  }
});

Deno.test("f970: optional fields accepted — no outputs", () => {
  const result = compute([
    minimalItem({
      goods_to_which_lifo_applies: "Finished goods inventory",
      book_value_first_year: 50000,
    }),
  ]);
  assertEquals(result.outputs, []);
});

// ── No downstream outputs (administrative form) ───────────────────────────────

Deno.test("f970: produces no outputs (administrative election)", () => {
  const result = compute([minimalItem()]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("f970: multiple items still produce no outputs", () => {
  const result = compute([
    minimalItem({ business_name: "Shop A", employer_id: "11-1111111" }),
    minimalItem({ business_name: "Shop B", employer_id: "22-2222222" }),
  ]);
  assertEquals(result.outputs.length, 0);
});

// ── Smoke test ────────────────────────────────────────────────────────────────

Deno.test("f970: smoke test with all fields populated", () => {
  const result = compute([
    minimalItem({
      business_name: "Widget Manufacturing LLC",
      employer_id: "98-7654321",
      first_year_lifo_elected: 2025,
      inventory_method_before: InventoryMethodBefore.LowerCostOrMarket,
      goods_to_which_lifo_applies: "Raw materials and finished widgets",
      book_value_first_year: 125000,
    }),
  ]);
  assertEquals(result.outputs.length, 0);
});

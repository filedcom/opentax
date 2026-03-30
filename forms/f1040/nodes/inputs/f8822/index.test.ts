import { assertEquals, assertThrows } from "@std/assert";
import { f8822 } from "./index.ts";

function compute(input: Record<string, unknown>) {
  return f8822.compute({ taxYear: 2025 }, input as Parameters<typeof f8822.compute>[0]);
}

// =============================================================================
// 1. Schema Validation
// =============================================================================

Deno.test("f8822.inputSchema: valid domestic address passes", () => {
  const parsed = f8822.inputSchema.safeParse({
    taxpayer_name: "John Doe",
    old_address: "123 Old St, Springfield, IL 62701",
    new_address: "456 New Ave",
    new_city: "Chicago",
    new_state: "IL",
    new_zip: "60601",
  });
  assertEquals(parsed.success, true);
});

Deno.test("f8822.inputSchema: missing new_address fails", () => {
  const parsed = f8822.inputSchema.safeParse({
    taxpayer_name: "John Doe",
    old_address: "123 Old St",
    new_city: "Chicago",
  });
  assertEquals(parsed.success, false);
});

Deno.test("f8822.inputSchema: missing old_address fails", () => {
  const parsed = f8822.inputSchema.safeParse({
    taxpayer_name: "John Doe",
    new_address: "456 New Ave",
    new_city: "Chicago",
  });
  assertEquals(parsed.success, false);
});

Deno.test("f8822.inputSchema: missing taxpayer_name fails", () => {
  const parsed = f8822.inputSchema.safeParse({
    old_address: "123 Old St",
    new_address: "456 New Ave",
    new_city: "Chicago",
  });
  assertEquals(parsed.success, false);
});

Deno.test("f8822.inputSchema: missing new_city fails", () => {
  const parsed = f8822.inputSchema.safeParse({
    taxpayer_name: "John Doe",
    old_address: "123 Old St",
    new_address: "456 New Ave",
  });
  assertEquals(parsed.success, false);
});

Deno.test("f8822.inputSchema: spouse fields are optional", () => {
  const withSpouse = f8822.inputSchema.safeParse({
    taxpayer_name: "John Doe",
    old_address: "123 Old St",
    new_address: "456 New Ave",
    new_city: "Chicago",
    spouse_name: "Jane Doe",
    spouse_ssn: "400-50-6000",
  });
  assertEquals(withSpouse.success, true);

  const withoutSpouse = f8822.inputSchema.safeParse({
    taxpayer_name: "John Doe",
    old_address: "123 Old St",
    new_address: "456 New Ave",
    new_city: "Chicago",
  });
  assertEquals(withoutSpouse.success, true);
});

Deno.test("f8822.inputSchema: foreign address (no state/zip, with country) passes", () => {
  const parsed = f8822.inputSchema.safeParse({
    taxpayer_name: "John Doe",
    old_address: "123 Old St, Chicago, IL 60601",
    new_address: "10 Rue de Rivoli",
    new_city: "Paris",
    new_country: "France",
  });
  assertEquals(parsed.success, true);
});

// =============================================================================
// 2. Compute — No Tax Outputs
// =============================================================================

Deno.test("f8822.compute: valid input returns no outputs", () => {
  const result = compute({
    taxpayer_name: "John Doe",
    old_address: "123 Old St",
    new_address: "456 New Ave",
    new_city: "Chicago",
    new_state: "IL",
    new_zip: "60601",
  });
  assertEquals(result.outputs, []);
});

Deno.test("f8822.compute: with spouse returns no outputs", () => {
  const result = compute({
    taxpayer_name: "John Doe",
    old_address: "123 Old St",
    new_address: "456 New Ave",
    new_city: "Chicago",
    spouse_name: "Jane Doe",
  });
  assertEquals(result.outputs, []);
});

Deno.test("f8822.compute: foreign address returns no outputs", () => {
  const result = compute({
    taxpayer_name: "John Doe",
    old_address: "123 Old St, Chicago IL",
    new_address: "10 Rue de Rivoli",
    new_city: "Paris",
    new_country: "France",
  });
  assertEquals(result.outputs, []);
});

// =============================================================================
// 3. Hard Validation
// =============================================================================

Deno.test("f8822.compute: throws on missing new_address", () => {
  assertThrows(() =>
    compute({
      taxpayer_name: "John Doe",
      old_address: "123 Old St",
      new_city: "Chicago",
    }), Error);
});

Deno.test("f8822.compute: throws on missing taxpayer_name", () => {
  assertThrows(() =>
    compute({
      old_address: "123 Old St",
      new_address: "456 New Ave",
      new_city: "Chicago",
    }), Error);
});

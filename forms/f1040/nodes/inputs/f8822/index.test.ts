import { assertEquals, assertThrows } from "@std/assert";
import { f8822 } from "./index.ts";

function compute(input: Record<string, unknown>) {
  return f8822.compute({ taxYear: 2025 }, input as Parameters<typeof f8822.compute>[1]);
}

// =============================================================================
// 1. Schema Validation — one required-field failure is sufficient
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

Deno.test("f8822.inputSchema: missing required field fails", () => {
  const parsed = f8822.inputSchema.safeParse({
    taxpayer_name: "John Doe",
    old_address: "123 Old St",
    new_city: "Chicago",
    // new_address intentionally omitted
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
// 2. Compute — Administrative form, always returns empty outputs
// =============================================================================

Deno.test("f8822.compute: domestic address change returns no tax outputs", () => {
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

Deno.test("f8822.compute: joint filers with spouse returns no tax outputs", () => {
  const result = compute({
    taxpayer_name: "John Doe",
    old_address: "123 Old St",
    new_address: "456 New Ave",
    new_city: "Chicago",
    spouse_name: "Jane Doe",
    spouse_ssn: "400-50-6000",
  });
  assertEquals(result.outputs, []);
});

Deno.test("f8822.compute: foreign address change returns no tax outputs", () => {
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
// 3. Hard Validation — invalid input throws
// =============================================================================

Deno.test("f8822.compute: throws on missing required field", () => {
  assertThrows(() =>
    compute({
      taxpayer_name: "John Doe",
      old_address: "123 Old St",
      // new_address missing
      new_city: "Chicago",
    }), Error);
});

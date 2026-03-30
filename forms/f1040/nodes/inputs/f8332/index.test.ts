import { assertEquals, assertThrows } from "@std/assert";
import { f8332 } from "./index.ts";

function compute(input: Record<string, unknown>) {
  return f8332.compute(input as Parameters<typeof f8332.compute>[0]);
}

// =============================================================================
// 1. Schema Validation
// =============================================================================

Deno.test("f8332.inputSchema: valid release for specific years passes", () => {
  const parsed = f8332.inputSchema.safeParse({
    custodial_parent_name: "Jane Doe",
    noncustodial_parent_name: "John Doe",
    children: [{ name: "Child One", ssn: "111-22-3333" }],
    tax_years_released: [2024, 2025],
  });
  assertEquals(parsed.success, true);
});

Deno.test("f8332.inputSchema: valid release for all_future years passes", () => {
  const parsed = f8332.inputSchema.safeParse({
    custodial_parent_name: "Jane Doe",
    noncustodial_parent_name: "John Doe",
    children: [{ name: "Child One" }],
    tax_years_released: "all_future",
  });
  assertEquals(parsed.success, true);
});

Deno.test("f8332.inputSchema: empty children array fails", () => {
  const parsed = f8332.inputSchema.safeParse({
    custodial_parent_name: "Jane Doe",
    noncustodial_parent_name: "John Doe",
    children: [],
    tax_years_released: [2024],
  });
  assertEquals(parsed.success, false);
});

Deno.test("f8332.inputSchema: missing custodial_parent_name fails", () => {
  const parsed = f8332.inputSchema.safeParse({
    noncustodial_parent_name: "John Doe",
    children: [{ name: "Child One" }],
    tax_years_released: [2024],
  });
  assertEquals(parsed.success, false);
});

Deno.test("f8332.inputSchema: missing noncustodial_parent_name fails", () => {
  const parsed = f8332.inputSchema.safeParse({
    custodial_parent_name: "Jane Doe",
    children: [{ name: "Child One" }],
    tax_years_released: [2024],
  });
  assertEquals(parsed.success, false);
});

Deno.test("f8332.inputSchema: is_revocation field is optional", () => {
  const withRevocation = f8332.inputSchema.safeParse({
    custodial_parent_name: "Jane Doe",
    noncustodial_parent_name: "John Doe",
    children: [{ name: "Child One" }],
    tax_years_released: "all_future",
    is_revocation: true,
  });
  assertEquals(withRevocation.success, true);

  const withoutRevocation = f8332.inputSchema.safeParse({
    custodial_parent_name: "Jane Doe",
    noncustodial_parent_name: "John Doe",
    children: [{ name: "Child One" }],
    tax_years_released: "all_future",
  });
  assertEquals(withoutRevocation.success, true);
});

Deno.test("f8332.inputSchema: multiple children passes", () => {
  const parsed = f8332.inputSchema.safeParse({
    custodial_parent_name: "Jane Doe",
    custodial_parent_ssn: "400-50-6000",
    noncustodial_parent_name: "John Doe",
    noncustodial_parent_ssn: "500-60-7000",
    children: [
      { name: "Child One", ssn: "111-22-3333" },
      { name: "Child Two", ssn: "222-33-4444" },
    ],
    tax_years_released: [2023, 2024, 2025],
  });
  assertEquals(parsed.success, true);
});

// =============================================================================
// 2. Compute — No Tax Outputs
// =============================================================================

Deno.test("f8332.compute: valid release returns no outputs", () => {
  const result = compute({
    custodial_parent_name: "Jane Doe",
    noncustodial_parent_name: "John Doe",
    children: [{ name: "Child One" }],
    tax_years_released: [2024],
  });
  assertEquals(result.outputs, []);
});

Deno.test("f8332.compute: all_future release returns no outputs", () => {
  const result = compute({
    custodial_parent_name: "Jane Doe",
    noncustodial_parent_name: "John Doe",
    children: [{ name: "Child One" }],
    tax_years_released: "all_future",
  });
  assertEquals(result.outputs, []);
});

Deno.test("f8332.compute: revocation returns no outputs", () => {
  const result = compute({
    custodial_parent_name: "Jane Doe",
    noncustodial_parent_name: "John Doe",
    children: [{ name: "Child One" }],
    tax_years_released: [2024],
    is_revocation: true,
  });
  assertEquals(result.outputs, []);
});

// =============================================================================
// 3. Hard Validation
// =============================================================================

Deno.test("f8332.compute: throws on empty children", () => {
  assertThrows(() =>
    compute({
      custodial_parent_name: "Jane Doe",
      noncustodial_parent_name: "John Doe",
      children: [],
      tax_years_released: [2024],
    }), Error);
});

Deno.test("f8332.compute: throws on missing required fields", () => {
  assertThrows(() => compute({ children: [{ name: "Child One" }], tax_years_released: [2024] }), Error);
});

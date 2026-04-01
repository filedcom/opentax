import { assertEquals, assertThrows } from "@std/assert";
import { AccountType, f114 } from "./index.ts";

function compute(input: Record<string, unknown>) {
  return f114.compute({ taxYear: 2025 }, input as Parameters<typeof f114.compute>[1]);
}

// =============================================================================
// 1. Input Validation — required fields and type constraints
// =============================================================================

Deno.test("f114.inputSchema: minimal valid input passes (has_foreign_accounts=false)", () => {
  const parsed = f114.inputSchema.safeParse({ has_foreign_accounts: false });
  assertEquals(parsed.success, true);
});

Deno.test("f114.inputSchema: has_foreign_accounts=true with no accounts passes", () => {
  const parsed = f114.inputSchema.safeParse({
    has_foreign_accounts: true,
    max_aggregate_value: 25000,
    account_count: 1,
  });
  assertEquals(parsed.success, true);
});

Deno.test("f114.inputSchema: missing has_foreign_accounts fails", () => {
  const parsed = f114.inputSchema.safeParse({
    max_aggregate_value: 25000,
  });
  assertEquals(parsed.success, false);
});

Deno.test("f114.inputSchema: non-boolean has_foreign_accounts fails", () => {
  const parsed = f114.inputSchema.safeParse({
    has_foreign_accounts: "yes",
  });
  assertEquals(parsed.success, false);
});

Deno.test("f114.inputSchema: negative max_aggregate_value fails", () => {
  const parsed = f114.inputSchema.safeParse({
    has_foreign_accounts: true,
    max_aggregate_value: -100,
  });
  assertEquals(parsed.success, false);
});

Deno.test("f114.inputSchema: negative account_count fails", () => {
  const parsed = f114.inputSchema.safeParse({
    has_foreign_accounts: true,
    account_count: -1,
  });
  assertEquals(parsed.success, false);
});

Deno.test("f114.inputSchema: valid account with all fields passes", () => {
  const parsed = f114.inputSchema.safeParse({
    has_foreign_accounts: true,
    max_aggregate_value: 50000,
    account_count: 1,
    accounts: [{
      country: "Canada",
      institution_name: "Royal Bank of Canada",
      account_type: AccountType.Bank,
      max_value: 50000,
    }],
  });
  assertEquals(parsed.success, true);
});

Deno.test("f114.inputSchema: invalid account_type fails", () => {
  const parsed = f114.inputSchema.safeParse({
    has_foreign_accounts: true,
    accounts: [{
      country: "Canada",
      institution_name: "RBC",
      account_type: "invalid_type",
      max_value: 1000,
    }],
  });
  assertEquals(parsed.success, false);
});

Deno.test("f114.inputSchema: all account_type enum values are valid", () => {
  for (const acctType of Object.values(AccountType)) {
    const parsed = f114.inputSchema.safeParse({
      has_foreign_accounts: true,
      accounts: [{
        account_type: acctType,
        max_value: 1000,
      }],
    });
    assertEquals(parsed.success, true);
  }
});

// =============================================================================
// 2. Compute — no foreign accounts
// =============================================================================

Deno.test("f114.compute: has_foreign_accounts=false returns no outputs", () => {
  const result = compute({ has_foreign_accounts: false });
  assertEquals(result.outputs, []);
});

Deno.test("f114.compute: has_foreign_accounts=true returns no outputs (informational only)", () => {
  const result = compute({
    has_foreign_accounts: true,
    max_aggregate_value: 25000,
    account_count: 1,
    accounts: [{
      country: "UK",
      institution_name: "Barclays",
      account_type: AccountType.Bank,
      max_value: 25000,
    }],
  });
  // FBAR is informational — no tax outputs
  assertEquals(result.outputs, []);
});

Deno.test("f114.compute: multiple accounts return no outputs", () => {
  const result = compute({
    has_foreign_accounts: true,
    max_aggregate_value: 100000,
    account_count: 2,
    accounts: [
      { country: "France", institution_name: "BNP", account_type: AccountType.Bank, max_value: 60000 },
      { country: "Germany", institution_name: "Deutsche", account_type: AccountType.Securities, max_value: 40000 },
    ],
  });
  assertEquals(result.outputs, []);
});

Deno.test("f114.compute: securities account type returns no outputs", () => {
  const result = compute({
    has_foreign_accounts: true,
    accounts: [{ account_type: AccountType.Securities, max_value: 15000 }],
  });
  assertEquals(result.outputs, []);
});

Deno.test("f114.compute: other account type returns no outputs", () => {
  const result = compute({
    has_foreign_accounts: true,
    accounts: [{ account_type: AccountType.Other, max_value: 12000 }],
  });
  assertEquals(result.outputs, []);
});

// =============================================================================
// 3. Threshold tests — $10,000 aggregate filing requirement
// =============================================================================

Deno.test("f114.compute: aggregate below $10,000 threshold — no outputs", () => {
  const result = compute({
    has_foreign_accounts: true,
    max_aggregate_value: 9999,
  });
  assertEquals(result.outputs, []);
});

Deno.test("f114.compute: aggregate at $10,000 threshold — no outputs (informational)", () => {
  const result = compute({
    has_foreign_accounts: true,
    max_aggregate_value: 10000,
  });
  assertEquals(result.outputs, []);
});

Deno.test("f114.compute: aggregate above $10,000 threshold — no outputs (informational)", () => {
  const result = compute({
    has_foreign_accounts: true,
    max_aggregate_value: 10001,
  });
  assertEquals(result.outputs, []);
});

// =============================================================================
// 4. Hard validation rules
// =============================================================================

Deno.test("f114.compute: throws on missing has_foreign_accounts", () => {
  assertThrows(() => compute({}), Error);
});

Deno.test("f114.compute: throws on non-boolean has_foreign_accounts", () => {
  assertThrows(() => compute({ has_foreign_accounts: "yes" }), Error);
});

Deno.test("f114.compute: throws on negative max_aggregate_value", () => {
  assertThrows(() => compute({ has_foreign_accounts: true, max_aggregate_value: -1 }), Error);
});

// =============================================================================
// 5. Smoke test — full population
// =============================================================================

Deno.test("f114.compute: smoke test — all fields populated returns empty outputs", () => {
  const result = compute({
    has_foreign_accounts: true,
    max_aggregate_value: 250000,
    account_count: 3,
    accounts: [
      { country: "Switzerland", institution_name: "UBS AG", account_type: AccountType.Bank, max_value: 100000 },
      { country: "Cayman Islands", institution_name: "Cayman National", account_type: AccountType.Securities, max_value: 100000 },
      { country: "Luxembourg", institution_name: "Luxbank", account_type: AccountType.Other, max_value: 50000 },
    ],
  });
  assertEquals(Array.isArray(result.outputs), true);
  assertEquals(result.outputs.length, 0);
});

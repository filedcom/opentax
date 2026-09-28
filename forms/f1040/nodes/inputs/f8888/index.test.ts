import { assertEquals, assertThrows } from "@std/assert";
import { AccountType, f8888 } from "./index.ts";

function compute(input: Record<string, unknown>) {
  return f8888.compute(
    { taxYear: 2025, formType: "f1040" },
    input as Parameters<typeof f8888.compute>[1],
  );
}

// =============================================================================
// 1. Schema Validation
// =============================================================================

Deno.test("f8888.inputSchema: negative account amount rejected", () => {
  const parsed = f8888.inputSchema.safeParse({ account_1: { amount: -1 } });
  assertEquals(parsed.success, false);
});

Deno.test("f8888.inputSchema: obsolete 2025 savings-bond fields reject instead of disappearing", () => {
  for (
    const fields of [
      { savings_bond_amount: 100 },
      { bond_owner_name: "Jane Smith" },
      { bond_coowner_name: "John Smith" },
    ]
  ) {
    assertEquals(f8888.inputSchema.safeParse(fields).success, false);
  }
});

Deno.test("f8888.inputSchema: invalid account_type rejected", () => {
  const parsed = f8888.inputSchema.safeParse({
    account_1: { account_type: "INVALID" },
  });
  assertEquals(parsed.success, false);
});

// =============================================================================
// 2. Metadata Form — Always Zero Outputs
// =============================================================================

Deno.test("f8888.compute: rejects an incomplete allocation", () => {
  assertThrows(() => compute({}), Error);
});

Deno.test("f8888.compute: all 3 accounts set — no tax outputs", () => {
  const result = compute({
    account_1: {
      routing_number: "021000021",
      account_number: "111222333",
      account_type: AccountType.Checking,
      amount: 300,
      owner_name: "Jane Smith",
    },
    account_2: {
      routing_number: "021000021",
      account_number: "444555666",
      account_type: AccountType.Savings,
      amount: 400,
      owner_name: "Jane Smith",
    },
    account_3: {
      routing_number: "021000089",
      account_number: "777888999",
      account_type: AccountType.Checking,
      amount: 200,
      owner_name: "Jane Smith",
    },
  });
  assertEquals(result.outputs, []);
});

// =============================================================================
// 3. Hard Validation
// =============================================================================

Deno.test("f8888.compute: throws on negative account amount", () => {
  assertThrows(() => compute({ account_1: { amount: -1 } }), Error);
});

Deno.test("f8888.compute: obsolete savings-bond request rejects", () => {
  assertThrows(() => compute({ savings_bond_amount: 50 }), Error);
});

// =============================================================================
// 4. Smoke Test — Refund Split Across 3 Accounts
// =============================================================================

Deno.test("f8888.compute: refund split across 3 accounts — amounts accepted, no outputs", () => {
  const account1Amount = 1000;
  const account2Amount = 500;
  const account3Amount = 250;

  const result = compute({
    account_1: {
      routing_number: "021000021",
      account_number: "111222333",
      account_type: AccountType.Checking,
      amount: account1Amount,
      owner_name: "Jane Smith",
    },
    account_2: {
      routing_number: "021000021",
      account_number: "444555666",
      account_type: AccountType.Savings,
      amount: account2Amount,
      owner_name: "Jane Smith",
    },
    account_3: {
      routing_number: "021000089",
      account_number: "777888999",
      account_type: AccountType.Checking,
      amount: account3Amount,
      owner_name: "Jane Smith",
    },
  });

  // account1 + account2 + account3 = 1000 + 500 + 250 = 1750
  assertEquals(account1Amount + account2Amount + account3Amount, 1750);
  // Metadata form — no tax outputs regardless of amounts
  assertEquals(result.outputs, []);
});

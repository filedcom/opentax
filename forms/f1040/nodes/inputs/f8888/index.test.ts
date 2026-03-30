import { assertEquals, assertThrows } from "@std/assert";
import { f8888, AccountType } from "./index.ts";

function compute(input: Record<string, unknown>) {
  return f8888.compute({ taxYear: 2025 }, input as Parameters<typeof f8888.compute>[1]);
}

// =============================================================================
// 1. Input Schema Validation
// =============================================================================

Deno.test("f8888.inputSchema: empty input passes", () => {
  const parsed = f8888.inputSchema.safeParse({});
  assertEquals(parsed.success, true);
});

Deno.test("f8888.inputSchema: negative account_1 amount fails", () => {
  const parsed = f8888.inputSchema.safeParse({
    account_1: { amount: -1 },
  });
  assertEquals(parsed.success, false);
});

Deno.test("f8888.inputSchema: negative account_2 amount fails", () => {
  const parsed = f8888.inputSchema.safeParse({
    account_2: { amount: -500 },
  });
  assertEquals(parsed.success, false);
});

Deno.test("f8888.inputSchema: negative savings_bond_amount fails", () => {
  const parsed = f8888.inputSchema.safeParse({ savings_bond_amount: -100 });
  assertEquals(parsed.success, false);
});

Deno.test("f8888.inputSchema: valid AccountType checking passes", () => {
  const parsed = f8888.inputSchema.safeParse({
    account_1: { account_type: AccountType.Checking, amount: 500 },
  });
  assertEquals(parsed.success, true);
});

Deno.test("f8888.inputSchema: valid AccountType savings passes", () => {
  const parsed = f8888.inputSchema.safeParse({
    account_1: { account_type: AccountType.Savings, amount: 200 },
  });
  assertEquals(parsed.success, true);
});

Deno.test("f8888.inputSchema: invalid account_type fails", () => {
  const parsed = f8888.inputSchema.safeParse({
    account_1: { account_type: "INVALID" },
  });
  assertEquals(parsed.success, false);
});

Deno.test("f8888.inputSchema: valid full input passes", () => {
  const parsed = f8888.inputSchema.safeParse({
    account_1: { routing_number: "021000021", account_number: "123456789", account_type: AccountType.Checking, amount: 1000 },
    account_2: { routing_number: "021000021", account_number: "987654321", account_type: AccountType.Savings, amount: 500 },
    savings_bond_amount: 200,
    bond_owner_name: "John Doe",
  });
  assertEquals(parsed.success, true);
});

// =============================================================================
// 2. Metadata Form — No Tax Outputs
// =============================================================================

Deno.test("f8888.compute: empty input produces no outputs", () => {
  const result = compute({});
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8888.compute: account_1 set — no tax outputs", () => {
  const result = compute({
    account_1: { routing_number: "021000021", account_number: "123", amount: 500 },
  });
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8888.compute: all 3 accounts set — no tax outputs", () => {
  const result = compute({
    account_1: { amount: 300 },
    account_2: { amount: 400 },
    account_3: { amount: 200 },
  });
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8888.compute: savings bond amount set — no tax outputs", () => {
  const result = compute({ savings_bond_amount: 500 });
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8888.compute: bond owner name set — no tax outputs", () => {
  const result = compute({ bond_owner_name: "Jane Smith" });
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8888.compute: bond coowner name set — no tax outputs", () => {
  const result = compute({ bond_coowner_name: "John Smith" });
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 3. Hard Validation
// =============================================================================

Deno.test("f8888.compute: throws on negative account amount", () => {
  assertThrows(
    () => compute({ account_1: { amount: -1 } }),
    Error,
  );
});

Deno.test("f8888.compute: throws on negative savings_bond_amount", () => {
  assertThrows(() => compute({ savings_bond_amount: -50 }), Error);
});

Deno.test("f8888.compute: zero amounts do not throw", () => {
  const result = compute({ account_1: { amount: 0 }, savings_bond_amount: 0 });
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 4. Smoke Test
// =============================================================================

Deno.test("f8888.compute: smoke test — full refund allocation to 3 accounts and bonds", () => {
  const result = compute({
    account_1: {
      routing_number: "021000021",
      account_number: "111222333",
      account_type: AccountType.Checking,
      amount: 1000,
    },
    account_2: {
      routing_number: "021000021",
      account_number: "444555666",
      account_type: AccountType.Savings,
      amount: 500,
    },
    account_3: {
      routing_number: "021000089",
      account_number: "777888999",
      account_type: AccountType.Checking,
      amount: 250,
    },
    savings_bond_amount: 200,
    bond_owner_name: "Alice Example",
    bond_coowner_name: "Bob Example",
  });

  // Metadata form — always zero outputs
  assertEquals(result.outputs.length, 0);
  assertEquals(Array.isArray(result.outputs), true);
});

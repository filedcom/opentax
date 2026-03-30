import { assertEquals } from "@std/assert";
import { f8379 } from "./index.ts";

function compute(input: Parameters<typeof f8379.compute>[0]) {
  return f8379.compute(input);
}

// =============================================================================
// 1. Schema Validation
// =============================================================================

Deno.test("f8379: empty object is valid — all fields optional", () => {
  const parsed = f8379.inputSchema.safeParse({});
  assertEquals(parsed.success, true);
});

Deno.test("f8379: negative injured_spouse_wages rejected", () => {
  const parsed = f8379.inputSchema.safeParse({ injured_spouse_wages: -1 });
  assertEquals(parsed.success, false);
});

Deno.test("f8379: negative injured_spouse_withholding rejected", () => {
  const parsed = f8379.inputSchema.safeParse({ injured_spouse_withholding: -100 });
  assertEquals(parsed.success, false);
});

Deno.test("f8379: injured_spouse_se_income can be negative (loss)", () => {
  const parsed = f8379.inputSchema.safeParse({ injured_spouse_se_income: -5_000 });
  assertEquals(parsed.success, true);
});

Deno.test("f8379: valid debt_type accepted", () => {
  const parsed = f8379.inputSchema.safeParse({ debt_type: "child_support" });
  assertEquals(parsed.success, true);
});

Deno.test("f8379: invalid debt_type rejected", () => {
  const parsed = f8379.inputSchema.safeParse({ debt_type: "mortgage" });
  assertEquals(parsed.success, false);
});

Deno.test("f8379: all debt types accepted", () => {
  const types = ["child_support", "federal_tax", "state_tax", "student_loan", "unemployment", "other"];
  for (const t of types) {
    const parsed = f8379.inputSchema.safeParse({ debt_type: t });
    assertEquals(parsed.success, true, `debt_type "${t}" should be valid`);
  }
});

// =============================================================================
// 2. Outputs — always empty (allocation/disclosure only)
// =============================================================================

Deno.test("f8379: empty input produces no outputs", () => {
  const result = compute({});
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8379: full input produces no outputs", () => {
  const result = compute({
    injured_spouse_ssn: "123456789",
    injured_spouse_wages: 50_000,
    injured_spouse_withholding: 8_000,
    injured_spouse_estimated_tax: 2_000,
    injured_spouse_eic: 1_500,
    debt_type: "child_support",
    debt_amount: 3_000,
    itemizes: false,
  });
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8379: se_income loss with wages still produces no outputs", () => {
  const result = compute({
    injured_spouse_wages: 40_000,
    injured_spouse_se_income: -5_000,
    debt_type: "student_loan",
    debt_amount: 10_000,
  });
  assertEquals(result.outputs.length, 0);
});

import { assertEquals, assertThrows } from "@std/assert";
import { f8379 } from "./index.ts";

function compute(input: Parameters<typeof f8379.compute>[1]) {
  return f8379.compute({ taxYear: 2025, formType: "f1040" }, input);
}

// =============================================================================
// Schema Validation
// =============================================================================

Deno.test("f8379.inputSchema: rejects negative injured_spouse_wages", () => {
  assertEquals(f8379.inputSchema.safeParse({ injured_spouse_wages: -1 }).success, false);
});

Deno.test("f8379.inputSchema: injured_spouse_se_income may be negative (loss)", () => {
  assertEquals(f8379.inputSchema.safeParse({ injured_spouse_se_income: -5000 }).success, true);
});

Deno.test("f8379.inputSchema: rejects invalid debt_type", () => {
  assertEquals(f8379.inputSchema.safeParse({ debt_type: "mortgage" }).success, false);
});

Deno.test("f8379.inputSchema: all valid debt_type values accepted", () => {
  const types = ["child_support", "federal_tax", "state_tax", "student_loan", "unemployment", "other"] as const;
  for (const t of types) {
    assertEquals(f8379.inputSchema.safeParse({ debt_type: t }).success, true, `debt_type "${t}" should be valid`);
  }
});

// =============================================================================
// Hard Validation
// =============================================================================

Deno.test("f8379.compute: throws on negative withholding", () => {
  assertThrows(
    () => compute({ injured_spouse_withholding: -100 }),
    Error,
  );
});

// =============================================================================
// Allocation/Disclosure Form — always produces no tax outputs
// =============================================================================

Deno.test("f8379.compute: empty input produces no outputs", () => {
  assertEquals(compute({}).outputs, []);
});

Deno.test("f8379.compute: wages + withholding + EIC — no tax outputs (allocation form only)", () => {
  assertEquals(
    compute({
      injured_spouse_wages: 50000,
      injured_spouse_withholding: 8000,
      injured_spouse_eic: 1500,
    }).outputs,
    [],
  );
});

Deno.test("f8379.compute: SE income loss does not trigger any output", () => {
  assertEquals(
    compute({
      injured_spouse_wages: 40000,
      injured_spouse_se_income: -5000,
      debt_type: "student_loan",
      debt_amount: 10000,
    }).outputs,
    [],
  );
});

Deno.test("f8379.compute: itemized deductions flag — no tax outputs", () => {
  assertEquals(
    compute({
      injured_spouse_wages: 60000,
      injured_spouse_itemized_deductions: 15000,
      itemizes: true,
    }).outputs,
    [],
  );
});

Deno.test("f8379.compute: estimated tax payments allocated — no tax outputs", () => {
  assertEquals(
    compute({
      injured_spouse_wages: 45000,
      injured_spouse_withholding: 6000,
      injured_spouse_estimated_tax: 2000,
      injured_spouse_credits: 500,
    }).outputs,
    [],
  );
});

// =============================================================================
// Smoke Test — all fields populated
// =============================================================================

Deno.test("f8379.compute: smoke — full allocation scenario produces no outputs", () => {
  const result = compute({
    injured_spouse_ssn: "123-45-6789",
    injured_spouse_name: "Jane Doe",
    injured_spouse_wages: 55000,
    injured_spouse_se_income: 5000,
    injured_spouse_other_income: 1000,
    injured_spouse_withholding: 9000,
    injured_spouse_estimated_tax: 2000,
    injured_spouse_eic: 0,
    injured_spouse_itemized_deductions: 12000,
    itemizes: true,
    injured_spouse_credits: 500,
    debt_type: "child_support",
    debt_amount: 8000,
  });
  assertEquals(result.outputs, []);
});

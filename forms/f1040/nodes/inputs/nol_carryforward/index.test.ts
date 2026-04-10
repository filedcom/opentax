import { assertEquals, assertThrows } from "@std/assert";
import { nol_carryforward, NolType } from "./index.ts";
import { fieldsOf } from "../../../../../core/test-utils/output.ts";
import { schedule1 } from "../../outputs/schedule1/index.ts";
import { standard_deduction } from "../../intermediate/worksheets/standard_deduction/index.ts";

function minimalItem(overrides: Record<string, unknown> = {}) {
  return {
    year: 2022,
    nol_amount: 0,
    nol_type: NolType.POST2017,
    ...overrides,
  };
}

function compute(
  items: ReturnType<typeof minimalItem>[],
  current_year_taxable_income = 0,
) {
  return nol_carryforward.compute(
    { taxYear: 2025, formType: "f1040" },
    { nol_carryforwards: items, current_year_taxable_income },
  );
}

// =============================================================================
// 1. Input Schema Validation
// =============================================================================

Deno.test("nol_carryforward.inputSchema: valid minimal item passes", () => {
  const parsed = nol_carryforward.inputSchema.safeParse({
    nol_carryforwards: [{ year: 2022, nol_amount: 5000, nol_type: NolType.POST2017 }],
    current_year_taxable_income: 100000,
  });
  assertEquals(parsed.success, true);
});

Deno.test("nol_carryforward.inputSchema: empty array fails (min 1)", () => {
  const parsed = nol_carryforward.inputSchema.safeParse({
    nol_carryforwards: [],
    current_year_taxable_income: 100000,
  });
  assertEquals(parsed.success, false);
});

Deno.test("nol_carryforward.inputSchema: invalid nol_type fails", () => {
  const parsed = nol_carryforward.inputSchema.safeParse({
    nol_carryforwards: [{ year: 2022, nol_amount: 5000, nol_type: "INVALID" }],
    current_year_taxable_income: 100000,
  });
  assertEquals(parsed.success, false);
});

Deno.test("nol_carryforward.inputSchema: negative nol_amount fails", () => {
  const parsed = nol_carryforward.inputSchema.safeParse({
    nol_carryforwards: [{ year: 2022, nol_amount: -1000, nol_type: NolType.POST2017 }],
    current_year_taxable_income: 100000,
  });
  assertEquals(parsed.success, false);
});

Deno.test("nol_carryforward.inputSchema: PRE2018 type valid", () => {
  const parsed = nol_carryforward.inputSchema.safeParse({
    nol_carryforwards: [{ year: 2016, nol_amount: 10000, nol_type: NolType.PRE2018 }],
    current_year_taxable_income: 50000,
  });
  assertEquals(parsed.success, true);
});

// =============================================================================
// 2. Post-2017 NOL — 80% Limitation
// =============================================================================

Deno.test("nol_carryforward.compute: post-2017 NOL limited to 80% of taxable income", () => {
  // $10000 NOL against $100000 income: 80% = 80000; NOL 10000 < 80000 → 10000
  const result = compute(
    [minimalItem({ nol_type: NolType.POST2017, nol_amount: 10000 })],
    100000,
  );
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line8a_nol_deduction, 10000);
});

Deno.test("nol_carryforward.compute: post-2017 NOL capped at 80% when NOL exceeds limit", () => {
  // $100000 NOL against $100000 income: 80% limit = 80000 → deduction = 80000
  const result = compute(
    [minimalItem({ nol_type: NolType.POST2017, nol_amount: 100000 })],
    100000,
  );
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line8a_nol_deduction, 80000);
});

Deno.test("nol_carryforward.compute: post-2017 NOL exactly at 80% of income", () => {
  // $80000 NOL against $100000 income: 80% = 80000 → deduction = 80000
  const result = compute(
    [minimalItem({ nol_type: NolType.POST2017, nol_amount: 80000 })],
    100000,
  );
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line8a_nol_deduction, 80000);
});

Deno.test("nol_carryforward.compute: post-2017 NOL with zero taxable income — no output", () => {
  const result = compute(
    [minimalItem({ nol_type: NolType.POST2017, nol_amount: 50000 })],
    0,
  );
  assertEquals(result.outputs.length, 0);
});

Deno.test("nol_carryforward.compute: post-2017 NOL with negative taxable income — no output", () => {
  const result = compute(
    [minimalItem({ nol_type: NolType.POST2017, nol_amount: 50000 })],
    -10000,
  );
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 3. Pre-2018 NOL — 100% of Income
// =============================================================================

Deno.test("nol_carryforward.compute: pre-2018 NOL deducts up to 100% of taxable income", () => {
  // $50000 NOL against $100000 income: 100% limit → deduction = 50000
  const result = compute(
    [minimalItem({ nol_type: NolType.PRE2018, nol_amount: 50000, year: 2016 })],
    100000,
  );
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line8a_nol_deduction, 50000);
});

Deno.test("nol_carryforward.compute: pre-2018 NOL capped at 100% of taxable income", () => {
  // $150000 NOL against $100000 income: capped at 100000
  const result = compute(
    [minimalItem({ nol_type: NolType.PRE2018, nol_amount: 150000, year: 2016 })],
    100000,
  );
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line8a_nol_deduction, 100000);
});

Deno.test("nol_carryforward.compute: pre-2018 NOL exactly at 100% of income", () => {
  // $100000 NOL against $100000 income → deduction = 100000
  const result = compute(
    [minimalItem({ nol_type: NolType.PRE2018, nol_amount: 100000, year: 2017 })],
    100000,
  );
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line8a_nol_deduction, 100000);
});

Deno.test("nol_carryforward.compute: pre-2018 NOL with zero taxable income — no output", () => {
  const result = compute(
    [minimalItem({ nol_type: NolType.PRE2018, nol_amount: 30000, year: 2016 })],
    0,
  );
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 4. Mixed Pre-2018 and Post-2017 NOLs
// =============================================================================

Deno.test("nol_carryforward.compute: pre-2018 applied first, post-2017 uses remaining income", () => {
  // Income = 100000, pre-2018 NOL = 60000 → deducts 60000
  // Remaining income = 40000; post-2017 limit = 80% × 40000 = 32000
  // post-2017 NOL = 50000 → capped at 32000
  // Total = 60000 + 32000 = 92000
  const result = compute(
    [
      minimalItem({ nol_type: NolType.PRE2018, nol_amount: 60000, year: 2017 }),
      minimalItem({ nol_type: NolType.POST2017, nol_amount: 50000, year: 2019 }),
    ],
    100000,
  );
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line8a_nol_deduction, 92000);
});

Deno.test("nol_carryforward.compute: pre-2018 exhausts income, post-2017 gets zero deduction", () => {
  // pre-2018 NOL = 120000, income = 100000 → pre-2018 deducts 100000
  // Remaining income = 0; post-2017 gets nothing
  const result = compute(
    [
      minimalItem({ nol_type: NolType.PRE2018, nol_amount: 120000, year: 2016 }),
      minimalItem({ nol_type: NolType.POST2017, nol_amount: 50000, year: 2018 }),
    ],
    100000,
  );
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line8a_nol_deduction, 100000);
});

// =============================================================================
// 5. Aggregation — Multiple NOL Items of Same Type
// =============================================================================

Deno.test("nol_carryforward.compute: multiple post-2017 NOLs summed before 80% limit", () => {
  // Two post-2017 NOLs: 30000 + 40000 = 70000; income = 100000; 80% = 80000
  // 70000 < 80000 → deduction = 70000
  const result = compute(
    [
      minimalItem({ nol_type: NolType.POST2017, nol_amount: 30000, year: 2019 }),
      minimalItem({ nol_type: NolType.POST2017, nol_amount: 40000, year: 2020 }),
    ],
    100000,
  );
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line8a_nol_deduction, 70000);
});

Deno.test("nol_carryforward.compute: multiple pre-2018 NOLs summed before 100% limit", () => {
  // Two pre-2018 NOLs: 40000 + 80000 = 120000; income = 100000 → capped at 100000
  const result = compute(
    [
      minimalItem({ nol_type: NolType.PRE2018, nol_amount: 40000, year: 2015 }),
      minimalItem({ nol_type: NolType.PRE2018, nol_amount: 80000, year: 2016 }),
    ],
    100000,
  );
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line8a_nol_deduction, 100000);
});

Deno.test("nol_carryforward.compute: only one output to schedule1 regardless of item count", () => {
  const result = compute(
    [
      minimalItem({ nol_type: NolType.POST2017, nol_amount: 10000, year: 2020 }),
      minimalItem({ nol_type: NolType.PRE2018, nol_amount: 5000, year: 2017 }),
    ],
    200000,
  );
  const s1Outputs = result.outputs.filter((o: { nodeType: string }) => o.nodeType === "schedule1");
  assertEquals(s1Outputs.length, 1);
});

Deno.test("nol_carryforward.compute: routes nol_deduction to standard_deduction when deduction > 0", () => {
  // $10000 post-2017 NOL against $100000 income: 80% = 80000; NOL 10000 < 80000 → 10000
  const result = compute(
    [minimalItem({ nol_type: NolType.POST2017, nol_amount: 10000 })],
    100000,
  );
  const fields = fieldsOf(result.outputs, standard_deduction)!;
  assertEquals(fields.nol_deduction, 10000);
});

Deno.test("nol_carryforward.compute: standard_deduction receives same deduction as schedule1", () => {
  // $20000 post-2017 NOL against $24250 income: 80% = 19400; deduction = 19400
  const result = compute(
    [minimalItem({ nol_type: NolType.POST2017, nol_amount: 20000 })],
    24250,
  );
  const s1Fields = fieldsOf(result.outputs, schedule1)!;
  const sdFields = fieldsOf(result.outputs, standard_deduction)!;
  assertEquals(s1Fields.line8a_nol_deduction, 19400);
  assertEquals(sdFields.nol_deduction, 19400);
});

Deno.test("nol_carryforward.compute: no standard_deduction output when deduction is zero", () => {
  const result = compute(
    [minimalItem({ nol_type: NolType.POST2017, nol_amount: 0 })],
    100000,
  );
  const sdOutputs = result.outputs.filter((o: { nodeType: string }) => o.nodeType === "standard_deduction");
  assertEquals(sdOutputs.length, 0);
});

// =============================================================================
// 6. Zero / No Output Cases
// =============================================================================

Deno.test("nol_carryforward.compute: zero nol_amount — no output", () => {
  const result = compute(
    [minimalItem({ nol_type: NolType.POST2017, nol_amount: 0 })],
    100000,
  );
  assertEquals(result.outputs.length, 0);
});

Deno.test("nol_carryforward.compute: routes to schedule1 line8a_nol_deduction when deduction > 0", () => {
  // $5000 post-2017 NOL against $50000 income: 80% limit = 40000; 5000 < 40000 → 5000
  const result = compute(
    [minimalItem({ nol_type: NolType.POST2017, nol_amount: 5000 })],
    50000,
  );
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line8a_nol_deduction, 5000);
});

// =============================================================================
// 7. Hard Validation
// =============================================================================

Deno.test("nol_carryforward.compute: throws on negative nol_amount", () => {
  assertThrows(() => compute(
    [minimalItem({ nol_amount: -1000 })],
    50000,
  ), Error);
});

// =============================================================================
// 8. Edge Cases
// =============================================================================

Deno.test("nol_carryforward.compute: post-2017 NOL with very small income — 80% rounds correctly", () => {
  // income = 100; 80% = 80; NOL 200 → capped at 80
  const result = compute(
    [minimalItem({ nol_type: NolType.POST2017, nol_amount: 200 })],
    100,
  );
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line8a_nol_deduction, 80);
});

Deno.test("nol_carryforward.compute: post-2017 NOL with income exactly 1 — 80% = 0.8, floor to 0", () => {
  // income = 1; 80% = 0.8; NOL 10 → deduction = 0.8 (fractional dollars as-is per IRS math)
  const result = compute(
    [minimalItem({ nol_type: NolType.POST2017, nol_amount: 10 })],
    1,
  );
  const fields = fieldsOf(result.outputs, schedule1)!;
  // 80% of 1 = 0.8; min(10, 0.8) = 0.8
  assertEquals(fields.line8a_nol_deduction, 0.8);
});

Deno.test("nol_carryforward.compute: pre-2018 NOL does not apply 80% limit", () => {
  // Confirm pre-2018 uses 100%, not 80%: income = 100000; NOL = 90000 → all 90000 deductible
  const result = compute(
    [minimalItem({ nol_type: NolType.PRE2018, nol_amount: 90000, year: 2017 })],
    100000,
  );
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line8a_nol_deduction, 90000);
});

// =============================================================================
// 9. Smoke Test
// =============================================================================

Deno.test("nol_carryforward.compute: smoke test — mixed NOLs with various limits", () => {
  // Current taxable income: 150000
  // Pre-2018 NOLs: 2016 = 20000, 2017 = 30000 → total pre2018 = 50000
  //   pre2018_deduction = min(50000, 150000) = 50000
  //   remaining income = 150000 - 50000 = 100000
  // Post-2017 NOLs: 2018 = 40000, 2020 = 60000 → total post2017 = 100000
  //   post2017_limit = 80% × 100000 = 80000
  //   post2017_deduction = min(100000, 80000) = 80000
  // Total = 50000 + 80000 = 130000
  const result = compute(
    [
      minimalItem({ nol_type: NolType.PRE2018, nol_amount: 20000, year: 2016 }),
      minimalItem({ nol_type: NolType.PRE2018, nol_amount: 30000, year: 2017 }),
      minimalItem({ nol_type: NolType.POST2017, nol_amount: 40000, year: 2018 }),
      minimalItem({ nol_type: NolType.POST2017, nol_amount: 60000, year: 2020 }),
    ],
    150000,
  );
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line8a_nol_deduction, 130000);
  const s1Outputs = result.outputs.filter((o: { nodeType: string }) => o.nodeType === "schedule1");
  assertEquals(s1Outputs.length, 1);
});

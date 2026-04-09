import { assertEquals } from "@std/assert";
import { f8814 } from "./index.ts";

function compute(items: Parameters<typeof f8814.compute>[1]["f8814s"]) {
  return f8814.compute({ taxYear: 2025, formType: "f1040" }, { f8814s: items });
}

function f1040Outputs(result: ReturnType<typeof compute>) {
  return result.outputs.filter((o) => o.nodeType === "f1040");
}

function sumField(result: ReturnType<typeof compute>, field: string): number {
  return result.outputs
    .filter((o) => o.nodeType === "f1040")
    .reduce((sum, o) => sum + ((o.fields as Record<string, number>)[field] ?? 0), 0);
}

// =============================================================================
// 1. Schema Validation
// =============================================================================

Deno.test("f8814: empty array is valid and produces no outputs", () => {
  const result = compute([]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8814: negative interest_income rejected", () => {
  const parsed = f8814.inputSchema.safeParse({ f8814s: [{ interest_income: -1 }] });
  assertEquals(parsed.success, false);
});

Deno.test("f8814: negative dividend_income rejected", () => {
  const parsed = f8814.inputSchema.safeParse({ f8814s: [{ dividend_income: -50 }] });
  assertEquals(parsed.success, false);
});

// =============================================================================
// 2. Below-threshold: no income included ($1,300 threshold)
// =============================================================================

Deno.test("f8814: child income exactly $1,300 → no output (threshold not exceeded)", () => {
  const result = compute([{ interest_income: 1_300 }]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8814: child income below $1,300 → no output", () => {
  const result = compute([{ interest_income: 500, dividend_income: 400 }]);
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 3. Above threshold: income flows to parent's return
// =============================================================================

Deno.test("f8814: interest above $1,300 routes to f1040 line2b", () => {
  // $2,000 interest → $2,000 flows to parent (above threshold, full amount per §8814 rules)
  const result = compute([{ interest_income: 2_000 }]);
  const interest = sumField(result, "line2b_taxable_interest");
  assertEquals(interest, 2_000);
});

Deno.test("f8814: dividends above threshold route to f1040 line3b", () => {
  const result = compute([{ dividend_income: 2_000 }]);
  const divs = sumField(result, "line3b_ordinary_dividends");
  assertEquals(divs, 2_000);
});

Deno.test("f8814: $0 interest with high dividends — interest not included", () => {
  const result = compute([{ dividend_income: 3_000 }]);
  const interest = sumField(result, "line2b_taxable_interest");
  assertEquals(interest, 0);
});

// =============================================================================
// 4. Multiple children
// =============================================================================

Deno.test("f8814: two children with income each produce separate outputs", () => {
  const result = compute([
    { interest_income: 2_000 },
    { dividend_income: 1_500 },
  ]);
  assertEquals(f1040Outputs(result).length, 2);
});

Deno.test("f8814: one child above threshold + one below — only one contributes", () => {
  const result = compute([
    { interest_income: 2_000 },  // above threshold
    { interest_income: 500 },    // below threshold
  ]);
  assertEquals(f1040Outputs(result).length, 1);
});

// =============================================================================
// 5. Alaska PFD
// =============================================================================

Deno.test("f8814: alaska_pfd counted toward total income", () => {
  // $1,000 interest + $500 Alaska PFD = $1,500 total → above $1,300 threshold
  const result = compute([{ interest_income: 1_000, alaska_pfd: 500 }]);
  // Interest is included (total > threshold)
  const interest = sumField(result, "line2b_taxable_interest");
  assertEquals(interest, 1_000);
});

import { assertEquals } from "@std/assert";
import { rrb1099r } from "./index.ts";

function compute(items: Parameters<typeof rrb1099r.compute>[0]["rrb1099rs"]) {
  return rrb1099r.compute({ taxYear: 2025 }, { rrb1099rs: items });
}

function f1040Fields(result: ReturnType<typeof compute>) {
  return (result.outputs.find((o) => o.nodeType === "f1040")?.fields ?? {}) as Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// 1. SSEB (Tier 1 SS-equivalent) → f1040 line 6a
// ---------------------------------------------------------------------------

Deno.test("rrb1099r: SSEB gross routes to f1040 line6a_ss_gross", () => {
  const result = compute([{ payer_name: "RRB", box3_sseb_gross: 12000 }]);
  assertEquals(f1040Fields(result).line6a_ss_gross, 12000);
});

Deno.test("rrb1099r: SSEB net computed from box3 minus box4", () => {
  const result = compute([{
    payer_name: "RRB",
    box3_sseb_gross: 12000,
    box4_sseb_repaid: 2000,
  }]);
  assertEquals(f1040Fields(result).line6a_ss_gross, 10000);
});

Deno.test("rrb1099r: box5_sseb_net used directly when provided", () => {
  const result = compute([{
    payer_name: "RRB",
    box3_sseb_gross: 12000,
    box4_sseb_repaid: 2000,
    box5_sseb_net: 9500,
  }]);
  // box5_sseb_net takes precedence
  assertEquals(f1040Fields(result).line6a_ss_gross, 9500);
});

// ---------------------------------------------------------------------------
// 2. Tier 2 pension → f1040 lines 5a/5b
// ---------------------------------------------------------------------------

Deno.test("rrb1099r: Tier 2 gross routes to f1040 line5a_pension_gross", () => {
  const result = compute([{ payer_name: "RRB", box8_tier2_gross: 8000 }]);
  assertEquals(f1040Fields(result).line5a_pension_gross, 8000);
});

Deno.test("rrb1099r: Tier 2 fully taxable when no box9 or simplified method", () => {
  const result = compute([{ payer_name: "RRB", box8_tier2_gross: 8000 }]);
  assertEquals(f1040Fields(result).line5b_pension_taxable, 8000);
});

Deno.test("rrb1099r: box9_tier2_taxable used when provided", () => {
  const result = compute([{
    payer_name: "RRB",
    box8_tier2_gross: 8000,
    box9_tier2_taxable: 6000,
  }]);
  assertEquals(f1040Fields(result).line5b_pension_taxable, 6000);
});

Deno.test("rrb1099r: box2a_taxable_amount takes precedence over box9", () => {
  const result = compute([{
    payer_name: "RRB",
    box8_tier2_gross: 8000,
    box9_tier2_taxable: 6000,
    box2a_taxable_amount: 5000,
  }]);
  assertEquals(f1040Fields(result).line5b_pension_taxable, 5000);
});

// ---------------------------------------------------------------------------
// 3. Withholding → f1040 line 25b
// ---------------------------------------------------------------------------

Deno.test("rrb1099r: box7 SSEB withholding routes to f1040 line25b", () => {
  const result = compute([{
    payer_name: "RRB",
    box3_sseb_gross: 12000,
    box7_sseb_withheld: 1200,
  }]);
  assertEquals(f1040Fields(result).line25b_withheld_1099, 1200);
});

Deno.test("rrb1099r: box10 Tier 2 withholding routes to f1040 line25b", () => {
  const result = compute([{
    payer_name: "RRB",
    box8_tier2_gross: 8000,
    box10_tier2_withheld: 800,
  }]);
  assertEquals(f1040Fields(result).line25b_withheld_1099, 800);
});

Deno.test("rrb1099r: box7 + box10 withholding summed to f1040", () => {
  const result = compute([{
    payer_name: "RRB",
    box3_sseb_gross: 12000,
    box7_sseb_withheld: 1200,
    box8_tier2_gross: 8000,
    box10_tier2_withheld: 800,
  }]);
  assertEquals(f1040Fields(result).line25b_withheld_1099, 2000);
});

// ---------------------------------------------------------------------------
// 4. Multiple items
// ---------------------------------------------------------------------------

Deno.test("rrb1099r: multiple items — withholding summed across items", () => {
  const result = compute([
    { payer_name: "RRB A", box3_sseb_gross: 5000, box7_sseb_withheld: 500 },
    { payer_name: "RRB B", box3_sseb_gross: 7000, box7_sseb_withheld: 700 },
  ]);
  assertEquals(f1040Fields(result).line25b_withheld_1099, 1200);
});

// ---------------------------------------------------------------------------
// 5. No income — no f1040 output
// ---------------------------------------------------------------------------

Deno.test("rrb1099r: no income fields — no f1040 output", () => {
  const result = compute([{ payer_name: "RRB" }]);
  assertEquals(result.outputs.length, 0);
});

// ---------------------------------------------------------------------------
// 6. SSEB repaid cannot go below 0
// ---------------------------------------------------------------------------

Deno.test("rrb1099r: repayment exceeding gross floors SSEB at 0", () => {
  const result = compute([{
    payer_name: "RRB",
    box3_sseb_gross: 1000,
    box4_sseb_repaid: 5000,
  }]);
  // Net SSEB is 0, so no line6a
  assertEquals(f1040Fields(result).line6a_ss_gross, undefined);
});

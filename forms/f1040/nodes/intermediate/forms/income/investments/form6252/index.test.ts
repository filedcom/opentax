import { assertAlmostEquals, assertEquals, assertThrows } from "@std/assert";
import { form6252 } from "./index.ts";

function compute(input: Record<string, unknown>) {
  return form6252.compute({ taxYear: 2025, formType: "f1040" }, {
    f6252s: [input],
  });
}

function computeSales(items: Record<string, unknown>[]) {
  return form6252.compute({ taxYear: 2025, formType: "f1040" }, {
    f6252s: items,
  });
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// ─── Smoke Tests ─────────────────────────────────────────────────────────────

Deno.test("smoke — no payments returns no installment income", () => {
  const result = compute({
    selling_price: 100_000,
    gross_profit: 40_000,
    contract_price: 100_000,
  });
  const sd = findOutput(result, "schedule_d");
  assertEquals(sd, undefined);
});

Deno.test("smoke — zero payments produces no schedule_d output", () => {
  const result = compute({
    selling_price: 100_000,
    gross_profit: 40_000,
    contract_price: 100_000,
    payments_received: 0,
  });
  assertEquals(result.outputs.length, 0);
});

// ─── Gross Profit Ratio Calculation ──────────────────────────────────────────

Deno.test("GPR — basic calculation: $40k profit / $100k contract = 40%", () => {
  // $20k payments × 40% GPR = $8k installment income
  const result = compute({
    selling_price: 100_000,
    gross_profit: 40_000,
    contract_price: 100_000,
    payments_received: 20_000,
  });
  const sd = findOutput(result, "schedule_d");
  assertAlmostEquals(sd?.fields.line_11_form2439 as number, 8_000, 0.01);
});

Deno.test("GPR — 100% ratio: full payment received in first year", () => {
  const result = compute({
    selling_price: 50_000,
    gross_profit: 50_000,
    contract_price: 50_000,
    payments_received: 50_000,
  });
  const sd = findOutput(result, "schedule_d");
  assertEquals(sd?.fields.line_11_form2439, 50_000);
});

Deno.test("GPR — zero gross profit: no taxable income", () => {
  const result = compute({
    selling_price: 100_000,
    gross_profit: 0,
    contract_price: 100_000,
    payments_received: 30_000,
  });
  const sd = findOutput(result, "schedule_d");
  assertEquals(sd, undefined);
});

Deno.test("GPR — partial payment in year", () => {
  // Gross profit $60k / contract $100k = 60% GPR
  // Year 1 payment $10k × 60% = $6k installment income
  const result = compute({
    selling_price: 100_000,
    gross_profit: 60_000,
    contract_price: 100_000,
    payments_received: 10_000,
  });
  const sd = findOutput(result, "schedule_d");
  assertEquals(sd?.fields.line_11_form2439, 6_000);
});

// ─── Depreciation Recapture ───────────────────────────────────────────────────

Deno.test("depreciation recapture — retains Form 6252 line 12 source", () => {
  const result = compute({
    selling_price: 100_000,
    gross_profit: 40_000,
    contract_price: 100_000,
    payments_received: 0,
    depreciation_recapture: 15_000,
  });
  const f4797 = findOutput(result, "form4797");
  assertEquals(f4797?.fields.recapture_form6252, 15_000);
});

Deno.test("depreciation recapture + installment income — both outputs", () => {
  const result = compute({
    selling_price: 100_000,
    gross_profit: 40_000,
    contract_price: 100_000,
    payments_received: 20_000,
    depreciation_recapture: 10_000,
  });
  const f4797 = findOutput(result, "form4797");
  const sd = findOutput(result, "schedule_d");
  assertEquals(f4797?.fields.recapture_form6252, 10_000);
  assertAlmostEquals(sd?.fields.line_11_form2439 as number, 8_000, 0.01);
});

// ─── Capital Asset vs §1231 Routing ──────────────────────────────────────────

Deno.test("capital asset (default) — long-term routes to schedule_d line_11 with exact income", () => {
  // GPR = 50,000 / 100,000 = 50%; income = 50% × 20,000 = $10,000
  const result = compute({
    selling_price: 100_000,
    gross_profit: 50_000,
    contract_price: 100_000,
    payments_received: 20_000,
  });
  const sd = findOutput(result, "schedule_d");
  assertEquals(sd?.fields.line_11_form2439, 10_000);
});

Deno.test("capital asset short-term — routes to Schedule D line 4", () => {
  const result = compute({
    selling_price: 100_000,
    gross_profit: 50_000,
    contract_price: 100_000,
    payments_received: 20_000,
    is_long_term: false,
  });
  const sd = findOutput(result, "schedule_d");
  assertEquals(sd?.fields.line_4_other_st, 10_000);
  assertEquals(sd?.fields.gain_form6252_st, 10_000);
});

Deno.test("sale facts drive line 20 excess mortgage and line 24 income", () => {
  const result = compute({
    property_description: "Vacant land",
    date_acquired: "2020-01-01",
    date_sold: "2025-03-01",
    selling_price: 100_000,
    mortgage_assumed: 60_000,
    cost_basis: 40_000,
    payments_received: 10_000,
  });
  // Line 17 = 20,000, line 18 = 60,000, line 22 = 30,000.
  assertEquals(
    findOutput(result, "schedule_d")?.fields.line_11_form2439,
    30_000,
  );
  assertEquals(
    findOutput(result, "schedule_d")?.fields.gain_form6252_lt,
    30_000,
  );
});

Deno.test("sale facts reject stale aggregate gross profit", () => {
  assertThrows(
    () =>
      compute({
        property_description: "Vacant land",
        date_acquired: "2020-01-01",
        date_sold: "2025-03-01",
        selling_price: 100_000,
        cost_basis: 40_000,
        gross_profit: 50_000,
        payments_received: 10_000,
      }),
    Error,
    "gross_profit must match",
  );
});

Deno.test("multiple sales aggregate their destinations without losing source amounts", () => {
  const result = computeSales([
    {
      property_description: "Land A",
      date_acquired: "2020-01-01",
      date_sold: "2025-03-01",
      selling_price: 100_000,
      cost_basis: 40_000,
      payments_received: 10_000,
    },
    {
      property_description: "Land B",
      date_acquired: "2020-01-01",
      date_sold: "2025-03-01",
      selling_price: 50_000,
      cost_basis: 25_000,
      payments_received: 10_000,
    },
    {
      property_description: "Business land",
      date_acquired: "2020-01-01",
      date_sold: "2025-03-01",
      selling_price: 80_000,
      cost_basis: 40_000,
      payments_received: 20_000,
      is_capital_asset: false,
    },
  ]);
  const sd = findOutput(result, "schedule_d");
  const business = findOutput(result, "form4797");
  assertEquals(sd?.fields.gain_form6252_lt, 11_000);
  assertEquals(sd?.fields.line_11_form2439, 11_000);
  assertEquals(business?.fields.gain_form6252, 10_000);
  assertEquals(business?.fields.section_1231_gain, 10_000);
});

Deno.test("section 1231 property — routes to form4797 section_1231_gain", () => {
  const result = compute({
    selling_price: 100_000,
    gross_profit: 50_000,
    contract_price: 100_000,
    payments_received: 20_000,
    is_capital_asset: false,
  });
  const f4797 = findOutput(result, "form4797");
  assertEquals(f4797?.fields.section_1231_gain, 10_000);
});

// ─── Edge Cases ───────────────────────────────────────────────────────────────

Deno.test("negative gross profit cannot use the installment method", () => {
  assertThrows(
    () =>
      compute({
        selling_price: 100_000,
        gross_profit: -10_000,
        contract_price: 100_000,
        payments_received: 20_000,
      }),
    Error,
    "sale at a loss",
  );
});

Deno.test("payments cannot be allocated without a contract price", () => {
  assertThrows(
    () =>
      compute({
        gross_profit: 10_000,
        payments_received: 2_000,
      }),
    Error,
    "positive contract price",
  );
});

import { assertEquals } from "@std/assert";
import { form_8829 } from "./index.ts";

function compute(input: Record<string, unknown>) {
  return form_8829.compute({ taxYear: 2025 }, input);
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// ─── Input validation ─────────────────────────────────────────────────────────

Deno.test("no deduction when total_area is zero", () => {
  const result = compute({ total_area: 0, business_area: 100 });
  assertEquals(result.outputs.length, 0);
});

Deno.test("no deduction when total_area is absent", () => {
  const result = compute({ business_area: 100, insurance: 1200 });
  assertEquals(result.outputs.length, 0);
});

Deno.test("no deduction when business_area is absent", () => {
  const result = compute({ total_area: 2000, insurance: 1200 });
  assertEquals(result.outputs.length, 0);
});

Deno.test("no deduction when all inputs absent", () => {
  const result = compute({});
  assertEquals(result.outputs.length, 0);
});

// ─── Business percentage calculation ─────────────────────────────────────────

Deno.test("business percentage 20%: utilities $5000 → deduction $1000", () => {
  const result = compute({
    total_area: 1000,
    business_area: 200,
    utilities: 5000,
    gross_income_limit: 50000,
  });
  const out = findOutput(result, "schedule_c");
  assertEquals(out?.fields.line_30_home_office, 1000);
});

Deno.test("business percentage capped at 100% when business_area >= total_area", () => {
  const result = compute({
    total_area: 100,
    business_area: 150, // exceeds total
    utilities: 2000,
    gross_income_limit: 50000,
  });
  const out = findOutput(result, "schedule_c");
  // capped at 100% → deduction = 2000
  assertEquals(out?.fields.line_30_home_office, 2000);
});

Deno.test("business percentage 50%: multiple indirect expenses", () => {
  const result = compute({
    total_area: 2000,
    business_area: 1000,       // 50%
    insurance: 2000,           // → 1000
    utilities: 4000,           // → 2000
    repairs_maintenance: 1000, // → 500
    gross_income_limit: 50000,
  });
  const out = findOutput(result, "schedule_c");
  // 50% of (2000 + 4000 + 1000) = 50% of 7000 = 3500
  assertEquals(out?.fields.line_30_home_office, 3500);
});

// ─── Mortgage interest routing ────────────────────────────────────────────────

Deno.test("mortgage_interest used directly without applying business_pct", () => {
  const result = compute({
    total_area: 1000,
    business_area: 200,       // 20%
    mortgage_interest: 3000,  // already business-allocated by f1098; used as-is
    gross_income_limit: 50000,
  });
  const out = findOutput(result, "schedule_c");
  // mortgage_interest = 3000 (not multiplied by 20%)
  assertEquals(out?.fields.line_30_home_office, 3000);
});

Deno.test("mortgage_interest plus indirect expenses combined", () => {
  const result = compute({
    total_area: 1000,
    business_area: 500,      // 50%
    mortgage_interest: 1000,
    utilities: 2000,          // 50% → 1000
    gross_income_limit: 50000,
  });
  const out = findOutput(result, "schedule_c");
  // 1000 + 1000 = 2000
  assertEquals(out?.fields.line_30_home_office, 2000);
});

// ─── Depreciation ─────────────────────────────────────────────────────────────

Deno.test("depreciation for January first use: 2.461%", () => {
  const result = compute({
    total_area: 1000,
    business_area: 1000,     // 100%
    home_fmv_or_basis: 200000,
    first_business_use_month: 1,
    gross_income_limit: 50000,
  });
  const out = findOutput(result, "schedule_c");
  // 200000 × 100% × 2.461% = 4922
  assertEquals(out?.fields.line_30_home_office, 4922);
});

Deno.test("depreciation for July first use: 1.177%", () => {
  const result = compute({
    total_area: 1000,
    business_area: 1000,
    home_fmv_or_basis: 200000,
    first_business_use_month: 7,
    gross_income_limit: 50000,
  });
  const out = findOutput(result, "schedule_c");
  // 200000 × 1.177% = 2354
  assertEquals(out?.fields.line_30_home_office, 2354);
});

Deno.test("depreciation for December first use: 0.107%", () => {
  const result = compute({
    total_area: 1000,
    business_area: 1000,
    home_fmv_or_basis: 200000,
    first_business_use_month: 12,
    gross_income_limit: 50000,
  });
  const out = findOutput(result, "schedule_c");
  // 200000 × 0.107% = 214
  assertEquals(out?.fields.line_30_home_office, 214);
});

Deno.test("depreciation for prior year use (month=0): 2.564%", () => {
  // first_business_use_month = 0 signals prior-year use
  const result = compute({
    total_area: 1000,
    business_area: 1000,
    home_fmv_or_basis: 200000,
    first_business_use_month: 0,
    gross_income_limit: 50000,
  });
  const out = findOutput(result, "schedule_c");
  // 200000 × 2.564% = 5128
  assertEquals(out?.fields.line_30_home_office, 5128);
});

Deno.test("no depreciation when home_fmv_or_basis absent", () => {
  const result = compute({
    total_area: 1000,
    business_area: 1000,
    // no home_fmv_or_basis and no expenses
    gross_income_limit: 50000,
  });
  assertEquals(result.outputs.length, 0);
});

Deno.test("depreciation scales with business_pct", () => {
  const result = compute({
    total_area: 1000,
    business_area: 500,      // 50%
    home_fmv_or_basis: 200000,
    first_business_use_month: 1, // 2.461%
    gross_income_limit: 50000,
  });
  const out = findOutput(result, "schedule_c");
  // business_basis = 200000 × 50% = 100000; depreciation = 100000 × 2.461% = 2461
  assertEquals(out?.fields.line_30_home_office, 2461);
});

// ─── Gross income limitation ──────────────────────────────────────────────────

Deno.test("gross_income_limit = 0 → no deduction", () => {
  const result = compute({
    total_area: 1000,
    business_area: 1000,
    utilities: 5000,
    gross_income_limit: 0,
  });
  assertEquals(result.outputs.length, 0);
});

Deno.test("expenses exactly equal gross_income_limit → full deduction", () => {
  const result = compute({
    total_area: 1000,
    business_area: 1000,
    utilities: 3000,
    gross_income_limit: 3000,
  });
  const out = findOutput(result, "schedule_c");
  assertEquals(out?.fields.line_30_home_office, 3000);
});

Deno.test("expenses exceed gross_income_limit → clipped to limit", () => {
  const result = compute({
    total_area: 1000,
    business_area: 1000,
    utilities: 5000,
    gross_income_limit: 2000,
  });
  const out = findOutput(result, "schedule_c");
  assertEquals(out?.fields.line_30_home_office, 2000);
});

Deno.test("depreciation clipped by remaining income limit after operating expenses", () => {
  const result = compute({
    total_area: 1000,
    business_area: 1000,
    utilities: 4000,              // operating = 4000
    home_fmv_or_basis: 200000,
    first_business_use_month: 1,  // depreciation = 200000 × 2.461% = 4922
    gross_income_limit: 5000,
    // allowable operating = min(4000, 5000) = 4000
    // remaining limit = 5000 - 4000 = 1000
    // allowable depreciation = min(4922, 1000) = 1000
    // total = 5000
  });
  const out = findOutput(result, "schedule_c");
  assertEquals(out?.fields.line_30_home_office, 5000);
});

// ─── Prior year carryovers ────────────────────────────────────────────────────

Deno.test("prior year operating carryover increases deduction pool", () => {
  const result = compute({
    total_area: 1000,
    business_area: 1000,
    utilities: 1000,
    prior_year_operating_carryover: 500,
    gross_income_limit: 2000,
  });
  const out = findOutput(result, "schedule_c");
  // operating pool = 1000 + 500 = 1500; income limit 2000 → 1500 allowed
  assertEquals(out?.fields.line_30_home_office, 1500);
});

Deno.test("prior year depreciation carryover increases depreciation pool", () => {
  const result = compute({
    total_area: 1000,
    business_area: 1000,
    home_fmv_or_basis: 0,            // no current-year depreciation
    first_business_use_month: 1,
    prior_year_depreciation_carryover: 2000,
    gross_income_limit: 3000,
  });
  const out = findOutput(result, "schedule_c");
  // operating = 0; remaining limit = 3000; depreciation pool = 2000; allowed = 2000
  assertEquals(out?.fields.line_30_home_office, 2000);
});

Deno.test("prior year operating carryover clipped by income limit", () => {
  const result = compute({
    total_area: 1000,
    business_area: 1000,
    utilities: 1000,
    prior_year_operating_carryover: 5000,
    gross_income_limit: 2000,
  });
  const out = findOutput(result, "schedule_c");
  // pool = 6000; capped at income limit 2000
  assertEquals(out?.fields.line_30_home_office, 2000);
});

// ─── Output routing ───────────────────────────────────────────────────────────

Deno.test("routes to schedule_c when deduction > 0", () => {
  const result = compute({
    total_area: 1000,
    business_area: 500,
    utilities: 2000,
    gross_income_limit: 10000,
  });
  const out = findOutput(result, "schedule_c");
  assertEquals(out !== undefined, true);
  assertEquals(typeof out?.fields.line_30_home_office, "number");
});

Deno.test("no output when computed deduction is zero", () => {
  const result = compute({
    total_area: 1000,
    business_area: 500,
    utilities: 0,
    gross_income_limit: 10000,
  });
  assertEquals(result.outputs.length, 0);
});

Deno.test("at most one output object per run", () => {
  const result = compute({
    total_area: 1000,
    business_area: 500,
    utilities: 2000,
    mortgage_interest: 1000,
    home_fmv_or_basis: 100000,
    first_business_use_month: 6,
    gross_income_limit: 50000,
  });
  const schedCOutputs = result.outputs.filter((o) => o.nodeType === "schedule_c");
  assertEquals(schedCOutputs.length, 1);
});

// ─── All depreciation rates smoke tests ──────────────────────────────────────

Deno.test("depreciation rate table covers all 12 months correctly", () => {
  const RATES = [2.461, 2.247, 2.033, 1.819, 1.605, 1.391, 1.177, 0.963, 0.749, 0.535, 0.321, 0.107];
  const basis = 100_000;
  for (let month = 1; month <= 12; month++) {
    const result = compute({
      total_area: 1000,
      business_area: 1000,
      home_fmv_or_basis: basis,
      first_business_use_month: month,
      gross_income_limit: 50000,
    });
    const out = findOutput(result, "schedule_c");
    const expected = Math.round(basis * RATES[month - 1] / 100);
    assertEquals(
      out?.fields.line_30_home_office,
      expected,
      `Month ${month}: expected ${expected}`,
    );
  }
});

// ─── Smoke test — comprehensive scenario ─────────────────────────────────────

Deno.test("smoke: comprehensive scenario with all major fields", () => {
  const result = compute({
    // Area: 300 sq ft of 1500 sq ft home → 20%
    total_area: 1500,
    business_area: 300,
    // Income limit (tentative profit before home office)
    gross_income_limit: 10000,
    // Indirect expenses (× 20%)
    insurance: 2000,          // → 400
    utilities: 3000,          // → 600
    repairs_maintenance: 500, // → 100
    other_expenses: 1000,     // → 200
    // Mortgage interest (from f1098, already business-allocated)
    mortgage_interest: 800,
    // Depreciation: $300,000 basis, 20% biz pct, June first use (1.391%)
    home_fmv_or_basis: 300000,
    first_business_use_month: 6, // 1.391%
    // Prior year carryovers
    prior_year_operating_carryover: 200,
    prior_year_depreciation_carryover: 100,
  });

  // operating: 400 + 600 + 100 + 200 + 800 = 2100; carryover 200 → pool 2300
  // income limit = 10000; allowable operating = 2300
  // depreciation: 300000 × 20% × 1.391% = 60000 × 0.01391 = 834.6 → Math.round = 835
  // depreciation pool = 835 + 100 = 935
  // remaining limit = 10000 - 2300 = 7700; allowable depreciation = 935
  // total = 2300 + 935 = 3235

  const out = findOutput(result, "schedule_c");
  assertEquals(out !== undefined, true);
  assertEquals(out?.fields.line_30_home_office, 3235);
  assertEquals(result.outputs.length, 1);
});

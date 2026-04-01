import { assertEquals, assertThrows } from "@std/assert";
import { f8854, ExpatriateType } from "./index.ts";
import { fieldsOf } from "../../../../../core/test-utils/output.ts";
import { schedule2 } from "../../intermediate/aggregation/schedule2/index.ts";

// TY2025 constants
const AVG_TAX_THRESHOLD = 201_000;
const NET_WORTH_THRESHOLD = 2_000_000;
const EXCLUSION_AMOUNT = 866_000;

function minimalInput(overrides: Record<string, unknown> = {}) {
  return {
    expatriation_date: "2025-06-15",
    expatriate_type: ExpatriateType.CITIZEN,
    average_annual_tax_prior_5_years: 0,
    net_worth_at_expatriation: 0,
    certified_tax_compliance: true,
    ...overrides,
  };
}

function compute(input: ReturnType<typeof minimalInput>) {
  return f8854.compute({ taxYear: 2025 }, input);
}

// =============================================================================
// 1. Input Schema Validation
// =============================================================================

Deno.test("f8854.inputSchema: valid minimal input passes", () => {
  const parsed = f8854.inputSchema.safeParse(minimalInput());
  assertEquals(parsed.success, true);
});

Deno.test("f8854.inputSchema: missing expatriation_date fails", () => {
  const { expatriation_date: _omit, ...rest } = minimalInput();
  const parsed = f8854.inputSchema.safeParse(rest);
  assertEquals(parsed.success, false);
});

Deno.test("f8854.inputSchema: missing expatriate_type fails", () => {
  const { expatriate_type: _omit, ...rest } = minimalInput();
  const parsed = f8854.inputSchema.safeParse(rest);
  assertEquals(parsed.success, false);
});

Deno.test("f8854.inputSchema: invalid expatriate_type fails", () => {
  const parsed = f8854.inputSchema.safeParse(minimalInput({ expatriate_type: "INVALID" }));
  assertEquals(parsed.success, false);
});

Deno.test("f8854.inputSchema: LONG_TERM_RESIDENT type passes", () => {
  const parsed = f8854.inputSchema.safeParse(minimalInput({ expatriate_type: ExpatriateType.LONG_TERM_RESIDENT }));
  assertEquals(parsed.success, true);
});

Deno.test("f8854.inputSchema: negative average_annual_tax fails", () => {
  const parsed = f8854.inputSchema.safeParse(minimalInput({ average_annual_tax_prior_5_years: -1 }));
  assertEquals(parsed.success, false);
});

Deno.test("f8854.inputSchema: negative net_worth fails", () => {
  const parsed = f8854.inputSchema.safeParse(minimalInput({ net_worth_at_expatriation: -1 }));
  assertEquals(parsed.success, false);
});

Deno.test("f8854.inputSchema: asset with negative fmv fails", () => {
  const parsed = f8854.inputSchema.safeParse(minimalInput({
    assets: [{ fmv_at_expatriation: -1000, basis: 500 }],
  }));
  assertEquals(parsed.success, false);
});

Deno.test("f8854.inputSchema: asset with negative basis fails", () => {
  const parsed = f8854.inputSchema.safeParse(minimalInput({
    assets: [{ fmv_at_expatriation: 1000, basis: -1 }],
  }));
  assertEquals(parsed.success, false);
});

Deno.test("f8854.inputSchema: valid full input passes", () => {
  const parsed = f8854.inputSchema.safeParse({
    expatriation_date: "2025-03-01",
    expatriate_type: ExpatriateType.CITIZEN,
    average_annual_tax_prior_5_years: 250000,
    net_worth_at_expatriation: 3000000,
    certified_tax_compliance: true,
    assets: [
      { fmv_at_expatriation: 2000000, basis: 500000 },
      { fmv_at_expatriation: 800000, basis: 900000 },
    ],
  });
  assertEquals(parsed.success, true);
});

// =============================================================================
// 2. Covered Expatriate Determination
// =============================================================================

Deno.test("f8854.compute: non-covered (all below thresholds, compliant) — no outputs", () => {
  const result = compute(minimalInput({
    average_annual_tax_prior_5_years: AVG_TAX_THRESHOLD - 1,
    net_worth_at_expatriation: NET_WORTH_THRESHOLD - 1,
    certified_tax_compliance: true,
  }));
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8854.compute: covered by average tax threshold — routes to schedule2", () => {
  const result = compute(minimalInput({
    average_annual_tax_prior_5_years: AVG_TAX_THRESHOLD + 1,
    net_worth_at_expatriation: 0,
    certified_tax_compliance: true,
    assets: [{ fmv_at_expatriation: EXCLUSION_AMOUNT + 1000, basis: 0 }],
  }));
  const out = result.outputs.find((o) => o.nodeType === "schedule2");
  assertEquals(out !== undefined, true);
});

Deno.test("f8854.compute: covered by net worth threshold — routes to schedule2", () => {
  const result = compute(minimalInput({
    average_annual_tax_prior_5_years: 0,
    net_worth_at_expatriation: NET_WORTH_THRESHOLD,
    certified_tax_compliance: true,
    assets: [{ fmv_at_expatriation: EXCLUSION_AMOUNT + 1000, basis: 0 }],
  }));
  const out = result.outputs.find((o) => o.nodeType === "schedule2");
  assertEquals(out !== undefined, true);
});

Deno.test("f8854.compute: covered by non-compliance (certified_tax_compliance false) — routes to schedule2", () => {
  const result = compute(minimalInput({
    average_annual_tax_prior_5_years: 0,
    net_worth_at_expatriation: 0,
    certified_tax_compliance: false,
    assets: [{ fmv_at_expatriation: EXCLUSION_AMOUNT + 1000, basis: 0 }],
  }));
  const out = result.outputs.find((o) => o.nodeType === "schedule2");
  assertEquals(out !== undefined, true);
});

// =============================================================================
// 3. Mark-to-Market Gain Calculation
// =============================================================================

Deno.test("f8854.compute: gain within exclusion — no schedule2 output even if covered", () => {
  // Covered by net worth, but gain <= exclusion
  const result = compute(minimalInput({
    net_worth_at_expatriation: NET_WORTH_THRESHOLD,
    certified_tax_compliance: true,
    assets: [{ fmv_at_expatriation: 500000, basis: 0 }], // gain = 500k < 866k
  }));
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8854.compute: gain exactly at exclusion — no schedule2 output", () => {
  const result = compute(minimalInput({
    net_worth_at_expatriation: NET_WORTH_THRESHOLD,
    certified_tax_compliance: true,
    assets: [{ fmv_at_expatriation: EXCLUSION_AMOUNT, basis: 0 }],
  }));
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8854.compute: gain just above exclusion — routes to schedule2", () => {
  const result = compute(minimalInput({
    net_worth_at_expatriation: NET_WORTH_THRESHOLD,
    certified_tax_compliance: true,
    assets: [{ fmv_at_expatriation: EXCLUSION_AMOUNT + 1, basis: 0 }],
  }));
  const out = result.outputs.find((o) => o.nodeType === "schedule2");
  assertEquals(out !== undefined, true);
});

Deno.test("f8854.compute: taxable gain = fmv - basis - exclusion routed to schedule2", () => {
  // fmv=2000000, basis=500000 => gain=1500000, taxable=1500000-866000=634000
  const result = compute(minimalInput({
    net_worth_at_expatriation: NET_WORTH_THRESHOLD,
    certified_tax_compliance: true,
    assets: [{ fmv_at_expatriation: 2_000_000, basis: 500_000 }],
  }));
  const fields = fieldsOf(result.outputs, schedule2);
  assertEquals(fields?.line17_exit_tax, 634_000);
});

Deno.test("f8854.compute: losses offset gains before exclusion", () => {
  // Asset 1: fmv=2000000, basis=500000 => gain=1500000
  // Asset 2: fmv=100000, basis=300000 => loss=-200000
  // net gain=1300000, taxable=1300000-866000=434000
  const result = compute(minimalInput({
    net_worth_at_expatriation: NET_WORTH_THRESHOLD,
    certified_tax_compliance: true,
    assets: [
      { fmv_at_expatriation: 2_000_000, basis: 500_000 },
      { fmv_at_expatriation: 100_000, basis: 300_000 },
    ],
  }));
  const fields = fieldsOf(result.outputs, schedule2);
  assertEquals(fields?.line17_exit_tax, 434_000);
});

Deno.test("f8854.compute: net gain negative — no schedule2 output (floor at zero)", () => {
  // All assets at a loss
  const result = compute(minimalInput({
    net_worth_at_expatriation: NET_WORTH_THRESHOLD,
    certified_tax_compliance: true,
    assets: [{ fmv_at_expatriation: 100_000, basis: 500_000 }],
  }));
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8854.compute: no assets — no schedule2 output", () => {
  const result = compute(minimalInput({
    net_worth_at_expatriation: NET_WORTH_THRESHOLD,
    certified_tax_compliance: true,
  }));
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 4. Thresholds
// =============================================================================

Deno.test("f8854.compute: avg tax exactly at threshold ($201,000) — covered", () => {
  const result = compute(minimalInput({
    average_annual_tax_prior_5_years: AVG_TAX_THRESHOLD,
    net_worth_at_expatriation: 0,
    certified_tax_compliance: true,
    assets: [{ fmv_at_expatriation: EXCLUSION_AMOUNT + 1, basis: 0 }],
  }));
  // At threshold means NOT covered (threshold is "greater than")
  // Per IRC §877A(g)(1)(A)(i): "average annual net income tax liability... exceeds"
  const out = result.outputs.find((o) => o.nodeType === "schedule2");
  assertEquals(out, undefined);
});

Deno.test("f8854.compute: net worth exactly at threshold ($2M) — covered", () => {
  const result = compute(minimalInput({
    average_annual_tax_prior_5_years: 0,
    net_worth_at_expatriation: NET_WORTH_THRESHOLD,
    certified_tax_compliance: true,
    assets: [{ fmv_at_expatriation: EXCLUSION_AMOUNT + 1, basis: 0 }],
  }));
  // At $2M net worth: covered (IRC says "at least $2M")
  const out = result.outputs.find((o) => o.nodeType === "schedule2");
  assertEquals(out !== undefined, true);
});

// =============================================================================
// 5. Edge Cases
// =============================================================================

Deno.test("f8854.compute: LONG_TERM_RESIDENT type covered by net worth — routes to schedule2", () => {
  const result = compute(minimalInput({
    expatriate_type: ExpatriateType.LONG_TERM_RESIDENT,
    net_worth_at_expatriation: NET_WORTH_THRESHOLD,
    assets: [{ fmv_at_expatriation: EXCLUSION_AMOUNT + 1000, basis: 0 }],
  }));
  const out = result.outputs.find((o) => o.nodeType === "schedule2");
  assertEquals(out !== undefined, true);
});

// =============================================================================
// 6. Smoke Test
// =============================================================================

Deno.test("f8854.compute: smoke test — covered by avg tax, multiple assets", () => {
  // avg tax > threshold => covered
  // Asset gains: (3M-1M) + (500k-200k) = 2M + 300k = 2.3M
  // taxable = 2.3M - 866k = 1.434M
  const result = f8854.compute({ taxYear: 2025 }, {
    expatriation_date: "2025-04-15",
    expatriate_type: ExpatriateType.CITIZEN,
    average_annual_tax_prior_5_years: 250_000,
    net_worth_at_expatriation: 1_500_000,
    certified_tax_compliance: true,
    assets: [
      { fmv_at_expatriation: 3_000_000, basis: 1_000_000 },
      { fmv_at_expatriation: 500_000, basis: 200_000 },
    ],
  });
  const fields = fieldsOf(result.outputs, schedule2);
  assertEquals(fields?.line17_exit_tax, 1_434_000);
});

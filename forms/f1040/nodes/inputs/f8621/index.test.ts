import { assertEquals, assertThrows } from "@std/assert";
import { f8621, PficRegime } from "./index.ts";
import { fieldsOf } from "../../../../../core/test-utils/output.ts";
import { schedule1 } from "../../outputs/schedule1/index.ts";
import { schedule2 } from "../../intermediate/aggregation/schedule2/index.ts";

function minimalItem(overrides: Record<string, unknown> = {}) {
  return {
    company_name: "Offshore Fund Ltd",
    country_of_incorporation: "Ireland",
    regime: PficRegime.EXCESS_DISTRIBUTION,
    shares_owned: 100,
    fmv_at_year_end: 10000,
    ...overrides,
  };
}

function compute(items: ReturnType<typeof minimalItem>[]) {
  return f8621.compute({ taxYear: 2025 }, { f8621s: items });
}

// =============================================================================
// 1. Input Schema Validation
// =============================================================================

Deno.test("f8621.inputSchema: valid minimal item passes", () => {
  const parsed = f8621.inputSchema.safeParse({ f8621s: [minimalItem()] });
  assertEquals(parsed.success, true);
});

Deno.test("f8621.inputSchema: empty array fails (min 1)", () => {
  const parsed = f8621.inputSchema.safeParse({ f8621s: [] });
  assertEquals(parsed.success, false);
});

Deno.test("f8621.inputSchema: invalid regime fails", () => {
  const parsed = f8621.inputSchema.safeParse({
    f8621s: [minimalItem({ regime: "UNKNOWN_REGIME" })],
  });
  assertEquals(parsed.success, false);
});

Deno.test("f8621.inputSchema: all valid regimes pass", () => {
  for (const regime of Object.values(PficRegime)) {
    const parsed = f8621.inputSchema.safeParse({ f8621s: [minimalItem({ regime })] });
    assertEquals(parsed.success, true);
  }
});

Deno.test("f8621.inputSchema: negative shares_owned fails", () => {
  const parsed = f8621.inputSchema.safeParse({
    f8621s: [minimalItem({ shares_owned: -10 })],
  });
  assertEquals(parsed.success, false);
});

Deno.test("f8621.inputSchema: negative fmv_at_year_end fails", () => {
  const parsed = f8621.inputSchema.safeParse({
    f8621s: [minimalItem({ fmv_at_year_end: -5000 })],
  });
  assertEquals(parsed.success, false);
});

Deno.test("f8621.inputSchema: negative excess_distribution_amount fails", () => {
  const parsed = f8621.inputSchema.safeParse({
    f8621s: [minimalItem({ excess_distribution_amount: -100 })],
  });
  assertEquals(parsed.success, false);
});

Deno.test("f8621.inputSchema: negative qef_ordinary_income fails", () => {
  const parsed = f8621.inputSchema.safeParse({
    f8621s: [minimalItem({ regime: PficRegime.QEF, qef_ordinary_income: -200 })],
  });
  assertEquals(parsed.success, false);
});

Deno.test("f8621.inputSchema: negative qef_capital_gain fails", () => {
  const parsed = f8621.inputSchema.safeParse({
    f8621s: [minimalItem({ regime: PficRegime.QEF, qef_capital_gain: -500 })],
  });
  assertEquals(parsed.success, false);
});

Deno.test("f8621.inputSchema: company_ein_or_ref optional", () => {
  const parsed = f8621.inputSchema.safeParse({
    f8621s: [minimalItem({ company_ein_or_ref: "98-1234567" })],
  });
  assertEquals(parsed.success, true);
});

Deno.test("f8621.inputSchema: missing company_name fails", () => {
  const item = minimalItem();
  delete (item as Record<string, unknown>).company_name;
  const parsed = f8621.inputSchema.safeParse({ f8621s: [item] });
  assertEquals(parsed.success, false);
});

Deno.test("f8621.inputSchema: missing country_of_incorporation fails", () => {
  const item = minimalItem();
  delete (item as Record<string, unknown>).country_of_incorporation;
  const parsed = f8621.inputSchema.safeParse({ f8621s: [item] });
  assertEquals(parsed.success, false);
});

// =============================================================================
// 2. Excess Distribution Regime Routing
// =============================================================================

Deno.test("f8621.compute: excess_distribution regime, excess_distribution_amount > 0 — routes tax to schedule2", () => {
  const result = compute([minimalItem({
    regime: PficRegime.EXCESS_DISTRIBUTION,
    excess_distribution_amount: 10000,
  })]);
  const fields = fieldsOf(result.outputs, schedule2)!;
  // 10000 × 0.37 = 3700
  assertEquals(fields.line17z_other_additional_taxes, 3700);
});

Deno.test("f8621.compute: excess_distribution regime, excess_distribution_amount = 0 — no output", () => {
  const result = compute([minimalItem({
    regime: PficRegime.EXCESS_DISTRIBUTION,
    excess_distribution_amount: 0,
  })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8621.compute: excess_distribution regime, no excess amount — no output", () => {
  const result = compute([minimalItem({ regime: PficRegime.EXCESS_DISTRIBUTION })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8621.compute: excess_distribution tax = 37% of excess amount", () => {
  const result = compute([minimalItem({
    regime: PficRegime.EXCESS_DISTRIBUTION,
    excess_distribution_amount: 10000,
  })]);
  const fields = fieldsOf(result.outputs, schedule2)!;
  // 10000 × 0.37 = 3700
  assertEquals(fields.line17z_other_additional_taxes, 3700);
});

// =============================================================================
// 3. MTM Regime Routing
// =============================================================================

Deno.test("f8621.compute: MTM regime, mtm_gain_loss > 0 — routes gain to schedule1 line8z_other", () => {
  const result = compute([minimalItem({
    regime: PficRegime.MTM,
    mtm_gain_loss: 5000,
  })]);
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line8z_other, 5000);
});

Deno.test("f8621.compute: MTM regime, mtm_gain_loss < 0 — routes loss (negative) to schedule1", () => {
  const result = compute([minimalItem({
    regime: PficRegime.MTM,
    mtm_gain_loss: -2000,
  })]);
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line8z_other, -2000);
});

Deno.test("f8621.compute: MTM regime, mtm_gain_loss = 0 — no output", () => {
  const result = compute([minimalItem({
    regime: PficRegime.MTM,
    mtm_gain_loss: 0,
  })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8621.compute: MTM regime, no mtm_gain_loss provided — no output", () => {
  const result = compute([minimalItem({ regime: PficRegime.MTM })]);
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 4. QEF Regime Routing
// =============================================================================

Deno.test("f8621.compute: QEF regime, qef_ordinary_income > 0 — routes to schedule1 line8z_other", () => {
  const result = compute([minimalItem({
    regime: PficRegime.QEF,
    qef_ordinary_income: 8000,
  })]);
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line8z_other, 8000);
});

Deno.test("f8621.compute: QEF regime, qef_capital_gain > 0 — routes to schedule1", () => {
  const result = compute([minimalItem({
    regime: PficRegime.QEF,
    qef_capital_gain: 3000,
  })]);
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line8z_other, 3000);
});

Deno.test("f8621.compute: QEF regime, both ordinary income and capital gain — summed to schedule1", () => {
  const result = compute([minimalItem({
    regime: PficRegime.QEF,
    qef_ordinary_income: 5000,
    qef_capital_gain: 2000,
  })]);
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line8z_other, 7000);
});

Deno.test("f8621.compute: QEF regime, both zero — no output", () => {
  const result = compute([minimalItem({
    regime: PficRegime.QEF,
    qef_ordinary_income: 0,
    qef_capital_gain: 0,
  })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8621.compute: QEF regime, no QEF fields provided — no output", () => {
  const result = compute([minimalItem({ regime: PficRegime.QEF })]);
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 5. Aggregation — multiple PFIC items
// =============================================================================

Deno.test("f8621.compute: multiple QEF items — incomes summed into one schedule1 output", () => {
  const result = compute([
    minimalItem({ regime: PficRegime.QEF, qef_ordinary_income: 5000, company_name: "Fund A" }),
    minimalItem({ regime: PficRegime.QEF, qef_ordinary_income: 3000, company_name: "Fund B" }),
  ]);
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line8z_other, 8000);
  assertEquals(result.outputs.filter((o) => o.nodeType === "schedule1").length, 1);
});

Deno.test("f8621.compute: multiple excess distribution items — taxes summed into one schedule2 output", () => {
  const result = compute([
    minimalItem({ regime: PficRegime.EXCESS_DISTRIBUTION, excess_distribution_amount: 10000, company_name: "PFIC A" }),
    minimalItem({ regime: PficRegime.EXCESS_DISTRIBUTION, excess_distribution_amount: 5000, company_name: "PFIC B" }),
  ]);
  const fields = fieldsOf(result.outputs, schedule2)!;
  // (10000 + 5000) × 0.37 = 5550
  assertEquals(fields.line17z_other_additional_taxes, 5550);
  assertEquals(result.outputs.filter((o) => o.nodeType === "schedule2").length, 1);
});

Deno.test("f8621.compute: mixed regimes — each routes to correct node", () => {
  const result = compute([
    minimalItem({ regime: PficRegime.QEF, qef_ordinary_income: 4000, company_name: "QEF Fund" }),
    minimalItem({ regime: PficRegime.MTM, mtm_gain_loss: 2000, company_name: "MTM Fund" }),
    minimalItem({ regime: PficRegime.EXCESS_DISTRIBUTION, excess_distribution_amount: 10000, company_name: "ED Fund" }),
  ]);
  const s1Fields = fieldsOf(result.outputs, schedule1)!;
  const s2Fields = fieldsOf(result.outputs, schedule2)!;
  // QEF + MTM both route to schedule1
  assertEquals(s1Fields.line8z_other, 6000);  // 4000 + 2000
  // ED routes to schedule2
  assertEquals(s2Fields.line17z_other_additional_taxes, 3700);  // 10000 × 0.37
});

// =============================================================================
// 6. Thresholds
// =============================================================================

Deno.test("f8621.compute: excess distribution tax at 37% rate — correct computation", () => {
  const result = compute([minimalItem({
    regime: PficRegime.EXCESS_DISTRIBUTION,
    excess_distribution_amount: 100000,
  })]);
  const fields = fieldsOf(result.outputs, schedule2)!;
  assertEquals(fields.line17z_other_additional_taxes, 37000);
});

// =============================================================================
// 7. Hard Validation
// =============================================================================

Deno.test("f8621.compute: throws on negative excess_distribution_amount", () => {
  assertThrows(
    () => compute([minimalItem({ regime: PficRegime.EXCESS_DISTRIBUTION, excess_distribution_amount: -1000 })]),
    Error,
  );
});

Deno.test("f8621.compute: throws on negative qef_ordinary_income", () => {
  assertThrows(
    () => compute([minimalItem({ regime: PficRegime.QEF, qef_ordinary_income: -500 })]),
    Error,
  );
});

Deno.test("f8621.compute: does not throw when all optional fields absent — no income fields means no outputs", () => {
  const result = compute([minimalItem()]);
  assertEquals(result.outputs, []);
});

// =============================================================================
// 8. Edge Cases
// =============================================================================

Deno.test("f8621.compute: informational only (no income/gain/distribution) — no output", () => {
  const result = compute([minimalItem({
    regime: PficRegime.EXCESS_DISTRIBUTION,
    total_distributions: 0,
  })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8621.compute: MTM loss on one PFIC, QEF gain on another — both route to schedule1, netted", () => {
  const result = compute([
    minimalItem({ regime: PficRegime.MTM, mtm_gain_loss: -3000, company_name: "MTM Fund" }),
    minimalItem({ regime: PficRegime.QEF, qef_ordinary_income: 5000, company_name: "QEF Fund" }),
  ]);
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line8z_other, 2000);  // 5000 - 3000
});

// =============================================================================
// 9. Smoke Test
// =============================================================================

Deno.test("f8621.compute: smoke test — three PFICs, all regimes", () => {
  const result = compute([
    minimalItem({
      company_name: "Cayman Growth Fund",
      company_ein_or_ref: "N/A",
      country_of_incorporation: "Cayman Islands",
      regime: PficRegime.QEF,
      shares_owned: 500,
      fmv_at_year_end: 250000,
      qef_ordinary_income: 12000,
      qef_capital_gain: 4000,
    }),
    minimalItem({
      company_name: "Dublin Index Fund",
      country_of_incorporation: "Ireland",
      regime: PficRegime.MTM,
      shares_owned: 200,
      fmv_at_year_end: 80000,
      mtm_gain_loss: 8000,
    }),
    minimalItem({
      company_name: "Singapore PFIC Corp",
      country_of_incorporation: "Singapore",
      regime: PficRegime.EXCESS_DISTRIBUTION,
      shares_owned: 1000,
      fmv_at_year_end: 50000,
      total_distributions: 30000,
      excess_distribution_amount: 15000,
    }),
  ]);

  // Schedule 1: QEF (12000+4000) + MTM (8000) = 24000
  const s1Fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(s1Fields.line8z_other, 24000);

  // Schedule 2: ED excess distribution tax = 15000 × 0.37 = 5550
  const s2Fields = fieldsOf(result.outputs, schedule2)!;
  assertEquals(s2Fields.line17z_other_additional_taxes, 5550);

  assertEquals(result.outputs.length, 2);
});

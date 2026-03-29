// These tests define IRS-correct behaviour for Form 982.
// If a test fails, fix the implementation — not the test.
//
// IRS References:
//   Form 982 instructions (Rev. Dec 2021): https://www.irs.gov/pub/irs-pdf/i982.pdf
//   IRC §108(a)(1) — exclusion types and caps
//
// Covered scenarios:
//   1. Schema validation
//   2. Bankruptcy exclusion (Title 11 — no cap)
//   3. Insolvency exclusion (capped at insolvency_amount)
//   4. QPRI exclusion ($750k cap; $375k for MFS)
//   5. Farm debt exclusion
//   6. Real property business debt exclusion
//   7. Taxable excess routing to schedule1
//   8. No output when excluded cod = 0
//   9. Smoke tests

import { assertEquals, assertThrows } from "@std/assert";
import { form982, ExclusionType, inputSchema } from "./index.ts";

function compute(input: Record<string, unknown>) {
  return form982.compute(inputSchema.parse(input));
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// ============================================================
// 1. Schema Validation
// ============================================================

Deno.test("schema: missing line2_excluded_cod throws", () => {
  assertThrows(() =>
    compute({
      exclusion_type: ExclusionType.Bankruptcy,
    })
  );
});

Deno.test("schema: negative line2_excluded_cod throws", () => {
  assertThrows(() =>
    compute({
      line2_excluded_cod: -1,
      exclusion_type: ExclusionType.Bankruptcy,
    })
  );
});

Deno.test("schema: missing exclusion_type throws", () => {
  assertThrows(() =>
    compute({
      line2_excluded_cod: 10000,
    })
  );
});

Deno.test("schema: invalid exclusion_type throws", () => {
  assertThrows(() =>
    compute({
      line2_excluded_cod: 10000,
      exclusion_type: "not_a_valid_type",
    })
  );
});

Deno.test("schema: negative insolvency_amount throws", () => {
  assertThrows(() =>
    compute({
      line2_excluded_cod: 5000,
      exclusion_type: ExclusionType.Insolvency,
      insolvency_amount: -1,
    })
  );
});

Deno.test("schema: valid minimal bankruptcy input does not throw", () => {
  const result = compute({
    line2_excluded_cod: 5000,
    exclusion_type: ExclusionType.Bankruptcy,
  });
  assertEquals(Array.isArray(result.outputs), true);
});

// ============================================================
// 2. Bankruptcy Exclusion (Title 11 — no cap)
// ============================================================

Deno.test("bankruptcy: full COD excluded — no taxable excess, no schedule1 output", () => {
  const result = compute({
    line2_excluded_cod: 50000,
    exclusion_type: ExclusionType.Bankruptcy,
  });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1, undefined);
  assertEquals(result.outputs.length, 0);
});

Deno.test("bankruptcy: large amount still fully excluded — no cap", () => {
  const result = compute({
    line2_excluded_cod: 5_000_000,
    exclusion_type: ExclusionType.Bankruptcy,
  });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1, undefined);
});

Deno.test("bankruptcy: insolvency_amount provided but ignored under bankruptcy", () => {
  // Bankruptcy takes precedence; insolvency_amount has no effect
  const result = compute({
    line2_excluded_cod: 100000,
    exclusion_type: ExclusionType.Bankruptcy,
    insolvency_amount: 5000,
  });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1, undefined);
});

// ============================================================
// 3. Insolvency Exclusion (capped at insolvency_amount)
// ============================================================

Deno.test("insolvency: COD below insolvency amount — fully excluded, no schedule1", () => {
  const result = compute({
    line2_excluded_cod: 3000,
    exclusion_type: ExclusionType.Insolvency,
    insolvency_amount: 10000,
  });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1, undefined);
});

Deno.test("insolvency: COD equals insolvency amount — fully excluded, no schedule1", () => {
  const result = compute({
    line2_excluded_cod: 10000,
    exclusion_type: ExclusionType.Insolvency,
    insolvency_amount: 10000,
  });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1, undefined);
});

Deno.test("insolvency: COD exceeds insolvency amount — excess is taxable", () => {
  // COD = $15,000; insolvency = $10,000 → taxable excess = $5,000
  const result = compute({
    line2_excluded_cod: 15000,
    exclusion_type: ExclusionType.Insolvency,
    insolvency_amount: 10000,
  });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1 !== undefined, true);
  const input = s1!.input as Record<string, unknown>;
  assertEquals(input.line8c_cod_income, 5000);
});

Deno.test("insolvency: insolvency_amount = 0 — full COD is taxable", () => {
  const result = compute({
    line2_excluded_cod: 20000,
    exclusion_type: ExclusionType.Insolvency,
    insolvency_amount: 0,
  });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1 !== undefined, true);
  const input = s1!.input as Record<string, unknown>;
  assertEquals(input.line8c_cod_income, 20000);
});

Deno.test("insolvency: missing insolvency_amount — full COD is taxable (no cap can be applied)", () => {
  // Without insolvency_amount we cannot compute the cap; treat as 0 cap
  const result = compute({
    line2_excluded_cod: 8000,
    exclusion_type: ExclusionType.Insolvency,
  });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1 !== undefined, true);
  const input = s1!.input as Record<string, unknown>;
  assertEquals(input.line8c_cod_income, 8000);
});

Deno.test("insolvency: partial exclusion — excess routes to schedule1 with exact amount", () => {
  // COD = $25,000; insolvency = $7,500 → taxable = $17,500
  const result = compute({
    line2_excluded_cod: 25000,
    exclusion_type: ExclusionType.Insolvency,
    insolvency_amount: 7500,
  });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1 !== undefined, true);
  const input = s1!.input as Record<string, unknown>;
  assertEquals(input.line8c_cod_income, 17500);
});

// ============================================================
// 4. QPRI Exclusion ($750k cap; $375k for MFS)
// ============================================================

Deno.test("qpri: COD below standard cap — fully excluded", () => {
  const result = compute({
    line2_excluded_cod: 100000,
    exclusion_type: ExclusionType.Qpri,
  });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1, undefined);
});

Deno.test("qpri: COD at exactly $750,000 — fully excluded", () => {
  const result = compute({
    line2_excluded_cod: 750000,
    exclusion_type: ExclusionType.Qpri,
  });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1, undefined);
});

Deno.test("qpri: COD exceeds $750,000 — excess is taxable", () => {
  // COD = $900,000; cap = $750,000 → taxable = $150,000
  const result = compute({
    line2_excluded_cod: 900000,
    exclusion_type: ExclusionType.Qpri,
  });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1 !== undefined, true);
  const input = s1!.input as Record<string, unknown>;
  assertEquals(input.line8c_cod_income, 150000);
});

Deno.test("qpri: MFS flag lowers cap to $375,000", () => {
  // COD = $500,000; MFS cap = $375,000 → taxable = $125,000
  const result = compute({
    line2_excluded_cod: 500000,
    exclusion_type: ExclusionType.Qpri,
    qpri_mfs: true,
  });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1 !== undefined, true);
  const input = s1!.input as Record<string, unknown>;
  assertEquals(input.line8c_cod_income, 125000);
});

Deno.test("qpri: MFS flag, COD at exactly $375,000 — fully excluded", () => {
  const result = compute({
    line2_excluded_cod: 375000,
    exclusion_type: ExclusionType.Qpri,
    qpri_mfs: true,
  });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1, undefined);
});

Deno.test("qpri: MFS=false uses standard $750,000 cap", () => {
  const result = compute({
    line2_excluded_cod: 600000,
    exclusion_type: ExclusionType.Qpri,
    qpri_mfs: false,
  });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1, undefined);
});

// ============================================================
// 5. Farm Debt Exclusion (no explicit dollar cap)
// ============================================================

Deno.test("farm_debt: COD fully excluded, no schedule1 output", () => {
  const result = compute({
    line2_excluded_cod: 200000,
    exclusion_type: ExclusionType.FarmDebt,
  });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1, undefined);
});

Deno.test("farm_debt: large amount fully excluded", () => {
  const result = compute({
    line2_excluded_cod: 1_500_000,
    exclusion_type: ExclusionType.FarmDebt,
  });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1, undefined);
});

// ============================================================
// 6. Real Property Business Debt Exclusion (no dollar cap enforced in node)
// ============================================================

Deno.test("real_property_business: COD fully excluded, no schedule1 output", () => {
  const result = compute({
    line2_excluded_cod: 500000,
    exclusion_type: ExclusionType.RealPropertyBusiness,
  });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1, undefined);
});

// ============================================================
// 7. Zero COD — no outputs
// ============================================================

Deno.test("zero cod: line2_excluded_cod = 0 produces no outputs", () => {
  const result = compute({
    line2_excluded_cod: 0,
    exclusion_type: ExclusionType.Bankruptcy,
  });
  assertEquals(result.outputs.length, 0);
});

Deno.test("zero cod: insolvency with cod=0 produces no outputs", () => {
  const result = compute({
    line2_excluded_cod: 0,
    exclusion_type: ExclusionType.Insolvency,
    insolvency_amount: 5000,
  });
  assertEquals(result.outputs.length, 0);
});

// ============================================================
// 8. Output routing — schedule1 only when taxable_excess > 0
// ============================================================

Deno.test("output routing: no schedule1 when fully excluded", () => {
  const result = compute({
    line2_excluded_cod: 30000,
    exclusion_type: ExclusionType.Bankruptcy,
  });
  assertEquals(result.outputs.length, 0);
});

Deno.test("output routing: schedule1 emitted with exact excess amount", () => {
  const result = compute({
    line2_excluded_cod: 12000,
    exclusion_type: ExclusionType.Insolvency,
    insolvency_amount: 4000,
  });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1 !== undefined, true);
  const input = s1!.input as Record<string, unknown>;
  assertEquals(input.line8c_cod_income, 8000);
});

Deno.test("output routing: only one schedule1 output produced (not duplicated)", () => {
  const result = compute({
    line2_excluded_cod: 20000,
    exclusion_type: ExclusionType.Insolvency,
    insolvency_amount: 5000,
  });
  const s1Outputs = result.outputs.filter((o) => o.nodeType === "schedule1");
  assertEquals(s1Outputs.length, 1);
});

// ============================================================
// 9. Smoke Tests
// ============================================================

Deno.test("smoke: bankruptcy — credit card debt cancelled in Chapter 7, $48,000 fully excluded", () => {
  // Taxpayer filed Chapter 7. Creditor discharged $48,000 in credit card debt.
  // Exclusion type: bankruptcy (Title 11). No dollar cap.
  const result = compute({
    line2_excluded_cod: 48000,
    exclusion_type: ExclusionType.Bankruptcy,
  });
  // Fully excluded — nothing taxable
  assertEquals(result.outputs.length, 0);
});

Deno.test("smoke: insolvency — $20,000 cancelled debt, $12,000 insolvent, $8,000 taxable", () => {
  // Taxpayer was insolvent by $12,000 (liabilities exceeded assets by $12,000).
  // Creditor cancelled $20,000. Only $12,000 excluded; remaining $8,000 is taxable.
  const result = compute({
    line2_excluded_cod: 20000,
    exclusion_type: ExclusionType.Insolvency,
    insolvency_amount: 12000,
  });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1 !== undefined, true);
  const input = s1!.input as Record<string, unknown>;
  assertEquals(input.line8c_cod_income, 8000);
});

Deno.test("smoke: QPRI — $300,000 mortgage discharged on principal residence, fully excluded", () => {
  // Foreclosure on principal residence. $300,000 qualified principal residence
  // indebtedness discharged before Jan 1, 2026. Well below $750k cap.
  const result = compute({
    line2_excluded_cod: 300000,
    exclusion_type: ExclusionType.Qpri,
  });
  assertEquals(result.outputs.length, 0);
});

Deno.test("smoke: QPRI MFS — $450,000 discharged, MFS filer, $75,000 taxable excess", () => {
  // MFS taxpayer. Discharged $450,000 QPRI. MFS cap is $375,000.
  // Excess = $450,000 - $375,000 = $75,000 is taxable.
  const result = compute({
    line2_excluded_cod: 450000,
    exclusion_type: ExclusionType.Qpri,
    qpri_mfs: true,
  });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1 !== undefined, true);
  const input = s1!.input as Record<string, unknown>;
  assertEquals(input.line8c_cod_income, 75000);
});

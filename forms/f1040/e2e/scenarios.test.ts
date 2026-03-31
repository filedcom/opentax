/**
 * E2E scenarios — 10 common TY2025 returns.
 *
 * Each test runs a complete return through the node graph and asserts
 * specific Form 1040 line values. Math is hand-verified against the
 * bracket tables and constants in forms/f1040/nodes/config/2025.ts.
 *
 * See docs/scenarios.md for the detailed computation breakdowns.
 *
 * Pending dict semantics:
 *   Fields deposited by BOTH upstream nodes AND f1040's assembleReturn()
 *   end up as arrays (e.g. line16_income_tax). The final summary lines
 *   (line24_total_tax, line33_total_payments, line35a_refund,
 *   line37_amount_owed) are only written by assembleReturn and are
 *   always scalar — use these for authoritative computed totals.
 *
 *   To check intermediate values (taxable_income, AGI, etc.), read
 *   the intermediate node's pending dict, not f1040's.
 */

import { assertEquals } from "@std/assert";
import { buildExecutionPlan } from "../../../core/runtime/planner.ts";
import { execute, type ExecuteResult } from "../../../core/runtime/executor.ts";
import { registry } from "../2025/registry.ts";
import { FilingStatus } from "../nodes/types.ts";
import { SS_WAGE_BASE_2025 } from "../nodes/config/2025.ts";

// ── Shared context ──────────────────────────────────────────────────────────

const ctx = { taxYear: 2025 };
const plan = buildExecutionPlan(registry);

function runReturn(inputs: Record<string, unknown>): ExecuteResult {
  return execute(plan, registry, inputs, ctx);
}

/** Round to 2 decimal places for floating-point comparison. */
function r2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ── Helpers to build minimal inputs ─────────────────────────────────────────

function singleGeneral() {
  return {
    filing_status: FilingStatus.Single,
    taxpayer_first_name: "Test",
    taxpayer_last_name: "Taxpayer",
    taxpayer_ssn: "111-22-3333",
    taxpayer_dob: "1985-06-15",
  };
}

function mfjGeneral() {
  return {
    filing_status: FilingStatus.MFJ,
    taxpayer_first_name: "Test",
    taxpayer_last_name: "Taxpayer",
    taxpayer_ssn: "111-22-3333",
    taxpayer_dob: "1985-06-15",
    spouse_first_name: "Spouse",
    spouse_last_name: "Taxpayer",
    spouse_ssn: "444-55-6666",
    spouse_dob: "1987-03-10",
  };
}

function hohGeneral() {
  return {
    filing_status: FilingStatus.HOH,
    taxpayer_first_name: "Test",
    taxpayer_last_name: "Taxpayer",
    taxpayer_ssn: "111-22-3333",
    taxpayer_dob: "1985-06-15",
  };
}

function mfsGeneral() {
  return {
    filing_status: FilingStatus.MFS,
    taxpayer_first_name: "Test",
    taxpayer_last_name: "Taxpayer",
    taxpayer_ssn: "111-22-3333",
    taxpayer_dob: "1985-06-15",
  };
}

/** Build a W-2 item, capping SS wages at the wage base. */
function w2Item(wages: number, withheld: number) {
  const ssWages = Math.min(wages, SS_WAGE_BASE_2025);
  return {
    box1_wages: wages,
    box2_fed_withheld: withheld,
    box3_ss_wages: ssWages,
    box4_ss_withheld: ssWages * 0.062,
    box5_medicare_wages: wages,
    box6_medicare_withheld: wages * 0.0145,
    employer_ein: "12-3456789",
    employer_name: "ACME Corp",
    box12_entries: [],
  };
}

// ── Scenario 1: Single W-2 earner, $75K ─────────────────────────────────────
//
// Wages: $75,000  |  Withheld: $11,000
// AGI: $75,000  |  Std ded: $15,000  |  Taxable: $60,000
// Tax (22% bracket): $5,578.50 + ($60,000 − $48,475) × 0.22 = $8,114
// Refund: $11,000 − $8,114 = $2,886

Deno.test("Scenario 1: Single, W-2 $75K — refund $2,886", () => {
  const result = runReturn({
    general: singleGeneral(),
    w2: [w2Item(75_000, 11_000)],
  });

  // Intermediate checks
  assertEquals(
    result.pending["agi_aggregator"]?.["line1a_wages"], 75_000,
    "agi_aggregator receives wages",
  );
  assertEquals(
    result.pending["income_tax_calculation"]?.["taxable_income"], 60_000,
    "taxable income = $75K − $15K std ded",
  );

  // F1040 scalar summary
  const f = result.pending["f1040"] ?? {};
  assertEquals(f["line24_total_tax"], 8_114, "total tax");
  assertEquals(f["line33_total_payments"], 11_000, "total payments");
  assertEquals(f["line35a_refund"], 2_886, "refund");
  assertEquals(f["line37_amount_owed"], undefined, "no amount owed");
});

// ── Scenario 2: MFJ, single earner, $120K ──────────────────────────────────
//
// Wages: $120,000  |  Withheld: $13,000
// AGI: $120,000  |  Std ded: $30,000  |  Taxable: $90,000
// Tax (12% bracket): $2,385 + ($90,000 − $23,850) × 0.12 = $10,323
// Refund: $13,000 − $10,323 = $2,677

Deno.test("Scenario 2: MFJ, W-2 $120K — refund $2,677", () => {
  const result = runReturn({
    general: mfjGeneral(),
    w2: [w2Item(120_000, 13_000)],
  });

  assertEquals(
    result.pending["income_tax_calculation"]?.["taxable_income"], 90_000,
    "taxable income = $120K − $30K std ded",
  );

  const f = result.pending["f1040"] ?? {};
  assertEquals(f["line24_total_tax"], 10_323, "total tax");
  assertEquals(f["line33_total_payments"], 13_000, "total payments");
  assertEquals(f["line35a_refund"], 2_677, "refund");
  assertEquals(f["line37_amount_owed"], undefined, "no amount owed");
});

// ── Scenario 3: MFJ, dual earners, $85K + $65K = $150K ─────────────────────
//
// Total wages: $150,000  |  Withheld: $10,200 + $7,800 = $18,000
// AGI: $150,000  |  Std ded: $30,000  |  Taxable: $120,000
// Tax (22% bracket): $11,157 + ($120,000 − $96,950) × 0.22 = $16,228
// Refund: $18,000 − $16,228 = $1,772

Deno.test("Scenario 3: MFJ, dual W-2s $150K — refund $1,772", () => {
  const result = runReturn({
    general: mfjGeneral(),
    w2: [
      w2Item(85_000, 10_200),
      { ...w2Item(65_000, 7_800), employer_ein: "98-7654321", employer_name: "Beta Inc" },
    ],
  });

  assertEquals(
    result.pending["agi_aggregator"]?.["line1a_wages"], 150_000,
    "agi_aggregator receives combined wages",
  );
  assertEquals(
    result.pending["income_tax_calculation"]?.["taxable_income"], 120_000,
    "taxable income = $150K − $30K std ded",
  );

  const f = result.pending["f1040"] ?? {};
  assertEquals(f["line24_total_tax"], 16_228, "total tax");
  assertEquals(f["line33_total_payments"], 18_000, "total payments");
  assertEquals(f["line35a_refund"], 1_772, "refund");
  assertEquals(f["line37_amount_owed"], undefined, "no amount owed");
});

// ── Scenario 4: Single, W-2 $65K + 1099-INT $1,200 ─────────────────────────
//
// Wages: $65,000  |  Interest: $1,200  |  Withheld: $8,000
// AGI: $66,200  |  Std ded: $15,000  |  Taxable: $51,200
// Tax (22% bracket): $5,578.50 + ($51,200 − $48,475) × 0.22 = $6,178
// Refund: $8,000 − $6,178 = $1,822

Deno.test("Scenario 4: Single, W-2 + interest — refund $1,822", () => {
  const result = runReturn({
    general: singleGeneral(),
    w2: [w2Item(65_000, 8_000)],
    f1099int: [
      { payer_name: "First National Bank", box1: 1_200 },
    ],
  });

  assertEquals(
    result.pending["standard_deduction"]?.["agi"], 66_200,
    "AGI = wages + interest",
  );
  assertEquals(
    result.pending["income_tax_calculation"]?.["taxable_income"], 51_200,
    "taxable income = $66,200 − $15K std ded",
  );

  const f = result.pending["f1040"] ?? {};
  assertEquals(f["line24_total_tax"], 6_178, "total tax");
  assertEquals(f["line33_total_payments"], 8_000, "total payments");
  assertEquals(f["line35a_refund"], 1_822, "refund");
});

// ── Scenario 5: Single, W-2 $70K + qualified dividends ──────────────────────
//
// Wages: $70,000  |  Ord div: $3,000  |  Qual div: $2,500  |  Withheld: $9,000
// AGI: $73,000  |  Std ded: $15,000  |  Taxable: $58,000
//
// QDCGT Worksheet:
//   pref_income = $2,500  |  ordinary = $55,500
//   in_zero = 0  |  in_fifteen = $2,500  |  in_twenty = 0
//   ordinary_tax = $5,578.50 + ($55,500 − $48,475) × 0.22 = $7,124
//   pref_tax = $2,500 × 0.15 = $375
//   QDCGT tax = $7,124 + $375 = $7,499
//
// Refund: $9,000 − $7,499 = $1,501

Deno.test("Scenario 5: Single, W-2 + qualified dividends (QDCGTW) — refund $1,501", () => {
  const result = runReturn({
    general: singleGeneral(),
    w2: [w2Item(70_000, 9_000)],
    f1099div: [
      {
        payerName: "Vanguard",
        isNominee: false,
        box11: false,
        box1a: 3_000,
        box1b: 2_500,
      },
    ],
  });

  assertEquals(
    result.pending["income_tax_calculation"]?.["taxable_income"], 58_000,
    "taxable income = $73K − $15K std ded",
  );
  assertEquals(
    result.pending["income_tax_calculation"]?.["qualified_dividends"], 2_500,
    "qualified dividends flow to income tax calc",
  );

  const f = result.pending["f1040"] ?? {};
  assertEquals(f["line24_total_tax"], 7_499, "total tax (QDCGTW applied)");
  assertEquals(f["line33_total_payments"], 9_000, "total payments");
  assertEquals(f["line35a_refund"], 1_501, "refund");
});

// ── Scenario 6: HOH, W-2 $52K ──────────────────────────────────────────────
//
// Wages: $52,000  |  Withheld: $4,200
// AGI: $52,000  |  Std ded: $22,500  |  Taxable: $29,500
// Tax (12% bracket): $1,700 + ($29,500 − $17,000) × 0.12 = $3,200
// Refund: $4,200 − $3,200 = $1,000

Deno.test("Scenario 6: HOH, W-2 $52K — refund $1,000", () => {
  const result = runReturn({
    general: hohGeneral(),
    w2: [w2Item(52_000, 4_200)],
  });

  assertEquals(
    result.pending["income_tax_calculation"]?.["taxable_income"], 29_500,
    "taxable income = $52K − $22.5K std ded",
  );

  const f = result.pending["f1040"] ?? {};
  assertEquals(f["line24_total_tax"], 3_200, "total tax");
  assertEquals(f["line33_total_payments"], 4_200, "total payments");
  assertEquals(f["line35a_refund"], 1_000, "refund");
});

// ── Scenario 7: Single, self-employed, Schedule C $80K ──────────────────────
//
// Net profit: $80,000
// SE earnings: $80,000 × 0.9235 = $73,880
// SS tax: $73,880 × 0.124 = $9,161.12
// Medicare: $73,880 × 0.029 = $2,142.52
// SE tax: $11,303.64  |  SE deduction: $5,651.82
//
// AGI: $80,000 − $5,651.82 = $74,348.18
// Std ded: $15,000  |  Taxable: $59,348.18
// Income tax: $5,578.50 + ($59,348.18 − $48,475) × 0.22 = $7,970.5996
// Total tax (income + SE): $7,970.5996 + $11,303.64 = $19,274.2396
// Amount owed: $19,274.2396

Deno.test("Scenario 7: Single, self-employed Schedule C $80K — owes ~$19,274", () => {
  const result = runReturn({
    general: singleGeneral(),
    schedule_c: [
      {
        line_a_principal_business: "Consulting",
        line_b_business_code: "541600",
        line_c_business_name: "Test LLC",
        line_f_accounting_method: "cash",
        line_g_material_participation: true,
        line_1_gross_receipts: 80_000,
      },
    ],
  });

  // AGI aggregator inputs
  const agg = result.pending["agi_aggregator"] ?? {};
  assertEquals(agg["line3_schedule_c"], 80_000, "schedule C income");
  assertEquals(r2(agg["line15_se_deduction"] as number), 5_651.82, "SE deduction");

  // Standard deduction receives correct AGI
  assertEquals(
    r2(result.pending["standard_deduction"]?.["agi"] as number), 74_348.18,
    "AGI = $80K − $5,651.82 SE deduction",
  );

  // Income tax calculation receives correct taxable income
  assertEquals(
    r2(result.pending["income_tax_calculation"]?.["taxable_income"] as number), 59_348.18,
    "taxable income = AGI − $15K std ded",
  );

  // F1040 scalar summary (total tax = income tax + SE tax via schedule 2)
  const f = result.pending["f1040"] ?? {};
  assertEquals(r2(f["line24_total_tax"] as number), 19_274.24, "total tax");
  assertEquals(f["line33_total_payments"], 0, "no payments");
  assertEquals(r2(f["line37_amount_owed"] as number), 19_274.24, "amount owed");
  assertEquals(f["line35a_refund"], undefined, "no refund");
});

// ── Scenario 8: MFJ, higher income, W-2 $200K ──────────────────────────────
//
// Wages: $200,000  |  Withheld: $32,000
// AGI: $200,000  |  Std ded: $30,000  |  Taxable: $170,000
// Tax (22% bracket): $11,157 + ($170,000 − $96,950) × 0.22 = $27,228
// Refund: $32,000 − $27,228 = $4,772
//
// Note: W-2 box3 SS wages capped at $176,100 (wage base).

Deno.test("Scenario 8: MFJ, W-2 $200K — refund $4,772", () => {
  const result = runReturn({
    general: mfjGeneral(),
    w2: [w2Item(200_000, 32_000)],
  });

  assertEquals(
    result.pending["income_tax_calculation"]?.["taxable_income"], 170_000,
    "taxable income = $200K − $30K std ded",
  );

  const f = result.pending["f1040"] ?? {};
  assertEquals(f["line24_total_tax"], 27_228, "total tax");
  assertEquals(f["line33_total_payments"], 32_000, "total payments");
  assertEquals(f["line35a_refund"], 4_772, "refund");
  assertEquals(f["line37_amount_owed"], undefined, "no amount owed");
});

// ── Scenario 9: MFS, W-2 $80K ──────────────────────────────────────────────
//
// Wages: $80,000  |  Withheld: $10,400
// AGI: $80,000  |  Std ded: $15,000  |  Taxable: $65,000
// Tax (22% bracket): $5,578.50 + ($65,000 − $48,475) × 0.22 = $9,214
// Refund: $10,400 − $9,214 = $1,186

Deno.test("Scenario 9: MFS, W-2 $80K — refund $1,186", () => {
  const result = runReturn({
    general: mfsGeneral(),
    w2: [w2Item(80_000, 10_400)],
  });

  assertEquals(
    result.pending["income_tax_calculation"]?.["taxable_income"], 65_000,
    "taxable income = $80K − $15K std ded",
  );

  const f = result.pending["f1040"] ?? {};
  assertEquals(f["line24_total_tax"], 9_214, "total tax");
  assertEquals(f["line33_total_payments"], 10_400, "total payments");
  assertEquals(f["line35a_refund"], 1_186, "refund");
  assertEquals(f["line37_amount_owed"], undefined, "no amount owed");
});

// ── Scenario 10: Single, W-2 $140K (24% bracket) ───────────────────────────
//
// Wages: $140,000  |  Withheld: $24,000
// AGI: $140,000  |  Std ded: $15,000  |  Taxable: $125,000
// Tax (24% bracket): $17,651 + ($125,000 − $103,350) × 0.24 = $22,847
// Refund: $24,000 − $22,847 = $1,153

Deno.test("Scenario 10: Single, W-2 $140K (24% bracket) — refund $1,153", () => {
  const result = runReturn({
    general: singleGeneral(),
    w2: [w2Item(140_000, 24_000)],
  });

  assertEquals(
    result.pending["income_tax_calculation"]?.["taxable_income"], 125_000,
    "taxable income = $140K − $15K std ded",
  );

  const f = result.pending["f1040"] ?? {};
  assertEquals(f["line24_total_tax"], 22_847, "total tax");
  assertEquals(f["line33_total_payments"], 24_000, "total payments");
  assertEquals(f["line35a_refund"], 1_153, "refund");
  assertEquals(f["line37_amount_owed"], undefined, "no amount owed");
});

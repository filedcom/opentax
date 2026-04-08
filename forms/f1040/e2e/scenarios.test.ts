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
import { DependentRelationship } from "../nodes/inputs/general/index.ts";

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
// AGI: $75,000  |  Std ded: $15,750  |  Taxable: $59,250
// Tax (22% bracket): $5,578.50 + ($59,250 − $48,475) × 0.22 = $7,949
// Refund: $11,000 − $7,949 = $3,051

Deno.test("Scenario 1: Single, W-2 $75K — refund $3,051", () => {
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
    result.pending["income_tax_calculation"]?.["taxable_income"], 59_250,
    "taxable income = $75K − $15,750 std ded",
  );

  // F1040 scalar summary
  const f = result.pending["f1040"] ?? {};
  assertEquals(f["line24_total_tax"], 7_949, "total tax");
  assertEquals(f["line33_total_payments"], 11_000, "total payments");
  assertEquals(f["line35a_refund"], 3_051, "refund");
  assertEquals(f["line37_amount_owed"], undefined, "no amount owed");
});

// ── Scenario 2: MFJ, single earner, $120K ──────────────────────────────────
//
// Wages: $120,000  |  Withheld: $13,000
// AGI: $120,000  |  Std ded: $31,500  |  Taxable: $88,500
// Tax (12% bracket): $2,385 + ($88,500 − $23,850) × 0.12 = $10,143
// Refund: $13,000 − $10,143 = $2,857

Deno.test("Scenario 2: MFJ, W-2 $120K — refund $2,857", () => {
  const result = runReturn({
    general: mfjGeneral(),
    w2: [w2Item(120_000, 13_000)],
  });

  assertEquals(
    result.pending["income_tax_calculation"]?.["taxable_income"], 88_500,
    "taxable income = $120K − $31,500 std ded",
  );

  const f = result.pending["f1040"] ?? {};
  assertEquals(f["line24_total_tax"], 10_143, "total tax");
  assertEquals(f["line33_total_payments"], 13_000, "total payments");
  assertEquals(f["line35a_refund"], 2_857, "refund");
  assertEquals(f["line37_amount_owed"], undefined, "no amount owed");
});

// ── Scenario 3: MFJ, dual earners, $85K + $65K = $150K ─────────────────────
//
// Total wages: $150,000  |  Withheld: $10,200 + $7,800 = $18,000
// AGI: $150,000  |  Std ded: $31,500  |  Taxable: $118,500
// Tax (22% bracket): $11,157 + ($118,500 − $96,950) × 0.22 = $15,898
// Refund: $18,000 − $15,898 = $2,102

Deno.test("Scenario 3: MFJ, dual W-2s $150K — refund $2,102", () => {
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
    result.pending["income_tax_calculation"]?.["taxable_income"], 118_500,
    "taxable income = $150K − $31,500 std ded",
  );

  const f = result.pending["f1040"] ?? {};
  assertEquals(f["line24_total_tax"], 15_898, "total tax");
  assertEquals(f["line33_total_payments"], 18_000, "total payments");
  assertEquals(f["line35a_refund"], 2_102, "refund");
  assertEquals(f["line37_amount_owed"], undefined, "no amount owed");
});

// ── Scenario 4: Single, W-2 $65K + 1099-INT $1,200 ─────────────────────────
//
// Wages: $65,000  |  Interest: $1,200  |  Withheld: $8,000
// AGI: $66,200  |  Std ded: $15,750  |  Taxable: $50,450
// Tax (22% bracket): $5,578.50 + ($50,450 − $48,475) × 0.22 = $6,013
// Refund: $8,000 − $6,013 = $1,987

Deno.test("Scenario 4: Single, W-2 + interest — refund $1,987", () => {
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
    result.pending["income_tax_calculation"]?.["taxable_income"], 50_450,
    "taxable income = $66,200 − $15,750 std ded",
  );

  const f = result.pending["f1040"] ?? {};
  assertEquals(f["line24_total_tax"], 6_013, "total tax");
  assertEquals(f["line33_total_payments"], 8_000, "total payments");
  assertEquals(f["line35a_refund"], 1_987, "refund");
});

// ── Scenario 5: Single, W-2 $70K + qualified dividends ──────────────────────
//
// Wages: $70,000  |  Ord div: $3,000  |  Qual div: $2,500  |  Withheld: $9,000
// AGI: $73,000  |  Std ded: $15,750  |  Taxable: $57,250
//
// QDCGT Worksheet:
//   pref_income = $2,500  |  ordinary = $54,750
//   in_zero = max(0, min($48,350, $57,250) − $54,750) = 0
//   in_fifteen = $2,500  |  in_twenty = 0
//   ordinary_tax = $5,578.50 + ($54,750 − $48,475) × 0.22 = $6,959
//   pref_tax = $2,500 × 0.15 = $375
//   QDCGT tax = $6,959 + $375 = $7,334
//
// Refund: $9,000 − $7,334 = $1,666

Deno.test("Scenario 5: Single, W-2 + qualified dividends (QDCGTW) — refund $1,666", () => {
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
    result.pending["income_tax_calculation"]?.["taxable_income"], 57_250,
    "taxable income = $73K − $15,750 std ded",
  );
  assertEquals(
    result.pending["income_tax_calculation"]?.["qualified_dividends"], 2_500,
    "qualified dividends flow to income tax calc",
  );

  const f = result.pending["f1040"] ?? {};
  assertEquals(f["line24_total_tax"], 7_334, "total tax (QDCGTW applied)");
  assertEquals(f["line33_total_payments"], 9_000, "total payments");
  assertEquals(f["line35a_refund"], 1_666, "refund");
});

// ── Scenario 6: HOH, W-2 $52K ──────────────────────────────────────────────
//
// Wages: $52,000  |  Withheld: $4,200
// AGI: $52,000  |  Std ded: $23,625  |  Taxable: $28,375
// Tax (12% bracket): $1,700 + ($28,375 − $17,000) × 0.12 = $3,065
// Refund: $4,200 − $3,065 = $1,135

Deno.test("Scenario 6: HOH, W-2 $52K — refund $1,135", () => {
  const result = runReturn({
    general: hohGeneral(),
    w2: [w2Item(52_000, 4_200)],
  });

  assertEquals(
    result.pending["income_tax_calculation"]?.["taxable_income"], 28_375,
    "taxable income = $52K − $23,625 std ded",
  );

  const f = result.pending["f1040"] ?? {};
  assertEquals(f["line24_total_tax"], 3_065, "total tax");
  assertEquals(f["line33_total_payments"], 4_200, "total payments");
  assertEquals(f["line35a_refund"], 1_135, "refund");
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
// Std ded: $15,750  |  Pre-QBI taxable: $58,598.18
// QBI deduction: 20% × $58,598.18 = $11,719.636 (Form 8995)
// Taxable income: $58,598.18 − $11,719.636 = $46,878.544
// Income tax (12% bracket, single):
//   $1,192.50 + ($46,878.544 − $11,925) × 0.12 = $1,192.50 + $4,194.425 = $5,386.925
// Total tax (income + SE): $5,386.925 + $11,303.64 = $16,690.565
// Amount owed: $16,690.57

Deno.test("Scenario 7: Single, self-employed Schedule C $80K — owes ~$16,691", () => {
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

  // Income tax calculation receives correct taxable income (after QBI deduction)
  assertEquals(
    r2(result.pending["income_tax_calculation"]?.["taxable_income"] as number), 46_878.54,
    "taxable income = AGI − $15,750 std ded − QBI deduction",
  );

  // F1040 scalar summary (total tax = income tax + SE tax via schedule 2)
  const f = result.pending["f1040"] ?? {};
  assertEquals(r2(f["line24_total_tax"] as number), 16_690.57, "total tax");
  assertEquals(f["line33_total_payments"], 0, "no payments");
  assertEquals(r2(f["line37_amount_owed"] as number), 16_690.57, "amount owed");
  assertEquals(f["line35a_refund"], undefined, "no refund");
});

// ── Scenario 8: MFJ, higher income, W-2 $200K ──────────────────────────────
//
// Wages: $200,000  |  Withheld: $32,000
// AGI: $200,000  |  Std ded: $31,500  |  Taxable: $168,500
// Tax (22% bracket): $11,157 + ($168,500 − $96,950) × 0.22 = $26,898
// Refund: $32,000 − $26,898 = $5,102
//
// Note: W-2 box3 SS wages capped at $176,100 (wage base).

Deno.test("Scenario 8: MFJ, W-2 $200K — refund $5,102", () => {
  const result = runReturn({
    general: mfjGeneral(),
    w2: [w2Item(200_000, 32_000)],
  });

  assertEquals(
    result.pending["income_tax_calculation"]?.["taxable_income"], 168_500,
    "taxable income = $200K − $31,500 std ded",
  );

  const f = result.pending["f1040"] ?? {};
  assertEquals(f["line24_total_tax"], 26_898, "total tax");
  assertEquals(f["line33_total_payments"], 32_000, "total payments");
  assertEquals(f["line35a_refund"], 5_102, "refund");
  assertEquals(f["line37_amount_owed"], undefined, "no amount owed");
});

// ── Scenario 9: MFS, W-2 $80K ──────────────────────────────────────────────
//
// Wages: $80,000  |  Withheld: $10,400
// AGI: $80,000  |  Std ded: $15,750  |  Taxable: $64,250
// Tax (22% bracket): $5,578.50 + ($64,250 − $48,475) × 0.22 = $9,049
// Refund: $10,400 − $9,049 = $1,351

Deno.test("Scenario 9: MFS, W-2 $80K — refund $1,351", () => {
  const result = runReturn({
    general: mfsGeneral(),
    w2: [w2Item(80_000, 10_400)],
  });

  assertEquals(
    result.pending["income_tax_calculation"]?.["taxable_income"], 64_250,
    "taxable income = $80K − $15,750 std ded",
  );

  const f = result.pending["f1040"] ?? {};
  assertEquals(f["line24_total_tax"], 9_049, "total tax");
  assertEquals(f["line33_total_payments"], 10_400, "total payments");
  assertEquals(f["line35a_refund"], 1_351, "refund");
  assertEquals(f["line37_amount_owed"], undefined, "no amount owed");
});

// ── Scenario 10: Single, W-2 $140K (24% bracket) ───────────────────────────
//
// Wages: $140,000  |  Withheld: $24,000
// AGI: $140,000  |  Std ded: $15,750  |  Taxable: $124,250
// Tax (24% bracket): $17,651 + ($124,250 − $103,350) × 0.24 = $22,667
// Refund: $24,000 − $22,667 = $1,333

Deno.test("Scenario 10: Single, W-2 $140K (24% bracket) — refund $1,333", () => {
  const result = runReturn({
    general: singleGeneral(),
    w2: [w2Item(140_000, 24_000)],
  });

  assertEquals(
    result.pending["income_tax_calculation"]?.["taxable_income"], 124_250,
    "taxable income = $140K − $15,750 std ded",
  );

  const f = result.pending["f1040"] ?? {};
  assertEquals(f["line24_total_tax"], 22_667, "total tax");
  assertEquals(f["line33_total_payments"], 24_000, "total payments");
  assertEquals(f["line35a_refund"], 1_333, "refund");
  assertEquals(f["line37_amount_owed"], undefined, "no amount owed");
});

// ── Scenario 11: Single, itemized deductions (Schedule A) ──────────────────
//
// Wages: $200,000  |  Withheld: $40,000
// Schedule A: state taxes $10,000 (SALT cap $40,000; $10K < cap) + mortgage $18,000 + charitable $5,000
// Total itemized = $10,000 + $18,000 + $5,000 = $33,000
// Standard deduction = $15,000 → taxpayer itemizes ($33K > $15K)
// AGI: $200,000  |  Taxable: $200,000 − $33,000 = $167,000
// Tax (24% bracket): $17,651 + ($167,000 − $103,350) × 0.24
//   = $17,651 + $63,650 × 0.24 = $17,651 + $15,276 = $32,927
// Refund: $40,000 − $32,927 = $7,073

Deno.test("Scenario 11: Single, itemized deductions Schedule A $33K — refund $7,073", () => {
  const result = runReturn({
    general: singleGeneral(),
    w2: [w2Item(200_000, 40_000)],
    schedule_a: {
      line_5a_state_income_tax: 10_000,   // state income taxes ($10K < $40K SALT cap)
      line_8a_mortgage_interest_1098: 18_000,
      line_11_cash_contributions: 5_000,
    },
  });

  // Schedule A produces $33,000 itemized deductions, fed to standard_deduction node
  assertEquals(
    result.pending["standard_deduction"]?.["itemized_deductions"], 33_000,
    "standard_deduction node receives $33,000 itemized deductions",
  );

  // income_tax_calculation sees taxable income = $200K - $33K = $167K
  assertEquals(
    result.pending["income_tax_calculation"]?.["taxable_income"], 167_000,
    "taxable income = $200K − $33K itemized",
  );

  const f = result.pending["f1040"] ?? {};

  // Standard deduction is NOT used when itemizing
  assertEquals(f["line12a_standard_deduction"], undefined, "no standard deduction when itemizing");

  // Tax and refund (scalar summary lines are authoritative)
  assertEquals(f["line24_total_tax"], 32_927, "total tax");
  assertEquals(f["line33_total_payments"], 40_000, "total payments");
  assertEquals(f["line35a_refund"], 7_073, "refund");
  assertEquals(f["line37_amount_owed"], undefined, "no amount owed");
});

// ── Scenario 12: Single, AMT trigger via private activity bond interest ──────
//
// Wages: $100,000  |  Withheld: $18,000
// 1099-INT box8 (tax-exempt interest) = $100,000, box9 (PAB) = $100,000
// PAB interest is tax-exempt for regular tax but is an AMT preference item.
//
// Regular tax:
//   AGI: $100,000 (PAB interest excluded from regular income)
//   Std ded: $15,750  |  Taxable: $84,250
//   Tax (22% bracket): $5,578.50 + ($84,250 − $48,475) × 0.22
//     = $5,578.50 + $35,775 × 0.22 = $5,578.50 + $7,870.50 = $13,449
//
// Form 6251 — AMT:
//   AMTI = taxable income + PAB interest = $84,250 + $100,000 = $184,250
//   AMT exemption (Single) = $88,100 (phase-out starts at $626,350; no phase-out here)
//   Taxable excess = $184,250 − $88,100 = $96,150
//   TMT = $96,150 × 0.26 = $24,999  [≤ $239,100 threshold]
//   AMT = max(0, $24,999 − $13,449) = $11,550
//
// f1040 line16 = $13,449  |  line17 (AMT) = $11,550
// Total tax = $13,449 + $11,550 = $24,999
// Amount owed = $24,999 − $18,000 = $6,999

Deno.test("Scenario 12: Single, AMT via PAB interest $100K — owes $6,999", () => {
  const result = runReturn({
    general: singleGeneral(),
    w2: [w2Item(100_000, 18_000)],
    f1099int: [
      {
        payer_name: "Muni Bond Fund",
        box8: 100_000,   // tax-exempt interest (all PAB)
        box9: 100_000,   // private activity bond interest → AMT preference item
      },
    ],
  });

  // Regular tax
  assertEquals(
    result.pending["income_tax_calculation"]?.["taxable_income"], 84_250,
    "taxable income = $100K − $15,750 std ded",
  );

  const f = result.pending["f1040"] ?? {};

  // AMT fires — form6251 → schedule2 (scalar, no double-write)
  assertEquals(result.pending["schedule2"]?.["line1_amt"], 11_550, "AMT computed by form6251 = $11,550");

  // Income tax from brackets (line16) and AMT (line17) combine into total
  assertEquals(f["line24_total_tax"], 24_999, "total tax = regular + AMT");
  assertEquals(f["line33_total_payments"], 18_000, "total payments (W-2 withheld)");
  assertEquals(f["line37_amount_owed"], 6_999, "amount owed");
  assertEquals(f["line35a_refund"], undefined, "no refund when AMT fires");
});

// ── Scenario 13: HOH, EITC + CTC with 2 qualifying children ────────────────
//
// HOH filer, W-2 earned income $32,000, 2 qualifying children (ages 8 and 10)
// Withheld: $3,500
//
// EITC (2 children, single/HOH phaseout):
//   Max credit (2 children) = $7,152  (Rev Proc 2024-40)
//   Phase-in ends at $17,880 → credit already at max (earned income $32K > $17,880)
//   Phaseout start (single/HOH, 2 children) = $23,511  (Rev Proc 2024-40, §3.11)
//   Reduction = 0.2106 × ($32,000 − $23,511) = 0.2106 × $8,489 = $1,787.58
//   EITC = max(0, $7,152 − $1,787.58) = $5,364.42 → rounded = $5,364
//
// Regular tax:
//   AGI: $32,000  |  Std ded (HOH): $22,500  |  Taxable: $9,500
//   Tax (10% bracket, HOH): $9,500 × 0.10 = $950
//
// CTC (Form 8812, OBBBA TY2025):
//   2 qualifying children × $2,200 = $4,400 tentative CTC
//   Phase-out threshold (HOH) = $200,000; $32,000 << threshold → no reduction
//   Nonrefundable CTC = min($4,400, $950 income_tax) = $950 → tax reduced to $0
//   Unused CTC for ACTC = $4,400 − $950 = $3,450
//   ACTC cap = 2 × $1,700 = $3,400; earned income: ($32,000 − $2,500) × 15% = $4,425
//   ACTC = min($3,450, $3,400, $4,425) = $3,400
//
// f1040 total payments = $3,500 (withheld) + $5,364 (EITC) + $3,400 (ACTC) = $12,264
// Total tax = $0 (income tax $950 − CTC $950)
// Refund = $12,264 − $0 = $12,264

Deno.test("Scenario 13: HOH, EITC + CTC 2 qualifying children $32K — refund $12,264", () => {
  const result = runReturn({
    general: {
      ...hohGeneral(),
      dependents: [
        {
          first_name: "Child1",
          last_name: "Taxpayer",
          dob: "2017-06-15",  // age 8 at 12/31/2025
          relationship: DependentRelationship.Son,
          months_in_home: 12,
          ssn: "111-22-3334",
        },
        {
          first_name: "Child2",
          last_name: "Taxpayer",
          dob: "2015-03-20",  // age 10 at 12/31/2025
          relationship: DependentRelationship.Daughter,
          months_in_home: 12,
          ssn: "111-22-3335",
        },
      ],
    },
    w2: [w2Item(32_000, 3_500)],
  });

  // EITC should be $5,364
  assertEquals(
    result.pending["eitc"]?.["qualifying_children"], 2,
    "eitc sees 2 qualifying children",
  );

  const f = result.pending["f1040"] ?? {};

  // CTC zeroes out tax; ACTC $3,400 flows as refundable credit
  assertEquals(f["line24_total_tax"], 0, "total tax = $0 after CTC");
  assertEquals(f["line33_total_payments"], 12_264, "total payments = withheld + EITC + ACTC");
  assertEquals(f["line35a_refund"], 12_264, "refund = $12,264");
  assertEquals(f["line37_amount_owed"], undefined, "no amount owed");
});

// ── Scenario 14: MFJ, CTC + ACTC with 3 qualifying children ─────────────────
//
// MFJ, W-2 $85,000 combined, 3 qualifying children under 17, withheld $8,000
//
// Tax:
//   AGI: $85,000  |  Std ded (MFJ): $31,500  |  Taxable: $53,500
//   Tax (12% bracket): $2,385 + ($53,500 − $23,850) × 0.12
//     = $2,385 + $29,650 × 0.12 = $2,385 + $3,558 = $5,943
//
// CTC (Form 8812):
//   Tentative CTC = 3 × $2,200 = $6,600  (OBBBA TY2025)
//   Phase-out threshold (MFJ) = $400,000; $85,000 << $400,000 → no reduction
//   creditAfterPhaseOut = $6,600
//   Nonrefundable CTC = min($6,600, $5,943 income_tax_liability) = $5,943
//     → reduces f1040 line22 to $0
//   CTC unused (potential ACTC) = $6,600 − $5,943 = $657
//
// ACTC (Form 8812 Part II-A, < 3 children in refundable path):
//   ACTC cap = 3 × $1,700 = $5,100
//   Earned income based = ($85,000 − $2,500) × 0.15 = $82,500 × 0.15 = $12,375
//   tentativeACTC = min($657, $5,100) = $657
//   ACTC = min($657, $12,375) = $657
//
// f1040:
//   line19 = 0, line20 (nonrefundable CTC via Schedule 3) = $5,943
//   line22 = max(0, $5,943 − $5,943) = $0
//   line24 (total tax) = $0
//   line28 (ACTC) = $657
//   Total payments = $8,000 + $657 = $8,657
//   Refund = $8,657 − $0 = $8,657

Deno.test("Scenario 14: MFJ, CTC + ACTC, 3 children, $85K — refund $8,657", () => {
  const result = runReturn({
    general: {
      ...mfjGeneral(),
      dependents: [
        {
          first_name: "Child1",
          last_name: "Taxpayer",
          dob: "2010-05-01",  // age 15 at 12/31/2025
          relationship: DependentRelationship.Son,
          months_in_home: 12,
          ssn: "111-22-3336",
        },
        {
          first_name: "Child2",
          last_name: "Taxpayer",
          dob: "2012-08-15",  // age 13 at 12/31/2025
          relationship: DependentRelationship.Daughter,
          months_in_home: 12,
          ssn: "111-22-3338",
        },
        {
          first_name: "Child3",
          last_name: "Taxpayer",
          dob: "2014-11-30",  // age 11 at 12/31/2025
          relationship: DependentRelationship.Son,
          months_in_home: 12,
          ssn: "111-22-3339",
        },
      ],
    },
    w2: [w2Item(85_000, 8_000)],
    f8812: [
      {
        qualifying_children_count: 3,
        agi: 85_000,
        filing_status: FilingStatus.MFJ,
        earned_income: 85_000,
        income_tax_liability: 5_943,  // pre-computed above
      },
    ],
  });

  // Tax calculation
  assertEquals(
    result.pending["income_tax_calculation"]?.["taxable_income"], 53_500,
    "taxable income = $85K − $31,500 std ded",
  );

  const f = result.pending["f1040"] ?? {};

  // Nonrefundable CTC flows through Schedule 3 → f1040 line20
  assertEquals(f["line20_nonrefundable_credits"], 5_943, "nonrefundable CTC = $5,943");

  // Total tax is $0 (CTC wipes out the $5,943 tax liability)
  assertEquals(f["line24_total_tax"], 0, "total tax = $0 (CTC absorbs all tax)");

  // Payments = $8,000 withheld + $657 ACTC refundable
  assertEquals(f["line33_total_payments"], 8_657, "total payments = $8,657");
  assertEquals(f["line35a_refund"], 8_657, "refund = $8,657");
  assertEquals(f["line37_amount_owed"], undefined, "no amount owed");
});

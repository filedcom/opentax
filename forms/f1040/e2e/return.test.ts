/**
 * E2E integration tests for complete F1040 return computation.
 *
 * These tests run real taxpayer datasets through the node graph executor
 * and assert specific Form 1040 line values. They exercise the full stack:
 * start → input nodes → intermediate nodes → output nodes.
 *
 * Pending dict semantics:
 *   pending["<nodeType>"] holds the fields *deposited to* that node by upstream
 *   nodes. For example, pending["standard_deduction"] contains the fields
 *   consumed by the standard_deduction node (agi, filing_status, …), NOT its
 *   outputs. Outputs are deposited to f1040's pending.
 *
 *   pending["f1040"] holds all deposits from all upstream nodes PLUS the
 *   assembled result from the f1040 node's own assembleReturn(). Fields that
 *   arrive from both upstream nodes and assembleReturn end up as arrays.
 *   The final summary lines (line24_total_tax, line33_total_payments,
 *   line35a_refund, line37_amount_owed) are only written by assembleReturn
 *   and are always scalar — these are the authoritative computed totals.
 */

import { assertEquals } from "@std/assert";
import { buildExecutionPlan } from "../../../core/runtime/planner.ts";
import { execute, type ExecuteResult } from "../../../core/runtime/executor.ts";
import { registry } from "../2025/registry.ts";
import { FilingStatus } from "../nodes/types.ts";

// ── Shared context ────────────────────────────────────────────────────────────

const ctx = { taxYear: 2025, formType: "f1040" };

// Build the plan once — it is purely structural (registry topology only).
const plan = buildExecutionPlan(registry);

// ── Helper ────────────────────────────────────────────────────────────────────

function runReturn(inputs: Record<string, unknown>): ExecuteResult {
  return execute(plan, registry, inputs, ctx);
}

// ── Scenario 1: Simple wage earner (Single, W-2 only) ────────────────────────
//
// Single filer, TY2025, W-2 wages $75,000, federal withholding $11,000.
// No other income, no credits, no adjustments.
//
// 2025 Single brackets on $59,250 taxable income:
//   10% × $11,925                       = $1,192.50
//   12% × ($48,475 − $11,925)           = 12% × $36,550 = $4,386.00
//   22% × ($59,250 − $48,475)           = 22% × $10,775 = $2,370.50
//   Total                               = $7,949.00
//
// Expected pipeline:
//   agi_aggregator.line1a_wages         = $75,000
//   standard_deduction inputs: agi      = $75,000, filing_status = single
//   income_tax_calculation inputs:
//     taxable_income                    = $59,250  (75,000 − 15,750)
//     filing_status                     = single
//   f1040 scalars:
//     line24_total_tax                  = $7,949
//     line33_total_payments             = $11,000
//     line35a_refund                    = $3,051

Deno.test("E2E Scenario 1: single W-2 wage earner — wages flow through AGI, standard deduction, tax calculation to final refund", () => {
  const result = runReturn({
    general: {
      filing_status: FilingStatus.Single,
      taxpayer_first_name: "Jane",
      taxpayer_last_name: "Doe",
      taxpayer_ssn: "123-45-6789",
      taxpayer_dob: "1985-06-15",
    },
    w2: [
      {
        box1_wages: 75_000,
        box2_fed_withheld: 11_000,
        box3_ss_wages: 75_000,
        box4_ss_withheld: 4_650,
        box5_medicare_wages: 75_000,
        box6_medicare_withheld: 1_087.50,
        employer_ein: "12-3456789",
        employer_name: "ACME Corp",
        box12_entries: [],
      },
    ],
  });

  // ── AGI aggregator ─────────────────────────────────────────────────────────
  // The w2 node deposits line1a_wages to agi_aggregator.
  // This confirms wages are correctly routed upstream before AGI is computed.
  assertEquals(
    result.pending["agi_aggregator"]?.["line1a_wages"],
    75_000,
    "agi_aggregator should receive line1a_wages = $75,000 from the w2 node",
  );

  // ── Standard deduction node inputs ────────────────────────────────────────
  // The standard_deduction node receives AGI and filing_status.
  // For Single 2025 with no age/blind factors, the node emits $15,750.
  // We verify the inputs it received (its pending dict), confirming the
  // AGI pipeline is correctly wired.
  assertEquals(
    result.pending["standard_deduction"]?.["agi"],
    75_000,
    "standard_deduction node should receive agi = $75,000",
  );
  assertEquals(
    result.pending["standard_deduction"]?.["filing_status"],
    FilingStatus.Single,
    "standard_deduction node should receive filing_status = single",
  );

  // ── Income tax calculation node inputs ────────────────────────────────────
  // The income_tax_calculation node receives taxable_income = AGI − standard deduction.
  // Taxable income = 75,000 − 15,750 = 59,250.
  assertEquals(
    result.pending["income_tax_calculation"]?.["taxable_income"],
    59_250,
    "income_tax_calculation should receive taxable_income = $59,250",
  );
  assertEquals(
    result.pending["income_tax_calculation"]?.["filing_status"],
    FilingStatus.Single,
    "income_tax_calculation should receive filing_status = single",
  );

  // ── F1040 final scalar summary ─────────────────────────────────────────────
  // The f1040 assembleReturn writes these scalars: they are the authoritative
  // computed totals and are never duplicated by upstream deposits.
  const f1040 = result.pending["f1040"] ?? {};

  assertEquals(
    f1040["line24_total_tax"],
    7_949,
    "line24_total_tax should be $7,949 (bracket tax, no AMT/other taxes)",
  );

  assertEquals(
    f1040["line33_total_payments"],
    11_000,
    "line33_total_payments should be $11,000 (W-2 withholding only)",
  );

  // Refund = payments − tax = 11,000 − 7,949 = 3,051
  assertEquals(
    f1040["line35a_refund"],
    3_051,
    "line35a_refund should be $3,051",
  );

  assertEquals(
    f1040["line37_amount_owed"],
    undefined,
    "line37_amount_owed should be absent when there is a refund",
  );
});

// ── Scenario 2: Self-employed with Schedule C and SE deduction ────────────────
//
// Single filer, TY2025, Schedule C net profit $80,000, no W-2 income.
// No payments or withholding.
//
// SE tax on $80,000 net profit:
//   Net earnings for SE = $80,000 × 0.9235 = $73,880
//   SE tax = $73,880 × 0.153 = $11,303.64
//   SE deduction (half SE tax) = $5,651.82
//
// Expected pipeline:
//   agi_aggregator inputs:
//     line3_schedule_c     = $80,000
//     line15_se_deduction  = $5,651.82
//   standard_deduction inputs:
//     agi                  = $74,348.18  (80,000 − 5,651.82)
//   income_tax_calculation inputs:
//     taxable_income       = $46,878.54  (74,348.18 − 15,750 std ded − QBI)
//   f1040 scalars:
//     line33_total_payments = $0          (no withholding)
//     line37_amount_owed    = line24_total_tax  (owes full computed tax)

Deno.test("E2E Scenario 2: self-employed Schedule C — SE income and SE deduction flow through pipeline to amount owed", () => {
  const result = runReturn({
    general: {
      filing_status: FilingStatus.Single,
      taxpayer_first_name: "Bob",
      taxpayer_last_name: "Builder",
      taxpayer_ssn: "987-65-4321",
      taxpayer_dob: "1978-03-20",
    },
    schedule_c: [
      {
        line_a_principal_business: "Consulting",
        line_b_business_code: "541600",
        line_c_business_name: "Bob Builder LLC",
        line_f_accounting_method: "cash",
        line_g_material_participation: true,
        line_1_gross_receipts: 80_000,
        // No expenses → net profit = $80,000
      },
    ],
  });

  // ── AGI aggregator inputs ──────────────────────────────────────────────────
  // The schedule_c node deposits net profit as line3_schedule_c.
  // The schedule_se node deposits the SE deduction as line15_se_deduction.
  // Both flow through agi_aggregator → AGI → f1040 line11.
  const agg = result.pending["agi_aggregator"] ?? {};

  assertEquals(
    agg["line3_schedule_c"],
    80_000,
    "agi_aggregator should receive line3_schedule_c = $80,000",
  );

  // SE deduction = $80,000 × 0.9235 × 0.153 / 2 = $5,651.82
  const seDeductionInAgg = agg["line15_se_deduction"] as number;
  assertEquals(
    Math.round(seDeductionInAgg * 100) / 100,
    5_651.82,
    "agi_aggregator should receive line15_se_deduction ≈ $5,651.82",
  );

  // ── Standard deduction node inputs ────────────────────────────────────────
  // AGI = 80,000 − 5,651.82 = 74,348.18
  const sdPending = result.pending["standard_deduction"] ?? {};
  assertEquals(
    Math.round((sdPending["agi"] as number) * 100) / 100,
    74_348.18,
    "standard_deduction node should receive agi ≈ $74,348.18",
  );

  // ── Income tax calculation node inputs ────────────────────────────────────
  // Taxable income = 74,348.18 − 15,750 (std ded) − 11,719.64 (QBI deduction) = 46,878.54
  const itcPending = result.pending["income_tax_calculation"] ?? {};
  assertEquals(
    Math.round((itcPending["taxable_income"] as number) * 100) / 100,
    46_878.54,
    "income_tax_calculation should receive taxable_income ≈ $46,878.54",
  );

  // ── F1040 final scalar summary ─────────────────────────────────────────────
  const f1040 = result.pending["f1040"] ?? {};

  // No withholding or estimated payments
  assertEquals(
    f1040["line33_total_payments"],
    0,
    "line33_total_payments should be $0 (no withholding or payments)",
  );

  // Total tax is positive
  const totalTax = f1040["line24_total_tax"] as number;
  assertEquals(
    typeof totalTax,
    "number",
    "line24_total_tax should be a number",
  );
  assertEquals(
    totalTax > 0,
    true,
    "line24_total_tax should be positive for a self-employed filer",
  );

  // Amount owed equals total tax (payments = 0)
  assertEquals(
    f1040["line37_amount_owed"],
    totalTax,
    "line37_amount_owed should equal line24_total_tax when no payments made",
  );

  // No refund
  assertEquals(
    f1040["line35a_refund"],
    undefined,
    "line35a_refund should be absent when there is an amount owed",
  );
});

/**
 * E2E — IRC §469 passive activity loss limit on rental real estate.
 *
 * Form 8582 instructions, Part II: the special allowance is $25,000, reduced by
 * 50% of the amount by which modified adjusted gross income exceeds $100,000,
 * and no special allowance is available once modified AGI reaches $150,000.
 * A loss the allowance does not reach is not deductible this year — it is
 * carried forward, not both deducted and suspended.
 *
 * All amounts here are invented round numbers.
 */

import { assertEquals } from "@std/assert";
import { buildExecutionPlan } from "../../../core/runtime/planner.ts";
import { execute, type ExecuteResult } from "../../../core/runtime/executor.ts";
import { registry } from "../2025/registry.ts";
import { FilingStatus } from "../nodes/types.ts";

const ctx = { taxYear: 2025, formType: "f1040" };
const plan = buildExecutionPlan(registry);

function runReturn(inputs: Record<string, unknown>): ExecuteResult {
  return execute(plan, registry, inputs, ctx);
}

/** AGI as agi_aggregator computed it (scalar; f1040's own copy is an array). */
function agi(result: ExecuteResult): unknown {
  return result.pending["standard_deduction"]?.["agi"];
}

function suspendedPal(result: ExecuteResult): number {
  return result.carryforwards["suspended_pal_8582"] ?? 0;
}

function singleGeneral() {
  return {
    filing_status: FilingStatus.Single,
    taxpayer_first_name: "Test",
    taxpayer_last_name: "Taxpayer",
    taxpayer_dob: "1985-06-15",
  };
}

function mfjGeneral() {
  return {
    filing_status: FilingStatus.MFJ,
    taxpayer_first_name: "Test",
    taxpayer_last_name: "Taxpayer",
    taxpayer_dob: "1985-06-15",
    spouse_first_name: "Spouse",
    spouse_last_name: "Taxpayer",
    spouse_dob: "1987-03-10",
  };
}

function w2Item(wages: number) {
  return {
    box1_wages: wages,
    box2_fed_withheld: 0,
    box3_ss_wages: wages,
    box4_ss_withheld: wages * 0.062,
    box5_medicare_wages: wages,
    box6_medicare_withheld: wages * 0.0145,
    employer_ein: "12-3456789",
    employer_name: "ACME Corp",
    box12_entries: [],
  };
}

/** Active rental real estate (activity type A) with rent income and repairs. */
function rental(rentIncome: number, repairs: number) {
  return {
    tsj: "T",
    property_description: "Rental One",
    property_type: 1,
    activity_type: "A",
    fair_rental_days: 365,
    personal_use_days: 0,
    rent_income: rentIncome,
    form_1099_payments_made: false,
    expense_repairs: repairs,
  };
}

// ── MAGI $200,000: no special allowance at all ──────────────────────────────
//
// MFJ, $200,000 interest, rental rent $10,000 less repairs $30,000 = $20,000 loss.
// Modified AGI is $200,000, which is above the $150,000 cutoff, so the whole
// $20,000 is suspended and AGI stays at $200,000.

Deno.test("§469: MAGI $200,000 — entire $20,000 rental loss suspended, AGI unchanged", () => {
  const result = runReturn({
    general: mfjGeneral(),
    f1099int: [{ payer_name: "Bank", box1: 200_000 }],
    schedule_e: [rental(10_000, 30_000)],
  });

  assertEquals(agi(result), 200_000, "no part of the loss is deductible");
  assertEquals(suspendedPal(result), 20_000, "whole loss carries forward");
  assertEquals(
    result.pending["schedule1"]?.["line10_total_additional_income"], 0,
    "Schedule 1 shows no net rental loss",
  );
});

// ── MAGI $90,000: full $25,000 allowance ───────────────────────────────────
//
// Single, $90,000 wages, rental rent $10,000 less repairs $50,000 = $40,000 loss.
// Modified AGI $90,000 is below $100,000, so $25,000 is allowed and $15,000 is
// suspended. AGI = 90,000 − 25,000.

Deno.test("§469: MAGI $90,000 — $25,000 allowed, $15,000 suspended", () => {
  const result = runReturn({
    general: singleGeneral(),
    w2: [w2Item(90_000)],
    schedule_e: [rental(10_000, 50_000)],
  });

  assertEquals(agi(result), 65_000, "allowance caps the deduction at $25,000");
  assertEquals(suspendedPal(result), 15_000, "remainder carries forward");
});

// ── MAGI $120,000: allowance phased out by 50% of the excess ────────────────
//
// Single, $120,000 wages, rental rent $10,000 less repairs $40,000 = $30,000 loss.
// Allowance = 25,000 − 0.50 × (120,000 − 100,000) = $15,000.

Deno.test("§469: MAGI $120,000 — allowance phased down to $15,000", () => {
  const result = runReturn({
    general: singleGeneral(),
    w2: [w2Item(120_000)],
    schedule_e: [rental(10_000, 40_000)],
  });

  assertEquals(agi(result), 105_000, "half the MAGI excess reduces the allowance");
  assertEquals(suspendedPal(result), 15_000, "disallowed half carries forward");
});

// ── Loss smaller than the allowance is deductible in full ──────────────────

Deno.test("§469: MAGI $80,000 — $10,000 loss fully deductible, nothing suspended", () => {
  const result = runReturn({
    general: singleGeneral(),
    w2: [w2Item(80_000)],
    schedule_e: [rental(10_000, 20_000)],
  });

  assertEquals(agi(result), 70_000, "loss under the allowance is deductible");
  assertEquals(suspendedPal(result), 0, "nothing carries forward");
});

// ── Rental with net income is untouched by §469 ────────────────────────────

Deno.test("§469: rental net income is not limited", () => {
  const result = runReturn({
    general: singleGeneral(),
    w2: [w2Item(80_000)],
    schedule_e: [rental(20_000, 5_000)],
  });

  assertEquals(agi(result), 95_000, "rental income is added in full");
  assertEquals(suspendedPal(result), 0, "no suspended loss");
});

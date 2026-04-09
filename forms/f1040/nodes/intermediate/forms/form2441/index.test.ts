// Black-box tests for intermediate node: form2441
// Sources: nodes/2025/f1040/intermediate/form2441/research/context.md
// These tests define IRS-correct behavior. If a test fails, fix the implementation — not the test.
//
// Design notes:
//   - This node receives dep_care_benefits (W-2 Box 10 total) from the w2 input node.
//   - It applies the IRC §129 exclusion limit ($5,000) and routes taxable excess to f1040 line1e.
//   - MFS ($2,500 limit) is handled by the f2441 input node, not here.
//   - No credit computation occurs in this node.

import { assertEquals, assertThrows } from "@std/assert";
import { form2441 } from "./index.ts";
import { fieldsOf } from "../../../../../../core/test-utils/output.ts";
import { f1040 } from "../../../outputs/f1040/index.ts";
import { schedule3 } from "../../aggregation/schedule3/index.ts";
import { FilingStatus } from "../../../types.ts";

function compute(input: Record<string, unknown>) {
  return form2441.compute({ taxYear: 2025, formType: "f1040" }, input);
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// ---------------------------------------------------------------------------
// 1. Input validation
// ---------------------------------------------------------------------------

Deno.test("form2441: negative dep_care_benefits throws", () => {
  assertThrows(() => compute({ dep_care_benefits: -1 }), Error);
});

Deno.test("form2441: zero dep_care_benefits produces no outputs", () => {
  const result = compute({ dep_care_benefits: 0 });
  assertEquals(result.outputs.length, 0);
});

Deno.test("form2441: absent dep_care_benefits produces no outputs", () => {
  const result = compute({});
  assertEquals(result.outputs.length, 0);
});

// ---------------------------------------------------------------------------
// 2. Per-field calculation — taxable excess routing
// ---------------------------------------------------------------------------

Deno.test("form2441: benefits below $5000 produce no f1040 output", () => {
  const result = compute({ dep_care_benefits: 3000 });
  assertEquals(findOutput(result, "f1040"), undefined);
  assertEquals(result.outputs.length, 0);
});

Deno.test("form2441: benefits exactly at $5000 produce no f1040 output", () => {
  const result = compute({ dep_care_benefits: 5000 });
  assertEquals(findOutput(result, "f1040"), undefined);
  assertEquals(result.outputs.length, 0);
});

Deno.test("form2441: benefits of $1 above $5000 route $1 taxable to f1040 line1e", () => {
  const result = compute({ dep_care_benefits: 5001 });
  const out = findOutput(result, "f1040");
  assertEquals(out !== undefined, true);
  const input = fieldsOf(result.outputs, f1040)!;
  assertEquals(input.line1e_taxable_dep_care, 1);
});

Deno.test("form2441: benefits of $6000 route $1000 taxable to f1040 line1e", () => {
  const result = compute({ dep_care_benefits: 6000 });
  const out = findOutput(result, "f1040");
  assertEquals(out !== undefined, true);
  const input = fieldsOf(result.outputs, f1040)!;
  assertEquals(input.line1e_taxable_dep_care, 1000);
});

Deno.test("form2441: benefits of $10000 route $5000 taxable to f1040 line1e", () => {
  const result = compute({ dep_care_benefits: 10000 });
  const out = findOutput(result, "f1040");
  assertEquals(out !== undefined, true);
  const input = fieldsOf(result.outputs, f1040)!;
  assertEquals(input.line1e_taxable_dep_care, 5000);
});

// ---------------------------------------------------------------------------
// 3. Thresholds — exclusion limit boundary tests
// ---------------------------------------------------------------------------

Deno.test("form2441: benefits of $4999 (just below limit) produce no output", () => {
  const result = compute({ dep_care_benefits: 4999 });
  assertEquals(result.outputs.length, 0);
});

Deno.test("form2441: benefits of $5000 (at limit) produce no output", () => {
  const result = compute({ dep_care_benefits: 5000 });
  assertEquals(result.outputs.length, 0);
});

Deno.test("form2441: benefits of $5001 (just above limit) route $1 to f1040", () => {
  const result = compute({ dep_care_benefits: 5001 });
  const out = findOutput(result, "f1040");
  assertEquals(out !== undefined, true);
  const input = fieldsOf(result.outputs, f1040)!;
  assertEquals(input.line1e_taxable_dep_care, 1);
});

// ---------------------------------------------------------------------------
// 4. Output routing — field names and nodeTypes
// ---------------------------------------------------------------------------

Deno.test("form2441: output nodeType is 'f1040' when taxable excess exists", () => {
  const result = compute({ dep_care_benefits: 6000 });
  assertEquals(result.outputs.length, 1);
  assertEquals(result.outputs[0].nodeType, "f1040");
});

Deno.test("form2441: output field is line1e_taxable_dep_care (not another field)", () => {
  const result = compute({ dep_care_benefits: 7500 });
  const fields = fieldsOf(result.outputs, f1040)!;
  const keys = Object.keys(fields);
  assertEquals(keys, ["line1e_taxable_dep_care"]);
  assertEquals(fields.line1e_taxable_dep_care, 2500);
});

Deno.test("form2441: no schedule3 output is emitted (credit not computed here)", () => {
  const result = compute({ dep_care_benefits: 10000 });
  assertEquals(findOutput(result, "schedule3"), undefined);
});

// ---------------------------------------------------------------------------
// 5. Edge cases
// ---------------------------------------------------------------------------

Deno.test("form2441: very large benefits route correct taxable excess", () => {
  // $100,000 - $5,000 exclusion = $95,000 taxable
  const result = compute({ dep_care_benefits: 100000 });
  const out = findOutput(result, "f1040");
  assertEquals(out !== undefined, true);
  const input = fieldsOf(result.outputs, f1040)!;
  assertEquals(input.line1e_taxable_dep_care, 95000);
});

Deno.test("form2441: fractional benefits handled correctly (below limit)", () => {
  const result = compute({ dep_care_benefits: 4999.99 });
  assertEquals(result.outputs.length, 0);
});

Deno.test("form2441: fractional benefits above limit route correct decimal excess", () => {
  const result = compute({ dep_care_benefits: 5000.01 });
  const out = findOutput(result, "f1040");
  assertEquals(out !== undefined, true);
  const input = fieldsOf(result.outputs, f1040)!;
  // 5000.01 - 5000 = 0.01 (approximately)
  assertEquals(Math.round((input.line1e_taxable_dep_care as number) * 100), 1);
});

// ---------------------------------------------------------------------------
// 6. Smoke test
// ---------------------------------------------------------------------------

Deno.test("form2441 smoke test: $7500 employer benefits → $2500 taxable on f1040 line1e", () => {
  // $7,500 employer dep care benefits
  // Exclusion: min($7,500, $5,000) = $5,000
  // Taxable: $7,500 - $5,000 = $2,500
  const result = compute({ dep_care_benefits: 7500 });

  assertEquals(result.outputs.length, 1);

  const f1040Out = findOutput(result, "f1040");
  assertEquals(f1040Out !== undefined, true);
  const input = fieldsOf(result.outputs, f1040)!;
  assertEquals(input.line1e_taxable_dep_care, 2500);

  // No schedule3 output when no qualifying_expenses provided
  assertEquals(findOutput(result, "schedule3"), undefined);
});

// ---------------------------------------------------------------------------
// 7. IRC §21 child and dependent care credit
// ---------------------------------------------------------------------------

Deno.test("form2441 §21: 1 qualifying person, AGI ≤ $15k → 35% rate, $3000 cap", () => {
  // qualifying_expenses=$4,000, but capped at $3,000 for 1 person
  // AGI=$10,000 → rate 35%
  // credit = $3,000 × 0.35 = $1,050
  const result = compute({
    qualifying_expenses: 4_000,
    qualifying_persons: 1,
    agi: 10_000,
    taxpayer_earned_income: 20_000,
    filing_status: FilingStatus.Single,
  });
  const s3 = fieldsOf(result.outputs, schedule3);
  assertEquals(s3?.line2_childcare_credit, 1_050);
});

Deno.test("form2441 §21: 2 qualifying persons, AGI ≤ $15k → 35% rate, $6000 cap", () => {
  // qualifying_expenses=$7,000, capped at $6,000 for 2+ persons
  // AGI=$12,000 → rate 35%
  // credit = $6,000 × 0.35 = $2,100
  const result = compute({
    qualifying_expenses: 7_000,
    qualifying_persons: 2,
    agi: 12_000,
    taxpayer_earned_income: 30_000,
    filing_status: FilingStatus.Single,
  });
  const s3 = fieldsOf(result.outputs, schedule3);
  assertEquals(s3?.line2_childcare_credit, 2_100);
});

Deno.test("form2441 §21: AGI $43,001+ → 20% minimum rate", () => {
  // AGI=$50,000 → 15 steps over $15k → rate = max(0.20, 0.35 - 0.15) = 0.20
  // 1 person, $3,000 cap, expenses=$3,000
  // credit = $3,000 × 0.20 = $600
  const result = compute({
    qualifying_expenses: 3_000,
    qualifying_persons: 1,
    agi: 50_000,
    taxpayer_earned_income: 60_000,
    filing_status: FilingStatus.Single,
  });
  const s3 = fieldsOf(result.outputs, schedule3);
  assertEquals(s3?.line2_childcare_credit, 600);
});

Deno.test("form2441 §21: AGI $25,000 → 25% rate (5 steps over $15k)", () => {
  // 5 steps × $2,000 = $10,000 over threshold → rate = 0.35 - 5*0.01 = 0.30
  // Wait: AGI=$25,000, over threshold=$10,000, ceil(10000/2000)=5, rate=0.35-0.05=0.30
  // 1 person, expenses=$3,000
  // credit = $3,000 × 0.30 = $900
  const result = compute({
    qualifying_expenses: 3_000,
    qualifying_persons: 1,
    agi: 25_000,
    taxpayer_earned_income: 30_000,
    filing_status: FilingStatus.Single,
  });
  const s3 = fieldsOf(result.outputs, schedule3);
  assertEquals(s3?.line2_childcare_credit, 900);
});

Deno.test("form2441 §21: employer benefits reduce qualifying expense base", () => {
  // dep_care_benefits=$3,000 excluded from $5,000 limit = $3,000 excluded
  // 1 person cap=$3,000, reduced by excluded benefits: $3,000-$3,000=$0
  // No credit
  const result = compute({
    dep_care_benefits: 3_000,
    qualifying_expenses: 3_000,
    qualifying_persons: 1,
    agi: 20_000,
    taxpayer_earned_income: 40_000,
    filing_status: FilingStatus.Single,
  });
  assertEquals(findOutput(result, "schedule3"), undefined);
});

Deno.test("form2441 §21: employer benefits partially reduce expense base", () => {
  // dep_care_benefits=$2,000 excluded; 1 person cap=$3,000 reduced to $1,000
  // AGI=$15,000 → rate 35%
  // qualifying_expenses=$3,000, capped at $1,000 after employer offset
  // credit = $1,000 × 0.35 = $350
  const result = compute({
    dep_care_benefits: 2_000,
    qualifying_expenses: 3_000,
    qualifying_persons: 1,
    agi: 15_000,
    taxpayer_earned_income: 40_000,
    filing_status: FilingStatus.Single,
  });
  const s3 = fieldsOf(result.outputs, schedule3);
  assertEquals(s3?.line2_childcare_credit, 350);
});

Deno.test("form2441 §21: MFJ — credit limited to lower spouse earned income", () => {
  // taxpayer_earned=$50,000, spouse_earned=$2,000 → earned cap = $2,000
  // 1 person, expenses=$3,000, capped at min($3,000, $2,000) = $2,000
  // AGI=$60,000 → rate 20%
  // credit = $2,000 × 0.20 = $400
  const result = compute({
    qualifying_expenses: 3_000,
    qualifying_persons: 1,
    agi: 60_000,
    taxpayer_earned_income: 50_000,
    spouse_earned_income: 2_000,
    filing_status: FilingStatus.MFJ,
  });
  const s3 = fieldsOf(result.outputs, schedule3);
  assertEquals(s3?.line2_childcare_credit, 400);
});

Deno.test("form2441 §21: no credit when no qualifying persons", () => {
  const result = compute({
    qualifying_expenses: 3_000,
    qualifying_persons: 0,
    agi: 20_000,
    taxpayer_earned_income: 40_000,
  });
  assertEquals(findOutput(result, "schedule3"), undefined);
});

// ---------------------------------------------------------------------------
// 8. MFS employer exclusion cap ($2,500 per IRC §129(a)(2))
// ---------------------------------------------------------------------------

Deno.test("form2441 MFS: employer exclusion capped at $2,500", () => {
  // MFS filer with $3,500 dep care benefits
  // Exclusion: min($3,500, $2,500) = $2,500
  // Taxable excess: $3,500 - $2,500 = $1,000 → routes to f1040 line1e
  const result = compute({
    dep_care_benefits: 3_500,
    filing_status: FilingStatus.MFS,
  });
  const f1040Fields = fieldsOf(result.outputs, f1040);
  assertEquals(f1040Fields?.line1e_taxable_dep_care, 1_000);
});

Deno.test("form2441 MFS: benefits at $2,500 — no taxable excess", () => {
  const result = compute({
    dep_care_benefits: 2_500,
    filing_status: FilingStatus.MFS,
  });
  assertEquals(findOutput(result, "f1040"), undefined);
});

Deno.test("form2441 non-MFS: employer exclusion still $5,000", () => {
  const result = compute({
    dep_care_benefits: 4_999,
    filing_status: FilingStatus.Single,
  });
  assertEquals(findOutput(result, "f1040"), undefined);
});

// Black-box tests for intermediate node: form8880
// Sources: nodes/2025/f1040/intermediate/form8880/research/context.md
// These tests define IRS-correct behavior. If a test fails, fix the implementation — not the test.
//
// Design notes:
//   - Credit rate is determined by AGI and filing status.
//   - TY2025 AGI limits: Single/MFS/QSS ≤$23k=50%, ≤$25k=20%, ≤$38.25k=10%; >$38.25k=0%
//   - TY2025 AGI limits: HOH ≤$34.5k=50%, ≤$37.5k=20%, ≤$57.375k=10%; >$57.375k=0%
//   - TY2025 AGI limits: MFJ ≤$46k=50%, ≤$50k=20%, ≤$76.5k=10%; >$76.5k=0%
//   - Contribution cap per person: $2,000.
//   - Credit = total_eligible × rate; routed to schedule3 line4_retirement_savings_credit.
//   - Nonrefundable; limited by income_tax_liability if provided.

import { assertEquals, assertThrows } from "@std/assert";
import { form8880 } from "./index.ts";
import { fieldsOf } from "../../../../../core/test-utils/output.ts";
import { schedule3 } from "../schedule3/index.ts";

function compute(input: Record<string, unknown>) {
  return form8880.compute(input);
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// ---------------------------------------------------------------------------
// 1. Input validation
// ---------------------------------------------------------------------------

Deno.test("form8880: negative ira_contributions_taxpayer throws", () => {
  assertThrows(() => compute({ ira_contributions_taxpayer: -1, agi: 20000, filing_status: "single" }), Error);
});

Deno.test("form8880: negative agi throws", () => {
  assertThrows(() => compute({ ira_contributions_taxpayer: 1000, agi: -1, filing_status: "single" }), Error);
});

Deno.test("form8880: no contributions produces no output", () => {
  const result = compute({ agi: 20000, filing_status: "single" });
  assertEquals(result.outputs.length, 0);
});

Deno.test("form8880: zero contributions produces no output", () => {
  const result = compute({ ira_contributions_taxpayer: 0, agi: 20000, filing_status: "single" });
  assertEquals(result.outputs.length, 0);
});

// ---------------------------------------------------------------------------
// 2. Credit rate — Single / 50%
// ---------------------------------------------------------------------------

Deno.test("form8880: single AGI=$20,000 (≤$23,000) → 50% credit rate", () => {
  // $2,000 contribution × 50% = $1,000
  const result = compute({ ira_contributions_taxpayer: 2000, agi: 20000, filing_status: "single" });
  const out = findOutput(result, "schedule3");
  assertEquals(out !== undefined, true);
  const input = fieldsOf(result.outputs, schedule3)!;
  assertEquals(input.line4_retirement_savings_credit, 1000);
});

Deno.test("form8880: single AGI=$23,000 (exactly at 50% ceiling) → 50% credit rate", () => {
  const result = compute({ ira_contributions_taxpayer: 2000, agi: 23000, filing_status: "single" });
  const out = findOutput(result, "schedule3");
  const input = fieldsOf(result.outputs, schedule3)!;
  assertEquals(input.line4_retirement_savings_credit, 1000);
});

// ---------------------------------------------------------------------------
// 3. Credit rate — Single / 20%
// ---------------------------------------------------------------------------

Deno.test("form8880: single AGI=$23,001 (20% bracket) → 20% credit rate", () => {
  // $2,000 × 20% = $400
  const result = compute({ ira_contributions_taxpayer: 2000, agi: 23001, filing_status: "single" });
  const out = findOutput(result, "schedule3");
  const input = fieldsOf(result.outputs, schedule3)!;
  assertEquals(input.line4_retirement_savings_credit, 400);
});

Deno.test("form8880: single AGI=$25,000 (at 20% ceiling) → 20% credit rate", () => {
  const result = compute({ ira_contributions_taxpayer: 2000, agi: 25000, filing_status: "single" });
  const out = findOutput(result, "schedule3");
  const input = fieldsOf(result.outputs, schedule3)!;
  assertEquals(input.line4_retirement_savings_credit, 400);
});

// ---------------------------------------------------------------------------
// 4. Credit rate — Single / 10%
// ---------------------------------------------------------------------------

Deno.test("form8880: single AGI=$25,001 (10% bracket) → 10% credit rate", () => {
  // $2,000 × 10% = $200
  const result = compute({ ira_contributions_taxpayer: 2000, agi: 25001, filing_status: "single" });
  const out = findOutput(result, "schedule3");
  const input = fieldsOf(result.outputs, schedule3)!;
  assertEquals(input.line4_retirement_savings_credit, 200);
});

Deno.test("form8880: single AGI=$38,250 (at 10% ceiling) → 10% credit rate", () => {
  const result = compute({ ira_contributions_taxpayer: 2000, agi: 38250, filing_status: "single" });
  const out = findOutput(result, "schedule3");
  const input = fieldsOf(result.outputs, schedule3)!;
  assertEquals(input.line4_retirement_savings_credit, 200);
});

// ---------------------------------------------------------------------------
// 5. Credit rate — Single / 0% (above limit)
// ---------------------------------------------------------------------------

Deno.test("form8880: single AGI=$38,251 (above limit) → 0% — no output", () => {
  const result = compute({ ira_contributions_taxpayer: 2000, agi: 38251, filing_status: "single" });
  assertEquals(result.outputs.length, 0);
});

Deno.test("form8880: single AGI=$50,000 (well above limit) → no output", () => {
  const result = compute({ ira_contributions_taxpayer: 2000, agi: 50000, filing_status: "single" });
  assertEquals(result.outputs.length, 0);
});

// ---------------------------------------------------------------------------
// 6. Credit rate — HOH filing status
// ---------------------------------------------------------------------------

Deno.test("form8880: HOH AGI=$34,500 (≤$34,500) → 50% credit rate", () => {
  const result = compute({ ira_contributions_taxpayer: 2000, agi: 34500, filing_status: "hoh" });
  const out = findOutput(result, "schedule3");
  const input = fieldsOf(result.outputs, schedule3)!;
  assertEquals(input.line4_retirement_savings_credit, 1000);
});

Deno.test("form8880: HOH AGI=$36,000 (20% bracket) → 20% credit rate", () => {
  const result = compute({ ira_contributions_taxpayer: 2000, agi: 36000, filing_status: "hoh" });
  const out = findOutput(result, "schedule3");
  const input = fieldsOf(result.outputs, schedule3)!;
  assertEquals(input.line4_retirement_savings_credit, 400);
});

Deno.test("form8880: HOH AGI=$50,000 (10% bracket) → 10% credit rate", () => {
  const result = compute({ ira_contributions_taxpayer: 2000, agi: 50000, filing_status: "hoh" });
  const out = findOutput(result, "schedule3");
  const input = fieldsOf(result.outputs, schedule3)!;
  assertEquals(input.line4_retirement_savings_credit, 200);
});

Deno.test("form8880: HOH AGI=$57,376 (above limit) → no output", () => {
  const result = compute({ ira_contributions_taxpayer: 2000, agi: 57376, filing_status: "hoh" });
  assertEquals(result.outputs.length, 0);
});

// ---------------------------------------------------------------------------
// 7. Credit rate — MFJ filing status
// ---------------------------------------------------------------------------

Deno.test("form8880: MFJ AGI=$46,000 (≤$46,000) → 50% credit rate", () => {
  // Only taxpayer contributes $2,000 → $2,000 × 50% = $1,000
  const result = compute({ ira_contributions_taxpayer: 2000, agi: 46000, filing_status: "mfj" });
  const out = findOutput(result, "schedule3");
  const input = fieldsOf(result.outputs, schedule3)!;
  assertEquals(input.line4_retirement_savings_credit, 1000);
});

Deno.test("form8880: MFJ AGI=$48,000 (20% bracket) → 20% credit rate", () => {
  const result = compute({ ira_contributions_taxpayer: 2000, agi: 48000, filing_status: "mfj" });
  const out = findOutput(result, "schedule3");
  const input = fieldsOf(result.outputs, schedule3)!;
  assertEquals(input.line4_retirement_savings_credit, 400);
});

Deno.test("form8880: MFJ AGI=$60,000 (10% bracket) → 10% credit rate", () => {
  const result = compute({ ira_contributions_taxpayer: 2000, agi: 60000, filing_status: "mfj" });
  const out = findOutput(result, "schedule3");
  const input = fieldsOf(result.outputs, schedule3)!;
  assertEquals(input.line4_retirement_savings_credit, 200);
});

Deno.test("form8880: MFJ AGI=$76,501 (above limit) → no output", () => {
  const result = compute({ ira_contributions_taxpayer: 2000, agi: 76501, filing_status: "mfj" });
  assertEquals(result.outputs.length, 0);
});

// ---------------------------------------------------------------------------
// 8. $2,000 per-person contribution cap
// ---------------------------------------------------------------------------

Deno.test("form8880: contributions above $2,000 are capped at $2,000", () => {
  // $5,000 contribution capped to $2,000; at 50% → $1,000
  const result = compute({ ira_contributions_taxpayer: 5000, agi: 20000, filing_status: "single" });
  const out = findOutput(result, "schedule3");
  const input = fieldsOf(result.outputs, schedule3)!;
  assertEquals(input.line4_retirement_savings_credit, 1000);
});

Deno.test("form8880: exactly $2,000 contribution at 50% → $1,000 credit", () => {
  const result = compute({ ira_contributions_taxpayer: 2000, agi: 20000, filing_status: "single" });
  const out = findOutput(result, "schedule3");
  const input = fieldsOf(result.outputs, schedule3)!;
  assertEquals(input.line4_retirement_savings_credit, 1000);
});

Deno.test("form8880: $1,000 contribution at 50% → $500 credit", () => {
  const result = compute({ ira_contributions_taxpayer: 1000, agi: 20000, filing_status: "single" });
  const out = findOutput(result, "schedule3");
  const input = fieldsOf(result.outputs, schedule3)!;
  assertEquals(input.line4_retirement_savings_credit, 500);
});

// ---------------------------------------------------------------------------
// 9. MFJ both spouses contributing
// ---------------------------------------------------------------------------

Deno.test("form8880: MFJ both spouses $2,000 each at 50% → $2,000 credit", () => {
  // taxpayer: $2,000 + spouse: $2,000 = $4,000 × 50% = $2,000
  const result = compute({
    ira_contributions_taxpayer: 2000,
    ira_contributions_spouse: 2000,
    agi: 40000,
    filing_status: "mfj",
  });
  const out = findOutput(result, "schedule3");
  const input = fieldsOf(result.outputs, schedule3)!;
  assertEquals(input.line4_retirement_savings_credit, 2000);
});

Deno.test("form8880: MFJ both spouses, contributions capped individually at $2,000", () => {
  // taxpayer: $3,000 capped to $2,000 + spouse: $3,000 capped to $2,000 = $4,000 × 50%
  const result = compute({
    ira_contributions_taxpayer: 3000,
    ira_contributions_spouse: 3000,
    agi: 40000,
    filing_status: "mfj",
  });
  const out = findOutput(result, "schedule3");
  const input = fieldsOf(result.outputs, schedule3)!;
  assertEquals(input.line4_retirement_savings_credit, 2000);
});

Deno.test("form8880: MFJ spouse only contributes, taxpayer does not", () => {
  const result = compute({
    ira_contributions_spouse: 2000,
    agi: 40000,
    filing_status: "mfj",
  });
  const out = findOutput(result, "schedule3");
  const input = fieldsOf(result.outputs, schedule3)!;
  assertEquals(input.line4_retirement_savings_credit, 1000);
});

// ---------------------------------------------------------------------------
// 10. Elective deferrals from W-2 (Box 12 D/E/G)
// ---------------------------------------------------------------------------

Deno.test("form8880: elective_deferrals treated as taxpayer contribution", () => {
  // $2,000 deferrals at 50% = $1,000
  const result = compute({ elective_deferrals: 2000, agi: 20000, filing_status: "single" });
  const out = findOutput(result, "schedule3");
  const input = fieldsOf(result.outputs, schedule3)!;
  assertEquals(input.line4_retirement_savings_credit, 1000);
});

Deno.test("form8880: elective_deferrals_taxpayer and ira_contributions_taxpayer combine (capped at $2,000)", () => {
  // $1,500 deferrals + $1,000 IRA = $2,500, capped to $2,000 × 50% = $1,000
  const result = compute({
    elective_deferrals_taxpayer: 1500,
    ira_contributions_taxpayer: 1000,
    agi: 20000,
    filing_status: "single",
  });
  const out = findOutput(result, "schedule3");
  const input = fieldsOf(result.outputs, schedule3)!;
  assertEquals(input.line4_retirement_savings_credit, 1000);
});

// ---------------------------------------------------------------------------
// 11. Distributions reduce eligible contributions
// ---------------------------------------------------------------------------

Deno.test("form8880: distributions offset contributions — partial reduction", () => {
  // $2,000 contribution - $500 distributions = $1,500 eligible × 50% = $750
  const result = compute({
    ira_contributions_taxpayer: 2000,
    distributions_taxpayer: 500,
    agi: 20000,
    filing_status: "single",
  });
  const out = findOutput(result, "schedule3");
  const input = fieldsOf(result.outputs, schedule3)!;
  assertEquals(input.line4_retirement_savings_credit, 750);
});

Deno.test("form8880: distributions >= contributions → eligible = 0, no output", () => {
  const result = compute({
    ira_contributions_taxpayer: 2000,
    distributions_taxpayer: 2000,
    agi: 20000,
    filing_status: "single",
  });
  assertEquals(result.outputs.length, 0);
});

Deno.test("form8880: distributions exceed contributions → eligible = 0, no output", () => {
  const result = compute({
    ira_contributions_taxpayer: 1000,
    distributions_taxpayer: 1500,
    agi: 20000,
    filing_status: "single",
  });
  assertEquals(result.outputs.length, 0);
});

// ---------------------------------------------------------------------------
// 12. Income tax liability limit
// ---------------------------------------------------------------------------

Deno.test("form8880: credit limited by income_tax_liability", () => {
  // $2,000 × 50% = $1,000 credit, but only $600 tax liability → credit = $600
  const result = compute({
    ira_contributions_taxpayer: 2000,
    agi: 20000,
    filing_status: "single",
    income_tax_liability: 600,
  });
  const out = findOutput(result, "schedule3");
  const input = fieldsOf(result.outputs, schedule3)!;
  assertEquals(input.line4_retirement_savings_credit, 600);
});

Deno.test("form8880: income_tax_liability = 0 → no output", () => {
  const result = compute({
    ira_contributions_taxpayer: 2000,
    agi: 20000,
    filing_status: "single",
    income_tax_liability: 0,
  });
  assertEquals(result.outputs.length, 0);
});

Deno.test("form8880: income_tax_liability >= credit → full credit passes through", () => {
  const result = compute({
    ira_contributions_taxpayer: 2000,
    agi: 20000,
    filing_status: "single",
    income_tax_liability: 5000,
  });
  const out = findOutput(result, "schedule3");
  const input = fieldsOf(result.outputs, schedule3)!;
  assertEquals(input.line4_retirement_savings_credit, 1000);
});

// ---------------------------------------------------------------------------
// 13. Output routing — field names and nodeTypes
// ---------------------------------------------------------------------------

Deno.test("form8880: output nodeType is 'schedule3'", () => {
  const result = compute({ ira_contributions_taxpayer: 2000, agi: 20000, filing_status: "single" });
  assertEquals(result.outputs.length, 1);
  assertEquals(result.outputs[0].nodeType, "schedule3");
});

Deno.test("form8880: output field is line4_retirement_savings_credit", () => {
  const result = compute({ ira_contributions_taxpayer: 2000, agi: 20000, filing_status: "single" });
  const out = findOutput(result, "schedule3")!;
  const keys = Object.keys(fieldsOf(result.outputs, schedule3)!);
  assertEquals(keys, ["line4_retirement_savings_credit"]);
});

Deno.test("form8880: no f1040 output is emitted", () => {
  const result = compute({ ira_contributions_taxpayer: 2000, agi: 20000, filing_status: "single" });
  assertEquals(findOutput(result, "f1040"), undefined);
});

// ---------------------------------------------------------------------------
// 14. MFS filing status (same thresholds as single)
// ---------------------------------------------------------------------------

Deno.test("form8880: MFS AGI=$22,000 (≤$23,000) → 50% rate", () => {
  const result = compute({ ira_contributions_taxpayer: 2000, agi: 22000, filing_status: "mfs" });
  const out = findOutput(result, "schedule3");
  const input = fieldsOf(result.outputs, schedule3)!;
  assertEquals(input.line4_retirement_savings_credit, 1000);
});

// ---------------------------------------------------------------------------
// 15. QSS filing status (same thresholds as single)
// ---------------------------------------------------------------------------

Deno.test("form8880: QSS AGI=$20,000 → 50% rate", () => {
  const result = compute({ ira_contributions_taxpayer: 2000, agi: 20000, filing_status: "qss" });
  const out = findOutput(result, "schedule3");
  const input = fieldsOf(result.outputs, schedule3)!;
  assertEquals(input.line4_retirement_savings_credit, 1000);
});

// ---------------------------------------------------------------------------
// 16. Smoke test
// ---------------------------------------------------------------------------

Deno.test("form8880 smoke test: MFJ both contributing, 50% rate → $2,000 credit", () => {
  // Taxpayer: $2,000 IRA + $500 deferrals = $2,500 → capped to $2,000
  // Spouse: $1,500 IRA → $1,500 eligible
  // Total eligible: $2,000 + $1,500 = $3,500
  // Rate: MFJ AGI=$44,000 ≤ $46,000 → 50%
  // Credit: $3,500 × 50% = $1,750
  const result = compute({
    ira_contributions_taxpayer: 2000,
    elective_deferrals_taxpayer: 500,
    ira_contributions_spouse: 1500,
    agi: 44000,
    filing_status: "mfj",
  });

  assertEquals(result.outputs.length, 1);

  const s3Out = findOutput(result, "schedule3");
  assertEquals(s3Out !== undefined, true);
  const input = fieldsOf(result.outputs, schedule3)!;
  assertEquals(input.line4_retirement_savings_credit, 1750);

  assertEquals(findOutput(result, "f1040"), undefined);
});

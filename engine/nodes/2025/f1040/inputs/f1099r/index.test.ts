// NOTE FOR IMPLEMENTORS:
// This is a black-box test file generated from context.md only.
// Before running, verify:
//   1. The import name matches the exported singleton — `r1099`
//   2. The input wrapper key — `r1099s` — matches compute()'s parameter
//   3. The nodeType strings: "f1040", "form5329", "form4972", "form8606"
//   4. f1040 input field names used here are derived from existing passing tests:
//      line4a_ira_gross, line4b_ira_taxable, line5a_pension_gross,
//      line5b_pension_taxable, line25b_withheld_1099, line1a_wages
//   5. form5329 input field names: early_distribution, distribution_code
//   6. form4972 input field name: lump_sum_amount
//   7. form8606 input field name — AMBIGUOUS (not confirmed in context.md)
//   8. QCD exclusion field names on f1040 — AMBIGUOUS
//   9. PSO premium exclusion field on f1040 line5b — AMBIGUOUS
//  10. disability_as_wages routing field on f1040 line1a — AMBIGUOUS
//  11. rollover_code handling behaviour — AMBIGUOUS (exact field names not confirmed)
//  12. simplified_method_flag output reduction field — AMBIGUOUS
// These tests define the IRS-correct behaviour — if a test fails, fix the
// implementation, not the test.
//
// AMBIGUITIES:
//   A. form8606 input field names (for rollover_code=C and exclude_8606_roth) are
//      not specified in context.md
//   B. QCD exclusion line4b reduction: whether the node emits a separate output or
//      reduces the combined f1040 line4b value directly
//   C. PSO premium cap enforcement field name on line5b output
//   D. disability line1a field name on f1040
//   E. Simplified Method exclusion output field / reduced line5b field name
//   F. rollover_code = S / G zero-taxable behaviour: whether line4b/5b emits 0 or omits

import { assertEquals, assertThrows } from "@std/assert";
import { z } from "zod";
import { DistributionCode, RolloverCode, f1099r, itemSchema } from "./index.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type Item = z.infer<typeof itemSchema>;

function minimalIraItem(overrides: Partial<Item> = {}): Item {
  return {
    payer_name: "Test Payer",
    payer_ein: "12-3456789",
    box1_gross_distribution: 10000,
    box7_distribution_code: DistributionCode.Code7,
    box7_ira_sep_simple: true,
    ...overrides,
  };
}

function minimalPensionItem(overrides: Partial<Item> = {}): Item {
  return {
    payer_name: "Test Pension",
    payer_ein: "98-7654321",
    box1_gross_distribution: 10000,
    box7_distribution_code: DistributionCode.Code7,
    box7_ira_sep_simple: false,
    ...overrides,
  };
}

function compute(items: Item[]) {
  return f1099r.compute({ f1099rs: items });
}

function findF1040(result: ReturnType<typeof compute>) {
  return result.outputs.find((o) => o.nodeType === "f1040");
}

function f1040Input(result: ReturnType<typeof compute>) {
  return (findF1040(result)?.fields ?? {}) as Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// 1. Input schema validation
// ---------------------------------------------------------------------------

Deno.test("f1099r.compute: missing payer_name throws", () => {
  assertThrows(() =>
    compute([{
      payer_ein: "12-3456789",
      box1_gross_distribution: 5000,
      box7_distribution_code: DistributionCode.Code7,
      box7_ira_sep_simple: true,
    } as Item])
  );
});

Deno.test("f1099r.compute: missing payer_ein throws", () => {
  assertThrows(() =>
    compute([{
      payer_name: "Fidelity",
      box1_gross_distribution: 5000,
      box7_distribution_code: DistributionCode.Code7,
      box7_ira_sep_simple: true,
    } as Item])
  );
});

Deno.test("f1099r.compute: missing box1_gross_distribution throws", () => {
  assertThrows(() =>
    compute([{
      payer_name: "Fidelity",
      payer_ein: "04-1234567",
      box7_distribution_code: DistributionCode.Code7,
      box7_ira_sep_simple: true,
    } as Item])
  );
});

Deno.test("f1099r.compute: missing box7_distribution_code throws", () => {
  assertThrows(() =>
    compute([{
      payer_name: "Fidelity",
      payer_ein: "04-1234567",
      box1_gross_distribution: 5000,
      box7_ira_sep_simple: true,
    } as Item])
  );
});

Deno.test("f1099r.compute: negative box1_gross_distribution throws", () => {
  assertThrows(() =>
    compute([minimalIraItem({ box1_gross_distribution: -1 })])
  );
});

Deno.test("f1099r.compute: negative box2a_taxable_amount throws", () => {
  assertThrows(() =>
    compute([minimalIraItem({ box2a_taxable_amount: -1 })])
  );
});

Deno.test("f1099r.compute: negative box4_federal_withheld throws", () => {
  assertThrows(() =>
    compute([minimalIraItem({ box4_federal_withheld: -1 })])
  );
});

Deno.test("f1099r.compute: empty items array throws", () => {
  assertThrows(() => compute([]));
});

Deno.test("f1099r.compute: zero box1_gross_distribution is valid", () => {
  const result = compute([minimalIraItem({ box1_gross_distribution: 0 })]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("f1099r.compute: zero box2a_taxable_amount is valid", () => {
  const result = compute([minimalIraItem({ box2a_taxable_amount: 0 })]);
  assertEquals(Array.isArray(result.outputs), true);
});

// ---------------------------------------------------------------------------
// 2. Per-box routing (IRA vs pension, plus basic positive/zero cases)
// ---------------------------------------------------------------------------

Deno.test("f1099r.compute: IRA distribution routes to f1040 lines 4a/4b", () => {
  const result = compute([minimalIraItem({
    box1_gross_distribution: 10000,
    box2a_taxable_amount: 10000,
  })]);
  const input = f1040Input(result);
  assertEquals(input.line4a_ira_gross, 10000);
  assertEquals(input.line4b_ira_taxable, 10000);
});

Deno.test("f1099r.compute: pension distribution routes to f1040 lines 5a/5b", () => {
  const result = compute([minimalPensionItem({
    box1_gross_distribution: 24000,
    box2a_taxable_amount: 20000,
  })]);
  const input = f1040Input(result);
  assertEquals(input.line5a_pension_gross, 24000);
  assertEquals(input.line5b_pension_taxable, 20000);
});

Deno.test("f1099r.compute: IRA routing uses gross as taxable when box2a absent", () => {
  const result = compute([minimalIraItem({
    box1_gross_distribution: 5000,
  })]);
  const input = f1040Input(result);
  assertEquals(input.line4a_ira_gross, 5000);
  assertEquals(input.line4b_ira_taxable, 5000);
});

Deno.test("f1099r.compute: pension routing uses gross as taxable when box2a absent", () => {
  const result = compute([minimalPensionItem({
    box1_gross_distribution: 18000,
  })]);
  const input = f1040Input(result);
  assertEquals(input.line5a_pension_gross, 18000);
  assertEquals(input.line5b_pension_taxable, 18000);
});

Deno.test("f1099r.compute: omitted box7_ira_sep_simple defaults to pension routing", () => {
  const result = compute([{
    payer_name: "State Pension",
    payer_ein: "99-1234567",
    box1_gross_distribution: 30000,
    box7_distribution_code: DistributionCode.Code7,
  }]);
  const input = f1040Input(result);
  assertEquals(input.line5a_pension_gross, 30000);
  assertEquals(input.line5b_pension_taxable, 30000);
});

Deno.test("f1099r.compute: box4_federal_withheld > 0 routes to f1040 line25b", () => {
  const result = compute([minimalIraItem({ box4_federal_withheld: 2000 })]);
  const withholding = result.outputs.find(
    (o) =>
      o.nodeType === "f1040" &&
      (o.fields as Record<string, unknown>).line25b_withheld_1099 !== undefined,
  );
  assertEquals(withholding !== undefined, true);
  assertEquals(
    (withholding!.fields as Record<string, unknown>).line25b_withheld_1099,
    2000,
  );
});

Deno.test("f1099r.compute: no box4 does not emit line25b", () => {
  const result = compute([minimalPensionItem()]);
  const withholding = result.outputs.find(
    (o) =>
      o.nodeType === "f1040" &&
      (o.fields as Record<string, unknown>).line25b_withheld_1099 !== undefined,
  );
  assertEquals(withholding, undefined);
});

Deno.test("f1099r.compute: distribution code 1 routes to form5329", () => {
  const result = compute([minimalIraItem({
    box1_gross_distribution: 15000,
    box2a_taxable_amount: 15000,
    box7_distribution_code: DistributionCode.Code1,
  })]);
  const form5329 = result.outputs.find((o) => o.nodeType === "form5329");
  assertEquals(form5329 !== undefined, true);
  const input = form5329!.fields as Record<string, unknown>;
  assertEquals(input.early_distribution, 15000);
  assertEquals(input.distribution_code, "1");
});

Deno.test("f1099r.compute: distribution code 2 does not route to form5329 automatically", () => {
  const result = compute([minimalIraItem({ box7_distribution_code: DistributionCode.Code2 })]);
  const form5329 = result.outputs.find((o) => o.nodeType === "form5329");
  assertEquals(form5329, undefined);
});

Deno.test("f1099r.compute: distribution code 7 does not route to form5329", () => {
  const result = compute([minimalPensionItem({ box7_distribution_code: DistributionCode.Code7 })]);
  const form5329 = result.outputs.find((o) => o.nodeType === "form5329");
  assertEquals(form5329, undefined);
});

Deno.test("f1099r.compute: distribution code 5 routes to form4972", () => {
  const result = compute([minimalPensionItem({
    box1_gross_distribution: 100000,
    box7_distribution_code: DistributionCode.Code5,
  })]);
  const form4972 = result.outputs.find((o) => o.nodeType === "form4972");
  assertEquals(form4972 !== undefined, true);
  const input = form4972!.fields as Record<string, unknown>;
  assertEquals(input.lump_sum_amount, 100000);
});

Deno.test("f1099r.compute: distribution code 7 does not route to form4972", () => {
  const result = compute([minimalPensionItem({ box7_distribution_code: DistributionCode.Code7 })]);
  const form4972 = result.outputs.find((o) => o.nodeType === "form4972");
  assertEquals(form4972, undefined);
});

Deno.test("f1099r.compute: exclude_8606_roth routes to form8606", () => {
  const result = compute([minimalIraItem({
    box7_distribution_code: DistributionCode.CodeJ,
    exclude_8606_roth: true,
  })]);
  const form8606 = result.outputs.find((o) => o.nodeType === "form8606");
  assertEquals(form8606 !== undefined, true);
});

Deno.test("f1099r.compute: rollover_code C routes to form8606", () => {
  const result = compute([minimalIraItem({
    rollover_code: RolloverCode.C,
    box2a_taxable_amount: 10000,
  })]);
  const form8606 = result.outputs.find((o) => o.nodeType === "form8606");
  assertEquals(form8606 !== undefined, true);
});

Deno.test("f1099r.compute: disability_flag + disability_as_wages routes to f1040 line1a", () => {
  const result = compute([minimalPensionItem({
    box7_distribution_code: DistributionCode.Code3,
    disability_flag: true,
    disability_as_wages: true,
  })]);
  const wagesOutput = result.outputs.find(
    (o) =>
      o.nodeType === "f1040" &&
      (o.fields as Record<string, unknown>).line1a_wages !== undefined,
  );
  assertEquals(wagesOutput !== undefined, true);
});

Deno.test("f1099r.compute: no_distribution_received suppresses all income outputs", () => {
  const result = compute([minimalIraItem({
    box1_gross_distribution: 50000,
    box2a_taxable_amount: 50000,
    box4_federal_withheld: 10000,
    no_distribution_received: true,
  })]);
  const incomeOutput = result.outputs.find(
    (o) =>
      o.nodeType === "f1040" &&
      ((o.fields as Record<string, unknown>).line4a_ira_gross !== undefined ||
        (o.fields as Record<string, unknown>).line4b_ira_taxable !== undefined),
  );
  assertEquals(incomeOutput, undefined);
});

Deno.test("f1099r.compute: box6_nua does not produce schedule_d output at distribution", () => {
  const baseResult = compute([minimalPensionItem({
    box1_gross_distribution: 50000,
    box2a_taxable_amount: 20000,
  })]);
  const nuaResult = compute([minimalPensionItem({
    box1_gross_distribution: 50000,
    box2a_taxable_amount: 20000,
    box6_nua: 15000,
  })]);
  assertEquals(
    nuaResult.outputs.find((o) => o.nodeType === "schedule_d"),
    undefined,
  );
  assertEquals(baseResult.outputs.length, nuaResult.outputs.length);
});

// ---------------------------------------------------------------------------
// 3. Aggregation
// ---------------------------------------------------------------------------

Deno.test("f1099r.compute: multiple IRA items aggregate line4a correctly", () => {
  const result = compute([
    minimalIraItem({ box1_gross_distribution: 5000, box2a_taxable_amount: 4000 }),
    minimalIraItem({ box1_gross_distribution: 7000, box2a_taxable_amount: 6500 }),
  ]);
  const input = f1040Input(result);
  assertEquals(input.line4a_ira_gross, 12000);
});

Deno.test("f1099r.compute: multiple IRA items aggregate line4b correctly", () => {
  const result = compute([
    minimalIraItem({ box1_gross_distribution: 5000, box2a_taxable_amount: 3000 }),
    minimalIraItem({ box1_gross_distribution: 7000, box2a_taxable_amount: 4000 }),
  ]);
  const input = f1040Input(result);
  assertEquals(input.line4b_ira_taxable, 7000);
});

Deno.test("f1099r.compute: multiple pension items aggregate line5a correctly", () => {
  const result = compute([
    minimalPensionItem({ box1_gross_distribution: 6000, box2a_taxable_amount: 5000 }),
    minimalPensionItem({ box1_gross_distribution: 9000, box2a_taxable_amount: 8000 }),
  ]);
  const input = f1040Input(result);
  assertEquals(input.line5a_pension_gross, 15000);
});

Deno.test("f1099r.compute: multiple pension items aggregate line5b correctly", () => {
  const result = compute([
    minimalPensionItem({ box1_gross_distribution: 6000, box2a_taxable_amount: 5000 }),
    minimalPensionItem({ box1_gross_distribution: 9000, box2a_taxable_amount: 6000 }),
  ]);
  const input = f1040Input(result);
  assertEquals(input.line5b_pension_taxable, 11000);
});

Deno.test("f1099r.compute: multiple items aggregate box4_federal_withheld to single line25b", () => {
  const result = compute([
    minimalIraItem({ box4_federal_withheld: 1000 }),
    minimalPensionItem({ box4_federal_withheld: 1500 }),
  ]);
  const withholdingOutputs = result.outputs.filter(
    (o) =>
      o.nodeType === "f1040" &&
      (o.fields as Record<string, unknown>).line25b_withheld_1099 !== undefined,
  );
  const total = withholdingOutputs.reduce(
    (sum, o) =>
      sum + ((o.fields as Record<string, unknown>).line25b_withheld_1099 as number),
    0,
  );
  assertEquals(total, 2500);
});

Deno.test("f1099r.compute: mixed IRA and pension items do not cross-contaminate lines", () => {
  const result = compute([
    minimalIraItem({ box1_gross_distribution: 5000, box2a_taxable_amount: 5000 }),
    minimalPensionItem({ box1_gross_distribution: 6000, box2a_taxable_amount: 6000 }),
  ]);
  const input = f1040Input(result);
  assertEquals(input.line4a_ira_gross, 5000);
  assertEquals(input.line5a_pension_gross, 6000);
});

// ---------------------------------------------------------------------------
// 4. Thresholds
// ---------------------------------------------------------------------------

Deno.test("f1099r.compute: QCD partial amount below $108,000 reduces line4b", () => {
  const result = compute([minimalIraItem({
    box1_gross_distribution: 60000,
    box2a_taxable_amount: 60000,
    qcd_partial_amount: 50000,
  })]);
  const input = f1040Input(result);
  // line4a remains full gross; line4b is reduced by QCD amount
  assertEquals(input.line4a_ira_gross, 60000);
  assertEquals(input.line4b_ira_taxable, 10000);
});

Deno.test("f1099r.compute: QCD at exactly $108,000 limit is accepted", () => {
  const result = compute([minimalIraItem({
    box1_gross_distribution: 108000,
    box2a_taxable_amount: 108000,
    qcd_partial_amount: 108000,
  })]);
  assertEquals(Array.isArray(result.outputs), true);
  const input = f1040Input(result);
  assertEquals(input.line4a_ira_gross, 108000);
  assertEquals(input.line4b_ira_taxable, 0);
});

Deno.test("f1099r.compute: QCD full flag caps exclusion at $108,000 when gross exceeds limit", () => {
  const result = compute([minimalIraItem({
    box1_gross_distribution: 200000,
    box2a_taxable_amount: 200000,
    qcd_full: true,
  })]);
  const input = f1040Input(result);
  // line4b should not go negative; max exclusion is 108000
  assertEquals(input.line4a_ira_gross, 200000);
  assertEquals(input.line4b_ira_taxable, 92000); // 200000 - 108000
});

Deno.test("f1099r.compute: PSO premium below $3,000 reduces line5b", () => {
  const result = compute([minimalPensionItem({
    box1_gross_distribution: 30000,
    box2a_taxable_amount: 30000,
    pso_premium: 1500,
  })]);
  const input = f1040Input(result);
  assertEquals(input.line5b_pension_taxable, 28500);
});

Deno.test("f1099r.compute: PSO premium at exactly $3,000 applies full exclusion", () => {
  const result = compute([minimalPensionItem({
    box1_gross_distribution: 30000,
    box2a_taxable_amount: 30000,
    pso_premium: 3000,
  })]);
  const input = f1040Input(result);
  assertEquals(input.line5b_pension_taxable, 27000);
});

Deno.test("f1099r.compute: PSO premium above $3,000 is capped at $3,000 exclusion", () => {
  const result = compute([minimalPensionItem({
    box1_gross_distribution: 30000,
    box2a_taxable_amount: 30000,
    pso_premium: 4000,
  })]);
  const input = f1040Input(result);
  // Only $3,000 may be excluded; not $4,000
  assertEquals(input.line5b_pension_taxable, 27000);
});

// Simplified Method Table 1 — the node uses age_at_annuity_start to look up
// expected_months; the test verifies line5b is reduced by cost_in_contract / months
// × payments_in_year. Since we cannot observe internal expected_months directly,
// we verify via a known arithmetic outcome.
// age ≤55 → 360 months. Monthly exclusion = 12000 / 360 = 33.33/mo × 12 = $400/yr.
Deno.test("f1099r.compute: Simplified Method Table1 age ≤55 uses 360 months", () => {
  const result = compute([minimalPensionItem({
    box1_gross_distribution: 12000,
    box2a_taxable_amount: 12000,
    simplified_method_flag: true,
    cost_in_contract: 12000,
    age_at_annuity_start: 55,
  })]);
  const input = f1040Input(result);
  // 12000 / 360 * 12 = 400 excludable; taxable = 12000 - 400 = 11600
  assertEquals(input.line5b_pension_taxable, 11600);
});

// age 56–60 → 310 months. 12000/310*12 ≈ 464.52 → line5b = 12000 - 464 = 11536 (rounded)
Deno.test("f1099r.compute: Simplified Method Table1 age 56–60 uses 310 months", () => {
  const result = compute([minimalPensionItem({
    box1_gross_distribution: 12000,
    box2a_taxable_amount: 12000,
    simplified_method_flag: true,
    cost_in_contract: 12000,
    age_at_annuity_start: 60,
  })]);
  const input = f1040Input(result);
  // 12000 / 310 * 12 ≈ 464.52; taxable = 12000 - 464 = 11536 (floor to cent)
  // Accept either 11535 or 11536 depending on rounding
  const taxable = input.line5b_pension_taxable as number;
  assertEquals(taxable >= 11535 && taxable <= 11536, true);
});

// age 61–65 → 260 months. 12000/260*12 ≈ 553.85; taxable ≈ 11446
Deno.test("f1099r.compute: Simplified Method Table1 age 61–65 uses 260 months", () => {
  const result = compute([minimalPensionItem({
    box1_gross_distribution: 12000,
    box2a_taxable_amount: 12000,
    simplified_method_flag: true,
    cost_in_contract: 12000,
    age_at_annuity_start: 65,
  })]);
  const input = f1040Input(result);
  const taxable = input.line5b_pension_taxable as number;
  assertEquals(taxable >= 11446 && taxable <= 11447, true);
});

// age 66–70 → 210 months. 12000/210*12 ≈ 685.71; taxable ≈ 11314
Deno.test("f1099r.compute: Simplified Method Table1 age 66–70 uses 210 months", () => {
  const result = compute([minimalPensionItem({
    box1_gross_distribution: 12000,
    box2a_taxable_amount: 12000,
    simplified_method_flag: true,
    cost_in_contract: 12000,
    age_at_annuity_start: 70,
  })]);
  const input = f1040Input(result);
  const taxable = input.line5b_pension_taxable as number;
  assertEquals(taxable >= 11314 && taxable <= 11315, true);
});

// age ≥71 → 160 months. 12000/160*12 = 900; taxable = 11100
Deno.test("f1099r.compute: Simplified Method Table1 age ≥71 uses 160 months", () => {
  const result = compute([minimalPensionItem({
    box1_gross_distribution: 12000,
    box2a_taxable_amount: 12000,
    simplified_method_flag: true,
    cost_in_contract: 12000,
    age_at_annuity_start: 71,
  })]);
  const input = f1040Input(result);
  assertEquals(input.line5b_pension_taxable, 11100);
});

// Table 2 — joint annuity. combined ≤110 → 410 months. 12000/410*12≈351.22; taxable≈11649
Deno.test("f1099r.compute: Simplified Method Table2 combined ages ≤110 uses 410 months", () => {
  const result = compute([minimalPensionItem({
    box1_gross_distribution: 12000,
    box2a_taxable_amount: 12000,
    simplified_method_flag: true,
    cost_in_contract: 12000,
    joint_annuity: true,
    combined_ages_at_start: 110,
  })]);
  const input = f1040Input(result);
  const taxable = input.line5b_pension_taxable as number;
  assertEquals(taxable >= 11648 && taxable <= 11650, true);
});

// combined 111–120 → 360 months. Same arithmetic as Table1 age ≤55.
Deno.test("f1099r.compute: Simplified Method Table2 combined ages 111–120 uses 360 months", () => {
  const result = compute([minimalPensionItem({
    box1_gross_distribution: 12000,
    box2a_taxable_amount: 12000,
    simplified_method_flag: true,
    cost_in_contract: 12000,
    joint_annuity: true,
    combined_ages_at_start: 115,
  })]);
  const input = f1040Input(result);
  assertEquals(input.line5b_pension_taxable, 11600);
});

// combined 121–130 → 310 months.
Deno.test("f1099r.compute: Simplified Method Table2 combined ages 121–130 uses 310 months", () => {
  const result = compute([minimalPensionItem({
    box1_gross_distribution: 12000,
    box2a_taxable_amount: 12000,
    simplified_method_flag: true,
    cost_in_contract: 12000,
    joint_annuity: true,
    combined_ages_at_start: 125,
  })]);
  const input = f1040Input(result);
  const taxable = input.line5b_pension_taxable as number;
  assertEquals(taxable >= 11535 && taxable <= 11536, true);
});

// combined 131–140 → 260 months.
Deno.test("f1099r.compute: Simplified Method Table2 combined ages 131–140 uses 260 months", () => {
  const result = compute([minimalPensionItem({
    box1_gross_distribution: 12000,
    box2a_taxable_amount: 12000,
    simplified_method_flag: true,
    cost_in_contract: 12000,
    joint_annuity: true,
    combined_ages_at_start: 135,
  })]);
  const input = f1040Input(result);
  const taxable = input.line5b_pension_taxable as number;
  assertEquals(taxable >= 11446 && taxable <= 11447, true);
});

// combined ≥141 → 210 months.
Deno.test("f1099r.compute: Simplified Method Table2 combined ages ≥141 uses 210 months", () => {
  const result = compute([minimalPensionItem({
    box1_gross_distribution: 12000,
    box2a_taxable_amount: 12000,
    simplified_method_flag: true,
    cost_in_contract: 12000,
    joint_annuity: true,
    combined_ages_at_start: 141,
  })]);
  const input = f1040Input(result);
  const taxable = input.line5b_pension_taxable as number;
  assertEquals(taxable >= 11314 && taxable <= 11315, true);
});

// ---------------------------------------------------------------------------
// 5. Hard validation rules
// ---------------------------------------------------------------------------

Deno.test("f1099r.compute: box3_capital_gain exceeding box2a_taxable throws", () => {
  assertThrows(() =>
    compute([minimalPensionItem({
      box2a_taxable_amount: 8000,
      box3_capital_gain: 10000,
    })])
  );
});

Deno.test("f1099r.compute: box3_capital_gain equal to box2a_taxable is valid", () => {
  const result = compute([minimalPensionItem({
    box2a_taxable_amount: 5000,
    box3_capital_gain: 5000,
  })]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("f1099r.compute: box9a_pct_total above 100 throws", () => {
  assertThrows(() =>
    compute([minimalIraItem({ box9a_pct_total: 101 })])
  );
});

Deno.test("f1099r.compute: box9a_pct_total at 100 is valid", () => {
  const result = compute([minimalIraItem({ box9a_pct_total: 100 })]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("f1099r.compute: negative box9a_pct_total throws", () => {
  assertThrows(() =>
    compute([minimalIraItem({ box9a_pct_total: -1 })])
  );
});

Deno.test("f1099r.compute: distribution code 1 uses gross when box2a absent for form5329", () => {
  const result = compute([minimalIraItem({
    box1_gross_distribution: 7000,
    box7_distribution_code: DistributionCode.Code1,
  })]);
  const form5329 = result.outputs.find((o) => o.nodeType === "form5329");
  const input = form5329!.fields as Record<string, unknown>;
  assertEquals(input.early_distribution, 7000);
});

// ---------------------------------------------------------------------------
// 6. Warning-only rules (must NOT throw)
// ---------------------------------------------------------------------------

Deno.test("f1099r.compute: altered_or_handwritten does not throw", () => {
  const result = compute([minimalIraItem({ altered_or_handwritten: true })]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("f1099r.compute: box2b_not_determined does not throw", () => {
  const result = compute([minimalIraItem({ box2b_not_determined: true })]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("f1099r.compute: box2b_total_dist does not throw", () => {
  const result = compute([minimalPensionItem({ box2b_total_dist: true })]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("f1099r.compute: box12_fatca does not throw", () => {
  const result = compute([minimalIraItem({ box12_fatca: true })]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("f1099r.compute: code J without exclude_8606_roth does not throw", () => {
  const result = compute([minimalIraItem({
    box7_distribution_code: DistributionCode.CodeJ,
    box2a_taxable_amount: 5000,
  })]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("f1099r.compute: disability_flag alone without disability_as_wages does not throw", () => {
  const result = compute([minimalPensionItem({
    box7_distribution_code: DistributionCode.Code3,
    disability_flag: true,
  })]);
  assertEquals(Array.isArray(result.outputs), true);
});

// ---------------------------------------------------------------------------
// 7. Informational fields (output count unchanged)
// ---------------------------------------------------------------------------

Deno.test("f1099r.compute: box13_date_of_payment does not affect output count", () => {
  const withoutDate = compute([minimalIraItem()]);
  const withDate = compute([minimalIraItem({ box13_date_of_payment: "2025-06-15" })]);
  assertEquals(withDate.outputs.length, withoutDate.outputs.length);
});

Deno.test("f1099r.compute: account_number does not affect output count", () => {
  const without = compute([minimalIraItem()]);
  const with_ = compute([minimalIraItem({ account_number: "ACC-123456" })]);
  assertEquals(with_.outputs.length, without.outputs.length);
});

Deno.test("f1099r.compute: box15_payer_state does not affect output count", () => {
  const without = compute([minimalPensionItem()]);
  const with_ = compute([minimalPensionItem({ box15_payer_state: "CA" })]);
  assertEquals(with_.outputs.length, without.outputs.length);
});

Deno.test("f1099r.compute: box18_locality_name does not affect output count", () => {
  const without = compute([minimalPensionItem()]);
  const with_ = compute([minimalPensionItem({ box18_locality_name: "City of Springfield" })]);
  assertEquals(with_.outputs.length, without.outputs.length);
});

Deno.test("f1099r.compute: box9b_total_employee_contributions does not affect output count without simplified_method", () => {
  const without = compute([minimalPensionItem()]);
  const with_ = compute([minimalPensionItem({ box9b_total_employee_contributions: 5000 })]);
  assertEquals(with_.outputs.length, without.outputs.length);
});

// ---------------------------------------------------------------------------
// 8. Edge cases
// ---------------------------------------------------------------------------

Deno.test("f1099r.compute: code G direct rollover produces zero taxable on IRA line", () => {
  const result = compute([minimalIraItem({
    box1_gross_distribution: 5000,
    box2a_taxable_amount: 5000,
    box7_distribution_code: DistributionCode.CodeG,
    rollover_code: RolloverCode.G,
  })]);
  const input = f1040Input(result);
  assertEquals(input.line4a_ira_gross, 5000);
  assertEquals(input.line4b_ira_taxable, 0);
});

Deno.test("f1099r.compute: code S rollover produces zero taxable", () => {
  const result = compute([minimalIraItem({
    box1_gross_distribution: 8000,
    box2a_taxable_amount: 8000,
    box7_distribution_code: DistributionCode.CodeG,
    rollover_code: RolloverCode.S,
  })]);
  const input = f1040Input(result);
  assertEquals(input.line4b_ira_taxable, 0);
});

Deno.test("f1099r.compute: code Q qualified Roth produces zero taxable", () => {
  const result = compute([minimalIraItem({
    box1_gross_distribution: 20000,
    box2a_taxable_amount: 0,
    box7_distribution_code: DistributionCode.CodeQ,
  })]);
  const input = f1040Input(result);
  assertEquals(input.line4b_ira_taxable, 0);
});

Deno.test("f1099r.compute: code T qualified Roth produces zero taxable", () => {
  const result = compute([minimalIraItem({
    box1_gross_distribution: 20000,
    box2a_taxable_amount: 0,
    box7_distribution_code: DistributionCode.CodeT,
  })]);
  const input = f1040Input(result);
  assertEquals(input.line4b_ira_taxable, 0);
});

Deno.test("f1099r.compute: code N recharacterization produces no income routing", () => {
  const result = compute([minimalIraItem({
    box7_distribution_code: DistributionCode.CodeN,
    box2a_taxable_amount: 0,
  })]);
  const input = f1040Input(result);
  const taxable = (input.line4b_ira_taxable ?? 0) as number;
  assertEquals(taxable, 0);
});

Deno.test("f1099r.compute: code R recharacterization prior year produces no income", () => {
  const result = compute([minimalIraItem({
    box7_distribution_code: DistributionCode.CodeR,
    box2a_taxable_amount: 0,
  })]);
  const input = f1040Input(result);
  const taxable = (input.line4b_ira_taxable ?? 0) as number;
  assertEquals(taxable, 0);
});

Deno.test("f1099r.compute: code 6 section 1035 exchange produces zero taxable", () => {
  const result = compute([minimalPensionItem({
    box7_distribution_code: DistributionCode.Code6,
    box2a_taxable_amount: 0,
  })]);
  const input = f1040Input(result);
  const taxable = (input.line5b_pension_taxable ?? 0) as number;
  assertEquals(taxable, 0);
});

Deno.test("f1099r.compute: code W long-term care produces no income", () => {
  const result = compute([minimalPensionItem({
    box7_distribution_code: DistributionCode.CodeW,
    box2a_taxable_amount: 0,
  })]);
  const input = f1040Input(result);
  const taxable = (input.line5b_pension_taxable ?? 0) as number;
  assertEquals(taxable, 0);
});

Deno.test("f1099r.compute: code Y accepted without throw (TY2025 QCD code)", () => {
  const result = compute([minimalIraItem({
    box7_distribution_code: DistributionCode.CodeY,
    box7_code2: DistributionCode.Code7,
    box2a_taxable_amount: 0,
  })]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("f1099r.compute: code B designated Roth routes to pension lines not IRA lines", () => {
  // 401k Roth (box7_ira_sep_simple = false, code B)
  const result = compute([{
    payer_name: "401k Provider",
    payer_ein: "55-1234567",
    box1_gross_distribution: 15000,
    box2a_taxable_amount: 5000,
    box7_distribution_code: DistributionCode.CodeB,
    box7_ira_sep_simple: false,
  }]);
  const input = f1040Input(result);
  assertEquals(input.line5a_pension_gross, 15000);
  // IRA lines should not be populated
  assertEquals(input.line4a_ira_gross, undefined);
});

Deno.test("f1099r.compute: qcd_full with IRA item reduces line4b not line5b", () => {
  const result = compute([
    minimalIraItem({
      box1_gross_distribution: 20000,
      box2a_taxable_amount: 20000,
      qcd_full: true,
    }),
    minimalPensionItem({
      box1_gross_distribution: 10000,
      box2a_taxable_amount: 10000,
    }),
  ]);
  const input = f1040Input(result);
  // IRA taxable is reduced by QCD (capped at 20000, within 108000 limit)
  assertEquals(input.line4b_ira_taxable, 0);
  // Pension taxable is untouched
  assertEquals(input.line5b_pension_taxable, 10000);
});

Deno.test("f1099r.compute: mixed IRA and pension items aggregate independently", () => {
  const result = compute([
    minimalIraItem({ box1_gross_distribution: 5000, box2a_taxable_amount: 5000 }),
    minimalIraItem({ box1_gross_distribution: 3000, box2a_taxable_amount: 3000 }),
    minimalPensionItem({ box1_gross_distribution: 6000, box2a_taxable_amount: 6000 }),
  ]);
  const input = f1040Input(result);
  assertEquals(input.line4a_ira_gross, 8000);
  assertEquals(input.line5a_pension_gross, 6000);
});

Deno.test("f1099r.compute: no_distribution_received true retains no income even with large amounts", () => {
  const result = compute([minimalPensionItem({
    box1_gross_distribution: 100000,
    box2a_taxable_amount: 90000,
    box4_federal_withheld: 20000,
    no_distribution_received: true,
  })]);
  // None of the income lines or withholding should appear
  const incomeOutput = result.outputs.find(
    (o) =>
      o.nodeType === "f1040" &&
      ((o.fields as Record<string, unknown>).line5a_pension_gross !== undefined ||
        (o.fields as Record<string, unknown>).line25b_withheld_1099 !== undefined),
  );
  assertEquals(incomeOutput, undefined);
});

// ---------------------------------------------------------------------------
// 9. Smoke test
// ---------------------------------------------------------------------------

Deno.test("f1099r.compute: smoke test — IRA + pension + withholding + QCD + PSO + code 1", () => {
  // IRA item: $50,000 gross, $45,000 taxable, $9,000 withheld, $10,000 QCD
  // Pension item: $30,000 gross, $28,000 taxable, $5,600 withheld, $2,000 PSO
  // Early dist IRA item: $15,000 gross (code 1 → form5329)
  const result = compute([
    minimalIraItem({
      payer_ein: "01-1111111",
      box1_gross_distribution: 50000,
      box2a_taxable_amount: 45000,
      box4_federal_withheld: 9000,
      qcd_partial_amount: 10000,
    }),
    minimalPensionItem({
      payer_ein: "02-2222222",
      box1_gross_distribution: 30000,
      box2a_taxable_amount: 28000,
      box4_federal_withheld: 5600,
      pso_premium: 2000,
    }),
    minimalIraItem({
      payer_ein: "03-3333333",
      box1_gross_distribution: 15000,
      box2a_taxable_amount: 15000,
      box7_distribution_code: DistributionCode.Code1,
    }),
  ]);

  // Verify downstream forms are present
  const f1040 = result.outputs.find((o) => o.nodeType === "f1040");
  assertEquals(f1040 !== undefined, true);

  const form5329 = result.outputs.find((o) => o.nodeType === "form5329");
  assertEquals(form5329 !== undefined, true);

  const input = f1040!.fields as Record<string, unknown>;

  // IRA gross = 50000 + 15000 = 65000
  assertEquals(input.line4a_ira_gross, 65000);
  // IRA taxable = (45000 - 10000 QCD) + 15000 = 50000
  assertEquals(input.line4b_ira_taxable, 50000);

  // Pension gross = 30000
  assertEquals(input.line5a_pension_gross, 30000);
  // Pension taxable = 28000 - 2000 PSO = 26000
  assertEquals(input.line5b_pension_taxable, 26000);

  // Total withholding = 9000 + 5600 = 14600
  const withholdingOutputs = result.outputs.filter(
    (o) =>
      o.nodeType === "f1040" &&
      (o.fields as Record<string, unknown>).line25b_withheld_1099 !== undefined,
  );
  const totalWithholding = withholdingOutputs.reduce(
    (sum, o) =>
      sum + ((o.fields as Record<string, unknown>).line25b_withheld_1099 as number),
    0,
  );
  assertEquals(totalWithholding, 14600);

  // form5329 early distribution = 15000
  const f5329Input = form5329!.fields as Record<string, unknown>;
  assertEquals(f5329Input.early_distribution, 15000);
});

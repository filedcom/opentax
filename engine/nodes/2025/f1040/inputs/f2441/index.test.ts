import { assertEquals, assertThrows } from "@std/assert";
import { f2441 } from "./index.ts";
import { FilingStatus } from "../../types.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type Item = {
  qualifying_person_count?: number;
  qualifying_expenses_paid?: number;
  employer_dep_care_benefits?: number;
  agi?: number;
  filing_status?: FilingStatus;
  earned_income_taxpayer?: number;
  earned_income_spouse?: number;
};

function compute(items: Item[]) {
  return f2441.compute({ f2441s: items });
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// ---------------------------------------------------------------------------
// 1. Input schema validation
// ---------------------------------------------------------------------------

Deno.test("f2441: empty array throws (min 1 required)", () => {
  assertThrows(() => compute([]), Error);
});

Deno.test("f2441: negative qualifying_expenses_paid throws", () => {
  assertThrows(
    () => compute([{ qualifying_expenses_paid: -1, qualifying_person_count: 1 }]),
    Error,
  );
});

Deno.test("f2441: negative employer_dep_care_benefits throws", () => {
  assertThrows(
    () => compute([{ employer_dep_care_benefits: -100 }]),
    Error,
  );
});

Deno.test("f2441: negative agi throws", () => {
  assertThrows(
    () => compute([{ agi: -1, qualifying_expenses_paid: 1000 }]),
    Error,
  );
});

Deno.test("f2441: qualifying_person_count of 0 throws (min 1)", () => {
  assertThrows(
    () => compute([{ qualifying_person_count: 0, qualifying_expenses_paid: 1000 }]),
    Error,
  );
});

Deno.test("f2441: minimal item (all defaults) does not throw", () => {
  const result = compute([{}]);
  assertEquals(Array.isArray(result.outputs), true);
});

// ---------------------------------------------------------------------------
// 2. Per-box routing — positive cases and zero-value cases
// ---------------------------------------------------------------------------

Deno.test("f2441: qualifying expenses with agi >$43000 route credit to schedule3", () => {
  const result = compute([{
    qualifying_expenses_paid: 3000,
    qualifying_person_count: 1,
    agi: 50000,
  }]);
  const out = findOutput(result, "schedule3");
  assertEquals(out !== undefined, true);
  const input = out!.fields as Record<string, unknown>;
  assertEquals(input.line2_childcare_credit !== undefined, true);
});

Deno.test("f2441: zero qualifying expenses produces no schedule3 output", () => {
  const result = compute([{
    qualifying_expenses_paid: 0,
    qualifying_person_count: 1,
    agi: 50000,
  }]);
  assertEquals(findOutput(result, "schedule3"), undefined);
});

Deno.test("f2441: employer benefits exceeding exclusion route taxable excess to f1040 line1e", () => {
  const result = compute([{
    employer_dep_care_benefits: 6000,
    qualifying_person_count: 1,
  }]);
  const out = findOutput(result, "f1040");
  assertEquals(out !== undefined, true);
  const input = out!.fields as Record<string, unknown>;
  assertEquals(typeof input.line1e_taxable_dep_care, "number");
  assertEquals((input.line1e_taxable_dep_care as number) > 0, true);
});

Deno.test("f2441: employer benefits at or below exclusion limit produce no f1040 output", () => {
  const result = compute([{
    employer_dep_care_benefits: 5000,
    qualifying_person_count: 1,
  }]);
  assertEquals(findOutput(result, "f1040"), undefined);
});

Deno.test("f2441: no employer benefits produces no f1040 output", () => {
  const result = compute([{
    qualifying_expenses_paid: 2000,
    qualifying_person_count: 1,
    agi: 50000,
  }]);
  assertEquals(findOutput(result, "f1040"), undefined);
});

// ---------------------------------------------------------------------------
// 3. Aggregation — multiple items in one compute() call
// ---------------------------------------------------------------------------

Deno.test("f2441: credits from two items are summed in output", () => {
  // Two separate filing data items — each contributes credit
  const result = compute([
    { qualifying_expenses_paid: 1000, qualifying_person_count: 1, agi: 50000 },
    { qualifying_expenses_paid: 1000, qualifying_person_count: 1, agi: 50000 },
  ]);
  const outs = result.outputs.filter((o) => o.nodeType === "schedule3");
  // Either one aggregated output or two; total credit should be 2 * (1000 * 0.20) = 400
  const total = outs.reduce(
    (sum, o) => sum + ((o.fields as Record<string, unknown>).line2_childcare_credit as number),
    0,
  );
  assertEquals(total, 400);
});

Deno.test("f2441: taxable employer benefits from two items are summed", () => {
  const result = compute([
    { employer_dep_care_benefits: 6000 },
    { employer_dep_care_benefits: 6000 },
  ]);
  const outs = result.outputs.filter((o) => o.nodeType === "f1040");
  const total = outs.reduce(
    (sum, o) => sum + ((o.fields as Record<string, unknown>).line1e_taxable_dep_care as number),
    0,
  );
  // Each item: 6000 - 5000 = 1000 taxable; total = 2000
  assertEquals(total, 2000);
});

// ---------------------------------------------------------------------------
// 4. Thresholds
// ---------------------------------------------------------------------------

// --- Expense cap: 1 qualifying person ($3,000) ---

Deno.test("f2441: expenses below $3000 cap (1 person) — credit uses actual expenses", () => {
  const result = compute([{
    qualifying_expenses_paid: 2000,
    qualifying_person_count: 1,
    agi: 50000,
  }]);
  const input = findOutput(result, "schedule3")!.fields as Record<string, unknown>;
  // 2000 * 0.20 = 400
  assertEquals(input.line2_childcare_credit, 400);
});

Deno.test("f2441: expenses exactly at $3000 cap (1 person) — credit uses $3000", () => {
  const result = compute([{
    qualifying_expenses_paid: 3000,
    qualifying_person_count: 1,
    agi: 50000,
  }]);
  const input = findOutput(result, "schedule3")!.fields as Record<string, unknown>;
  // 3000 * 0.20 = 600
  assertEquals(input.line2_childcare_credit, 600);
});

Deno.test("f2441: expenses above $3000 cap (1 person) — credit capped at $3000 base", () => {
  const result = compute([{
    qualifying_expenses_paid: 5000,
    qualifying_person_count: 1,
    agi: 50000,
  }]);
  const input = findOutput(result, "schedule3")!.fields as Record<string, unknown>;
  // capped at 3000, 3000 * 0.20 = 600
  assertEquals(input.line2_childcare_credit, 600);
});

// --- Expense cap: 2+ qualifying persons ($6,000) ---

Deno.test("f2441: expenses exactly at $6000 cap (2 persons) — credit uses $6000", () => {
  const result = compute([{
    qualifying_expenses_paid: 6000,
    qualifying_person_count: 2,
    agi: 50000,
  }]);
  const input = findOutput(result, "schedule3")!.fields as Record<string, unknown>;
  // 6000 * 0.20 = 1200
  assertEquals(input.line2_childcare_credit, 1200);
});

Deno.test("f2441: expenses above $6000 cap (2 persons) — credit capped at $6000 base", () => {
  const result = compute([{
    qualifying_expenses_paid: 9000,
    qualifying_person_count: 2,
    agi: 50000,
  }]);
  const input = findOutput(result, "schedule3")!.fields as Record<string, unknown>;
  // capped at 6000, 6000 * 0.20 = 1200
  assertEquals(input.line2_childcare_credit, 1200);
});

// --- Employer exclusion cap: $5,000 (single/MFJ) ---

Deno.test("f2441: employer benefits exactly at $5000 limit — no taxable income", () => {
  const result = compute([{ employer_dep_care_benefits: 5000 }]);
  assertEquals(findOutput(result, "f1040"), undefined);
});

Deno.test("f2441: employer benefits of $1 above $5000 — taxable = $1", () => {
  const result = compute([{ employer_dep_care_benefits: 5001 }]);
  const input = findOutput(result, "f1040")!.fields as Record<string, unknown>;
  assertEquals(input.line1e_taxable_dep_care, 1);
});

// --- Employer exclusion cap: $2,500 (MFS) ---

Deno.test("f2441: MFS employer benefits exactly at $2500 limit — no taxable income", () => {
  const result = compute([{
    employer_dep_care_benefits: 2500,
    filing_status: FilingStatus.MFS,
  }]);
  assertEquals(findOutput(result, "f1040"), undefined);
});

Deno.test("f2441: MFS employer benefits above $2500 — taxable = excess over $2500", () => {
  const result = compute([{
    employer_dep_care_benefits: 3000,
    filing_status: FilingStatus.MFS,
  }]);
  const input = findOutput(result, "f1040")!.fields as Record<string, unknown>;
  // 3000 - 2500 = 500
  assertEquals(input.line1e_taxable_dep_care, 500);
});

// --- Credit rate: AGI brackets ---

Deno.test("f2441: credit rate is 35% for AGI = $0", () => {
  const result = compute([{
    qualifying_expenses_paid: 1000,
    qualifying_person_count: 1,
    agi: 0,
  }]);
  const input = findOutput(result, "schedule3")!.fields as Record<string, unknown>;
  // 1000 * 0.35 = 350
  assertEquals(input.line2_childcare_credit, 350);
});

Deno.test("f2441: credit rate is 35% for AGI = $15000 (top of first bracket)", () => {
  const result = compute([{
    qualifying_expenses_paid: 1000,
    qualifying_person_count: 1,
    agi: 15000,
  }]);
  const input = findOutput(result, "schedule3")!.fields as Record<string, unknown>;
  // 1000 * 0.35 = 350
  assertEquals(input.line2_childcare_credit, 350);
});

Deno.test("f2441: credit rate is 34% for AGI = $15001 (just above first bracket)", () => {
  const result = compute([{
    qualifying_expenses_paid: 1000,
    qualifying_person_count: 1,
    agi: 15001,
  }]);
  const input = findOutput(result, "schedule3")!.fields as Record<string, unknown>;
  // 1000 * 0.34 = 340
  assertEquals(input.line2_childcare_credit, 340);
});

Deno.test("f2441: credit rate is 21% for AGI = $43000 (top of $41001-$43000 bracket)", () => {
  const result = compute([{
    qualifying_expenses_paid: 1000,
    qualifying_person_count: 1,
    agi: 43000,
  }]);
  const input = findOutput(result, "schedule3")!.fields as Record<string, unknown>;
  // $41,001–$43,000 bracket → 21%; 1000 * 0.21 = 210
  assertEquals(input.line2_childcare_credit, 210);
});

Deno.test("f2441: credit rate is 20% for AGI = $43001 (above all brackets — floor rate)", () => {
  const result = compute([{
    qualifying_expenses_paid: 1000,
    qualifying_person_count: 1,
    agi: 43001,
  }]);
  const input = findOutput(result, "schedule3")!.fields as Record<string, unknown>;
  // floor rate: 1000 * 0.20 = 200
  assertEquals(input.line2_childcare_credit, 200);
});

Deno.test("f2441: credit rate is 20% for very high AGI (floor never goes below 20%)", () => {
  const result = compute([{
    qualifying_expenses_paid: 1000,
    qualifying_person_count: 1,
    agi: 500000,
  }]);
  const input = findOutput(result, "schedule3")!.fields as Record<string, unknown>;
  assertEquals(input.line2_childcare_credit, 200);
});

// --- Additional bracket spot-checks ---

Deno.test("f2441: credit rate is 33% for AGI = $17001 (third bracket)", () => {
  const result = compute([{
    qualifying_expenses_paid: 1000,
    qualifying_person_count: 1,
    agi: 17001,
  }]);
  const input = findOutput(result, "schedule3")!.fields as Record<string, unknown>;
  // 1000 * 0.33 = 330
  assertEquals(input.line2_childcare_credit, 330);
});

Deno.test("f2441: credit rate is 21% for AGI = $41001 (second-to-last bracket)", () => {
  const result = compute([{
    qualifying_expenses_paid: 1000,
    qualifying_person_count: 1,
    agi: 41001,
  }]);
  const input = findOutput(result, "schedule3")!.fields as Record<string, unknown>;
  // 1000 * 0.21 = 210
  assertEquals(input.line2_childcare_credit, 210);
});

// ---------------------------------------------------------------------------
// 5. Earned income limitation
// ---------------------------------------------------------------------------

Deno.test("f2441: single filer — credit limited by taxpayer earned income when lower than expenses", () => {
  const result = compute([{
    qualifying_expenses_paid: 3000,
    qualifying_person_count: 1,
    agi: 50000,
    earned_income_taxpayer: 1000,
  }]);
  const input = findOutput(result, "schedule3")!.fields as Record<string, unknown>;
  // min(3000, 1000) = 1000; credit = 1000 * 0.20 = 200
  assertEquals(input.line2_childcare_credit, 200);
});

Deno.test("f2441: MFJ — credit limited by lower spouse earned income", () => {
  const result = compute([{
    qualifying_expenses_paid: 3000,
    qualifying_person_count: 1,
    agi: 50000,
    filing_status: FilingStatus.MFJ,
    earned_income_taxpayer: 3000,
    earned_income_spouse: 800,
  }]);
  const input = findOutput(result, "schedule3")!.fields as Record<string, unknown>;
  // min(3000, min(3000, 800)) = 800; credit = 800 * 0.20 = 160
  assertEquals(input.line2_childcare_credit, 160);
});

Deno.test("f2441: zero earned income for single filer produces no credit", () => {
  const result = compute([{
    qualifying_expenses_paid: 3000,
    qualifying_person_count: 1,
    agi: 50000,
    earned_income_taxpayer: 0,
  }]);
  assertEquals(findOutput(result, "schedule3"), undefined);
});

Deno.test("f2441: MFJ — zero spouse earned income produces no credit (earned income test fails)", () => {
  const result = compute([{
    qualifying_expenses_paid: 3000,
    qualifying_person_count: 1,
    agi: 50000,
    filing_status: FilingStatus.MFJ,
    earned_income_taxpayer: 3000,
    earned_income_spouse: 0,
  }]);
  assertEquals(findOutput(result, "schedule3"), undefined);
});

// ---------------------------------------------------------------------------
// 6. Employer benefits + credit interaction (Part III → Part II)
// ---------------------------------------------------------------------------

Deno.test("f2441: FSA exclusion of $3000 with 1 person eliminates credit (line 29 = $0)", () => {
  // Line 27 = 3000 (1 person cap), Line 28 = 3000 (excluded), Line 29 = 0
  const result = compute([{
    qualifying_expenses_paid: 5000,
    employer_dep_care_benefits: 3000,
    qualifying_person_count: 1,
    agi: 50000,
  }]);
  assertEquals(findOutput(result, "schedule3"), undefined);
});

Deno.test("f2441: FSA exclusion of $5000 with 1 person eliminates credit (FSA >= cap)", () => {
  // Line 27 = 3000, Line 28 = min(5000, 3000) = 3000, Line 29 = 0
  const result = compute([{
    qualifying_expenses_paid: 6000,
    employer_dep_care_benefits: 5000,
    qualifying_person_count: 1,
    agi: 50000,
  }]);
  assertEquals(findOutput(result, "schedule3"), undefined);
});

Deno.test("f2441: FSA of $5000 with 2 persons leaves $1000 residual for credit", () => {
  // Line 27 = 6000, Line 28 = 5000, Line 29 = 1000
  // credit = min(1000, expenses - 5000) * 0.20
  const result = compute([{
    qualifying_expenses_paid: 8000,
    employer_dep_care_benefits: 5000,
    qualifying_person_count: 2,
    agi: 50000,
  }]);
  const out = findOutput(result, "schedule3");
  assertEquals(out !== undefined, true);
  const input = out!.fields as Record<string, unknown>;
  // residual = 1000; credit = 1000 * 0.20 = 200
  assertEquals(input.line2_childcare_credit, 200);
});

Deno.test("f2441: partial FSA reduces qualifying expenses proportionally (1 person)", () => {
  // FSA excluded = 2000; cap = 3000; residual = 1000
  // qualifying expenses (3000) - excluded (2000) = 1000
  const result = compute([{
    qualifying_expenses_paid: 3000,
    employer_dep_care_benefits: 2000,
    qualifying_person_count: 1,
    agi: 50000,
  }]);
  const input = findOutput(result, "schedule3")!.fields as Record<string, unknown>;
  // net qualifying = 1000; credit = 1000 * 0.20 = 200
  assertEquals(input.line2_childcare_credit, 200);
});

// ---------------------------------------------------------------------------
// 7. Filing status variants
// ---------------------------------------------------------------------------

Deno.test("f2441: HOH filing status uses $5000 employer exclusion (same as single)", () => {
  const result = compute([{
    employer_dep_care_benefits: 5000,
    filing_status: FilingStatus.HOH,
  }]);
  assertEquals(findOutput(result, "f1040"), undefined);
});

Deno.test("f2441: QSS filing status uses $5000 employer exclusion (same as single)", () => {
  const result = compute([{
    employer_dep_care_benefits: 5000,
    filing_status: FilingStatus.QSS,
  }]);
  assertEquals(findOutput(result, "f1040"), undefined);
});

Deno.test("f2441: MFS filing status produces taxable amount on $2501 employer benefits", () => {
  const result = compute([{
    employer_dep_care_benefits: 2501,
    filing_status: FilingStatus.MFS,
  }]);
  const input = findOutput(result, "f1040")!.fields as Record<string, unknown>;
  assertEquals(input.line1e_taxable_dep_care, 1);
});

// ---------------------------------------------------------------------------
// 8. Edge cases
// ---------------------------------------------------------------------------

Deno.test("f2441: very large FSA (above both exclusion and expense cap) only produces taxable, no credit", () => {
  // employer_benefits = 10000; exclusion = 5000; taxable = 5000
  // excluded = 5000 >= expense cap (3000 for 1 person) → no credit
  const result = compute([{
    employer_dep_care_benefits: 10000,
    qualifying_expenses_paid: 3000,
    qualifying_person_count: 1,
    agi: 50000,
  }]);
  const f1040Out = findOutput(result, "f1040")!.fields as Record<string, unknown>;
  assertEquals(f1040Out.line1e_taxable_dep_care, 5000);
  assertEquals(findOutput(result, "schedule3"), undefined);
});

Deno.test("f2441: zero employer benefits and zero expenses produce no outputs", () => {
  const result = compute([{
    employer_dep_care_benefits: 0,
    qualifying_expenses_paid: 0,
    qualifying_person_count: 1,
    agi: 50000,
  }]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("f2441: expenses exactly equal to employer exclusion produce no credit and no taxable", () => {
  // expenses = 5000, employer_benefits = 5000 (all excluded, none taxable)
  // excluded = 5000; expense cap for 1 person = 3000; residual = 3000 - 3000 = 0 → no credit
  // taxable = 5000 - 5000 = 0 → no f1040 output
  const result = compute([{
    qualifying_expenses_paid: 5000,
    employer_dep_care_benefits: 5000,
    qualifying_person_count: 1,
    agi: 50000,
  }]);
  assertEquals(findOutput(result, "f1040"), undefined);
  assertEquals(findOutput(result, "schedule3"), undefined);
});

Deno.test("f2441: AGI exactly at $17000 uses 34% rate (top of second bracket)", () => {
  const result = compute([{
    qualifying_expenses_paid: 1000,
    qualifying_person_count: 1,
    agi: 17000,
  }]);
  const input = findOutput(result, "schedule3")!.fields as Record<string, unknown>;
  // 1000 * 0.34 = 340
  assertEquals(input.line2_childcare_credit, 340);
});

Deno.test("f2441: MFJ with equal spouse incomes uses that income as limit", () => {
  const result = compute([{
    qualifying_expenses_paid: 3000,
    qualifying_person_count: 1,
    agi: 50000,
    filing_status: FilingStatus.MFJ,
    earned_income_taxpayer: 2000,
    earned_income_spouse: 2000,
  }]);
  const input = findOutput(result, "schedule3")!.fields as Record<string, unknown>;
  // min(3000, 2000, 2000) = 2000; credit = 2000 * 0.20 = 400
  assertEquals(input.line2_childcare_credit, 400);
});

Deno.test("f2441: 3 qualifying persons uses the $6000 cap (same as 2+)", () => {
  const result = compute([{
    qualifying_expenses_paid: 8000,
    qualifying_person_count: 3,
    agi: 50000,
  }]);
  const input = findOutput(result, "schedule3")!.fields as Record<string, unknown>;
  // capped at 6000; 6000 * 0.20 = 1200
  assertEquals(input.line2_childcare_credit, 1200);
});

// ---------------------------------------------------------------------------
// 9. Smoke test — comprehensive scenario with all major fields
// ---------------------------------------------------------------------------

Deno.test("f2441 smoke test: MFJ, 2 qualifying persons, partial FSA, earned income limits, moderate AGI", () => {
  // Setup:
  //   Filing: MFJ
  //   Qualifying persons: 2 (expense cap = $6000)
  //   Expenses paid: $7000 (capped at $6000)
  //   Employer FSA benefits: $4000 (below $5000 limit → excluded = $4000, taxable = $0)
  //   Residual expense cap: $6000 - $4000 = $2000
  //   Net qualifying expenses after earned income limit:
  //     earned_income_taxpayer = $3000, earned_income_spouse = $2500
  //     min(2000, 3000, 2500) = 2000
  //   AGI = $25000 → rate = 30%
  //   Credit = 2000 * 0.30 = 600

  const result = compute([{
    qualifying_person_count: 2,
    qualifying_expenses_paid: 7000,
    employer_dep_care_benefits: 4000,
    filing_status: FilingStatus.MFJ,
    agi: 25000,
    earned_income_taxpayer: 3000,
    earned_income_spouse: 2500,
  }]);

  // No taxable employer benefits (4000 < 5000 exclusion)
  assertEquals(findOutput(result, "f1040"), undefined);

  // Credit should be $600
  const schedule3Out = findOutput(result, "schedule3");
  assertEquals(schedule3Out !== undefined, true);
  const input = schedule3Out!.fields as Record<string, unknown>;
  assertEquals(input.line2_childcare_credit, 600);
});

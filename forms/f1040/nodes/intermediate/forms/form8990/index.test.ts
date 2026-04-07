import { assertEquals, assertThrows } from "@std/assert";
import { form8990 } from "./index.ts";
import { fieldsOf } from "../../../../../../core/test-utils/output.ts";
import { schedule1 } from "../../../outputs/schedule1/index.ts";

function compute(input: Record<string, unknown>) {
  return form8990.compute({ taxYear: 2025 }, input);
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// ─── Small business exemption ─────────────────────────────────────────────────

Deno.test("form8990 — small business exemption: avg receipts <= $31M, no outputs", () => {
  // §163(j)(3): small business taxpayers are not subject to the limitation
  const result = compute({
    business_interest_expense: 50_000,
    tentative_taxable_income: 100_000,
    avg_gross_receipts: 20_000_000,
    is_tax_shelter: false,
  });
  assertEquals(result.outputs.length, 0);
});

Deno.test("form8990 — small business exemption: exactly $31M, no outputs", () => {
  const result = compute({
    business_interest_expense: 100_000,
    tentative_taxable_income: 500_000,
    avg_gross_receipts: 31_000_000,
    is_tax_shelter: false,
  });
  assertEquals(result.outputs.length, 0);
});

Deno.test("form8990 — tax shelter cannot use small business exemption", () => {
  // A tax shelter must apply the limitation even with low gross receipts
  const result = compute({
    business_interest_expense: 50_000,
    tentative_taxable_income: 60_000,
    avg_gross_receipts: 5_000_000,
    is_tax_shelter: true,
  });
  // BIE $50k, ATI = 60k + 50k = 110k, 30% = 33k → disallowed = 17k
  assertEquals(
    fieldsOf(result.outputs, schedule1)!.biz_interest_disallowed_add_back,
    17_000,
  );
});

// ─── Interest fully deductible (within 30% ATI) ───────────────────────────────

Deno.test("form8990 — BIE within 30% ATI: no disallowance, no outputs", () => {
  // ATI = 100k + 20k BIE = 120k; 30% ATI = 36k; BIE 20k < 36k → fully deductible
  const result = compute({
    business_interest_expense: 20_000,
    tentative_taxable_income: 100_000,
    avg_gross_receipts: 50_000_000, // above threshold → subject to limit
  });
  assertEquals(result.outputs.length, 0);
});

Deno.test("form8990 — BIE exactly equal to 30% ATI: fully deductible, no outputs", () => {
  // ATI = (100k + 30k) = 130k; 30% = 39k; BIE 30k < 39k? No, let's set it equal:
  // We need: BIE == 0.30 * (TTI + BIE)  => BIE = 0.30*TTI/(0.70) ~ 42857 for TTI=100k
  // Use simple: TTI=70k, BIE=30k → ATI=100k, 30% ATI=30k, deductible=30k → no disallowance
  const result = compute({
    business_interest_expense: 30_000,
    tentative_taxable_income: 70_000,
    avg_gross_receipts: 50_000_000,
  });
  assertEquals(result.outputs.length, 0);
});

// ─── Interest partially limited ───────────────────────────────────────────────

Deno.test("form8990 — BIE partially disallowed: routes add-back to schedule1", () => {
  // BIE = 50k, TTI = 100k → ATI = 100k + 50k = 150k, 30% = 45k
  // BII = 0, floor plan = 0 → line29 = 45k
  // deductible = min(50k, 45k) = 45k → disallowed = 5k
  const result = compute({
    business_interest_expense: 50_000,
    tentative_taxable_income: 100_000,
    avg_gross_receipts: 50_000_000,
  });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1 !== undefined, true);
  assertEquals(
    fieldsOf(result.outputs, schedule1)!.biz_interest_disallowed_add_back,
    5_000,
  );
});

// ─── Interest fully disallowed (zero ATI) ─────────────────────────────────────

Deno.test("form8990 — zero ATI, zero BII, zero floor plan: BIE fully disallowed", () => {
  // TTI = 0, BIE = 10k → ATI = 10k, but BIE adds back, so ATI = 0+10k = 10k
  // 30% ATI = 3k; deductible = 3k; disallowed = 7k
  // Wait: ATI = TTI + BIE - BII = 0 + 10k - 0 = 10k (before nol/qbi/dep)
  // Use TTI that makes ATI effectively zero before adding back BIE:
  // TTI = -50k, BIE = 20k → raw ATI = -50k + 20k = -30k → floored at 0
  // 30% ATI = 0; deductible = min(20k, 0) = 0; disallowed = 20k
  const result = compute({
    business_interest_expense: 20_000,
    tentative_taxable_income: -50_000,
    avg_gross_receipts: 50_000_000,
  });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1 !== undefined, true);
  assertEquals(
    fieldsOf(result.outputs, schedule1)!.biz_interest_disallowed_add_back,
    20_000,
  );
});

// ─── Carryforward of disallowed interest ──────────────────────────────────────

Deno.test("form8990 — prior year carryforward increases total BIE", () => {
  // Current BIE = 20k, prior carryforward = 10k → total = 30k
  // TTI = 50k, ATI = 50k + 20k = 70k (only current BIE adds back, total used for limit)
  // 30% ATI = 21k; deductible = min(30k, 21k) = 21k → disallowed = 9k
  const result = compute({
    business_interest_expense: 20_000,
    prior_disallowed_carryforward: 10_000,
    tentative_taxable_income: 50_000,
    avg_gross_receipts: 50_000_000,
  });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1 !== undefined, true);
  assertEquals(
    fieldsOf(result.outputs, schedule1)!.biz_interest_disallowed_add_back,
    9_000,
  );
});

Deno.test("form8990 — carryforward only: fully within ATI cap, no disallowance", () => {
  // Current BIE = 5k, prior carryforward = 3k → total = 8k
  // TTI = 100k, ATI = 100k + 5k = 105k, 30% = 31.5k; total BIE 8k < 31.5k → no disallowance
  const result = compute({
    business_interest_expense: 5_000,
    prior_disallowed_carryforward: 3_000,
    tentative_taxable_income: 100_000,
    avg_gross_receipts: 50_000_000,
  });
  assertEquals(result.outputs.length, 0);
});

// ─── Floor plan interest ──────────────────────────────────────────────────────

Deno.test("form8990 — floor plan interest: increases deductible cap, reduces disallowance", () => {
  // BIE = 50k, TTI = 50k → ATI = 100k, 30% ATI = 30k
  // Floor plan = 15k → line29 = 30k + 15k = 45k
  // deductible = min(50k, 45k) = 45k → disallowed = 5k
  const result = compute({
    business_interest_expense: 50_000,
    tentative_taxable_income: 50_000,
    floor_plan_interest: 15_000,
    avg_gross_receipts: 50_000_000,
  });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1 !== undefined, true);
  assertEquals(
    fieldsOf(result.outputs, schedule1)!.biz_interest_disallowed_add_back,
    5_000,
  );
});

Deno.test("form8990 — floor plan large enough to make BIE fully deductible", () => {
  // BIE = 50k, TTI = 0 → ATI = 50k (after adding back BIE), 30% = 15k
  // Floor plan = 40k → line29 = 15k + 40k = 55k; BIE 50k < 55k → fully deductible
  const result = compute({
    business_interest_expense: 50_000,
    tentative_taxable_income: 0,
    floor_plan_interest: 40_000,
    avg_gross_receipts: 50_000_000,
  });
  assertEquals(result.outputs.length, 0);
});

// ─── Business interest income offsets ─────────────────────────────────────────

Deno.test("form8990 — BII reduces ATI but increases deductible cap", () => {
  // BIE = 50k, TTI = 100k, BII = 10k
  // ATI raw = 100k + 50k - 10k = 140k; 30% ATI = 42k
  // line29 = 42k + 0 floor plan + 10k BII = 52k
  // deductible = min(50k, 52k) = 50k → no disallowance
  const result = compute({
    business_interest_expense: 50_000,
    tentative_taxable_income: 100_000,
    business_interest_income: 10_000,
    avg_gross_receipts: 50_000_000,
  });
  assertEquals(result.outputs.length, 0);
});

// ─── Depreciation add-back (TY2025 — reinstated) ─────────────────────────────

Deno.test("form8990 — depreciation add-back increases ATI, reduces disallowance", () => {
  // Without dep: BIE=50k, TTI=50k → ATI=100k, 30%=30k → disallowed=20k
  // With dep 40k: ATI = 50k + 50k + 40k = 140k, 30% = 42k → deductible=42k → disallowed=8k
  const result = compute({
    business_interest_expense: 50_000,
    tentative_taxable_income: 50_000,
    depreciation_amortization: 40_000,
    avg_gross_receipts: 50_000_000,
  });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1 !== undefined, true);
  assertEquals(
    fieldsOf(result.outputs, schedule1)!.biz_interest_disallowed_add_back,
    8_000,
  );
});

// ─── ATI floored at zero ──────────────────────────────────────────────────────

Deno.test("form8990 — negative raw ATI is floored at zero", () => {
  // TTI = -200k, BIE = 10k → raw ATI = -190k → floored at 0
  // 30% ATI = 0 → deductible = 0 → all 10k disallowed
  const result = compute({
    business_interest_expense: 10_000,
    tentative_taxable_income: -200_000,
    avg_gross_receipts: 50_000_000,
  });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1 !== undefined, true);
  assertEquals(
    fieldsOf(result.outputs, schedule1)!.biz_interest_disallowed_add_back,
    10_000,
  );
});

// ─── NOL deduction add-back ───────────────────────────────────────────────────

Deno.test("form8990 — NOL deduction adds back to ATI", () => {
  // TTI already reduced by NOL; add it back for ATI
  // BIE=30k, TTI=30k, NOL_deduction=20k → ATI = 30k + 30k + 20k = 80k, 30%=24k
  // deductible=min(30k,24k)=24k → disallowed=6k
  const result = compute({
    business_interest_expense: 30_000,
    tentative_taxable_income: 30_000,
    nol_deduction: 20_000,
    avg_gross_receipts: 50_000_000,
  });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1 !== undefined, true);
  assertEquals(
    fieldsOf(result.outputs, schedule1)!.biz_interest_disallowed_add_back,
    6_000,
  );
});

// ─── No BIE at all ───────────────────────────────────────────────────────────

Deno.test("form8990 — no BIE and no carryforward: no outputs", () => {
  const result = compute({
    tentative_taxable_income: 200_000,
    avg_gross_receipts: 50_000_000,
  });
  assertEquals(result.outputs.length, 0);
});

// ─── Output routing ───────────────────────────────────────────────────────────

Deno.test("form8990 — disallowed BIE routes to schedule1 and agi_aggregator", () => {
  const result = compute({
    business_interest_expense: 100_000,
    tentative_taxable_income: 0,
    avg_gross_receipts: 50_000_000,
  });
  // ATI = 0 + 100k = 100k, 30% = 30k → deductible = 30k → disallowed = 70k
  assertEquals(result.outputs.length, 2);
  assertEquals(result.outputs[0].nodeType, "schedule1");
  assertEquals(
    fieldsOf(result.outputs, schedule1)!.biz_interest_disallowed_add_back,
    70_000,
  );
});

// ─── Input validation ─────────────────────────────────────────────────────────

Deno.test("form8990 — rejects negative business_interest_expense", () => {
  assertThrows(() => compute({ business_interest_expense: -1 }));
});

Deno.test("form8990 — rejects negative prior_disallowed_carryforward", () => {
  assertThrows(() => compute({ prior_disallowed_carryforward: -100 }));
});

Deno.test("form8990 — rejects negative avg_gross_receipts", () => {
  assertThrows(() => compute({ avg_gross_receipts: -1 }));
});

Deno.test("form8990 — rejects negative business_interest_income", () => {
  assertThrows(() => compute({ business_interest_income: -1 }));
});

Deno.test("form8990 — rejects negative floor_plan_interest", () => {
  assertThrows(() => compute({ floor_plan_interest: -500 }));
});

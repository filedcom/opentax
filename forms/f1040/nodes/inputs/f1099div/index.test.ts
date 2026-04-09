import { assertEquals, assertThrows } from "@std/assert";
import { f1099div, inputSchema } from "./index.ts";
import { fieldsOf } from "../../../../../core/test-utils/output.ts";
import { f1040 } from "../../outputs/f1040/index.ts";
import { schedule_b } from "../../intermediate/aggregation/schedule_b/index.ts";
import { schedule_d } from "../../intermediate/aggregation/schedule_d/index.ts";
import { schedule3 } from "../../intermediate/aggregation/schedule3/index.ts";
import { form6251 } from "../../intermediate/forms/form6251/index.ts";
import { form_1116 } from "../../intermediate/forms/form_1116/index.ts";
import { form8995 } from "../../intermediate/forms/form8995/index.ts";
import { form8995a } from "../../intermediate/forms/form8995a/index.ts";
import { unrecaptured_1250_worksheet } from "../../intermediate/worksheets/unrecaptured_1250_worksheet/index.ts";
import { rate_28_gain_worksheet } from "../../intermediate/worksheets/rate_28_gain_worksheet/index.ts";
import { agi_aggregator } from "../../intermediate/aggregation/agi_aggregator/index.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type ItemOverrides = Partial<{
  payerName: string;
  isNominee: boolean;
  box11: boolean;
  box1a: number;
  box1b: number;
  box2a: number;
  box2b: number;
  box2c: number;
  box2d: number;
  box2e: number;
  box2f: number;
  box3: number;
  box4: number;
  box5: number;
  box6: number;
  box7: number;
  box8: string;
  box9: number;
  box10: number;
  box12: number;
  box13: number;
  box14: string;
  box15: string;
  box16: number;
  holdingPeriodDays: number;
}>;

function minimalItem(overrides: ItemOverrides = {}): ItemOverrides {
  return {
    payerName: "Test Payer",
    isNominee: false,
    box11: false,
    box1a: 0,
    ...overrides,
  };
}

function compute(
  items: ItemOverrides[],
  context: { taxableIncome?: number; filingStatus?: string } = {},
) {
  return f1099div.compute(
    { taxYear: 2025 },
    inputSchema.parse({ f1099divs: items, ...context }),
  );
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// ---------------------------------------------------------------------------
// 1. Input Schema Validation (one representative test per concern)
// ---------------------------------------------------------------------------

Deno.test("schema: rejects negative box1a", () => {
  assertThrows(() => compute([minimalItem({ box1a: -1 })]), Error);
});

Deno.test("schema: normalizes box1b exceeding box1a — promotes box1a to box1b", () => {
  // When box1b > box1a, box1a is promoted to box1b so no income is lost.
  const result = compute([minimalItem({ box1a: 400, box1b: 500 })]);
  // Promoted box1a = 500, routed below Schedule B threshold → f1040 line3b
  assertEquals(fieldsOf(result.outputs, f1040)?.line3b_ordinary_dividends, 500);
  assertEquals(fieldsOf(result.outputs, f1040)?.line3a_qualified_dividends, 500);
});

Deno.test("schema: accepts box1b equal to box1a (boundary)", () => {
  const result = compute([minimalItem({ box1a: 400, box1b: 400 })]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("schema: rejects box2b+2c+2d+2f sum exceeding box2a", () => {
  assertThrows(
    () =>
      compute([
        minimalItem({ box2a: 300, box2b: 100, box2c: 100, box2d: 100, box2f: 100 }),
      ]),
    Error,
  );
});

Deno.test("schema: accepts box2b+2c+2d+2f sum equal to box2a (boundary)", () => {
  const result = compute([
    minimalItem({ box2a: 400, box2b: 100, box2c: 100, box2d: 100, box2f: 100 }),
  ]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("schema: normalizes box13 exceeding box12 — clamps box13 to box12", () => {
  // box13 (specified PAB) is clamped to box12 (exempt-interest dividends).
  const result = compute([minimalItem({ box12: 150, box13: 200 })]);
  assertEquals(fieldsOf(result.outputs, form6251)?.private_activity_bond_interest, 150);
});

Deno.test("schema: normalizes box5 exceeding box1a — clamps box5 to box1a", () => {
  // box5 (§199A dividends) is clamped to box1a so income is not over-counted.
  const result = compute([minimalItem({ box1a: 500, box5: 600 })]);
  assertEquals(fieldsOf(result.outputs, form8995)?.line6_sec199a_dividends, 500);
});

Deno.test("schema: normalizes box2e exceeding box1a — clamps box2e to box1a", () => {
  // box2e (Section 897 ordinary dividends) is clamped to box1a.
  const result = compute([minimalItem({ box1a: 500, box2e: 600 })]);
  assertEquals(Array.isArray(result.outputs), true);
});

// ---------------------------------------------------------------------------
// 2. Per-Box Routing
// ---------------------------------------------------------------------------

Deno.test("box1a above threshold routes to schedule_b with correct payer and amount", () => {
  const result = compute([minimalItem({ payerName: "Vanguard", box1a: 2000 })]);
  const sbFields = fieldsOf(result.outputs, schedule_b);
  assertEquals(sbFields?.payerName, "Vanguard");
  assertEquals(sbFields?.ordinaryDividends, 2000);
});

Deno.test("box1a below threshold routes directly to f1040 line3b and agi_aggregator", () => {
  const result = compute([minimalItem({ box1a: 500 })]);
  assertEquals(findOutput(result, "schedule_b"), undefined);
  assertEquals(fieldsOf(result.outputs, f1040)?.line3b_ordinary_dividends, 500);
  assertEquals(
    fieldsOf(result.outputs, agi_aggregator)?.line3b_ordinary_dividends,
    500,
  );
});

Deno.test("box1a = 0 produces no ordinary dividend output", () => {
  const result = compute([minimalItem({ box1a: 0 })]);
  assertEquals(fieldsOf(result.outputs, f1040)?.line3b_ordinary_dividends, undefined);
});

Deno.test("box1b routes to f1040 line3a (qualified dividends)", () => {
  const result = compute([minimalItem({ box1a: 500, box1b: 400 })]);
  assertEquals(fieldsOf(result.outputs, f1040)?.line3a_qualified_dividends, 400);
});

Deno.test("box1b = 0 produces no qualified dividend output", () => {
  const result = compute([minimalItem({ box1a: 500, box1b: 0 })]);
  assertEquals(fieldsOf(result.outputs, f1040)?.line3a_qualified_dividends, undefined);
});

Deno.test("box2a without sub-amounts routes to schedule_d line13 (always via Schedule D)", () => {
  const result = compute([minimalItem({ box1a: 1000, box2a: 1000 })]);
  assertEquals(fieldsOf(result.outputs, schedule_d)?.line13_cap_gain_distrib, 1000);
  assertEquals(fieldsOf(result.outputs, f1040)?.line7a_cap_gain_distrib, undefined);
});

Deno.test("box2a with sub-amounts routes to schedule_d line13 (standard path)", () => {
  const result = compute([
    minimalItem({ box1a: 1000, box2a: 1000, box2b: 100 }),
  ]);
  assertEquals(fieldsOf(result.outputs, schedule_d)?.line13_cap_gain_distrib, 1000);
  assertEquals(fieldsOf(result.outputs, f1040)?.line7a_cap_gain_distrib, undefined);
});

Deno.test("box2b routes to unrecaptured_1250_worksheet", () => {
  const result = compute([minimalItem({ box1a: 500, box2a: 500, box2b: 200 })]);
  assertEquals(
    fieldsOf(result.outputs, unrecaptured_1250_worksheet)?.unrecaptured_1250_gain,
    200,
  );
});

Deno.test("box2c routes to schedule_d with QSBS amount", () => {
  const result = compute([minimalItem({ box1a: 500, box2a: 500, box2c: 300 })]);
  assertEquals(fieldsOf(result.outputs, schedule_d)?.box2c_qsbs, 300);
});

Deno.test("box2d routes to rate_28_gain_worksheet", () => {
  const result = compute([minimalItem({ box1a: 500, box2a: 500, box2d: 150 })]);
  assertEquals(
    fieldsOf(result.outputs, rate_28_gain_worksheet)?.collectibles_gain,
    150,
  );
});

Deno.test("box4 routes to f1040 line25b (federal withholding)", () => {
  const result = compute([minimalItem({ box4: 75 })]);
  assertEquals(fieldsOf(result.outputs, f1040)?.line25b_withheld_1099, 75);
});

Deno.test("box4 = 0 produces no withholding output", () => {
  const result = compute([minimalItem({ box4: 0 })]);
  assertEquals(fieldsOf(result.outputs, f1040)?.line25b_withheld_1099, undefined);
});

Deno.test("box5 routes to form8995 when holding period met (>= 45 days)", () => {
  const result = compute([
    minimalItem({ box1a: 500, box5: 300, holdingPeriodDays: 60 }),
  ]);
  assertEquals(fieldsOf(result.outputs, form8995)?.line6_sec199a_dividends, 300);
  assertEquals(findOutput(result, "form8995a"), undefined);
});

Deno.test("box5 excluded from form8995 when holding period not met (< 45 days)", () => {
  const result = compute([
    minimalItem({ box1a: 500, box5: 400, holdingPeriodDays: 30 }),
  ]);
  assertEquals(findOutput(result, "form8995"), undefined);
  assertEquals(findOutput(result, "form8995a"), undefined);
});

Deno.test("box7 routes to schedule3 when below $300 single threshold (simplified path)", () => {
  const result = compute([minimalItem({ box7: 200, holdingPeriodDays: 20 })], {
    filingStatus: "single",
  });
  assertEquals(fieldsOf(result.outputs, schedule3)?.line1_foreign_tax_1099, 200);
  assertEquals(findOutput(result, "form_1116"), undefined);
});

Deno.test("box7 routes to form_1116 when exceeds $300 single threshold", () => {
  const result = compute([minimalItem({ box7: 400, holdingPeriodDays: 20 })], {
    filingStatus: "single",
  });
  assertEquals(fieldsOf(result.outputs, form_1116)?.foreign_tax_paid, 400);
  assertEquals(findOutput(result, "schedule3"), undefined);
});

Deno.test("box7 not routed when holding period < 16 days", () => {
  const result = compute([minimalItem({ box7: 150, holdingPeriodDays: 10 })]);
  assertEquals(findOutput(result, "schedule3"), undefined);
  assertEquals(findOutput(result, "form_1116"), undefined);
});

Deno.test("box12 routes to f1040 line2a (tax-exempt dividends)", () => {
  const result = compute([minimalItem({ box12: 600 })]);
  assertEquals(fieldsOf(result.outputs, f1040)?.line2a_tax_exempt, 600);
});

Deno.test("box13 routes to form6251 (AMT private activity bond preference)", () => {
  const result = compute([minimalItem({ box12: 200, box13: 100 })]);
  assertEquals(
    fieldsOf(result.outputs, form6251)?.private_activity_bond_interest,
    100,
  );
});

// ---------------------------------------------------------------------------
// 3. Informational / no-op boxes
// ---------------------------------------------------------------------------

Deno.test("box2e does not produce tax output (Section 897 ordinary dividends — informational)", () => {
  const baseline = compute([minimalItem({ box1a: 500 })]);
  const withBox2e = compute([minimalItem({ box1a: 500, box2e: 400 })]);
  assertEquals(withBox2e.outputs.length, baseline.outputs.length);
});

Deno.test("box2f does not produce tax output (Section 897 cap gain — informational)", () => {
  const baseline = compute([minimalItem({ box1a: 500, box2a: 500 })]);
  const withBox2f = compute([minimalItem({ box1a: 500, box2a: 500, box2f: 200 })]);
  assertEquals(withBox2f.outputs.length, baseline.outputs.length);
});

Deno.test("box3 produces no current-year income output (return of capital)", () => {
  const result = compute([minimalItem({ box3: 1000 })]);
  const incomeOutputs = result.outputs.filter(
    (o) => ["schedule_b", "f1040", "schedule_d"].includes(o.nodeType),
  );
  assertEquals(incomeOutputs.length, 0);
});

Deno.test("box6 produces no Schedule A deduction (investment expenses suspended)", () => {
  const result = compute([minimalItem({ box6: 250 })]);
  assertEquals(findOutput(result, "schedule_a"), undefined);
});

Deno.test("box9 does not route to schedule_b (cash liquidating distribution)", () => {
  const result = compute([minimalItem({ box9: 2000 })]);
  assertEquals(findOutput(result, "schedule_b"), undefined);
});

Deno.test("box10 does not route to schedule_b (noncash liquidating distribution)", () => {
  const result = compute([minimalItem({ box10: 1500 })]);
  assertEquals(findOutput(result, "schedule_b"), undefined);
});

Deno.test("box11=true produces no tax calculation impact (FATCA checkbox informational)", () => {
  const baseline = compute([minimalItem()]);
  const withBox11 = compute([minimalItem({ box11: true })]);
  assertEquals(withBox11.outputs.length, baseline.outputs.length);
});

// ---------------------------------------------------------------------------
// 4. Aggregation — Multiple Payers
// ---------------------------------------------------------------------------

Deno.test("multiple payers — each listed separately on schedule_b when above threshold", () => {
  const result = compute([
    minimalItem({ payerName: "Alpha Fund", box1a: 700 }),
    minimalItem({ payerName: "Beta Fund", box1a: 800 }),
    minimalItem({ payerName: "Gamma Fund", box1a: 600 }),
  ]);
  const sbOutputs = result.outputs.filter((o) => o.nodeType === "schedule_b");
  assertEquals(sbOutputs.length, 3);
  const total = sbOutputs.reduce(
    (sum, o) => sum + ((o.fields.ordinaryDividends as number) ?? 0),
    0,
  );
  assertEquals(total, 2100);
});

Deno.test("multiple payers — box1b (qualified dividends) summed to single f1040 output", () => {
  const result = compute([
    minimalItem({ box1a: 300, box1b: 200 }),
    minimalItem({ box1a: 400, box1b: 350 }),
  ]);
  assertEquals(fieldsOf(result.outputs, f1040)?.line3a_qualified_dividends, 550);
});

Deno.test("multiple payers — box2a summed for schedule_d when sub-amounts present", () => {
  const result = compute([
    minimalItem({ box1a: 500, box2a: 300, box2b: 50 }),
    minimalItem({ box1a: 600, box2a: 500, box2b: 50 }),
  ]);
  assertEquals(fieldsOf(result.outputs, schedule_d)?.line13_cap_gain_distrib, 800);
});

Deno.test("multiple payers — box2b summed to unrecaptured_1250_worksheet", () => {
  const result = compute([
    minimalItem({ box1a: 500, box2a: 500, box2b: 100 }),
    minimalItem({ box1a: 500, box2a: 500, box2b: 150 }),
  ]);
  assertEquals(
    fieldsOf(result.outputs, unrecaptured_1250_worksheet)?.unrecaptured_1250_gain,
    250,
  );
});

Deno.test("multiple payers — box2c summed to schedule_d QSBS field", () => {
  const result = compute([
    minimalItem({ box1a: 400, box2a: 400, box2c: 200 }),
    minimalItem({ box1a: 400, box2a: 400, box2c: 300 }),
  ]);
  assertEquals(fieldsOf(result.outputs, schedule_d)?.box2c_qsbs, 500);
});

Deno.test("multiple payers — box2d summed to rate_28_gain_worksheet", () => {
  const result = compute([
    minimalItem({ box1a: 400, box2a: 400, box2d: 200 }),
    minimalItem({ box1a: 400, box2a: 400, box2d: 300 }),
  ]);
  assertEquals(
    fieldsOf(result.outputs, rate_28_gain_worksheet)?.collectibles_gain,
    500,
  );
});

Deno.test("multiple payers — box4 withholding summed to single f1040 output", () => {
  const result = compute([
    minimalItem({ box4: 50 }),
    minimalItem({ box4: 75 }),
    minimalItem({ box4: 25 }),
  ]);
  assertEquals(fieldsOf(result.outputs, f1040)?.line25b_withheld_1099, 150);
});

Deno.test("multiple payers — box5 (§199A) summed when holding period met", () => {
  // box5 is clamped to box1a per normalization, so the second item's box5 (600)
  // is clamped to box1a (500) before routing. Total = 400 + 500 = 900.
  const result = compute([
    minimalItem({ box1a: 500, box5: 400, holdingPeriodDays: 60 }),
    minimalItem({ box1a: 500, box5: 600, holdingPeriodDays: 60 }),
  ]);
  assertEquals(fieldsOf(result.outputs, form8995)?.line6_sec199a_dividends, 900);
});

Deno.test("multiple payers — box7 summed, simplified path if total <= $300 single", () => {
  const result = compute(
    [
      minimalItem({ box7: 100, holdingPeriodDays: 20 }),
      minimalItem({ box7: 150, holdingPeriodDays: 20 }),
    ],
    { filingStatus: "single" },
  );
  assertEquals(fieldsOf(result.outputs, schedule3)?.line1_foreign_tax_1099, 250);
});

Deno.test("multiple payers — box12 summed to f1040 line2a", () => {
  const result = compute([
    minimalItem({ box12: 300 }),
    minimalItem({ box12: 450 }),
  ]);
  assertEquals(fieldsOf(result.outputs, f1040)?.line2a_tax_exempt, 750);
});

Deno.test("multiple payers — box13 summed to form6251", () => {
  const result = compute([
    minimalItem({ box12: 100, box13: 80 }),
    minimalItem({ box12: 150, box13: 120 }),
  ]);
  assertEquals(
    fieldsOf(result.outputs, form6251)?.private_activity_bond_interest,
    200,
  );
});

// ---------------------------------------------------------------------------
// 5. Schedule B Threshold ($1,500)
// ---------------------------------------------------------------------------

Deno.test("schedule_b not triggered when total box1a below $1,500", () => {
  const result = compute([minimalItem({ box1a: 1499 })]);
  assertEquals(findOutput(result, "schedule_b"), undefined);
});

Deno.test("schedule_b not triggered when total box1a exactly $1,500", () => {
  const result = compute([minimalItem({ box1a: 1500 })]);
  assertEquals(findOutput(result, "schedule_b"), undefined);
  // below threshold: routes directly to f1040 and agi_aggregator
  assertEquals(fieldsOf(result.outputs, f1040)?.line3b_ordinary_dividends, 1500);
  assertEquals(
    fieldsOf(result.outputs, agi_aggregator)?.line3b_ordinary_dividends,
    1500,
  );
});

Deno.test("schedule_b triggered when total box1a above $1,500", () => {
  const result = compute([minimalItem({ box1a: 1501 })]);
  const sbOutputs = result.outputs.filter((o) => o.nodeType === "schedule_b");
  assertEquals(sbOutputs.length, 1);
});

Deno.test("nominee=true forces schedule_b even when total below $1,500", () => {
  const result = compute([
    minimalItem({ payerName: "Nominee Payer", box1a: 500, isNominee: true }),
  ]);
  const sbFields = fieldsOf(result.outputs, schedule_b);
  assertEquals(sbFields?.isNominee, true);
});

Deno.test("multi-payer total below $1,500 with no nominee skips schedule_b", () => {
  const result = compute([
    minimalItem({ payerName: "P1", box1a: 500 }),
    minimalItem({ payerName: "P2", box1a: 499 }),
    minimalItem({ payerName: "P3", box1a: 500 }),
  ]);
  assertEquals(findOutput(result, "schedule_b"), undefined);
});

// ---------------------------------------------------------------------------
// 6. §199A Thresholds — Form 8995 vs Form 8995-A
// ---------------------------------------------------------------------------

Deno.test("form8995 used when taxable income at Single §199A threshold ($197,300)", () => {
  const result = compute(
    [minimalItem({ box1a: 500, box5: 300, holdingPeriodDays: 60 })],
    { taxableIncome: 197300, filingStatus: "single" },
  );
  assertEquals(findOutput(result, "form8995") !== undefined, true);
  assertEquals(findOutput(result, "form8995a"), undefined);
});

Deno.test("form8995a used when taxable income above Single §199A threshold ($197,300)", () => {
  const result = compute(
    [minimalItem({ box1a: 500, box5: 300, holdingPeriodDays: 60 })],
    { taxableIncome: 197301, filingStatus: "single" },
  );
  assertEquals(findOutput(result, "form8995a") !== undefined, true);
  assertEquals(findOutput(result, "form8995"), undefined);
});

Deno.test("form8995 used when taxable income at MFJ §199A threshold ($394,600)", () => {
  const result = compute(
    [minimalItem({ box1a: 500, box5: 300, holdingPeriodDays: 60 })],
    { taxableIncome: 394600, filingStatus: "mfj" },
  );
  assertEquals(findOutput(result, "form8995") !== undefined, true);
  assertEquals(findOutput(result, "form8995a"), undefined);
});

Deno.test("form8995a used when taxable income above MFJ §199A threshold ($394,600)", () => {
  const result = compute(
    [minimalItem({ box1a: 500, box5: 300, holdingPeriodDays: 60 })],
    { taxableIncome: 394601, filingStatus: "mfj" },
  );
  assertEquals(findOutput(result, "form8995a") !== undefined, true);
  assertEquals(findOutput(result, "form8995"), undefined);
});

// ---------------------------------------------------------------------------
// 7. Foreign Tax Thresholds — Schedule 3 vs Form 1116
// ---------------------------------------------------------------------------

Deno.test("schedule3 used when box7 exactly at $300 single threshold", () => {
  const result = compute([minimalItem({ box7: 300, holdingPeriodDays: 20 })], {
    filingStatus: "single",
  });
  assertEquals(fieldsOf(result.outputs, schedule3)?.line1_foreign_tax_1099, 300);
  assertEquals(findOutput(result, "form_1116"), undefined);
});

Deno.test("form_1116 required when box7 exceeds $300 single threshold", () => {
  const result = compute([minimalItem({ box7: 301, holdingPeriodDays: 20 })], {
    filingStatus: "single",
  });
  assertEquals(fieldsOf(result.outputs, form_1116)?.foreign_tax_paid, 301);
  assertEquals(findOutput(result, "schedule3"), undefined);
});

Deno.test("schedule3 used when box7 exactly at $600 MFJ threshold", () => {
  const result = compute([minimalItem({ box7: 600, holdingPeriodDays: 20 })], {
    filingStatus: "mfj",
  });
  assertEquals(fieldsOf(result.outputs, schedule3)?.line1_foreign_tax_1099, 600);
  assertEquals(findOutput(result, "form_1116"), undefined);
});

Deno.test("form_1116 required when box7 exceeds $600 MFJ threshold", () => {
  const result = compute([minimalItem({ box7: 601, holdingPeriodDays: 20 })], {
    filingStatus: "mfj",
  });
  assertEquals(fieldsOf(result.outputs, form_1116)?.foreign_tax_paid, 601);
  assertEquals(findOutput(result, "schedule3"), undefined);
});

// ---------------------------------------------------------------------------
// 8. Normalization Rules (clamp/promote instead of throw)
// ---------------------------------------------------------------------------

Deno.test("V1: box1b exceeding box1a — promotes box1a to box1b, does not throw", () => {
  // Produces outputs with promoted ordinary dividend amount.
  const result = compute([minimalItem({ box1a: 400, box1b: 500 })]);
  assertEquals(fieldsOf(result.outputs, f1040)?.line3b_ordinary_dividends, 500);
});

Deno.test("V2: box2f exceeding box2a — clamps box2f to box2a, does not throw", () => {
  // box2f is clamped; node continues to produce outputs.
  const result = compute([minimalItem({ box2a: 200, box2f: 300 })]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("V3: box2e exceeding box1a — clamps box2e to box1a, does not throw", () => {
  const result = compute([minimalItem({ box1a: 500, box2e: 600 })]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("V4: box13 exceeding box12 — clamps box13 to box12, does not throw", () => {
  const result = compute([minimalItem({ box12: 150, box13: 200 })]);
  assertEquals(fieldsOf(result.outputs, form6251)?.private_activity_bond_interest, 150);
});

// ---------------------------------------------------------------------------
// 9. Warning-Only Rules (must NOT throw)
// ---------------------------------------------------------------------------

Deno.test("§199A holding period not met — does not throw, box5 excluded", () => {
  const result = compute([
    minimalItem({ box1a: 500, box5: 400, holdingPeriodDays: 30 }),
  ]);
  assertEquals(findOutput(result, "form8995"), undefined);
  assertEquals(findOutput(result, "form8995a"), undefined);
});

Deno.test("foreign tax holding period < 16 days — does not throw, box7 excluded", () => {
  const result = compute([minimalItem({ box7: 200, holdingPeriodDays: 10 })]);
  assertEquals(findOutput(result, "schedule3"), undefined);
  assertEquals(findOutput(result, "form_1116"), undefined);
});

// ---------------------------------------------------------------------------
// 10. Edge Cases
// ---------------------------------------------------------------------------

Deno.test("box2a with no sub-amounts: always routes to schedule_d line13, not f1040 line7a", () => {
  const result = compute([
    minimalItem({ box1a: 1000, box2a: 1000, box2b: 0, box2c: 0, box2d: 0 }),
  ]);
  assertEquals(fieldsOf(result.outputs, schedule_d)?.line13_cap_gain_distrib, 1000);
  assertEquals(fieldsOf(result.outputs, f1040)?.line7a_cap_gain_distrib, undefined);
});

Deno.test("box2a with any sub-amount > 0: standard path (schedule_d), not simplified", () => {
  const result = compute([minimalItem({ box1a: 1000, box2a: 1000, box2b: 50 })]);
  assertEquals(fieldsOf(result.outputs, schedule_d)?.line13_cap_gain_distrib, 1000);
  assertEquals(fieldsOf(result.outputs, f1040)?.line7a_cap_gain_distrib, undefined);
});

Deno.test("box1a = 0, box2a > 0: pure cap-gain fund routes to schedule_d line13", () => {
  const result = compute([minimalItem({ box1a: 0, box2a: 500 })]);
  assertEquals(fieldsOf(result.outputs, schedule_d)?.line13_cap_gain_distrib, 500);
  assertEquals(fieldsOf(result.outputs, f1040)?.line7a_cap_gain_distrib, undefined);
});

Deno.test("isNominee=true passes full box1a amount to schedule_b (subtraction happens in schedule_b node)", () => {
  const result = compute([
    minimalItem({ payerName: "Nominee Payer", box1a: 500, isNominee: true }),
  ]);
  const sbFields = fieldsOf(result.outputs, schedule_b);
  assertEquals(sbFields?.isNominee, true);
  assertEquals(sbFields?.ordinaryDividends, 500);
});

Deno.test("box13 = 0 with box12 > 0 — no form6251 output, only f1040 line2a", () => {
  const result = compute([minimalItem({ box12: 400, box13: 0 })]);
  assertEquals(findOutput(result, "form6251"), undefined);
  assertEquals(fieldsOf(result.outputs, f1040)?.line2a_tax_exempt, 400);
});

// ---------------------------------------------------------------------------
// 11. Smoke Test
// ---------------------------------------------------------------------------

Deno.test("smoke: two payers, all major boxes populated — correct routing throughout", () => {
  // Vanguard: box1a=1000, box1b=700, box2a=500, box2b=100, box2c=50, box2d=75,
  //           box4=80, box5=300, box7=150, box12=400, box13=100
  // Fidelity: box1a=700, box1b=400, box2a=300, box4=30, box5=200
  // Total box1a = 1700 > $1,500 → Schedule B required
  // Single filer, taxableIncome=$100,000 (below §199A threshold) → form8995
  // box7=150 (single) <= $300 → schedule3 simplified path
  const result = compute(
    [
      minimalItem({
        payerName: "Vanguard",
        box1a: 1000,
        box1b: 700,
        box2a: 500,
        box2b: 100,
        box2c: 50,
        box2d: 75,
        box4: 80,
        box5: 300,
        box7: 150,
        box12: 400,
        box13: 100,
        holdingPeriodDays: 60,
      }),
      minimalItem({
        payerName: "Fidelity",
        box1a: 700,
        box1b: 400,
        box2a: 300,
        box4: 30,
        box5: 200,
        holdingPeriodDays: 60,
      }),
    ],
    { taxableIncome: 100000, filingStatus: "single" },
  );

  // Schedule B: 2 payer entries
  const sbOutputs = result.outputs.filter((o) => o.nodeType === "schedule_b");
  assertEquals(sbOutputs.length, 2, "two Schedule B payer entries");
  const sbTotal = sbOutputs.reduce(
    (s, o) => s + ((o.fields.ordinaryDividends as number) ?? 0),
    0,
  );
  assertEquals(sbTotal, 1700, "Schedule B total = box1a sum");

  // f1040 line3a qualified dividends = 700 + 400 = 1100
  assertEquals(
    fieldsOf(result.outputs, f1040)?.line3a_qualified_dividends,
    1100,
    "qualified dividends total",
  );

  // schedule_d line13 cap gain distributions = 500 + 300 = 800 (sub-amounts present)
  assertEquals(
    fieldsOf(result.outputs, schedule_d)?.line13_cap_gain_distrib,
    800,
    "cap gain distributions total",
  );

  // unrecaptured_1250_worksheet = 100 (only Vanguard has box2b)
  assertEquals(
    fieldsOf(result.outputs, unrecaptured_1250_worksheet)?.unrecaptured_1250_gain,
    100,
    "unrecaptured §1250 gain",
  );

  // rate_28_gain_worksheet = 75
  assertEquals(
    fieldsOf(result.outputs, rate_28_gain_worksheet)?.collectibles_gain,
    75,
    "collectibles gain",
  );

  // f1040 line25b withholding = 80 + 30 = 110
  assertEquals(
    fieldsOf(result.outputs, f1040)?.line25b_withheld_1099,
    110,
    "withholding total",
  );

  // form8995 §199A = 300 + 200 = 500 (income below threshold)
  assertEquals(
    fieldsOf(result.outputs, form8995)?.line6_sec199a_dividends,
    500,
    "§199A dividends",
  );
  assertEquals(findOutput(result, "form8995a"), undefined, "form8995a absent below threshold");

  // schedule3 simplified foreign tax: box7=150 (single, <= $300)
  assertEquals(
    fieldsOf(result.outputs, schedule3)?.line1_foreign_tax_1099,
    150,
    "foreign tax simplified path",
  );
  assertEquals(findOutput(result, "form_1116"), undefined, "form_1116 absent on simplified path");

  // f1040 line2a tax-exempt dividends = box12 = 400
  assertEquals(
    fieldsOf(result.outputs, f1040)?.line2a_tax_exempt,
    400,
    "tax-exempt interest (full box12)",
  );

  // form6251 AMT preference = box13 = 100
  assertEquals(
    fieldsOf(result.outputs, form6251)?.private_activity_bond_interest,
    100,
    "AMT PAB preference",
  );
});

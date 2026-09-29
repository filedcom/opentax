import { assertEquals, assertThrows } from "@std/assert";
import { f1099div, inputSchema } from "./index.ts";
import { fieldsOf } from "../../../../../core/test-utils/output.ts";
import { f1040 } from "../../outputs/f1040/index.ts";
import { schedule_b } from "../../intermediate/aggregation/schedule_b/index.ts";
import { schedule_d } from "../../intermediate/aggregation/schedule_d/index.ts";
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
  nominee_distribution: {
    box1a: number;
    box1b?: number;
    box2a?: number;
    box2b?: number;
    box2c?: number;
    box2d?: number;
    box2e?: number;
    box2f?: number;
    box3?: number;
    box4?: number;
    box5?: number;
    box6?: number;
    box7?: number;
    box9?: number;
    box10?: number;
    box12?: number;
    box13?: number;
    box16?: number;
    foreign_source_dividends_usd?: number;
    foreign_source_qualified_dividends_usd?: number;
  };
  box11: boolean;
  box1a: number;
  investment_property_for_form4952: boolean;
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
  foreign_source_dividends_usd: number;
  foreign_source_qualified_dividends_usd: number;
  foreign_tax_irs_country_code: string;
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

function taxedDividend(
  tax: number,
  foreignDividends: number,
  overrides: ItemOverrides = {},
): ItemOverrides {
  return minimalItem({
    box1a: foreignDividends,
    box7: tax,
    box8: "Canada",
    foreign_source_dividends_usd: foreignDividends,
    foreign_tax_irs_country_code: "CA",
    holdingPeriodDays: 20,
    ...overrides,
  });
}

function compute(
  items: ItemOverrides[],
  context: { taxableIncome?: number; filingStatus?: string } = {},
) {
  return f1099div.compute(
    { taxYear: 2025, formType: "f1040" },
    inputSchema.parse({ f1099divs: items, ...context }),
  );
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

Deno.test("f1099div: sourced foreign qualified dividends contradict a zero-preference review", () => {
  const result = compute([minimalItem({
    box1a: 1_000,
    box1b: 500,
    foreign_source_dividends_usd: 500,
    foreign_source_qualified_dividends_usd: 500,
  })]);
  assertEquals(
    fieldsOf(result.outputs, form_1116)?.known_foreign_qualified_dividends,
    500,
  );
});

Deno.test("1099-DIV routes investment-property dividends and capital gain to Form 4952 only when affirmed", () => {
  assertEquals(
    findOutput(compute([minimalItem({ box1a: 500 })]), "form4952"),
    undefined,
  );
  const result = compute([minimalItem({
    box1a: 500,
    box1b: 150,
    box2a: 200,
    investment_property_for_form4952: true,
  })]);
  assertEquals(findOutput(result, "form4952")?.fields, {
    source_1099_dividends: 500,
    source_1099_qualified_dividends: 150,
    source_1099_capital_gain_distributions: 200,
  });
});

Deno.test("1099-DIV routes affirmed private-activity-bond dividends to AMT Form 4952", () => {
  const result = compute([minimalItem({
    box1a: 0,
    box12: 500,
    box13: 200,
    investment_property_for_form4952: true,
  })]);
  assertEquals(
    findOutput(result, "form4952")?.fields
      .source_private_activity_bond_interest,
    200,
  );
});

Deno.test("1099-DIV flagged for Form 4952 cannot have qualified dividends above ordinary dividends", () => {
  assertThrows(
    () =>
      compute([minimalItem({
        box1a: 100,
        box1b: 200,
        investment_property_for_form4952: true,
      })]),
    Error,
    "cannot exceed ordinary dividends on Form 4952",
  );
});

// ---------------------------------------------------------------------------
// 1. Input Schema Validation (one representative test per concern)
// ---------------------------------------------------------------------------

Deno.test("schema: rejects negative box1a", () => {
  assertThrows(() => compute([minimalItem({ box1a: -1 })]), Error);
});

Deno.test("schema: normalizes box1b exceeding box1a — box1a unchanged, box1b flows as reported", () => {
  // box1a is authoritative for ordinary dividends — never inflate it.
  // box1b (qualified dividends) flows as reported even when it exceeds box1a.
  const result = compute([minimalItem({ box1a: 400, box1b: 500 })]);
  assertEquals(fieldsOf(result.outputs, f1040)?.line3b_ordinary_dividends, 400);
  assertEquals(
    fieldsOf(result.outputs, f1040)?.line3a_qualified_dividends,
    500,
  );
});

Deno.test("schema: accepts box1b equal to box1a (boundary)", () => {
  const result = compute([minimalItem({ box1a: 400, box1b: 400 })]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("schema: rejects box2b+2c+2d+2f sum exceeding box2a", () => {
  assertThrows(
    () =>
      compute([
        minimalItem({
          box2a: 300,
          box2b: 100,
          box2c: 100,
          box2d: 100,
          box2f: 100,
        }),
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
  assertEquals(
    fieldsOf(result.outputs, form6251)?.private_activity_bond_interest,
    150,
  );
});

Deno.test("schema: normalizes box5 exceeding box1a — clamps box5 to box1a", () => {
  // box5 (§199A dividends) is clamped to box1a so income is not over-counted.
  const result = compute([minimalItem({ box1a: 500, box5: 600 })]);
  assertEquals(
    fieldsOf(result.outputs, form8995)?.line6_sec199a_dividends,
    500,
  );
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
  assertEquals(sbFields?.dividend_detail, {
    payer_name: "Vanguard",
    gross: 2000,
    net: 2000,
    nominee: 0,
  });
});

Deno.test("box1a below threshold routes directly to f1040 and records Schedule B payer facts", () => {
  const result = compute([minimalItem({ box1a: 500 })]);
  assertEquals(fieldsOf(result.outputs, schedule_b)?.dividend_info, [{
    payerName: "Test Payer",
    amount: 500,
  }]);
  assertEquals(fieldsOf(result.outputs, f1040)?.line3b_ordinary_dividends, 500);
  assertEquals(
    fieldsOf(result.outputs, agi_aggregator)?.line3b_ordinary_dividends,
    500,
  );
});

Deno.test("box1a = 0 produces no ordinary dividend output", () => {
  const result = compute([minimalItem({ box1a: 0 })]);
  assertEquals(
    fieldsOf(result.outputs, f1040)?.line3b_ordinary_dividends,
    undefined,
  );
});

Deno.test("box1b routes to f1040 line3a (qualified dividends)", () => {
  const result = compute([minimalItem({ box1a: 500, box1b: 400 })]);
  assertEquals(
    fieldsOf(result.outputs, f1040)?.line3a_qualified_dividends,
    400,
  );
});

Deno.test("box1b = 0 produces no qualified dividend output", () => {
  const result = compute([minimalItem({ box1a: 500, box1b: 0 })]);
  assertEquals(
    fieldsOf(result.outputs, f1040)?.line3a_qualified_dividends,
    undefined,
  );
});

Deno.test("box2a without sub-amounts routes to schedule_d line13 (always via Schedule D)", () => {
  const result = compute([minimalItem({ box1a: 1000, box2a: 1000 })]);
  assertEquals(
    fieldsOf(result.outputs, schedule_d)?.line13_cap_gain_distrib,
    1000,
  );
  assertEquals(
    fieldsOf(result.outputs, f1040)?.line7a_cap_gain_distrib,
    undefined,
  );
});

Deno.test("capital-gain-only 1099-DIV can omit an unknown payer name", () => {
  const result = compute([{
    isNominee: false,
    box11: false,
    box1a: 0,
    box2a: 7_500,
  }]);
  assertEquals(
    fieldsOf(result.outputs, schedule_d)?.line13_cap_gain_distrib,
    7_500,
  );
  assertEquals(fieldsOf(result.outputs, schedule_b), undefined);
});

Deno.test("1099-DIV without payer name is rejected when Schedule B is required", () => {
  assertThrows(
    () => compute([{ isNominee: false, box11: false, box1a: 2_000 }]),
    Error,
    "payer name is required",
  );
});

Deno.test("box2a with sub-amounts routes to schedule_d line13 (standard path)", () => {
  const result = compute([
    minimalItem({ box1a: 1000, box2a: 1000, box2b: 100 }),
  ]);
  assertEquals(
    fieldsOf(result.outputs, schedule_d)?.line13_cap_gain_distrib,
    1000,
  );
  assertEquals(
    fieldsOf(result.outputs, f1040)?.line7a_cap_gain_distrib,
    undefined,
  );
});

Deno.test("box2b routes to unrecaptured_1250_worksheet", () => {
  const result = compute([minimalItem({ box1a: 500, box2a: 500, box2b: 200 })]);
  assertEquals(
    fieldsOf(result.outputs, unrecaptured_1250_worksheet)
      ?.unrecaptured_1250_gain,
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
  assertEquals(
    fieldsOf(result.outputs, f1040)?.line25b_withheld_1099,
    undefined,
  );
});

Deno.test("box5 routes to form8995 when holding period met (>= 45 days)", () => {
  const result = compute([
    minimalItem({ box1a: 500, box5: 300, holdingPeriodDays: 60 }),
  ]);
  assertEquals(
    fieldsOf(result.outputs, form8995)?.line6_sec199a_dividends,
    300,
  );
  assertEquals(findOutput(result, "form8995a"), undefined);
});

Deno.test("box5 excluded from form8995 when holding period not met (< 45 days)", () => {
  const result = compute([
    minimalItem({ box1a: 500, box5: 400, holdingPeriodDays: 30 }),
  ]);
  assertEquals(findOutput(result, "form8995"), undefined);
  assertEquals(findOutput(result, "form8995a"), undefined);
});

Deno.test("box7 routes to Form 1116 without a no-form election", () => {
  const result = compute([taxedDividend(200, 500)], {
    filingStatus: "single",
  });
  assertEquals(
    fieldsOf(result.outputs, form_1116)?.foreign_tax_items?.[0]
      .foreign_tax_paid,
    200,
  );
});

Deno.test("box7 routes to form_1116 when exceeds $300 single threshold", () => {
  const result = compute([taxedDividend(400, 500)], {
    filingStatus: "single",
  });
  assertEquals(
    fieldsOf(result.outputs, form_1116)?.foreign_tax_items?.[0]
      .foreign_tax_paid,
    400,
  );
});

Deno.test("box7 not routed when holding period < 16 days", () => {
  const result = compute([minimalItem({ box7: 150, holdingPeriodDays: 10 })]);
  assertEquals(findOutput(result, "form_1116"), undefined);
});

Deno.test("foreign tax cannot assume all ordinary dividends are foreign source", () => {
  assertThrows(
    () =>
      compute([minimalItem({ box1a: 500, box7: 50, holdingPeriodDays: 20 })]),
    Error,
    "verified foreign-source dividends",
  );
});

Deno.test("foreign qualified dividends cannot skip the Form 1116 rate adjustment", () => {
  assertThrows(
    () =>
      compute([taxedDividend(50, 500, {
        box1b: 200,
        foreign_source_qualified_dividends_usd: 200,
      })]),
    Error,
    "rate-adjustment worksheet",
  );
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
  const withBox2f = compute([
    minimalItem({ box1a: 500, box2a: 500, box2f: 200 }),
  ]);
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
  assertEquals(sbOutputs.map((output) => output.fields.dividend_detail), [
    { payer_name: "Alpha Fund", gross: 700, net: 700, nominee: 0 },
    { payer_name: "Beta Fund", gross: 800, net: 800, nominee: 0 },
    { payer_name: "Gamma Fund", gross: 600, net: 600, nominee: 0 },
  ]);
  const total = sbOutputs.reduce(
    (sum, o) =>
      sum + ((o.fields.dividend_detail as { net: number }).net),
    0,
  );
  assertEquals(total, 2100);
});

Deno.test("multiple payers — box1b (qualified dividends) summed to single f1040 output", () => {
  const result = compute([
    minimalItem({ box1a: 300, box1b: 200 }),
    minimalItem({ box1a: 400, box1b: 350 }),
  ]);
  assertEquals(
    fieldsOf(result.outputs, f1040)?.line3a_qualified_dividends,
    550,
  );
});

Deno.test("multiple payers — box2a summed for schedule_d when sub-amounts present", () => {
  const result = compute([
    minimalItem({ box1a: 500, box2a: 300, box2b: 50 }),
    minimalItem({ box1a: 600, box2a: 500, box2b: 50 }),
  ]);
  assertEquals(
    fieldsOf(result.outputs, schedule_d)?.line13_cap_gain_distrib,
    800,
  );
});

Deno.test("multiple payers — box2b summed to unrecaptured_1250_worksheet", () => {
  const result = compute([
    minimalItem({ box1a: 500, box2a: 500, box2b: 100 }),
    minimalItem({ box1a: 500, box2a: 500, box2b: 150 }),
  ]);
  assertEquals(
    fieldsOf(result.outputs, unrecaptured_1250_worksheet)
      ?.unrecaptured_1250_gain,
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
  assertEquals(
    fieldsOf(result.outputs, form8995)?.line6_sec199a_dividends,
    900,
  );
});

Deno.test("multiple payers retain separate Form 1116 country sources", () => {
  const result = compute(
    [
      taxedDividend(100, 500),
      taxedDividend(150, 600, {
        box8: "France",
        foreign_tax_irs_country_code: "FR",
      }),
    ],
    { filingStatus: "single" },
  );
  assertEquals(
    fieldsOf(result.outputs, form_1116)?.foreign_tax_items?.map((item) =>
      item.foreign_tax_paid
    ),
    [100, 150],
  );
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

Deno.test("below-threshold dividend keeps payer facts without moving the tax amount", () => {
  const result = compute([minimalItem({ box1a: 1499 })]);
  assertEquals(fieldsOf(result.outputs, schedule_b)?.dividend_info, [{
    payerName: "Test Payer",
    amount: 1499,
  }]);
});

Deno.test("schedule_b not triggered when total box1a exactly $1,500", () => {
  const result = compute([minimalItem({ box1a: 1500 })]);
  assertEquals(fieldsOf(result.outputs, schedule_b)?.dividend_info, [{
    payerName: "Test Payer",
    amount: 1500,
  }]);
  // below threshold: routes directly to f1040 and agi_aggregator
  assertEquals(
    fieldsOf(result.outputs, f1040)?.line3b_ordinary_dividends,
    1500,
  );
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
    minimalItem({
      payerName: "Nominee Payer",
      box1a: 500,
      isNominee: true,
      nominee_distribution: { box1a: 200 },
    }),
  ]);
  const sbFields = fieldsOf(result.outputs, schedule_b);
  assertEquals(sbFields?.dividend_detail, {
    payer_name: "Nominee Payer",
    gross: 500,
    net: 300,
    nominee: 200,
  });
});

Deno.test("multi-payer total below $1,500 retains all payer facts for combined-source threshold", () => {
  const result = compute([
    minimalItem({ payerName: "P1", box1a: 500 }),
    minimalItem({ payerName: "P2", box1a: 499 }),
    minimalItem({ payerName: "P3", box1a: 500 }),
  ]);
  assertEquals(
    (fieldsOf(result.outputs, schedule_b)?.dividend_info as unknown[]).length,
    3,
  );
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
// 7. Foreign tax always reaches Form 1116 without a return-level election
// ---------------------------------------------------------------------------

Deno.test("box7 at $300 still reaches Form 1116", () => {
  const result = compute([taxedDividend(300, 500)], {
    filingStatus: "single",
  });
  assertEquals(
    fieldsOf(result.outputs, form_1116)?.foreign_tax_items?.[0]
      .foreign_tax_paid,
    300,
  );
});

Deno.test("form_1116 required when box7 exceeds $300 single threshold", () => {
  const result = compute([taxedDividend(301, 500)], {
    filingStatus: "single",
  });
  assertEquals(
    fieldsOf(result.outputs, form_1116)?.foreign_tax_items?.[0]
      .foreign_tax_paid,
    301,
  );
});

Deno.test("box7 at $600 MFJ still reaches Form 1116", () => {
  const result = compute([taxedDividend(600, 1000)], {
    filingStatus: "mfj",
  });
  assertEquals(
    fieldsOf(result.outputs, form_1116)?.foreign_tax_items?.[0]
      .foreign_tax_paid,
    600,
  );
});

Deno.test("form_1116 required when box7 exceeds $600 MFJ threshold", () => {
  const result = compute([taxedDividend(601, 1000)], {
    filingStatus: "mfj",
  });
  assertEquals(
    fieldsOf(result.outputs, form_1116)?.foreign_tax_items?.[0]
      .foreign_tax_paid,
    601,
  );
});

// ---------------------------------------------------------------------------
// 8. Normalization Rules (clamp/promote instead of throw)
// ---------------------------------------------------------------------------

Deno.test("V1: box1b exceeding box1a — box1a unchanged, box1b flows as reported, does not throw", () => {
  // box1a is authoritative — ordinary dividends not inflated.
  const result = compute([minimalItem({ box1a: 400, box1b: 500 })]);
  assertEquals(fieldsOf(result.outputs, f1040)?.line3b_ordinary_dividends, 400);
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
  assertEquals(
    fieldsOf(result.outputs, form6251)?.private_activity_bond_interest,
    150,
  );
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
  assertEquals(
    fieldsOf(result.outputs, schedule_d)?.line13_cap_gain_distrib,
    1000,
  );
  assertEquals(
    fieldsOf(result.outputs, f1040)?.line7a_cap_gain_distrib,
    undefined,
  );
});

Deno.test("box2a with any sub-amount > 0: standard path (schedule_d), not simplified", () => {
  const result = compute([
    minimalItem({ box1a: 1000, box2a: 1000, box2b: 50 }),
  ]);
  assertEquals(
    fieldsOf(result.outputs, schedule_d)?.line13_cap_gain_distrib,
    1000,
  );
  assertEquals(
    fieldsOf(result.outputs, f1040)?.line7a_cap_gain_distrib,
    undefined,
  );
});

Deno.test("box1a = 0, box2a > 0: pure cap-gain fund routes to schedule_d line13", () => {
  const result = compute([minimalItem({ box1a: 0, box2a: 500 })]);
  assertEquals(
    fieldsOf(result.outputs, schedule_d)?.line13_cap_gain_distrib,
    500,
  );
  assertEquals(
    fieldsOf(result.outputs, f1040)?.line7a_cap_gain_distrib,
    undefined,
  );
});

Deno.test("isNominee=true carries gross and taxpayer-owned dividends separately", () => {
  const result = compute([
    minimalItem({
      payerName: "Nominee Payer",
      box1a: 500,
      isNominee: true,
      nominee_distribution: { box1a: 200 },
    }),
  ]);
  const sbFields = fieldsOf(result.outputs, schedule_b);
  assertEquals(sbFields?.dividend_detail, {
    payer_name: "Nominee Payer",
    gross: 500,
    net: 300,
    nominee: 200,
  });
});

Deno.test("1099-DIV nominee allocation removes owner amounts from every routed box", () => {
  const result = compute([minimalItem({
    payerName: "Fund",
    isNominee: true,
    box1a: 1_000,
    box1b: 600,
    box2a: 300,
    box4: 100,
    box5: 200,
    box12: 100,
    box13: 20,
    nominee_distribution: {
      box1a: 400,
      box1b: 200,
      box2a: 100,
      box4: 40,
      box5: 80,
      box12: 30,
      box13: 10,
    },
  })]);
  assertEquals(fieldsOf(result.outputs, schedule_b)?.dividend_detail, {
    payer_name: "Fund",
    gross: 1_000,
    net: 600,
    nominee: 400,
  });
  assertEquals(
    fieldsOf(result.outputs, f1040)?.line3a_qualified_dividends,
    400,
  );
  assertEquals(fieldsOf(result.outputs, f1040)?.line25b_withheld_1099, 60);
  assertEquals(fieldsOf(result.outputs, f1040)?.line2a_tax_exempt, 70);
  assertEquals(
    fieldsOf(result.outputs, schedule_d)?.line13_cap_gain_distrib,
    200,
  );
  assertEquals(
    fieldsOf(result.outputs, form8995)?.line6_sec199a_dividends,
    120,
  );
  assertEquals(
    fieldsOf(result.outputs, form6251)?.private_activity_bond_interest,
    10,
  );
});

Deno.test("1099-DIV nominee requires an allocation for every reported box", () => {
  assertThrows(() =>
    compute([minimalItem({
      isNominee: true,
      box1a: 500,
      box1b: 100,
      nominee_distribution: { box1a: 200 },
    })])
  );
  assertThrows(() =>
    compute([minimalItem({
      isNominee: true,
      box1a: 500,
      nominee_distribution: { box1a: 600 },
    })])
  );
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
  // The Vanguard foreign tax is supported by verified source facts.
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
        foreign_source_dividends_usd: 1_000,
        foreign_source_qualified_dividends_usd: 0,
        foreign_tax_irs_country_code: "CA",
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
    (s, o) => s + ((o.fields.dividend_detail as { net: number }).net),
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
    fieldsOf(result.outputs, unrecaptured_1250_worksheet)
      ?.unrecaptured_1250_gain,
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
  assertEquals(
    findOutput(result, "form8995a"),
    undefined,
    "form8995a absent below threshold",
  );

  // Form 1116 receives the Vanguard foreign tax and income.
  assertEquals(
    fieldsOf(result.outputs, form_1116)?.foreign_tax_items?.[0]
      .foreign_tax_paid,
    150,
    "foreign tax",
  );

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

// ---------------------------------------------------------------------------
// Foreign source income for the §904 limitation (Form 1116 Part I line 1a)
// ---------------------------------------------------------------------------

Deno.test("Form 1116 uses verified foreign-source dividends, not all box 1a", () => {
  const result = compute([taxedDividend(400, 3_000, { box1a: 5_000 })]);
  assertEquals(
    fieldsOf(result.outputs, form_1116)?.foreign_tax_items?.[0]
      .foreign_gross_income,
    3_000,
  );
});

Deno.test("only payers that withheld foreign tax contribute foreign_income", () => {
  const result = compute([
    taxedDividend(400, 5000, { payerName: "Foreign Fund" }),
    minimalItem({ payerName: "Domestic Fund", box1a: 20000 }),
  ]);
  assertEquals(
    fieldsOf(result.outputs, form_1116)?.foreign_tax_items?.[0]
      .foreign_tax_paid,
    400,
  );
  assertEquals(
    fieldsOf(result.outputs, form_1116)?.foreign_tax_items?.[0]
      .foreign_gross_income,
    5000,
  );
});

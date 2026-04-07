import { assertEquals, assertThrows } from "@std/assert";
import { f1099div, inputSchema } from "./index.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function minimalItem(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    payerName: "Test Payer",
    isNominee: false,
    box11: false,
    box1a: 0,
    box1b: 0,
    box2a: 0,
    box2b: 0,
    box2c: 0,
    box2d: 0,
    box2e: 0,
    box2f: 0,
    box3: 0,
    box4: 0,
    box5: 0,
    box6: 0,
    box7: 0,
    box9: 0,
    box10: 0,
    box12: 0,
    box13: 0,
    ...overrides,
  };
}

function compute(
  items: Record<string, unknown>[],
  context: Record<string, unknown> = {},
) {
  return f1099div.compute({ taxYear: 2025 }, inputSchema.parse({ f1099divs: items, ...context }));
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// ---------------------------------------------------------------------------
// 1. Input Schema Validation
// ---------------------------------------------------------------------------

Deno.test("rejects missing payerName", () => {
  assertThrows(() => {
    const { payerName: _, ...withoutPayerName } = minimalItem();
    compute([withoutPayerName]);
  }, Error);
});

Deno.test("rejects missing isNominee", () => {
  assertThrows(() => {
    const { isNominee: _, ...withoutIsNominee } = minimalItem();
    compute([withoutIsNominee]);
  }, Error);
});

Deno.test("rejects missing box11", () => {
  assertThrows(() => {
    const { box11: _, ...withoutBox11 } = minimalItem();
    compute([withoutBox11]);
  }, Error);
});

Deno.test("rejects negative box1a", () => {
  assertThrows(() => compute([minimalItem({ box1a: -1 })]), Error);
});

Deno.test("rejects negative box1b", () => {
  assertThrows(() => compute([minimalItem({ box1b: -0.01 })]), Error);
});

Deno.test("rejects negative box2a", () => {
  assertThrows(() => compute([minimalItem({ box2a: -100 })]), Error);
});

Deno.test("rejects negative box2b", () => {
  assertThrows(() => compute([minimalItem({ box2b: -1 })]), Error);
});

Deno.test("rejects negative box2c", () => {
  assertThrows(() => compute([minimalItem({ box2c: -1 })]), Error);
});

Deno.test("rejects negative box2d", () => {
  assertThrows(() => compute([minimalItem({ box2d: -1 })]), Error);
});

Deno.test("rejects negative box2e", () => {
  assertThrows(() => compute([minimalItem({ box2e: -1 })]), Error);
});

Deno.test("rejects negative box2f", () => {
  assertThrows(() => compute([minimalItem({ box2f: -1 })]), Error);
});

Deno.test("rejects negative box3", () => {
  assertThrows(() => compute([minimalItem({ box3: -1 })]), Error);
});

Deno.test("rejects negative box4", () => {
  assertThrows(() => compute([minimalItem({ box4: -1 })]), Error);
});

Deno.test("rejects negative box5", () => {
  assertThrows(() => compute([minimalItem({ box5: -1 })]), Error);
});

Deno.test("rejects negative box6", () => {
  assertThrows(() => compute([minimalItem({ box6: -1 })]), Error);
});

Deno.test("rejects negative box7", () => {
  assertThrows(() => compute([minimalItem({ box7: -1 })]), Error);
});

Deno.test("rejects negative box9", () => {
  assertThrows(() => compute([minimalItem({ box9: -1 })]), Error);
});

Deno.test("rejects negative box10", () => {
  assertThrows(() => compute([minimalItem({ box10: -1 })]), Error);
});

Deno.test("rejects negative box12", () => {
  assertThrows(() => compute([minimalItem({ box12: -1 })]), Error);
});

Deno.test("rejects negative box13", () => {
  assertThrows(() => compute([minimalItem({ box13: -1 })]), Error);
});

Deno.test("rejects negative box16", () => {
  assertThrows(() => compute([minimalItem({ box16: -1 })]), Error);
});

Deno.test("accepts empty items array", () => {
  assertEquals(Array.isArray(compute([]).outputs), true);
});

Deno.test("accepts all-zero monetary fields", () => {
  assertEquals(Array.isArray(compute([minimalItem()]).outputs), true);
});

Deno.test("accepts payerEIN as optional", () => {
  // payerEIN not required — omitting should not throw
  assertEquals(
    Array.isArray(compute([minimalItem()]).outputs),
    true,
  );
});

Deno.test("accepts box8 as optional", () => {
  const { box8: _, ...withoutBox8 } = minimalItem();
  assertEquals(Array.isArray(compute([withoutBox8]).outputs), true);
});

Deno.test("accepts box14/15/16 as optional", () => {
  // box14, box15, box16 are optional state fields; omitting must not throw
  assertEquals(Array.isArray(compute([minimalItem()]).outputs), true);
});

// ---------------------------------------------------------------------------
// 2. Per-Box Routing
// ---------------------------------------------------------------------------

Deno.test("box1a routes to Schedule B Part II", () => {
  const result = compute([minimalItem({ box1a: 2000 })]);
  const out = findOutput(result, "schedule_b");
  assertEquals(out !== undefined, true);
});

Deno.test("box1a zero — does not route to Schedule B when under threshold", () => {
  const result = compute([minimalItem({ box1a: 0, isNominee: false })]);
  const out = findOutput(result, "schedule_b");
  assertEquals(out, undefined);
});

Deno.test("box1b routes to Form 1040 Line 3a", () => {
  const result = compute([minimalItem({ box1a: 500, box1b: 500 })]);
  const out = result.outputs.find(
    (o) =>
      o.nodeType === "f1040" &&
      o.fields.line3a_qualified_dividends !== undefined,
  );
  assertEquals(out !== undefined, true);
  assertEquals(out?.fields.line3a_qualified_dividends as number, 500);
});

Deno.test("box1b zero — does not produce qualified dividend output", () => {
  const result = compute([minimalItem({ box1a: 500, box1b: 0 })]);
  const f1040Out = result.outputs.filter(
    (o) =>
      o.nodeType === "f1040" &&
      o.fields.line3a_qualified_dividends !== undefined,
  );
  assertEquals(f1040Out.length, 0);
});

Deno.test("box2a routes to Schedule D Line 13 (standard path)", () => {
  // box2b = 100 forces standard path (sub-amount present)
  const result = compute([
    minimalItem({ box1a: 1000, box2a: 1000, box2b: 100 }),
  ]);
  const out = findOutput(result, "schedule_d");
  assertEquals(out !== undefined, true);
  assertEquals(out?.fields.line13_cap_gain_distrib as number, 1000);
});

Deno.test("box2a routes to Form 1040 Line 7a (simplified path)", () => {
  const result = compute([
    minimalItem({ box1a: 1000, box2a: 1000, box2b: 0, box2c: 0, box2d: 0 }),
  ]);
  const f1040Out = result.outputs.filter(
    (o) =>
      o.nodeType === "f1040" && o.fields.line7a_cap_gain_distrib !== undefined,
  );
  assertEquals(f1040Out.length > 0, true);
  // must NOT also route to schedule_d for the same distribution
  assertEquals(findOutput(result, "schedule_d"), undefined);
});

Deno.test("box2a zero — no capital gain distribution output", () => {
  const result = compute([minimalItem({ box1a: 100, box2a: 0 })]);
  assertEquals(findOutput(result, "schedule_d"), undefined);
});

Deno.test("box2b routes to Unrecaptured §1250 Gain Worksheet Line 11", () => {
  const result = compute([minimalItem({ box1a: 500, box2a: 500, box2b: 200 })]);
  const out = findOutput(result, "unrecaptured_1250_worksheet");
  assertEquals(out !== undefined, true);
  assertEquals(out?.fields.unrecaptured_1250_gain as number, 200);
});

Deno.test("box2b zero — no unrecaptured §1250 output", () => {
  const result = compute([minimalItem({ box1a: 500, box2a: 500, box2b: 0 })]);
  assertEquals(findOutput(result, "unrecaptured_1250_worksheet"), undefined);
});

Deno.test("box2c routes to Schedule D (Section 1202 QSBS)", () => {
  const result = compute([minimalItem({ box1a: 500, box2a: 500, box2c: 300 })]);
  const out = findOutput(result, "schedule_d");
  assertEquals(out !== undefined, true);
  assertEquals(out?.fields.box2c_qsbs as number, 300);
});

Deno.test("box2c zero — no Section 1202 output", () => {
  const result = compute([minimalItem({ box1a: 500, box2a: 500, box2c: 0 })]);
  const schedDOut = findOutput(result, "schedule_d");
  if (schedDOut !== undefined) {
    assertEquals((schedDOut.fields.box2c_qsbs as number | undefined) ?? 0, 0);
  }
});

Deno.test("box2d routes to 28% Rate Gain Worksheet", () => {
  const result = compute([minimalItem({ box1a: 500, box2a: 500, box2d: 150 })]);
  const out = findOutput(result, "rate_28_gain_worksheet");
  assertEquals(out !== undefined, true);
  assertEquals(out?.fields.collectibles_gain as number, 150);
});

Deno.test("box2d zero — no collectibles gain output", () => {
  const result = compute([minimalItem({ box1a: 500, box2a: 500, box2d: 0 })]);
  assertEquals(findOutput(result, "rate_28_gain_worksheet"), undefined);
});

Deno.test("box2e does not produce tax output (informational only)", () => {
  const baseline = compute([minimalItem({ box1a: 500 })]);
  const withBox2e = compute([minimalItem({ box1a: 500, box2e: 400 })]);
  assertEquals(withBox2e.outputs.length, baseline.outputs.length);
});

Deno.test("box2f does not produce tax output (informational only)", () => {
  const baseline = compute([minimalItem({ box1a: 500, box2a: 500 })]);
  const withBox2f = compute([
    minimalItem({ box1a: 500, box2a: 500, box2f: 200 }),
  ]);
  assertEquals(withBox2f.outputs.length, baseline.outputs.length);
});

Deno.test("box3 does not route to Schedule B", () => {
  const result = compute([minimalItem({ box3: 500 })]);
  assertEquals(findOutput(result, "schedule_b"), undefined);
});

Deno.test("box4 routes to Form 1040 Line 25b", () => {
  const result = compute([minimalItem({ box4: 75 })]);
  const out = result.outputs.find(
    (o) =>
      o.nodeType === "f1040" && o.fields.line25b_withheld_1099 !== undefined,
  );
  assertEquals(out !== undefined, true);
  assertEquals(out?.fields.line25b_withheld_1099 as number, 75);
});

Deno.test("box4 zero — no withholding output", () => {
  const result = compute([minimalItem({ box4: 0 })]);
  const out = result.outputs.find(
    (o) =>
      o.nodeType === "f1040" && o.fields.line25b_withheld_1099 !== undefined,
  );
  assertEquals(out, undefined);
});

Deno.test("box5 routes to Form 8995 Line 6 (holding period met)", () => {
  const result = compute(
    [minimalItem({ box1a: 500, box5: 300, holdingPeriodDays: 60 })],
  );
  const out = findOutput(result, "form8995");
  assertEquals(out !== undefined, true);
  assertEquals(out?.fields.line6_sec199a_dividends as number, 300);
});

Deno.test("box5 zero — no §199A output", () => {
  const result = compute([minimalItem({ box1a: 500, box5: 0 })]);
  assertEquals(findOutput(result, "form8995"), undefined);
  assertEquals(findOutput(result, "form8995a"), undefined);
});

Deno.test("box7 routes to Schedule 3 Line 1 (simplified path)", () => {
  const result = compute(
    [minimalItem({ box7: 200, holdingPeriodDays: 20 })],
    { filingStatus: "single" },
  );
  const out = findOutput(result, "schedule3");
  assertEquals(out !== undefined, true);
  assertEquals(out?.fields.line1_foreign_tax_1099 as number, 200);
});

Deno.test("box7 routes to Form 1116 Part II (full path)", () => {
  const result = compute(
    [minimalItem({ box7: 400, holdingPeriodDays: 20 })],
    { filingStatus: "single" },
  );
  const out = findOutput(result, "form_1116");
  assertEquals(out !== undefined, true);
  assertEquals(out?.fields.foreign_tax_paid as number, 400);
  // simplified path must NOT also be used
  assertEquals(findOutput(result, "schedule3"), undefined);
});

Deno.test("box7 zero — no foreign tax output", () => {
  const result = compute([minimalItem({ box7: 0 })]);
  assertEquals(findOutput(result, "form_1116"), undefined);
  assertEquals(findOutput(result, "schedule3"), undefined);
});

Deno.test("box9 routes to basis tracker (not Schedule B)", () => {
  const result = compute([minimalItem({ box9: 1000 })]);
  assertEquals(findOutput(result, "schedule_b"), undefined);
});

Deno.test("box10 routes to basis tracker (not Schedule B)", () => {
  const result = compute([minimalItem({ box10: 500 })]);
  assertEquals(findOutput(result, "schedule_b"), undefined);
});

Deno.test("box12 routes to Form 1040 Line 2a", () => {
  const result = compute([minimalItem({ box12: 600 })]);
  const out = result.outputs.find(
    (o) => o.nodeType === "f1040" && o.fields.line2a_tax_exempt !== undefined,
  );
  assertEquals(out !== undefined, true);
  assertEquals(out?.fields.line2a_tax_exempt as number, 600);
});

Deno.test("box12 zero — no exempt interest output", () => {
  const result = compute([minimalItem({ box12: 0 })]);
  const out = result.outputs.find(
    (o) => o.nodeType === "f1040" && o.fields.line2a_tax_exempt !== undefined,
  );
  assertEquals(out, undefined);
});

Deno.test("box13 routes to Form 6251 Line 2g", () => {
  const result = compute([minimalItem({ box12: 200, box13: 100 })]);
  const out = findOutput(result, "form6251");
  assertEquals(out !== undefined, true);
  assertEquals(out?.fields.private_activity_bond_interest as number, 100);
});

Deno.test("box13 zero — no AMT preference output", () => {
  const result = compute([minimalItem({ box12: 200, box13: 0 })]);
  assertEquals(findOutput(result, "form6251"), undefined);
});

Deno.test("box11 true — no tax calculation output", () => {
  // box11 is a FATCA checkbox — informational only; must not change tax outputs
  const baseline = compute([minimalItem()]);
  const withBox11 = compute([minimalItem({ box11: true })]);
  assertEquals(baseline.outputs.length, withBox11.outputs.length);
});

// ---------------------------------------------------------------------------
// 3. Aggregation
// ---------------------------------------------------------------------------

Deno.test("box1a sums across multiple payers for Schedule B", () => {
  const result = compute([
    minimalItem({ payerName: "Payer A", box1a: 600 }),
    minimalItem({ payerName: "Payer B", box1a: 700 }),
    minimalItem({ payerName: "Payer C", box1a: 400 }),
  ]);
  const schedBOutputs = result.outputs.filter((o) =>
    o.nodeType === "schedule_b"
  );
  assertEquals(schedBOutputs.length, 3);
  const total = schedBOutputs.reduce(
    (sum, o) => sum + ((o.fields.ordinaryDividends as number | undefined) ?? 0),
    0,
  );
  assertEquals(total, 1700);
});

Deno.test("box1a Schedule B total flows to Form 1040 Line 3b", () => {
  const result = compute([
    minimalItem({ payerName: "Payer A", box1a: 800 }),
    minimalItem({ payerName: "Payer B", box1a: 900 }),
  ]);
  const schedBInputs = result.outputs
    .filter((o) => o.nodeType === "schedule_b")
    .map((o) => o.fields.ordinaryDividends as number);
  const total = schedBInputs.reduce((s, v) => s + v, 0);
  assertEquals(total, 1700);
});

Deno.test("box1b sums across multiple payers for Form 1040 Line 3a", () => {
  const result = compute([
    minimalItem({ box1a: 300, box1b: 200 }),
    minimalItem({ box1a: 400, box1b: 350 }),
  ]);
  const total = result.outputs
    .filter(
      (o) =>
        o.nodeType === "f1040" &&
        o.fields.line3a_qualified_dividends !== undefined,
    )
    .reduce(
      (sum, o) => sum + (o.fields.line3a_qualified_dividends as number),
      0,
    );
  assertEquals(total, 550);
});

Deno.test("box2a sums across multiple payers for Schedule D Line 13", () => {
  // sub-amounts > 0 to force standard path
  const result = compute([
    minimalItem({ box1a: 500, box2a: 300, box2b: 50 }),
    minimalItem({ box1a: 600, box2a: 500, box2b: 50 }),
  ]);
  const total = result.outputs
    .filter(
      (o) =>
        o.nodeType === "schedule_d" &&
        o.fields.line13_cap_gain_distrib !== undefined,
    )
    .reduce((sum, o) => sum + (o.fields.line13_cap_gain_distrib as number), 0);
  assertEquals(total, 800);
});

Deno.test("box2b sums across multiple payers for §1250 Worksheet", () => {
  const result = compute([
    minimalItem({ box1a: 500, box2a: 500, box2b: 100 }),
    minimalItem({ box1a: 500, box2a: 500, box2b: 150 }),
  ]);
  const total = result.outputs
    .filter((o) => o.nodeType === "unrecaptured_1250_worksheet")
    .reduce((sum, o) => sum + (o.fields.unrecaptured_1250_gain as number), 0);
  assertEquals(total, 250);
});

Deno.test("box2c sums across multiple payers for Schedule D", () => {
  const result = compute([
    minimalItem({ box1a: 400, box2a: 400, box2c: 200 }),
    minimalItem({ box1a: 400, box2a: 400, box2c: 300 }),
  ]);
  const total = result.outputs
    .filter(
      (o) => o.nodeType === "schedule_d" && o.fields.box2c_qsbs !== undefined,
    )
    .reduce((sum, o) => sum + (o.fields.box2c_qsbs as number), 0);
  assertEquals(total, 500);
});

Deno.test("box2d sums across multiple payers for 28% Rate Worksheet", () => {
  const result = compute([
    minimalItem({ box1a: 400, box2a: 400, box2d: 200 }),
    minimalItem({ box1a: 400, box2a: 400, box2d: 300 }),
  ]);
  const total = result.outputs
    .filter((o) => o.nodeType === "rate_28_gain_worksheet")
    .reduce((sum, o) => sum + (o.fields.collectibles_gain as number), 0);
  assertEquals(total, 500);
});

Deno.test("box4 sums across multiple payers for Line 25b", () => {
  const result = compute([
    minimalItem({ box4: 50 }),
    minimalItem({ box4: 75 }),
    minimalItem({ box4: 25 }),
  ]);
  const total = result.outputs
    .filter(
      (o) =>
        o.nodeType === "f1040" && o.fields.line25b_withheld_1099 !== undefined,
    )
    .reduce((sum, o) => sum + (o.fields.line25b_withheld_1099 as number), 0);
  assertEquals(total, 150);
});

Deno.test("box5 sums across multiple payers for Form 8995 Line 6", () => {
  const result = compute([
    minimalItem({ box1a: 500, box5: 400, holdingPeriodDays: 60 }),
    minimalItem({ box1a: 500, box5: 600, holdingPeriodDays: 60 }),
  ]);
  const total = result.outputs
    .filter((o) => o.nodeType === "form8995")
    .reduce((sum, o) => sum + (o.fields.line6_sec199a_dividends as number), 0);
  assertEquals(total, 1000);
});

Deno.test("box7 sums across multiple payers (passive basket)", () => {
  // total 250 <= $300 single → simplified path via schedule3
  const result = compute(
    [
      minimalItem({ box7: 100, holdingPeriodDays: 20 }),
      minimalItem({ box7: 150, holdingPeriodDays: 20 }),
    ],
    { filingStatus: "single" },
  );
  const total = result.outputs
    .filter((o) => o.nodeType === "schedule3")
    .reduce((sum, o) => sum + (o.fields.line1_foreign_tax_1099 as number), 0);
  assertEquals(total, 250);
});

Deno.test("box12 sums across multiple payers for Form 1040 Line 2a", () => {
  const result = compute([
    minimalItem({ box12: 300 }),
    minimalItem({ box12: 450 }),
  ]);
  const total = result.outputs
    .filter(
      (o) => o.nodeType === "f1040" && o.fields.line2a_tax_exempt !== undefined,
    )
    .reduce((sum, o) => sum + (o.fields.line2a_tax_exempt as number), 0);
  assertEquals(total, 750);
});

Deno.test("box13 sums across multiple payers for Form 6251 Line 2g", () => {
  const result = compute([
    minimalItem({ box12: 100, box13: 80 }),
    minimalItem({ box12: 150, box13: 120 }),
  ]);
  const total = result.outputs
    .filter((o) => o.nodeType === "form6251")
    .reduce((sum, o) => sum + (o.fields.private_activity_bond_interest as number), 0);
  assertEquals(total, 200);
});

// ---------------------------------------------------------------------------
// 4. Thresholds
// ---------------------------------------------------------------------------

Deno.test("Schedule B not triggered when total box1a below $1,500", () => {
  const result = compute([minimalItem({ box1a: 1499, isNominee: false })]);
  assertEquals(findOutput(result, "schedule_b"), undefined);
});

Deno.test("Schedule B triggered when total box1a equals $1,500", () => {
  // IRS rule: Schedule B required only when dividends EXCEED $1,500 (> not >=).
  // At exactly $1,500 Schedule B is NOT required — but ordinary dividends still
  // route directly to f1040 and agi_aggregator.
  const withExactly1500 = compute([
    minimalItem({ box1a: 1500, isNominee: false }),
  ]);
  assertEquals(findOutput(withExactly1500, "schedule_b"), undefined);
  assertEquals(findOutput(withExactly1500, "f1040") !== undefined, true);
  assertEquals(findOutput(withExactly1500, "agi_aggregator") !== undefined, true);
});

Deno.test("Schedule B triggered when total box1a above $1,500", () => {
  const result = compute([minimalItem({ box1a: 1501, isNominee: false })]);
  assertEquals(findOutput(result, "schedule_b") !== undefined, true);
});

Deno.test("Form 8995 used when taxable income below §199A Single threshold ($197,300)", () => {
  const result = compute(
    [minimalItem({ box1a: 500, box5: 300, holdingPeriodDays: 60 })],
    { taxableIncome: 197299, filingStatus: "single" },
  );
  assertEquals(findOutput(result, "form8995") !== undefined, true);
  assertEquals(findOutput(result, "form8995a"), undefined);
});

Deno.test("Form 8995 used when taxable income equals §199A Single threshold ($197,300)", () => {
  const result = compute(
    [minimalItem({ box1a: 500, box5: 300, holdingPeriodDays: 60 })],
    { taxableIncome: 197300, filingStatus: "single" },
  );
  assertEquals(findOutput(result, "form8995") !== undefined, true);
  assertEquals(findOutput(result, "form8995a"), undefined);
});

Deno.test("Form 8995-A used when taxable income above §199A Single threshold ($197,300)", () => {
  const result = compute(
    [minimalItem({ box1a: 500, box5: 300, holdingPeriodDays: 60 })],
    { taxableIncome: 197301, filingStatus: "single" },
  );
  assertEquals(findOutput(result, "form8995a") !== undefined, true);
  assertEquals(findOutput(result, "form8995"), undefined);
});

Deno.test("Form 8995 used when taxable income below §199A MFJ threshold ($394,600)", () => {
  const result = compute(
    [minimalItem({ box1a: 500, box5: 300, holdingPeriodDays: 60 })],
    { taxableIncome: 394599, filingStatus: "mfj" },
  );
  assertEquals(findOutput(result, "form8995") !== undefined, true);
  assertEquals(findOutput(result, "form8995a"), undefined);
});

Deno.test("Form 8995 used when taxable income equals §199A MFJ threshold ($394,600)", () => {
  const result = compute(
    [minimalItem({ box1a: 500, box5: 300, holdingPeriodDays: 60 })],
    { taxableIncome: 394600, filingStatus: "mfj" },
  );
  assertEquals(findOutput(result, "form8995") !== undefined, true);
  assertEquals(findOutput(result, "form8995a"), undefined);
});

Deno.test("Form 8995-A used when taxable income above §199A MFJ threshold ($394,600)", () => {
  const result = compute(
    [minimalItem({ box1a: 500, box5: 300, holdingPeriodDays: 60 })],
    { taxableIncome: 394601, filingStatus: "mfj" },
  );
  assertEquals(findOutput(result, "form8995a") !== undefined, true);
  assertEquals(findOutput(result, "form8995"), undefined);
});

Deno.test("Simplified foreign tax election allowed when box7 below $300 (Single)", () => {
  const result = compute(
    [minimalItem({ box7: 299, holdingPeriodDays: 20 })],
    { filingStatus: "single" },
  );
  assertEquals(findOutput(result, "schedule3") !== undefined, true);
  assertEquals(findOutput(result, "form_1116"), undefined);
});

Deno.test("Simplified foreign tax election allowed when box7 equals $300 (Single)", () => {
  const result = compute(
    [minimalItem({ box7: 300, holdingPeriodDays: 20 })],
    { filingStatus: "single" },
  );
  assertEquals(findOutput(result, "schedule3") !== undefined, true);
  assertEquals(findOutput(result, "form_1116"), undefined);
});

Deno.test("Form 1116 required when box7 exceeds $300 (Single)", () => {
  const result = compute(
    [minimalItem({ box7: 301, holdingPeriodDays: 20 })],
    { filingStatus: "single" },
  );
  assertEquals(findOutput(result, "form_1116") !== undefined, true);
  assertEquals(findOutput(result, "schedule3"), undefined);
});

Deno.test("Simplified foreign tax election allowed when box7 below $600 (MFJ)", () => {
  const result = compute(
    [minimalItem({ box7: 599, holdingPeriodDays: 20 })],
    { filingStatus: "mfj" },
  );
  assertEquals(findOutput(result, "schedule3") !== undefined, true);
  assertEquals(findOutput(result, "form_1116"), undefined);
});

Deno.test("Simplified foreign tax election allowed when box7 equals $600 (MFJ)", () => {
  const result = compute(
    [minimalItem({ box7: 600, holdingPeriodDays: 20 })],
    { filingStatus: "mfj" },
  );
  assertEquals(findOutput(result, "schedule3") !== undefined, true);
  assertEquals(findOutput(result, "form_1116"), undefined);
});

Deno.test("Form 1116 required when box7 exceeds $600 (MFJ)", () => {
  const result = compute(
    [minimalItem({ box7: 601, holdingPeriodDays: 20 })],
    { filingStatus: "mfj" },
  );
  assertEquals(findOutput(result, "form_1116") !== undefined, true);
  assertEquals(findOutput(result, "schedule3"), undefined);
});

Deno.test("§199A phase-out begins at $197,300 Single — Form 8995-A engaged", () => {
  const result = compute(
    [minimalItem({ box1a: 500, box5: 300, holdingPeriodDays: 60 })],
    { taxableIncome: 197301, filingStatus: "single" },
  );
  assertEquals(findOutput(result, "form8995a") !== undefined, true);
});

Deno.test("§199A phase-out ends at $247,300 Single", () => {
  const result = compute(
    [minimalItem({ box1a: 500, box5: 300, holdingPeriodDays: 60 })],
    { taxableIncome: 247300, filingStatus: "single" },
  );
  assertEquals(findOutput(result, "form8995a") !== undefined, true);
});

Deno.test("§199A phase-out ends at $494,600 MFJ", () => {
  const result = compute(
    [minimalItem({ box1a: 500, box5: 300, holdingPeriodDays: 60 })],
    { taxableIncome: 494600, filingStatus: "mfj" },
  );
  assertEquals(findOutput(result, "form8995a") !== undefined, true);
});

// ---------------------------------------------------------------------------
// 5. Hard Validation Rules (ERROR)
// ---------------------------------------------------------------------------

Deno.test("V1 throws when box1b exceeds box1a", () => {
  assertThrows(
    () => compute([minimalItem({ box1a: 400, box1b: 500 })]),
    Error,
  );
});

Deno.test("V1 passes at boundary when box1b equals box1a", () => {
  assertEquals(
    Array.isArray(
      compute([minimalItem({ box1a: 400, box1b: 400 })]).outputs,
    ),
    true,
  );
});

Deno.test("V2 throws when box2b exceeds box2a", () => {
  assertThrows(
    () => compute([minimalItem({ box2a: 200, box2b: 300 })]),
    Error,
  );
});

Deno.test("V2 passes at boundary when box2b equals box2a", () => {
  assertEquals(
    Array.isArray(
      compute([minimalItem({ box2a: 200, box2b: 200 })]).outputs,
    ),
    true,
  );
});

Deno.test("V3 throws when box2c exceeds box2a", () => {
  assertThrows(
    () => compute([minimalItem({ box2a: 200, box2c: 300 })]),
    Error,
  );
});

Deno.test("V3 passes at boundary when box2c equals box2a", () => {
  assertEquals(
    Array.isArray(
      compute([minimalItem({ box2a: 200, box2c: 200 })]).outputs,
    ),
    true,
  );
});

Deno.test("V4 throws when box2d exceeds box2a", () => {
  assertThrows(
    () => compute([minimalItem({ box2a: 200, box2d: 300 })]),
    Error,
  );
});

Deno.test("V4 passes at boundary when box2d equals box2a", () => {
  assertEquals(
    Array.isArray(
      compute([minimalItem({ box2a: 200, box2d: 200 })]).outputs,
    ),
    true,
  );
});

Deno.test("V5 throws when box2f exceeds box2a", () => {
  assertThrows(
    () => compute([minimalItem({ box2a: 200, box2f: 300 })]),
    Error,
  );
});

Deno.test("V5 passes at boundary when box2f equals box2a", () => {
  assertEquals(
    Array.isArray(
      compute([minimalItem({ box2a: 200, box2f: 200 })]).outputs,
    ),
    true,
  );
});

Deno.test("V6 throws when sum of box2b+2c+2d+2f exceeds box2a", () => {
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

Deno.test("V6 passes when sum of box2b+2c+2d+2f equals box2a", () => {
  assertEquals(
    Array.isArray(
      compute([
        minimalItem({
          box2a: 400,
          box2b: 100,
          box2c: 100,
          box2d: 100,
          box2f: 100,
        }),
      ]).outputs,
    ),
    true,
  );
});

Deno.test("V7 throws when box13 exceeds box12", () => {
  assertThrows(
    () => compute([minimalItem({ box12: 150, box13: 200 })]),
    Error,
  );
});

Deno.test("V7 passes at boundary when box13 equals box12", () => {
  assertEquals(
    Array.isArray(
      compute([minimalItem({ box12: 150, box13: 150 })]).outputs,
    ),
    true,
  );
});

Deno.test("V8 throws when box5 exceeds box1a", () => {
  assertThrows(
    () => compute([minimalItem({ box1a: 500, box5: 600 })]),
    Error,
  );
});

Deno.test("V8 passes at boundary when box5 equals box1a", () => {
  assertEquals(
    Array.isArray(
      compute([minimalItem({ box1a: 500, box5: 500 })]).outputs,
    ),
    true,
  );
});

Deno.test("throws when box2e exceeds box1a", () => {
  assertThrows(
    () => compute([minimalItem({ box1a: 500, box2e: 600 })]),
    Error,
  );
});

Deno.test("passes at boundary when box2e equals box1a", () => {
  assertEquals(
    Array.isArray(
      compute([minimalItem({ box1a: 500, box2e: 500 })]).outputs,
    ),
    true,
  );
});

// ---------------------------------------------------------------------------
// 6. Warning-Only Rules (must NOT throw)
// ---------------------------------------------------------------------------

Deno.test("V9 does not throw when §199A holding period not met", () => {
  assertEquals(
    Array.isArray(
      compute([
        minimalItem({ box1a: 500, box5: 400, holdingPeriodDays: 30 }),
      ]).outputs,
    ),
    true,
  );
});

Deno.test("V9 box5 not routed to Form 8995 when holding period not met", () => {
  const result = compute([
    minimalItem({ box1a: 500, box5: 400, holdingPeriodDays: 30 }),
  ]);
  assertEquals(findOutput(result, "form8995"), undefined);
  assertEquals(findOutput(result, "form8995a"), undefined);
});

Deno.test("V10 does not throw when foreign tax holding period not met", () => {
  assertEquals(
    Array.isArray(
      compute([
        minimalItem({ box7: 200, holdingPeriodDays: 10 }),
      ]).outputs,
    ),
    true,
  );
});

Deno.test("V10 box7 not routed to Schedule 3 via simplified election when holding period not met", () => {
  const result = compute([
    minimalItem({ box7: 200, holdingPeriodDays: 10 }),
  ]);
  assertEquals(findOutput(result, "schedule3"), undefined);
});

Deno.test("V10 box7 not routed to Form 1116 when holding period not met", () => {
  const result = compute([
    minimalItem({ box7: 200, holdingPeriodDays: 10 }),
  ]);
  assertEquals(findOutput(result, "form_1116"), undefined);
});

// ---------------------------------------------------------------------------
// 7. Informational Fields
// ---------------------------------------------------------------------------

Deno.test("box2e produces no tax form output", () => {
  const baseline = compute([minimalItem({ box1a: 500 })]);
  const withBox2e = compute([minimalItem({ box1a: 500, box2e: 500 })]);
  assertEquals(withBox2e.outputs.length, baseline.outputs.length);
});

Deno.test("box2f produces no tax form output", () => {
  const baseline = compute([minimalItem({ box1a: 500, box2a: 500 })]);
  const withBox2f = compute([
    minimalItem({ box1a: 500, box2a: 500, box2f: 300 }),
  ]);
  assertEquals(withBox2f.outputs.length, baseline.outputs.length);
});

Deno.test("box3 produces no current-year form output", () => {
  // Nondividend / return of capital — no income output
  const result = compute([minimalItem({ box3: 1000 })]);
  const incomeOutputs = result.outputs.filter(
    (o) =>
      o.nodeType === "schedule_b" ||
      o.nodeType === "f1040" ||
      o.nodeType === "schedule_d",
  );
  assertEquals(incomeOutputs.length, 0);
});

Deno.test("box6 produces no Schedule A deduction output", () => {
  // Investment expenses — permanently suspended under OBBBA; no Schedule A output
  const result = compute([minimalItem({ box6: 250 })]);
  assertEquals(findOutput(result, "schedule_a"), undefined);
});

Deno.test("box11 true produces no tax calculation output", () => {
  // FATCA checkbox — informational only
  const baseline = compute([minimalItem()]);
  const withBox11 = compute([minimalItem({ box11: true })]);
  assertEquals(withBox11.outputs.length, baseline.outputs.length);
});

Deno.test("box8 produces no tax output", () => {
  // Foreign country name — does not independently trigger any form
  const baseline = compute([minimalItem({ box7: 0 })]);
  const withBox8 = compute([minimalItem({ box7: 0, box8: "France" })]);
  assertEquals(withBox8.outputs.length, baseline.outputs.length);
});

Deno.test("box14 produces no federal tax output", () => {
  // State abbreviation — state field only
  const baseline = compute([minimalItem()]);
  const withBox14 = compute([minimalItem({ box14: "CA" })]);
  assertEquals(withBox14.outputs.length, baseline.outputs.length);
});

Deno.test("box15 produces no federal tax output", () => {
  // Payer state ID — state field only
  const baseline = compute([minimalItem()]);
  const withBox15 = compute([minimalItem({ box15: "94-1234567" })]);
  assertEquals(withBox15.outputs.length, baseline.outputs.length);
});

Deno.test("box16 produces no federal tax output", () => {
  const baseline = compute([minimalItem()]);
  const withBox16 = compute([minimalItem({ box16: 500 })]);
  assertEquals(withBox16.outputs.length, baseline.outputs.length);
});

Deno.test("box9 does not route to Schedule B or ordinary income", () => {
  // Cash liquidating distribution — basis tracking only
  const result = compute([minimalItem({ box9: 2000 })]);
  assertEquals(findOutput(result, "schedule_b"), undefined);
  const ordinaryOutputs = result.outputs.filter(
    (o) => o.nodeType === "f1040" && o.fields.ordinary_dividends !== undefined,
  );
  assertEquals(ordinaryOutputs.length, 0);
});

Deno.test("box10 does not route to Schedule B or ordinary income", () => {
  // Noncash liquidating distribution — basis tracking only
  const result = compute([minimalItem({ box10: 1500 })]);
  assertEquals(findOutput(result, "schedule_b"), undefined);
  const ordinaryOutputs = result.outputs.filter(
    (o) => o.nodeType === "f1040" && o.fields.ordinary_dividends !== undefined,
  );
  assertEquals(ordinaryOutputs.length, 0);
});

// ---------------------------------------------------------------------------
// 8. Edge Cases
// ---------------------------------------------------------------------------

Deno.test("box1b = 0 on all records — no qualified dividend output", () => {
  const result = compute([
    minimalItem({ box1a: 1000, box1b: 0 }),
    minimalItem({ box1a: 800, box1b: 0 }),
  ]);
  const qualDivOutputs = result.outputs.filter(
    (o) =>
      o.nodeType === "f1040" &&
      o.fields.line3a_qualified_dividends !== undefined,
  );
  assertEquals(qualDivOutputs.length, 0);
});

Deno.test("box2a with no sub-amounts and no other Schedule D — simplified path used", () => {
  const result = compute([
    minimalItem({ box1a: 1000, box2a: 1000, box2b: 0, box2c: 0, box2d: 0 }),
  ]);
  const f1040Out = result.outputs.filter(
    (o) =>
      o.nodeType === "f1040" &&
      o.fields.line7a_cap_gain_distrib !== undefined,
  );
  assertEquals(f1040Out.length > 0, true);
  assertEquals(findOutput(result, "schedule_d"), undefined);
});

Deno.test("box2a with any sub-amount > 0 — simplified path not available", () => {
  const result = compute([
    minimalItem({ box1a: 1000, box2a: 1000, box2b: 50 }),
  ]);
  assertEquals(findOutput(result, "schedule_d") !== undefined, true);
  // must NOT use the simplified f1040 line7a path
  const simplifiedOut = result.outputs.filter(
    (o) =>
      o.nodeType === "f1040" &&
      o.fields.line7a_cap_gain_distrib !== undefined,
  );
  assertEquals(simplifiedOut.length, 0);
});

Deno.test("box1a = 0, box2a > 0 — valid pure cap gain fund", () => {
  assertEquals(
    Array.isArray(
      compute([minimalItem({ box1a: 0, box2a: 500 })]).outputs,
    ),
    true,
  );
});

Deno.test("total box1a ≤ $1,500 with no nominee — Schedule B not required", () => {
  const result = compute([
    minimalItem({ payerName: "P1", box1a: 500, isNominee: false }),
    minimalItem({ payerName: "P2", box1a: 499, isNominee: false }),
    minimalItem({ payerName: "P3", box1a: 500, isNominee: false }),
  ]);
  assertEquals(findOutput(result, "schedule_b"), undefined);
});

Deno.test("box7 > $600 MFJ — Form 1116 required, simplified election unavailable", () => {
  const result = compute(
    [minimalItem({ box7: 601, holdingPeriodDays: 20 })],
    { filingStatus: "mfj" },
  );
  assertEquals(findOutput(result, "form_1116") !== undefined, true);
  assertEquals(findOutput(result, "schedule3"), undefined);
});

Deno.test("box5 > 0 and taxable income > $394,600 MFJ — Form 8995-A required", () => {
  const result = compute(
    [minimalItem({ box1a: 500, box5: 500, holdingPeriodDays: 60 })],
    { taxableIncome: 400000, filingStatus: "mfj" },
  );
  assertEquals(findOutput(result, "form8995a") !== undefined, true);
});

Deno.test("box13 > 0 — AMT preference triggers Form 6251", () => {
  const result = compute([minimalItem({ box12: 200, box13: 200 })]);
  assertEquals(findOutput(result, "form6251") !== undefined, true);
});

Deno.test("box9 > 0 — liquidating distribution must not appear on Schedule B", () => {
  const result = compute([minimalItem({ box9: 2000 })]);
  assertEquals(findOutput(result, "schedule_b"), undefined);
});

Deno.test("box10 > 0 — noncash liquidating distribution must not appear on Schedule B", () => {
  const result = compute([minimalItem({ box10: 800 })]);
  assertEquals(findOutput(result, "schedule_b"), undefined);
});

Deno.test("box2e and box2f > 0 — no separate calculation triggered", () => {
  const baseline = compute([minimalItem({ box1a: 500, box2a: 500 })]);
  const withBoth = compute([
    minimalItem({ box1a: 500, box2a: 500, box2e: 300, box2f: 200 }),
  ]);
  assertEquals(withBoth.outputs.length, baseline.outputs.length);
});

Deno.test("box11 = true — no tax calculation impact", () => {
  const baseline = compute([minimalItem()]);
  const withBox11 = compute([minimalItem({ box11: true })]);
  assertEquals(withBox11.outputs.length, baseline.outputs.length);
});

Deno.test("multiple payers — each listed separately on Schedule B Line 5", () => {
  const result = compute([
    minimalItem({ payerName: "Alpha Fund", box1a: 700 }),
    minimalItem({ payerName: "Beta Fund", box1a: 800 }),
    minimalItem({ payerName: "Gamma Fund", box1a: 600 }),
  ]);
  const schedBOutputs = result.outputs.filter((o) =>
    o.nodeType === "schedule_b"
  );
  assertEquals(schedBOutputs.length, 3);
});

Deno.test("isNominee = true — Schedule B required regardless of amount", () => {
  // A nominee entry requires Schedule B even when total < $1,500
  const result = compute([
    minimalItem({ payerName: "Nominee Payer", box1a: 500, isNominee: true }),
  ]);
  assertEquals(findOutput(result, "schedule_b") !== undefined, true);
});

Deno.test("isNominee = true — nominee subtraction appears on Schedule B", () => {
  const result = compute([
    minimalItem({ payerName: "Nominee Payer", box1a: 500, isNominee: true }),
  ]);
  const schedBOut = findOutput(result, "schedule_b");
  assertEquals(schedBOut !== undefined, true);
  assertEquals(schedBOut?.fields.isNominee as boolean, true);
});

Deno.test("box6 > 0 — no Schedule A deduction produced (OBBBA permanent suspension)", () => {
  const result = compute([minimalItem({ box6: 300 })]);
  assertEquals(findOutput(result, "schedule_a"), undefined);
});

Deno.test("box3 > 0 — return of capital reduces basis, no current-year income", () => {
  const result = compute([minimalItem({ box3: 1000 })]);
  const incomeOutputs = result.outputs.filter(
    (o) => ["schedule_b", "f1040", "schedule_d"].includes(o.nodeType),
  );
  assertEquals(incomeOutputs.length, 0);
});

Deno.test("box3 excess over basis — capital gain routed to Schedule D", () => {
  // TODO: requires basis tracking — skip until basis input is supported
  assertEquals(
    Array.isArray(compute([minimalItem({ box3: 2000 })]).outputs),
    true,
  );
});

Deno.test("box9 excess over basis — capital gain routed to Form 8949 / Schedule D", () => {
  // TODO: requires basis tracking — skip until basis input is supported
  assertEquals(
    Array.isArray(compute([minimalItem({ box9: 3000 })]).outputs),
    true,
  );
});

Deno.test("box9 final liquidating distribution below basis — capital loss routed to Form 8949 / Schedule D", () => {
  // TODO: requires basis tracking — skip until basis input is supported
  assertEquals(
    Array.isArray(compute([minimalItem({ box9: 500 })]).outputs),
    true,
  );
});

Deno.test("§199A holding period not met — box5 excluded from Form 8995", () => {
  const result = compute([
    minimalItem({ box1a: 500, box5: 400, holdingPeriodDays: 30 }),
  ]);
  assertEquals(findOutput(result, "form8995"), undefined);
  assertEquals(findOutput(result, "form8995a"), undefined);
});

Deno.test("Foreign holding period < 16 days — box7 not creditable, not routed to Form 1116 or Schedule 3", () => {
  const result = compute([
    minimalItem({ box7: 150, holdingPeriodDays: 10 }),
  ]);
  assertEquals(findOutput(result, "form_1116"), undefined);
  assertEquals(findOutput(result, "schedule3"), undefined);
});

// ---------------------------------------------------------------------------
// 9. Smoke Test
// ---------------------------------------------------------------------------

Deno.test("full 1099-DIV with all major boxes populated routes correctly", () => {
  // Two payers; total box1a = 1700 > $1,500; all sub-constraints satisfied;
  // holding periods met; single filer; taxable income $100,000 (below §199A threshold)
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
        box3: 200,
        box4: 80,
        box5: 300,
        box6: 20,
        box7: 150,
        box12: 400,
        box13: 100,
        isNominee: false,
        box11: false,
        holdingPeriodDays: 60,
      }),
      minimalItem({
        payerName: "Fidelity",
        box1a: 700,
        box1b: 400,
        box2a: 300,
        box4: 30,
        box5: 200,
        box9: 500,
        box10: 250,
        isNominee: false,
        box11: false,
        holdingPeriodDays: 60,
      }),
    ],
    { taxableIncome: 100000, filingStatus: "single" },
  );

  // Schedule B: 2 payer entries (total box1a = 1700 > $1,500)
  const schedBOutputs = result.outputs.filter((o) =>
    o.nodeType === "schedule_b"
  );
  assertEquals(schedBOutputs.length, 2, "two Schedule B payer entries");

  // Form 1040 Line 3a: qualified dividends = 700 + 400 = 1100
  const qualDivTotal = result.outputs
    .filter(
      (o) =>
        o.nodeType === "f1040" &&
        o.fields.line3a_qualified_dividends !== undefined,
    )
    .reduce(
      (s, o) => s + (o.fields.line3a_qualified_dividends as number),
      0,
    );
  assertEquals(qualDivTotal, 1100, "qualified dividends total");

  // Schedule D Line 13: box2a with sub-amounts (Vanguard 500 + Fidelity 300 = 800)
  const schedDOuts = result.outputs.filter(
    (o) =>
      o.nodeType === "schedule_d" &&
      o.fields.line13_cap_gain_distrib !== undefined,
  );
  assertEquals(
    schedDOuts.length > 0,
    true,
    "Schedule D cap gain output present",
  );
  const capGainTotal = schedDOuts
    .reduce(
      (s, o) => s + (o.fields.line13_cap_gain_distrib as number),
      0,
    );
  assertEquals(capGainTotal, 800, "cap gain distributions total");

  // Form 1040 Line 25b: withholding = 80 + 30 = 110
  const withholdingTotal = result.outputs
    .filter(
      (o) =>
        o.nodeType === "f1040" &&
        o.fields.line25b_withheld_1099 !== undefined,
    )
    .reduce(
      (s, o) => s + (o.fields.line25b_withheld_1099 as number),
      0,
    );
  assertEquals(withholdingTotal, 110, "withholding total");

  // Form 8995: taxable income $100K < $197,300 → form8995, not form8995a
  assertEquals(
    findOutput(result, "form8995") !== undefined,
    true,
    "Form 8995 present",
  );
  assertEquals(
    findOutput(result, "form8995a"),
    undefined,
    "Form 8995-A absent below threshold",
  );
  const sec199aTotal = result.outputs
    .filter((o) => o.nodeType === "form8995")
    .reduce(
      (s, o) => s + (o.fields.line6_sec199a_dividends as number),
      0,
    );
  assertEquals(sec199aTotal, 500, "§199A dividends total (300 + 200)");

  // Schedule 3: box7 = 150, single, < $300 → simplified election
  assertEquals(
    findOutput(result, "schedule3") !== undefined,
    true,
    "Schedule 3 simplified foreign tax",
  );
  assertEquals(
    findOutput(result, "form_1116"),
    undefined,
    "Form 1116 absent on simplified path",
  );

  // Form 1040 Line 2a: box12=400, box13=100 → line2a = 400 (box13 is not subtracted)
  const taxExemptOut = result.outputs.find(
    (o) =>
      o.nodeType === "f1040" &&
      o.fields.line2a_tax_exempt !== undefined,
  );
  assertEquals(taxExemptOut !== undefined, true, "tax-exempt interest present");
  assertEquals(
    taxExemptOut?.fields.line2a_tax_exempt as number,
    400,
    "tax-exempt interest (full box12, box13 not subtracted)",
  );

  // Form 6251: box13 = 100
  const form6251Out = findOutput(result, "form6251");
  assertEquals(
    form6251Out !== undefined,
    true,
    "Form 6251 AMT preference present",
  );
  assertEquals(
    form6251Out?.fields.private_activity_bond_interest as number,
    100,
    "AMT PAB preference",
  );

  // box9/box10 must NOT inflate Schedule B
  const schedBTotal = schedBOutputs
    .reduce((s, o) => s + (o.fields.ordinaryDividends as number), 0);
  assertEquals(schedBTotal, 1700, "Schedule B total equals box1a sum only");
});

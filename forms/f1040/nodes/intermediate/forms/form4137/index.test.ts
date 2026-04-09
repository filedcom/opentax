import { assertEquals, assertThrows } from "@std/assert";
import { form4137, inputSchema } from "./index.ts";
import { fieldsOf } from "../../../../../../core/test-utils/output.ts";
import { f1040 } from "../../../outputs/f1040/index.ts";
import { schedule2 } from "../../aggregation/schedule2/index.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function compute(input: Record<string, unknown>) {
  return form4137.compute({ taxYear: 2025, formType: "f1040" }, inputSchema.parse(input));
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// ---------------------------------------------------------------------------
// 1. Input Schema Validation
// ---------------------------------------------------------------------------

Deno.test("schema: rejects missing allocated_tips", () => {
  assertThrows(() => compute({}));
});

Deno.test("schema: rejects negative allocated_tips", () => {
  assertThrows(() =>
    compute({ allocated_tips: -100 })
  );
});

// ---------------------------------------------------------------------------
// 2. Smoke test — basic allocated tips from W2
// ---------------------------------------------------------------------------

Deno.test("smoke: allocated_tips only → produces f1040 income + schedule2 tax", () => {
  // unreported = 1000, medicare_subject = 1000
  // ss_room = 176100 (no ss_wages), ss_subject = 1000
  // ss_tax = 1000 × 0.062 = 62
  // medicare_tax = 1000 × 0.0145 = 14.50
  // total_tax = 76.50
  const result = compute({ allocated_tips: 1000 });

  assertEquals(fieldsOf(result.outputs, f1040)!.line1c_unreported_tips, 1000);
  assertEquals(fieldsOf(result.outputs, schedule2)!.line5_unreported_tip_tax, 76.50);
});

// ---------------------------------------------------------------------------
// 3. SS Tax Calculation
// ---------------------------------------------------------------------------

Deno.test("ss_tax: basic calculation — tips subject to SS", () => {
  // total_tips_received = 5000, reported = 1000, sub_$20 = 0
  // unreported = 4000, medicare_subject = 4000
  // ss_room = 176100, ss_subject = 4000
  // ss_tax = 4000 × 0.062 = 248
  // medicare_tax = 4000 × 0.0145 = 58
  // total = 306
  const result = compute({
    allocated_tips: 5000,
    total_tips_received: 5000,
    reported_tips: 1000,
    sub_$20_tips: 0,
    ss_wages_from_w2: 0,
  });

  assertEquals(fieldsOf(result.outputs, schedule2)!.line5_unreported_tip_tax, 306);
});

Deno.test("ss_tax: at zero when SS wage base already hit", () => {
  // ss_wages_from_w2 = 176100 → ss_room = 0 → ss_tax = 0
  // unreported = 2000, medicare_subject = 2000
  // medicare_tax = 2000 × 0.0145 = 29
  // total = 29 (Medicare only)
  const result = compute({
    allocated_tips: 2000,
    total_tips_received: 2000,
    reported_tips: 0,
    sub_$20_tips: 0,
    ss_wages_from_w2: 176100,
  });

  assertEquals(fieldsOf(result.outputs, schedule2)!.line5_unreported_tip_tax, 29);
});

Deno.test("ss_tax: partial SS room — tips partially capped at wage base", () => {
  // ss_wages_from_w2 = 175100 → ss_room = 1000
  // unreported = 3000, medicare_subject = 3000, ss_subject = min(3000, 1000) = 1000
  // ss_tax = 1000 × 0.062 = 62
  // medicare_tax = 3000 × 0.0145 = 43.50
  // total = 105.50
  const result = compute({
    allocated_tips: 3000,
    total_tips_received: 3000,
    reported_tips: 0,
    sub_$20_tips: 0,
    ss_wages_from_w2: 175100,
  });

  assertEquals(fieldsOf(result.outputs, schedule2)!.line5_unreported_tip_tax, 105.50);
});

// ---------------------------------------------------------------------------
// 4. Medicare Tax Calculation — prompt spec: unreported_tips=$5,000 → SS=$310, Medicare=$72.50
// ---------------------------------------------------------------------------

Deno.test("fica: $5,000 unreported tips → SS $310 + Medicare $72.50 = $382.50 total", () => {
  // line4 = 5000, sub_$20 = 0, line6 = 5000
  // ss_room = 176100, ss_subject = 5000
  // ss_tax = 5000 × 0.062 = 310
  // medicare_tax = 5000 × 0.0145 = 72.50
  // total = 382.50
  const result = compute({ allocated_tips: 5000 });

  assertEquals(fieldsOf(result.outputs, f1040)!.line1c_unreported_tips, 5000);
  assertEquals(fieldsOf(result.outputs, schedule2)!.line5_unreported_tip_tax, 382.50);
});

Deno.test("medicare_tax: applies to all unreported tips above $20/month threshold", () => {
  // unreported = 2000, sub_$20 = 200, medicare_subject = 1800
  // ss_room = 176100, ss_subject = 1800
  // ss_tax = 1800 × 0.062 = 111.60
  // medicare_tax = 1800 × 0.0145 = 26.10
  // total = 137.70
  const result = compute({
    allocated_tips: 2000,
    total_tips_received: 2000,
    reported_tips: 0,
    sub_$20_tips: 200,
    ss_wages_from_w2: 0,
  });

  assertEquals(fieldsOf(result.outputs, schedule2)!.line5_unreported_tip_tax, 137.70);
});

// ---------------------------------------------------------------------------
// 5. Sub-$20 Tip Exclusion (Line 5)
// ---------------------------------------------------------------------------

Deno.test("sub_20: tips below $20/month threshold excluded from SS and Medicare", () => {
  // All tips are sub_$20: unreported = 50, sub_$20 = 50, medicare_subject = 0
  // No SS tax, no Medicare tax → no schedule2 output
  const result = compute({
    allocated_tips: 50,
    total_tips_received: 50,
    reported_tips: 0,
    sub_$20_tips: 50,
    ss_wages_from_w2: 0,
  });

  // Income still reported on f1040 (line 4)
  assertEquals(fieldsOf(result.outputs, f1040)!.line1c_unreported_tips, 50);
  assertEquals(findOutput(result, "schedule2"), undefined);
});

Deno.test("sub_20: partial exclusion — some tips taxable, some not", () => {
  // unreported = 500, sub_$20 = 100, medicare_subject = 400
  // ss_room = 176100, ss_subject = 400
  // ss_tax = 400 × 0.062 = 24.80
  // medicare_tax = 400 × 0.0145 = 5.80
  // total = 30.60
  const result = compute({
    allocated_tips: 500,
    total_tips_received: 500,
    reported_tips: 0,
    sub_$20_tips: 100,
    ss_wages_from_w2: 0,
  });

  assertEquals(fieldsOf(result.outputs, schedule2)!.line5_unreported_tip_tax, 30.60);
});

// ---------------------------------------------------------------------------
// 6. Unreported Tips Below Allocated Tips
// ---------------------------------------------------------------------------

Deno.test("tips: no unreported tips → no outputs when reported_tips = total_tips_received", () => {
  // All tips were reported → line 4 = 0 → no income, no tax
  const result = compute({
    allocated_tips: 1000,
    total_tips_received: 1000,
    reported_tips: 1000,
    sub_$20_tips: 0,
    ss_wages_from_w2: 0,
  });

  assertEquals(result.outputs.length, 0);
});

Deno.test("tips: reported_tips reduces unreported amount", () => {
  // total = 3000, reported = 2000 → unreported = 1000
  // ss_tax = 1000 × 0.062 = 62; medicare_tax = 1000 × 0.0145 = 14.50; total = 76.50
  const result = compute({
    allocated_tips: 3000,
    total_tips_received: 3000,
    reported_tips: 2000,
    sub_$20_tips: 0,
    ss_wages_from_w2: 0,
  });

  assertEquals(fieldsOf(result.outputs, f1040)!.line1c_unreported_tips, 1000);
  assertEquals(fieldsOf(result.outputs, schedule2)!.line5_unreported_tip_tax, 76.50);
});

// ---------------------------------------------------------------------------
// 7. SS Wage Base Boundary Tests
// ---------------------------------------------------------------------------

Deno.test("ss_wage_base: exactly at wage base → Medicare-only tax", () => {
  // ss_wages_from_w2 = 176100 → ss_room = 0 → ss_tax = 0
  // medicare_tax = 1000 × 0.0145 = 14.50
  const result = compute({
    allocated_tips: 1000,
    ss_wages_from_w2: 176100,
  });

  assertEquals(fieldsOf(result.outputs, schedule2)!.line5_unreported_tip_tax, 14.50);
});

Deno.test("ss_wage_base: one dollar below → $1 of SS tax + full Medicare tax", () => {
  // ss_wages_from_w2 = 176099 → ss_room = 1
  // ss_subject = min(1000, 1) = 1
  // ss_tax = 1 × 0.062 = 0.062
  // medicare_tax = 1000 × 0.0145 = 14.50
  // total = 14.562
  const result = compute({
    allocated_tips: 1000,
    ss_wages_from_w2: 176099,
  });

  assertEquals(fieldsOf(result.outputs, schedule2)!.line5_unreported_tip_tax, 14.562);
});

Deno.test("ss_wage_base: zero ss_wages → full SS tax applies", () => {
  // ss_room = 176100 → all tips subject to SS
  // ss_tax = 2000 × 0.062 = 124
  // medicare_tax = 2000 × 0.0145 = 29
  // total = 153
  const result = compute({
    allocated_tips: 2000,
    ss_wages_from_w2: 0,
  });

  assertEquals(fieldsOf(result.outputs, schedule2)!.line5_unreported_tip_tax, 153);
});

// ---------------------------------------------------------------------------
// 8. Output Routing
// ---------------------------------------------------------------------------

Deno.test("routing: f1040 line1c receives unreported tip income", () => {
  const result = compute({
    allocated_tips: 800,
    total_tips_received: 800,
    reported_tips: 200,
    ss_wages_from_w2: 0,
  });

  assertEquals(fieldsOf(result.outputs, f1040)!.line1c_unreported_tips, 600);
});

Deno.test("routing: schedule2 line5 receives exact FICA tax amount", () => {
  // 1000 × 0.062 = 62, 1000 × 0.0145 = 14.50, total = 76.50
  const result = compute({
    allocated_tips: 1000,
    ss_wages_from_w2: 0,
  });

  assertEquals(fieldsOf(result.outputs, schedule2)!.line5_unreported_tip_tax, 76.50);
});

Deno.test("routing: no outputs when all tips were reported", () => {
  const result = compute({
    allocated_tips: 0,
    total_tips_received: 500,
    reported_tips: 500,
    ss_wages_from_w2: 0,
  });

  assertEquals(result.outputs.length, 0);
});

// ---------------------------------------------------------------------------
// 9. Edge Cases
// ---------------------------------------------------------------------------

Deno.test("edge: zero allocated_tips with no other tips → no outputs", () => {
  const result = compute({ allocated_tips: 0 });
  assertEquals(result.outputs.length, 0);
});

Deno.test("edge: large tips below SS wage base — both taxes apply", () => {
  // ss_tax = 100000 × 0.062 = 6200
  // medicare_tax = 100000 × 0.0145 = 1450
  // total = 7650
  const result = compute({
    allocated_tips: 100000,
    ss_wages_from_w2: 0,
  });

  assertEquals(fieldsOf(result.outputs, schedule2)!.line5_unreported_tip_tax, 7650);
});

Deno.test("edge: tips exceed SS wage base — SS capped at wage base, Medicare on all", () => {
  // unreported = 200000, ss_room = 176100
  // ss_subject = min(200000, 176100) = 176100
  // ss_tax = 176100 × 0.062 = 10918.20
  // medicare_tax = 200000 × 0.0145 = 2900
  // total = 13818.20
  const result = compute({
    allocated_tips: 200000,
    ss_wages_from_w2: 0,
  });

  assertEquals(fieldsOf(result.outputs, schedule2)!.line5_unreported_tip_tax, 13818.20);
});

Deno.test("edge: sub_$20 exceeds unreported tips → clamped, no FICA tax", () => {
  // sub_$20 = 1000, unreported = 500 → medicare_subject = max(0, 500-1000) = 0
  // Income still reported on f1040; no schedule2 output
  const result = compute({
    allocated_tips: 500,
    total_tips_received: 500,
    reported_tips: 0,
    sub_$20_tips: 1000,
    ss_wages_from_w2: 0,
  });

  assertEquals(fieldsOf(result.outputs, f1040)!.line1c_unreported_tips, 500);
  assertEquals(findOutput(result, "schedule2"), undefined);
});

Deno.test("edge: allocated_tips used as total when total_tips_received not provided", () => {
  // IRS instructs: W2 box 8 amount = unreported unless taxpayer has records
  const result = compute({ allocated_tips: 750 });

  assertEquals(fieldsOf(result.outputs, f1040)!.line1c_unreported_tips, 750);
});

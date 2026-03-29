import { assertEquals, assertThrows } from "@std/assert";
import { form4137 } from "./index.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function compute(input: Record<string, unknown>) {
  // deno-lint-ignore no-explicit-any
  return form4137.compute(input as any);
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// ---------------------------------------------------------------------------
// 1. Input Schema Validation
// ---------------------------------------------------------------------------

Deno.test("schema: rejects missing allocated_tips", () => {
  const parsed = form4137.inputSchema.safeParse({});
  assertEquals(parsed.success, false);
});

Deno.test("schema: rejects negative allocated_tips", () => {
  const parsed = form4137.inputSchema.safeParse({ allocated_tips: -100 });
  assertEquals(parsed.success, false);
});

Deno.test("schema: accepts minimal valid input (allocated_tips only)", () => {
  const parsed = form4137.inputSchema.safeParse({ allocated_tips: 500 });
  assertEquals(parsed.success, true);
});

Deno.test("schema: accepts full valid input", () => {
  const parsed = form4137.inputSchema.safeParse({
    allocated_tips: 5000,
    total_tips_received: 5000,
    reported_tips: 1000,
    sub_$20_tips: 200,
    ss_wages_from_w2: 50000,
  });
  assertEquals(parsed.success, true);
});

Deno.test("schema: rejects negative reported_tips", () => {
  const parsed = form4137.inputSchema.safeParse({
    allocated_tips: 500,
    reported_tips: -100,
  });
  assertEquals(parsed.success, false);
});

Deno.test("schema: rejects negative ss_wages_from_w2", () => {
  const parsed = form4137.inputSchema.safeParse({
    allocated_tips: 500,
    ss_wages_from_w2: -1,
  });
  assertEquals(parsed.success, false);
});

// ---------------------------------------------------------------------------
// 2. Smoke test — basic allocated tips from W2
// ---------------------------------------------------------------------------

Deno.test("smoke: allocated_tips only → produces f1040 income + schedule2 tax", () => {
  // When only allocated_tips is provided (common W2 path),
  // all of it is treated as unreported. No sub_$20 exclusion.
  // unreported = 1000, medicare_subject = 1000
  // ss_room = 176100 (no ss_wages), ss_subject = 1000
  // ss_tax = 1000 * 0.062 = 62
  // medicare_tax = 1000 * 0.0145 = 14.50
  // total_tax = 76.50
  const result = compute({ allocated_tips: 1000 });

  const f1040Out = findOutput(result, "f1040");
  assertEquals(f1040Out !== undefined, true);
  assertEquals((f1040Out!.input as Record<string, unknown>).line1c_unreported_tips, 1000);

  const sch2Out = findOutput(result, "schedule2");
  assertEquals(sch2Out !== undefined, true);
  assertEquals((sch2Out!.input as Record<string, unknown>).line5_unreported_tip_tax, 76.50);
});

// ---------------------------------------------------------------------------
// 3. SS Tax Calculation
// ---------------------------------------------------------------------------

Deno.test("ss_tax: basic calculation — tips subject to SS", () => {
  // total_tips_received = 5000, reported = 1000, sub_$20 = 0
  // unreported = 4000, medicare_subject = 4000
  // ss_room = 176100 - 0 = 176100, ss_subject = 4000
  // ss_tax = 4000 * 0.062 = 248
  // medicare_tax = 4000 * 0.0145 = 58
  // total = 306
  const result = compute({
    allocated_tips: 5000,
    total_tips_received: 5000,
    reported_tips: 1000,
    sub_$20_tips: 0,
    ss_wages_from_w2: 0,
  });

  const sch2Out = findOutput(result, "schedule2");
  assertEquals(sch2Out !== undefined, true);
  const input = sch2Out!.input as Record<string, unknown>;
  assertEquals(input.line5_unreported_tip_tax, 306);
});

Deno.test("ss_tax: at zero when SS wage base already hit", () => {
  // ss_wages_from_w2 = 176100 → ss_room = 0 → ss_subject = 0 → ss_tax = 0
  // unreported = 2000, medicare_subject = 2000
  // medicare_tax = 2000 * 0.0145 = 29
  // total = 29 (Medicare only)
  const result = compute({
    allocated_tips: 2000,
    total_tips_received: 2000,
    reported_tips: 0,
    sub_$20_tips: 0,
    ss_wages_from_w2: 176100,
  });

  const sch2Out = findOutput(result, "schedule2");
  assertEquals(sch2Out !== undefined, true);
  const input = sch2Out!.input as Record<string, unknown>;
  assertEquals(input.line5_unreported_tip_tax, 29);
});

Deno.test("ss_tax: partial SS room — tips partially capped at wage base", () => {
  // ss_wages_from_w2 = 175100 → ss_room = 1000
  // unreported = 3000, medicare_subject = 3000, ss_subject = min(3000, 1000) = 1000
  // ss_tax = 1000 * 0.062 = 62
  // medicare_tax = 3000 * 0.0145 = 43.50
  // total = 105.50
  const result = compute({
    allocated_tips: 3000,
    total_tips_received: 3000,
    reported_tips: 0,
    sub_$20_tips: 0,
    ss_wages_from_w2: 175100,
  });

  const sch2Out = findOutput(result, "schedule2");
  assertEquals(sch2Out !== undefined, true);
  const input = sch2Out!.input as Record<string, unknown>;
  assertEquals(input.line5_unreported_tip_tax, 105.50);
});

// ---------------------------------------------------------------------------
// 4. Medicare Tax Calculation
// ---------------------------------------------------------------------------

Deno.test("medicare_tax: applies to all unreported tips above $20/month threshold", () => {
  // unreported = 2000, sub_$20 = 200, medicare_subject = 1800
  // ss_room = 176100, ss_subject = 1800
  // ss_tax = 1800 * 0.062 = 111.60
  // medicare_tax = 1800 * 0.0145 = 26.10
  // total = 137.70
  const result = compute({
    allocated_tips: 2000,
    total_tips_received: 2000,
    reported_tips: 0,
    sub_$20_tips: 200,
    ss_wages_from_w2: 0,
  });

  const sch2Out = findOutput(result, "schedule2");
  assertEquals(sch2Out !== undefined, true);
  const input = sch2Out!.input as Record<string, unknown>;
  assertEquals(input.line5_unreported_tip_tax, 137.70);
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
  const f1040Out = findOutput(result, "f1040");
  assertEquals(f1040Out !== undefined, true);
  assertEquals((f1040Out!.input as Record<string, unknown>).line1c_unreported_tips, 50);

  // But no tax owed
  const sch2Out = findOutput(result, "schedule2");
  assertEquals(sch2Out, undefined);
});

Deno.test("sub_20: partial exclusion — some tips taxable, some not", () => {
  // unreported = 500, sub_$20 = 100, medicare_subject = 400
  // ss_room = 176100, ss_subject = 400
  // ss_tax = 400 * 0.062 = 24.80
  // medicare_tax = 400 * 0.0145 = 5.80
  // total = 30.60
  const result = compute({
    allocated_tips: 500,
    total_tips_received: 500,
    reported_tips: 0,
    sub_$20_tips: 100,
    ss_wages_from_w2: 0,
  });

  const sch2Out = findOutput(result, "schedule2");
  assertEquals(sch2Out !== undefined, true);
  const input = sch2Out!.input as Record<string, unknown>;
  assertEquals(input.line5_unreported_tip_tax, 30.60);
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
  // medicare_subject = 1000, ss_subject = 1000
  // ss_tax = 1000 * 0.062 = 62
  // medicare_tax = 1000 * 0.0145 = 14.50
  // total = 76.50
  const result = compute({
    allocated_tips: 3000,
    total_tips_received: 3000,
    reported_tips: 2000,
    sub_$20_tips: 0,
    ss_wages_from_w2: 0,
  });

  const f1040Out = findOutput(result, "f1040");
  assertEquals((f1040Out!.input as Record<string, unknown>).line1c_unreported_tips, 1000);

  const sch2Out = findOutput(result, "schedule2");
  assertEquals((sch2Out!.input as Record<string, unknown>).line5_unreported_tip_tax, 76.50);
});

// ---------------------------------------------------------------------------
// 7. SS Wage Base Boundary Tests
// ---------------------------------------------------------------------------

Deno.test("ss_wage_base: exactly at wage base → no SS tax", () => {
  // ss_wages_from_w2 = 176100 → ss_room = 0 → ss_tax = 0
  const result = compute({
    allocated_tips: 1000,
    ss_wages_from_w2: 176100,
  });

  const sch2Out = findOutput(result, "schedule2");
  const input = sch2Out!.input as Record<string, unknown>;
  // Only Medicare tax: 1000 * 0.0145 = 14.50
  assertEquals(input.line5_unreported_tip_tax, 14.50);
});

Deno.test("ss_wage_base: one dollar below → small SS tax applies", () => {
  // ss_wages_from_w2 = 176099 → ss_room = 1
  // ss_subject = min(1000, 1) = 1
  // ss_tax = 1 * 0.062 = 0.062 ≈ 0.062 (stored as-is, rounded by consumer)
  // medicare_tax = 1000 * 0.0145 = 14.50
  // total = 14.562
  const result = compute({
    allocated_tips: 1000,
    ss_wages_from_w2: 176099,
  });

  const sch2Out = findOutput(result, "schedule2");
  const input = sch2Out!.input as Record<string, unknown>;
  const tax = input.line5_unreported_tip_tax as number;
  // SS tax = 0.062, Medicare = 14.50, total = 14.562
  assertEquals(Math.abs(tax - 14.562) < 0.001, true);
});

Deno.test("ss_wage_base: zero ss_wages → full SS tax applies", () => {
  // ss_wages_from_w2 = 0 → ss_room = 176100 → full tip amount subject to SS
  const result = compute({
    allocated_tips: 2000,
    ss_wages_from_w2: 0,
  });

  const sch2Out = findOutput(result, "schedule2");
  const input = sch2Out!.input as Record<string, unknown>;
  // ss_tax = 2000 * 0.062 = 124
  // medicare_tax = 2000 * 0.0145 = 29
  // total = 153
  assertEquals(input.line5_unreported_tip_tax, 153);
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

  const f1040Out = findOutput(result, "f1040");
  assertEquals(f1040Out !== undefined, true);
  assertEquals((f1040Out!.input as Record<string, unknown>).line1c_unreported_tips, 600);
});

Deno.test("routing: schedule2 line5 receives total FICA tax on tips", () => {
  const result = compute({
    allocated_tips: 1000,
    ss_wages_from_w2: 0,
  });

  const sch2Out = findOutput(result, "schedule2");
  assertEquals(sch2Out !== undefined, true);
  assertEquals("line5_unreported_tip_tax" in (sch2Out!.input as Record<string, unknown>), true);
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
  // unreported = 100000, ss_room = 176100 (no prior wages)
  // ss_tax = 100000 * 0.062 = 6200
  // medicare_tax = 100000 * 0.0145 = 1450
  // total = 7650
  const result = compute({
    allocated_tips: 100000,
    ss_wages_from_w2: 0,
  });

  const sch2Out = findOutput(result, "schedule2");
  assertEquals((sch2Out!.input as Record<string, unknown>).line5_unreported_tip_tax, 7650);
});

Deno.test("edge: tips exceed SS wage base — SS capped, Medicare on all", () => {
  // unreported = 200000, ss_room = 176100 - 0 = 176100
  // ss_subject = min(200000, 176100) = 176100
  // ss_tax = 176100 * 0.062 = 10918.20
  // medicare_tax = 200000 * 0.0145 = 2900
  // total = 13818.20
  const result = compute({
    allocated_tips: 200000,
    ss_wages_from_w2: 0,
  });

  const sch2Out = findOutput(result, "schedule2");
  const input = sch2Out!.input as Record<string, unknown>;
  const tax = input.line5_unreported_tip_tax as number;
  assertEquals(Math.abs(tax - 13818.20) < 0.01, true);
});

Deno.test("edge: sub_$20 exceeds unreported tips is clamped to unreported amount", () => {
  // sub_$20 = 1000, unreported = 500 → medicare_subject = max(0, 500-1000) = 0
  // No SS or Medicare tax → no schedule2 output
  const result = compute({
    allocated_tips: 500,
    total_tips_received: 500,
    reported_tips: 0,
    sub_$20_tips: 1000,
    ss_wages_from_w2: 0,
  });

  const f1040Out = findOutput(result, "f1040");
  // Income still reported even if no tax
  assertEquals((f1040Out!.input as Record<string, unknown>).line1c_unreported_tips, 500);

  const sch2Out = findOutput(result, "schedule2");
  assertEquals(sch2Out, undefined);
});

Deno.test("edge: allocated_tips used as total when total_tips_received not provided", () => {
  // When user only provides allocated_tips (from W2 path),
  // treat that as the unreported tip amount (IRS instructs: include box 8 in col c
  // unless taxpayer has records showing less)
  const result = compute({ allocated_tips: 750 });

  const f1040Out = findOutput(result, "f1040");
  assertEquals((f1040Out!.input as Record<string, unknown>).line1c_unreported_tips, 750);
});

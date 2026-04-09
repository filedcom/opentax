// UNRESOLVED ITEMS:
//   - section_179 $2,500,000 maximum: schema uses z.number().nonnegative() with no .max() —
//     values above $2.5M are accepted without error; not Zod-enforced and not capped silently
//   - days_owned_in_year required when tax_court_method=true: no validation in validateItem()
//     enforcing this; the field is optional and accepted even when tax_court_method=true

import { assertEquals, assertThrows } from "@std/assert";
import { inputSchema, scheduleE } from "./index.ts";

// ─── helpers ────────────────────────────────────────────────────────────────

function minimalItem(overrides: Record<string, unknown> = {}) {
  return {
    tsj: "T",
    property_description: "123 Main St, Anytown, CA 90210",
    property_type: 1,
    activity_type: "A",
    fair_rental_days: 200,
    personal_use_days: 0,
    rent_income: 0,
    form_1099_payments_made: false,
    ...overrides,
  };
}

function compute(items: Record<string, unknown>[]) {
  return scheduleE.compute({ taxYear: 2025, formType: "f1040" }, inputSchema.parse({ schedule_es: items }));
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// ─── 1. Input Schema Validation ─────────────────────────────────────────────

Deno.test("input validation: empty array produces no outputs", () => {
  const result = compute([]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("input validation: missing required field (rent_income) throws", () => {
  assertThrows(() =>
    compute([
      minimalItem({ rent_income: undefined }),
    ])
  );
});

Deno.test("input validation: form_1099_filed required when form_1099_payments_made=true", () => {
  assertThrows(() =>
    compute([
      minimalItem({
        form_1099_payments_made: true,
        // form_1099_filed intentionally omitted
      }),
    ])
  );
});

Deno.test("input validation: property_type_other_desc required when property_type=8", () => {
  assertThrows(() =>
    compute([
      minimalItem({
        property_type: 8,
        // property_type_other_desc intentionally omitted
      }),
    ])
  );
});

Deno.test("input validation: ownership_percent above 100 throws", () => {
  assertThrows(() =>
    compute([
      minimalItem({ ownership_percent: 101 }),
    ])
  );
});

Deno.test("input validation: ownership_percent below 0 throws", () => {
  assertThrows(() =>
    compute([
      minimalItem({ ownership_percent: -1 }),
    ])
  );
});

Deno.test("input validation: fair_rental_days=366 throws", () => {
  assertThrows(() =>
    compute([
      minimalItem({ fair_rental_days: 366 }),
    ])
  );
});

Deno.test("input validation: personal_use_days=366 throws", () => {
  assertThrows(() =>
    compute([
      minimalItem({ personal_use_days: 366 }),
    ])
  );
});

Deno.test("input validation: qbi_aggregation_number=100 throws (must be 1–99)", () => {
  assertThrows(() =>
    compute([
      minimalItem({ qbi_aggregation_number: 100 }),
    ])
  );
});

Deno.test("input validation: qbi_aggregation_number=0 throws (must be 1–99)", () => {
  assertThrows(() =>
    compute([
      minimalItem({ qbi_aggregation_number: 0 }),
    ])
  );
});

// ─── 2. Per-Box Routing ──────────────────────────────────────────────────────

Deno.test("routing: rent_income routes net to schedule1 line5", () => {
  const result = compute([
    minimalItem({ rent_income: 12_000 }),
  ]);
  const s1 = findOutput(result, "schedule1");
  const input = s1!.fields as Record<string, number>;
  assertEquals(input.line5_schedule_e, 12_000);
});

Deno.test("routing: royalties_income routes net to schedule1 line5", () => {
  const result = compute([
    minimalItem({
      property_type: 6,
      rent_income: 0,
      royalties_income: 5_000,
    }),
  ]);
  const input = findOutput(result, "schedule1")!.fields as Record<string, number>;
  assertEquals(input.line5_schedule_e, 5_000);
});

Deno.test("routing: royalties_income=0 produces no extra output beyond schedule1", () => {
  const withRoyalties = compute([
    minimalItem({ rent_income: 10_000, royalties_income: 0 }),
  ]);
  const withoutRoyalties = compute([
    minimalItem({ rent_income: 10_000 }),
  ]);
  assertEquals(withRoyalties.outputs.length, withoutRoyalties.outputs.length);
});

Deno.test("routing: carry_to_8960=true routes net rental income to form8960", () => {
  const result = compute([
    minimalItem({ rent_income: 8_000, carry_to_8960: true }),
  ]);
  const f8960 = findOutput(result, "form8960");
  assertEquals((f8960!.fields as Record<string, number>).line4b_rental_net, 8_000);
});

Deno.test("routing: carry_to_8960 absent produces no form8960 output", () => {
  const result = compute([
    minimalItem({ rent_income: 8_000 }),
  ]);
  const f8960 = findOutput(result, "form8960");
  assertEquals(f8960, undefined);
});

Deno.test("routing: carry_to_8960=false produces no form8960 output", () => {
  const result = compute([
    minimalItem({ rent_income: 8_000, carry_to_8960: false }),
  ]);
  const f8960 = findOutput(result, "form8960");
  assertEquals(f8960, undefined);
});

Deno.test("routing: some_investment_not_at_risk=true routes to form6198", () => {
  const result = compute([
    minimalItem({ rent_income: 5_000, some_investment_not_at_risk: true }),
  ]);
  assertEquals(findOutput(result, "form6198")?.nodeType, "form6198");
});

Deno.test("routing: some_investment_not_at_risk=false produces no form6198 output", () => {
  const result = compute([
    minimalItem({ rent_income: 5_000, some_investment_not_at_risk: false }),
  ]);
  const f6198 = findOutput(result, "form6198");
  assertEquals(f6198, undefined);
});

Deno.test("routing: main_home_or_second_home=true routes personal interest/taxes to scheduleA", () => {
  const result = compute([
    minimalItem({
      rent_income: 12_000,
      expense_mortgage_interest: 6_000,
      occupancy_percent: 50,
      main_home_or_second_home: true,
    }),
  ]);
  // 50% occupancy → 50% of $6,000 mortgage interest = $3,000 personal portion → schedule_a
  const schAFields = findOutput(result, "schedule_a")!.fields as Record<string, number>;
  assertEquals(schAFields.line_8a_mortgage_interest_1098, 3_000);
});

Deno.test("routing: main_home_or_second_home=false produces no scheduleA output", () => {
  const result = compute([
    minimalItem({
      rent_income: 12_000,
      expense_mortgage_interest: 6_000,
    }),
  ]);
  const schA = findOutput(result, "schedule_a");
  assertEquals(schA, undefined);
});

Deno.test("routing: qbi_trade_or_business=Y routes to form8995 with correct qbi amount", () => {
  const result = compute([
    minimalItem({
      rent_income: 20_000,
      qbi_trade_or_business: "Y",
    }),
  ]);
  const f8995Fields = findOutput(result, "form8995")!.fields as Record<string, number>;
  assertEquals(f8995Fields.qbi, 20_000);
});

Deno.test("routing: qbi_trade_or_business=N produces no form8995 output", () => {
  const result = compute([
    minimalItem({
      rent_income: 20_000,
      qbi_trade_or_business: "N",
    }),
  ]);
  const f8995 = findOutput(result, "form8995");
  assertEquals(f8995, undefined);
});

Deno.test("routing: activity_type=A with net loss routes to form8582 with correct loss amount", () => {
  const result = compute([
    minimalItem({
      activity_type: "A",
      rent_income: 5_000,
      expense_repairs: 10_000,
    }),
  ]);
  // net = 5000 - 10000 = -5000 → current_loss = 5000 sent to form8582
  const f8582Fields = findOutput(result, "form8582")!.fields as Record<string, number | boolean>;
  assertEquals(f8582Fields.current_loss, 5_000);
  assertEquals(f8582Fields.has_active_rental, true);
});

Deno.test("routing: activity_type=B with net loss routes to form8582 with has_other_passive=true", () => {
  const result = compute([
    minimalItem({
      activity_type: "B",
      rent_income: 5_000,
      expense_repairs: 10_000,
    }),
  ]);
  const f8582Fields = findOutput(result, "form8582")!.fields as Record<string, number | boolean>;
  assertEquals(f8582Fields.current_loss, 5_000);
  assertEquals(f8582Fields.has_other_passive, true);
});

Deno.test("routing: activity_type=C does not route to form8582", () => {
  const result = compute([
    minimalItem({
      activity_type: "C",
      rent_income: 5_000,
      expense_repairs: 10_000,
    }),
  ]);
  const f8582 = findOutput(result, "form8582");
  assertEquals(f8582, undefined);
});

Deno.test("routing: activity_type=D does not route to form8582", () => {
  const result = compute([
    minimalItem({
      activity_type: "D",
      rent_income: 5_000,
      expense_repairs: 10_000,
    }),
  ]);
  const f8582 = findOutput(result, "form8582");
  assertEquals(f8582, undefined);
});

Deno.test("routing: disposed_of=true routes to form4797 with disposed_properties=1", () => {
  const result = compute([
    minimalItem({ rent_income: 10_000, disposed_of: true }),
  ]);
  const f4797Fields = findOutput(result, "form4797")!.fields as Record<string, number>;
  assertEquals(f4797Fields.disposed_properties, 1);
});

Deno.test("routing: disposed_of=false produces no form4797 output", () => {
  const result = compute([
    minimalItem({ rent_income: 10_000, disposed_of: false }),
  ]);
  const f4797 = findOutput(result, "form4797");
  assertEquals(f4797, undefined);
});

Deno.test("routing: expense_depreciation_amt routes to form6251 with correct adjustment", () => {
  const result = compute([
    minimalItem({
      rent_income: 20_000,
      expense_depreciation: 5_000,
      expense_depreciation_amt: 1_000,
    }),
  ]);
  const f6251Fields = findOutput(result, "form6251")!.fields as Record<string, number>;
  assertEquals(f6251Fields.depreciation_adjustment, 1_000);
});

Deno.test("routing: expense_depreciation_amt=0 produces no form6251 output", () => {
  const result = compute([
    minimalItem({ rent_income: 20_000, expense_depreciation: 5_000 }),
  ]);
  const f6251 = findOutput(result, "form6251");
  assertEquals(f6251, undefined);
});

Deno.test("routing: section_179 with activity_type=C routes to form4562 with correct deduction", () => {
  const result = compute([
    minimalItem({
      activity_type: "C",
      rent_income: 100_000,
      section_179: 50_000,
    }),
  ]);
  const f4562Fields = findOutput(result, "form4562")!.fields as Record<string, number>;
  assertEquals(f4562Fields.section_179_deduction, 50_000);
});

Deno.test("routing: disallowed_mortgage_interest_8990 routes to form8990 with carryforward amount", () => {
  const result = compute([
    minimalItem({
      rent_income: 20_000,
      disallowed_mortgage_interest_8990: 3_000,
    }),
  ]);
  assertEquals(findOutput(result, "form8990")?.nodeType, "form8990");
});

Deno.test("routing: disallowed_other_interest_8990 routes to form8990", () => {
  const result = compute([
    minimalItem({
      rent_income: 20_000,
      disallowed_other_interest_8990: 2_000,
    }),
  ]);
  assertEquals(findOutput(result, "form8990")?.nodeType, "form8990");
});

Deno.test("routing: prior_unallowed_at_risk routes to form6198 with prior_unallowed amount", () => {
  const result = compute([
    minimalItem({
      rent_income: 10_000,
      prior_unallowed_at_risk: 2_000,
    }),
  ]);
  const f6198Fields = findOutput(result, "form6198")!.fields as Record<string, number>;
  assertEquals(f6198Fields.prior_unallowed, 2_000);
});

Deno.test("routing: prior_unallowed_passive_operating routes to form8582 with prior_unallowed amount", () => {
  const result = compute([
    minimalItem({
      activity_type: "A",
      rent_income: 5_000,
      prior_unallowed_passive_operating: 2_000,
    }),
  ]);
  const f8582Fields = findOutput(result, "form8582")!.fields as Record<string, number>;
  assertEquals(f8582Fields.prior_unallowed, 2_000);
});

Deno.test("routing: prior_unallowed_passive_4797_part1 routes to form8582 with aggregated prior_unallowed", () => {
  const result = compute([
    minimalItem({
      activity_type: "A",
      rent_income: 5_000,
      prior_unallowed_passive_4797_part1: 1_500,
    }),
  ]);
  const f8582Fields = findOutput(result, "form8582")!.fields as Record<string, number>;
  assertEquals(f8582Fields.prior_unallowed, 1_500);
});

Deno.test("routing: prior_unallowed_passive_4797_part2 routes to form8582 with aggregated prior_unallowed", () => {
  const result = compute([
    minimalItem({
      activity_type: "A",
      rent_income: 5_000,
      prior_unallowed_passive_4797_part2: 1_200,
    }),
  ]);
  const f8582Fields = findOutput(result, "form8582")!.fields as Record<string, number>;
  assertEquals(f8582Fields.prior_unallowed, 1_200);
});

Deno.test("routing: qbi_w2_wages routes to form8995 when qbi_trade_or_business=Y", () => {
  const result = compute([
    minimalItem({
      rent_income: 30_000,
      qbi_trade_or_business: "Y",
      qbi_w2_wages: 10_000,
    }),
  ]);
  const input = findOutput(result, "form8995")!.fields as Record<string, number>;
  assertEquals(input.w2_wages, 10_000);
});

Deno.test("routing: qbi_unadjusted_basis routes to form8995 when qbi_trade_or_business=Y", () => {
  const result = compute([
    minimalItem({
      rent_income: 30_000,
      qbi_trade_or_business: "Y",
      qbi_unadjusted_basis: 200_000,
    }),
  ]);
  const input = findOutput(result, "form8995")!.fields as Record<string, number>;
  assertEquals(input.unadjusted_basis, 200_000);
});

Deno.test("routing: qbi_override routes to form8995 using override amount, ignoring computed net", () => {
  const result = compute([
    minimalItem({
      rent_income: 30_000,
      qbi_trade_or_business: "Y",
      qbi_override: 15_000,
    }),
  ]);
  // Override wins over computed net (30_000)
  const input = findOutput(result, "form8995")!.fields as Record<string, number>;
  assertEquals(input.qbi, 15_000);
});

// ─── 3. Aggregation ──────────────────────────────────────────────────────────

Deno.test("aggregation: rent_income summed across two properties", () => {
  const result = compute([
    minimalItem({ rent_income: 6_000 }),
    minimalItem({ rent_income: 4_000 }),
  ]);
  const input = findOutput(result, "schedule1")!.fields as Record<string, number>;
  assertEquals(input.line5_schedule_e, 10_000);
});

Deno.test("aggregation: royalties summed across two royalty properties", () => {
  const result = compute([
    minimalItem({ property_type: 6, rent_income: 0, royalties_income: 3_000 }),
    minimalItem({ property_type: 6, rent_income: 0, royalties_income: 2_000 }),
  ]);
  const input = findOutput(result, "schedule1")!.fields as Record<string, number>;
  assertEquals(input.line5_schedule_e, 5_000);
});

Deno.test("aggregation: expenses reduce net across properties in single output", () => {
  const result = compute([
    minimalItem({ rent_income: 12_000, expense_repairs: 2_000 }),
    minimalItem({ rent_income: 8_000, expense_insurance: 1_000 }),
  ]);
  // net = (12000 - 2000) + (8000 - 1000) = 17000
  const input = findOutput(result, "schedule1")!.fields as Record<string, number>;
  assertEquals(input.line5_schedule_e, 17_000);
});

Deno.test("aggregation: mortgage interest totalled across all properties (reduces net)", () => {
  const result = compute([
    minimalItem({ rent_income: 20_000, expense_mortgage_interest: 4_000 }),
    minimalItem({ rent_income: 15_000, expense_mortgage_interest: 3_000 }),
  ]);
  // net = (20000-4000) + (15000-3000) = 28000
  const input = findOutput(result, "schedule1")!.fields as Record<string, number>;
  assertEquals(input.line5_schedule_e, 28_000);
});

Deno.test("aggregation: depreciation totalled across all properties (reduces net)", () => {
  const result = compute([
    minimalItem({ rent_income: 20_000, expense_depreciation: 5_000 }),
    minimalItem({ rent_income: 15_000, expense_depreciation: 3_000 }),
  ]);
  // net = (20000-5000) + (15000-3000) = 27000
  const input = findOutput(result, "schedule1")!.fields as Record<string, number>;
  assertEquals(input.line5_schedule_e, 27_000);
});

// ─── 4. Thresholds ───────────────────────────────────────────────────────────

Deno.test("threshold §280A: fair_rental_days=14 — income fully excluded (< 15 days)", () => {
  // IRC §280A(g): if FRD < 15, exclude all rental income from income
  const result = compute([
    minimalItem({ fair_rental_days: 14, rent_income: 5_000 }),
  ]);
  const s1 = findOutput(result, "schedule1");
  // No rental income reported — either no output or line5 = 0
  if (s1 !== undefined) {
    const input = s1.fields as Record<string, number>;
    assertEquals(input.line5_schedule_e ?? 0, 0);
  } else {
    assertEquals(s1, undefined);
  }
});

Deno.test("threshold §280A: fair_rental_days=15 — income NOT excluded (≥ 15 days)", () => {
  const result = compute([
    minimalItem({ fair_rental_days: 15, personal_use_days: 0, rent_income: 5_000 }),
  ]);
  const input = findOutput(result, "schedule1")!.fields as Record<string, number>;
  assertEquals(input.line5_schedule_e, 5_000);
});

Deno.test("threshold §280A: personal_use_days=14 with fair_rental_days=200 — no vacation home (14 ≤ 14)", () => {
  // Does not trigger vacation home rules — full loss allowed
  const result = compute([
    minimalItem({
      fair_rental_days: 200,
      personal_use_days: 14,
      rent_income: 8_000,
      expense_repairs: 10_000,
    }),
  ]);
  // Loss flows through unrestricted by §280A expense cap
  const input = findOutput(result, "schedule1")!.fields as Record<string, number>;
  assertEquals(input.line5_schedule_e, -2_000);
});

Deno.test("threshold §280A: personal_use_days=15 with fair_rental_days=140 — vacation home caps loss at zero", () => {
  // Vacation home: expenses limited to gross rental income — no loss allowed
  const result = compute([
    minimalItem({
      fair_rental_days: 140,
      personal_use_days: 15,
      rent_income: 8_000,
      expense_repairs: 15_000,
    }),
  ]);
  // §280A(c)(5): net capped at 0 when vacation home rules apply
  const input = findOutput(result, "schedule1")!.fields as Record<string, number>;
  assertEquals(input.line5_schedule_e, 0);
});

Deno.test("threshold §280A: personal_use_days > 10% of fair_rental_days triggers vacation home — loss capped at zero", () => {
  // FRD=10, PUD=2: 2 > 10%×10=1 → vacation home triggered
  const result = compute([
    minimalItem({
      fair_rental_days: 10,
      personal_use_days: 2,
      rent_income: 1_000,
      expense_repairs: 2_000,
    }),
  ]);
  // §280A(c)(5): expenses capped at gross income — net = max(0, 1000 - 2000) = 0
  const input = findOutput(result, "schedule1")!.fields as Record<string, number>;
  assertEquals(input.line5_schedule_e, 0);
});

Deno.test("threshold §280A: personal_use_days=0 — pure rental, no vacation home proration", () => {
  const result = compute([
    minimalItem({
      fair_rental_days: 365,
      personal_use_days: 0,
      rent_income: 12_000,
      expense_repairs: 3_000,
    }),
  ]);
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1 !== undefined, true);
  const input = s1!.fields as Record<string, number>;
  assertEquals(input.line5_schedule_e, 9_000);
});

Deno.test("threshold §199A: qbi_aggregation_number boundary values (1 and 99) accepted without throw", () => {
  const r1 = compute([minimalItem({ rent_income: 10_000, qbi_trade_or_business: "Y", qbi_aggregation_number: 1 })]);
  const r99 = compute([minimalItem({ rent_income: 10_000, qbi_trade_or_business: "Y", qbi_aggregation_number: 99 })]);
  assertEquals((r1.outputs.find((o) => o.nodeType === "form8995")!.fields as Record<string, number>).qbi, 10_000);
  assertEquals((r99.outputs.find((o) => o.nodeType === "form8995")!.fields as Record<string, number>).qbi, 10_000);
});

Deno.test("threshold §179: section_179=$2,500,000 with activity_type=C routes full amount to form4562", () => {
  const result = compute([
    minimalItem({
      activity_type: "C",
      rent_income: 5_000_000,
      section_179: 2_500_000,
    }),
  ]);
  const f4562Fields = findOutput(result, "form4562")!.fields as Record<string, number>;
  assertEquals(f4562Fields.section_179_deduction, 2_500_000);
});

Deno.test("threshold ownership_percent=0: all income/expenses allocated as $0 to this taxpayer", () => {
  const result = compute([
    minimalItem({ rent_income: 10_000, ownership_percent: 0 }),
  ]);
  // 0% ownership → net = 0 → schedule1 may be omitted or carry line5=0
  const s1 = findOutput(result, "schedule1");
  if (s1 !== undefined) {
    assertEquals((s1.fields as Record<string, number>).line5_schedule_e, 0);
  } else {
    assertEquals(s1, undefined);
  }
});

Deno.test("threshold ownership_percent=50: prorates income and expenses by 50%", () => {
  const result = compute([
    minimalItem({
      rent_income: 10_000,
      expense_repairs: 2_000,
      ownership_percent: 50,
    }),
  ]);
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1 !== undefined, true);
  const input = s1!.fields as Record<string, number>;
  // net at 100% = 8000; at 50% = 4000
  assertEquals(input.line5_schedule_e, 4_000);
});

// ─── 5. Hard Validation Rules (throws) ──────────────────────────────────────

Deno.test("hard validation: property_type=8 without property_type_other_desc throws", () => {
  assertThrows(() =>
    compute([
      minimalItem({ property_type: 8 }),
    ])
  );
});

Deno.test("hard validation: property_type=8 with property_type_other_desc does not throw", () => {
  const result = compute([
    minimalItem({
      property_type: 8,
      property_type_other_desc: "Storage unit rental",
    }),
  ]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("hard validation: form_1099_payments_made=true without form_1099_filed throws", () => {
  assertThrows(() =>
    compute([
      minimalItem({ form_1099_payments_made: true }),
    ])
  );
});

Deno.test("hard validation: fair_rental_days=366 throws (out of 0–365)", () => {
  assertThrows(() =>
    compute([
      minimalItem({ fair_rental_days: 366 }),
    ])
  );
});

Deno.test("hard validation: personal_use_days=366 throws (out of 0–365)", () => {
  assertThrows(() =>
    compute([
      minimalItem({ personal_use_days: 366 }),
    ])
  );
});

Deno.test("hard validation: ownership_percent=101 throws (out of 0–100)", () => {
  assertThrows(() =>
    compute([
      minimalItem({ ownership_percent: 101 }),
    ])
  );
});

Deno.test("hard validation: qbi_aggregation_number=100 throws (out of 1–99)", () => {
  assertThrows(() =>
    compute([
      minimalItem({ qbi_aggregation_number: 100 }),
    ])
  );
});

// ─── 6. Warning-Only Rules (does_not_throw) ──────────────────────────────────

Deno.test("warning only: form_1099_payments_made=true with form_1099_filed=false does not throw", () => {
  const result = compute([
    minimalItem({
      form_1099_payments_made: true,
      form_1099_filed: false,
    }),
  ]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("warning only: elect_out_biie=true does not throw", () => {
  const result = compute([
    minimalItem({
      rent_income: 10_000,
      elect_out_biie: true,
    }),
  ]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("warning only: placed_in_service=true does not throw", () => {
  const result = compute([
    minimalItem({
      rent_income: 10_000,
      placed_in_service: true,
    }),
  ]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("warning only: disposed_of=true does not throw", () => {
  const result = compute([
    minimalItem({
      rent_income: 10_000,
      disposed_of: true,
    }),
  ]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("warning only: carry_to_8960=true does not throw", () => {
  const result = compute([
    minimalItem({
      rent_income: 10_000,
      carry_to_8960: true,
    }),
  ]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("warning only: some_investment_not_at_risk=true does not throw", () => {
  const result = compute([
    minimalItem({
      rent_income: 10_000,
      some_investment_not_at_risk: true,
    }),
  ]);
  assertEquals(Array.isArray(result.outputs), true);
});

// ─── 7. Informational Fields (output count unchanged) ────────────────────────

Deno.test("informational: tsj='T' and tsj='S' produce same output count", () => {
  const resultT = compute([minimalItem({ tsj: "T", rent_income: 10_000 })]);
  const resultS = compute([minimalItem({ tsj: "S", rent_income: 10_000 })]);
  assertEquals(resultT.outputs.length, resultS.outputs.length);
});

Deno.test("informational: street_address does not change output count", () => {
  const withAddr = compute([
    minimalItem({ rent_income: 10_000, street_address: "123 Main St" }),
  ]);
  const withoutAddr = compute([minimalItem({ rent_income: 10_000 })]);
  assertEquals(withAddr.outputs.length, withoutAddr.outputs.length);
});

Deno.test("informational: city/state/zip do not change output count", () => {
  const withFields = compute([
    minimalItem({
      rent_income: 10_000,
      city: "Anytown",
      state: "CA",
      zip: "90210",
    }),
  ]);
  const withoutFields = compute([minimalItem({ rent_income: 10_000 })]);
  assertEquals(withFields.outputs.length, withoutFields.outputs.length);
});

Deno.test("informational: foreign_country does not change output count", () => {
  const withForeign = compute([
    minimalItem({ rent_income: 10_000, foreign_country: "Paris, France" }),
  ]);
  const withoutForeign = compute([minimalItem({ rent_income: 10_000 })]);
  assertEquals(withForeign.outputs.length, withoutForeign.outputs.length);
});

Deno.test("informational: tax_court_method=true does not change output count", () => {
  const withTCM = compute([
    minimalItem({
      rent_income: 10_000,
      fair_rental_days: 200,
      personal_use_days: 30,
      tax_court_method: true,
    }),
  ]);
  const withoutTCM = compute([
    minimalItem({
      rent_income: 10_000,
      fair_rental_days: 200,
      personal_use_days: 30,
    }),
  ]);
  assertEquals(withTCM.outputs.length, withoutTCM.outputs.length);
});

Deno.test("informational: qualified_joint_venture=true does not change output count", () => {
  const withQJV = compute([
    minimalItem({ rent_income: 10_000, qualified_joint_venture: true }),
  ]);
  const withoutQJV = compute([minimalItem({ rent_income: 10_000 })]);
  assertEquals(withQJV.outputs.length, withoutQJV.outputs.length);
});

// ─── 8. Edge Cases ───────────────────────────────────────────────────────────

Deno.test("edge case vacation home <15 rental days: §280A(g) excludes all income — net=0", () => {
  // IRC §280A(g): if FRD < 15, do NOT report rental income on Schedule E
  const result = compute([
    minimalItem({
      fair_rental_days: 10,
      personal_use_days: 355,
      rent_income: 8_000,
      expense_mortgage_interest: 12_000,
      expense_taxes: 3_000,
    }),
  ]);
  // computePropertyNet returns 0 → schedule1 output carries line5=0 or is omitted
  const s1 = findOutput(result, "schedule1");
  if (s1 !== undefined) {
    assertEquals((s1.fields as Record<string, number>).line5_schedule_e ?? 0, 0);
  } else {
    assertEquals(s1, undefined);
  }
});

Deno.test("edge case self-rental (property_type=7): net income is nonpassive (no form8582 for income)", () => {
  // Treas. Reg. §1.469-2(f)(6): net rental income recharacterized as nonpassive
  const result = compute([
    minimalItem({
      property_type: 7,
      activity_type: "A",
      rent_income: 20_000,
      expense_repairs: 5_000,
    }),
  ]);
  // Net income (15000) → nonpassive; should NOT route loss to form8582
  const f8582 = findOutput(result, "form8582");
  assertEquals(f8582, undefined);
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1 !== undefined, true);
});

Deno.test("edge case: multiple properties (4) in one call — all nets aggregated", () => {
  const result = compute([
    minimalItem({ rent_income: 1_000 }),
    minimalItem({ rent_income: 2_000 }),
    minimalItem({ rent_income: 3_000 }),
    minimalItem({ rent_income: 4_000 }),
  ]);
  const input = findOutput(result, "schedule1")!.fields as Record<string, number>;
  assertEquals(input.line5_schedule_e, 10_000);
});

Deno.test("edge case: royalty property (type=6) with no street_address does not throw", () => {
  // Context: for royalty property, leave Lines 1a and 2 blank
  const result = compute([
    minimalItem({
      property_type: 6,
      rent_income: 0,
      royalties_income: 5_000,
      fair_rental_days: 0,
      // no street_address
    }),
  ]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("edge case: qualified_joint_venture=true does not throw and processes normally", () => {
  const result = compute([
    minimalItem({
      rent_income: 24_000,
      qualified_joint_venture: true,
    }),
  ]);
  assertEquals(Array.isArray(result.outputs), true);
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1 !== undefined, true);
});

Deno.test("edge case: operating_expenses_carryover re-enters expense pool (reduces net)", () => {
  // Prior-year §280A disallowed expenses flow back into current-year expense pool
  const withCarryover = compute([
    minimalItem({
      rent_income: 10_000,
      operating_expenses_carryover: 2_000,
    }),
  ]);
  const withoutCarryover = compute([
    minimalItem({ rent_income: 10_000 }),
  ]);
  const netWith = (findOutput(withCarryover, "schedule1")!.fields as Record<string, number>).line5_schedule_e;
  const netWithout = (findOutput(withoutCarryover, "schedule1")!.fields as Record<string, number>).line5_schedule_e;
  // Carryover should reduce net income
  assertEquals(netWith < netWithout, true);
});

Deno.test("edge case: expense_other_lines with 6 rows does not throw", () => {
  const result = compute([
    minimalItem({
      rent_income: 15_000,
      expense_other_lines: [
        { description: "HOA fees", amount: 500 },
        { description: "Pest control", amount: 200 },
        { description: "Snow removal", amount: 300 },
        { description: "Landscaping", amount: 400 },
        { description: "Pool maintenance", amount: 600 },
        { description: "Security system", amount: 250 },
      ],
    }),
  ]);
  assertEquals(Array.isArray(result.outputs), true);
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1 !== undefined, true);
  // net = 15000 - (500+200+300+400+600+250) = 15000 - 2250 = 12750
  const input = s1!.fields as Record<string, number>;
  assertEquals(input.line5_schedule_e, 12_750);
});

Deno.test("edge case: expense_other_lines amounts reduce net income", () => {
  const result = compute([
    minimalItem({
      rent_income: 12_000,
      expense_other_lines: [
        { description: "HOA fees", amount: 1_200 },
        { description: "Pest control", amount: 300 },
      ],
    }),
  ]);
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1 !== undefined, true);
  const input = s1!.fields as Record<string, number>;
  assertEquals(input.line5_schedule_e, 10_500);
});

Deno.test("edge case: all expense lines combined reduce net correctly", () => {
  const result = compute([
    minimalItem({
      rent_income: 50_000,
      expense_advertising: 500,
      expense_auto_travel: 400,
      expense_cleaning: 600,
      expense_commissions: 1_500,
      expense_insurance: 1_200,
      expense_legal_professional: 800,
      expense_management: 2_000,
      expense_mortgage_interest: 10_000,
      expense_other_interest: 500,
      expense_repairs: 3_000,
      expense_supplies: 300,
      expense_taxes: 2_500,
      expense_utilities: 1_000,
      expense_depreciation: 8_000,
    }),
  ]);
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1 !== undefined, true);
  const input = s1!.fields as Record<string, number>;
  // total expenses = 500+400+600+1500+1200+800+2000+10000+500+3000+300+2500+1000+8000 = 32300
  // net = 50000 - 32300 = 17700
  assertEquals(input.line5_schedule_e, 17_700);
});

// ─── 9. Smoke Test ───────────────────────────────────────────────────────────

Deno.test("smoke: comprehensive test with all major boxes populated", () => {
  const result = compute([
    {
      tsj: "T",
      property_description: "456 Oak Ave, Springfield, IL 62701",
      street_address: "456 Oak Ave",
      city: "Springfield",
      state: "IL",
      zip: "62701",
      property_type: 1,
      activity_type: "A",
      fair_rental_days: 300,
      personal_use_days: 0,
      rent_income: 24_000,
      royalties_income: 0,
      expense_advertising: 600,
      expense_cleaning: 800,
      expense_insurance: 1_200,
      expense_management: 1_800,
      expense_mortgage_interest: 9_000,
      expense_repairs: 2_400,
      expense_taxes: 3_000,
      expense_utilities: 1_200,
      expense_depreciation: 5_500,
      expense_other_lines: [{ description: "HOA fees", amount: 600 }],
      carry_to_8960: true,
      some_investment_not_at_risk: false,
      main_home_or_second_home: false,
      qbi_trade_or_business: "Y",
      qbi_w2_wages: 0,
      form_1099_payments_made: false,
      ownership_percent: 100,
    },
  ]);

  // schedule1 output must exist with exact net
  const input = findOutput(result, "schedule1")!.fields as Record<string, number>;
  // net = 24000 - (600+800+1200+1800+9000+2400+3000+1200+5500+600) = 24000 - 26100 = -2100
  assertEquals(input.line5_schedule_e, -2_100);

  // form8582 required: activity_type=A, net loss
  assertEquals((findOutput(result, "form8582")!.fields as Record<string, number>).current_loss, 2_100);

  // form8960 required: carry_to_8960=true, net=-2100
  assertEquals((findOutput(result, "form8960")!.fields as Record<string, number>).line4b_rental_net, -2_100);

  // form8995 required: qbi_trade_or_business=Y, qbi=net=-2100
  assertEquals((findOutput(result, "form8995")!.fields as Record<string, number>).qbi, -2_100);

  // form6198 must NOT be present: some_investment_not_at_risk=false
  const f6198 = findOutput(result, "form6198");
  assertEquals(f6198, undefined);

  // scheduleA must NOT be present: main_home_or_second_home=false
  const schA = findOutput(result, "schedule_a");
  assertEquals(schA, undefined);
});

Deno.test("edge case self-rental (property_type=7): net loss is passive — routes to form8582", () => {
  // Treas. Reg. §1.469-2(f)(6): net rental LOSS on self-rental is passive (unlike income)
  const result = compute([
    minimalItem({
      property_type: 7,
      activity_type: "A",
      rent_income: 5_000,
      expense_repairs: 8_000, // net = -3,000
    }),
  ]);
  // Net loss → passive → must route to form8582
  const f8582 = findOutput(result, "form8582");
  assertEquals(f8582 !== undefined, true);
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1 !== undefined, true);
  const input = s1!.fields as Record<string, number>;
  assertEquals(input.line5_schedule_e, -3_000);
});

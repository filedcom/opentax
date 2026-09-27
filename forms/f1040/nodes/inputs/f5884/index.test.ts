import { assertEquals, assertThrows } from "@std/assert";
import {
  calculateForm5884,
  f5884,
  itemSchema,
  TargetGroup,
  VeteranCategory,
} from "./index.ts";
import type { z } from "zod";

type F5884Item = z.infer<typeof itemSchema>;

function minimalItem(overrides: Partial<F5884Item> = {}): F5884Item {
  return {
    employee_reference: "EMP-001",
    target_group: TargetGroup.TanfRecipient,
    hired_on: "2025-01-15",
    certification: {
      path: "certified_by_start",
      swa_certification_reference: "SWA-001",
      certification_received_on: "2025-01-15",
      certification_received_before_claim_confirmed: true,
    },
    qualified_wages_confirmed: true,
    not_prior_employee_confirmed: true,
    not_related_or_dependent_confirmed: true,
    more_than_half_wages_for_trade_or_business_confirmed: true,
    excluded_wages_removed_confirmed: true,
    first_year_wages: 0,
    hours_worked: 0,
    ...overrides,
  };
}

function compute(items: F5884Item[]) {
  return f5884.compute({ taxYear: 2025, formType: "f1040" }, {
    f5884s: items,
    subject_to_passive_activity_limit: false,
  });
}

function findForm3800(result: ReturnType<typeof compute>) {
  return result.outputs.find((o) => o.nodeType === "f3800");
}

// ── Schema Validation ────────────────────────────────────────────────────────

Deno.test("schema_rejects_no_employer_or_pass_through_source", () => {
  assertThrows(
    () =>
      f5884.compute({ taxYear: 2025, formType: "f1040" }, {
        f5884s: [],
        subject_to_passive_activity_limit: false,
      }),
    Error,
  );
});

Deno.test("schema_rejects_negative_wages", () => {
  const result = f5884.inputSchema.safeParse({
    f5884s: [minimalItem({ first_year_wages: -100, hours_worked: 400 })],
    subject_to_passive_activity_limit: false,
  });
  assertEquals(result.success, false);
});

Deno.test("schema_accepts_valid_item", () => {
  const result = f5884.inputSchema.safeParse({
    f5884s: [
      minimalItem({
        target_group: TargetGroup.ExFelon,
        first_year_wages: 6000,
        hours_worked: 400,
      }),
    ],
    subject_to_passive_activity_limit: false,
  });
  assertEquals(result.success, true);
});

Deno.test("certification by the first workday requires actual receipt by hire", () => {
  const valid = minimalItem();
  assertEquals(itemSchema.safeParse(valid).success, true);
  assertEquals(
    itemSchema.safeParse(minimalItem({
      certification: {
        path: "certified_by_start",
        swa_certification_reference: "SWA-001",
        certification_received_on: "2025-01-16",
        certification_received_before_claim_confirmed: true,
      },
    })).success,
    false,
  );
});

Deno.test("Form 8850 prescreen path enforces offer, signatures, and SWA deadline", () => {
  const certification = {
    path: "form8850_prescreen" as const,
    swa_certification_reference: "SWA-002",
    certification_received_on: "2025-03-01",
    certification_received_before_claim_confirmed: true as const,
    job_offer_on: "2025-01-10",
    prescreen_completed_on: "2025-01-10",
    form8850_signed_by_applicant_on: "2025-01-10",
    form8850_signed_by_employer_on: "2025-02-12",
    form8850_submitted_to_swa_on: "2025-02-12",
    eta_form: "9061" as const,
  };
  const parse = (updates: Partial<typeof certification>) =>
    itemSchema.safeParse(minimalItem({
      certification: { ...certification, ...updates },
    })).success;
  assertEquals(parse({}), true);
  assertEquals(parse({ prescreen_completed_on: "2025-01-11" }), false);
  assertEquals(parse({ job_offer_on: "2025-01-16" }), false);
  assertEquals(parse({ form8850_signed_by_applicant_on: "2025-02-13" }), false);
  assertEquals(parse({ form8850_signed_by_employer_on: "2025-02-13" }), false);
  assertEquals(parse({ form8850_submitted_to_swa_on: "2025-02-13" }), false);
  assertEquals(parse({ certification_received_on: "2025-02-11" }), false);
});

// ── Zero Output Cases ─────────────────────────────────────────────────────────

Deno.test("zero_wages_produces_no_output", () => {
  const result = compute([
    minimalItem({ first_year_wages: 0, hours_worked: 400 }),
  ]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("under_120_hours_produces_no_output", () => {
  const result = compute([
    minimalItem({ first_year_wages: 6000, hours_worked: 119 }),
  ]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("exactly_0_hours_produces_no_output", () => {
  const result = compute([
    minimalItem({ first_year_wages: 5000, hours_worked: 0 }),
  ]);
  assertEquals(result.outputs.length, 0);
});

// ── Standard Credit Rates ─────────────────────────────────────────────────────

Deno.test("120_to_399_hours_yields_25pct_rate", () => {
  // $6,000 × 25% = $1,500
  const result = compute([
    minimalItem({ first_year_wages: 6000, hours_worked: 200 }),
  ]);
  const out = findForm3800(result);
  assertEquals(out?.fields.f5884_credit?.credit_amount, 1500);
});

Deno.test("400_plus_hours_yields_40pct_rate", () => {
  // $6,000 × 40% = $2,400
  const result = compute([
    minimalItem({ first_year_wages: 6000, hours_worked: 400 }),
  ]);
  const out = findForm3800(result);
  assertEquals(out?.fields.f5884_credit?.credit_amount, 2400);
});

Deno.test("exactly_120_hours_yields_25pct_rate", () => {
  // $3,000 × 25% = $750
  const result = compute([
    minimalItem({ first_year_wages: 3000, hours_worked: 120 }),
  ]);
  const out = findForm3800(result);
  assertEquals(out?.fields.f5884_credit?.credit_amount, 750);
});

// ── Wage Cap ──────────────────────────────────────────────────────────────────

Deno.test("wages_capped_at_6000_for_standard_groups", () => {
  // $10,000 wages, 400+ hours → capped at $6,000 × 40% = $2,400
  const result = compute([
    minimalItem({ first_year_wages: 10000, hours_worked: 400 }),
  ]);
  const out = findForm3800(result);
  assertEquals(out?.fields.f5884_credit?.credit_amount, 2400);
});

Deno.test("summer_youth_capped_at_3000", () => {
  // $5,000 wages, 400 hours, summer youth → capped at $3,000 × 40% = $1,200
  const result = compute([minimalItem({
    target_group: TargetGroup.SummerYouth,
    first_year_wages: 5000,
    hours_worked: 400,
    summer_youth_zone_and_service_period_confirmed: true,
  })]);
  const out = findForm3800(result);
  assertEquals(out?.fields.f5884_credit?.credit_amount, 1200);
});

// ── Long-Term Family Assistance (Group 9) ────────────────────────────────────

Deno.test("ltfa_uses_first_and_second_year_wages", () => {
  // First year: $10,000 × 40% = $4,000; Second year: $10,000 × 50% = $5,000 → total $9,000
  const result = compute([minimalItem({
    target_group: TargetGroup.LongTermFamilyAssistance,
    first_year_wages: 10000,
    second_year_wages: 10000,
    hours_worked: 400,
  })]);
  const out = findForm3800(result);
  assertEquals(out?.fields.f5884_credit?.credit_amount, 9000);
});

Deno.test("ltfa_first_year_only_no_second_year", () => {
  // $8,000 × 40% = $3,200
  const result = compute([minimalItem({
    target_group: TargetGroup.LongTermFamilyAssistance,
    first_year_wages: 8000,
    hours_worked: 400,
  })]);
  const out = findForm3800(result);
  assertEquals(out?.fields.f5884_credit?.credit_amount, 3200);
});

Deno.test("ltfa_requires_at_least_120_hours", () => {
  const belowMinimum = compute([minimalItem({
    target_group: TargetGroup.LongTermFamilyAssistance,
    first_year_wages: 5000,
    hours_worked: 119,
  })]);
  const atMinimum = compute([minimalItem({
    target_group: TargetGroup.LongTermFamilyAssistance,
    first_year_wages: 5000,
    hours_worked: 120,
  })]);
  assertEquals(belowMinimum.outputs.length, 0);
  assertEquals(
    findForm3800(atMinimum)?.fields.f5884_credit?.credit_amount,
    1250,
  );
});

Deno.test("ltfa_wage_cap_10000_per_tier", () => {
  // $15,000 first-year → capped at $10,000 × 40% = $4,000
  const result = compute([minimalItem({
    target_group: TargetGroup.LongTermFamilyAssistance,
    first_year_wages: 15000,
    second_year_wages: 15000,
    hours_worked: 400,
  })]);
  const out = findForm3800(result);
  assertEquals(out?.fields.f5884_credit?.credit_amount, 9000); // 4000 + 5000
});

// ── Aggregation ───────────────────────────────────────────────────────────────

Deno.test("multiple_employees_aggregate", () => {
  // Employee A: $6,000 × 40% = $2,400; Employee B: $4,000 × 40% = $1,600 → $4,000
  const result = compute([
    minimalItem({ first_year_wages: 6000, hours_worked: 400 }),
    minimalItem({
      employee_reference: "EMP-002",
      target_group: TargetGroup.ExFelon,
      first_year_wages: 4000,
      hours_worked: 400,
    }),
  ]);
  const out = findForm3800(result);
  assertEquals(out?.fields.f5884_credit?.credit_amount, 4000);
});

Deno.test("routes_to_form3800", () => {
  const result = compute([
    minimalItem({ first_year_wages: 6000, hours_worked: 400 }),
  ]);
  assertEquals(result.outputs[0]?.nodeType, "f3800");
});

// ── Veteran Subcategories ─────────────────────────────────────────────────────

Deno.test("disabled_veteran_cap_12000", () => {
  // $15,000 × 40% → capped at $12,000 × 40% = $4,800
  const result = compute([minimalItem({
    target_group: TargetGroup.VeteranFoodStamp,
    first_year_wages: 15000,
    hours_worked: 400,
    veteran_category: VeteranCategory.DisabledRecentlyDischarged,
  })]);
  const out = findForm3800(result);
  assertEquals(out?.fields.f5884_credit?.credit_amount, 4800);
});

Deno.test("disabled_veteran_long_term_cap_14000", () => {
  // $20,000 × 40% → capped at $14,000 × 40% = $5,600
  const result = compute([minimalItem({
    target_group: TargetGroup.VeteranFoodStamp,
    first_year_wages: 20000,
    hours_worked: 400,
    veteran_category: VeteranCategory.LongTermUnemployed,
  })]);
  const out = findForm3800(result);
  assertEquals(out?.fields.f5884_credit?.credit_amount, 5600);
});

Deno.test("disabled_long_term_unemployed_veteran_cap_24000", () => {
  const result = compute([minimalItem({
    target_group: TargetGroup.VeteranFoodStamp,
    first_year_wages: 30_000,
    hours_worked: 400,
    veteran_category: VeteranCategory.DisabledLongTermUnemployed,
  })]);
  assertEquals(
    findForm3800(result)?.fields.f5884_credit?.credit_amount,
    9_600,
  );
});

Deno.test("work opportunity credit requires certified, distinct, qualified employees", () => {
  const valid = minimalItem({ first_year_wages: 6_000, hours_worked: 400 });
  for (
    const item of [
      { ...valid, certification: undefined },
      { ...valid, hired_on: "2026-01-01" },
      { ...valid, not_prior_employee_confirmed: undefined },
      { ...valid, not_related_or_dependent_confirmed: undefined },
      { ...valid, qualified_wages_confirmed: undefined },
      { ...valid, excluded_wages_removed_confirmed: undefined },
      {
        ...valid,
        more_than_half_wages_for_trade_or_business_confirmed: undefined,
      },
      { ...valid, target_group: TargetGroup.VeteranFoodStamp },
      { ...valid, target_group: TargetGroup.SummerYouth },
      { ...valid, target_group: TargetGroup.DesignatedCommunityResident },
      { ...valid, second_year_wages: 1_000 },
    ]
  ) {
    assertEquals(
      f5884.inputSchema.safeParse({
        f5884s: [item],
        subject_to_passive_activity_limit: false,
      }).success,
      false,
    );
  }
  assertEquals(
    f5884.inputSchema.safeParse({
      f5884s: [valid, valid],
      subject_to_passive_activity_limit: false,
    }).success,
    false,
  );
});

Deno.test("Form 5884 separates pass-through-only and mixed source credits", () => {
  const partnership = {
    source_type: "partnership" as const,
    entity_ein: "123456789",
    source_document_reference: "2025 K-1 box 15 code J",
    credit_amount: 1_250,
    subject_to_passive_activity_limit: false,
  };
  const passThroughOnly = {
    f5884s: [],
    pass_through_credits: [partnership],
    subject_to_passive_activity_limit: false,
  };
  assertEquals(f5884.inputSchema.safeParse(passThroughOnly).success, true);
  assertEquals(calculateForm5884(f5884.inputSchema.parse(passThroughOnly)), {
    line1aWages: 0,
    line1aCredit: 0,
    line1bWages: 0,
    line1bCredit: 0,
    line1cWages: 0,
    line1cCredit: 0,
    line2: 0,
    line3: 1_250,
    line4: 1_250,
  });
  const onlyOutput = f5884.compute(
    { taxYear: 2025, formType: "f1040" },
    passThroughOnly,
  );
  assertEquals(onlyOutput.outputs[0]?.nodeType, "f3800");
  assertEquals(
    onlyOutput.outputs[0]?.fields.f5884_credit?.credit_amount,
    1_250,
  );
  const mixed = {
    ...passThroughOnly,
    f5884s: [minimalItem({ first_year_wages: 6_000, hours_worked: 400 })],
  };
  const mixedLines = calculateForm5884(f5884.inputSchema.parse(mixed));
  assertEquals(mixedLines.line2, 2_400);
  assertEquals(mixedLines.line3, 1_250);
  assertEquals(mixedLines.line4, 3_650);
  assertEquals(
    f5884.inputSchema.safeParse({
      ...passThroughOnly,
      pass_through_credits: [partnership, partnership],
    }).success,
    false,
  );
  assertEquals(
    f5884.compute({ taxYear: 2025, formType: "f1040" }, {
      ...passThroughOnly,
      pass_through_credits: [{
        ...partnership,
        subject_to_passive_activity_limit: true,
      }],
    }).outputs[0]?.fields.f5884_credit?.subject_to_passive_activity_limit,
    true,
  );
});

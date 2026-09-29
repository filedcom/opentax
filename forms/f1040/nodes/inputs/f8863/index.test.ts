import { assertEquals, assertThrows } from "@std/assert";
import type { z } from "zod";
import { FilingStatus } from "../../types.ts";
import {
  calculateAocStudentLines,
  calculateForm8863AllowableRatio,
  calculateForm8863Lines,
  f8863,
  type itemSchema,
} from "./index.ts";

type F8863Item = z.infer<typeof itemSchema>;

let nextEducationSourceFixtureId = 1;

function educationSource(
  expenses: number,
  sourceId = String(nextEducationSourceFixtureId++),
) {
  return {
    filing_details: {
      first_name: "Test",
      last_name: "Student",
      name_control: "STUD",
      institutions: [{
        name: "Test University",
        us_address: {
          line1: "1 College Way",
          city: "Austin",
          state: "TX",
          zip: "78701",
        },
        current_year_1098t_received: true,
        prior_year_1098t_received: false,
        ein: "12-3456789",
      }],
    },
    education_expense_workpaper: {
      form1098t_box1_payments: expenses,
      form1098t_box5_scholarships: 0,
      form1098t_document_id: `1098T-TEST-${sourceId}`,
      payment_record_ids: [`PAYMENT-TEST-${sourceId}`],
      paid_tuition_required_fees: expenses,
      paid_course_materials_to_institution: 0,
      paid_course_materials_elsewhere: 0,
      outside_materials_needed_for_course: false,
      institution_materials_required_for_enrollment: false,
      tax_free_assistance_applied_to_expenses: 0,
      qualified_expense_refunds: 0,
      expenses_used_for_other_tax_benefits: 0,
    },
  };
}

// ============================================================
// Helpers
// ============================================================

/**
 * Minimal AOC student item — all required fields present, all AOC gates pass,
 * with zero expenses so no credit is produced unless overridden.
 */
function minimalAocItem(overrides: Partial<F8863Item> = {}): F8863Item {
  const expenses = overrides.aoc_adjusted_expenses ?? 0;
  return {
    credit_type: "aoc",
    student_name: "Test Student",
    aoc_claimed_4_prior_years: false,
    enrolled_half_time: true,
    completed_4_years_postsec: false,
    felony_drug_conviction: false,
    aoc_adjusted_expenses: 0,
    filer_magi: 0,
    filing_status: FilingStatus.Single,
    ...educationSource(expenses),
    ...overrides,
  };
}

/**
 * Minimal LLC student item — no AOC eligibility flags required.
 */
function minimalLlcItem(overrides: Partial<F8863Item> = {}): F8863Item {
  const expenses = overrides.llc_adjusted_expenses ?? 0;
  return {
    credit_type: "llc",
    student_name: "Test Student",
    llc_adjusted_expenses: 0,
    filer_magi: 0,
    filing_status: FilingStatus.Single,
    ...educationSource(expenses),
    ...overrides,
  };
}

function compute(items: F8863Item[]) {
  return f8863.compute({ taxYear: 2025, formType: "f1040" }, {
    f8863s: items,
    credit_limit_worksheet: {
      form1040_line18_tax: 100_000,
      schedule3_line1_foreign_tax_credit: 0,
      schedule3_line2_dependent_care_credit: 0,
      schedule3_line6d: 0,
      schedule3_line6l: 0,
    },
  });
}

function computeWithTaxCapacity(
  items: F8863Item[],
  line18Tax: number,
  priorCredits: {
    line1: number;
    line2: number;
    line6d: number;
    line6l: number;
  },
) {
  return f8863.compute({ taxYear: 2025, formType: "f1040" }, {
    f8863s: items,
    credit_limit_worksheet: {
      form1040_line18_tax: line18Tax,
      schedule3_line1_foreign_tax_credit: priorCredits.line1,
      schedule3_line2_dependent_care_credit: priorCredits.line2,
      schedule3_line6d: priorCredits.line6d,
      schedule3_line6l: priorCredits.line6l,
    },
  });
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

Deno.test("positive Form 8863 calculation needs sourced education expenses", () => {
  assertThrows(
    () => compute([minimalAocItem({
      aoc_adjusted_expenses: 4_000,
      education_expense_workpaper: undefined,
    })]),
    Error,
    "education expense workpaper",
  );
  assertThrows(
    () => compute([minimalLlcItem({
      llc_adjusted_expenses: 5_000,
      education_expense_workpaper: {
        ...educationSource(5_000).education_expense_workpaper,
        qualified_expense_refunds: 500,
      },
    })]),
    Error,
    "do not reconcile to the education expense workpaper",
  );
});

Deno.test("Form 8863 cannot claim the same education source for two students", () => {
  const first = minimalAocItem({
    student_name: "First Student",
    student_ssn: "111-22-3333",
    aoc_adjusted_expenses: 4_000,
  });
  const second = minimalLlcItem({
    student_name: "Second Student",
    student_ssn: "444-55-6666",
    llc_adjusted_expenses: 5_000,
  });
  const firstSource = first.education_expense_workpaper!;
  const secondSource = second.education_expense_workpaper!;
  assertThrows(
    () => compute([first, {
      ...second,
      education_expense_workpaper: {
        ...secondSource,
        form1098t_document_id: firstSource.form1098t_document_id,
      },
    }]),
    Error,
    "cannot reuse a Form 1098-T document reference",
  );
  assertThrows(
    () => compute([first, {
      ...second,
      education_expense_workpaper: {
        ...secondSource,
        payment_record_ids: firstSource.payment_record_ids,
      },
    }]),
    Error,
    "cannot reuse an education payment reference",
  );
});

// ============================================================
// 1. Input Schema Validation
// ============================================================

Deno.test("schema_empty_array: f8863s array must have at least 1 item", () => {
  assertThrows(
    () => f8863.compute({ taxYear: 2025, formType: "f1040" }, { f8863s: [] }),
    Error,
  );
});

Deno.test("schema_requires_credit_type: item without credit_type is rejected", () => {
  const parsed = f8863.inputSchema.safeParse({
    f8863s: [{ student_name: "Alice", aoc_adjusted_expenses: 1000 }],
  });
  assertEquals(parsed.success, false);
});

Deno.test("schema_requires_student_name: item without student_name is rejected", () => {
  const parsed = f8863.inputSchema.safeParse({
    f8863s: [{ credit_type: "aoc", aoc_adjusted_expenses: 1000 }],
  });
  assertEquals(parsed.success, false);
});

Deno.test("schema_aoc_expenses_nonnegative: negative aoc_adjusted_expenses is rejected", () => {
  const parsed = f8863.inputSchema.safeParse({
    f8863s: [{
      credit_type: "aoc",
      student_name: "Alice",
      aoc_adjusted_expenses: -100,
    }],
  });
  assertEquals(parsed.success, false);
});

Deno.test("schema_llc_expenses_nonnegative: negative llc_adjusted_expenses is rejected", () => {
  const parsed = f8863.inputSchema.safeParse({
    f8863s: [{
      credit_type: "llc",
      student_name: "Alice",
      llc_adjusted_expenses: -100,
    }],
  });
  assertEquals(parsed.success, false);
});

Deno.test("schema_valid_minimal_aoc: minimal AOC item passes schema validation", () => {
  const parsed = f8863.inputSchema.safeParse({
    f8863s: [minimalAocItem()],
  });
  assertEquals(parsed.success, true);
});

Deno.test("schema_valid_minimal_llc: minimal LLC item passes schema validation", () => {
  const parsed = f8863.inputSchema.safeParse({
    f8863s: [minimalLlcItem()],
  });
  assertEquals(parsed.success, true);
});

// ============================================================
// 2. Per-Box Routing — AOC path
// ============================================================

Deno.test("aoc_zero_expenses_no_output: AOC student with zero expenses produces no outputs", () => {
  const result = compute([minimalAocItem({ aoc_adjusted_expenses: 0 })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("aoc_routes_refundable_to_f1040: AOC with expenses routes refundable portion to f1040", () => {
  // $4,000 expenses → $2,500 tentative → refundable 40% = $1,000
  const result = compute([
    minimalAocItem({ aoc_adjusted_expenses: 4000, filer_magi: 0 }),
  ]);
  const f1040Out = findOutput(result, "f1040");
  assertEquals(
    Math.round(
      (f1040Out!.fields as Record<string, number>).line29_refundable_aoc,
    ),
    1000,
  );
});

Deno.test("aoc_routes_nonrefundable_to_schedule3: AOC with expenses routes nonrefundable portion to schedule3", () => {
  // $4,000 expenses → $2,500 tentative → nonrefundable 60% = $1,500
  const result = compute([
    minimalAocItem({ aoc_adjusted_expenses: 4000, filer_magi: 0 }),
  ]);
  const sch3Out = findOutput(result, "schedule3");
  assertEquals(
    Math.round(
      (sch3Out!.fields as Record<string, number>).line3_education_credit,
    ),
    1500,
  );
});

Deno.test("aoc_max_credit_2500: full $4,000 expenses produce $2,500 tentative credit split 40/60", () => {
  // Line 27=$4k → Line 28=$2k → Line 29=$500 → Line 30=$2,500
  // Refundable = 40% × $2,500 = $1,000; nonrefundable = 60% × $2,500 = $1,500
  const result = compute([
    minimalAocItem({ aoc_adjusted_expenses: 4000, filer_magi: 0 }),
  ]);
  const f1040Out = findOutput(result, "f1040");
  const sch3Out = findOutput(result, "schedule3");
  const refundable =
    (f1040Out!.fields as Record<string, number>).line29_refundable_aoc;
  const nonrefundable =
    (sch3Out!.fields as Record<string, number>).line3_education_credit;
  assertEquals(Math.round(refundable), 1000);
  assertEquals(Math.round(nonrefundable), 1500);
});

Deno.test("aoc_partial_credit_first_tier_only: $1,500 expenses produce $1,500 total credit", () => {
  // Line 27=$1,500, Line 28=$0, Line 29=$0, Line 30=$1,500
  const result = compute([
    minimalAocItem({ aoc_adjusted_expenses: 1500, filer_magi: 0 }),
  ]);
  const f1040Out = findOutput(result, "f1040");
  const sch3Out = findOutput(result, "schedule3");
  const refundable =
    (f1040Out!.fields as Record<string, number>).line29_refundable_aoc;
  const nonrefundable =
    (sch3Out!.fields as Record<string, number>).line3_education_credit;
  // Refundable = 40% × $1,500 = $600
  assertEquals(Math.round(refundable * 100) / 100, 600);
  // Nonrefundable = 60% × $1,500 = $900
  assertEquals(Math.round(nonrefundable * 100) / 100, 900);
});

Deno.test("aoc_partial_credit_both_tiers: $2,500 expenses produce $2,125 total credit", () => {
  // Line 27=$2,500, Line 28=$500, Line 29=$125, Line 30=$2,125
  // Refundable = 40% × $2,125 = $850; nonrefundable = 60% × $2,125 = $1,275
  const result = compute([
    minimalAocItem({ aoc_adjusted_expenses: 2500, filer_magi: 0 }),
  ]);
  const f1040Out = findOutput(result, "f1040");
  const sch3Out = findOutput(result, "schedule3");
  const refundable =
    (f1040Out!.fields as Record<string, number>).line29_refundable_aoc;
  const nonrefundable =
    (sch3Out!.fields as Record<string, number>).line3_education_credit;
  assertEquals(Math.round(refundable * 100) / 100, 850);
  assertEquals(Math.round(nonrefundable * 100) / 100, 1275);
});

Deno.test("aoc_expense_cap_at_4000: $5,000 expenses produce same result as $4,000 (cap enforced)", () => {
  const result5k = compute([
    minimalAocItem({ aoc_adjusted_expenses: 5000, filer_magi: 0 }),
  ]);
  const result4k = compute([
    minimalAocItem({ aoc_adjusted_expenses: 4000, filer_magi: 0 }),
  ]);
  const refund5k =
    (findOutput(result5k, "f1040")!.fields as Record<string, number>)
      .line29_refundable_aoc;
  const refund4k =
    (findOutput(result4k, "f1040")!.fields as Record<string, number>)
      .line29_refundable_aoc;
  assertEquals(refund5k, refund4k);
});

// ============================================================
// 3. Per-Box Routing — LLC path
// ============================================================

Deno.test("llc_zero_expenses_no_output: LLC student with zero expenses produces no outputs", () => {
  const result = compute([minimalLlcItem({ llc_adjusted_expenses: 0 })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("llc_routes_to_schedule3: LLC with expenses routes to schedule3 line3_education_credit", () => {
  // $5,000 expenses → 20% × $5,000 = $1,000 credit
  const result = compute([
    minimalLlcItem({ llc_adjusted_expenses: 5000, filer_magi: 0 }),
  ]);
  const sch3Out = findOutput(result, "schedule3");
  assertEquals(
    Math.round(
      (sch3Out!.fields as Record<string, number>).line3_education_credit,
    ),
    1000,
  );
});

Deno.test("llc_does_not_route_to_f1040_refundable: LLC credit never produces refundable output on f1040", () => {
  const result = compute([
    minimalLlcItem({ llc_adjusted_expenses: 10000, filer_magi: 0 }),
  ]);
  assertEquals(findOutput(result, "f1040"), undefined);
});

Deno.test("llc_max_credit_2000: $10k expenses produce $2,000 credit (20% × $10k)", () => {
  const result = compute([
    minimalLlcItem({ llc_adjusted_expenses: 10000, filer_magi: 0 }),
  ]);
  const sch3Out = findOutput(result, "schedule3");
  assertEquals(
    Math.round(
      (sch3Out!.fields as Record<string, number>).line3_education_credit,
    ),
    2000,
  );
});

Deno.test("llc_5k_expenses_credit_1000: $5,000 expenses produce $1,000 credit (20% × $5k)", () => {
  const result = compute([
    minimalLlcItem({ llc_adjusted_expenses: 5000, filer_magi: 0 }),
  ]);
  const sch3Out = findOutput(result, "schedule3");
  assertEquals(
    Math.round(
      (sch3Out!.fields as Record<string, number>).line3_education_credit,
    ),
    1000,
  );
});

// ============================================================
// 4. Aggregation — multi-student
// ============================================================

Deno.test("aoc_aggregates_across_students: two AOC students sum their credits", () => {
  // Each student: $4,000 expenses → $2,500 → total $5,000 tentative
  // Refundable per student = $1,000 → total $2,000
  const result = compute([
    minimalAocItem({
      student_name: "Alice",
      aoc_adjusted_expenses: 4000,
      filer_magi: 0,
    }),
    minimalAocItem({
      student_name: "Bob",
      aoc_adjusted_expenses: 4000,
      filer_magi: 0,
    }),
  ]);
  assertEquals(
    Math.round(
      (findOutput(result, "f1040")!.fields as Record<string, number>)
        .line29_refundable_aoc,
    ),
    2000,
  );
});

Deno.test("llc_aggregates_across_students_below_cap: two students × $4k = $8k → $1,600 credit", () => {
  const result = compute([
    minimalLlcItem({
      student_name: "Alice",
      llc_adjusted_expenses: 4000,
      filer_magi: 0,
    }),
    minimalLlcItem({
      student_name: "Bob",
      llc_adjusted_expenses: 4000,
      filer_magi: 0,
    }),
  ]);
  const sch3Out = findOutput(result, "schedule3");
  assertEquals(
    Math.round(
      (sch3Out!.fields as Record<string, number>).line3_education_credit,
    ),
    1600,
  );
});

Deno.test("llc_aggregate_capped_at_10k_expenses: two students × $8k → capped at $10k → $2,000 credit", () => {
  const result = compute([
    minimalLlcItem({
      student_name: "Alice",
      llc_adjusted_expenses: 8000,
      filer_magi: 0,
    }),
    minimalLlcItem({
      student_name: "Bob",
      llc_adjusted_expenses: 8000,
      filer_magi: 0,
    }),
  ]);
  const sch3Out = findOutput(result, "schedule3");
  assertEquals(
    Math.round(
      (sch3Out!.fields as Record<string, number>).line3_education_credit,
    ),
    2000,
  );
});

Deno.test("aoc_and_llc_same_return_different_students: both credits appear on same return", () => {
  const result = compute([
    minimalAocItem({
      student_name: "Alice",
      aoc_adjusted_expenses: 4000,
      filer_magi: 0,
    }),
    minimalLlcItem({
      student_name: "Bob",
      llc_adjusted_expenses: 5000,
      filer_magi: 0,
    }),
  ]);
  // refundable AOC: $4,000 expenses → $2,500 → 40% = $1,000 refundable
  assertEquals(
    Math.round(
      (findOutput(result, "f1040")!.fields as Record<string, number>)
        .line29_refundable_aoc,
    ),
    1000,
  );
  // Engine emits separate schedule3 outputs: AOC nonrefundable $1,500 + LLC $1,000
  const sch3Outputs = result.outputs.filter((o) => o.nodeType === "schedule3");
  const sch3Total = sch3Outputs.reduce(
    (sum, o) =>
      sum + (o.fields as Record<string, number>).line3_education_credit,
    0,
  );
  assertEquals(Math.round(sch3Total), 2500);
});

// ============================================================
// 5. Thresholds — AOC MAGI phase-out (single/HOH/QSS: $80k–$90k)
// ============================================================

Deno.test("aoc_magi_zero_full_credit: MAGI $0 single yields full $1,000 refundable AOC", () => {
  const result = compute([
    minimalAocItem({ aoc_adjusted_expenses: 4000, filer_magi: 0 }),
  ]);
  assertEquals(
    Math.round(
      (findOutput(result, "f1040")!.fields as Record<string, number>)
        .line29_refundable_aoc,
    ),
    1000,
  );
});

Deno.test("aoc_magi_at_lower_bound_single_80k: MAGI exactly $80k single yields full credit (phase-out not started)", () => {
  const result = compute([
    minimalAocItem({
      aoc_adjusted_expenses: 4000,
      filer_magi: 80000,
      filing_status: FilingStatus.Single,
    }),
  ]);
  assertEquals(
    Math.round(
      (findOutput(result, "f1040")!.fields as Record<string, number>)
        .line29_refundable_aoc,
    ),
    1000,
  );
});

Deno.test("aoc_magi_mid_phaseout_single_85k: MAGI $85k single yields 50% credit ($500 refundable)", () => {
  // fraction = (85000 − 80000) / 10000 = 0.5 → allowed = $2,500 × 0.5 = $1,250
  // refundable = 40% × $1,250 = $500; nonrefundable = 60% × $1,250 = $750
  const result = compute([
    minimalAocItem({
      aoc_adjusted_expenses: 4000,
      filer_magi: 85000,
      filing_status: FilingStatus.Single,
    }),
  ]);
  assertEquals(
    Math.round(
      (findOutput(result, "f1040")!.fields as Record<string, number>)
        .line29_refundable_aoc,
    ),
    500,
  );
  assertEquals(
    Math.round(
      (findOutput(result, "schedule3")!.fields as Record<string, number>)
        .line3_education_credit,
    ),
    750,
  );
});

Deno.test("aoc_magi_at_ceiling_single_90k: MAGI $90k single yields zero credit", () => {
  const result = compute([
    minimalAocItem({
      aoc_adjusted_expenses: 4000,
      filer_magi: 90000,
      filing_status: FilingStatus.Single,
    }),
  ]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("aoc_magi_above_ceiling_single_95k: MAGI above $90k ceiling yields zero credit", () => {
  const result = compute([
    minimalAocItem({
      aoc_adjusted_expenses: 4000,
      filer_magi: 95000,
      filing_status: FilingStatus.Single,
    }),
  ]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("aoc_magi_mfj_at_lower_bound_160k: MAGI exactly $160k MFJ yields full credit", () => {
  const result = compute([
    minimalAocItem({
      aoc_adjusted_expenses: 4000,
      filer_magi: 160000,
      filing_status: FilingStatus.MFJ,
    }),
  ]);
  assertEquals(
    Math.round(
      (findOutput(result, "f1040")!.fields as Record<string, number>)
        .line29_refundable_aoc,
    ),
    1000,
  );
});

Deno.test("aoc_magi_mfj_mid_phaseout_170k: MAGI $170k MFJ yields 50% credit ($500 refundable)", () => {
  // fraction = (170000 − 160000) / 20000 = 0.5 → allowed = $1,250 → refundable = $500; nonrefundable = $750
  const result = compute([
    minimalAocItem({
      aoc_adjusted_expenses: 4000,
      filer_magi: 170000,
      filing_status: FilingStatus.MFJ,
    }),
  ]);
  assertEquals(
    Math.round(
      (findOutput(result, "f1040")!.fields as Record<string, number>)
        .line29_refundable_aoc,
    ),
    500,
  );
  assertEquals(
    Math.round(
      (findOutput(result, "schedule3")!.fields as Record<string, number>)
        .line3_education_credit,
    ),
    750,
  );
});

Deno.test("aoc_magi_mfj_at_ceiling_180k: MAGI $180k MFJ yields zero credit", () => {
  const result = compute([
    minimalAocItem({
      aoc_adjusted_expenses: 4000,
      filer_magi: 180000,
      filing_status: FilingStatus.MFJ,
    }),
  ]);
  assertEquals(result.outputs.length, 0);
});

// ============================================================
// 6. Thresholds — LLC MAGI phase-out (same thresholds as AOC)
// ============================================================

Deno.test("llc_magi_zero_full_credit: MAGI $0 single yields full $2,000 LLC credit", () => {
  const result = compute([
    minimalLlcItem({ llc_adjusted_expenses: 10000, filer_magi: 0 }),
  ]);
  const sch3Out = findOutput(result, "schedule3");
  assertEquals(
    Math.round(
      (sch3Out!.fields as Record<string, number>).line3_education_credit,
    ),
    2000,
  );
});

Deno.test("llc_magi_at_lower_bound_single_80k: MAGI $80k single yields full $2,000 LLC credit", () => {
  const result = compute([
    minimalLlcItem({
      llc_adjusted_expenses: 10000,
      filer_magi: 80000,
      filing_status: FilingStatus.Single,
    }),
  ]);
  const sch3Out = findOutput(result, "schedule3");
  assertEquals(
    Math.round(
      (sch3Out!.fields as Record<string, number>).line3_education_credit,
    ),
    2000,
  );
});

Deno.test("llc_magi_mid_phaseout_single_85k: MAGI $85k single yields 50% LLC credit ($1,000)", () => {
  // fraction = 0.5 → $2,000 × 0.5 = $1,000
  const result = compute([
    minimalLlcItem({
      llc_adjusted_expenses: 10000,
      filer_magi: 85000,
      filing_status: FilingStatus.Single,
    }),
  ]);
  const sch3Out = findOutput(result, "schedule3");
  assertEquals(
    Math.round(
      (sch3Out!.fields as Record<string, number>).line3_education_credit,
    ),
    1000,
  );
});

Deno.test("llc_magi_at_ceiling_single_90k: MAGI $90k single yields zero LLC credit", () => {
  const result = compute([
    minimalLlcItem({
      llc_adjusted_expenses: 10000,
      filer_magi: 90000,
      filing_status: FilingStatus.Single,
    }),
  ]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("llc_magi_above_ceiling_single_95k: MAGI above $90k ceiling yields zero LLC credit", () => {
  const result = compute([
    minimalLlcItem({
      llc_adjusted_expenses: 10000,
      filer_magi: 95000,
      filing_status: FilingStatus.Single,
    }),
  ]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("llc_magi_mfj_at_ceiling_180k: MAGI $180k MFJ yields zero LLC credit", () => {
  const result = compute([
    minimalLlcItem({
      llc_adjusted_expenses: 10000,
      filer_magi: 180000,
      filing_status: FilingStatus.MFJ,
    }),
  ]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("llc_magi_mfj_at_lower_bound_160k: MAGI exactly $160k MFJ yields full $2,000 LLC credit", () => {
  // $160k = phase-out start for MFJ → fraction = 0 → full credit
  // $10,000 expenses → LLC credit = min($10,000, $10,000) × 20% = $2,000
  const result = compute([
    minimalLlcItem({
      llc_adjusted_expenses: 10000,
      filer_magi: 160000,
      filing_status: FilingStatus.MFJ,
    }),
  ]);
  assertEquals(
    (findOutput(result, "schedule3")!.fields as Record<string, number>)
      .line3_education_credit,
    2000,
  );
});

Deno.test("llc_magi_mfj_mid_phaseout_170k: MAGI $170k MFJ yields $1,000 LLC credit (50% phase-out)", () => {
  // fraction = (170000 − 160000) / 20000 = 0.500 → allowed = $2,000 × (1 − 0.500) = $1,000
  const result = compute([
    minimalLlcItem({
      llc_adjusted_expenses: 10000,
      filer_magi: 170000,
      filing_status: FilingStatus.MFJ,
    }),
  ]);
  assertEquals(
    (findOutput(result, "schedule3")!.fields as Record<string, number>)
      .line3_education_credit,
    1000,
  );
});

// ============================================================
// 7. AOC Eligibility Gates (Lines 23–26)
// ============================================================

Deno.test("aoc_gate_prior_4_years_blocks_aoc_refundable: aoc_claimed_4_prior_years=true → no f1040 output", () => {
  const result = compute([
    minimalAocItem({
      aoc_adjusted_expenses: 4000,
      aoc_claimed_4_prior_years: true,
      filer_magi: 0,
    }),
  ]);
  assertEquals(findOutput(result, "f1040"), undefined);
});

Deno.test("aoc_gate_not_half_time_blocks_aoc_refundable: enrolled_half_time=false → no f1040 output", () => {
  const result = compute([
    minimalAocItem({
      aoc_adjusted_expenses: 4000,
      enrolled_half_time: false,
      filer_magi: 0,
    }),
  ]);
  assertEquals(findOutput(result, "f1040"), undefined);
});

Deno.test("aoc_gate_completed_4_years_blocks_aoc_refundable: completed_4_years_postsec=true → no f1040 output", () => {
  const result = compute([
    minimalAocItem({
      aoc_adjusted_expenses: 4000,
      completed_4_years_postsec: true,
      filer_magi: 0,
    }),
  ]);
  assertEquals(findOutput(result, "f1040"), undefined);
});

Deno.test("aoc_gate_felony_blocks_aoc_refundable: felony_drug_conviction=true → no f1040 output", () => {
  const result = compute([
    minimalAocItem({
      aoc_adjusted_expenses: 4000,
      felony_drug_conviction: true,
      filer_magi: 0,
    }),
  ]);
  assertEquals(findOutput(result, "f1040"), undefined);
});

Deno.test("aoc_all_gates_pass_allows_refundable: all eligibility flags correct → f1040 refundable $1,000", () => {
  const result = compute([
    minimalAocItem({
      aoc_claimed_4_prior_years: false,
      enrolled_half_time: true,
      completed_4_years_postsec: false,
      felony_drug_conviction: false,
      aoc_adjusted_expenses: 4000,
      filer_magi: 0,
    }),
  ]);
  assertEquals(
    Math.round(
      (findOutput(result, "f1040")!.fields as Record<string, number>)
        .line29_refundable_aoc,
    ),
    1000,
  );
});

Deno.test("aoc_gate_felony_does_not_block_llc_path: felony disqualifies AOC but LLC path still produces credit", () => {
  // Felony blocks AOC; LLC expenses on same item still produce a credit via llc path
  // $5,000 LLC expenses → 20% × $5,000 = $1,000 credit; no f1040 refundable output
  const result = compute([
    minimalAocItem({
      aoc_adjusted_expenses: 4000,
      felony_drug_conviction: true,
      llc_adjusted_expenses: 5000,
      ...educationSource(5000),
      filer_magi: 0,
    }),
  ]);
  assertEquals(findOutput(result, "f1040"), undefined);
  assertEquals(
    Math.round(
      (findOutput(result, "schedule3")!.fields as Record<string, number>)
        .line3_education_credit,
    ),
    1000,
  );
});

// ============================================================
// 8. Kiddie Rule — AOC fully nonrefundable
// ============================================================

Deno.test("kiddie_rule_true_aoc_fully_nonrefundable: entire AOC goes to schedule3, no f1040 output", () => {
  const result = compute([
    minimalAocItem({
      aoc_adjusted_expenses: 4000,
      filer_magi: 0,
      taxpayer_under_24_no_refundable_aoc: true,
    }),
  ]);
  // No refundable portion on f1040
  assertEquals(findOutput(result, "f1040"), undefined);
  // Entire $2,500 credit is nonrefundable on schedule3
  assertEquals(
    Math.round(
      (findOutput(result, "schedule3")!.fields as Record<string, number>)
        .line3_education_credit,
    ),
    2500,
  );
});

Deno.test("kiddie_rule_false_allows_refundable: taxpayer_under_24_no_refundable_aoc=false → normal 40/60 split", () => {
  const result = compute([
    minimalAocItem({
      aoc_adjusted_expenses: 4000,
      filer_magi: 0,
      taxpayer_under_24_no_refundable_aoc: false,
    }),
  ]);
  assertEquals(
    Math.round(
      (findOutput(result, "f1040")!.fields as Record<string, number>)
        .line29_refundable_aoc,
    ),
    1000,
  );
  assertEquals(
    Math.round(
      (findOutput(result, "schedule3")!.fields as Record<string, number>)
        .line3_education_credit,
    ),
    1500,
  );
});

Deno.test("return-level under-24 answer cannot conflict between AOC students", () => {
  assertThrows(
    () =>
      compute([
        minimalAocItem({
          student_name: "Alice",
          aoc_adjusted_expenses: 4_000,
          taxpayer_under_24_no_refundable_aoc: true,
        }),
        minimalAocItem({
          student_name: "Bob",
          aoc_adjusted_expenses: 4_000,
          taxpayer_under_24_no_refundable_aoc: false,
        }),
      ]),
    Error,
    "conflicting taxpayer under-24 answers",
  );
  assertThrows(
    () =>
      compute([
        minimalAocItem({
          student_name: "Alice",
          aoc_adjusted_expenses: 4_000,
          taxpayer_under_24_no_refundable_aoc: true,
        }),
        minimalAocItem({
          student_name: "Bob",
          aoc_adjusted_expenses: 4_000,
        }),
      ]),
    Error,
    "conflicting taxpayer under-24 answers",
  );
});

Deno.test("same student SSN cannot claim AOC and LLC on one return", () => {
  assertThrows(
    () =>
      compute([
        minimalAocItem({
          student_name: "Alice",
          student_ssn: "222-33-4444",
          aoc_adjusted_expenses: 4_000,
        }),
        minimalLlcItem({
          student_name: "Alice",
          student_ssn: "222334444",
          llc_adjusted_expenses: 2_000,
        }),
      ]),
    Error,
    "same student SSN twice",
  );
});

// ============================================================
// 9. MFS Filing Status — Both Credits Disallowed
// ============================================================

Deno.test("mfs_aoc_no_output: married filing separately produces no AOC output", () => {
  const result = compute([
    minimalAocItem({
      aoc_adjusted_expenses: 4000,
      filer_magi: 0,
      filing_status: FilingStatus.MFS,
    }),
  ]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("mfs_llc_no_output: married filing separately produces no LLC output", () => {
  const result = compute([
    minimalLlcItem({
      llc_adjusted_expenses: 10000,
      filer_magi: 0,
      filing_status: FilingStatus.MFS,
    }),
  ]);
  assertEquals(result.outputs.length, 0);
});

// ============================================================
// 10. LLC Expense Cap ($10,000 per return)
// ============================================================

Deno.test("llc_expense_cap_single_student_15k: $15k expenses capped at $10k → $2,000 credit", () => {
  const result = compute([
    minimalLlcItem({ llc_adjusted_expenses: 15000, filer_magi: 0 }),
  ]);
  assertEquals(
    Math.round(
      (findOutput(result, "schedule3")!.fields as Record<string, number>)
        .line3_education_credit,
    ),
    2000,
  );
});

Deno.test("llc_expense_exactly_at_cap_10k: $10k produces max $2,000 credit", () => {
  const result = compute([
    minimalLlcItem({ llc_adjusted_expenses: 10000, filer_magi: 0 }),
  ]);
  assertEquals(
    Math.round(
      (findOutput(result, "schedule3")!.fields as Record<string, number>)
        .line3_education_credit,
    ),
    2000,
  );
});

Deno.test("llc_expense_below_cap_5k: $5k produces $1,000 credit (no cap triggered)", () => {
  const result = compute([
    minimalLlcItem({ llc_adjusted_expenses: 5000, filer_magi: 0 }),
  ]);
  assertEquals(
    Math.round(
      (findOutput(result, "schedule3")!.fields as Record<string, number>)
        .line3_education_credit,
    ),
    1000,
  );
});

// ============================================================
// 11. Informational Fields — must NOT add extra outputs
// ============================================================

Deno.test("institution_a_fields_informational: institution name/address/EIN fields do not alter output count", () => {
  const withInstitution = compute([
    minimalAocItem({
      aoc_adjusted_expenses: 4000,
      filer_magi: 0,
      institution_a_name: "State University",
      institution_a_address: "123 College Ave, Townville, ST 12345",
      institution_a_ein: "12-3456789",
      institution_a_1098t_received: true,
      institution_a_1098t_box7_prior: false,
    }),
  ]);
  const withoutInstitution = compute([
    minimalAocItem({ aoc_adjusted_expenses: 4000, filer_magi: 0 }),
  ]);
  assertEquals(
    withInstitution.outputs.length,
    withoutInstitution.outputs.length,
  );
});

Deno.test("student_ssn_informational: student_ssn does not alter output count", () => {
  const withSsn = compute([
    minimalAocItem({
      aoc_adjusted_expenses: 4000,
      filer_magi: 0,
      student_ssn: "123-45-6789",
    }),
  ]);
  const withoutSsn = compute([
    minimalAocItem({ aoc_adjusted_expenses: 4000, filer_magi: 0 }),
  ]);
  assertEquals(withSsn.outputs.length, withoutSsn.outputs.length);
});

Deno.test("institution_b_fields_informational: second institution fields do not alter output count", () => {
  const withB = compute([
    minimalAocItem({
      aoc_adjusted_expenses: 4000,
      filer_magi: 0,
      institution_b_name: "Community College",
      institution_b_address: "456 Main St",
      institution_b_1098t_received: false,
      institution_b_ein: "98-7654321",
    }),
  ]);
  const withoutB = compute([
    minimalAocItem({ aoc_adjusted_expenses: 4000, filer_magi: 0 }),
  ]);
  assertEquals(withB.outputs.length, withoutB.outputs.length);
});

// ============================================================
// 12. Edge Cases
// ============================================================

Deno.test("edge_hoh_uses_single_thresholds: HOH at $90k ceiling yields zero credit", () => {
  // HOH uses the $80k–$90k range (same as single)
  const result = compute([
    minimalAocItem({
      aoc_adjusted_expenses: 4000,
      filer_magi: 90000,
      filing_status: FilingStatus.HOH,
    }),
  ]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("edge_hoh_below_ceiling_86k_has_credit: HOH at $86k yields partial credit", () => {
  // fraction = (86000 − 80000) / 10000 = 0.6 → allowed = $2,500 × 0.4 = $1,000
  // refundable = 40% × $1,000 = $400; nonrefundable = 60% × $1,000 = $600
  const result = compute([
    minimalAocItem({
      aoc_adjusted_expenses: 4000,
      filer_magi: 86000,
      filing_status: FilingStatus.HOH,
    }),
  ]);
  assertEquals(
    Math.round(
      (findOutput(result, "f1040")!.fields as Record<string, number>)
        .line29_refundable_aoc,
    ),
    400,
  );
  assertEquals(
    Math.round(
      (findOutput(result, "schedule3")!.fields as Record<string, number>)
        .line3_education_credit,
    ),
    600,
  );
});

Deno.test("edge_multiple_aoc_students_summed_per_student_rule: two $4k students → $2,000 refundable total", () => {
  const result = compute([
    minimalAocItem({
      student_name: "Alice",
      aoc_adjusted_expenses: 4000,
      filer_magi: 0,
    }),
    minimalAocItem({
      student_name: "Bob",
      aoc_adjusted_expenses: 4000,
      filer_magi: 0,
    }),
  ]);
  assertEquals(
    Math.round(
      (findOutput(result, "f1040")!.fields as Record<string, number>)
        .line29_refundable_aoc,
    ),
    2000,
  );
  assertEquals(
    Math.round(
      (findOutput(result, "schedule3")!.fields as Record<string, number>)
        .line3_education_credit,
    ),
    3000,
  );
});

Deno.test("edge_aoc_ineligible_student_llc_expenses_routes_llc_credit: AOC-ineligible student with LLC expenses routes LLC credit", () => {
  // aoc_claimed_4_prior_years=true blocks AOC; LLC expenses still produce $1,000 credit
  const result = compute([
    minimalAocItem({
      aoc_adjusted_expenses: 4000,
      aoc_claimed_4_prior_years: true,
      llc_adjusted_expenses: 5000,
      ...educationSource(5000),
      filer_magi: 0,
    }),
  ]);
  assertEquals(findOutput(result, "f1040"), undefined);
  assertEquals(
    Math.round(
      (findOutput(result, "schedule3")!.fields as Record<string, number>)
        .line3_education_credit,
    ),
    1000,
  );
});

Deno.test("edge_phase_out_fraction_3_decimal_places: non-round MAGI fraction computes correct credit", () => {
  // MAGI $87,333 → fraction = (87333-80000)/10000 = 0.7333 → rounds to 0.733
  // allowed = $2,500 × (1 - 0.733) = $2,500 × 0.267 = $667.50
  // refundable = 40% × $667.50 = $267; nonrefundable = 60% × $667.50 = $400.50
  const result = compute([
    minimalAocItem({
      aoc_adjusted_expenses: 4000,
      filer_magi: 87333,
      filing_status: FilingStatus.Single,
    }),
  ]);
  assertEquals(
    Math.round(
      (findOutput(result, "f1040")!.fields as Record<string, number>)
        .line29_refundable_aoc,
    ),
    267,
  );
  assertEquals(
    Math.round(
      (findOutput(result, "schedule3")!.fields as Record<string, number>)
        .line3_education_credit,
    ),
    401,
  );
});

Deno.test("edge_kiddie_rule_with_phase_out: kiddie rule + partial phase-out both applied correctly", () => {
  // Kiddie rule + MAGI $85k (fraction 0.5) → allowed = $2,500 × 0.5 = $1,250 → all nonrefundable
  const result = compute([
    minimalAocItem({
      aoc_adjusted_expenses: 4000,
      filer_magi: 85000,
      filing_status: FilingStatus.Single,
      taxpayer_under_24_no_refundable_aoc: true,
    }),
  ]);
  assertEquals(findOutput(result, "f1040"), undefined);
  // $1,250 entirely nonrefundable
  assertEquals(
    Math.round(
      (findOutput(result, "schedule3")!.fields as Record<string, number>)
        .line3_education_credit,
    ),
    1250,
  );
});

// ============================================================
// 13. Smoke Test — Comprehensive scenario
// ============================================================

Deno.test("smoke_test_full_scenario: two students (AOC + LLC), single filer MAGI $85k, partial phase-out", () => {
  // Single filer, MAGI = $85,000 → phase-out fraction = 0.5
  // AOC student: $4,000 expenses → tentative $2,500 → allowed $1,250
  //   refundable = 40% × $1,250 = $500 → f1040
  //   nonrefundable = 60% × $1,250 = $750 → schedule3
  // LLC student: $10,000 expenses → $2,000 base → allowed $1,000 → schedule3

  const result = compute([
    {
      ...educationSource(4000),
      credit_type: "aoc" as const,
      student_name: "Alice AOC",
      aoc_claimed_4_prior_years: false,
      enrolled_half_time: true,
      completed_4_years_postsec: false,
      felony_drug_conviction: false,
      aoc_adjusted_expenses: 4000,
      filer_magi: 85000,
      filing_status: FilingStatus.Single,
      institution_a_name: "State University",
      institution_a_address: "1 Campus Dr, Collegetown, ST 12345",
      institution_a_ein: "12-3456789",
      institution_a_1098t_received: true,
      institution_a_1098t_box7_prior: false,
      student_ssn: "111-22-3333",
      taxpayer_under_24_no_refundable_aoc: false,
    },
    {
      ...educationSource(10000),
      credit_type: "llc" as const,
      student_name: "Bob LLC",
      llc_adjusted_expenses: 10000,
      filer_magi: 85000,
      filing_status: FilingStatus.Single,
    },
  ]);

  // Refundable AOC: 40% × $1,250 = $500
  assertEquals(
    Math.round(
      (findOutput(result, "f1040")!.fields as Record<string, number>)
        .line29_refundable_aoc,
    ),
    500,
  );

  // Form 8863 line 19 combines AOC $750 and LLC $1,000 after the worksheet.
  const sch3Outputs = result.outputs.filter((o) => o.nodeType === "schedule3");
  const sch3Values = sch3Outputs.map(
    (o) =>
      Math.round((o.fields as Record<string, number>).line3_education_credit),
  ).sort((a, b) => a - b);
  assertEquals(sch3Values, [1750]);
});

Deno.test("Form 8863 line 19 is capped by tax after specified prior credits", () => {
  const result = computeWithTaxCapacity(
    [
      minimalAocItem({ aoc_adjusted_expenses: 4_000 }),
      minimalLlcItem({ llc_adjusted_expenses: 5_000 }),
    ],
    1_400,
    { line1: 100, line2: 200, line6d: 50, line6l: 50 },
  );
  assertEquals(
    (findOutput(result, "f1040")!.fields as Record<string, number>)
      .line29_refundable_aoc,
    1_000,
  );
  assertEquals(
    (findOutput(result, "schedule3")!.fields as Record<string, number>)
      .line3_education_credit,
    1_000,
  );
});

Deno.test("Form 8863 does not invent tax capacity when the worksheet is missing", () => {
  assertThrows(
    () =>
      f8863.compute({ taxYear: 2025, formType: "f1040" }, {
        f8863s: [minimalAocItem({ aoc_adjusted_expenses: 4_000 })],
      }),
    Error,
    "needs Credit Limit Worksheet",
  );
  const result = computeWithTaxCapacity(
    [
      minimalAocItem({ aoc_adjusted_expenses: 4_000 }),
    ],
    0,
    { line1: 0, line2: 0, line6d: 0, line6l: 0 },
  );
  assertEquals(findOutput(result, "schedule3"), undefined);
  assertEquals(
    (findOutput(result, "f1040")!.fields as Record<string, number>)
      .line29_refundable_aoc,
    1_000,
  );
});

Deno.test("Form 8863 rejects missing or conflicting return-level facts", () => {
  assertThrows(
    () =>
      compute([minimalAocItem({
        aoc_adjusted_expenses: 4_000,
        filer_magi: undefined,
      })]),
    Error,
    "needs filing status and MAGI",
  );
  assertThrows(
    () =>
      compute([
        minimalAocItem({ aoc_adjusted_expenses: 4_000, filer_magi: 30_000 }),
        minimalLlcItem({ llc_adjusted_expenses: 5_000, filer_magi: 31_000 }),
      ]),
    Error,
    "conflicting return-level MAGI",
  );
});

Deno.test("Form 8863 filing details require one structured institution address", () => {
  const valid = minimalAocItem({
    filing_details: {
      first_name: "Test",
      last_name: "Student",
      name_control: "STUD",
      institutions: [{
        name: "State University",
        us_address: {
          line1: "1 College Road",
          city: "Austin",
          state: "TX",
          zip: "78701",
        },
        current_year_1098t_received: true,
        prior_year_1098t_received: false,
        ein: "12-3456789",
      }],
    },
  });
  assertEquals(f8863.inputSchema.safeParse({ f8863s: [valid] }).success, true);
  assertEquals(
    f8863.inputSchema.safeParse({
      f8863s: [{
        ...valid,
        filing_details: {
          ...valid.filing_details,
          institutions: [{
            ...valid.filing_details!.institutions[0],
            us_address: undefined,
          }],
        },
      }],
    }).success,
    false,
  );
});

Deno.test("Form 8863 AOC Part III lines 27 through 30 follow both tiers", () => {
  assertEquals(calculateAocStudentLines(1_500), {
    line27: 1_500,
    line28: 0,
    line29: 0,
    line30: 1_500,
  });
  assertEquals(calculateAocStudentLines(2_500), {
    line27: 2_500,
    line28: 500,
    line29: 125,
    line30: 2_125,
  });
  assertEquals(calculateAocStudentLines(5_000).line30, 2_500);
});

Deno.test("Form 8863 rounds the allowable phase-out ratio, not its complement", () => {
  assertEquals(
    calculateForm8863AllowableRatio(
      88_335,
      false,
      160_000,
      180_000,
      80_000,
      90_000,
    ),
    0.167,
  );
});

Deno.test("Form 8863 parts I and II agree with capped return outputs", () => {
  const lines = calculateForm8863Lines({
    f8863s: [
      minimalAocItem({ aoc_adjusted_expenses: 4_000, filer_magi: 85_000 }),
      minimalLlcItem({ llc_adjusted_expenses: 5_000, filer_magi: 85_000 }),
    ],
    credit_limit_worksheet: {
      form1040_line18_tax: 900,
      schedule3_line1_foreign_tax_credit: 100,
      schedule3_line2_dependent_care_credit: 0,
      schedule3_line6d: 0,
      schedule3_line6l: 0,
    },
  });
  assertEquals(lines?.line1, 2_500);
  assertEquals(lines?.line6, 0.5);
  assertEquals(lines?.line7, 1_250);
  assertEquals(lines?.line8, 500);
  assertEquals(lines?.line9, 750);
  assertEquals(lines?.line10, 5_000);
  assertEquals(lines?.line18, 500);
  assertEquals(lines?.line19, 800);
});

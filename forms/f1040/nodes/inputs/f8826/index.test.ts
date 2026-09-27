import { assertEquals, assertThrows } from "@std/assert";
import { calculateForm8826, f8826 } from "./index.ts";
import { f3800 } from "../f3800/index.ts";
import { disabledAccessLimit } from "../../intermediate/forms/disabled_access_limit/index.ts";

const eligibleFacts = {
  prior_year_gross_receipts: 500_000,
  prior_year_full_time_employee_count: 20,
  subject_to_passive_activity_limit: false,
};

function compute(input: Parameters<typeof f8826.compute>[1]) {
  return f8826.compute({ taxYear: 2025, formType: "f1040" }, input);
}

function findForm3800(result: ReturnType<typeof compute>) {
  const source = result.outputs.find((o) =>
    o.nodeType === "disabled_access_limit"
  );
  return source
    ? disabledAccessLimit.compute(
      { taxYear: 2025, formType: "f1040" },
      disabledAccessLimit.inputSchema.parse(source.fields),
    ).outputs.find((o) => o.nodeType === "f3800")
    : undefined;
}

function form3800Credit(
  result: ReturnType<typeof compute>,
): number | undefined {
  const output = findForm3800(result);
  return output
    ? f3800.inputSchema.parse(output.fields).f8826_credit_entries?.[0]
      ?.credit_amount
    : undefined;
}

// ── Schema Validation ─────────────────────────────────────────────────────────

Deno.test("schema_rejects_negative_expenditures", () => {
  const result = f8826.inputSchema.safeParse({
    eligible_expenditures: -100,
    ...eligibleFacts,
  });
  assertEquals(result.success, false);
});

Deno.test("schema rejects sub-cent source amounts and calculation rounds a half-cent credit", () => {
  assertEquals(
    f8826.inputSchema.safeParse({
      eligible_expenditures: 250.001,
      ...eligibleFacts,
    }).success,
    false,
  );
  assertEquals(
    f8826.inputSchema.safeParse({
      eligible_expenditures: 0,
      ...eligibleFacts,
      pass_through_credits: [{
        entity_type: "partnership",
        entity_ein: "123456789",
        source_document_reference: "2025 disabled-access K-1",
        credit_amount: 0.001,
        subject_to_passive_activity_limit: false,
      }],
    }).success,
    false,
  );
  assertEquals(
    calculateForm8826({
      eligible_expenditures: 250.01,
      ...eligibleFacts,
    }).line6,
    0.01,
  );
});

Deno.test("schema_accepts_valid_input", () => {
  const result = f8826.inputSchema.safeParse({
    eligible_expenditures: 5000,
    ...eligibleFacts,
  });
  assertEquals(result.success, true);
});

Deno.test("schema_requires_prior_year_receipts_and_full-time headcount", () => {
  assertEquals(
    f8826.inputSchema.safeParse({ eligible_expenditures: 5_000 }).success,
    false,
  );
  assertEquals(
    f8826.inputSchema.safeParse({
      eligible_expenditures: 5_000,
      prior_year_gross_receipts: 500_000,
    }).success,
    false,
  );
  assertEquals(
    f8826.inputSchema.safeParse({
      eligible_expenditures: 5_000,
      prior_year_gross_receipts: 500_000,
      prior_year_full_time_employee_count: 20.5,
    }).success,
    false,
  );
});

Deno.test("pass-through-only credit does not require the recipient's self-earned eligibility facts", () => {
  const input = {
    eligible_expenditures: 0,
    subject_to_passive_activity_limit: false,
    pass_through_credits: [{
      entity_type: "partnership" as const,
      entity_ein: "123456789",
      source_document_reference: "2025 disabled-access K-1",
      credit_amount: 1_250,
      subject_to_passive_activity_limit: false,
    }],
  };
  assertEquals(f8826.inputSchema.safeParse(input).success, true);
  assertEquals(form3800Credit(compute(input)), 1_250);
});

Deno.test("pass-through credit keeps entity identity and rejects duplicates", () => {
  const source = {
    entity_type: "partnership" as const,
    entity_ein: "123456789",
    source_document_reference: "2025 disabled-access K-1",
    credit_amount: 1_250,
    subject_to_passive_activity_limit: false,
  };
  assertEquals(
    f8826.inputSchema.safeParse({
      eligible_expenditures: 0,
      subject_to_passive_activity_limit: false,
      pass_through_credits: [source, source],
    }).success,
    false,
  );
  assertEquals(
    f8826.inputSchema.safeParse({
      eligible_expenditures: 0,
      subject_to_passive_activity_limit: false,
      pass_through_credits: [{ ...source, entity_ein: "12-3456789" }],
    }).success,
    false,
  );
  const { source_document_reference: _reference, ...withoutReference } = source;
  assertEquals(
    f8826.inputSchema.safeParse({
      eligible_expenditures: 0,
      subject_to_passive_activity_limit: false,
      pass_through_credits: [withoutReference],
    }).success,
    false,
  );
});

Deno.test("combined $5,000 cap allocates all source credits pro rata to cents", () => {
  const input = {
    eligible_expenditures: 2_250,
    ...eligibleFacts,
    pass_through_credits: [{
      entity_type: "partnership" as const,
      entity_ein: "123456789",
      source_document_reference: "2025 disabled-access K-1",
      credit_amount: 2_000,
      subject_to_passive_activity_limit: false,
    }, {
      entity_type: "s_corporation" as const,
      entity_ein: "987654321",
      source_document_reference: "2025 disabled-access K-1",
      credit_amount: 3_000,
      subject_to_passive_activity_limit: false,
    }],
  };
  const lines = calculateForm8826(input);
  assertEquals(lines.line6, 1_000);
  assertEquals(lines.line7, 5_000);
  assertEquals(lines.line8, 5_000);
  assertEquals(lines.selfCreditAfterCap, 833.33);
  assertEquals(lines.passThroughCreditsAfterCap, [1_666.67, 2_500]);
  assertEquals(
    Math.round(
      (lines.selfCreditAfterCap +
        lines.passThroughCreditsAfterCap.reduce(
          (sum, amount) => sum + amount,
          0,
        )) * 100,
    ),
    500_000,
  );
  assertEquals(
    f3800.inputSchema.parse(findForm3800(compute(input))?.fields)
      .f8826_credit_entries,
    [{
      source_type: "self",
      credit_amount: 833.33,
      subject_to_passive_activity_limit: false,
    }, {
      source_type: "partnership",
      source_ein: "123456789",
      credit_amount: 1_666.67,
      subject_to_passive_activity_limit: false,
    }, {
      source_type: "s_corporation",
      source_ein: "987654321",
      credit_amount: 2_500,
      subject_to_passive_activity_limit: false,
    }],
  );
});

// ── Zero / No Output Cases ────────────────────────────────────────────────────

Deno.test("zero_expenditures_produces_no_output", () => {
  const result = compute({ eligible_expenditures: 0, ...eligibleFacts });
  assertEquals(result.outputs.length, 0);
});

Deno.test("expenditures_at_250_floor_produces_no_output", () => {
  // $250 − $250 = $0 creditable → no output
  const result = compute({ eligible_expenditures: 250, ...eligibleFacts });
  assertEquals(result.outputs.length, 0);
});

Deno.test("expenditures_below_250_produces_no_output", () => {
  const result = compute({ eligible_expenditures: 100, ...eligibleFacts });
  assertEquals(result.outputs.length, 0);
});

// ── Eligibility Gates ─────────────────────────────────────────────────────────

Deno.test("over_1M_receipts_AND_over_30_full_time_employees_produces_no_output", () => {
  // Both conditions fail → not eligible
  const result = compute({
    eligible_expenditures: 5000,
    prior_year_gross_receipts: 1_500_000,
    prior_year_full_time_employee_count: 35,
    subject_to_passive_activity_limit: false,
  });
  assertEquals(result.outputs.length, 0);
});

Deno.test("over_1M_receipts_but_under_30_full_time_employees_is_eligible", () => {
  // Headcount ≤30 qualifies even if receipts > $1M.
  const result = compute({
    eligible_expenditures: 5000,
    prior_year_gross_receipts: 1_500_000,
    prior_year_full_time_employee_count: 25,
    subject_to_passive_activity_limit: false,
  });
  assertEquals(form3800Credit(result), 2375);
});

Deno.test("under_1M_receipts_but_over_30_full_time_employees_is_eligible", () => {
  // Receipts ≤$1M qualifies even if headcount >30.
  const result = compute({
    eligible_expenditures: 5000,
    prior_year_gross_receipts: 800_000,
    prior_year_full_time_employee_count: 35,
    subject_to_passive_activity_limit: false,
  });
  assertEquals(form3800Credit(result), 2375);
});

Deno.test("exactly_1M_receipts_is_eligible", () => {
  // ($5,000 − $250) × 50% = $2,375
  const result = compute({
    eligible_expenditures: 5000,
    prior_year_gross_receipts: 1_000_000,
    prior_year_full_time_employee_count: 31,
    subject_to_passive_activity_limit: false,
  });
  assertEquals(form3800Credit(result), 2375);
});

Deno.test("exactly_30_full_time_employees_is_eligible", () => {
  // ($5,000 − $250) × 50% = $2,375
  const result = compute({
    eligible_expenditures: 5000,
    prior_year_gross_receipts: 1_000_001,
    prior_year_full_time_employee_count: 30,
    subject_to_passive_activity_limit: false,
  });
  assertEquals(form3800Credit(result), 2375);
});

// ── Credit Calculation ────────────────────────────────────────────────────────

Deno.test("basic_credit_50pct_of_expenditures_minus_250", () => {
  // ($5,000 − $250) × 50% = $2,375
  const result = compute({ eligible_expenditures: 5000, ...eligibleFacts });
  assertEquals(form3800Credit(result), 2375);
});

Deno.test("expenditures_just_above_250_floor", () => {
  // ($251 − $250) × 50% = $0.50
  const result = compute({ eligible_expenditures: 251, ...eligibleFacts });
  assertEquals(form3800Credit(result), 0.5);
});

Deno.test("max_credit_at_10250_expenditures", () => {
  // ($10,250 − $250) × 50% = $5,000
  const result = compute({ eligible_expenditures: 10250, ...eligibleFacts });
  assertEquals(form3800Credit(result), 5000);
});

Deno.test("expenditures_above_10250_still_capped_at_5000", () => {
  // $20,000 expenditures → cap at $10,250 → ($10,250 − $250) × 50% = $5,000
  const result = compute({ eligible_expenditures: 20000, ...eligibleFacts });
  assertEquals(form3800Credit(result), 5000);
});

Deno.test("first-year business with zero prior-year receipts and employees qualifies", () => {
  const result = compute({
    eligible_expenditures: 5000,
    prior_year_gross_receipts: 0,
    prior_year_full_time_employee_count: 0,
    subject_to_passive_activity_limit: false,
  });
  assertEquals(form3800Credit(result), 2375);
});

// ── Routing ───────────────────────────────────────────────────────────────────

Deno.test("routes_source_credit_to_Form_3800_without_claiming_Schedule_3", () => {
  const result = compute({ eligible_expenditures: 5000, ...eligibleFacts });
  assertEquals(result.outputs[0]?.nodeType, "disabled_access_limit");
  assertEquals(findForm3800(result)?.fields.f8826_credit_entries, [{
    source_type: "self",
    credit_amount: 2375,
    subject_to_passive_activity_limit: false,
  }]);
});

Deno.test("passive credit stops before the Form 3800 source route", () => {
  assertEquals(
    f8826.inputSchema.safeParse({
      eligible_expenditures: 5_000,
      prior_year_gross_receipts: 500_000,
      prior_year_full_time_employee_count: 20,
    }).success,
    false,
  );
  assertThrows(
    () =>
      compute({
        eligible_expenditures: 5_000,
        ...eligibleFacts,
        subject_to_passive_activity_limit: true,
      }),
    Error,
    "Form 8582-CR",
  );
});

import { assertEquals, assertThrows } from "@std/assert";
import { FilingStatus } from "../../nodes/types.ts";
import {
  calculateSchedule1A2026,
  claimInputSchema,
  type Schedule1A2026Input,
  schedule1a_2026,
} from "./schedule1a.ts";

import { scopeReview2026, zeroExclusions2026 } from "./schedule1a.fixture.ts";
const source = {
  employee_ssn: "111223333",
  employer_ein: "123456789",
  employer_name: "Cafe",
  source_document_reference: "issued-w2",
  box1_wages: 80_000,
  statutory_employee: false,
  cash_tips: 20_000.49,
  qualified_overtime: 10_000.51,
  occupation_codes: ["102", "000"],
};
const review = {
  source_document_reference: "issued-w2",
  employee_ssn: "111223333",
  employer_ein: "123456789",
  allocations: [{
    occupation_code: "102",
    qualified_cash_tips: 18_000.49,
    occupation_and_tip_records_reference: "tip-log",
  }],
  excluded_cash_tips: 2_000,
  qualification_review_reference: "tip-qualification",
  voluntary_customer_tips_not_service_charges: true as const,
  no_recharacterized_wages_or_related_payor_tips: true as const,
  services_not_illegal_under_applicable_law: true as const,
  sstb_treatment: "notice_2025_69_transition_relief" as const,
};
function fixture(
  overrides: Partial<Schedule1A2026Input> = {},
): Schedule1A2026Input {
  return {
    tax_year: 2026,
    filing_status: FilingStatus.Single,
    taxpayer_ssn: "111223333",
    taxpayer_has_valid_ssn: true,
    taxpayer_ssn_review_complete: true,
    spouse_ssn_review_complete: true,
    taxpayer_age_65_or_older: true,
    magi: 80_000,
    part1_zero_exclusions_review: zeroExclusions2026,
    source_scope_review: scopeReview2026,
    w2_2026_sources: [source],
    employee_tip_reviews: [review],
    ...overrides,
  };
}
Deno.test("2026 Schedule 1-A reconciles mixed occupations, printed cents and senior phaseout", () => {
  const result = calculateSchedule1A2026(fixture());
  assertEquals(result.lines.line5, 18_000);
  assertEquals(result.lines.line17, 10_001);
  assertEquals(result.lines.line43, 5_700);
  assertEquals(result.lines.line44, 33_701);
  assertEquals(result.employee_rows[0].review.excluded_cash_tips, 2_000);
});
Deno.test("2026 Schedule 1-A uses complete $1,000 steps separately for tips and overtime", () => {
  for (
    const [agi, tips, overtime] of [[150_999, 18_000, 10_001], [
      151_000,
      17_900,
      9_901,
    ], [500_000, 0, 0]]
  ) {
    const result = calculateSchedule1A2026(fixture({ magi: agi }));
    assertEquals(result.lines.line15, tips);
    assertEquals(result.lines.line27, overtime);
    assertEquals(result.has_eligible_activity, true);
  }
});
Deno.test("2026 joint Schedule 1-A caps the return once and phases each senior separately", () => {
  const result = calculateSchedule1A2026(fixture({
    filing_status: FilingStatus.MFJ,
    spouse_ssn: "222334444",
    spouse_has_valid_ssn: true,
    spouse_age_65_or_older: true,
    magi: 151_000,
    w2_2026_sources: [source, {
      ...source,
      employee_ssn: "222334444",
      source_document_reference: "spouse-w2",
      cash_tips: 0,
      qualified_overtime: 20_000,
    }],
  }));
  assertEquals(result.lines.line27, 25_000);
  assertEquals(result.lines.line43, 11_880);
  assertEquals(result.lines.line44, 54_880);
});
Deno.test("2026 Schedule 1-A excludes an ineligible spouse without dropping the eligible taxpayer", () => {
  const result = calculateSchedule1A2026(
    fixture({
      filing_status: FilingStatus.MFJ,
      spouse_ssn: "222334444",
      spouse_has_valid_ssn: false,
      spouse_age_65_or_older: true,
      w2_2026_sources: [source, {
        ...source,
        employee_ssn: "222334444",
        source_document_reference: "spouse-w2",
      }],
    }),
  );
  assertEquals(result.lines.line17, 10_001);
  assertEquals(result.lines.line43, 6_000);
});
Deno.test("2026 Schedule 1-A denies MFS tips, overtime and senior deductions", () => {
  const result = calculateSchedule1A2026(
    fixture({
      filing_status: FilingStatus.MFS,
      part1_zero_exclusions_review: undefined,
      employee_tip_reviews: [],
    }),
  );
  assertEquals(result.lines.line44, 0);
  assertEquals(result.has_eligible_activity, false);
});
Deno.test("2026 Schedule 1-A adds all four Part I amounts before phaseout", () => {
  const sourced = (amount: number) => ({
    amount,
    source_reference: "exclusion-form",
  });
  const result = calculateSchedule1A2026(
    fixture({
      magi: 147_000,
      part1_zero_exclusions_review: undefined,
      magi_addbacks_2026: {
        puerto_rico_excluded_income: sourced(1_000),
        form2555_line45: sourced(1_000),
        form2555_line50: sourced(1_000),
        form4563_line15: sourced(1_000),
      },
    }),
  );
  assertEquals(result.lines.line2e, 4_000);
  assertEquals(result.lines.line3, 151_000);
  assertEquals(result.lines.line15, 17_900);
  assertEquals(result.lines.line27, 9_901);
});
Deno.test("2026 Schedule 1-A requires complete source scope and MAGI evidence", () => {
  assertThrows(
    () => calculateSchedule1A2026(fixture({ source_scope_review: undefined })),
    Error,
    "source scope",
  );
  assertThrows(
    () =>
      calculateSchedule1A2026(
        fixture({ part1_zero_exclusions_review: undefined }),
      ),
    Error,
    "Part I",
  );
  for (
    const key of [
      "has_form4137_tips",
      "has_business_tips",
      "has_non_w2_overtime",
    ] as const
  ) {
    assertThrows(
      () =>
        calculateSchedule1A2026(
          fixture({ source_scope_review: { ...scopeReview2026, [key]: true } }),
        ),
      Error,
      "receiving calculators",
    );
  }
});
Deno.test("2026 Schedule 1-A rejects unrelated, duplicate and unreconciled sources", () => {
  assertThrows(
    () =>
      calculateSchedule1A2026(
        fixture({
          w2_2026_sources: [{ ...source, employee_ssn: "999887777" }],
        }),
      ),
    Error,
    "source owner",
  );
  assertThrows(
    () =>
      calculateSchedule1A2026(fixture({ w2_2026_sources: [source, source] })),
    Error,
    "Duplicate",
  );
  assertThrows(
    () =>
      calculateSchedule1A2026(
        fixture({ employee_tip_reviews: [review, review] }),
      ),
    Error,
    "Duplicate",
  );
  assertThrows(
    () =>
      calculateSchedule1A2026(
        fixture({
          employee_tip_reviews: [{ ...review, excluded_cash_tips: 0 }],
        }),
      ),
    Error,
    "reconcile",
  );
  assertThrows(
    () =>
      calculateSchedule1A2026(
        fixture({
          employee_tip_reviews: [{ ...review, employee_ssn: "999887777" }],
        }),
      ),
    Error,
    "must match",
  );
  assertThrows(
    () =>
      calculateSchedule1A2026(
        fixture({ w2_2026_sources: [{ ...source, box1_wages: 25_000 }] }),
      ),
    Error,
    "exceed",
  );
  assertThrows(
    () =>
      calculateSchedule1A2026(
        fixture({ w2_2026_sources: [{ ...source, statutory_employee: true }] }),
      ),
    Error,
    "business-source",
  );
});
Deno.test("2026 TP cannot silently claim all cash tips from an occupation code", () => {
  for (const occupation_codes of [[], ["102"], ["102", "000"]]) {
    assertThrows(
      () =>
        calculateSchedule1A2026(
          fixture({
            w2_2026_sources: [{ ...source, occupation_codes }],
            employee_tip_reviews: [],
          }),
        ),
      Error,
      "occupation allocation",
    );
  }
  assertEquals(
    claimInputSchema.safeParse({
      tax_year: 2026,
      source_scope_review: scopeReview2026,
      employee_tip_reviews: [{
        ...review,
        allocations: [{ ...review.allocations[0], occupation_code: "000" }],
      }],
    }).success,
    false,
  );
});
Deno.test("2026 Schedule 1-A public evidence rejects final amounts and old source fields", () => {
  for (
    const extra of [
      { magi: 80_000 },
      { schedule1a_line44: 1_000 },
      { w2_2026_sources: [source] },
      { form4070_reports: [] },
      { vehicle_loans: [] },
    ]
  ) {
    assertEquals(
      claimInputSchema.safeParse({
        tax_year: 2026,
        source_scope_review: scopeReview2026,
        ...extra,
      }).success,
      false,
    );
  }
});
Deno.test("2026 Schedule 1-A node routes total and senior portion separately to deduction selection", () => {
  const result = schedule1a_2026.compute(
    { formType: "f1040", taxYear: 2026 },
    fixture(),
  );
  assertEquals(
    result.outputs.find((o) => o.nodeType === "standard_deduction")?.fields,
    { schedule1a_line44: 33_701, schedule1a_line43: 5_700 },
  );
  assertThrows(
    () =>
      schedule1a_2026.compute({ formType: "f1040", taxYear: 2025 }, fixture()),
    Error,
    "f1040:2026",
  );
});

Deno.test("2026 Schedule 1-A rejects zero-exclusion claims that conflict with upstream AGI", () => {
  assertThrows(
    () =>
      calculateSchedule1A2026(fixture({ form2555_line45_from_agi: 10_000 })),
    Error,
    "reconcile to the AGI",
  );
  const sourced = (amount: number) => ({
    amount,
    source_reference: "exclusion-form",
  });
  assertThrows(
    () =>
      calculateSchedule1A2026(fixture({
        magi_addbacks_2026: {
          puerto_rico_excluded_income: sourced(1),
          form2555_line45: sourced(0),
          form2555_line50: sourced(0),
          form4563_line15: sourced(0),
        },
      })),
    Error,
    "conflicts",
  );
});

Deno.test("2026 Schedule 1-A does not treat missing SSN evidence as an ineligible zero", () => {
  assertThrows(
    () =>
      calculateSchedule1A2026(fixture({
        taxpayer_has_valid_ssn: false,
        taxpayer_ssn_review_complete: false,
      })),
    Error,
    "review is incomplete",
  );
});

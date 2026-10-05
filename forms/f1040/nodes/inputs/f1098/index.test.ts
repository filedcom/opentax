import { assertEquals, assertThrows } from "@std/assert";
import {
  assertForm1098Box4Sources,
  assertForm1098MortgageLimitSources,
  assertPurchasePointsCrossLoanSources,
  f1098,
  ForRouting,
  inputSchema,
} from "./index.ts";
import { fieldsOf } from "../../../../../core/test-utils/output.ts";
import { scheduleA } from "../schedule_a/index.ts";
import { schedule1 } from "../../outputs/schedule1/index.ts";
import { purchasePointsCrossLoanFixture } from "./purchase_points_cross_loan.fixture.ts";
import { FilingStatus } from "../../../mef/header.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function minimalItem(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    box1_mortgage_interest: 0,
    for_routing: ForRouting.A,
    ...overrides,
  };
}

function reviewedInterest(
  reported: number,
  deductible: number = reported,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return minimalItem({
    box1_mortgage_interest: reported,
    box1_current_year_deductible_interest: deductible,
    box1_deduction_workpaper_reference: "reviewed-pub936-interest-2025",
    ...overrides,
  });
}

function reviewedPoints(
  points: number,
  deductible: number = points,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  const interest = overrides.box1_mortgage_interest;
  return minimalItem({
    ...(typeof interest === "number" && interest > 0 &&
        (overrides.for_routing ?? ForRouting.A) === ForRouting.A
      ? {
        box1_current_year_deductible_interest: interest,
        box1_deduction_workpaper_reference: "reviewed-pub936-interest-2025",
      }
      : {}),
    box6_points_paid: points,
    box6_current_year_deductible_points: deductible,
    box6_deduction_workpaper_reference: "reviewed-pub936-workpaper-2025",
    lender_name: "Reviewed Lender",
    recipient_tin: "111-22-3333",
    source_document_reference: `issued-1098-${points}-${deductible}`,
    ...overrides,
  });
}

function reviewedRecovery(
  refund: number,
  taxable: number,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  const interest = overrides.box1_mortgage_interest;
  return minimalItem({
    ...(typeof interest === "number" && interest > 0 &&
        (overrides.for_routing ?? ForRouting.A) === ForRouting.A
      ? {
        box1_current_year_deductible_interest: interest,
        box1_deduction_workpaper_reference: "reviewed-pub936-interest-2025",
      }
      : {}),
    box4_refund_overpaid: refund,
    box4_prior_year_refund: true,
    box4_taxable_recovery_verified_amount: taxable,
    box4_recovery_workpaper_reference: "reviewed-pub525-recovery-2025",
    lender_name: "Reviewed Lender",
    recipient_tin: "111-22-3333",
    source_document_reference: `issued-1098-recovery-${refund}-${taxable}`,
    ...overrides,
  });
}

function compute(items: unknown[]) {
  return f1098.compute(
    { taxYear: 2025, formType: "f1040" },
    inputSchema.parse({ f1098s: items }),
  );
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// ---------------------------------------------------------------------------
// Section 1: Input Schema Validation
// ---------------------------------------------------------------------------

Deno.test("f1098.schema: empty array accepted — zero items produces empty outputs", () => {
  const result = compute([]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("2025 purchase points and existing acquisition loan share the $750,000 limit", () => {
  const fixture = purchasePointsCrossLoanFixture();
  const source = inputSchema.parse({
    f1098s: fixture.f1098,
    ...fixture.f1098_purchase_points_cross_loan_review,
  });
  const result = f1098.compute({ taxYear: 2025, formType: "f1040" }, source);
  assertEquals(
    fieldsOf(result.outputs, scheduleA)?.line_8a_mortgage_interest_1098,
    21_000,
  );
  assertPurchasePointsCrossLoanSources(
    source,
    ["111223333"],
    true,
    21_000,
    0,
    0,
    false,
    false,
  );
  assertThrows(
    () =>
      assertPurchasePointsCrossLoanSources(
        source,
        ["111223333"],
        true,
        20_999,
        0,
        0,
        false,
        false,
      ),
    Error,
    "exact sourced line 8a",
  );
  const review = fixture.f1098_purchase_points_cross_loan_review
    .purchase_points_cross_loan_review;
  assertEquals(
    inputSchema.safeParse({
      f1098s: fixture.f1098,
      purchase_points_cross_loan_review: {
        ...review,
        existing_loan: {
          ...review.existing_loan,
          maximum_2025_balance: 399_999,
        },
      },
    }).success,
    false,
  );
  assertEquals(
    inputSchema.safeParse({
      f1098s: fixture.f1098,
      purchase_points_cross_loan_review: {
        ...review,
        existing_property_reference: review.purchase_property_reference,
      },
    }).success,
    false,
  );
  assertEquals(
    inputSchema.safeParse({
      f1098s: fixture.f1098,
      purchase_points_cross_loan_review: {
        ...review,
        existing_second_home_review: {
          ...review.existing_second_home_review,
          held_out_for_rent_or_resale: true,
          fair_rental_days: 100,
          personal_use_days: 14,
        },
      },
    }).success,
    false,
  );
  assertEquals(
    inputSchema.safeParse({
      f1098s: fixture.f1098,
      purchase_points_cross_loan_review: {
        ...review,
        existing_second_home_review: {
          ...review.existing_second_home_review,
          held_out_for_rent_or_resale: true,
          fair_rental_days: 100,
          personal_use_days: 15,
        },
      },
    }).success,
    true,
  );
  assertEquals(
    inputSchema.safeParse({
      f1098s: fixture.f1098,
      purchase_points_cross_loan_review: review,
      mortgage_limit_review: { loans: [] },
    }).success,
    false,
  );
});

Deno.test("purchase points and two-loan interest use one over-limit Pub. 936 ratio", () => {
  const fixture = purchasePointsCrossLoanFixture();
  const review = fixture.f1098_purchase_points_cross_loan_review
    .purchase_points_cross_loan_review;
  const cappedReview = {
    ...review,
    existing_loan: {
      ...review.existing_loan,
      maximum_2025_balance: 650_000,
      monthly_balance_records: review.existing_loan.monthly_balance_records.map(
        (row) => ({ ...row, closing_balance: 650_000 }),
      ),
    },
  };
  const f1098s = fixture.f1098.map((item, index) =>
    index === 0
      ? {
        ...item,
        box1_current_year_deductible_interest: 4_734,
        box6_current_year_deductible_points: 2_367,
      }
      : {
        ...item,
        box2_outstanding_principal: 650_000,
        box1_current_year_deductible_interest: 9_468,
      }
  );
  const source = inputSchema.parse({
    f1098s,
    purchase_points_cross_loan_review: cappedReview,
  });
  const result = f1098.compute({ taxYear: 2025, formType: "f1040" }, source);
  assertEquals(
    fieldsOf(result.outputs, scheduleA)?.line_8a_mortgage_interest_1098,
    16_569,
  );
  assertPurchasePointsCrossLoanSources(
    source,
    ["111223333"],
    true,
    16_569,
    0,
    0,
    false,
    false,
  );
  assertEquals(
    inputSchema.safeParse({
      f1098s: [
        { ...f1098s[0], box6_current_year_deductible_points: 2_368 },
        f1098s[1],
      ],
      purchase_points_cross_loan_review: cappedReview,
    }).success,
    false,
  );
  assertEquals(
    inputSchema.safeParse({
      f1098s: [f1098s[0], {
        ...f1098s[1],
        box1_current_year_deductible_interest: 9_469,
      }],
      purchase_points_cross_loan_review: cappedReview,
    }).success,
    false,
  );
});

Deno.test("two full-year post-2017 loans share one Pub. 936 mortgage limit", () => {
  const source = {
    f1098s: [
      reviewedInterest(20_000, 16_660, {
        lender_name: "First Lender",
        recipient_tin: "111-22-3333",
        source_document_reference: "2025 first Form 1098",
        box3_origination_date: "01/15/2020",
        box2_outstanding_principal: 500_000,
      }),
      reviewedInterest(16_000, 13_328, {
        lender_name: "Second Lender",
        recipient_tin: "111-22-3333",
        source_document_reference: "2025 second Form 1098",
        box3_origination_date: "02/15/2021",
        box2_outstanding_principal: 400_000,
      }),
    ],
    mortgage_limit_review: {
      table1_workpaper_reference: "2025 Pub. 936 Table 1 both loans",
      all_qualified_home_mortgages_included_verified: true,
      all_post_2017_acquisition_debt_verified: true,
      single_filing_status_verified: true,
      loans: ([
        ["2025 first Form 1098", 500_000],
        ["2025 second Form 1098", 400_000],
      ] as const).map(([source_document_reference, balance]) => ({
        source_document_reference,
        monthly_balance_records: Array.from({ length: 12 }, (_, index) => ({
          month: index + 1,
          closing_balance: balance,
          lender_statement_reference: `${source_document_reference}-month-${
            index + 1
          }`,
        })),
      })),
    },
  };
  const parsed = inputSchema.parse(source);
  const result = f1098.compute(
    { taxYear: 2025, formType: "f1040" },
    parsed,
  );
  assertEquals(
    fieldsOf(result.outputs, scheduleA)?.line_8a_mortgage_interest_1098,
    29_988,
  );
  assertForm1098MortgageLimitSources(
    source,
    ["111223333"],
    FilingStatus.Single,
    29_988,
    0,
    0,
    false,
    false,
  );
  assertThrows(
    () =>
      assertForm1098MortgageLimitSources(
        { f1098s: source.f1098s },
        ["111223333"],
        FilingStatus.Single,
        29_988,
        0,
        0,
        false,
        false,
      ),
    Error,
    "post-2017 mortgage debt over $750,000",
  );
  assertThrows(
    () =>
      assertForm1098MortgageLimitSources(
        { f1098s: source.f1098s },
        ["111223333"],
        FilingStatus.MarriedFilingJointly,
        29_988,
        0,
        0,
        false,
        false,
      ),
    Error,
    "post-2017 mortgage debt over $750,000",
  );
  assertThrows(
    () =>
      assertForm1098MortgageLimitSources(
        { f1098s: source.f1098s },
        ["111223333"],
        FilingStatus.MarriedFilingSeparately,
        29_988,
        0,
        0,
        false,
        false,
      ),
    Error,
    "post-2017 mortgage debt over $375,000",
  );
  assertThrows(
    () =>
      assertForm1098MortgageLimitSources(
        {
          f1098s: [
            source.f1098s[0],
            { ...source.f1098s[1], box1_current_year_deductible_interest: 0 },
          ],
        },
        ["111223333"],
        FilingStatus.Single,
        16_660,
        0,
        0,
        false,
        false,
      ),
    Error,
    "post-2017 mortgage debt over $750,000",
  );
  assertForm1098MortgageLimitSources(
    {
      f1098s: source.f1098s.map((item) => ({
        ...item,
        box1_current_year_deductible_interest: 0,
      })),
    },
    ["111223333"],
    FilingStatus.Single,
    0,
    0,
    0,
    false,
    false,
  );
  assertEquals(
    inputSchema.safeParse({
      ...source,
      f1098s: [
        source.f1098s[0],
        { ...source.f1098s[1], box1_current_year_deductible_interest: 16_000 },
      ],
    }).success,
    false,
  );
  assertThrows(
    () =>
      assertForm1098MortgageLimitSources(
        source,
        ["111223333"],
        FilingStatus.MarriedFilingJointly,
        29_988,
        0,
        0,
        false,
        false,
      ),
    Error,
    "verified filing status",
  );
  assertThrows(
    () =>
      assertForm1098MortgageLimitSources(
        source,
        ["111223333"],
        FilingStatus.Single,
        29_988,
        0,
        1,
        true,
        false,
      ),
    Error,
    "no other mortgage-interest",
  );
  assertThrows(
    () =>
      assertForm1098MortgageLimitSources(
        source,
        ["111223333"],
        FilingStatus.Single,
        29_988,
        0,
        0,
        false,
        true,
      ),
    Error,
    "no other mortgage-interest",
  );
});

Deno.test("2025 purchase mortgage needs closing and month-by-month limit evidence", () => {
  const source = {
    f1098s: [reviewedInterest(1_000, 833, {
      lender_name: "Purchase Lender",
      recipient_tin: "111-22-3333",
      source_document_reference: "2025 purchase Form 1098",
      box2_outstanding_principal: 900_000,
      box3_origination_date: "07/15/2025",
    })],
    mortgage_limit_review: {
      table1_workpaper_reference: "2025 Pub. 936 purchase Table 1",
      all_qualified_home_mortgages_included_verified: true,
      all_post_2017_acquisition_debt_verified: true,
      single_filing_status_verified: true,
      loans: [{
        source_document_reference: "2025 purchase Form 1098",
        property_reference: "new-principal-residence",
        purchase_closing_disclosure_reference:
          "2025 purchase closing disclosure",
        principal_residence_purchase_verified: true,
        no_additional_advances_verified: true,
        monthly_balance_records: Array.from({ length: 12 }, (_, index) => ({
          month: index + 1,
          closing_balance: index < 6 ? 0 : 900_000,
          lender_statement_reference: `purchase month ${index + 1}`,
        })),
      }],
    },
  };
  assertEquals(inputSchema.safeParse(source).success, true);
  assertForm1098MortgageLimitSources(
    source,
    ["111223333"],
    FilingStatus.Single,
    833,
    0,
    0,
    false,
    false,
  );
  assertThrows(
    () =>
      assertForm1098MortgageLimitSources(
        {
          f1098s: [{
            ...source.f1098s[0],
            box2_outstanding_principal: undefined,
          }],
        },
        ["111223333"],
        FilingStatus.Single,
        833,
        0,
        0,
        false,
        false,
      ),
    Error,
    "needs its issued box 2 principal",
  );
  assertForm1098MortgageLimitSources(
    {
      f1098s: [{
        ...source.f1098s[0],
        box2_outstanding_principal: undefined,
        box1_current_year_deductible_interest: 0,
      }, reviewedInterest(500, 500)],
    },
    ["111223333"],
    FilingStatus.Single,
    500,
    0,
    0,
    false,
    false,
  );
  const loan = source.mortgage_limit_review.loans[0];
  assertEquals(
    inputSchema.safeParse({
      ...source,
      mortgage_limit_review: {
        ...source.mortgage_limit_review,
        loans: [{ ...loan, purchase_closing_disclosure_reference: undefined }],
      },
    }).success,
    false,
  );
  assertEquals(
    inputSchema.safeParse({
      ...source,
      mortgage_limit_review: {
        ...source.mortgage_limit_review,
        loans: [{
          ...loan,
          monthly_balance_records: [
            { ...loan.monthly_balance_records[0], closing_balance: 900_000 },
            ...loan.monthly_balance_records.slice(1),
          ],
        }],
      },
    }).success,
    false,
  );
  assertEquals(
    inputSchema.safeParse({
      ...source,
      f1098s: [{
        ...source.f1098s[0],
        box1_current_year_deductible_interest: 1_000,
      }],
    }).success,
    false,
  );
});

Deno.test("2025 purchase plus existing mortgage needs one qualified second home", () => {
  const purchaseRef = "2025 principal residence Form 1098";
  const secondRef = "2025 prior home Form 1098";
  const balances = (reference: string, firstMonth: number) =>
    Array.from({ length: 12 }, (_, index) => ({
      month: index + 1,
      closing_balance: index + 1 < firstMonth ? 0 : 500_000,
      lender_statement_reference: `${reference} month ${index + 1}`,
    }));
  const secondHomeReview = {
    occupancy_record_reference: "2025 second-home occupancy ledger",
    qualified_second_home_election_verified: true,
    held_out_for_rent_or_resale: true,
    fair_rental_days: 100,
    personal_use_days: 15,
  };
  const source = {
    f1098s: [
      reviewedInterest(1_000, 750, {
        lender_name: "Purchase Lender",
        recipient_tin: "111-22-3333",
        source_document_reference: purchaseRef,
        box2_outstanding_principal: 500_000,
        box3_origination_date: "07/15/2025",
      }),
      reviewedInterest(1_000, 750, {
        lender_name: "Prior Home Lender",
        recipient_tin: "111-22-3333",
        source_document_reference: secondRef,
        box2_outstanding_principal: 500_000,
        box3_origination_date: "01/15/2020",
      }),
    ],
    mortgage_limit_review: {
      table1_workpaper_reference: "2025 both homes Pub. 936 Table 1",
      all_qualified_home_mortgages_included_verified: true,
      all_post_2017_acquisition_debt_verified: true,
      single_filing_status_verified: true,
      loans: [{
        source_document_reference: purchaseRef,
        property_reference: "new-principal-residence",
        purchase_closing_disclosure_reference: "2025 purchase closing",
        principal_residence_purchase_verified: true,
        no_additional_advances_verified: true,
        monthly_balance_records: balances(purchaseRef, 7),
      }, {
        source_document_reference: secondRef,
        property_reference: "former-main-home",
        second_home_review: secondHomeReview,
        monthly_balance_records: balances(secondRef, 1),
      }],
    },
  };
  assertThrows(
    () =>
      assertForm1098MortgageLimitSources(
        {
          f1098s: source.f1098s.map((item) => ({
            ...item,
            box2_outstanding_principal: 300_000,
          })),
        },
        ["111223333"],
        FilingStatus.Single,
        1_500,
        0,
        0,
        false,
        false,
      ),
    Error,
    "purchase plus existing mortgage needs one qualified-home",
  );
  assertEquals(inputSchema.safeParse(source).success, true);
  assertForm1098MortgageLimitSources(
    source,
    ["111223333"],
    FilingStatus.Single,
    1_500,
    0,
    0,
    false,
    false,
  );
  const [purchase, second] = source.mortgage_limit_review.loans;
  assertEquals(
    inputSchema.safeParse({
      ...source,
      mortgage_limit_review: {
        ...source.mortgage_limit_review,
        loans: [purchase, {
          ...second,
          second_home_review: {
            ...secondHomeReview,
            personal_use_days: 14,
          },
        }],
      },
    }).success,
    false,
  );
  assertEquals(
    inputSchema.safeParse({
      ...source,
      mortgage_limit_review: {
        ...source.mortgage_limit_review,
        loans: [purchase, {
          ...second,
          second_home_review: {
            ...secondHomeReview,
            personal_use_days: 300,
          },
        }],
      },
    }).success,
    false,
  );
  assertEquals(
    inputSchema.safeParse({
      ...source,
      mortgage_limit_review: {
        ...source.mortgage_limit_review,
        loans: [purchase, {
          ...second,
          property_reference: purchase.property_reference,
        }],
      },
    }).success,
    false,
  );
});

Deno.test("f1098.schema: missing box1_mortgage_interest throws", () => {
  assertThrows(() => compute([{ for_routing: ForRouting.A }]), Error);
});

Deno.test("f1098.schema: negative box1_mortgage_interest throws", () => {
  assertThrows(
    () => compute([minimalItem({ box1_mortgage_interest: -1 })]),
    Error,
  );
});

Deno.test("f1098.schema: invalid for_routing value throws", () => {
  assertThrows(() => compute([minimalItem({ for_routing: "B" })]), Error);
});

Deno.test("f1098.schema: missing for_routing defaults to Schedule A routing", () => {
  // Per implementation: for_routing ?? ForRouting.A — defaults to A
  const result = compute([
    reviewedInterest(5_000, 5_000, { for_routing: undefined }),
  ]);
  const fields = fieldsOf(result.outputs, scheduleA);
  assertEquals(fields?.line_8a_mortgage_interest_1098, 5_000);
});

// ---------------------------------------------------------------------------
// Section 2: Schedule A — mortgage interest routing
// ---------------------------------------------------------------------------

Deno.test("f1098.compute: box1 with for_routing=A routes to schedule_a line_8a", () => {
  const result = compute([reviewedInterest(12_000)]);
  const fields = fieldsOf(result.outputs, scheduleA)!;
  assertEquals(fields.line_8a_mortgage_interest_1098, 12_000);
});

Deno.test("f1098.compute: reviewed partial box1 deduction excludes prepaid or limited interest", () => {
  const result = compute([reviewedInterest(12_000, 7_500)]);
  assertEquals(
    fieldsOf(result.outputs, scheduleA)!.line_8a_mortgage_interest_1098,
    7_500,
  );
});

Deno.test("f1098.compute: positive personal box1 without Pub. 936 workpaper fails closed", () => {
  assertThrows(
    () => compute([minimalItem({ box1_mortgage_interest: 12_000 })]),
    Error,
    "needs reviewed TY2025 Schedule A deductible interest",
  );
});

Deno.test("f1098.compute: box1 deduction cannot exceed source amount or omit workpaper reference", () => {
  assertThrows(() => compute([reviewedInterest(12_000, 12_001)]), Error);
  assertThrows(
    () =>
      compute([
        reviewedInterest(12_000, 7_500, {
          box1_deduction_workpaper_reference: undefined,
        }),
      ]),
    Error,
  );
});

Deno.test("f1098.compute: reviewed zero box1 deduction creates no Schedule A interest", () => {
  const result = compute([reviewedInterest(12_000, 0)]);
  assertEquals(fieldsOf(result.outputs, scheduleA), undefined);
});

Deno.test("f1098.compute: box1=0 with for_routing=A produces no schedule_a output", () => {
  const result = compute([minimalItem({ box1_mortgage_interest: 0 })]);
  assertEquals(findOutput(result, "schedule_a"), undefined);
});

Deno.test("f1098.compute: box4 prior-year recovery does not reduce current box1 interest", () => {
  const result = compute([
    reviewedRecovery(1_500, 1_500, { box1_mortgage_interest: 10_000 }),
  ]);
  assertEquals(
    fieldsOf(result.outputs, scheduleA)!.line_8a_mortgage_interest_1098,
    10_000,
  );
});

Deno.test("f1098.compute: box4 equal to box1 still leaves current interest deductible", () => {
  const result = compute([
    reviewedRecovery(5_000, 0, { box1_mortgage_interest: 5_000 }),
  ]);
  assertEquals(
    fieldsOf(result.outputs, scheduleA)!.line_8a_mortgage_interest_1098,
    5_000,
  );
});

Deno.test("f1098.compute: reviewed zero-tax-benefit recovery creates no income", () => {
  const result = compute([
    reviewedRecovery(2_000, 0, { box1_mortgage_interest: 10_000 }),
  ]);
  const fields = fieldsOf(result.outputs, scheduleA)!;
  assertEquals(fields.line_8a_mortgage_interest_1098, 10_000);
  assertEquals(fieldsOf(result.outputs, schedule1), undefined);
  assertEquals(findOutput(result, "agi_aggregator"), undefined);
});

Deno.test("f1098.compute: reviewed taxable box4 recovery routes to Schedule 1 and AGI", () => {
  const result = compute([
    reviewedRecovery(2_000, 1_200, { box1_mortgage_interest: 10_000 }),
  ]);
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line8z_f1098_interest_recovery, 1_200);
  assertEquals(
    (findOutput(result, "agi_aggregator")!.fields as Record<string, unknown>)
      .line8z_f1098_interest_recovery,
    1_200,
  );
});

Deno.test("f1098.compute: positive box4 without prior-year tax-benefit workpaper is rejected", () => {
  assertThrows(
    () => compute([minimalItem({ box4_refund_overpaid: 200 })]),
    Error,
  );
});

Deno.test("f1098.compute: box4 same-year designation is rejected", () => {
  assertThrows(
    () =>
      compute([reviewedRecovery(200, 200, { box4_prior_year_refund: false })]),
    Error,
  );
});

Deno.test("f1098.compute: positive box4 needs identified lender, recipient, and payer copy", () => {
  for (
    const missing of [
      "lender_name",
      "recipient_tin",
      "source_document_reference",
    ]
  ) {
    assertThrows(
      () => compute([reviewedRecovery(200, 100, { [missing]: undefined })]),
      Error,
    );
  }
});

Deno.test("f1098 box4 filing reconciles payer recipient and taxable recovery", () => {
  const source = {
    f1098s: [{
      ...reviewedRecovery(2_000, 1_200),
      // Source assertion checks presence; final builders verify exact PDF bytes.
      issuer_copy: {
        file_name: "Test1098.pdf",
        pdf_sha256: "0".repeat(64),
        bytes: new Uint8Array(),
      },
    }],
  };
  assertForm1098Box4Sources(source, ["111223333"], 1_200);
  assertThrows(
    () =>
      assertForm1098Box4Sources(
        { f1098s: [reviewedRecovery(2_000, 1_200)] },
        ["111223333"],
        1_200,
      ),
    Error,
    "needs the reviewed issuer Copy B",
  );
  assertThrows(
    () => assertForm1098Box4Sources(source, ["999887777"], 1_200),
    Error,
    "recipient must match",
  );
  assertThrows(
    () => assertForm1098Box4Sources(source, ["111223333"], 1_199),
    Error,
    "must match sourced taxable recovery",
  );
  assertThrows(
    () => assertForm1098Box4Sources(undefined, ["111223333"], 1_200),
    Error,
    "needs payer source rows",
  );
});

Deno.test("f1098.compute: box4 taxable recovery above refund is rejected", () => {
  assertThrows(() => compute([reviewedRecovery(200, 201)]), Error);
});

Deno.test("f1098.compute: box4 rental recovery does not enter personal Schedule 1 route", () => {
  assertThrows(
    () => compute([reviewedRecovery(200, 100, { for_routing: ForRouting.E })]),
    Error,
  );
});

Deno.test("f1098.compute: reviewed deductible box6 points route to Schedule A line 8a", () => {
  const result = compute([
    reviewedPoints(2_000),
  ]);
  const fields = fieldsOf(result.outputs, scheduleA)!;
  assertEquals(fields.line_8a_mortgage_interest_1098, 2_000);
  assertEquals(fields.line_8c_points_no_1098, undefined);
});

Deno.test("f1098.compute: box1 + box6 both route to schedule_a in single output", () => {
  const result = compute([
    reviewedPoints(3_000, 3_000, { box1_mortgage_interest: 15_000 }),
  ]);
  const schedAOutputs = result.outputs.filter((o) =>
    o.nodeType === "schedule_a"
  );
  assertEquals(schedAOutputs.length, 1);
  const fields = fieldsOf(result.outputs, scheduleA)!;
  assertEquals(fields.line_8a_mortgage_interest_1098, 18_000);
  assertEquals(fields.line_8c_points_no_1098, undefined);
});

Deno.test("f1098.compute: reviewed partial current-year box6 deduction uses only approved amount", () => {
  const result = compute([reviewedPoints(3_000, 1_200)]);
  const fields = fieldsOf(result.outputs, scheduleA)!;
  assertEquals(fields.line_8a_mortgage_interest_1098, 1_200);
});

Deno.test("f1098.compute: positive box6 without Pub. 936 workpaper is rejected", () => {
  assertThrows(
    () => compute([minimalItem({ box6_points_paid: 2_000 })]),
    Error,
  );
});

Deno.test("f1098.compute: box6 deduction above reported amount is rejected", () => {
  assertThrows(() => compute([reviewedPoints(2_000, 2_001)]), Error);
});

Deno.test("f1098.compute: box6 deduction without workpaper reference is rejected", () => {
  assertThrows(() =>
    compute([minimalItem({
      box6_points_paid: 2_000,
      box6_current_year_deductible_points: 2_000,
    })]), Error);
});

Deno.test("f1098.compute: box6 refinance claim is rejected pending amortization facts", () => {
  assertThrows(
    () => compute([reviewedPoints(2_000, 2_000, { refinance: true })]),
    Error,
  );
});

Deno.test("f1098.compute: construction refinance box6 points amortize by 2025 payments", () => {
  const source = reviewedPoints(2_000, 0, {
    refinance: true,
    box6_current_year_deductible_points: undefined,
    box6_construction_refinance_review: {
      construction_loan_record_reference: "2025 original construction loan",
      closing_disclosure_reference: "2025 construction refinance closing",
      original_construction_debt: 100_000,
      refinanced_principal: 100_000,
      loan_term_months: 180,
      monthly_payment_records: [
        { month: 7, document_reference: "payment-july" },
        { month: 8, document_reference: "payment-august" },
        { month: 9, document_reference: "payment-september" },
        { month: 10, document_reference: "payment-october" },
        { month: 11, document_reference: "payment-november" },
        { month: 12, document_reference: "payment-december" },
      ],
      principal_residence_when_complete_verified: true,
      points_paid_directly_verified: true,
      reportable_points_within_acquisition_limit_verified: true,
    },
  });
  const result = compute([source]);
  assertEquals(
    fieldsOf(result.outputs, scheduleA)?.line_8a_mortgage_interest_1098,
    67,
  );
  assertThrows(
    () =>
      compute([{
        ...source,
        box6_construction_refinance_review: {
          ...(source.box6_construction_refinance_review as Record<
            string,
            unknown
          >),
          monthly_payment_records: [{
            month: 7,
            document_reference: "payment-july",
          }],
        },
      }]),
    Error,
  );
  assertThrows(
    () =>
      compute([{
        ...source,
        box6_current_year_deductible_points: 2_000,
      }]),
    Error,
  );
});

Deno.test("f1098.compute: reviewed zero current-year box6 deduction creates no Schedule A points", () => {
  const result = compute([reviewedPoints(2_000, 0)]);
  assertEquals(fieldsOf(result.outputs, scheduleA), undefined);
});

Deno.test("f1098.compute: box5 MIP is not deductible for TY2025 — no MIP field in any output", () => {
  const result = compute([
    reviewedInterest(10_000, 10_000, { box5_mip: 1_200 }),
  ]);
  const mipOut = result.outputs.find(
    (o) => JSON.stringify(o.fields).toLowerCase().includes("mip"),
  );
  assertEquals(mipOut, undefined);
  // Interest still routes normally
  const fields = fieldsOf(result.outputs, scheduleA)!;
  assertEquals(fields.line_8a_mortgage_interest_1098, 10_000);
});

// ---------------------------------------------------------------------------
// Section 3: Other routing destinations
// ---------------------------------------------------------------------------

Deno.test("f1098.compute: rental box1 without property-linked current-year workpaper fails closed", () => {
  assertThrows(
    () =>
      compute([
        minimalItem({
          box1_mortgage_interest: 8_000,
          for_routing: ForRouting.E,
        }),
      ]),
    Error,
    "needs a business/property-linked current-year interest",
  );
});

Deno.test("f1098.compute: rental box1 cannot use a personal Schedule A workpaper", () => {
  assertThrows(() =>
    compute([
      reviewedInterest(8_000, 6_000, { for_routing: ForRouting.E }),
    ]), Error);
});

Deno.test("f1098.compute: zero rental box1 produces no Schedule A output", () => {
  const result = compute([
    minimalItem({ box1_mortgage_interest: 0, for_routing: ForRouting.E }),
  ]);
  assertEquals(findOutput(result, "schedule_a"), undefined);
});

Deno.test("f1098.compute: business box1 without business-linked current-year workpaper fails closed", () => {
  assertThrows(
    () =>
      compute([
        minimalItem({
          box1_mortgage_interest: 6_000,
          for_routing: ForRouting.C,
        }),
      ]),
    Error,
    "needs a business/property-linked current-year interest",
  );
});

Deno.test("f1098.compute: Form 8829 interest needs homeowner allocation facts", () => {
  assertThrows(
    () =>
      compute([
        minimalItem({
          box1_mortgage_interest: 4_000,
          for_routing: ForRouting.F8829,
        }),
      ]),
    Error,
    "needs homeowner interest and Schedule A allocation facts",
  );
});

Deno.test("f1098.compute: box6 with rental routing is rejected rather than dropped", () => {
  assertThrows(() =>
    compute([
      reviewedPoints(1_500, 1_500, {
        box1_mortgage_interest: 5_000,
        for_routing: ForRouting.E,
      }),
    ]), Error);
});

// ---------------------------------------------------------------------------
// Section 4: DEDM override
// ---------------------------------------------------------------------------

Deno.test("f1098.compute: DEDM override without a linked source cannot silently suppress box1", () => {
  assertThrows(
    () =>
      compute([reviewedInterest(15_000, 15_000, {
        box2_outstanding_principal: 900_000,
        dedm_override: true,
      })]),
    Error,
    "DEDM override has no linked deductible-interest source",
  );
});

Deno.test("f1098.compute: box6 with DEDM override is rejected pending allocation", () => {
  assertThrows(
    () => compute([reviewedPoints(2_000, 2_000, { dedm_override: true })]),
    Error,
  );
});

// ---------------------------------------------------------------------------
// Section 5: Multiple 1098s — aggregation
// ---------------------------------------------------------------------------

Deno.test("f1098.compute: two for_routing=A items — box1 amounts sum to schedule_a", () => {
  const result = compute([
    reviewedInterest(9_000),
    reviewedInterest(5_000),
  ]);
  const fields = fieldsOf(result.outputs, scheduleA)!;
  assertEquals(fields.line_8a_mortgage_interest_1098, 14_000);
});

Deno.test("f1098.compute: two box4 recoveries do not reduce current interest", () => {
  const result = compute([
    reviewedRecovery(500, 500, { box1_mortgage_interest: 10_000 }),
    reviewedRecovery(200, 100, { box1_mortgage_interest: 8_000 }),
  ]);
  const fields = fieldsOf(result.outputs, scheduleA)!;
  assertEquals(fields.line_8a_mortgage_interest_1098, 18_000);
  assertEquals(
    fieldsOf(result.outputs, schedule1)!.line8z_f1098_interest_recovery,
    600,
  );
});

Deno.test("f1098.compute: two reviewed box6 sources aggregate on Schedule A line 8a", () => {
  const result = compute([
    reviewedPoints(1_000),
    reviewedPoints(1_500),
  ]);
  const fields = fieldsOf(result.outputs, scheduleA)!;
  assertEquals(fields.line_8a_mortgage_interest_1098, 2_500);
  assertEquals(fields.line_8c_points_no_1098, undefined);
});

Deno.test("f1098.compute: positive box6 needs identified lender and recipient", () => {
  assertThrows(
    () => compute([reviewedPoints(1_000, 1_000, { lender_name: undefined })]),
    Error,
    "needs lender, recipient TIN",
  );
  assertThrows(
    () => compute([reviewedPoints(1_000, 1_000, { recipient_tin: undefined })]),
    Error,
    "needs lender, recipient TIN",
  );
});

Deno.test("f1098.compute: duplicate payer-issued Form 1098 rejects", () => {
  assertThrows(
    () => compute([reviewedPoints(1_000), reviewedPoints(1_000)]),
    Error,
    "same payer-issued Form 1098",
  );
});

Deno.test("f1098.compute: multiple unreviewed rental box1 sources fail closed", () => {
  assertThrows(() =>
    compute([
      minimalItem({ box1_mortgage_interest: 4_000, for_routing: ForRouting.E }),
      minimalItem({ box1_mortgage_interest: 3_000, for_routing: ForRouting.E }),
    ]), Error);
});

Deno.test("f1098.compute: mixed reviewed personal and unreviewed rental sources fail together", () => {
  assertThrows(() =>
    compute([
      reviewedInterest(6_000),
      minimalItem({ box1_mortgage_interest: 4_000, for_routing: ForRouting.E }),
    ]), Error);
});

Deno.test("f1098.compute: three for_routing=A items all sum — engine accepts any number of 1098s", () => {
  const result = compute([
    reviewedInterest(5_000),
    reviewedInterest(4_000),
    reviewedInterest(3_000),
  ]);
  const fields = fieldsOf(result.outputs, scheduleA)!;
  assertEquals(fields.line_8a_mortgage_interest_1098, 12_000);
});

Deno.test("f1098.compute: multiple prior-year box4 refunds sum on schedule1 line8z", () => {
  const result = compute([
    reviewedRecovery(1_000, 800, { box1_mortgage_interest: 10_000 }),
    reviewedRecovery(500, 300, { box1_mortgage_interest: 8_000 }),
  ]);
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line8z_f1098_interest_recovery, 1_100);
  assertEquals(
    (findOutput(result, "agi_aggregator")!.fields as Record<string, unknown>)
      .line8z_f1098_interest_recovery,
    1_100,
  );
});

Deno.test("f1098.compute: multiple prior-year items produce exactly one schedule1 output", () => {
  const result = compute([
    reviewedRecovery(1_000, 1_000, { box1_mortgage_interest: 10_000 }),
    reviewedRecovery(500, 500, { box1_mortgage_interest: 8_000 }),
  ]);
  const s1Outputs = result.outputs.filter((o) => o.nodeType === "schedule1");
  assertEquals(s1Outputs.length, 1);
});

// ---------------------------------------------------------------------------
// Section 6: Informational fields — output count and routing unchanged
// ---------------------------------------------------------------------------

Deno.test("f1098.compute: box2 outstanding_principal is informational — does not change output count", () => {
  const without = compute([reviewedInterest(8_000)]);
  const withBox2 = compute([
    reviewedInterest(8_000, 8_000, {
      box2_outstanding_principal: 600_000,
    }),
  ]);
  assertEquals(withBox2.outputs.length, without.outputs.length);
});

Deno.test("f1098.compute: box10_other lender free-text does NOT auto-route to real estate tax line", () => {
  const result = compute([
    reviewedInterest(8_000, 8_000, {
      box10_other: "RE taxes paid: $4200",
    }),
  ]);
  const taxOut = result.outputs.find(
    (o) =>
      (o.fields as Record<string, unknown>).line5b_real_estate_tax !==
        undefined,
  );
  assertEquals(taxOut, undefined);
});

Deno.test("f1098.compute: qualified_premiums_checkbox=true has no effect for TY2025", () => {
  const without = compute([
    reviewedInterest(8_000, 8_000, { box5_mip: 900 }),
  ]);
  const withFlag = compute([
    reviewedInterest(8_000, 8_000, {
      box5_mip: 900,
      qualified_premiums_checkbox: true,
    }),
  ]);
  assertEquals(withFlag.outputs.length, without.outputs.length);
  // Still no MIP routing
  const mipOut = withFlag.outputs.find(
    (o) => JSON.stringify(o.fields).toLowerCase().includes("mip"),
  );
  assertEquals(mipOut, undefined);
});

// ---------------------------------------------------------------------------
// Section 7: Smoke test
// ---------------------------------------------------------------------------

Deno.test("f1098.compute: smoke — comprehensive item routes correctly", () => {
  const result = compute([{
    box1_mortgage_interest: 18_000,
    box1_current_year_deductible_interest: 18_000,
    box1_deduction_workpaper_reference: "reviewed-pub936-interest-2025",
    box2_outstanding_principal: 600_000,
    box3_origination_date: "03/15/2022",
    box4_refund_overpaid: 500,
    box4_prior_year_refund: true,
    box4_taxable_recovery_verified_amount: 500,
    box4_recovery_workpaper_reference: "reviewed-pub525-recovery-2025",
    box5_mip: 1_800,
    box6_points_paid: 2_400,
    box6_current_year_deductible_points: 2_400,
    box6_deduction_workpaper_reference: "reviewed-pub936-workpaper-2025",
    lender_name: "Reviewed Lender",
    recipient_tin: "111-22-3333",
    source_document_reference: "issued-1098-complete-case",
    box7_property_address_same: true,
    box9_number_of_properties: 1,
    box10_other: "Homeowner insurance: $1,200",
    qualified_premiums_checkbox: true,
    for_routing: ForRouting.A,
  }]);

  // Current interest 18,000 plus reviewed box 6 points 2,400 → line 8a.
  const schedAFields = fieldsOf(result.outputs, scheduleA)!;
  assertEquals(schedAFields.line_8a_mortgage_interest_1098, 20_400);
  assertEquals(schedAFields.line_8c_points_no_1098, undefined);
  assertEquals(
    fieldsOf(result.outputs, schedule1)!.line8z_f1098_interest_recovery,
    500,
  );
  // Box 5 MIP not deductible TY2025 — no MIP in any output
  const mipOut = result.outputs.find(
    (o) => JSON.stringify(o.fields).toLowerCase().includes("mip"),
  );
  assertEquals(mipOut, undefined);
  // No schedule_e or schedule_c output (all routed to A)
  assertEquals(findOutput(result, "schedule_e"), undefined);
  assertEquals(findOutput(result, "schedule_c"), undefined);
});

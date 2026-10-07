import {
  assert,
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { f1040_2025 } from "./index.ts";
import { buildMefXml } from "./mef/builder.ts";
import { buildPending } from "./mef/pending.ts";
import { buildPdfBytes } from "./pdf/builder.ts";
import { pdfReviewFixtures } from "./pdf/review-fixtures.ts";

const single = pdfReviewFixtures.find((row) => row.id === "single-w2-refund")!;
const joint = pdfReviewFixtures.find((row) => row.id === "joint-two-w2s")!;
const foreign = pdfReviewFixtures.find((row) =>
  row.id === "single-form2555-full-year-physical-presence"
)!;

function withStudentInterest(
  fixture: typeof single,
  wages: readonly number[],
  copies: Array<Record<string, unknown>> = [{
    box1_student_loan_interest: 2_500,
    lender_name: "Example Loan Servicer",
    lender_tin: "12-3456789",
    borrower_tin: "111-22-3333",
    source_document_reference: "issued-1098e-2025",
  }],
) {
  const w2 = (fixture.inputs.w2 as Array<Record<string, unknown>>).map(
    (row, index) => ({ ...row, box1_wages: wages[index] }),
  );
  const result = f1040_2025.executeReturn({
    ...fixture.inputs,
    w2,
    f1098e: copies,
  });
  assertEquals(result.diagnostics, []);
  return buildPending(result.pending);
}

Deno.test("single 1098-E phaseout reaches one Schedule 1 and Form 1040 amount in both exports", async () => {
  const pending = withStudentInterest(single, [90_000]);
  assertEquals(pending.schedule1?.line21_student_loan_interest, 1_667);
  assertEquals(pending.schedule1?.line26_total_adjustments, 1_667);
  assertEquals(pending.f1040?.line10_adjustments, 1_667);
  assertEquals(pending.f1040?.line11_agi, 88_333);
  const xml = buildMefXml(pending, single.filer);
  assertStringIncludes(
    xml,
    "<StudentLoanInterestDedAmt>1667</StudentLoanInterestDedAmt>",
  );
  assertStringIncludes(
    xml,
    "<AdjustedGrossIncomeAmt>88333</AdjustedGrossIncomeAmt>",
  );
  assert((await buildPdfBytes(pending, single.filer)).length > 100_000);

  const changed = {
    ...pending,
    schedule1: {
      ...pending.schedule1,
      line21_student_loan_interest: 2_500,
      line26_total_adjustments: 2_500,
    },
  };
  assertThrows(
    () => buildMefXml(changed, single.filer),
    Error,
    "differs from its retained phaseout calculation",
  );
  await assertRejects(
    () => buildPdfBytes(changed, single.filer),
    Error,
    "differs from its retained phaseout calculation",
  );
});

Deno.test("joint 1098-E uses the TY2025 $170,000 to $200,000 phaseout", () => {
  for (
    const [firstWages, expected] of [
      [128_000, 2_500],
      [143_000, 1_250],
      [158_000, 0],
    ]
  ) {
    const pending = withStudentInterest(joint, [firstWages, 42_000]);
    assertEquals(
      pending.schedule1?.line21_student_loan_interest ?? 0,
      expected,
    );
    assertEquals(pending.f1040?.line10_adjustments ?? 0, expected);
    if (expected === 0) buildMefXml(pending, joint.filer);
  }
});

Deno.test("positive 1098-E needs an issued lender and the filed borrower in both exports", async () => {
  const pending = withStudentInterest(single, [90_000]);
  const issued = pending.f1098e!.f1098es![0];
  for (
    const [changed, message] of [
      [{ ...issued, lender_tin: undefined }, "identified lender"],
      [{ ...issued, borrower_tin: undefined }, "identified lender"],
      [
        { ...issued, source_document_reference: undefined },
        "issued-copy reference",
      ],
      [{ ...issued, borrower_tin: "999-88-7777" }, "borrower must match"],
    ] as const
  ) {
    const altered = {
      ...pending,
      f1098e: { f1098es: [changed] },
    };
    assertThrows(() => buildMefXml(altered, single.filer), Error, message);
    await assertRejects(
      () => buildPdfBytes(altered, single.filer),
      Error,
      message,
    );
  }
});

Deno.test("full-TIN 1098-E checks a supplied borrower name in both exports", async () => {
  for (
    const [fixture, wages, borrowerTin, matchingName, wrongName] of [
      [single, [90_000], "111-22-3333", "Alex Example", "Other Example"],
      [joint, [128_000, 42_000], "444-55-6666", "Sam Example", "Alex Example"],
    ] as const
  ) {
    const pending = withStudentInterest(fixture, wages, [{
      box1_student_loan_interest: 2_500,
      lender_name: "Example Loan Servicer",
      lender_tin: "12-3456789",
      borrower_tin: borrowerTin,
      source_document_reference: "issued-1098e-2025",
    }]);
    const issued = pending.f1098e!.f1098es![0];
    for (
      const borrowerName of [
        undefined,
        matchingName,
        matchingName.toUpperCase(),
      ]
    ) {
      const valid = {
        ...pending,
        f1098e: { f1098es: [{ ...issued, borrower_name: borrowerName }] },
      };
      assertStringIncludes(
        buildMefXml(valid, fixture.filer),
        "StudentLoanInterestDedAmt",
      );
      assert((await buildPdfBytes(valid, fixture.filer)).length > 100_000);
    }
    const conflicting = {
      ...pending,
      f1098e: { f1098es: [{ ...issued, borrower_name: wrongName }] },
    };
    assertThrows(
      () => buildMefXml(conflicting, fixture.filer),
      Error,
      "borrower must match",
    );
    await assertRejects(
      () => buildPdfBytes(conflicting, fixture.filer),
      Error,
      "borrower must match",
    );
  }
});

Deno.test("same-account 1098-E copies with different references reject both exports", async () => {
  const pending = withStudentInterest(single, [90_000]);
  const issued = {
    ...pending.f1098e!.f1098es![0],
    account_number: "loan-1",
  };
  const duplicate = {
    ...pending,
    f1098e: {
      f1098es: [issued, {
        ...issued,
        source_document_reference: "another-issued-reference",
      }],
    },
  };
  const message = "repeats the same lender, borrower, and loan account";
  assertThrows(() => buildMefXml(duplicate, single.filer), Error, message);
  await assertRejects(
    () => buildPdfBytes(duplicate, single.filer),
    Error,
    message,
  );
});

Deno.test("1098-E box 1 and retained AGI source cannot drift at final export", async () => {
  const pending = withStudentInterest(single, [90_000]);
  const changed = {
    ...pending,
    f1098e: {
      f1098es: [{
        ...pending.f1098e!.f1098es![0],
        box1_student_loan_interest: 2_400,
      }],
    },
  };
  const message = "differs from issued copies and payment ledgers";
  assertThrows(() => buildMefXml(changed, single.filer), Error, message);
  await assertRejects(
    () => buildPdfBytes(changed, single.filer),
    Error,
    message,
  );
  assertThrows(
    () => buildMefXml({ ...pending, f1098e: undefined }, single.filer),
    Error,
    "needs a retained source",
  );
});

Deno.test("1098-E final export replays the phaseout from retained AGI inputs", async () => {
  const pending = withStudentInterest(single, [90_000]);
  const altered = {
    ...pending,
    schedule1: {
      ...pending.schedule1,
      line21_student_loan_interest: 1_600,
    },
  };
  const message = "differs from its retained phaseout calculation";
  assertThrows(() => buildMefXml(altered, single.filer), Error, message);
  await assertRejects(
    () => buildPdfBytes(altered, single.filer),
    Error,
    message,
  );
});

Deno.test("joint 1098-E accepts a reviewed masked spouse copy and rejects ambiguous ownership", async () => {
  const masked = {
    box1_student_loan_interest: 2_500,
    lender_name: "Example Loan Servicer",
    lender_tin: "12-3456789",
    borrower_tin: "***-**-6666",
    borrower_name: "Sam Example",
    borrower_owner_review_reference: "reviewed-2025-loan-account",
    source_document_reference: "issued-spouse-1098e-2025",
  };
  const pending = withStudentInterest(joint, [128_000, 42_000], [masked]);
  assertStringIncludes(
    buildMefXml(pending, joint.filer),
    "<StudentLoanInterestDedAmt>2500</StudentLoanInterestDedAmt>",
  );
  assert((await buildPdfBytes(pending, joint.filer)).length > 100_000);

  for (
    const changed of [
      { ...masked, borrower_name: "Other Example" },
      { ...masked, borrower_owner_review_reference: undefined },
      { ...masked, borrower_tin: "***-**-3333" },
    ]
  ) {
    const altered = { ...pending, f1098e: { f1098es: [changed] } };
    assertThrows(
      () => buildMefXml(altered, joint.filer),
      Error,
      "reviewed masked-TIN ownership",
    );
    await assertRejects(
      () => buildPdfBytes(altered, joint.filer),
      Error,
      "reviewed masked-TIN ownership",
    );
  }
});

Deno.test("1098-E rejects one issued copy entered with both masked and full borrower TIN", async () => {
  const masked = {
    box1_student_loan_interest: 1_250,
    lender_name: "Example Loan Servicer",
    lender_tin: "12-3456789",
    borrower_tin: "XXX-XX-3333",
    borrower_name: "Alex Example",
    borrower_owner_review_reference: "reviewed-2025-loan-account",
    source_document_reference: "issued-1098e-2025",
  };
  const full = { ...masked, borrower_tin: "111-22-3333" };
  const pending = withStudentInterest(single, [90_000], [masked, full]);
  assertThrows(
    () => buildMefXml(pending, single.filer),
    Error,
    "repeats the same issued lender statement",
  );
  await assertRejects(
    () => buildPdfBytes(pending, single.filer),
    Error,
    "repeats the same issued lender statement",
  );
});

Deno.test("1098-E rejects same loan with masked and full owner under different references", async () => {
  const masked = {
    box1_student_loan_interest: 1_250,
    lender_name: "Example Loan Servicer",
    lender_tin: "12-3456789",
    borrower_tin: "XXX-XX-3333",
    borrower_name: "Alex Example",
    borrower_owner_review_reference: "reviewed-2025-loan-account",
    account_number: "loan-1",
    source_document_reference: "issued-masked-1098e",
  };
  const full = {
    ...masked,
    borrower_tin: "111-22-3333",
    source_document_reference: "issued-full-1098e",
  };
  const pending = withStudentInterest(single, [90_000], [masked, full]);
  const message = "repeats the same lender, borrower, and loan account";
  assertThrows(() => buildMefXml(pending, single.filer), Error, message);
  await assertRejects(
    () => buildPdfBytes(pending, single.filer),
    Error,
    message,
  );
});

Deno.test("Form 2555 excluded wages stay in student-loan MAGI through both exports", async () => {
  const domesticW2 = (single.inputs.w2 as Array<Record<string, unknown>>)[0];
  const foreign2555 = foreign.inputs.form2555 as Record<string, unknown>;
  const details = foreign2555.filing_details as Record<string, unknown>;
  const result = f1040_2025.executeReturn({
    ...foreign.inputs,
    w2: [{ ...domesticW2, box1_wages: 85_000 }],
    form2555: {
      ...foreign2555,
      filing_details: { ...details, foreign_wages: 5_000 },
    },
    f1098e: [{
      box1_student_loan_interest: 2_500,
      lender_name: "Example Loan Servicer",
      lender_tin: "12-3456789",
      borrower_tin: "111-22-3333",
      source_document_reference: "issued-1098e-foreign-2025",
    }],
  });
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  assertEquals(pending.schedule1?.line21_student_loan_interest, 1_667);
  assertEquals(pending.f1040?.line11_agi, 83_333);
  const xml = buildMefXml(pending, foreign.filer);
  assertStringIncludes(
    xml,
    "<StudentLoanInterestDedAmt>1667</StudentLoanInterestDedAmt>",
  );
  assert((await buildPdfBytes(pending, foreign.filer)).length > 100_000);
});

Deno.test("sub-$600 student-loan payment ledger reaches both exports without Form 1098-E", async () => {
  const ledger = {
    lender_name: "Example Loan Servicer",
    loan_account_number: "student-loan-1",
    borrower_tin: "111-22-3333",
    student_tin: "111-22-3333",
    interest_paid: 450,
    payment_rows: [
      {
        paid_date: "2025-06-01",
        interest_amount: 200,
        source_reference: "2025-lender-payment-june",
      },
      {
        paid_date: "2025-12-01",
        interest_amount: 250,
        source_reference: "2025-lender-payment-december",
      },
    ],
    loan_agreement_reference: "reviewed-qualified-loan-agreement",
    qualified_education_review_reference: "reviewed-qualified-education-costs",
    expense_timing_review_reference: "reviewed-loan-expense-timing",
    eligible_institution_review_reference: "reviewed-eligible-school",
    no_double_benefit_review_reference: "reviewed-no-double-benefit",
    lender_no_form_review_reference: "reviewed-sub-600-lender-ledger",
    legal_obligation_reviewed: true as const,
    half_time_enrollment_at_loan_reviewed: true as const,
    unrelated_lender_reviewed: true as const,
    not_employer_plan_reviewed: true as const,
  };
  const result = f1040_2025.executeReturn({
    ...single.inputs,
    student_loan_interest_records: { unreported_interest_records: [ledger] },
  });
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  assertEquals(pending.schedule1?.line21_student_loan_interest, 450);
  assertEquals(pending.f1040?.line10_adjustments, 450);
  assertStringIncludes(
    buildMefXml(pending, single.filer),
    "<StudentLoanInterestDedAmt>450</StudentLoanInterestDedAmt>",
  );
  assert((await buildPdfBytes(pending, single.filer)).length > 100_000);

  const changed = {
    ...pending,
    f1098e: {
      ...pending.f1098e,
      unreported_interest_records: [{ ...ledger, interest_paid: 451 }],
    },
  };
  assertThrows(() => buildMefXml(changed, single.filer), Error);
  await assertRejects(() => buildPdfBytes(changed, single.filer), Error);

  const anotherLoan = {
    ...ledger,
    loan_account_number: "student-loan-2",
    interest_paid: 200,
    payment_rows: [{
      paid_date: "2025-09-01",
      interest_amount: 200,
      source_reference: "2025-lender-payment-september-loan-2",
    }],
  };
  const threshold = {
    ...pending,
    f1098e: {
      unreported_interest_records: [ledger, anotherLoan],
    },
  };
  assertThrows(
    () => buildMefXml(threshold, single.filer),
    Error,
    "reaches the Form 1098-E reporting threshold",
  );
  await assertRejects(
    () => buildPdfBytes(threshold, single.filer),
    Error,
    "reaches the Form 1098-E reporting threshold",
  );

  const repeatedPayment = {
    ...pending,
    f1098e: {
      unreported_interest_records: [ledger, {
        ...anotherLoan,
        interest_paid: 100,
        payment_rows: [{
          paid_date: "2025-09-01",
          interest_amount: 100,
          source_reference: ledger.payment_rows[0].source_reference,
        }],
      }],
    },
  };
  assertThrows(
    () => buildMefXml(repeatedPayment, single.filer),
    Error,
    "repeats a payment source",
  );
  await assertRejects(
    () => buildPdfBytes(repeatedPayment, single.filer),
    Error,
    "repeats a payment source",
  );

  const wrongOwner = {
    ...pending,
    f1098e: {
      unreported_interest_records: [{
        ...ledger,
        borrower_tin: "999-88-7777",
        student_tin: "999-88-7777",
      }],
    },
  };
  assertThrows(
    () => buildMefXml(wrongOwner, single.filer),
    Error,
    "borrower must match",
  );
  await assertRejects(
    () => buildPdfBytes(wrongOwner, single.filer),
    Error,
    "borrower must match",
  );

  const overlap = {
    ...pending,
    f1098e: {
      f1098es: [{
        box1_student_loan_interest: 450,
        lender_name: ledger.lender_name,
        lender_tin: "12-3456789",
        borrower_tin: ledger.borrower_tin,
        source_document_reference: "issued-1098e-overlap",
      }],
      unreported_interest_records: [ledger],
    },
  };
  assertThrows(
    () => buildMefXml(overlap, single.filer),
    Error,
    "overlaps an issued Form 1098-E lender copy",
  );
  await assertRejects(
    () => buildPdfBytes(overlap, single.filer),
    Error,
    "overlaps an issued Form 1098-E lender copy",
  );
});

Deno.test("separate 1098-E and sub-threshold lender ledgers combine once", async () => {
  const ledger = {
    lender_name: "Second Loan Servicer",
    loan_account_number: "second-loan-1",
    borrower_tin: "111-22-3333",
    student_tin: "111-22-3333",
    interest_paid: 400,
    payment_rows: [{
      paid_date: "2025-12-01",
      interest_amount: 400,
      source_reference: "2025-second-lender-interest",
    }],
    loan_agreement_reference: "reviewed-second-loan-agreement",
    qualified_education_review_reference: "reviewed-second-loan-costs",
    expense_timing_review_reference: "reviewed-second-loan-expense-timing",
    eligible_institution_review_reference: "reviewed-second-loan-school",
    no_double_benefit_review_reference: "reviewed-second-loan-benefits",
    lender_no_form_review_reference: "reviewed-second-lender-no-form",
    legal_obligation_reviewed: true as const,
    half_time_enrollment_at_loan_reviewed: true as const,
    unrelated_lender_reviewed: true as const,
    not_employer_plan_reviewed: true as const,
  };
  const result = f1040_2025.executeReturn({
    ...single.inputs,
    f1098e: [{
      box1_student_loan_interest: 600,
      lender_name: "First Loan Servicer",
      lender_tin: "12-3456789",
      borrower_tin: "111-22-3333",
      source_document_reference: "issued-first-lender-1098e",
    }],
    student_loan_interest_records: { unreported_interest_records: [ledger] },
  });
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  assertEquals(pending.schedule1?.line21_student_loan_interest, 1_000);
  assertStringIncludes(
    buildMefXml(pending, single.filer),
    "<StudentLoanInterestDedAmt>1000</StudentLoanInterestDedAmt>",
  );
  assert((await buildPdfBytes(pending, single.filer)).length > 100_000);
});

Deno.test("reviewed corrected 1098-E uses only the replacement amount", async () => {
  const corrected = {
    box1_student_loan_interest: 900,
    lender_name: "Example Loan Servicer",
    lender_tin: "12-3456789",
    borrower_tin: "111-22-3333",
    source_document_reference: "corrected-2025-1098e",
    corrected: true,
    corrects_source_document_reference: "original-2025-1098e",
    correction_review_reference: "reviewed-2025-lender-correction",
  };
  const pending = withStudentInterest(single, [90_000], [corrected]);
  assertEquals(pending.schedule1?.line21_student_loan_interest, 600);
  assertStringIncludes(
    buildMefXml(pending, single.filer),
    "<StudentLoanInterestDedAmt>600</StudentLoanInterestDedAmt>",
  );
  assert((await buildPdfBytes(pending, single.filer)).length > 100_000);

  const superseded = {
    ...corrected,
    box1_student_loan_interest: 800,
    source_document_reference: "original-2025-1098e",
    corrected: false,
    corrects_source_document_reference: undefined,
    correction_review_reference: undefined,
  };
  const doubleCounted = {
    ...pending,
    f1098e: { f1098es: [superseded, corrected] },
  };
  const message = "cannot include its superseded original";
  assertThrows(() => buildMefXml(doubleCounted, single.filer), Error, message);
  await assertRejects(
    () => buildPdfBytes(doubleCounted, single.filer),
    Error,
    message,
  );
});

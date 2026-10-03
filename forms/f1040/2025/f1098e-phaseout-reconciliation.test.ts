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
  const issued = pending.f1098e!.f1098es[0];
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

Deno.test("1098-E box 1 and retained AGI source cannot drift at final export", async () => {
  const pending = withStudentInterest(single, [90_000]);
  const changed = {
    ...pending,
    f1098e: {
      f1098es: [{
        ...pending.f1098e!.f1098es[0],
        box1_student_loan_interest: 2_400,
      }],
    },
  };
  const message = "differs from issued Form 1098-E box 1";
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

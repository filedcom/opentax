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
) {
  const w2 = (fixture.inputs.w2 as Array<Record<string, unknown>>).map(
    (row, index) => ({ ...row, box1_wages: wages[index] }),
  );
  const result = f1040_2025.executeReturn({
    ...fixture.inputs,
    w2,
    f1098e: [{
      box1_student_loan_interest: 2_500,
      lender_name: "Example Loan Servicer",
    }],
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
    "Form 1040 line 10 differs from its attached Schedule",
  );
  await assertRejects(
    () => buildPdfBytes(changed, single.filer),
    Error,
    "Form 1040 line 10 differs from its attached Schedule",
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
  }
});

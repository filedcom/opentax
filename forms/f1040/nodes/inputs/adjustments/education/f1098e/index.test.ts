import { assertEquals } from "@std/assert";
import { f1098e, inputSchema } from "./index.ts";
import { fieldsOf } from "../../../../../../../core/test-utils/output.ts";
import { schedule1 } from "../../../../outputs/general/return-assembly/schedule1/index.ts";
import { agi_aggregator } from "../../../../intermediate/aggregation/general/return-assembly/agi_aggregator/index.ts";

function minimalItem(overrides: Record<string, unknown> = {}) {
  return { box1_student_loan_interest: 0, ...overrides };
}

function compute(items: ReturnType<typeof minimalItem>[]) {
  return f1098e.compute({ taxYear: 2025, formType: "f1040" }, {
    f1098es: items,
  });
}

// =============================================================================
// 1. Input Schema Validation
// =============================================================================

Deno.test("f1098e.inputSchema: valid minimal item passes", () => {
  const parsed = f1098e.inputSchema.safeParse({
    f1098es: [{ box1_student_loan_interest: 1200 }],
  });
  assertEquals(parsed.success, true);
});

Deno.test("f1098e.inputSchema: empty array fails (min 1)", () => {
  const parsed = f1098e.inputSchema.safeParse({ f1098es: [] });
  assertEquals(parsed.success, false);
});

Deno.test("f1098e.inputSchema: negative box1 fails", () => {
  const parsed = f1098e.inputSchema.safeParse({
    f1098es: [{ box1_student_loan_interest: -100 }],
  });
  assertEquals(parsed.success, false);
});

Deno.test("f1098e.inputSchema: optional lender_name passes", () => {
  const parsed = f1098e.inputSchema.safeParse({
    f1098es: [{ box1_student_loan_interest: 500, lender_name: "Navient" }],
  });
  assertEquals(parsed.success, true);
});

Deno.test("f1098e.inputSchema: zero interest passes", () => {
  const parsed = f1098e.inputSchema.safeParse({
    f1098es: [{ box1_student_loan_interest: 0 }],
  });
  assertEquals(parsed.success, true);
});

// =============================================================================
// 2. Routing — Schedule 1 and AGI Aggregator
// =============================================================================

Deno.test("f1098e.compute: raw interest waits for finalized Schedule 1 phaseout", () => {
  const result = compute([minimalItem({ box1_student_loan_interest: 1500 })]);
  assertEquals(fieldsOf(result.outputs, schedule1), undefined);
});

Deno.test("f1098e.compute: interest below cap routes to AGI before line 21", () => {
  const result = compute([minimalItem({ box1_student_loan_interest: 1500 })]);
  const fields = fieldsOf(result.outputs, agi_aggregator)!;
  assertEquals(fields.line21_student_loan_interest, 1500);
});

Deno.test("f1098e.compute: interest above $2,500 cap awaits MAGI phaseout", () => {
  const result = compute([minimalItem({ box1_student_loan_interest: 3000 })]);
  assertEquals(fieldsOf(result.outputs, schedule1), undefined);
});

Deno.test("f1098e.compute: interest above $2,500 cap — capped at 2500 on agi_aggregator", () => {
  const result = compute([minimalItem({ box1_student_loan_interest: 3000 })]);
  const fields = fieldsOf(result.outputs, agi_aggregator)!;
  assertEquals(fields.line21_student_loan_interest, 2500);
});

Deno.test("f1098e.compute: exactly at $2,500 cap passes through unchanged", () => {
  const result = compute([minimalItem({ box1_student_loan_interest: 2500 })]);
  const fields = fieldsOf(result.outputs, agi_aggregator)!;
  assertEquals(fields.line21_student_loan_interest, 2500);
});

// =============================================================================
// 3. Zero / No Output
// =============================================================================

Deno.test("f1098e.compute: zero interest — no outputs", () => {
  const result = compute([minimalItem({ box1_student_loan_interest: 0 })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("f1098e.compute: all zero items — no outputs", () => {
  const result = compute([
    minimalItem({ box1_student_loan_interest: 0 }),
    minimalItem({ box1_student_loan_interest: 0 }),
  ]);
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 4. Multiple 1098-E Forms
// =============================================================================

Deno.test("f1098e.compute: multiple forms — interest summed before phaseout", () => {
  const result = compute([
    minimalItem({ box1_student_loan_interest: 800 }),
    minimalItem({ box1_student_loan_interest: 700 }),
  ]);
  const fields = fieldsOf(result.outputs, agi_aggregator)!;
  assertEquals(fields.line21_student_loan_interest, 1500);
});

Deno.test("f1098e.compute: multiple forms — sum capped at $2,500", () => {
  const result = compute([
    minimalItem({ box1_student_loan_interest: 1500 }),
    minimalItem({ box1_student_loan_interest: 1500 }),
  ]);
  const fields = fieldsOf(result.outputs, agi_aggregator)!;
  assertEquals(fields.line21_student_loan_interest, 2500);
});

Deno.test("f1098e.compute: multiple forms — no premature schedule1 output", () => {
  const result = compute([
    minimalItem({ box1_student_loan_interest: 600 }),
    minimalItem({ box1_student_loan_interest: 800 }),
  ]);
  const s1Outputs = result.outputs.filter((o: { nodeType: string }) =>
    o.nodeType === "schedule1"
  );
  assertEquals(s1Outputs.length, 0);
});

Deno.test("f1098e.compute: multiple forms — only one agi_aggregator output", () => {
  const result = compute([
    minimalItem({ box1_student_loan_interest: 600 }),
    minimalItem({ box1_student_loan_interest: 800 }),
  ]);
  const agiOutputs = result.outputs.filter((o: { nodeType: string }) =>
    o.nodeType === "agi_aggregator"
  );
  assertEquals(agiOutputs.length, 1);
});

// =============================================================================
// 5. Smoke Test
// =============================================================================

Deno.test("f1098e.compute: smoke test — two lenders, total capped", () => {
  const result = compute([
    minimalItem({ box1_student_loan_interest: 1800, lender_name: "Navient" }),
    minimalItem({ box1_student_loan_interest: 1200, lender_name: "FedLoan" }),
  ]);
  // total 3000, capped at 2500
  assertEquals(fieldsOf(result.outputs, schedule1), undefined);
  const agiFields = fieldsOf(result.outputs, agi_aggregator)!;
  assertEquals(agiFields.line21_student_loan_interest, 2500);
});

Deno.test("1098-E identified lender statements reject repeated issued copies", () => {
  const issued = {
    box1_student_loan_interest: 800,
    lender_name: "Example Loan Servicer",
    lender_tin: "12-3456789",
    borrower_tin: "111-22-3333",
    source_document_reference: "issued-1098e-1",
  };
  assertEquals(
    inputSchema.safeParse({
      f1098es: [issued, {
        ...issued,
        box1_student_loan_interest: 900,
      }],
    }).success,
    false,
  );
  assertEquals(
    inputSchema.safeParse({
      f1098es: [issued, {
        ...issued,
        source_document_reference: "issued-1098e-2",
        account_number: "loan-2",
      }],
    }).success,
    true,
  );
});

Deno.test("1098-E rejects two current copies for one lender, borrower, and loan account", () => {
  const issued = {
    box1_student_loan_interest: 800,
    lender_name: "Example Loan Servicer",
    lender_tin: "12-3456789",
    borrower_tin: "111-22-3333",
    account_number: "loan-1",
    source_document_reference: "issued-1098e-1",
  };
  assertEquals(
    inputSchema.safeParse({
      f1098es: [issued, {
        ...issued,
        box1_student_loan_interest: 900,
        source_document_reference: "issued-1098e-2",
      }],
    }).success,
    false,
  );
  assertEquals(
    inputSchema.safeParse({
      f1098es: [issued, {
        ...issued,
        account_number: "loan-2",
        source_document_reference: "issued-1098e-2",
      }],
    }).success,
    true,
  );
  assertEquals(
    inputSchema.safeParse({
      f1098es: [
        { ...issued, lender_tin: undefined },
        {
          ...issued,
          lender_tin: undefined,
          lender_name: " example  LOAN servicer ",
          source_document_reference: "issued-1098e-2",
        },
      ],
    }).success,
    false,
  );
});

Deno.test("sub-threshold student-loan ledger needs dated, reconciled payments and loan review", () => {
  const record = {
    lender_name: "Example Loan Servicer",
    loan_account_number: "loan-1",
    borrower_tin: "111-22-3333",
    student_tin: "111-22-3333",
    interest_paid: 450,
    payment_rows: [{
      paid_date: "2025-06-01",
      interest_amount: 450,
      source_reference: "2025-payment-1",
    }],
    loan_agreement_reference: "reviewed-loan-agreement",
    qualified_education_review_reference: "reviewed-education-costs",
    expense_timing_review_reference: "reviewed-expense-timing",
    eligible_institution_review_reference: "reviewed-eligible-school",
    no_double_benefit_review_reference: "reviewed-no-double-benefit",
    lender_no_form_review_reference: "reviewed-no-form",
    legal_obligation_reviewed: true,
    half_time_enrollment_at_loan_reviewed: true,
    unrelated_lender_reviewed: true,
    not_employer_plan_reviewed: true,
  };
  assertEquals(
    inputSchema.safeParse({
      unreported_interest_records: [record],
    }).success,
    true,
  );
  for (
    const changed of [
      { ...record, interest_paid: 451 },
      { ...record, legal_obligation_reviewed: false },
      { ...record, student_tin: "999-88-7777" },
      {
        ...record,
        payment_rows: [{ ...record.payment_rows[0], paid_date: "2025-02-30" }],
      },
    ]
  ) {
    assertEquals(
      inputSchema.safeParse({
        unreported_interest_records: [changed],
      }).success,
      false,
    );
  }
});

Deno.test("corrected 1098-E replaces rather than adds its original", () => {
  const original = {
    box1_student_loan_interest: 800,
    lender_name: "Example Loan Servicer",
    lender_tin: "12-3456789",
    borrower_tin: "111-22-3333",
    source_document_reference: "original-1098e",
  };
  const corrected = {
    ...original,
    box1_student_loan_interest: 900,
    source_document_reference: "corrected-1098e",
    corrected: true,
    corrects_source_document_reference: "original-1098e",
    correction_review_reference: "reviewed-lender-correction",
  };
  assertEquals(inputSchema.safeParse({ f1098es: [corrected] }).success, true);
  assertEquals(
    inputSchema.safeParse({ f1098es: [original, corrected] }).success,
    false,
  );
  assertEquals(
    inputSchema.safeParse({
      f1098es: [{ ...corrected, correction_review_reference: undefined }],
    }).success,
    false,
  );
});

Deno.test("1098-E and unreported-interest ledger cannot claim the same loan", () => {
  const issued = {
    box1_student_loan_interest: 800,
    lender_name: "Example Loan Servicer",
    lender_tin: "12-3456789",
    borrower_tin: "111-22-3333",
    account_number: "loan-1",
    source_document_reference: "issued-1098e",
  };
  const ledger = {
    lender_name: " example  LOAN servicer ",
    loan_account_number: "loan-1",
    borrower_tin: "111-22-3333",
    student_tin: "111-22-3333",
    interest_paid: 450,
    payment_rows: [{
      paid_date: "2025-06-01",
      interest_amount: 450,
      source_reference: "2025-payment-1",
    }],
    loan_agreement_reference: "reviewed-loan-agreement",
    qualified_education_review_reference: "reviewed-education-costs",
    expense_timing_review_reference: "reviewed-expense-timing",
    eligible_institution_review_reference: "reviewed-eligible-school",
    no_double_benefit_review_reference: "reviewed-no-double-benefit",
    lender_no_form_review_reference: "reviewed-no-form",
    legal_obligation_reviewed: true,
    half_time_enrollment_at_loan_reviewed: true,
    unrelated_lender_reviewed: true,
    not_employer_plan_reviewed: true,
  } as const;
  assertEquals(
    inputSchema.safeParse({
      f1098es: [issued],
      unreported_interest_records: [ledger],
    }).success,
    false,
  );
  assertEquals(
    inputSchema.safeParse({
      f1098es: [issued],
      unreported_interest_records: [{
        ...ledger,
        loan_account_number: "loan-2",
      }],
    }).success,
    true,
  );
});

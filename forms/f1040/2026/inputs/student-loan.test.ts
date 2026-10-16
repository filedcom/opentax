import { assert, assertEquals, assertThrows } from "@std/assert";
import { calculateStudentLoanSources2026 as calculate } from "./student-loan-source.ts";
import {
  studentLoanAllocationFixture2026,
  studentLoanGraphFixture2026,
  syntheticStudentLoan2026,
} from "./student-loan.fixture.ts";
import { FilingStatus } from "../../nodes/types.ts";
import { execute } from "../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../core/runtime/planner.ts";
import { sourceRegistry2026 } from "../source-registry.ts";
import { agi_2026 } from "../nodes/agi.ts";
const plan = buildExecutionPlan(sourceRegistry2026);
Deno.test("2026 student-loan ledger allocates paid fees and capitalized interest without counting box 1 twice", () => {
  for (const old of [false, true]) {
    const result = calculate(studentLoanAllocationFixture2026(old));
    const loan = result.loans[0];
    assertEquals(result.interest_before_magi, 401.02);
    assertEquals(
      loan.payments.map((
        p,
      ) => [
        p.stated_interest,
        p.origination_fee_interest,
        p.capitalized_interest,
        p.principal,
      ]),
      [[44.27, 5, 151.24, 0], [43.62, 5, 151.89, 0]],
    );
    assertEquals(loan.closing_unpaid_origination_fees, 290);
    assertEquals(loan.closing_capitalized_interest, 321.87);
  }
  const noPayment = syntheticStudentLoan2026();
  noPayment.loans[0].payments = [];
  noPayment.loans[0].opening_capitalized_interest = 600;
  noPayment.f1098es![0].box1_student_loan_interest = 0;
  noPayment.loans[0].reporting = {
    ...noPayment.loans[0].reporting,
    box1_allocated_to_loan: 0,
  } as typeof noPayment.loans[0]["reporting"];
  assertEquals(calculate(noPayment).interest_before_magi, 0);
  assertEquals(calculate(noPayment).loans[0].closing_capitalized_interest, 600);
});
Deno.test("2026 student-loan payments exclude employer assistance and only tax-free QTP earnings", () => {
  for (
    const [funding, qtp, elsewhere, expected] of [
      ["borrower_or_joint_funds", 0, 1000, 2000],
      ["third_party_gift", 0, 0, 2500],
      ["taxable_employer_payment", 0, 0, 2500],
      ["tax_free_employer_assistance", 0, 0, 0],
      ["other_tax_free_repayment_assistance", 0, 0, 0],
      ["529_distribution", 1000, 0, 2000],
    ] as const
  ) {
    const s = syntheticStudentLoan2026();
    Object.assign(s.loans[0].payments[0], {
      funding,
      qtp_tax_free_earnings_used_for_interest: qtp,
      interest_deducted_elsewhere: elsewhere,
    });
    assertEquals(calculate(s).interest_before_magi, expected);
  }
  const s = syntheticStudentLoan2026();
  s.loans[0].payments[0].funding = "529_distribution";
  assertThrows(() => calculate(s), Error, "reviewed tax-free earnings");
  s.loans[0].payments[0].qtp_tax_free_earnings_used_for_interest = 3001;
  assertThrows(() => calculate(s), Error, "exceed paid interest");
});
Deno.test("2026 student-loan qualification and actual dependency claims control eligibility", () => {
  for (
    const field of [
      "legally_obligated",
      "solely_qualified_education_use",
      "unrelated_lender",
      "not_qualified_employer_plan",
      "eligible_institution",
      "enrolled_at_least_half_time_in_degree_program",
      "expenses_within_reasonable_period",
      "education_expenses_net_of_tax_free_assistance",
    ] as const
  ) {
    const s = syntheticStudentLoan2026();
    s.loans[0].qualification[field] = false;
    assertEquals(calculate(s).interest_before_magi, 0);
  }
  const s = syntheticStudentLoan2026();
  s.taxpayer_can_be_claimed_as_dependent = true;
  assertEquals(calculate(s).interest_before_magi, 2500);
  s.dependency_review.taxpayer_claimed_on_another_return = true;
  assertEquals(calculate(s).disallowed_reason, "filer_claimed_as_dependent");
  assertEquals(calculate(s).interest_before_magi, 0);
  s.taxpayer_can_be_claimed_as_dependent = false;
  assertThrows(() => calculate(s), Error, "dependency review conflicts");
  s.dependency_review.taxpayer_claimed_on_another_return = false;
  s.filing_status = FilingStatus.MFS;
  assertEquals(calculate(s).interest_before_magi, 0);
  assertEquals(calculate(s).disallowed_reason, "married_filing_separately");
});
Deno.test("2026 student-loan ledger covers historic dependents, refinances and mixed-use disallowance", () => {
  const s = syntheticStudentLoan2026();
  s.loans[0].qualification.student_tin = "555667777";
  s.loans[0].qualification.student_relationship_at_borrowing = "dependent";
  s.loans[0].loan_kind = "consolidation";
  s.loans[0].original_loan_references = ["original-1", "original-2"];
  s.loans[0].qualification.refinance_same_borrower_and_qualified_use = true;
  assertEquals(calculate(s).interest_before_magi, 2500);
  s.loans[0].qualification.refinance_same_borrower_and_qualified_use = false;
  assertEquals(calculate(s).interest_before_magi, 0);
  s.loans[0].original_loan_references = [];
  assertThrows(() => calculate(s), Error, "original loan and use review");
});
Deno.test("2026 student-loan copy and payment identities reject duplicates and wrong owners", () => {
  const base = syntheticStudentLoan2026();
  for (
    const mutate of [
      (s: typeof base) => {
        s.loans.push(structuredClone(s.loans[0]));
      },
      (s: typeof base) => {
        s.loans[0].borrower_tin = "999887777";
      },
      (s: typeof base) => {
        s.loans[0].payments.push(structuredClone(s.loans[0].payments[0]));
      },
      (s: typeof base) => {
        s.f1098es!.push(structuredClone(s.f1098es![0]));
      },
      (s: typeof base) => {
        s.f1098es![0].borrower_tin = "999887777";
      },
      (s: typeof base) => {
        s.f1098es![0].lender_tin = "120000002";
      },
      (s: typeof base) => {
        s.f1098es![0].box1_student_loan_interest = 2999;
      },
      (s: typeof base) => {
        s.loans[0].payments[0].paid_on = "2025-12-01";
      },
      (s: typeof base) => {
        s.loans[0].payments[0].paid_on = "2026-02-30";
      },
    ]
  ) {
    const s = structuredClone(base);
    mutate(s);
    assertThrows(() => calculate(s));
  }
  base.f1098es![0].borrower_tin = "XXX-XX-6789";
  assertThrows(() => calculate(base), Error, "borrower identity");
  base.f1098es![0].borrower_owner_review_reference = "unmasked-loan-agreement";
  assertEquals(calculate(base).interest_before_magi, 2500);
});
Deno.test("2026 student-loan current correction replaces original and old-loan omissions require evidence", () => {
  const s = syntheticStudentLoan2026();
  Object.assign(s.f1098es![0], {
    corrected: true,
    corrects_source_document_reference: "superseded-1098e",
    correction_review_reference: "review",
  });
  assertEquals(calculate(s).interest_before_magi, 2500);
  s.f1098es!.push({
    ...s.f1098es![0],
    source_document_reference: "superseded-1098e",
    corrected: false,
    corrects_source_document_reference: undefined,
    correction_review_reference: undefined,
  });
  assertThrows(() => calculate(s), Error, "superseded original");
  const old = studentLoanAllocationFixture2026(true);
  old.f1098es![0].box2_origination_fees_excluded = false;
  assertThrows(() => calculate(old), Error, "box 2 review");
  old.f1098es![0].box2_origination_fees_excluded = true;
  old.loans[0].originated_on = "2004-09-01";
  assertThrows(() => calculate(old), Error, "pre-September-2004");
});
Deno.test("2026 student-loan $600 reporting threshold is per lender and borrower, not a deduction floor", () => {
  const s = syntheticStudentLoan2026();
  s.f1098es = [];
  s.loans[0].payments[0].amount_paid = 400;
  s.loans[0].payments[0].stated_interest_paid = 400;
  s.loans[0].reporting = {
    kind: "no_form",
    reason: "below_reporting_threshold",
    lender_statement_review_reference: "annual-ledger",
  };
  assertEquals(calculate(s).interest_before_magi, 400);
  s.loans.push({
    ...structuredClone(s.loans[0]),
    loan_id: "loan-2",
    account_number: "account-2",
    payments: [{
      ...s.loans[0].payments[0],
      allocation_reference: "payment-2",
    }],
  });
  assertThrows(() => calculate(s), Error, "across this lender");
  for (const l of s.loans) {
    l.reporting = {
      kind: "no_form",
      reason: "lender_did_not_issue",
      lender_statement_review_reference: "followup-ledger",
    };
  }
  assertEquals(calculate(s).interest_before_magi, 800);
});
Deno.test("2026 student-loan combined statement and joint borrowers share one return cap", () => {
  const s = syntheticStudentLoan2026();
  s.f1098es![0].box1_student_loan_interest = 6000;
  s.loans.push({
    ...structuredClone(s.loans[0]),
    loan_id: "loan-2",
    account_number: "account-2",
    payments: [{
      ...s.loans[0].payments[0],
      allocation_reference: "payment-2",
    }],
  });
  assertEquals(calculate(s).eligible_interest_before_return_limit, 6000);
  assertEquals(calculate(s).interest_before_magi, 2500);
  s.filing_status = FilingStatus.MFJ;
  s.spouse_ssn = "987654321";
  s.spouse_can_be_claimed_as_dependent = false;
  s.dependency_review.spouse_claimed_on_another_return = false;
  s.loans[1].borrower_tin = "987654321";
  s.loans[1].qualification.student_tin = "987654321";
  s.f1098es![0].box1_student_loan_interest = 3000;
  s.f1098es!.push({
    ...s.f1098es![0],
    borrower_tin: "987654321",
    source_document_reference: "spouse-copy",
    account_number: "account-2",
  });
  s.loans[1].reporting = {
    ...s.loans[1].reporting,
    statement_reference: "spouse-copy",
  } as typeof s.loans[1]["reporting"];
  assertEquals(calculate(s).interest_before_magi, 2500);
});
Deno.test("2026 student-loan source graph applies annual phaseout once and reconciles Schedule 1 and Form 1040", () => {
  for (
    const [status, wages, expected] of [
      [FilingStatus.Single, 85000, 2500],
      [FilingStatus.Single, 92500, 1250],
      [FilingStatus.Single, 100000, 0],
      [FilingStatus.MFJ, 175000, 2500],
      [FilingStatus.MFJ, 190000, 1250],
      [FilingStatus.MFJ, 205000, 0],
      [FilingStatus.MFS, 85000, 0],
    ] as const
  ) {
    const result = execute(
      plan,
      sourceRegistry2026,
      studentLoanGraphFixture2026(wages, status),
      { taxYear: 2026, formType: "f1040" },
    );
    assertEquals(result.diagnostics, []);
    assertEquals(result.pending.f1040.line10_adjustments, expected);
    assertEquals(result.pending.f1040.line11b_agi, wages - expected);
    assertEquals(
      result.pending.schedule1.line21_student_loan_interest_from_agi,
      expected,
    );
    assertEquals(
      Boolean(result.pending.schedule1.file_schedule1),
      expected > 0,
    );
    assert(result.pending.student_loan_interest.calculation_2026);
  }
});
Deno.test("2026 student-loan MAGI includes finalized taxable Social Security and restores foreign exclusion", () => {
  const base = {
    filing_status: FilingStatus.Single,
    line1a_wages: 85000,
    line21_student_loan_interest: 2500,
  };
  const calc = (extra: Record<string, unknown>) => {
    const r = agi_2026.compute({ taxYear: 2026, formType: "f1040" }, {
      ...base,
      ...extra,
    });
    return r.outputs.filter((o) => o.nodeType === "schedule1").map((o) =>
      o.fields.line21_student_loan_interest_from_agi
    ).find((x) => x !== undefined);
  };
  assertEquals(calc({ line6a_ss_gross: 10000 }), 1083);
  assertEquals(calc({ line6a_ss_gross: 10000, line6b_ss_taxable: 8500 }), 1083);
  assertEquals(
    calc({
      line1a_wages: 92500,
      line8d_foreign_earned_income_exclusion: 20000,
    }),
    1250,
  );
  assertEquals(
    calc({ line1a_wages: 92500, line18_early_withdrawal: 2500 }),
    1667,
  );
});

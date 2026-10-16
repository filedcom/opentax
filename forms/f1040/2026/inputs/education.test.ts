import { assert, assertEquals } from "@std/assert";
import { execute } from "../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../core/runtime/planner.ts";
import { sourceRegistry2026 } from "../source-registry.ts";
import type { calculateEducationCredit2026 } from "../nodes/f8863.ts";
import { educationFixture2026 } from "./education.fixture.ts";
import { dependentCareFixture2026 } from "./dependent-care.fixture.ts";
const run = (input: Record<string, unknown>) =>
  execute(buildExecutionPlan(sourceRegistry2026), sourceRegistry2026, input, {
    taxYear: 2026,
    formType: "f1040",
  });
function complete(input: Record<string, unknown>) {
  const r = run(input);
  assertEquals(r.diagnostics, []);
  return {
    p: r.pending,
    education: r.pending.f8863.calculation_2026 as ReturnType<
      typeof calculateEducationCredit2026
    >,
  };
}
Deno.test("Education derives adjusted expenses from tuition, refunds, tax-free aid and outside books", () => {
  const { education, p } = complete(educationFixture2026());
  assertEquals(education.students[0].adjusted_expenses, 5000);
  assertEquals(education.lines!.line1, 2500);
  assertEquals(education.lines!.line8, 1000);
  assertEquals(education.lines!.line19, 1500);
  assertEquals(p.f1040.line29_refundable_aotc, 1000);
  assertEquals(p.schedule3.line3_education_credit, 1500);
  assertEquals(
    complete(educationFixture2026("llc")).education.lines!.line19,
    900,
  );
});
Deno.test("Care then education credits reduce child-credit tax capacity before ACTC", () => {
  const f = educationFixture2026(), care = dependentCareFixture2026();
  const { education, p } = complete({
    ...f,
    general: care.general,
    form2441: care.form2441,
  });
  assertEquals(p.schedule3.line2_childcare_credit, 1050);
  assertEquals(education.lines!.line19, 1500);
  assertEquals(p.f1040.line19_child_tax_credit, 1273);
  assertEquals(p.f1040.line28_actc, 927);
  assertEquals(p.f1040.line29_refundable_aotc, 1000);
});
Deno.test("Education uses three-decimal allowable ratio and stops at MAGI upper limit", () => {
  const { education } = complete(educationFixture2026("aotc", 84999));
  assertEquals(education.lines!.line6, .5);
  assertEquals(education.lines!.line7, 1250);
  assertEquals(education.lines!.line8, 500);
  assertEquals(education.lines!.line9, 750);
  const high = complete(educationFixture2026("aotc", 90000)).education;
  assertEquals(high.lines!.line8, 0);
  assertEquals(high.lines!.line19, 0);
  assertEquals(high.file_form8863, false);
});
Deno.test("2026 employment SSN requirement applies to LLC and dependent students", () => {
  const f = educationFixture2026("llc");
  f.general.taxpayer_ssn_valid_for_employment = false;
  assert(run(f).diagnostics.length > 0);
  const g = educationFixture2026();
  const student = g.f8863.claim.students[0], school = student.schools[0];
  student.student_tin = g.general.dependents[0].ssn;
  assert(school.statement.kind === "issued");
  school.statement.student_tin = student.student_tin;
  assert(school.prior_1098t.kind === "received");
  school.prior_1098t.student_tin = student.student_tin;
  assertEquals(complete(g).education.lines!.line8, 1000); // Filer age, not dependent age.
  g.general.dependents[0].ssn_valid_for_employment = false;
  assert(run(g).diagnostics.length > 0);
});
Deno.test("Current box 7 and prior-year box 7 are independent and terms stop at March 31", () => {
  const f = educationFixture2026(), s = f.f8863.claim.students[0].schools[0];
  s.academic_periods[0].start_date = "2027-03-31";
  assert(s.statement.kind === "issued");
  s.statement.box7_early_2027 = true;
  assert(s.prior_1098t.kind === "received");
  s.prior_1098t.box7_early_2026 = false;
  const r = complete(f).education.students[0].schools[0];
  assertEquals(r.current_1098t_received, true);
  assertEquals(r.prior_1098t_box7, false);
  s.academic_periods[0].start_date = "2027-04-01";
  assert(run(f).diagnostics.length > 0);
});
Deno.test("2026 missing 1098-T request must follow February 1, 2027 before filing", () => {
  const f = educationFixture2026(), s = f.f8863.claim.students[0].schools[0];
  s.statement = {
    kind: "required_not_received",
    requested_date: "2027-02-02",
    request_record_reference: "request",
    fully_cooperated: true,
    cooperation_record_reference: "cooperation",
  };
  assertEquals(complete(f).education.lines!.line8, 1000);
  s.statement.requested_date = "2027-02-01";
  assert(run(f).diagnostics.length > 0);
});
Deno.test("No-form noncredit LLC derives costs but cannot be relabeled as AOTC", () => {
  const f = educationFixture2026("llc"),
    s = f.f8863.claim.students[0].schools[0];
  s.statement = {
    kind: "noncredit_courses_only",
    institution_not_required_to_furnish: true,
    furnishing_rule_record_reference: "no-credit-course-list",
  };
  s.academic_periods[0].academic_credit = false;
  assertEquals(complete(f).education.lines!.line19, 900);
  f.f8863.claim.students[0].credit_type = "aotc";
  assert(run(f).diagnostics.length > 0);
});
Deno.test("Under-24 refundability compares actual earned income to support, excluding full-time scholarships", () => {
  const f = educationFixture2026("aotc", 20000);
  f.general.taxpayer_dob = "2005-06-01";
  f.general.dependents = [];
  f.f8863.claim.refundable_review = {
    kind: "under24_nonjoint",
    record_reference: "refundability-review",
    at_least_one_parent_alive: true,
    full_time_student_months: [1, 2, 3, 4, 5],
    enrollment_record_reference: "full-time-enrollment",
    complete_support_inventory: true,
    support_records: [{
      record_reference: "support-ledger",
      amount: 40001,
      payer: "parent",
      category: "housing",
    }, {
      record_reference: "scholarship-support",
      amount: 10000,
      payer: "scholarship",
      category: "education",
    }],
  };
  const { education } = complete(f);
  assertEquals(education.support_workpaper, 40001);
  assertEquals(education.under24_nonrefundable, true);
  assertEquals(education.lines!.line8, 0);
  f.f8863.claim.refundable_review.support_records[0].amount = 40000;
  assertEquals(complete(f).education.lines!.line8, 1000);
});
Deno.test("Education source mismatches, duplicate use, ineligible histories and unknown students are rejected", () => {
  for (
    const kind of [
      "box1",
      "box5",
      "identity",
      "overlap",
      "duplicate",
      "history",
      "unknown_student",
      "prior_adjustment",
      "missing_ein",
    ] as const
  ) {
    const f = educationFixture2026(),
      student = f.f8863.claim.students[0],
      s = student.schools[0];
    assert(s.statement.kind === "issued");
    if (kind === "box1") s.statement.box1_payments = 6000;
    if (kind === "box5") s.statement.box5_scholarships = 0;
    if (kind === "identity") s.statement.student_tin = "111223333";
    if (kind === "overlap") {
      s.other_benefit_uses = [{
        record_reference: "529-distribution",
        payment_reference: "tuition-payment",
        amount: 5000,
        benefit: "529",
      }];
    }
    if (kind === "duplicate") s.payments.push(s.payments[0]);
    if (kind === "history") {
      student.aotc_history!.prior_aotc_claim_years = [2022, 2023, 2024, 2025];
    }
    if (kind === "unknown_student") student.student_tin = "111223333";
    if (kind === "prior_adjustment") {
      Object.assign(s.statement, { box4_prior_adjustments: 10 });
    }
    if (kind === "missing_ein") delete s.ein;
    assert(run(f).diagnostics.length > 0, kind);
  }
});
Deno.test("Joint student spouse may lack employment-valid SSN when the other filer qualifies", () => {
  const f = educationFixture2026();
  const student = f.f8863.claim.students[0], school = student.schools[0];
  student.student_tin = "987654321";
  assert(
    school.statement.kind === "issued" &&
      school.prior_1098t.kind === "received",
  );
  school.statement.student_tin = student.student_tin;
  school.prior_1098t.student_tin = student.student_tin;
  const general = {
    ...f.general,
    filing_status: "mfj",
    spouse_first_name: "Second",
    spouse_last_name: "Investor",
    spouse_ssn: student.student_tin,
    spouse_dob: "1980-01-01",
    spouse_blind: false,
    spouse_can_be_claimed_as_dependent: false,
    spouse_citizen_national_or_work_authorized: true,
    spouse_ssn_valid_for_employment: false,
    spouse_ssn_issued_before_due_date: true,
    spouse_tin_issued_by_due_date: true,
  };
  assertEquals(complete({ ...f, general }).education.lines!.line8, 1000);
  general.taxpayer_ssn_valid_for_employment = false;
  assert(
    run({ ...f, general }).diagnostics.some((d) => d.nodeType === "f8863"),
  );
});
Deno.test("An unpaid 2027 half-time term cannot qualify an otherwise ineligible AOTC student", () => {
  const f = educationFixture2026(),
    school = f.f8863.claim.students[0].schools[0];
  school.academic_periods[0].at_least_half_time = false;
  school.academic_periods.push({
    ...school.academic_periods[0],
    reference: "unpaid-spring",
    start_date: "2027-01-10",
    at_least_half_time: true,
  });
  assert(run(f).diagnostics.some((d) => d.nodeType === "f8863"));
});

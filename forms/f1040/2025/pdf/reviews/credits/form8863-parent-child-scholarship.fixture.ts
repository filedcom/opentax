import { assertEquals } from "@std/assert";
import { f1040_2025 } from "../../../index.ts";
import {
  childSsns,
  filer,
  fixture,
  ssn,
} from "./form8863-claimant-source.fixture.ts";
export function paired(issued: boolean, studentPaid = false) {
  const parent: any = structuredClone(fixture("parent-two").inputs);
  parent.f8863 = parent.f8863.slice(0, 1);
  parent.general.dependents = parent.general.dependents.slice(0, 1);
  parent.f8812[0].other_dependents_count = 1;
  parent.f8812[0].credit_limit_worksheet.schedule3_line3 = 1500;
  const student = parent.f8863[0];
  const studentSsn = childSsns[0];
  const school = student.filing_details.institutions[0];
  const w = student.education_expense_workpaper;
  const grantRef = "2025-Taylor-paid-required-service-award";
  const terms = "2025-Taylor-performed-teaching-required-award-terms";
  const grantW2Ref = "2025-Taylor-issued-teaching-W2";
  const grant = {
    kind: "scholarship_for_required_services",
    tax_year: 2025,
    student_ssn: studentSsn,
    source_document_reference: grantRef,
    taxable_amount: 8000,
    payer_name: school.name,
    payer_ein: school.ein,
    scholarship_terms_record_reference: terms,
    section117c_exception_review: {
      source_document_reference:
        "2025-Taylor-ordinary-nonexempt-program-review",
      national_health_service_corps_program: false,
      armed_forces_health_professions_program: false,
      comprehensive_work_college_program: false,
    },
    payment_sources: [{
      source_document_reference:
        "2025-Taylor-service-award-actual-disbursement",
      grant_source_reference: grantRef,
      student_ssn: studentSsn,
      payer_ein: school.ein,
      payment_date: "2025-12-20",
      amount: 8000,
    }],
    required_service_sources: [{
      source_document_reference: "2025-Taylor-required-teaching-source",
      grant_source_reference: grantRef,
      student_ssn: studentSsn,
      payer_ein: school.ein,
      service_kind: "teaching",
      required_as_condition_of_award: true,
      service_condition_record_reference: terms,
      performance_record_reference:
        "2025-Taylor-actual-teaching-hours-attendance",
      performed_start_date: "2025-01-15",
      performed_end_date: "2025-12-15",
      performed_hours: 225,
      payment_source_references: [
        "2025-Taylor-service-award-actual-disbursement",
      ],
    }],
    reporting: issued
      ? {
        kind: "w2_box1",
        w2_source_document_reference: grantW2Ref,
        w2_box1_wages: 8000,
        payroll_allocation_record_reference:
          "2025-Taylor-service-receipt-payroll-allocation",
      }
      : {
        kind: "schedule1_line8r",
        amount_reported_in_w2_box1: 0,
        reporting_review_record_reference:
          "2025-Taylor-service-award-not-in-W2-review",
      },
  };
  const nonservice = {
    kind: "scholarship_not_on_w2",
    tax_year: 2025,
    student_ssn: studentSsn,
    source_document_reference: "2025-Taylor-nonservice-room-board-award",
    taxable_amount: 3000,
    payer_name: school.name,
    scholarship_terms_record_id:
      "2025-Taylor-award-permits-room-board-no-service",
    taxable_allocation_record_id:
      "2025-Taylor-3000-taxable-room-board-allocation",
    nonqualified_expenses_paid: 3000,
    nonqualified_expense_payment_record_ids: [
      "2025-Taylor-actual-room-board-scholarship-payment",
    ],
    scholarship_disbursement_sources: [{
      source_document_reference:
        "2025-Taylor-nonservice-award-paid-disbursement",
      grant_source_reference: "2025-Taylor-nonservice-room-board-award",
      student_ssn: studentSsn,
      payer_name: school.name,
      payment_date: "2025-08-20",
      amount: 3000,
    }],
    nonqualified_expense_payment_sources: [{
      payment_record_id: "2025-Taylor-actual-room-board-scholarship-payment",
      student_ssn: studentSsn,
      payee_name: "Taylor Campus Housing",
      category: "room_board",
      payment_date: "2025-09-01",
      amount: 3000,
    }],
  };
  w.form1098t_box5_scholarships = 11500;
  w.issued_form1098t_source.box5_scholarships = 11500;
  Object.assign(w.payment_sources[0], {
    payer_ssn: ssn,
    payment_date: "2025-08-15",
    payment_account_record_reference: "2025-parent-bank-paid-Taylor-tuition",
  });
  w.assistance_sources[0].included_in_form1098t_box5 = true;
  w.assistance_sources.push({
    student_ssn: studentSsn,
    institution_name: school.name,
    tax_year: 2025,
    source_document_reference: "2025-Taylor-service-award-school-ledger",
    amount: 8000,
    tax_treatment: "taxable",
    included_in_form1098t_box5: true,
    required_service_compensation: true,
    required_service_terms_record_reference: terms,
    student_income_source_reference: grantRef,
  }, {
    student_ssn: studentSsn,
    institution_name: school.name,
    tax_year: 2025,
    source_document_reference: "2025-Taylor-nonservice-award-school-ledger",
    amount: 3000,
    tax_treatment: "taxable",
    included_in_form1098t_box5: true,
    taxable_nonservice_scholarship: true,
    scholarship_terms_record_reference: nonservice.scholarship_terms_record_id,
    taxable_allocation_record_reference:
      nonservice.taxable_allocation_record_id,
    student_income_source_reference: nonservice.source_document_reference,
  });
  const ordinaryW2 = {
    ...parent.w2[0],
    source_document_reference: "2025-Taylor-issued-part-time-W2",
    employee_ssn: studentSsn,
    box1_wages: 2000,
    box2_fed_withheld: 100,
    box3_ss_wages: 2000,
    box4_ss_withheld: 124,
    box5_medicare_wages: 2000,
    box6_medicare_withheld: 29,
  };
  const grantW2 = {
    ...ordinaryW2,
    source_document_reference: grantW2Ref,
    employer_name: school.name,
    employer_ein: school.ein,
    box1_wages: 8000,
    box2_fed_withheld: 200,
    box3_ss_wages: 8000,
    box4_ss_withheld: 496,
    box5_medicare_wages: 8000,
    box6_medicare_withheld: 116,
  };
  const wages = issued ? [ordinaryW2, grantW2] : [ordinaryW2];
  const review = {
    tax_year: 2025,
    source_document_reference: "2025-Taylor-parent-child-source-claim-review",
    student_ssn: studentSsn,
    student_dob: "2005-06-15",
    education_claimant_ssn: ssn,
    dependency_record_reference:
      student.ownership_review.dependency_record_reference,
    actual_parent_claim_record_reference:
      student.ownership_review.competing_claim_review_reference,
    no_student_education_credit: true,
    full_time_enrollment_record_reference:
      "2025-Taylor-full-time-five-month-record",
    full_time_student_months: [1, 2, 3, 4, 5],
    student_income_sources: [grant, nonservice],
    student_w2_sources: wages.map((r) => ({
      source_document_reference: r.source_document_reference,
      employee_ssn: r.employee_ssn,
      employer_ein: r.employer_ein,
      box1_wages: r.box1_wages,
    })),
    school_sources: [{ institution: school, workpaper: w }],
    support_sources: [{
      source_document_reference: "2025-parent-paid-Taylor-housing-food",
      student_ssn: studentSsn,
      payer_ssn: ssn,
      kind: "ordinary_support",
      amount: 20000,
    }, {
      source_document_reference: w.payment_record_ids[0],
      student_ssn: studentSsn,
      payer_ssn: ssn,
      kind: "ordinary_support",
      amount: 4500,
    }, {
      source_document_reference: "2025-Taylor-personal-paid-support",
      student_ssn: studentSsn,
      payer_ssn: studentSsn,
      kind: "ordinary_support",
      amount: 8000,
    }, {
      source_document_reference:
        nonservice.nonqualified_expense_payment_record_ids[0],
      student_ssn: studentSsn,
      payer_ssn: studentSsn,
      kind: "scholarship_support",
      amount: 3000,
    }],
  };
  if (studentPaid) {
    const payment = "2025-Taylor-student-bank-paid-tuition";
    w.payment_record_ids = [payment];
    w.payment_sources[0].payment_record_id = payment;
    w.payment_sources[0].payer_ssn = studentSsn;
    w.payment_sources[0].payment_account_record_reference =
      "2025-Taylor-owned-bank-tuition-debit";
    review.support_sources[1].source_document_reference = payment;
    review.support_sources[1].payer_ssn = studentSsn;
    review.support_sources[2].amount = 4000;
  }
  const child = {
    general: {
      ...parent.general,
      taxpayer_ssn: studentSsn,
      taxpayer_dob: "2005-06-15",
      taxpayer_can_be_claimed_as_dependent: true,
      taxpayer_claimed_as_dependent: true,
      dependents: [],
      dependent_education_income_review: review,
    },
    w2: wages,
    education_income: [grant, nonservice],
  };
  const childFiler = {
    ...filer,
    primarySSN: studentSsn,
    firstName: "Taylor",
    firstNameWithInitial: "Taylor",
    fullName: `Taylor ${filer.lastName}`,
  };
  const childResult = f1040_2025.executeReturn(child);
  assertEquals(childResult.diagnostics, []);
  student.ownership_review.dependent_student_income_return = {
    source_document_reference: "2025-Taylor-finalized-owned-income-return",
    student_claim_review: review,
    pending: childResult.pending,
  };
  return {
    parent,
    child,
    childFiler,
    review,
    student,
    childPending: childResult.pending,
  };
}

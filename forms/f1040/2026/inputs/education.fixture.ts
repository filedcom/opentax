import { childCreditGraphFixture2026 } from "../nodes/f8812.fixture.ts";
import type { EducationClaim2026 } from "./education-source.ts";
export function educationFixture2026(
  credit: "aotc" | "llc" = "aotc",
  wages = 50000,
) {
  const base = childCreditGraphFixture2026(wages);
  const claim: EducationClaim2026 = {
    tax_year: 2026,
    review_reference: "education-review",
    return_filing_date: "2027-03-01",
    neither_filer_claimed_on_another_return: true,
    no_foreign_or_territory_income_exclusions: true,
    no_foreign_tax_form8978_or_prior_amt_credit: true,
    no_taxable_scholarships_or_prior_year_recapture: true,
    prior_aotc_disallowance: "none",
    refundable_review: { kind: "not_under24_nonjoint" },
    students: [{
      student_tin: base.general.taxpayer_ssn,
      eligibility_record_reference: "student-eligibility",
      credit_type: credit,
      ...(credit === "aotc"
        ? {
          aotc_history: {
            record_reference: "transcript-review",
            prior_aotc_claim_years: [2025],
            completed_first_four_years_before_2026: false,
            felony_drug_conviction_by_end_2026: false,
          },
        }
        : {}),
      schools: [{
        school_reference: "school-1",
        name: "Synthetic University",
        ein: "120001234",
        address: {
          line1: "100 Example Avenue",
          city: "Boston",
          state: "MA",
          zip: "02110",
        },
        eligible_institution_record_reference: "eligible-school-list",
        copies_and_account_reconciled: true,
        statement: {
          kind: "issued",
          tax_year: 2026,
          document_reference: "1098t-2026",
          student_tin: base.general.taxpayer_ssn,
          institution_ein: "120001234",
          corrected: false,
          superseded_document_references: [],
          box1_payments: 5500,
          box4_prior_adjustments: 0,
          box5_scholarships: 1000,
          box6_prior_scholarship_adjustments: 0,
          box7_early_2027: false,
          box8_half_time: true,
          box9_graduate: false,
          box10_insurance_reimbursements: 0,
        },
        prior_1098t: {
          kind: "received",
          tax_year: 2025,
          document_reference: "1098t-2025",
          student_tin: base.general.taxpayer_ssn,
          institution_ein: "120001234",
          box7_early_2026: true,
        },
        academic_periods: [{
          reference: "fall-2026",
          start_date: "2026-09-01",
          enrollment_record_reference: "fall-enrollment",
          degree_or_credential_program: true,
          at_least_half_time: true,
          academic_credit: true,
          postsecondary_or_job_skills: true,
        }],
        payments: [{
          record_reference: "tuition-payment",
          payment_date: "2026-08-15",
          academic_period_reference: "fall-2026",
          payer: "filer",
          category: "tuition_required_fees",
          category_record_reference: "tuition-bill",
          amount: 6000,
          included_in_form1098t_box1: true,
        }, {
          record_reference: "books-payment",
          payment_date: "2026-08-15",
          academic_period_reference: "fall-2026",
          payer: "filer",
          category: "outside_required_course_materials",
          category_record_reference: "syllabus",
          amount: 500,
          included_in_form1098t_box1: false,
        }],
        refunds: [{
          record_reference: "tuition-refund",
          payment_reference: "tuition-payment",
          received_date: "2026-09-15",
          amount: 500,
          kind: "institution",
        }],
        assistance: [{
          document_reference: "grant",
          kind: "scholarship",
          tax_free_status_record_reference: "grant-terms",
          amount: 1000,
          included_in_form1098t_box5: true,
          allocations: [{ payment_reference: "tuition-payment", amount: 1000 }],
        }],
        other_benefit_uses: [],
        complete_expense_refund_and_assistance_inventory: true,
      }],
    }],
  };
  return { ...base, f8863: { claim } };
}

/** Two students, with three institutions for the first student. */
export function multipleEducationFixture2026() {
  const input = educationFixture2026();
  const student = input.f8863.claim.students[0];
  const school = student.schools[0];
  function copySchool(index: number, tin: string) {
    // Give each document and its allocations a distinct, consistently linked ID.
    const copy = JSON.parse(
      JSON.stringify(school),
      (key, value) =>
        typeof value === "string" &&
          (key.endsWith("reference") || key === "reference")
          ? `${value}-${index}`
          : value,
    ) as typeof school;
    copy.name = `Synthetic University ${index}`;
    copy.ein = `12000123${index}`;
    if (copy.statement.kind === "issued") {
      copy.statement.student_tin = tin;
      copy.statement.institution_ein = copy.ein;
    }
    if (copy.prior_1098t.kind === "received") {
      copy.prior_1098t.student_tin = tin;
      copy.prior_1098t.institution_ein = copy.ein;
    }
    return copy;
  }
  student.schools.push(
    copySchool(2, student.student_tin),
    copySchool(3, student.student_tin),
  );
  const dependent = input.general.dependents[0];
  input.f8863.claim.students.push({
    student_tin: dependent.ssn,
    eligibility_record_reference: "dependent-enrollment",
    credit_type: "llc",
    schools: [copySchool(4, dependent.ssn)],
  });
  return input;
}

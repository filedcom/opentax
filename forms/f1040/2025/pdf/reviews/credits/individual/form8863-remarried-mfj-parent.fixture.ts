import { assertEquals } from "@std/assert";
import { f1040_2025 } from "../../../../index.ts";
import { FilingStatus } from "../../../../../mef/header.ts";
import { family } from "./form8863-sibling-parent-selection.fixture.ts";
import {
  parentTaxProjection,
  siblingTaxProjection,
} from "../../../../../nodes/inputs/taxes/investments/f8615/dependent-source-review.ts";
function settle(inputs: any) {
  const r = f1040_2025.executeReturn(inputs);
  assertEquals(r.diagnostics, []);
  return r.pending;
}
export function remarriedFamily(
  stepFirst: boolean,
  dividendCopies?: any[],
): any {
  const old = family(false),
    children = old.children,
    parent = old.parents[0].inputs;
  delete parent.general.dependent_kiddie_tax_family_review;
  const cust = {
    ssn: "111223333",
    firstName: "Alex",
    lastName: "Example",
    dob: "1985-06-15",
  };
  const step = {
    ssn: "999887777",
    firstName: "Pat",
    lastName: "Example",
    dob: "1982-04-11",
  };
  const first = stepFirst ? step : cust, second = stepFirst ? cust : step;
  const ref = `2025-remarried-${
    stepFirst ? "stepparent-first-phaseout" : "custodial-first"
  }-actual-family-source`;
  Object.assign(parent.general, {
    filing_status: "mfj",
    taxpayer_ssn: first.ssn,
    taxpayer_first_name: first.firstName,
    taxpayer_last_name: first.lastName,
    taxpayer_dob: first.dob,
    spouse_ssn: second.ssn,
    spouse_first_name: second.firstName,
    spouse_last_name: second.lastName,
    spouse_dob: second.dob,
    spouse_can_be_claimed_as_dependent: false,
    spouse_ssn_valid_for_employment: true,
    spouse_ssn_issued_before_due_date: true,
    spouse_tin_issued_by_due_date: true,
    dependent_kiddie_tax_family_record_reference: ref,
  });
  const identity = {
    ...old.parents[0].filer,
    filingStatus: FilingStatus.MarriedFilingJointly,
    primarySSN: first.ssn,
    firstName: first.firstName,
    firstNameWithInitial: first.firstName,
    fullName: `${first.firstName} Example`,
    nameLine1: `${first.firstName} Example and ${second.firstName} Example`,
    spouse: {
      ssn: second.ssn,
      firstName: second.firstName,
      lastName: second.lastName,
      nameControl: "EXAM",
    },
  };
  const patWage = stepFirst ? 95000 : 50000;
  const pat = {
    ...structuredClone(parent.w2[0]),
    source_document_reference: "2025-Pat-actual-issued-employed-W2",
    employee_ssn: step.ssn,
    employer_name: "Pat Reviewed Employer",
    employer_ein: "98-1234567",
    box1_wages: patWage,
    box2_fed_withheld: stepFirst ? 15000 : 7000,
    box3_ss_wages: patWage,
    box4_ss_withheld: patWage * .062,
    box5_medicare_wages: patWage,
    box6_medicare_withheld: patWage * .0145,
  };
  parent.w2.push(pat);
  if (dividendCopies) {
    parent.f1099div = structuredClone(dividendCopies);
    parent.schedule_b_part_iii = {
      foreign_accounts_question: false,
      foreign_trust_question: false,
    };
  }
  Object.assign(parent.f8863_claimant_review.claimant_review, {
    claimant_ssn: first.ssn,
    claimant_dob: first.dob,
    dob_record_reference: `2025-${first.firstName}-issued-birth-record`,
  });
  for (const student of parent.f8863) {
    student.filing_status = "mfj";
    student.ownership_review.claimant_ssn = first.ssn;
    student.ownership_review.dependency_claimant_ssn = first.ssn;
  }
  // Derive the existing credit-limit input from the actual public own-income
  // return. These are output amounts, never manually staged parent tax/rates.
  const preview = structuredClone(parent);
  delete preview.f8863;
  delete preview.f8863_claimant_review;
  delete preview.f8863_credit_limit_worksheet;
  delete preview.f8812;
  preview.general.dependents = [];
  const incomeReturn = settle(preview),
    tax = incomeReturn.f1040.line18_total_tax_before_credits;
  parent.f8863_credit_limit_worksheet.credit_limit_worksheet
    .form1040_line18_tax = tax;
  for (const student of parent.f8863) {
    student.filer_magi = incomeReturn.f1040.line11_agi;
  }
  delete parent.f8812;
  const educationPreview = structuredClone(parent);
  educationPreview.general.dependents = [];
  const educationReturn = settle(educationPreview);
  parent.f8812 = [{
    filing_status: "mfj",
    agi: educationReturn.f1040.line11_agi,
    income_tax_liability: tax,
    earned_income: educationReturn.f1040.line1a_wages,
    line18a_earned_income: educationReturn.f1040.line1a_wages,
    qualifying_children_count: 0,
    other_dependents_count: parent.general.dependents.length,
    credit_limit_worksheet: {
      schedule3_line1: 0,
      schedule3_line2: 0,
      schedule3_line3: educationReturn.schedule3.line3_education_credit,
      schedule3_line4: 0,
      schedule3_line5b: 0,
      schedule3_line6d: 0,
      schedule3_line6f: 0,
      schedule3_line6l: 0,
      schedule3_line6m: 0,
      worksheet_b_applies: false,
    },
  }];
  const pending = settle(parent),
    record = {
      source_document_reference:
        "2025-actual-custodial-stepparent-joint-public-return",
      filer: identity,
      pending: parentTaxProjection(pending),
    };
  for (const p of children) {
    const r = p.review.kiddie_tax_review;
    r.family_children_record_reference = ref;
    r.settled_parent_return = record;
    r.parent_selection = {
      kind: "divorced_custodial_remarried_mfj",
      source_document_reference:
        "2025-custodial-remarriage-selected-joint-source",
      divorce_decree_record_reference: "2022-Alex-final-divorce-decree",
      remarriage_certificate_record_reference:
        "2023-Alex-Pat-issued-marriage-certificate",
      remarriage_date: "2023-08-14",
      residence_calendar_record_reference:
        `2025-${p.childFiler.firstName}-Alex-Pat-custody-calendar`,
      joint_filing_record_reference: "2025-Alex-Pat-actual-joint-filing-source",
      competing_dependency_claim_record_reference:
        "2025-Alex-Pat-joint-claims-noncustodial-does-not-claim",
      student_ssn: p.review.student_ssn,
      custodial_parent_ssn: cust.ssn,
      stepparent_ssn: step.ssn,
      noncustodial_parent_ssn: "777889999",
      custodial_parent_nights: 300,
      noncustodial_parent_nights: 65,
      custodial_parent_remarried: true,
      custodial_parent_and_stepparent_filed_joint: true,
    };
  }
  function bind() {
    const projections = children.map((p: any) =>
      siblingTaxProjection(p.childPending)
    );
    children.forEach((p: any, i: number) =>
      p.review.kiddie_tax_review.other_child_returns = children.flatMap((
        c: any,
        j: number,
      ) =>
        i === j ? [] : [{
          source_document_reference:
            `2025-${c.childFiler.firstName}-actual-owned-sibling-return`,
          student_claim_review:
            (projections[j].general as any).dependent_education_income_review,
          pending: projections[j],
        }]
      )
    );
  }
  bind();
  for (const p of children) p.childPending = settle(p.child);
  bind();
  for (const p of children) p.childPending = settle(p.child);
  bind();
  for (const p of children) {
    p.student.ownership_review.dependent_student_income_return = {
      source_document_reference:
        `2025-${p.childFiler.firstName}-settled-remarried-family-tax-return`,
      student_claim_review: p.review,
      pending: p.childPending,
    };
  }
  parent.general.dependent_kiddie_tax_family_review = {
    tax_year: 2025,
    source_document_reference: ref,
    parent_returns: [record],
    child_returns: children.map((p: any) => ({
      source_document_reference:
        `2025-${p.childFiler.firstName}-actual-complete-family-return`,
      student_claim_review: p.review,
      pending: p.childPending,
    })),
  };
  return {
    children,
    parents: [{
      inputs: parent,
      filer: identity,
      pending: settle(parent),
      record,
    }],
    familyRef: ref,
    incomeReturn,
  };
}

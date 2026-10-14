import { assertEquals } from "@std/assert";
import { f1040_2025 } from "../../../../index.ts";
import { taxablePair } from "./form8863-parent-child-kiddie-tax.fixture.ts";
import { filer, fixture } from "./form8863-claimant-source.fixture.ts";
import {
  parentTaxProjection,
  siblingTaxProjection,
} from "../../../../../nodes/inputs/taxes/investments/f8615/dependent-source-review.ts";
function settle(inputs: any) {
  const result = f1040_2025.executeReturn(inputs);
  assertEquals(result.diagnostics, []);
  return result.pending;
}
function siblingSeed() {
  const p: any = JSON.parse(
    JSON.stringify(taxablePair(false)).replaceAll("Taylor", "Sam").replaceAll(
      "222334444",
      "555667777",
    ).replaceAll("32-1111111", "32-2222222"),
  );
  p.review.kiddie_tax_review.parent_selection.other_parent_ssn = "999887777";
  p.child.general.dependent_education_income_review = p.review;
  p.child.education_income = p.review.student_income_sources;
  p.student = p.parent.f8863[0];
  p.student.education_expense_workpaper = p.review.school_sources[0].workpaper;
  const scholarship = p.review.student_income_sources[1];
  scholarship.taxable_amount = scholarship.nonqualified_expenses_paid = 14000;
  scholarship.scholarship_disbursement_sources[0].amount = 14000;
  scholarship.nonqualified_expense_payment_sources[0].amount = 14000;
  scholarship.taxable_allocation_record_id =
    "2025-Sam-14000-taxable-room-board-allocation";
  p.review.support_sources[3].amount = 14000;
  const w = p.student.education_expense_workpaper;
  w.form1098t_box5_scholarships =
    w.issued_form1098t_source.box5_scholarships =
      22500;
  w.assistance_sources[2].amount = 14000;
  w.assistance_sources[2].taxable_allocation_record_reference =
    scholarship.taxable_allocation_record_id;
  p.childPending = settle(p.child);
  p.student.ownership_review.dependent_student_income_return = {
    source_document_reference: "2025-Sam-finalized-owned-income-return",
    student_claim_review: p.review,
    pending: p.childPending,
  };
  p.parentPending = settle(p.parent);
  return p;
}
export function family(cohabiting: boolean): any {
  // Each bootstrap is a genuine public owned return: its settled income,
  // deduction and line 5 establish the inputs to the simultaneous family tax.
  // No bootstrap tax is retained in the completed reciprocal source packet.
  const children = [taxablePair(true), siblingSeed()];
  const parent: any = structuredClone(children[0].parent);
  const two: any = fixture("parent-two").inputs;
  parent.general.dependents = two.general.dependents;
  parent.general.dependents[1].first_name = "Sam";
  parent.f8812 = two.f8812;
  parent.f8863 = children.map((p) => p.student);
  const familyRef = `2025-${
    cohabiting ? "cohabiting" : "custodial"
  }-actual-complete-family-tax-source`;
  parent.general.dependent_kiddie_tax_family_record_reference = familyRef;
  const parentPending = settle(parent);
  const claimant = {
    source_document_reference: "2025-Alex-actual-settled-public-return",
    filer,
    pending: parentTaxProjection(parentPending),
  };
  const parents: any[] = [{
    inputs: parent,
    filer,
    pending: parentPending,
    record: claimant,
  }];
  if (cohabiting) {
    const other: any = {
      general: {
        ...parent.general,
        taxpayer_ssn: "999887777",
        taxpayer_dob: "1982-04-11",
        taxpayer_first_name: "Pat",
        dependents: [],
      },
      w2: structuredClone(parent.w2),
    };
    const wage = other.w2[0];
    Object.assign(wage, {
      source_document_reference: "2025-Pat-issued-owned-W2",
      employee_ssn: "999887777",
      box1_wages: 110000,
      box2_fed_withheld: 18000,
      box3_ss_wages: 110000,
      box4_ss_withheld: 6820,
      box5_medicare_wages: 110000,
      box6_medicare_withheld: 1595,
    });
    const identity = {
      ...filer,
      primarySSN: "999887777",
      firstName: "Pat",
      firstNameWithInitial: "Pat",
      fullName: "Pat Example",
    };
    const pending = settle(other);
    parents.push({
      inputs: other,
      filer: identity,
      pending,
      record: {
        source_document_reference: "2025-Pat-actual-settled-public-return",
        filer: identity,
        pending: parentTaxProjection(pending),
      },
    });
  }
  const selected = parents.at(-1).record;
  for (const p of children) {
    p.child.general.taxpayer_first_name = p.childFiler.firstName;
    const r = p.review.kiddie_tax_review;
    r.family_children_record_reference = familyRef;
    r.settled_parent_return = selected;
    if (cohabiting) {
      r.parent_selection = {
        kind: "never_married_cohabiting_greater_taxable_income",
        source_document_reference:
          "2025-actual-unmarried-cohabiting-parent-selection",
        parentage_record_reference: "Taylor-Sam-issued-parentage-records",
        joint_residence_record_reference:
          "2025-both-parents-children-365-day-residence",
        competing_dependency_claim_record_reference:
          "2025-Alex-claims-children-Pat-does-not-claim",
        student_ssn: p.review.student_ssn,
        parents_never_married: true,
        parents_lived_together_all_year: true,
        joint_residence_days: 365,
        eligible_parent_returns: parents.map((p) => p.record),
      };
    } else r.parent_selection.other_parent_ssn = "999887777";
    r.other_children_requiring_form8615 = children.filter((c) => c !== p).map((
      c,
    ) => c.review.student_ssn);
  }
  function bindSiblings() {
    const projections = children.map((p) =>
      siblingTaxProjection(p.childPending)
    );
    children.forEach((p, i) =>
      p.review.kiddie_tax_review.other_child_returns = children.flatMap((
        c,
        j,
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
  bindSiblings();
  for (const p of children) p.childPending = settle(p.child);
  bindSiblings();
  // Re-execute with both actual final sibling projections. Family tax is fixed
  // by settled income; reciprocal packets no longer retain the bootstrap tax.
  for (const p of children) p.childPending = settle(p.child);
  bindSiblings();
  for (const p of children) {
    p.student.ownership_review.dependent_student_income_return = {
      source_document_reference:
        `2025-${p.childFiler.firstName}-finalized-owned-income-return`,
      student_claim_review: p.review,
      pending: p.childPending,
    };
  }
  const fullReview = {
    tax_year: 2025,
    source_document_reference: familyRef,
    parent_returns: parents.map((p) => p.record),
    child_returns: children.map((p) => ({
      source_document_reference:
        `2025-${p.childFiler.firstName}-finalized-family-tax-return`,
      student_claim_review: p.review,
      pending: p.childPending,
    })),
  };
  for (const p of parents) {
    p.inputs.general.dependent_kiddie_tax_family_review = fullReview;
    p.pending = settle(p.inputs);
  }
  return { parents, children, familyRef };
}

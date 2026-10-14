import { assertEquals } from "@std/assert";
import { f1040_2025 } from "../../../../index.ts";
import { paired } from "./form8863-parent-child-scholarship.fixture.ts";
import { filer } from "./form8863-claimant-source.fixture.ts";
import { parentTaxProjection } from "../../../../../nodes/inputs/taxes/investments/f8615/dependent-source-review.ts";
export function taxablePair(issued: boolean, exactHalf = false): any {
  const p: any = paired(issued);
  const scholarship = p.review.student_income_sources[1];
  scholarship.taxable_amount = scholarship.nonqualified_expenses_paid = 12000;
  scholarship.scholarship_disbursement_sources[0].amount = 12000;
  scholarship.nonqualified_expense_payment_sources[0].amount = 12000;
  scholarship.taxable_allocation_record_id =
    "2025-Taylor-12000-taxable-room-board-allocation";
  p.review.support_sources[3].amount = 12000;
  if (exactHalf) p.review.support_sources[0].amount = 7500;
  const w = p.student.education_expense_workpaper;
  w.form1098t_box5_scholarships =
    w.issued_form1098t_source.box5_scholarships =
      20500;
  w.assistance_sources[2].amount = 12000;
  w.assistance_sources[2].taxable_allocation_record_reference =
    scholarship.taxable_allocation_record_id;
  // Settle the actual public parent source rows first. Its line 16 precedes
  // education/dependent credits and does not depend on the child's tax.
  const parentResult = f1040_2025.executeReturn(p.parent);
  assertEquals(parentResult.diagnostics, []);
  p.review.kiddie_tax_review = {
    source_document_reference:
      "2025-Taylor-required-kiddie-tax-family-source-review",
    tax_year: 2025,
    parent_alive_record_reference: "2025-parent-year-end-life-record",
    parent_alive_on_2025_12_31: true,
    parent_selection: {
      kind: "divorced_custodial_unremarried",
      divorce_decree_record_reference: "2022-parent-final-divorce-decree",
      residence_calendar_record_reference:
        "2025-Taylor-parent-residence-calendar",
      marital_status_record_reference:
        "2025-parent-not-remarried-status-review",
      student_ssn: p.review.student_ssn,
      custodial_parent_ssn: p.review.education_claimant_ssn,
      other_parent_ssn: "555667777",
      custodial_parent_nights: 300,
      other_parent_nights: 65,
      custodial_parent_remarried: false,
    },
    family_children_record_reference:
      "2025-parent-complete-child-kiddie-income-inventory",
    other_children_requiring_form8615: [],
    settled_parent_return: {
      source_document_reference: "2025-parent-actual-settled-public-return",
      filer,
      pending: parentTaxProjection(parentResult.pending),
    },
  };
  const childResult = f1040_2025.executeReturn(p.child);
  assertEquals(childResult.diagnostics, []);
  p.childPending = childResult.pending;
  p.student.ownership_review.dependent_student_income_return.pending =
    p.childPending;
  const finalParent = f1040_2025.executeReturn(p.parent);
  assertEquals(finalParent.diagnostics, []);
  p.parentPending = finalParent.pending;
  return p;
}

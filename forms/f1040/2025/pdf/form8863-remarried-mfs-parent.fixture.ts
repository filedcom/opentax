import { assertEquals } from "@std/assert";
import { f1040_2025 } from "../index.ts";
import { family } from "./form8863-sibling-parent-selection.fixture.ts";
import {
  parentTaxProjection,
  siblingTaxProjection,
} from "../../nodes/inputs/f8615/dependent-source-review.ts";
import { FilingStatus } from "../mef/types.ts";
function settle(inputs: any) {
  const r = f1040_2025.executeReturn(inputs);
  assertEquals(r.diagnostics, []);
  return r.pending;
}
export function separateFamily(stepHigher: boolean): any {
  const old = family(false), children = old.children;
  const cust = { ssn: "111223333", firstName: "Alex", dob: "1985-06-15" },
    step = { ssn: "999887777", firstName: "Pat", dob: "1982-04-11" };
  const ref = `2025-remarried-MFS-${
    stepHigher ? "step-itemized" : "custodian-standard"
  }-complete-family`;
  const parents = [cust, step].map((person, i) => {
    const spouse = i === 0 ? step : cust;
    const inputs: any = {
      general: structuredClone(old.parents[0].inputs.general),
      w2: [structuredClone(old.parents[0].inputs.w2[0])],
    };
    Object.assign(inputs.general, {
      filing_status: "mfs",
      taxpayer_ssn: person.ssn,
      taxpayer_first_name: person.firstName,
      taxpayer_dob: person.dob,
      spouse_ssn: spouse.ssn,
      spouse_first_name: spouse.firstName,
      spouse_last_name: "Example",
      spouse_dob: spouse.dob,
      address_city: "Albany",
      address_state: "NY",
      address_zip: "12207",
      mfs_spouse_itemizing: stepHigher && i === 1,
      mfs_spouse_lived_with_taxpayer: true,
      dependent_kiddie_tax_family_record_reference: ref,
    });
    if (i === 1) inputs.general.dependents = [];
    const wages = (stepHigher ? i === 1 : i === 0) ? 110000 : 75000;
    Object.assign(inputs.w2[0], {
      source_document_reference: `2025-${person.firstName}-MFS-owned-issued-W2`,
      employee_ssn: person.ssn,
      employer_name: `${person.firstName} Reviewed Employer`,
      employer_ein: i === 0 ? "12-3456789" : "98-1234567",
      box1_wages: wages,
      box2_fed_withheld: 18000,
      box3_ss_wages: wages,
      box4_ss_withheld: wages * .062,
      box5_medicare_wages: wages,
      box6_medicare_withheld: wages * .0145,
    });
    if (stepHigher && i === 0) {
      inputs.schedule_a = {
        filing_status: "mfs",
        agi: wages,
        line_5b_real_estate_tax: 20000,
      };
    }
    const identity = {
      ...old.parents[0].filer,
      filingStatus: FilingStatus.MarriedFilingSeparately,
      primarySSN: person.ssn,
      firstName: person.firstName,
      firstNameWithInitial: person.firstName,
      fullName: `${person.firstName} Example`,
      nameLine1: `${person.firstName} Example`,
      spouse: {
        ssn: spouse.ssn,
        firstName: spouse.firstName,
        lastName: "Example",
        nameControl: "EXAM",
      },
      address: {
        ...old.parents[0].filer.address,
        city: "Albany",
        state: "NY",
        zip: "12207",
      },
    };
    const own = structuredClone(inputs);
    own.general.dependents = [];
    let pending = settle(own);
    if (i === 0) {
      inputs.f8812 = [{
        filing_status: "mfs",
        agi: pending.f1040.line11_agi,
        income_tax_liability: pending.f1040.line18_total_tax_before_credits,
        earned_income: wages,
        line18a_earned_income: wages,
        qualifying_children_count: 0,
        other_dependents_count: 2,
        credit_limit_worksheet: {
          schedule3_line1: 0,
          schedule3_line2: 0,
          schedule3_line3: 0,
          schedule3_line4: 0,
          schedule3_line5b: 0,
          schedule3_line6d: 0,
          schedule3_line6f: 0,
          schedule3_line6l: 0,
          schedule3_line6m: 0,
          worksheet_b_applies: false,
        },
      }];
      pending = settle(inputs);
    }
    const record = {
      source_document_reference:
        `2025-${person.firstName}-actual-settled-MFS-source-return`,
      filer: identity,
      pending: parentTaxProjection(pending),
    };
    return { inputs, filer: identity, pending, record };
  });
  const selected = parents[stepHigher ? 1 : 0].record;
  for (const c of children) {
    const r = c.review.kiddie_tax_review;
    r.family_children_record_reference = ref;
    r.settled_parent_return = selected;
    r.parent_selection = {
      kind: "divorced_custodial_remarried_mfs_greater_taxable_income",
      source_document_reference: "2025-Alex-Pat-separate-source-selection",
      divorce_decree_record_reference: "2022-Alex-final-divorce-decree",
      remarriage_certificate_record_reference:
        "2023-Alex-Pat-marriage-certificate",
      remarriage_date: "2023-08-14",
      residence_calendar_record_reference:
        `2025-${c.childFiler.firstName}-custody-calendar`,
      separate_filing_record_reference: "2025-Alex-Pat-actual-separate-filings",
      competing_dependency_claim_record_reference:
        "2025-Alex-claims-Pat-and-noncustodian-do-not",
      student_ssn: c.review.student_ssn,
      custodial_parent_ssn: cust.ssn,
      stepparent_ssn: step.ssn,
      noncustodial_parent_ssn: "777889999",
      custodial_parent_nights: 300,
      noncustodial_parent_nights: 65,
      custodial_parent_remarried: true,
      spouses_lived_together_all_year: true,
      noncommunity_property_residence_review: {
        source_document_reference:
          "2025-Alex-Pat-full-year-NY-domicile-separate-wage-review",
        state: "NY",
        full_year_domicile_days: 365,
        separate_owned_income_reviewed: true,
      },
      separate_return_deduction_reviews: parents.map((p, i) => ({
        source_document_reference:
          `2025-${p.filer.firstName}-complete-itemized-inventory`,
        taxpayer_ssn: p.filer.primarySSN,
        spouse_ssn: parents[1 - i].filer.primarySSN,
        itemized_payment_inventory_complete: true,
        real_estate_tax_payments: stepHigher && i === 0
          ? [{
            source_document_reference: "2025-Alex-owned-property-tax-payment",
            assessor_bill_reference: "2025-Albany-Alex-owned-home-assessment",
            payment_date: "2025-12-01",
            payer_ssn: cust.ssn,
            property_owner_ssn: cust.ssn,
            property_address: "1 Example Way Albany NY12207",
            deductible_real_estate_tax_confirmed: true,
            amount: 20000,
          }]
          : [],
      })),
      eligible_parent_returns: parents.map((p) => p.record),
    };
  }
  function bind() {
    const projections = children.map((c: any) =>
      siblingTaxProjection(c.childPending)
    );
    children.forEach((c: any, i: number) =>
      c.review.kiddie_tax_review.other_child_returns = children.flatMap((
        o: any,
        j: number,
      ) =>
        i === j ? [] : [{
          source_document_reference:
            `2025-${o.childFiler.firstName}-owned-MFS-sibling-source`,
          student_claim_review:
            (projections[j].general as any).dependent_education_income_review,
          pending: projections[j],
        }]
      )
    );
  }
  bind();
  for (const c of children) c.childPending = settle(c.child);
  bind();
  for (const c of children) c.childPending = settle(c.child);
  bind();
  for (const p of parents) {
    p.inputs.general.dependent_kiddie_tax_family_review = {
      tax_year: 2025,
      source_document_reference: ref,
      parent_returns: parents.map((p) => p.record),
      child_returns: children.map((c: any) => ({
        source_document_reference:
          `2025-${c.childFiler.firstName}-actual-MFS-family-return`,
        student_claim_review: c.review,
        pending: c.childPending,
      })),
    };
    p.pending = settle(p.inputs);
  }
  return { children, parents, familyRef: ref };
}

import { pdfReviewFixtures } from "../../../../pdf/review-fixtures.ts";
// Synthetic source references do not authenticate issued payroll or ownership.
type Row = Record<string, any>;
export const groupLossCases = [
  {
    name: "both-loss",
    indices: [2, 3],
    wages: 600000,
    qbi: 150,
    tax: 140097,
    raw: [1993, 3919, -1007, -2061],
    offset: [1034, 2034, 0, 0],
    adjusted: [959, 1885, 0, 0],
    parentWages: [100, 200, 0, 0],
  },
  {
    name: "mixed-primary",
    indices: [0, 3],
    wages: 600000,
    qbi: 292,
    tax: 140048,
    raw: [1990, 3919, -1004, -2061],
    offset: [1032, 2033, 0, 0],
    adjusted: [958, 1886, 0, 0],
    parentWages: [2800, 200, 0, 0],
  },
  {
    name: "mixed-spouse",
    indices: [2, 1],
    wages: 600000,
    qbi: 427,
    tax: 140000,
    raw: [1993, 3919, -1007, -2061],
    offset: [1034, 2034, 0, 0],
    adjusted: [959, 1885, 0, 0],
    parentWages: [100, 2800, 0, 0],
  },
  {
    name: "both-loss-phase",
    indices: [2, 3],
    wages: 473256,
    qbi: 359,
    tax: 96227,
    raw: [1993, 3919, -1007, -2061],
    offset: [1034, 2034, 0, 0],
    adjusted: [959, 1885, 0, 0],
    parentWages: [100, 200, 0, 0],
  },
];

export function groupLossFixture(c: typeof groupLossCases[number]) {
  const { indices, wages } = c;
  const base = pdfReviewFixtures.find((f) =>
    f.id === "single-form8995a-two-business-loss-netting"
  )!;
  const joint = pdfReviewFixtures.find((f) =>
    f.id === "joint-primary-form8995a-accounting-sstb-phasein"
  )!;
  const original = base.inputs.schedule_c as Row[];
  const credit = pdfReviewFixtures.find((f) =>
    f.id === "single-certified-work-opportunity-credit"
  )!;
  const employee = structuredClone((credit.inputs.f5884 as Row).f5884s[0]);
  employee.direct_employer_review = {
    employer_ein: "123000004",
    business_reference: "se-loss-4",
    proprietor_recipient: "S",
    proprietor_ssn: "444556666",
    certification_employer_and_payroll_match_confirmed: true,
    source_review_reference:
      "Synthetic direct employer certification and payroll",
  };
  const filer = joint.filer;
  const input: Row = {
    ...structuredClone(base.inputs),
    general: {
      ...base.inputs.general as Row,
      ...joint.inputs.general as Row,
      qbi_not_patron_of_specified_cooperative_confirmed: true,
    },
    f5884: {
      ...structuredClone(credit.inputs.f5884 as Row),
      f5884s: [employee],
    },
    schedule_c: [2000, 4000, -1000, -2000].map((profit, i) => ({
      ...structuredClone(original[profit > 0 ? 0 : 1]),
      business_reference: `se-loss-${i + 1}`,
      line_c_business_name: `SE Trade ${i + 1}`,
      line_d_ein: String(123000001 + i),
      proprietor_recipient: i % 2 ? "S" : "T",
      qbi_unadjusted_basis: 0,
      qbi_loss_se_tax_allocation_review: {
        deduction_amount: 0,
        allocation_method: "owner_gross_income_proportion_with_cent_residual",
        all_owner_businesses_included_confirmed: true,
        no_other_qbi_adjustments_confirmed: true,
        workpaper_reference: `Synthetic dual owner gross ledger ${i}`,
        reviewed_by: "Synthetic reviewer",
        reviewed_on: "2026-03-01",
      },
    })),
    w2: (base.inputs.w2 as Row[]).map((w) => ({
      ...w,
      employee_ssn: filer.primarySSN,
      source_document_reference: "Synthetic primary external W2",
      box3_ss_wages: 176100,
      box4_ss_withheld: 10918,
    })),
  };
  input.schedule_c[3].qbi_wotc_filing_review = {
    owner_ssn: "444556666",
    employee_w2_records: [{
      employee_reference: employee.employee_reference,
      box1_wages: 6000,
      box5_wages: 6000,
      source_document_reference: "Synthetic employer W2",
      ssa_filing_record_reference: "Synthetic employer SSA",
      filed_within_60_days_of_due_date_confirmed: true,
    }],
    all_business_payroll_included_confirmed: true,
    no_aggregation_confirmed: true,
    reviewed_other_business_references: [
      "se-loss-1",
      "se-loss-2",
      "se-loss-3",
    ],
    no_ptp_or_loss_carryforward_confirmed: true,
    qualified_dividends_zero_confirmed: true,
    no_qualified_property_confirmed: true,
    review_reference: "Synthetic WOTC current-loss review",
    reviewed_by: "Synthetic reviewer",
    reviewed_on: "2026-03-01",
  };
  input.schedule_c.forEach((b: Row) =>
    b.part_v_other_expenses = [{
      description: "Reviewed business expenses",
      amount: 0,
    }]
  );
  const template = structuredClone(
      input.schedule_c[3].qbi_wotc_filing_review,
    ),
    worker = structuredClone(input.f5884.f5884s[0]);
  const profits = [2000, 4000, -1000, -2000];
  const gross = [6000, 8000, indices.includes(2) ? 6000 : 2000, 6000];
  input.f5884.f5884s = [];
  for (let i = 0; i < 4; i++) {
    const b = input.schedule_c[i],
      employer = (indices as readonly number[]).includes(i);
    delete b.qbi_wotc_filing_review;
    b.line_1_gross_receipts = gross[i];
    b.line_26_wages = employer ? 6000 : ([100, 200, 0, 0][i]);
    b.qbi_w2_wages = employer ? 3600 : b.line_26_wages;
    b.part_v_other_expenses[0].amount = gross[i] - b.qbi_w2_wages -
      profits[i];
    if (employer) {
      const e = structuredClone(worker);
      e.employee_reference = `DUAL-EMP-${i}`;
      e.direct_employer_review = {
        ...e.direct_employer_review,
        employer_ein: b.line_d_ein,
        business_reference: b.business_reference,
        proprietor_recipient: b.proprietor_recipient,
        proprietor_ssn: i % 2 ? "444556666" : "111223333",
      };
      for (const w of e.wage_records) {
        w.deduction_location.business_reference = b.business_reference;
        w.payroll_record_reference = `Synthetic dual payroll ${i}`;
      }
      input.f5884.f5884s.push(e);
      b.qbi_wotc_filing_review = {
        ...structuredClone(template),
        owner_ssn: e.direct_employer_review.proprietor_ssn,
        reviewed_other_business_references: input.schedule_c.filter((
          _: unknown,
          j: number,
        ) => j !== i).map((x: { business_reference: string }) =>
          x.business_reference
        ),
        employee_w2_records: [{
          ...template.employee_w2_records[0],
          employee_reference: e.employee_reference,
          source_document_reference: `Synthetic dual W2 ${i}`,
          ssa_filing_record_reference: `Synthetic dual SSA ${i}`,
        }],
      };
    }
  }
  const allocations = gross[2] === 6000
    ? [7, 81.14, 7, 60.86]
    : [10.5, 81.14, 3.5, 60.86];
  input.schedule_c.forEach((b: Row, i: number) =>
    b.qbi_loss_se_tax_allocation_review.deduction_amount = allocations[i]
  );
  input.f5884.ordinary_joint_employer_control_review = {
    businesses: indices.map((i) => {
      const b = input.schedule_c[i];
      return {
        employer_ein: b.line_d_ein,
        business_reference: b.business_reference,
        proprietor_ssn: b.qbi_wotc_filing_review.owner_ssn,
        other_spouse_no_direct_interest_confirmed: true,
        other_spouse_no_director_fiduciary_employee_or_management_confirmed:
          true,
        passive_gross_income_not_more_than_half_confirmed: true,
        no_disposition_restrictions_favoring_spouse_or_minor_children_confirmed:
          true,
        ownership_and_income_source_reference: `Synthetic dual ownership ${i}`,
      };
    }),
    no_other_common_control_ownership_or_options_confirmed: true,
    reviewed_by: "Synthetic reviewer",
    reviewed_on: "2026-03-01",
    review_reference: "Synthetic separate employer attribution review",
  };
  input.w2[0].box1_wages = wages;
  input.w2[0].box5_medicare_wages = wages;
  input.w2[0].box6_medicare_withheld = Math.round(wages * 1.45) / 100;

  const employers = input.schedule_c.filter((b: Row) =>
    b.qbi_wotc_filing_review
  );
  delete input.f5884.ordinary_joint_employer_control_review;
  input.f5884.controlled_group = {
    kind: "businesses_under_common_control",
    group_classification_document_reference:
      "Synthetic shared spousal management workpaper",
    taxpayer_member_ein: employers[0].line_d_ein,
    members: employers.map((b: Row) => ({
      ein: b.line_d_ein,
      business_name: b.line_c_business_name,
    })),
    joint_filed_members_review: {
      members: employers.map((b: Row) => ({
        ein: b.line_d_ein,
        proprietor_recipient: b.proprietor_recipient,
        proprietor_ssn: b.qbi_wotc_filing_review.owner_ssn,
        business_reference: b.business_reference,
        direct_owner_percent: 100,
        other_spouse_management_participation_confirmed: true,
        spousal_ownership_attribution_applies_confirmed: true,
      })),
      ownership_and_attribution_source_reference:
        "Synthetic shared spousal management ownership",
      common_control_confirmed: true,
      complete_group_members_and_payroll_confirmed: true,
      reviewed_by: "Synthetic reviewer",
      reviewed_on: "2026-03-01",
    },
  };
  for (const e of input.f5884.f5884s) {
    e.certification.swa_certification_reference =
      `Synthetic group SWA ${e.direct_employer_review.employer_ein}`;
    e.wage_records[0].qualified_wages = 4000;
    e.employer_ein = e.direct_employer_review.employer_ein;
    e.employee_reference = "SHARED-PERSON";
    e.group_employee_identity_review = {
      employee_identity_source_reference: "Synthetic shared worker identity",
      same_employee_across_members_confirmed: true,
      group_first_workday_on: e.hired_on,
      complete_group_hours_and_wages_confirmed: true,
    };
  }
  for (const b of employers) {
    b.qbi_wotc_filing_review.employee_w2_records[0].employee_reference =
      "SHARED-PERSON";
    b.line_26_wages = 4000;
    b.qbi_w2_wages = 2800;
    b.qbi_wotc_filing_review.employee_w2_records[0].box1_wages = 4000;
    b.qbi_wotc_filing_review.employee_w2_records[0].box5_wages = 4000;
    b.part_v_other_expenses[0].amount += 800;
  }

  return { input, filer };
}

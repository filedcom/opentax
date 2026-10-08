import type { PdfReviewFixture } from "../../../review-fixtures.ts";
import { inputSchema as wotcSchema } from "../../../../../nodes/inputs/credits/business/f5884/index.ts";

export function jointWotcReviewFixtures(
  base: PdfReviewFixture,
  joint: PdfReviewFixture,
): PdfReviewFixture[] {
  const { w2: _wages, ...inputs } = base.inputs;
  const original = wotcSchema.parse(inputs.f5884);
  return [
    { id: "phasein", employees: 1, receipts: 350000, wages: 150000.37 },
    { id: "threshold-edge", employees: 1, receipts: 350000, wages: 95257.50 },
    { id: "upper-edge", employees: 1, receipts: 350000, wages: 195256.50 },
    { id: "upper-plus-one", employees: 1, receipts: 350000, wages: 195257.50 },
    { id: "partial-above", employees: 80, receipts: 600000, wages: 300000 },
  ].map((scenario) => {
    const employees = Array.from(
      { length: scenario.employees },
      (_, index) => ({
        ...original.f5884s[0],
        direct_employer_review: {
          employer_ein: "123456789",
          proprietor_recipient: "T" as const,
          proprietor_ssn: "111223333",
          business_reference:
            (inputs.schedule_c as Record<string, unknown>[])[0]
              .business_reference as string,
          certification_employer_and_payroll_match_confirmed: true as const,
          source_review_reference:
            `Synthetic employer/certification/payroll owner review ${index}`,
        },
        employee_reference: `SYNTHETIC-JOINT-EMP-${index}`,
        certification: {
          ...original.f5884s[0].certification,
          swa_certification_reference: `Synthetic joint SWA-${index}`,
        },
        wage_records: original.f5884s[0].wage_records.map((record) => ({
          ...record,
          payroll_record_reference: `Synthetic joint payroll-${index}`,
        })),
      }),
    );
    const wageBase = (joint.inputs.w2 as Record<string, unknown>[])[0];
    return {
      id: `joint-primary-wotc-${scenario.id}`,
      filer: joint.filer,
      inputs: {
        ...inputs,
        general: {
          ...joint.inputs.general as Record<string, unknown>,
          qbi_no_prior_loss_or_suspended_loss_confirmed: true,
          qbi_not_patron_of_specified_cooperative_confirmed: true,
        },
        w2: [{
          ...wageBase,
          employer_ein: "54-3216789",
          employer_name: "External Example Employer",
          employee_ssn: "444556666",
          source_document_reference: `Synthetic spouse W2 ${scenario.id}`,
          box1_wages: scenario.wages,
          box2_fed_withheld: 60000,
          box3_ss_wages: Math.min(scenario.wages, 176100),
          box4_ss_withheld:
            Math.round(Math.min(scenario.wages, 176100) * .062 * 100) / 100,
          box5_medicare_wages: scenario.wages,
          box6_medicare_withheld: Math.round(
            (scenario.wages * .0145 +
              Math.max(0, scenario.wages - 200000) * .009) * 100,
          ) / 100,
        }],
        f5884: { ...original, f5884s: employees },
        schedule_c: [{
          ...(inputs.schedule_c as Record<string, unknown>[])[0],
          proprietor_recipient: "T",
          line_c_business_name: "Example Retail",
          line_d_ein: "123456789",
          line_1_gross_receipts: scenario.receipts,
          line_26_wages: scenario.employees * 6000,
          qbi_w2_wages: scenario.employees * 3600,
          qbi_unadjusted_basis: 0,
          qbi_no_other_adjustments_confirmed: true,
          qbi_wotc_filing_review: {
            owner_ssn: "111223333",
            employee_w2_records: employees.map((worker) => ({
              employee_reference: worker.employee_reference,
              source_document_reference:
                `Synthetic employer W2 ${worker.employee_reference}`,
              box1_wages: 6000,
              box5_wages: 6000,
              ssa_filing_record_reference:
                `Synthetic SSA ${worker.employee_reference}`,
              filed_within_60_days_of_due_date_confirmed: true,
            })),
            all_business_payroll_included_confirmed: true,
            no_other_business_or_aggregation_confirmed: true,
            no_ptp_or_loss_carryforward_confirmed: true,
            qualified_dividends_zero_confirmed: true,
            no_qualified_property_confirmed: true,
            review_reference: "Synthetic joint 280C and unmodified-box review",
            reviewed_by: "Synthetic reviewer",
            reviewed_on: "2026-03-01",
          },
        }],
      },
      reviewFocus: [
        "Joint primary-owned certified payroll and full determined wage reduction before SE/QBI",
        "Actual spouse W2 stays separate from primary Social Security wage cap",
        "Exact joint phase-in and whole-dollar credit-use/1040 joins; synthetic source reviews are not authentication",
      ],
      expectedPdfForms: [
        "f1040",
        "schedule1",
        "schedule2",
        "schedule3",
        "schedule_c",
        "schedule_se",
        "f5884",
        "f3800",
        "form8995a",
        "form8959",
        "form8960",
        "form6251",
      ],
    };
  });
}

/** Separate spouse proprietor; the actual primary W2 does not consume spouse SS wage base. */
export function spouseWotcReviewFixtures(
  base: PdfReviewFixture,
  joint: PdfReviewFixture,
): PdfReviewFixture[] {
  return jointWotcReviewFixtures(base, joint).map((fixture) => {
    const inputs = structuredClone(fixture.inputs) as any;
    inputs.w2[0].employee_ssn = "111223333";
    inputs.w2[0].source_document_reference = "Synthetic primary owned W2";
    const business = inputs.schedule_c[0];
    business.proprietor_recipient = "S";
    business.qbi_wotc_filing_review.owner_ssn = "444556666";
    for (const employee of inputs.f5884.f5884s) {
      employee.direct_employer_review.proprietor_recipient = "S";
      employee.direct_employer_review.proprietor_ssn = "444556666";
    }
    return {
      ...fixture,
      id: fixture.id.replace("primary", "spouse"),
      inputs,
      reviewFocus: [
        "Actual spouse proprietor and certified employer payroll, primary W2 owner-specific SS wage cap",
        ...fixture.reviewFocus,
      ],
    };
  });
}

export function bothOwnerWotcReviewFixtures(
  base: PdfReviewFixture,
  joint: PdfReviewFixture,
): PdfReviewFixture[] {
  const primary = jointWotcReviewFixtures(base, joint);
  return ["phasein", "partial-above", "one-phasein"].map((kind) => {
    const fixture = primary.find((f) =>
      f.id.endsWith(kind === "one-phasein" ? "phasein" : kind)
    )!;
    const inputs = structuredClone(fixture.inputs) as any;
    const first = inputs.schedule_c[0], second = structuredClone(first);
    first.line_1_gross_receipts = kind === "one-phasein"
      ? 6000
      : kind === "phasein"
      ? 180000
      : 600000;
    second.line_1_gross_receipts = kind === "one-phasein"
      ? 350000
      : kind === "phasein"
      ? 190000
      : 600000;
    second.business_reference = "spouse-wotc-retail";
    second.line_c_business_name = "Spouse Example Retail";
    second.line_d_ein = "987654321";
    second.proprietor_recipient = "S";
    second.qbi_wotc_filing_review.owner_ssn = "444556666";
    const extra = structuredClone(inputs.f5884.f5884s);
    extra.forEach((e: any, index: number) => {
      e.employee_reference = `SYNTHETIC-SPOUSE-EMP-${index}`;
      e.certification.swa_certification_reference =
        `Synthetic spouse SWA ${index}`;
      e.direct_employer_review = {
        ...e.direct_employer_review,
        employer_ein: second.line_d_ein,
        proprietor_recipient: "S",
        proprietor_ssn: "444556666",
        business_reference: second.business_reference,
        source_review_reference: `Synthetic spouse employer source ${index}`,
      };
      e.wage_records.forEach((r: any) => {
        r.payroll_record_reference = `Synthetic spouse payroll ${index}`;
        r.deduction_location.business_reference = second.business_reference;
      });
    });
    second.qbi_wotc_filing_review.employee_w2_records = extra.map((e: any) => ({
      ...first.qbi_wotc_filing_review.employee_w2_records[0],
      employee_reference: e.employee_reference,
      source_document_reference:
        `Synthetic spouse employer W2 ${e.employee_reference}`,
      ssa_filing_record_reference:
        `Synthetic spouse SSA ${e.employee_reference}`,
    }));
    for (const [business, other] of [[first, second], [second, first]]) {
      delete business.qbi_wotc_filing_review
        .no_other_business_or_aggregation_confirmed;
      business.qbi_wotc_filing_review.no_aggregation_confirmed = true;
      business.qbi_wotc_filing_review.reviewed_other_business_references = [
        other.business_reference,
      ];
    }
    inputs.f5884.ordinary_joint_employer_control_review = {
      businesses: [first, second].map((business) => ({
        employer_ein: business.line_d_ein,
        business_reference: business.business_reference,
        proprietor_ssn: business.qbi_wotc_filing_review.owner_ssn,
        other_spouse_no_direct_interest_confirmed: true,
        other_spouse_no_director_fiduciary_employee_or_management_confirmed:
          true,
        passive_gross_income_not_more_than_half_confirmed: true,
        no_disposition_restrictions_favoring_spouse_or_minor_children_confirmed:
          true,
        ownership_and_income_source_reference:
          `Synthetic separate retail ownership and gross income ${business.business_reference}`,
      })),
      no_other_common_control_ownership_or_options_confirmed: true,
      reviewed_by: "Synthetic reviewer",
      reviewed_on: "2026-03-01",
      review_reference:
        "Synthetic section52 and spousal attribution exception review",
    };
    inputs.f5884.f5884s.push(...extra);
    inputs.schedule_c.push(second);
    inputs.w2[0].employee_ssn = "111223333";
    inputs.w2[0].source_document_reference =
      `Synthetic primary external W2 ${kind}`;
    return {
      ...fixture,
      id: `joint-both-owner-wotc-${kind}`,
      inputs,
      expectedPdfForms: [
        ...fixture.expectedPdfForms!,
        "schedule_c",
        "schedule_se",
      ],
      reviewFocus: [
        "Two independently owned employers with distinct certified payroll and full credit reductions",
        "Separate owner ScheduleSE wage caps and attributable half-SE/QBI rows; joint credit current use",
        "Form8995A per-business phase-in and joint taxable income limit, synthetic source reviews only",
      ],
    };
  });
}

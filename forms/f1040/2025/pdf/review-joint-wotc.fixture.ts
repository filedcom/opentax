import type { PdfReviewFixture } from "./review-fixtures.ts";
import { inputSchema as wotcSchema } from "../../nodes/inputs/f5884/index.ts";

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

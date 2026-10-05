import type { PdfReviewFixture } from "./review-fixtures.ts";

export function accountingSstbFixture(
  base: PdfReviewFixture,
  wageBase: PdfReviewFixture,
): PdfReviewFixture {
  return {
    id: "single-form8995a-accounting-sstb-phasein",
    filer: base.filer,
    inputs: {
      general: { ...(base.inputs.general as Record<string, unknown>) },
      w2: [{
        ...(wageBase.inputs.w2 as Record<string, unknown>[])[0],
        employee_ssn: "111-22-3333",
        box1_wages: 210000,
        box2_fed_withheld: 50000,
        box3_ss_wages: 176100,
        box4_ss_withheld: 10918.2,
        box5_medicare_wages: 210000,
        box6_medicare_withheld: 3045,
      }],
      schedule_c: [{
        business_reference: "SYNTHETIC-ACCOUNTING-2025",
        line_a_principal_business: "Accounting services",
        line_b_business_code: "541211",
        line_c_business_name: "Example Accounting",
        line_d_ein: "123456789",
        proprietor_recipient: "T",
        line_f_accounting_method: "cash",
        line_g_material_participation: true,
        line_i_made_1099_payments: false,
        line_32_at_risk: "a",
        line_1_gross_receipts: 38431,
        line_26_wages: 10000,
        qbi_specified_service: true,
        qbi_w2_wages: 10000,
        qbi_unadjusted_basis: 0,
        qbi_no_other_adjustments_confirmed: true,
        qbi_sstb_filing_review: {
          owner_ssn: "111223333",
          classification_source_reference:
            "Synthetic accounting service contracts",
          business_activity_description: "Accounting services",
          accounting_sstb_confirmed: true,
          employee_w2_records: [{
            employee_ssn: "222334444",
            employer_ein: "123456789",
            source_document_reference:
              "Synthetic issued accounting employee W2",
            box1_wages: 10000,
            box5_wages: 10000,
            ssa_filing_record_reference: "Synthetic timely SSA W2 submission",
            filed_within_60_days_of_due_date_confirmed: true,
          }],
          all_business_payroll_included_confirmed: true,
          no_other_business_or_aggregation_confirmed: true,
          no_ptp_or_loss_carryforward_confirmed: true,
          qualified_dividends_zero_confirmed: true,
          no_qualified_property_confirmed: true,
          no_adjustments_beyond_filed_half_se_tax_confirmed: true,
          review_reference: "Synthetic 2025 accounting QBI workpaper",
          reviewed_by: "Synthetic reviewer",
          reviewed_on: "2026-03-01",
        },
      }],
    },
    expectedPdfForms: [
      "f1040",
      "schedule1",
      "schedule2",
      "schedule_c",
      "schedule_se",
      "form8959",
      "form8960",
      "form8995a",
      "form8995a_schedule_a",
    ],
    reviewFocus: [
      "Owned accounting receipts38431/payroll10000 yield profit28431 and filed SE761/half381, adjusted QBI28050",
      "Taxable before QBI222300 yields50percent applicable SSTB percentage and paid wage limit; filed reduction153 leaves deduction2652",
      "Actual parent and ScheduleA business identity, specified-service flag, zero carryforward and Form1040 income/tax reconcile",
    ],
  };
}

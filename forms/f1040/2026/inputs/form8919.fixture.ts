import { FilingStatus } from "../../nodes/types.ts";
import type { Form8919Input2026 } from "./form8919.ts";
export function syntheticForm8919_2026(): Form8919Input2026 {
  return {
    tax_year: 2026,
    evidence_review_date: "2027-02-10",
    filing_status: FilingStatus.Single,
    taxpayer_ssn: "111223333",
    w2_sources: [{
      employee_ssn: "111223333",
      employer_name: "First",
      employer_ein: "123456789",
      source_document_reference: "w2-one",
      ss_wages_and_tips: 180_000,
      rrta_compensation: 0,
    }],
    forms: [{
      recipient: "taxpayer",
      employers: [{
        name: "First",
        tin_type: "ein",
        tin: "123456789",
        reason_code: "H",
        employee_classification_review_reference: "classification-record",
        performed_services_as_employee: true,
        no_social_security_or_medicare_withholding: true,
        wages_not_in_w2_or_other_income: true,
        not_unreported_tips: true,
        income_records: [{
          kind: "1099nec",
          tax_year: 2026,
          source_document_reference: "nec-one",
          recipient_ssn: "111223333",
          payer_name: "First",
          payer_tin: "123456789",
          corrected: false,
          box1a_nonemployee_compensation: 10_000,
          box1b_cash_tips: 0,
          box1d_qualified_overtime: 0,
          box3_excess_golden_parachute: 0,
          box4_federal_withholding: 1000,
          wage_payments: [{
            payment_reference: "annual-wage-ledger",
            gross_wages: 10_000,
          }],
          no_other_reportable_boxes_review_reference: "source-box-review",
        }],
      }],
    }],
  };
}

import { FilingStatus } from "../../nodes/types.ts";
import type { Form4137Input2026 } from "./form4137.ts";

export function syntheticForm4137_2026(): Form4137Input2026 {
  return {
    tax_year: 2026,
    filing_status: FilingStatus.Single,
    taxpayer_ssn: "111223333",
    w2_tip_sources: [{
      employee_ssn: "111223333",
      employer_name: "Cafe",
      employer_ein: "123456789",
      source_document_reference: "issued-w2",
      allocated_tips: 2000,
      ss_wages_and_tips: 150_000,
    }],
    forms: [{
      recipient: "taxpayer",
      employers: [{
        name: "Cafe",
        ein: "123456789",
        tips_received: 22_000,
        tips_reported: 20_000,
        tip_records_reference: "annual-tip-diary",
        qualification_review: {
          source_document_reference: "issued-w2",
          employee_ssn: "111223333",
          employer_ein: "123456789",
          allocations: [{
            occupation_code: "102",
            qualified_cash_tips: 20_000,
            occupation_and_tip_records_reference: "tip-log",
          }],
          excluded_cash_tips: 2000,
          qualification_review_reference: "qualification-review",
          voluntary_customer_tips_not_service_charges: true,
          no_recharacterized_wages_or_related_payor_tips: true,
          services_not_illegal_under_applicable_law: true,
          sstb_treatment: "not_sstb",
        },
      }],
    }],
  };
}

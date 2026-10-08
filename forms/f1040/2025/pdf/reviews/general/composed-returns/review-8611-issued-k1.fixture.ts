import { extractFilerIdentity } from "../../../../../mef/filer.ts";
import type { PdfReviewFixture } from "../../../review-fixtures.ts";
export function issuedRecaptureInputs(joint = false) {
  const building = (bin: string, amount: number) => ({
    building_reference: "STATEMENT-" + bin,
    building_bin: bin,
    building_us_address: {
      line1: "10 Housing Way",
      city: "Albany",
      state: "NY",
      zip: "12207",
    },
    placed_in_service_date: "2018-01-01",
    recapture_event_date: "2025-06-01",
    issuer_form8611_line17_total_including_interest: amount * 4,
    distributive_share: .25,
    allocated_code_f_amount_including_interest: amount,
    issuer_allocation_reference: "ISSUER-ALLOCATION-" + bin,
    recipient_unused_credit_review_reference: "RECIPIENT-NO-UNUSED-LEDGER-" +
      bin,
    no_unused_credit_for_building_confirmed: true,
    no_other_recapture_source_for_building_confirmed: true,
    financed_with_tax_exempt_bonds: false,
  });
  return {
    general: {
      filing_status: joint ? "mfj" : "single",
      taxpayer_first_name: "Alex",
      taxpayer_last_name: "Housing",
      taxpayer_ssn: "111223333",
      taxpayer_dob: "1985-06-15",
      ...(joint
        ? {
          spouse_first_name: "Casey",
          spouse_last_name: "Housing",
          spouse_ssn: "222334444",
          spouse_dob: "1986-05-01",
        }
        : {}),
      address_line1: "1 Example Way",
      address_city: "Albany",
      address_state: "NY",
      address_zip: "12207",
      digital_assets: false,
    },
    w2: [{
      employee_ssn: "111223333",
      employer_name: "Actual Reviewed Employer",
      employer_ein: "123456789",
      employer_address_line1: "20 Employer Way",
      employer_address_city: "Albany",
      employer_address_state: "NY",
      employer_address_zip: "12207",
      source_document_reference: "2025-ALEX-ISSUED-W2",
      box1_wages: 80000,
      box2_fed_withheld: 15000,
      box3_ss_wages: 80000,
      box4_ss_withheld: 4960,
      box5_medicare_wages: 80000,
      box6_medicare_withheld: 1160,
      box13_statutory_employee: false,
    }],
    k1_partnership: [{
      partnership_name: "Reviewed Affordable Homes",
      partnership_ein: "987654321",
      source_document_reference: "ISSUED-2025-K1-HOUSING",
      recipient_tin: joint ? "222334444" : "111223333",
      box20_code_f_lihtc_recapture: {
        tax_year: 2025,
        statement_reference: "ISSUED-2025-K1-CODEF-STATEMENT",
        section42j5_partnership_confirmed: true,
        box20_code_f_amount: 2500,
        buildings: [building("NY1234567", 1500), building("NY1234568", 1000)],
      },
    }],
  };
}

export function issuedRecaptureReviewFixture(joint: boolean): PdfReviewFixture {
  const inputs = issuedRecaptureInputs(joint);
  return {
    id: joint
      ? "joint-spouse-issued-k1-lihtc-recapture"
      : "single-issued-k1-lihtc-recapture",
    inputs,
    filer: extractFilerIdentity(inputs.general)!,
    expectedPdfForms: ["f1040", "schedule2", "f8611", "f8611"],
    reviewFocus: [
      "Actual issued section42j5 codeF statement allocations and recipient TIN match each distinct building",
      "Interest included once in issuer allocation; reviewed no-unused-credit facts leave lines9/11/13/15 zero",
      "Two official first-page8611 copies sum2500 to Schedule2 line16 and1040 line23 with full recipient/issuer conflict replay",
    ],
  };
}

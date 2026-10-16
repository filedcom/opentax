import { investmentGraphInput2026 } from "../investment-assembly.fixture.ts";
import { AccountType } from "../../nodes/inputs/payments/refund/f8888/index.ts";

/** ATS-5 monetary/account facts with explicit reviewed identity answers. Not ATS acceptance. */
export function refundAllocationGraph2026() {
  const base = investmentGraphInput2026(50510);
  return {
    general: {
      ...base.general,
      taxpayer_first_name: "Sam",
      taxpayer_last_name: "Wheat",
      taxpayer_ssn: "400001037",
      taxpayer_dob: "1986-02-07",
      address_line1: "100 Synthetic Street",
      address_city: "Austin",
      address_state: "TX",
      address_zip: "78701",
    },
    w2s: [{
      ...base.w2s![0],
      employee_ssn: "400001037",
      employer_ein: "000000057",
      employer_name: "Doughnut Castle",
      source_document_reference: "ats5-page4-w2",
      box2_fed_withheld: 10268,
      box4_ss_withheld: 3132,
      box6_medicare_withheld: 732,
    }],
    refund_allocation: {
      claim: {
        tax_year: 2026 as const,
        record_reference: "reviewed-ats5-allocation",
        deposit_request_confirmed: true as const,
        accounts: [{
          record_reference: "checking-details",
          routing_number: "012345672",
          account_number: "12345678",
          account_type: AccountType.Checking,
          owner_name: "Sam Wheat",
          allocation: "remainder" as number | "remainder",
          us_financial_institution: true as const,
          institution_accepts_deposit: true as const,
        }, {
          record_reference: "savings-details",
          routing_number: "012345672",
          account_number: "1234567",
          account_type: AccountType.Savings,
          owner_name: "Sam Wheat",
          allocation: 1000 as number | "remainder",
          us_financial_institution: true as const,
          institution_accepts_deposit: true as const,
        }],
      },
    },
  };
}

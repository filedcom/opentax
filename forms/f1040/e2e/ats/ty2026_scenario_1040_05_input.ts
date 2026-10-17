import { FilingStatus } from "../../nodes/types.ts";
import { AccountType } from "../../nodes/inputs/payments/refund/f8888/index.ts";
import { SCENARIO_1040_05_TY2026_FACTS } from "./ty2026_cases.ts";

/**
 * Independently computed TY2026 1040 Scenario 5 amounts; the packet prints
 * none of them (pages 2-3 are blank). Line 12: Rev. Proc. 2025-32 §4.14(1).
 * Line 16: the 2026 Tax Table is not yet published, so the cell is computed
 * the way IRS builds it, at the $34,400-$34,450 row midpoint under Rev. Proc.
 * 2025-32 §4.01 Table 3: $1,240 + 12% x ($34,425 - $12,400) = $3,883.
 */
export const SCENARIO_1040_05_TY2026_EXPECTED = {
  line1aWages: 50_510,
  line11Agi: 50_510,
  line12StandardDeduction: 16_100,
  line15TaxableIncome: 34_410,
  line16Tax: 3_883,
  line24TotalTax: 3_883,
  line25aW2Withholding: 10_268,
  line34Overpayment: 6_385,
  line35aRefund: 6_385,
  form8888Line1aChecking: 5_385,
  form8888Line2aSavings: 1_000,
} as const;

export const SCENARIO_1040_05_TY2026_ASSUMPTIONS = [
  {
    field: "general.taxpayer_prior_year_agi",
    value: 0,
    why: "The packet gives no 2025 AGI for the Self-Select PIN signature.",
  },
  {
    field: "general.ats_test_submission",
    value: true,
    why: "Marks the ATS test return so the 00 SSN and EIN test prefixes apply.",
  },
  {
    field: "w2[0].source_document_reference",
    value: "irs-ty2026-ats-1040-05-w2-page-4",
    why: "The issued-copy reference names the packet page of the W-2.",
  },
  {
    field: "f8888.account_*.owner_name",
    value: "Sam Wheat",
    why: "Both accounts belong to the only filer named on Form 8888.",
  },
  {
    field: "f8888.account_1.amount",
    value: SCENARIO_1040_05_TY2026_EXPECTED.form8888Line1aChecking,
    why:
      "The cover sends the refund remainder to checking; it is the computed $6,385 refund less the $1,000 to savings.",
  },
] as const;

/** Official IRS TY2026 1040 ATS Scenario 5 packet (draft, 9/22/2026). */
export function ty2026Scenario104005Input(): Record<string, unknown> {
  const facts = SCENARIO_1040_05_TY2026_FACTS;
  const owner = `${facts.taxpayer.firstName} ${facts.taxpayer.lastName}`;
  return {
    general: {
      filing_status: FilingStatus.Single,
      taxpayer_first_name: facts.taxpayer.firstName,
      taxpayer_last_name: facts.taxpayer.lastName,
      taxpayer_ssn: facts.taxpayer.ssn,
      taxpayer_dob: facts.taxpayer.dateOfBirth,
      taxpayer_prior_year_agi: 0,
      address_line1: facts.taxpayer.address.line1,
      address_city: facts.taxpayer.address.city,
      address_state: facts.taxpayer.address.state,
      address_zip: facts.taxpayer.address.zip,
      digital_assets: facts.taxpayer.digitalAssets,
      ats_test_submission: true,
    },
    w2: [{
      source_document_reference: "irs-ty2026-ats-1040-05-w2-page-4",
      employer_name: facts.w2.employerName,
      employer_ein: facts.w2.employerEin,
      employee_ssn: facts.w2.employeeSsn,
      employer_address_line1: facts.w2.employerAddress.line1,
      employer_address_city: facts.w2.employerAddress.city,
      employer_address_state: facts.w2.employerAddress.state,
      employer_address_zip: facts.w2.employerAddress.zip,
      box1_wages: facts.w2.box1Wages,
      box2_fed_withheld: facts.w2.box2FederalWithholding,
      box3_ss_wages: facts.w2.box3SocialSecurityWages,
      box4_ss_withheld: facts.w2.box4SocialSecurityWithholding,
      box5_medicare_wages: facts.w2.box5MedicareWages,
      box6_medicare_withheld: facts.w2.box6MedicareWithholding,
    }],
    f8888: {
      account_1: {
        routing_number: facts.form8888.first.routingNumber,
        account_number: facts.form8888.first.accountNumber,
        account_type: AccountType.Checking,
        amount: SCENARIO_1040_05_TY2026_EXPECTED.form8888Line1aChecking,
        owner_name: owner,
      },
      account_2: {
        routing_number: facts.form8888.second.routingNumber,
        account_number: facts.form8888.second.accountNumber,
        account_type: AccountType.Savings,
        amount: facts.refundInstruction.savingsAmount,
        owner_name: owner,
      },
    },
  };
}

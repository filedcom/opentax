import { FilingStatus } from "../../nodes/types.ts";
import { SCENARIO_1040_04_FACTS } from "./ty2025_cases.ts";

/** Official Scenario 4 issued W-2 slice; the credit claims lack filing proof. */
export function scenario104004Input(): Record<string, unknown> {
  const { taxpayer, w2 } = SCENARIO_1040_04_FACTS;
  return {
    general: {
      taxpayer_first_name: taxpayer.firstName,
      taxpayer_last_name: taxpayer.lastName,
      taxpayer_ssn: taxpayer.ssn,
      taxpayer_dob: taxpayer.dateOfBirth,
      address_line1: taxpayer.address.line1,
      address_city: taxpayer.address.city,
      address_state: taxpayer.address.state,
      address_zip: taxpayer.address.zip,
      filing_status: FilingStatus.Single,
      digital_assets: taxpayer.digitalAssets,
    },
    w2: [{
      source_document_reference: "irs-ty2025-ats-1040-04-w2-page-4",
      employer_name: w2.employerName,
      employer_ein: w2.employerEin,
      employee_ssn: w2.employeeSsn,
      employer_address_line1: w2.employerAddress.line1,
      employer_address_city: w2.employerAddress.city,
      employer_address_state: w2.employerAddress.state,
      employer_address_zip: w2.employerAddress.zip,
      box1_wages: w2.box1Wages,
      box2_fed_withheld: w2.box2FederalWithholding,
      box3_ss_wages: w2.box3SocialSecurityWages,
      box4_ss_withheld: w2.box4SocialSecurityWithholding,
      box5_medicare_wages: w2.box5MedicareWages,
      box6_medicare_withheld: w2.box6MedicareWithholding,
    }],
  };
}

export const SCENARIO_1040_04_RECONCILIATION = {
  form1040Line1aWages: 36_014,
  form1040Line25aWithholding: 4_581,
  solarBaseCreditFromPrintedKwhAndRate: 2_640,
  solarFivefoldCreditIfPrintedLine8EligibilityApplies: 13_200,
  printedForm3800SolarCredit: 13_200,
  printedForm3800VehicleBusinessCredit: 130,
  missing: [
    "The assumed Transfer Election Statement has no retained bytes or transfer-party terms.",
    "Form 8835 is for a facility owned by Texas Solar Energy, not this filer; meter, invoice, construction, capacity and transfer records are absent.",
    "Form 8835 computed lines, including line 15, are blank; its 2023 service date points to Form 3800 Part III line 4e for first-four-year production, but $13,200 is printed on line 1f.",
    "Form 8936 Part II and Schedule A lines 9 through 11 are blank, so its $130 Form 3800 line 1y business credit has no printed credit computation or business-use percentage.",
  ],
} as const;

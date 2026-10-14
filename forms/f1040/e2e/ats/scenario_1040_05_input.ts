import {
  DependentRelationship,
  IRSDependentRelationshipCode,
} from "../../nodes/inputs/general/filing/general/index.ts";
import { FilingStatus } from "../../nodes/types.ts";
import { SCENARIO_1040_05_FACTS } from "./ty2025_cases.ts";

/** Wage and explicit ACTC opt-out fixture, not the complete Scenario 5 return.
 * Credit/dependent and adjustment claims stay in the source-fact inventory
 * until their remaining eligibility and source records are reconciled. */
export function scenario104005PartialInput() {
  const { taxpayer, w2 } = SCENARIO_1040_05_FACTS;
  return {
    general: {
      taxpayer_first_name: taxpayer.firstName,
      taxpayer_last_name: taxpayer.lastName,
      taxpayer_ssn: taxpayer.ssn,
      taxpayer_dob: taxpayer.dateOfBirth,
      taxpayer_blind: taxpayer.blind,
      address_line1: taxpayer.address.line1,
      address_city: taxpayer.address.city,
      address_state: taxpayer.address.state,
      address_zip: taxpayer.address.zip,
      filing_status: FilingStatus.HOH,
      digital_assets: taxpayer.digitalAssets,
      presidential_campaign_fund_taxpayer: taxpayer.presidentialCampaignFund,
    },
    f8812: [{
      do_not_claim_actc:
        SCENARIO_1040_05_FACTS.optOutOfAdditionalChildTaxCredit,
    }],
    w2: [{
      source_document_reference: "irs-ty2025-ats-1040-05-w2-page-4",
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

export const SCENARIO_1040_05_RECONCILIATION = {
  sourceUrl:
    "https://www.irs.gov/pub/irs-efile/ty25-1040-mef-ats-scenario-5-10202025.pdf",
  sourceSha256:
    "2ecfd873224b8d1e0912caa68682f3b06a8887565205808e0ed8777cc408c779",
  identityPage: 2,
  w2Page: 4,
  form1040Line1aWages: 31_232,
  form1040Line25aWithholding: 1_754,
  form1040Line28OptOut: true,
  form1040Line28Actc: 0,
  missing: [
    "Complete dependent joint-return, support and timely employment-valid SSN reviews, plus EIC and Schedule 8812 eligibility and credit-limit review.",
    "Complete Form 2441 benefit, earned-income and credit-limit review.",
    "Complete Form 8863 student/source eligibility and credit ordering.",
    "Complete Form 8862 prior-disallowance proof and unanswered claim questions.",
    "Reconcile the $1,475 cover amount with the marked storage-fees-only exception, prior foreign move and reimbursement evidence; do not infer a current Form 3903 move.",
  ],
} as const;

/** Printed household facts only; missing credit eligibility reviews stay absent. */
export function scenario104005HouseholdInput() {
  const input = scenario104005PartialInput();
  return {
    ...input,
    general: {
      ...input.general,
      dependents: SCENARIO_1040_05_FACTS.dependents.map((child) => ({
        first_name: child.firstName,
        last_name: child.lastName,
        name_control: child.lastName.slice(0, 4).toUpperCase(),
        irs_relationship_code: child.relationship === "son"
          ? IRSDependentRelationshipCode.Son
          : IRSDependentRelationshipCode.Daughter,
        ssn: child.ssn,
        dob: child.dateOfBirth,
        relationship: child.relationship === "son"
          ? DependentRelationship.Son
          : DependentRelationship.Daughter,
        months_in_home: child.monthsInHome,
        months_lived_with_you_in_us: child.monthsInHome,
        lived_in_us_over_half_year: true,
        qualifying_child_for_ctc: child.childTaxCredit,
      })),
    },
  };
}

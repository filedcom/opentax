import { FilingStatus, TS } from "../../nodes/types.ts";
import { Box12Code } from "../../nodes/inputs/income/wages/w2/index.ts";
import { SCENARIO_1040_12_FACTS } from "./ty2025_cases.ts";

/** Printed wage/business slice, not the complete Scenario 12 filing claim. */
export function scenario104012PartialInput() {
  const { taxpayer, w2, scheduleC: business } = SCENARIO_1040_12_FACTS;
  return {
    general: {
      taxpayer_first_name: taxpayer.firstName,
      taxpayer_last_name: taxpayer.lastName,
      taxpayer_ssn: taxpayer.ssn,
      address_line1: taxpayer.address.line1,
      address_city: taxpayer.address.city,
      address_state: taxpayer.address.state,
      address_zip: taxpayer.address.zip,
      filing_status: FilingStatus.Single,
      digital_assets: taxpayer.digitalAssets,
    },
    w2: [{
      source_document_reference: "irs-ty2025-ats-1040-12-w2-page-15",
      employee_ssn: w2.employeeSsn,
      employer_name: w2.employerName,
      employer_ein: w2.employerEin,
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
      box12_entries: [{ code: Box12Code.DD, amount: w2.box12CodeDD }],
      box13_retirement_plan: w2.retirementPlanChecked,
      box15_state: "KY",
      box16_state_wages: w2.stateWages,
      box17_state_withheld: w2.stateWithholding,
    }],
    schedule_c: [{
      business_reference: "irs-ty2025-ats-1040-12-schedule-c-page-8",
      proprietor_recipient: TS.T,
      line_a_principal_business: business.principalBusiness,
      line_b_business_code: business.businessCode,
      line_c_business_name: business.businessName,
      line_e_business_address: business.businessAddress,
      line_f_accounting_method: "cash" as const,
      line_g_material_participation: business.materialParticipation,
      line_i_made_1099_payments: business.made1099Payments,
      line_1_gross_receipts: business.grossReceipts,
      line_15_insurance: business.insurance,
      line_17_professional_services: business.professionalServices,
      line_18_office_expense: business.officeExpense,
      line_20b_rent_other: business.rentOtherBusinessProperty,
      line_22_supplies: business.supplies,
      line_23_taxes_licenses: business.taxesAndLicenses,
    }],
  };
}

export const SCENARIO_1040_12_RECONCILIATION = {
  sourceUrl:
    "https://www.irs.gov/pub/irs-efile/1040-mef-ats-scenario-12-10292025.pdf",
  sourceSha256:
    "f0bfcfda3c29e216687ba74c78a5c73f33d11487f82aab0808ee9cd128146c83",
  sourcePages: { scheduleC: [8, 9], scheduleSE: [10, 11], w2: 15 },
  printedScheduleSELine9: 62_722,
  reconciledScheduleSELine9: 70_222,
  missing: [
    "Resolve printed Schedule SE line 9 of 62,722 versus 176,100 less 105,878 = 70,222; tax is unchanged for this earnings amount.",
    "Resolve printed 15,000 versus current-law 15,750 single standard deduction.",
    "Resolve Form 7217 Part I basis 6,000 versus Part II 4,000 and retained distribution evidence.",
    "Establish the claimed 1,000 health-insurance deduction's eligibility and business allocation.",
    "Complete QBI adjustment/source review before asserting the full return's deduction and tax totals.",
  ],
} as const;

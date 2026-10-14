import { FilingStatus } from "../../nodes/types.ts";
import { SCENARIO_1040_02_FACTS } from "./ty2025_cases.ts";

/**
 * Source-only slice of the official TY2025 Form 1040 ATS Scenario 2 packet.
 * https://www.irs.gov/pub/irs-efile/1040-mef-ats-scenario-2-12012025.pdf
 *
 * The first W-2 is statutory-employee business income. The packet leaves
 * Schedule C line 1 blank, so its issued W-2 box 1 supplies that amount.
 * Form 8283 and the applied 2024 payment are deliberately excluded until
 * their classification and accepted-return evidence are available.
 */
export function scenario104002Input(): Record<string, unknown> {
  const facts = SCENARIO_1040_02_FACTS;
  return {
    general: {
      // Visually verified on official packet page 2; marks are absent from text extraction.
      filing_status: FilingStatus.MFJ,
      digital_assets: false,
      taxpayer_first_name: facts.taxpayer.firstName,
      taxpayer_last_name: facts.taxpayer.lastName,
      taxpayer_ssn: facts.taxpayer.ssn,
      taxpayer_dob: facts.taxpayer.dateOfBirth,
      spouse_first_name: facts.spouse.firstName,
      spouse_last_name: facts.spouse.lastName,
      spouse_ssn: facts.spouse.ssn,
      spouse_dob: facts.spouse.dateOfBirth,
      address_line1: facts.taxpayer.address.line1,
      address_city: facts.taxpayer.address.city,
      address_state: facts.taxpayer.address.state,
      address_zip: facts.taxpayer.address.zip,
      // The binary nonresident-spouse statement is assumed, not retained.
    },
    w2: facts.w2.map((form, index) => ({
      source_document_reference: `irs-ty2025-ats-1040-02-w2-page-${index + 4}`,
      schedule_c_business_reference: form.statutoryEmployee
        ? "ats-1040-02-statutory-business"
        : undefined,
      employee_ssn: form.employeeSsn,
      employer_name: form.employerName,
      employer_ein: form.employerEin,
      employer_address_line1: form.employerAddress.line1,
      employer_address_line2: "line2" in form.employerAddress
        ? form.employerAddress.line2
        : undefined,
      employer_address_city: form.employerAddress.city,
      employer_address_state: form.employerAddress.state,
      employer_address_zip: form.employerAddress.zip,
      box1_wages: form.box1Wages,
      box2_fed_withheld: form.box2FederalWithholding,
      box3_ss_wages: form.box3SocialSecurityWages,
      box4_ss_withheld: form.box4SocialSecurityWithholding,
      box5_medicare_wages: form.box5MedicareWages,
      box6_medicare_withheld: form.box6MedicareWithholding,
      box13_statutory_employee: form.statutoryEmployee,
      box17_state_withheld: form.stateIncomeTaxWithheld,
    })),
    schedule_a: {
      // Page 8 marks line 18. This is a partial Schedule A until gifts reconcile.
      force_itemized: true,
      // Keep W-2 tax inputs separate; its statutory-withholding omission is deferred.
      line_5b_real_estate_tax: facts.scheduleA.realEstateTax,
      line_8a_mortgage_interest_1098:
        facts.scheduleA.mortgageInterestReportedOn1098,
      line_8c_points_no_1098: facts.scheduleA.pointsNotReportedOn1098,
    },
    schedule_c: [{
      business_reference: "ats-1040-02-statutory-business",
      proprietor_recipient: "T",
      line_a_principal_business: facts.scheduleC.businessDescription,
      line_b_business_code: facts.scheduleC.businessCode,
      line_e_business_address: facts.scheduleC.businessAddress,
      line_f_accounting_method: "cash",
      line_g_material_participation: true,
      line_i_made_1099_payments: false,
      statutory_employee: true,
      line_1_gross_receipts: facts.w2[0].box1Wages,
      line_8_advertising: facts.scheduleC.advertising,
      line_9_car_truck_expenses: facts.scheduleC.carAndTruckExpenses,
      line_19_pension_plans: facts.scheduleC.pensionAndProfitSharing,
      line_22_supplies: facts.scheduleC.supplies,
      line_23_taxes_licenses: facts.scheduleC.taxesAndLicenses,
      line_44b_business_miles: facts.scheduleC.businessMiles,
      line_44c_commuting_miles: facts.scheduleC.commutingMiles,
      line_44d_other_miles: facts.scheduleC.otherMiles,
      line_43_date_in_service: facts.scheduleC.vehiclePlacedInService,
      line_45_personal_use: facts.scheduleC.vehicleAvailableForPersonalUse,
      line_46_another_vehicle: facts.scheduleC.anotherVehicleAvailable,
      line_47a_evidence: facts.scheduleC.mileageEvidence,
      line_47b_written_evidence: facts.scheduleC.mileageEvidenceWritten,
    }],
  };
}

export const SCENARIO_1040_02_RECONCILIATION = {
  statutoryW2Receipts: 29_513,
  regularW2Wages: 8_513,
  totalW2Withholding: 1_164,
  scheduleCExpenses: 2_534,
  scheduleCProfit: 26_979,
  missing: [
    "Form 8283 property AGI-limit classification is not established by the printed packet.",
    "The assumed Nonresident Spouse Choice Statement has no retained binary bytes.",
    "The $300 credit applied from 2024 lacks accepted-return and transfer evidence.",
    "The printed 1040 marks MFJ and digital-assets No, but leaves result lines blank.",
    "Schedule A marks the line 18 itemizing election; its line 8a mortgage amount has no retained Form 1098 source in this packet.",
  ],
} as const;

import { FilingStatus } from "../../nodes/types.ts";
import { SCENARIO_1040_01_FACTS } from "./ty2025_cases.ts";

/**
 * Supported source slice of the official TY2025 1040 ATS Scenario 1 packet.
 * https://www.irs.gov/pub/irs-efile/ty25-1040-mef-ats-scenario-1-12012025.pdf
 * Pages 4-5 contain the W-2s, page 9 contains Schedule H, and pages 12-13
 * contain the unresolved Form 5695 entries. This is not an ATS-ready return.
 */
export function scenario104001Input(): Record<string, unknown> {
  const facts = SCENARIO_1040_01_FACTS;
  return {
    general: {
      filing_status: FilingStatus.Single,
      taxpayer_first_name: facts.taxpayer.firstName,
      taxpayer_last_name: facts.taxpayer.lastName,
      taxpayer_ssn: facts.taxpayer.ssn,
      address_line1: facts.taxpayer.address.line1,
      address_city: facts.taxpayer.address.city,
      address_state: facts.taxpayer.address.state,
      address_zip: facts.taxpayer.address.zip,
      digital_assets: facts.taxpayer.digitalAssets,
    },
    w2: facts.w2.map((form, index) => ({
      // The packet contains two distinct issued W-2 pages with one printed
      // EIN. Their page-specific references keep both records in the graph.
      source_document_reference: `irs-ty2025-ats-1040-01-w2-page-${index + 4}`,
      employer_name: form.employerName,
      employer_ein: form.employerEin,
      employee_ssn: form.employeeSsn,
      employer_address_line1: form.employerAddress.line1,
      employer_address_city: form.employerAddress.city,
      employer_address_state: form.employerAddress.state,
      employer_address_zip: form.employerAddress.zip,
      box1_wages: form.box1Wages,
      box2_fed_withheld: form.box2FederalWithholding,
      box3_ss_wages: form.box3SocialSecurityWages,
      box4_ss_withheld: form.box4SocialSecurityWithholding,
      box5_medicare_wages: form.box5MedicareWages,
      box6_medicare_withheld: form.box6MedicareWithholding,
    })),
    schedule_h: {
      employer_ein: facts.scheduleH.employerEin,
      cash_wages_over_2025_limit: facts.scheduleH.cashWagesOver2025Limit,
      cash_wages_over_quarter_limit: facts.scheduleH.cashWagesOverQuarterLimit,
      ss_wages: facts.scheduleH.socialSecurityWages,
      medicare_wages: facts.scheduleH.medicareWages,
      additional_medicare_wages: facts.scheduleH.additionalMedicareWages,
      federal_income_tax_withheld: facts.scheduleH.federalWithholding,
    },
    // Form 5695 requires clarified line 19e/22b facts and QMID statements.
    // It must not be synthesized from the bounded three-door source slice.
  };
}

export const SCENARIO_1040_01_RECONCILIATION = {
  form5695: {
    individuallyListedDoorCosts: SCENARIO_1040_01_FACTS.form5695.exteriorDoors
      .map((door) => door.cost),
    printedLine19dNextTwoDoorsCost: 1_720,
    printedLine19eOtherDoorsCost: SCENARIO_1040_01_FACTS.form5695
      .line19eOtherDoorsCost,
    otherDoorItemsProvided: false,
    secondAirConditionerCost: SCENARIO_1040_01_FACTS.form5695
      .centralAirConditioners[1].cost,
    secondAirConditionerQmidProvided: false,
  },
  scheduleH: {
    socialSecurityTax: 384,
    medicareTax: 90,
    line8TotalTax: 474,
    schedule2Line9: 474,
  },
} as const;

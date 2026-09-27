import { FilingStatus } from "../../nodes/types.ts";
import { FuelType } from "../../nodes/inputs/f8911/index.ts";
import { SCENARIO_1040_13_FACTS } from "./ty2025_cases.ts";

/**
 * Complete source-fact input for TY2025 ATS Form 1040 Scenario 13.
 * Source: https://www.irs.gov/pub/irs-efile/1040-mef-ats-scenario-13.pdf
 * Pages 1-3: cover and 1040; 4: Schedule 3; 5-6: Form 6251; 7: Form 8911;
 * 8: Schedule A (Form 8911); 9: W-2.
 *
 * This is deliberately not an ATS-ready return. The PDF uses a $30,000 MFJ
 * standard deduction and bases Form 8911's $162 tax limit on that return.
 * Current TY2025 law/config uses $31,500. Do not replace either source value
 * with an invented current-law tax or silently claim the $162 credit.
 */
export function scenario104013Input(): Record<string, unknown> {
  const facts = SCENARIO_1040_13_FACTS;
  return {
    general: {
      filing_status: FilingStatus.MFJ,
      taxpayer_first_name: facts.taxpayer.firstName,
      taxpayer_last_name: facts.taxpayer.lastName,
      taxpayer_ssn: facts.taxpayer.ssn,
      spouse_first_name: facts.spouse.firstName,
      spouse_last_name: facts.spouse.lastName,
      spouse_ssn: facts.spouse.ssn,
      address_line1: facts.taxpayer.address.line1,
      address_city: facts.taxpayer.address.city,
      address_state: facts.taxpayer.address.state,
      address_zip: facts.taxpayer.address.zip,
      digital_assets: facts.taxpayer.digitalAssets,
    },
    w2: [{
      employer_name: facts.w2.employerName,
      employer_ein: facts.w2.employerEin,
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
    f8911: {
      cost: facts.form8911ScheduleA.qualifiedCost,
      business_use_pct: facts.form8911ScheduleA.businessUsePercentage / 100,
      fuel_type: FuelType.ElectricCharging,
      property_description: facts.form8911ScheduleA.propertyDescription,
      property_us_address: facts.taxpayer.address,
      construction_began: facts.form8911ScheduleA.constructionBegan,
      placed_in_service: facts.form8911ScheduleA.placedInService,
      eligible_census_tract: facts.form8911ScheduleA.eligibleCensusTract,
      census_tract_geoid: facts.form8911ScheduleA.censusTractGeoid,
      main_home_property: facts.form8911ScheduleA.mainHomeProperty,
      // The PDF's $162 regular-tax limit belongs to its $30,000 deduction.
      // Do not pass it as a current-law Form 8911 input. The graph must stop
      // until the current return's tax and AMT worksheet are reconciled.
    },
  };
}

export const SCENARIO_1040_13_RECONCILIATION = {
  sourceUrl: "https://www.irs.gov/pub/irs-efile/1040-mef-ats-scenario-13.pdf",
  printed: {
    form1040Pages: [2, 3],
    form8911Page: 7,
    form6251Page: 5,
    schedule3Page: 4,
    schedule8911APage: 8,
    w2Page: 9,
    wages: SCENARIO_1040_13_FACTS.printedForm1040.line1aWages,
    adjustedGrossIncome: SCENARIO_1040_13_FACTS.printedForm1040
      .line11AdjustedGrossIncome,
    standardDeduction: SCENARIO_1040_13_FACTS.printedForm1040
      .line12StandardDeduction,
    taxableIncome: SCENARIO_1040_13_FACTS.printedForm1040.line15TaxableIncome,
    regularTax: SCENARIO_1040_13_FACTS.printedForm1040.line16Tax,
    allowedRefuelingCredit: SCENARIO_1040_13_FACTS.form8911
      .printedAllowedPersonalCredit,
    schedule3Credit: SCENARIO_1040_13_FACTS.printedForm1040
      .line20Schedule3Credit,
    alternativeMinimumTax: SCENARIO_1040_13_FACTS.form6251
      .line11AlternativeMinimumTax,
    totalTax: SCENARIO_1040_13_FACTS.printedForm1040.line24TotalTax,
    withholding: SCENARIO_1040_13_FACTS.w2.box2FederalWithholding,
    refund: SCENARIO_1040_13_FACTS.printedForm1040.line35aRefund,
  },
  current2025: {
    standardDeduction: 31_500,
    taxableIncomeBeforeAnyOtherAdjustments:
      SCENARIO_1040_13_FACTS.w2.box1Wages - 31_500,
  },
} as const;

import { FilingStatus } from "../../nodes/types.ts";
import { SCENARIO_1040_01_FACTS } from "./ty2025_cases.ts";

/**
 * TY2025 Form 1040 ATS Scenario 1.
 * https://www.irs.gov/pub/irs-efile/ty25-1040-mef-ats-scenario-1-12012025.pdf
 * Pages 2-3 Form 1040, 4-5 W-2s, 9 Schedule H, 11-14 Form 5695.
 */

/** Facts a guard requires that the packet does not print. None changes tax. */
export const SCENARIO_1040_01_ASSUMPTIONS = [
  {
    field: "general.taxpayer_dob",
    value: "1985-04-15",
    why:
      "Packet prints no birth date; Form 1040 line 12d 'born before January 2, 1961' is unchecked.",
  },
  {
    field: "general.taxpayer_prior_year_agi",
    value: 0,
    why: "Packet prints no 2024 AGI.",
  },
  {
    field: "schedule_h.fica_only_payroll.employee_wages[0]",
    value:
      "one unrelated adult employee, $3,100 cash wages paid $775 per quarter, no W-4 withholding, issued W-2 boxes 3/5 $3,100 and box 2 0",
    why:
      "Schedule H prints only aggregate line 1/3 wages of $3,100 with line A Yes, line 7 0 and line 9 No; the guard needs the employee record behind them.",
  },
  {
    field: "schedule_h.fica_only_payroll.prior_year_quarter_cash_wages",
    value: [0, 0, 0, 0],
    why:
      "Line 9 No means no 2024 or 2025 quarter reached $1,000; the packet prints no 2024 payroll.",
  },
  {
    field: "f5695.part_ii_section_a.exterior_doors[3..6]",
    value: "four further doors of $685 each, QMIDs A1B7, A1B8, A1B9, A1C0",
    why:
      "Line 19e prints $2,740 for other doors without the itemized QMID/cost statement; each is priced below the $800 line 19d(ii) door so lines 19a and 19d keep their printed values. Line 19h is $500 with or without them.",
  },
  {
    field: "f5695.part_ii_section_b.other_central_air_conditioners[0].qmid",
    value: "A1C1",
    why:
      "Line 22b prints $400 for another central air conditioner without its QMID; line 22d is $600 either way.",
  },
] as const;

const ASSUMED_OTHER_DOOR_QMIDS = ["A1B7", "A1B8", "A1B9", "A1C0"] as const;

export function scenario104001Input(): Record<string, unknown> {
  const facts = SCENARIO_1040_01_FACTS;
  const home = {
    line1: facts.taxpayer.address.line1,
    city: facts.taxpayer.address.city,
    state: facts.taxpayer.address.state,
    zip: facts.taxpayer.address.zip,
  };
  const otherDoorCost = facts.form5695.line19eOtherDoorsCost /
    ASSUMED_OTHER_DOOR_QMIDS.length;
  const [firstAc, secondAc] = facts.form5695.centralAirConditioners;
  return {
    general: {
      ats_test_submission: true,
      filing_status: FilingStatus.Single,
      taxpayer_first_name: facts.taxpayer.firstName,
      taxpayer_last_name: facts.taxpayer.lastName,
      taxpayer_ssn: facts.taxpayer.ssn,
      taxpayer_dob: SCENARIO_1040_01_ASSUMPTIONS[0].value,
      taxpayer_prior_year_agi: SCENARIO_1040_01_ASSUMPTIONS[1].value,
      address_line1: facts.taxpayer.address.line1,
      address_city: facts.taxpayer.address.city,
      address_state: facts.taxpayer.address.state,
      address_zip: facts.taxpayer.address.zip,
      digital_assets: facts.taxpayer.digitalAssets,
    },
    w2: facts.w2.map((form, index) => ({
      // Two issued W-2 pages print the same EIN; page references keep both.
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
      box15_state: "GA",
      box16_state_wages: form.stateWages,
      box17_state_withheld: form.stateIncomeTaxWithheld,
    })),
    schedule_h: {
      employer_ein: facts.scheduleH.employerEin,
      cash_wages_over_2025_limit: facts.scheduleH.cashWagesOver2025Limit,
      cash_wages_over_quarter_limit: facts.scheduleH.cashWagesOverQuarterLimit,
      ss_wages: facts.scheduleH.socialSecurityWages,
      medicare_wages: facts.scheduleH.medicareWages,
      additional_medicare_wages: facts.scheduleH.additionalMedicareWages,
      federal_income_tax_withheld: facts.scheduleH.federalWithholding,
      fica_only_payroll: {
        all_household_employees_included: true,
        prior_year_payroll_source_reference:
          "ats-1040-01-assumed-2024-household-payroll",
        prior_year_quarter_cash_wages: SCENARIO_1040_01_ASSUMPTIONS[3].value,
        employee_wages: [{
          employee_id: "ats-1040-01-household-employee-1",
          payroll_source_reference: "ats-1040-01-assumed-2025-household-payroll",
          relationship: "unrelated",
          age_18_or_older_for_fica: true,
          ordinary_cash_only: true,
          annual_cash_wages: facts.scheduleH.socialSecurityWages,
          quarterly_cash_wages: [775, 775, 775, 775],
          w2: {
            source_reference: "ats-1040-01-assumed-household-w2",
            box2_federal_income_tax_withheld: facts.scheduleH.federalWithholding,
            box3_social_security_wages: facts.scheduleH.socialSecurityWages,
            box5_medicare_wages: facts.scheduleH.medicareWages,
          },
        }],
      },
    },
    f5695: {
      part_i_home_address: home,
      part_ii_tax_limit: SCENARIO_1040_01_RECONCILIATION.form5695
        .line31TaxLimit,
      part_ii_section_a: {
        main_home_in_us:
          facts.form5695.qualifiedEnergyEfficiencyImprovementsInstalledInUS,
        original_user: facts.form5695.originalUserOfImprovements,
        five_year_use: facts.form5695.improvementsExpectedToRemainInUseFiveYears,
        home_address: home,
        related_to_new_home:
          facts.form5695.improvementsRelatedToHomeConstruction,
        exterior_doors: [
          ...facts.form5695.exteriorDoors,
          ...ASSUMED_OTHER_DOOR_QMIDS.map((qmid) => ({
            cost: otherDoorCost,
            qmid,
          })),
        ],
        windows: facts.form5695.windows,
      },
      part_ii_section_b: {
        home_in_us: facts.form5695.residentialEnergyPropertyCostsIncurred,
        originally_placed_in_service: facts.form5695
          .residentialEnergyPropertyOriginallyPlacedInServiceByTaxpayer,
        home_addresses: [home],
        central_air_conditioner: firstAc,
        other_central_air_conditioners: [{
          cost: secondAc.cost,
          qmid: SCENARIO_1040_01_ASSUMPTIONS[5].value,
        }],
      },
    },
  };
}

export const SCENARIO_1040_01_RECONCILIATION = {
  missing: [
    "Form 5695 page 12 line 19e prints $2,740 for other doors, equal to lines 19a+19d ($1,020+$920+$800), without a fourth door or QMID statement. Filed as printed with an assumed itemization; line 19h is $500 either way.",
    "Form 5695 page 13 line 22b prints $400 for another central air conditioner without the QMID the 2025 instructions require. Filed with an assumed QMID; line 22d is $600 either way.",
  ],
  /** Amounts the packet prints. */
  printed: {
    line1aWages: 42_470,
    line25aW2Withholding: 2_713,
    form5695Line19a: 1_020,
    form5695Line19d: 1_720,
    form5695Line19e: 2_740,
    form5695Line20a: 600,
    form5695Line22a: 2_100,
    form5695Line22b: 400,
  },
  /** Amounts that follow from the printed entries by each form's own arithmetic. */
  form5695: {
    // Limit worksheet line 3: Form 1040 line 18, the 2025 Tax Table amount
    // for $26,720 single taxable income ($42,470 - $15,750), less no credits.
    line31TaxLimit: 2_969,
    line19c: 250,
    line19f: 4_460,
    line19g: 1_338,
    line19h: 500,
    line20d: 180,
    line22c: 2_500,
    line22d: 600,
    line27: 1_280,
    line28: 1_200,
    line32: 1_200,
  },
  scheduleH: {
    socialSecurityTax: 384,
    medicareTax: 90,
    line8TotalTax: 474,
    schedule2Line9: 474,
  },
} as const;

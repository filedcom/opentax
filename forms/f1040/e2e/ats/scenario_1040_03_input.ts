import { DistributionCode } from "../../nodes/inputs/f1099r/index.ts";
import { SCENARIO_1040_03_FACTS } from "./ty2025_cases.ts";

/**
 * TY2025 ATS Scenario 3 is a source-fact packet, not a completed return.
 * https://www.irs.gov/pub/irs-efile/ty25-1040-mef-ats-scenario-3-10202025.pdf
 * PDF pp. 1-4: cover, blank 1040, 1099-R; pp. 9-10: Schedule D;
 * pp. 11-12: Schedule E; pp. 13-14: Schedule F; pp. 15-16: Schedule SE;
 * p. 17: Form 4835. The PDF leaves Form 1040 filing status and result lines
 * blank, so this fragment must not be transmitted as an ATS return.
 */
export const SCENARIO_1040_03_SOURCE = {
  scheduleD: {
    shortTermLine1aProceeds: 14_222,
    shortTermLine1aBasis: 12_234,
    longTermLine8aProceeds: 14_211,
    longTermLine8aBasis: 4_486,
    qualifiedOpportunityFundDisposition: false,
    specialRateGainLine18: 0,
    unrecaptured1250GainLine19: 0,
  },
  scheduleE: {
    paymentsRequiring1099: true,
    required1099FiledOrWillFile: true,
    // Part I has no property, rents, royalties, or expenses entered.
  },
  scheduleF: {
    principalActivity: "Floral Plants",
    agriculturalActivityCode: "111400",
    accountingMethod: "cash",
    materiallyParticipated: true,
    paymentsRequiring1099: false,
    line1aPurchasedLivestockAndResaleSales: 8_111,
    line1bResaleBasis: 0,
    line11Chemicals: 750,
    line16Feed: 890,
    line17Fertilizer: 250,
    line26Seeds: 2_970,
  },
  form4835: {
    // The active-participation answer is blank, not a printed No.
    activelyParticipated: null,
    line1ProductionIncome: 17_035,
    line2aCooperativeDistributionsGross: 0,
    line3aAgriculturalProgramPaymentsGross: 0,
    line4aCccLoansElection: 0,
    line4bCccLoansForfeitedGross: 0,
    line5aCropInsuranceReceived: 0,
    line6OtherIncome: 0,
    line9Chemicals: 879,
    line14Feed: 350,
    line17Gasoline: 690,
    line23Repairs: 1_355,
    line26Supplies: 2_700,
  },
} as const;

/** Only tax facts explicitly present in the packet are passed to the graph. */
export function scenario104003Input(): Record<string, unknown> {
  const facts = SCENARIO_1040_03_FACTS;
  const source = SCENARIO_1040_03_SOURCE;
  return {
    general: {
      taxpayer_first_name: facts.taxpayer.firstName,
      taxpayer_last_name: facts.taxpayer.lastName,
      taxpayer_ssn: facts.taxpayer.ssn,
      taxpayer_dob: facts.taxpayer.dateOfBirth,
      address_line1: facts.taxpayer.address.line1,
      address_city: facts.taxpayer.address.city,
      address_state: facts.taxpayer.address.state,
      address_zip: facts.taxpayer.address.zip,
      // No filing status or digital-asset answer is marked on the 1040.
    },
    f1099r: [{
      payer_name: facts.form1099R.payerName,
      payer_ein: facts.form1099R.payerEin,
      payer_address_line1: "1231 Juniper Street",
      payer_address_city: "Paul",
      payer_address_state: "ID",
      payer_address_zip: "83347",
      recipient_address_line1: facts.taxpayer.address.line1,
      recipient_address_city: facts.taxpayer.address.city,
      recipient_address_state: facts.taxpayer.address.state,
      recipient_address_zip: facts.taxpayer.address.zip,
      box1_gross_distribution: facts.form1099R.grossDistribution,
      box2a_taxable_amount: facts.form1099R.taxableAmount,
      box4_federal_withheld: facts.form1099R.federalWithholding,
      box7_distribution_code: DistributionCode.Code7,
    }],
    schedule_f: {
      farm_optional_method_elected: true,
      schedule_fs: [{
        line_a_principal_crop_activity: source.scheduleF.principalActivity,
        line_b_agricultural_activity_code:
          source.scheduleF.agriculturalActivityCode,
        accounting_method: source.scheduleF.accountingMethod,
        line_e_material_participation: source.scheduleF.materiallyParticipated,
        line_f_made_1099_payments: source.scheduleF.paymentsRequiring1099,
        line1_sales_livestock_resale:
          source.scheduleF.line1aPurchasedLivestockAndResaleSales,
        line1b_cost_livestock_resale: source.scheduleF.line1bResaleBasis,
        line11_chemicals: source.scheduleF.line11Chemicals,
        line16_feed: source.scheduleF.line16Feed,
        line17_fertilizers: source.scheduleF.line17Fertilizer,
        line26_seeds: source.scheduleF.line26Seeds,
      }],
    },
    // Schedule D's 1a/8a totals are printed, but no source 1099-B/1099-DA
    // transaction details are supplied. Form 4835's activity name is absent.
    // They stay in the source/reconciliation record, not fabricated inputs.
  };
}

export const SCENARIO_1040_03_RECONCILIATION = {
  sourceUrl:
    "https://www.irs.gov/pub/irs-efile/ty25-1040-mef-ats-scenario-3-10202025.pdf",
  pages: {
    cover: 1,
    form1040: [2, 3],
    form1099R: 4,
    scheduleD: [9, 10],
    scheduleE: [11, 12],
    scheduleF: [13, 14],
    scheduleSE: [15, 16],
    form4835: 17,
  },
  printedSource: {
    pensionGross: 53_778,
    pensionTaxable: 43_100,
    pensionWithholding: 3_405,
    taxableStateRefund: 3_110,
    scheduleDShortProceeds: 14_222,
    scheduleDShortBasis: 12_234,
    scheduleDLongProceeds: 14_211,
    scheduleDLongBasis: 4_486,
    scheduleFGrossSales: 8_111,
    scheduleFResaleBasis: 0,
    scheduleFExpenseEntries: [750, 890, 250, 2_970],
    form4835ProductionIncome: 17_035,
    form4835ExpenseEntries: [879, 350, 690, 1_355, 2_700],
  },
  sourceDerived: {
    // These are arithmetic from filled source lines, not printed totals.
    scheduleDShortGain: 1_988,
    scheduleDLongGain: 9_725,
    scheduleDCombinedGain: 11_713,
    scheduleFExpenses: 4_860,
    scheduleFNetProfit: 3_251,
    form4835Expenses: 5_974,
    form4835NetIncome: 11_061,
    schedule1AdditionalIncomeBeforeOtherItems: 17_422,
    grossIncomeBeforeOtherItems: 72_235,
    farmOptionalMethodGrossIncomeLimit: 10_860,
    farmOptionalMethodNetProfitLimit: 7_840,
    farmOptionalMethodMaximum: 7_240,
    // 2/3 x 8,111 is 5,407.333..., subject to Form SE whole-dollar rules.
    farmOptionalMethodTwoThirdsGrossNumerator: 16_222,
    farmOptionalMethodTwoThirdsGrossDenominator: 3,
  },
  notAtsReadyBecause: [
    "Form 1040 pp. 2-3 do not mark a filing status or digital-asset answer; all result lines are blank.",
    "Schedule D p. 9 gives only aggregate 1a/8a proceeds and basis, not the underlying 1099-B or 1099-DA transaction records required by the source graph.",
    "Form 4835 p. 17 gives income and expenses but no activity identifier; its active-participation checkbox is blank.",
    "The cover says the taxpayer is a specified agricultural-cooperative patron, but no patronage or cooperative-sale allocation facts are supplied for any QBI cooperative reduction.",
    "The taxpayer elects Schedule SE's farm optional method; its calculation and MeF/PDF mapping are coded, but end-to-end validation and any farm K-1 or CRP facts remain pending.",
    "Schedule SE pp. 15-16 and Schedule 1 pp. 5-6 leave all calculated lines blank; the farm optional-method election supplies no printed SE-tax target.",
    "No completed 1040 tax, deduction, payment, or refund target is printed, so current-law output cannot be asserted equal to a printed return.",
  ],
} as const;

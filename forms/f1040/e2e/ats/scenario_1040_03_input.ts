import { FilingStatus, TS } from "../../nodes/types.ts";
import { DistributionCode } from "../../nodes/inputs/income/retirement/f1099r/index.ts";
import { SCENARIO_1040_03_FACTS } from "./ty2025_cases.ts";

/**
 * TY2025 ATS Scenario 3, transcribed from the issued packet:
 * https://www.irs.gov/pub/irs-efile/ty25-1040-mef-ats-scenario-3-10202025.pdf
 * PDF pp. 1-4: cover, uncomputed 1040, 1099-R; pp. 9-10: Schedule D;
 * pp. 11-12: Schedule E; pp. 13-14: Schedule F; pp. 15-16: Schedule SE;
 * p. 17: Form 4835. The packet leaves result lines blank; facts it omits but
 * export requires are listed in SCENARIO_1040_03_ASSUMPTIONS.
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
    // Page 17 visibly marks Yes; text extraction omits the checkbox.
    activelyParticipated: true,
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

const ASSUMED = {
  saleDate: "2025-12-31",
  brokerCopyReference: "irs-ty2025-ats-1040-03-schedule-d-page-9",
  refundPayerName: "Idaho State Tax Commission",
  refundPayerTin: "000000009",
  refundCopyReference: "irs-ty2025-ats-1040-03-cover-state-refund",
  refundWorkpaperReference: "irs-ty2025-ats-1040-03-cover-taxable-refund",
  refundGross: SCENARIO_1040_03_FACTS.taxableStateTaxRefund,
  refundTaxYear: 2024,
  priorYearAgi: 0,
} as const;

/** Facts export requires that the packet does not print; none changes tax. */
export const SCENARIO_1040_03_ASSUMPTIONS = [
  {
    field: "f1099b[*].date_acquired / date_sold",
    value: `VARIOUS / ${ASSUMED.saleDate}`,
    why:
      "Schedule D p. 9 prints only line 1a/8a totals; export replays them from retained basis-reported sales, which need a 2025 sale date.",
  },
  {
    field: "f1099b[*].source_document_reference",
    value: ASSUMED.brokerCopyReference,
    why: "No broker copy is issued; the reference names the printed page.",
  },
  {
    field: "f1099g[0].payer_name / payer_tin",
    value: `${ASSUMED.refundPayerName} / ${ASSUMED.refundPayerTin}`,
    why:
      "The cover gives only the taxable refund; the Idaho taxpayer's state payer and the packet's 00-0000009 test TIN pattern are assumed.",
  },
  {
    field: "f1099g[0].box_2_state_refund",
    value: String(ASSUMED.refundGross),
    why:
      "The cover gives the taxable amount only; the gross refund is taken equal to it, so the taxable recovery is unchanged.",
  },
  {
    field: "f1099g[0].box_2_prior_year_itemized / box_3_tax_year",
    value: `true / ${ASSUMED.refundTaxYear}`,
    why:
      "A taxable state refund implies a 2024 itemized state-tax deduction.",
  },
  {
    field: "general.taxpayer_prior_year_agi",
    value: String(ASSUMED.priorYearAgi),
    why: "The packet gives no 2024 AGI for the Self-Select PIN.",
  },
  {
    field: "general.qbi_deduction_not_claimed",
    value: "true",
    why:
      "The packet lists no Form 8995 or 8995-A. As a cooperative patron the taxpayer would need Form 8995-A Schedule D facts that the packet does not give. Scenario 12 also prints line 13a blank despite Schedule C profit.",
  },
] as const;

const BROKER_COPY = {
  recipient_ssn: SCENARIO_1040_03_FACTS.taxpayer.ssn,
  source_document_reference: ASSUMED.brokerCopyReference,
} as const;

/** Packet facts plus the recorded assumptions above. */
export function scenario104003Input(): Record<string, unknown> {
  const facts = SCENARIO_1040_03_FACTS;
  const source = SCENARIO_1040_03_SOURCE;
  return {
    general: {
      ats_test_submission: true,
      // Visually verified on official packet page 2; marks are absent from text extraction.
      filing_status: FilingStatus.Single,
      digital_assets: true,
      taxpayer_first_name: facts.taxpayer.firstName,
      taxpayer_last_name: facts.taxpayer.lastName,
      taxpayer_ssn: facts.taxpayer.ssn,
      taxpayer_dob: facts.taxpayer.dateOfBirth,
      taxpayer_ip_pin: facts.taxpayer.identityProtectionPin,
      taxpayer_prior_year_agi: ASSUMED.priorYearAgi,
      // Page 2 checks "You" for the Presidential Election Campaign.
      presidential_campaign_fund_taxpayer: true,
      qbi_deduction_not_claimed: true,
      address_line1: facts.taxpayer.address.line1,
      address_city: facts.taxpayer.address.city,
      address_state: facts.taxpayer.address.state,
      address_zip: facts.taxpayer.address.zip,
    },
    f1099g: [{
      payer_name: ASSUMED.refundPayerName,
      payer_tin: ASSUMED.refundPayerTin,
      recipient_tin: facts.taxpayer.ssn,
      source_document_reference: ASSUMED.refundCopyReference,
      box_2_state_refund: ASSUMED.refundGross,
      box_2_prior_year_itemized: true,
      box_2_taxable_recovery_verified_amount: facts.taxableStateTaxRefund,
      box_2_recovery_workpaper_reference: ASSUMED.refundWorkpaperReference,
      box_3_tax_year: ASSUMED.refundTaxYear,
    }],
    f1099r: [{
      // Recipient and unmarked boxes visually verified on issued Copy B.
      recipient_ssn: facts.taxpayer.ssn,
      ts: TS.T,
      box2b_not_determined: false,
      box2b_total_dist: false,
      box7_ira_simple_indicator: false,
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
    f4835: [{
      // Internal source labels identify the single issued page, not an asserted farm name.
      activity_id: "irs-ty2025-ats-1040-03-form4835-page-17",
      activity_name: "ATS 1040-03 Form 4835 page 17",
      actively_participated: source.form4835.activelyParticipated,
      // Schedule E p. 11 lines A and B both check Yes; Part I has no property.
      schedule_e_1099_payments_made: source.scheduleE.paymentsRequiring1099,
      schedule_e_1099_filed: source.scheduleE.required1099FiledOrWillFile,
      livestock_crop_income: source.form4835.line1ProductionIncome,
      cooperative_distributions_gross:
        source.form4835.line2aCooperativeDistributionsGross,
      agricultural_program_payments_gross:
        source.form4835.line3aAgriculturalProgramPaymentsGross,
      ccc_loans_reported_election: source.form4835.line4aCccLoansElection,
      ccc_loans_forfeited_gross: source.form4835.line4bCccLoansForfeitedGross,
      crop_insurance_disaster_received:
        source.form4835.line5aCropInsuranceReceived,
      other_income: source.form4835.line6OtherIncome,
      expense_chemicals: source.form4835.line9Chemicals,
      expense_feed: source.form4835.line14Feed,
      expense_gasoline: source.form4835.line17Gasoline,
      expense_repairs_maintenance: source.form4835.line23Repairs,
      expense_supplies: source.form4835.line26Supplies,
    }],
    // Official page 9 prints only basis-reported, no-adjustment totals.
    f1099b: [
      {
        ...BROKER_COPY,
        transaction_id: "line-1a",
        part: "A",
        description: "Short-term covered sales (Schedule D line 1a)",
        date_acquired: "VARIOUS",
        date_sold: ASSUMED.saleDate,
        proceeds: source.scheduleD.shortTermLine1aProceeds,
        cost_basis: source.scheduleD.shortTermLine1aBasis,
        box12_basis_reported_to_irs: true,
      },
      {
        ...BROKER_COPY,
        transaction_id: "line-8a",
        part: "D",
        description: "Long-term covered sales (Schedule D line 8a)",
        date_acquired: "VARIOUS",
        date_sold: ASSUMED.saleDate,
        proceeds: source.scheduleD.longTermLine8aProceeds,
        cost_basis: source.scheduleD.longTermLine8aBasis,
        box12_basis_reported_to_irs: true,
      },
    ],
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
    "Exports without --force once the shared ATS header and test-EIN mode land. The XML validates against the TY2025 v5.4 XSD.",
    "The packet prints no Form 1040 result lines. Its forms list has no Form 8995 or 8995-A, so the return claims no QBI deduction; IRS clarification is requested for the cooperative-patron note.",
    "The state-refund payer, gross refund and prior-year workpaper, and the Schedule D sale dates, are recorded assumptions.",
    "Form 4835 p. 17 active participation does not establish QBI eligibility for the farm rental.",
  ],
} as const;

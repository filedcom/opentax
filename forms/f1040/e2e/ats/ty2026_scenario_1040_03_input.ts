import { FilingStatus, TS } from "../../nodes/types.ts";
import { DistributionCode } from "../../nodes/inputs/income/retirement/f1099r/index.ts";
import type { Ty2026PacketTarget } from "./ty2026-ats.ts";

/**
 * TY2026 Form 1040 ATS Scenario 3 (18 pages, draft 9/22/2026): page 1 cover,
 * 2-3 Form 1040, 4 Form 1099-R, 5-6 Schedule 1, 7-8 Schedule 2, 9-10
 * Schedule D, 11-13 Schedule E, 14-15 Schedule F, 16-17 Schedule SE, 18 Form
 * 4835. Schedules 1, 2 and E print no amounts; the 1040 prints only line 1z.
 * https://www.irs.gov/pub/irs-efile/1040-mef-ats-scenario-3-09222026.pdf
 */
const PACKET = "irs-ty2026-ats-1040-03";

export const SCENARIO_1040_03_TY2026_FACTS = {
  // Page 1 cover and page 2.
  taxpayer: {
    firstName: "Lynette",
    lastName: "Heather",
    ssn: "400001035",
    dateOfBirth: "1968-10-02",
    identityProtectionPin: "876534",
    address: {
      line1: "2525 Juniper Street",
      city: "Paul",
      state: "ID",
      zip: "83347",
    },
    // Page 2: single, digital assets Yes, presidential campaign "You".
    digitalAssets: true,
  },
  taxableStateTaxRefund: 4_089,
  farmOptionalMethodElected: true,
  incomeAveragingElected: false,
  specifiedAgriculturalCooperativePatron: true,
  qualifiedOpportunityFundInvestment: false,
  // Page 2.
  form1040Line1z: 0,
  // Page 4.
  form1099R: {
    payerName: "Primrose Retirement Fund",
    payerEin: "000000009",
    payerAddress: {
      line1: "1231 Juniper Street",
      city: "Paul",
      state: "ID",
      zip: "83347",
    },
    grossDistribution: 57_766,
    taxableAmount: 49_568,
    federalWithholding: 4_980,
  },
  // Pages 9-10: QOF "No"; line 17 and 20 "Yes".
  scheduleD: {
    line1aProceeds: 15_234,
    line1aBasis: 12_768,
    line8aProceeds: 16_321,
    line8aBasis: 4_900,
    line18: 0,
    line19: 0,
  },
  // Page 11: lines A and B "Yes"; no property.
  scheduleE: { paymentsRequiring1099: true, required1099Filed: true },
  // Page 14: line E "Yes", F "No", G blank.
  scheduleF: {
    principalActivity: "Floral Plants",
    agriculturalActivityCode: "111400",
    line1a: 9_233,
    line1b: 0,
    line11Chemicals: 876,
    line16Feed: 675,
    line17Fertilizers: 1_488,
    line26Seeds: 1_222,
    line28Supplies: 765,
  },
  // Page 16.
  scheduleSE: { line4a: 0, line5b: 0, line7: 184_500, line8d: 0 },
  // Page 18: line A "Yes".
  form4835: {
    activelyParticipated: true,
    line1: 19_233,
    line2a: 0,
    line3a: 0,
    line4a: 0,
    line4b: 0,
    line5a: 0,
    line6: 0,
    line9Chemicals: 900,
    line14Feed: 465,
    line15Fertilizers: 700,
    line22aVehiclesMachinery: 3_222,
    line26Supplies: 2_038,
  },
} as const;

const F = SCENARIO_1040_03_TY2026_FACTS;
const { form1099R: r, scheduleD: d, scheduleF: sf, form4835: f4835 } = F;
const ASSUMED = {
  saleDate: "2026-12-31",
  brokerCopyReference: `${PACKET}-schedule-d-page-9`,
  refundPayerName: "Idaho State Tax Commission",
  refundPayerTin: "000000009",
  refundTaxYear: 2025,
} as const;

/** Facts a guard requires that the packet does not print. None changes tax. */
export const SCENARIO_1040_03_TY2026_ASSUMPTIONS = [
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
    field: "f1099b[*] date_acquired / date_sold / source reference",
    value: `VARIOUS / ${ASSUMED.saleDate} / ${ASSUMED.brokerCopyReference}`,
    why:
      "Schedule D page 9 prints only the line 1a and 8a totals; export replays them from basis-reported sales, which need a 2026 sale date. No broker copy is in the packet.",
  },
  {
    field: "f1099g[0] payer, gross refund and prior-year itemizing",
    value:
      `${ASSUMED.refundPayerName}, TIN ${ASSUMED.refundPayerTin}; gross refund = taxable $4,089; 2025 itemized`,
    why:
      "The cover gives only the taxable refund. Taking the gross equal to it leaves the taxable recovery unchanged.",
  },
  {
    field: "general.qbi_deduction_not_claimed",
    value: true,
    why:
      "The packet lists no Form 8995 or 8995-A; as a cooperative patron the taxpayer would need Form 8995-A Schedule D facts the packet does not give.",
  },
] as const;

export const SCENARIO_1040_03_TY2026_RECONCILIATION = {
  conflicts: [],
} as const;

const value = (
  page: number,
  line: string,
  path: string | null,
  expected: number | string,
): Ty2026PacketTarget => ({ page, line, path, expected });

/** Every amount the packet prints, by the MeF element that carries it. */
export const SCENARIO_1040_03_TY2026_TARGETS: readonly Ty2026PacketTarget[] = [
  value(2, "1040 line 1z", "IRS1040/WagesSalariesAndTipsAmt", F.form1040Line1z),
  value(
    1,
    "Schedule 1 line 1",
    "IRS1040Schedule1/StateLocalIncomeTaxRefundAmt",
    F.taxableStateTaxRefund,
  ),
  ...([
    ["box 1", "GrossDistributionAmt", r.grossDistribution],
    ["box 2a", "TaxableAmt", r.taxableAmount],
    ["box 4", "FederalIncomeTaxWithheldAmt", r.federalWithholding],
    ["payer EIN", "PayerEIN", r.payerEin],
    ["box 7", "F1099RDistributionCd", "7"],
  ] as const).map(([line, element, expected]) =>
    value(4, `1099-R ${line}`, `IRS1099R/${element}`, expected)
  ),
  ...([
    ["1a(d)", "TotalSTCGL1099BssRptNoAdjGrp/TotalProceedsSalesPriceAmt", d.line1aProceeds],
    ["1a(e)", "TotalSTCGL1099BssRptNoAdjGrp/TotalCostOrOtherBasisAmt", d.line1aBasis],
    ["8a(d)", "TotalLTCGL1099BssRptNoAdjGrp/TotalProceedsSalesPriceAmt", d.line8aProceeds],
    ["8a(e)", "TotalLTCGL1099BssRptNoAdjGrp/TotalCostOrOtherBasisAmt", d.line8aBasis],
  ] as const).map(([line, element, expected]) =>
    value(9, `Schedule D line ${line}`, `IRS1040ScheduleD/${element}`, expected)
  ),
  value(10, "Schedule D line 18", "IRS1040ScheduleD/RateGainWrkshtAmt", d.line18),
  value(
    10,
    "Schedule D line 19",
    "IRS1040ScheduleD/UnrcptrSect1250GainWrkshtAmt",
    d.line19,
  ),
  ...([
    ["B", "AgriculturalActivityCd", sf.agriculturalActivityCode],
    ["1a", "FarmIncomeCashMethodGrp/SalesOfLvstckBghtForResaleAmt", sf.line1a],
    ["1b", "FarmIncomeCashMethodGrp/CostOfLvstckBghtForResaleAmt", sf.line1b],
    ["11", "FarmExpensesGrp/ChemicalExpenseAmt", sf.line11Chemicals],
    ["16", "FarmExpensesGrp/FeedPurchasedExpenseAmt", sf.line16Feed],
    ["17", "FarmExpensesGrp/FertilizerAndLimeExpenseAmt", sf.line17Fertilizers],
    ["26", "FarmExpensesGrp/SeedAndPlantExpenseAmt", sf.line26Seeds],
    ["28", "FarmExpensesGrp/SuppliesAmt", sf.line28Supplies],
  ] as const).map(([line, element, expected]) =>
    value(14, `Schedule F line ${line}`, `IRS1040ScheduleF/${element}`, expected)
  ),
  // Line 7's $184,500 is preprinted form text with no MeF element.
  ...([
    ["4a", "MinimumProfitForSETaxAmt", F.scheduleSE.line4a],
    ["5b", "MinAllowableChurchWagesAmt", F.scheduleSE.line5b],
    ["8d", "TotalWagesAndUnreportedTipsAmt", F.scheduleSE.line8d],
  ] as const).map(([line, element, expected]) =>
    value(16, `Schedule SE line ${line}`, `IRS1040ScheduleSE/${element}`, expected)
  ),
  ...([
    ["1", "LivestockAndCropIncomeAmt", f4835.line1],
    ["2a", "CooperativeDistributionsAmt", f4835.line2a],
    ["3a", "AgriculturalProgramPymtAmt", f4835.line3a],
    ["4a", "CCCLoanReportedElectionAmt", f4835.line4a],
    ["4b", "CCCLoansForfeitedAmt", f4835.line4b],
    ["5a", "CropInsProcAndDsstrPymtAmt", f4835.line5a],
    ["6", "OthIncmIncludingGasFuelTxCrAmt", f4835.line6],
    ["9", "ChemicalExpenseAmt", f4835.line9Chemicals],
    ["14", "FeedPurchasedExpenseAmt", f4835.line14Feed],
    ["15", "FertilizerAndLimeExpenseAmt", f4835.line15Fertilizers],
    ["22a", "MachineryAndEquipmentRentAmt", f4835.line22aVehiclesMachinery],
    ["26", "SuppliesAmt", f4835.line26Supplies],
  ] as const).map(([line, element, expected]) =>
    value(18, `Form 4835 line ${line}`, `IRS4835/${element}`, expected)
  ),
];

const BROKER_COPY = {
  recipient_ssn: F.taxpayer.ssn,
  source_document_reference: ASSUMED.brokerCopyReference,
} as const;

/** Official IRS TY2026 1040 ATS Scenario 3 packet (draft, 9/22/2026). */
export function ty2026Scenario104003Input(): Record<string, unknown> {
  const { taxpayer } = F;
  return {
    general: {
      ats_test_submission: true,
      filing_status: FilingStatus.Single,
      digital_assets: taxpayer.digitalAssets,
      taxpayer_first_name: taxpayer.firstName,
      taxpayer_last_name: taxpayer.lastName,
      taxpayer_ssn: taxpayer.ssn,
      taxpayer_dob: taxpayer.dateOfBirth,
      taxpayer_ip_pin: taxpayer.identityProtectionPin,
      taxpayer_prior_year_agi: 0,
      presidential_campaign_fund_taxpayer: true,
      qbi_deduction_not_claimed: true,
      address_line1: taxpayer.address.line1,
      address_city: taxpayer.address.city,
      address_state: taxpayer.address.state,
      address_zip: taxpayer.address.zip,
    },
    f1099g: [{
      payer_name: ASSUMED.refundPayerName,
      payer_tin: ASSUMED.refundPayerTin,
      recipient_tin: taxpayer.ssn,
      source_document_reference: `${PACKET}-cover-state-refund`,
      box_2_state_refund: F.taxableStateTaxRefund,
      box_2_prior_year_itemized: true,
      box_2_taxable_recovery_verified_amount: F.taxableStateTaxRefund,
      box_2_recovery_workpaper_reference: `${PACKET}-cover-taxable-refund`,
      box_3_tax_year: ASSUMED.refundTaxYear,
    }],
    f1099r: [{
      recipient_ssn: taxpayer.ssn,
      ts: TS.T,
      box2b_not_determined: false,
      box2b_total_dist: false,
      box7_ira_simple_indicator: false,
      payer_name: r.payerName,
      payer_ein: r.payerEin,
      payer_address_line1: r.payerAddress.line1,
      payer_address_city: r.payerAddress.city,
      payer_address_state: r.payerAddress.state,
      payer_address_zip: r.payerAddress.zip,
      recipient_address_line1: taxpayer.address.line1,
      recipient_address_city: taxpayer.address.city,
      recipient_address_state: taxpayer.address.state,
      recipient_address_zip: taxpayer.address.zip,
      box1_gross_distribution: r.grossDistribution,
      box2a_taxable_amount: r.taxableAmount,
      box4_federal_withheld: r.federalWithholding,
      box7_distribution_code: DistributionCode.Code7,
    }],
    schedule_f: {
      farm_optional_method_elected: F.farmOptionalMethodElected,
      schedule_fs: [{
        line_a_principal_crop_activity: sf.principalActivity,
        line_b_agricultural_activity_code: sf.agriculturalActivityCode,
        accounting_method: "cash",
        line_e_material_participation: true,
        line_f_made_1099_payments: false,
        line1_sales_livestock_resale: sf.line1a,
        line1b_cost_livestock_resale: sf.line1b,
        line11_chemicals: sf.line11Chemicals,
        line16_feed: sf.line16Feed,
        line17_fertilizers: sf.line17Fertilizers,
        line26_seeds: sf.line26Seeds,
        line28_supplies: sf.line28Supplies,
      }],
    },
    f4835: [{
      activity_id: `${PACKET}-form4835-page-18`,
      activity_name: "ATS 1040-03 Form 4835 page 18",
      actively_participated: f4835.activelyParticipated,
      schedule_e_1099_payments_made: F.scheduleE.paymentsRequiring1099,
      schedule_e_1099_filed: F.scheduleE.required1099Filed,
      livestock_crop_income: f4835.line1,
      cooperative_distributions_gross: f4835.line2a,
      agricultural_program_payments_gross: f4835.line3a,
      ccc_loans_reported_election: f4835.line4a,
      ccc_loans_forfeited_gross: f4835.line4b,
      crop_insurance_disaster_received: f4835.line5a,
      other_income: f4835.line6,
      expense_chemicals: f4835.line9Chemicals,
      expense_feed: f4835.line14Feed,
      expense_fertilizer: f4835.line15Fertilizers,
      expense_rent_lease_vehicles: f4835.line22aVehiclesMachinery,
      expense_supplies: f4835.line26Supplies,
    }],
    f1099b: [
      {
        ...BROKER_COPY,
        transaction_id: "line-1a",
        part: "A",
        description: "Short-term covered sales (Schedule D line 1a)",
        date_acquired: "VARIOUS",
        date_sold: ASSUMED.saleDate,
        proceeds: F.scheduleD.line1aProceeds,
        cost_basis: F.scheduleD.line1aBasis,
        box12_basis_reported_to_irs: true,
      },
      {
        ...BROKER_COPY,
        transaction_id: "line-8a",
        part: "D",
        description: "Long-term covered sales (Schedule D line 8a)",
        date_acquired: "VARIOUS",
        date_sold: ASSUMED.saleDate,
        proceeds: F.scheduleD.line8aProceeds,
        cost_basis: F.scheduleD.line8aBasis,
        box12_basis_reported_to_irs: true,
      },
    ],
  };
}

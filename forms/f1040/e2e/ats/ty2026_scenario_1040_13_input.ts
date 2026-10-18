import { FilingStatus } from "../../nodes/types.ts";
import { Box12Code } from "../../nodes/inputs/income/wages/w2/index.ts";
import type { Ty2026PacketTarget } from "./ty2026-ats.ts";
import type { W2Target } from "./ty2025-w2-value-coverage.ts";

/**
 * TY2026 Form 1040 ATS Scenario 13 (30 pages): page 1 cover, 2-3 Form 1040,
 * 4-5 Schedule 1, 6-8 Schedule 1-A, 9-10 Schedule 2, 11 Schedule 3, 12-13
 * Schedule F, 14-15 Schedule SE, 16-19 Form 4136, 20-23 and 24-27 Form 4136
 * Schedules A, 28 Form 1062, 29 Form 1062 Schedule A, 30 W-2. Unlike the
 * other TY2026 packets it prints every computed line.
 * https://www.irs.gov/pub/irs-efile/ty26-1040-ats-scenario-13.pdf
 */
const PACKET = "irs-ty2026-ats-1040-13";

export const SCENARIO_1040_13_TY2026_FACTS = {
  // Page 2: MFJ, digital assets No, no presidential campaign box.
  taxpayer: {
    firstName: "WILLIAM",
    lastName: "BIRCH",
    ssn: "400001313",
    address: { line1: "13 ELM STREET", city: "ANYTOWN", state: "TX", zip: "77013" },
  },
  spouse: { firstName: "NANCY", lastName: "BIRCH", ssn: "400001234" },
  // Page 3 line 12d: spouse born before January 2, 1962; taxpayer not.
  spouseBornBefore1962: true,
  form1040: {
    line1a: 125_000,
    line1z: 125_000,
    line3b: 1_000,
    line7a: 500,
    line7bScheduleDNotRequired: true,
    line8: 10_000,
    line9: 136_500,
    line10: 134,
    line11a: 136_366,
    line12e: 33_850,
    line13a: 16_000,
    line14: 49_850,
    line15: 86_516,
    line16: 9_886,
    line18: 9_886,
    line22: 9_886,
    line23: 268,
    line24a: 10_154,
    line24b: 1_763,
    line24c: 11_917,
    line25a: 20_000,
    line25d: 20_000,
    line31: 6_295,
    line32a: 1_007,
    line32c: 7_302,
    line33: 27_302,
    line34: 15_385,
    line35a: 15_385,
    refundAccountType: "checking",
  },
  // Pages 4-5.
  schedule1: { line6: 10_000, line10: 10_000, line15: 134, line26: 134 },
  // Pages 6-8.
  schedule1A: {
    line1: 136_366,
    line3: 136_366,
    overtimeEmployer: "OAK SUPPLY CO",
    overtimeEmployerEin: "000000014",
    line16a: 5_000,
    line17: 5_000,
    line20: 5_000,
    line21: 5_000,
    line27: 5_000,
    vin: "5FNYF6H59TB000001",
    vehicleOriginalUse: true,
    vehicleFinalAssemblyInUs: true,
    line28a: 5_000,
    line29: 5_000,
    line30: 5_000,
    line36: 5_000,
    line41: 6_000,
    line42b: 6_000,
    line43: 6_000,
    line44: 16_000,
  },
  // Pages 9-10.
  schedule2: { line4: 268, line21: 268 },
  // Page 11: line 13z "1062NL".
  schedule3: { line12: 1_007, line13z: 5_288, line14: 5_288, line15: 6_295 },
  // Pages 12-13: code 111100, cash, E Yes, F No.
  scheduleF: {
    principalActivity: "FARMING",
    activityCode: "111100",
    line2: 450_000,
    line4a: 30_000,
    line4b: 30_000,
    line6a: 25_000,
    line6b: 25_000,
    line8: 75_000,
    line9: 580_000,
    line11Chemicals: 25_000,
    line17Fertilizers: 100_000,
    line18Freight: 25_000,
    line19Gasoline: 5_000,
    line20Insurance: 50_000,
    line21aMortgageInterest: 30_000,
    line24aVehicles: 50_000,
    line24bLand: 130_000,
    line25Repairs: 10_000,
    line26Seeds: 50_000,
    line27Storage: 20_000,
    line28Supplies: 5_000,
    line29Taxes: 30_000,
    line30Utilities: 5_000,
    line32a: { description: "FEES", amount: 15_000 },
    line32b: { description: "EXPENSES", amount: 20_000 },
    line33: 570_000,
    line34: 10_000,
  },
  // Pages 14-15.
  scheduleSE: {
    line1a: 10_000,
    line3: 10_000,
    line4a: 9_235,
    line4c: 9_235,
    line6: 9_235,
    line8a: 125_000,
    line8d: 125_000,
    line9: 59_500,
    line10: 1_145,
    line12: 268,
    line13: 134,
  },
  // Pages 16-19 (Form 4136): Part I A Yes, B 2; Business A, code 114110,
  // CAT TRUCKA1 TRUCK; line 1a 3,000 gallons (type 2) and 1b 2,500 (type 1),
  // $40,000 cost, $1,007 credit; line 17 $1,007.
  form4136: { line1Credit: 1_007, line17: 1_007 },
  // Pages 20-23 and 24-27 (Schedule A (Form 4136), December 2025).
  form4136Activities: [
    {
      businessName: "Business A",
      activityCode: "114110",
      make: "CAT",
      model: "TRUCKA1",
      equipmentType: "TRUCK",
      line: "1a",
      typeOfUse: "02",
      gallons: 3_000,
      cost: 15_000,
      credit: 549,
    },
    {
      businessName: "Business B",
      make: "CAT",
      model: "DIGB1",
      equipmentType: "DIGGER",
      line: "1b",
      typeOfUse: "01",
      gallons: 2_500,
      cost: 25_000,
      credit: 458,
    },
  ],
  // Page 28 (Form 1062, Rev. 12-2026).
  form1062: {
    line1: 9_886,
    line2: 268,
    line3: 10_154,
    line5: 10_154,
    line6: 86_516,
    line7: 56_516,
    line8: 30_000,
    line9: 3_104,
    line11: 3_104,
    line13: 3_104,
    line14: 7_050,
    line15: 1_763,
  },
  // Page 29 (Form 1062 Schedule A): sale on 10/01/2026, 4-8 Yes.
  form1062ScheduleA: {
    saleDate: "2026-10-01",
    line9: 500_000,
    line10: 500_000,
    line11: 443_484,
    line12: 443_484,
    line13: 56_516,
  },
  // Page 30.
  w2: {
    employerName: "OAK SUPPLY CO",
    employerEin: "000000014",
    employerAddress: { line1: "201 ELM DRIVE", city: "ANYTOWN", state: "TX", zip: "77013" },
    employeeSsn: "400001313",
    box1Wages: 125_000,
    box2FederalWithholding: 20_000,
    box3SocialSecurityWages: 125_000,
    box4SocialSecurityWithholding: 7_738,
    box5MedicareWages: 125_000,
    box6MedicareWithholding: 1_810,
    box12aCode: "TT",
    box12aAmount: 5_000,
  },
} as const;

const F = SCENARIO_1040_13_TY2026_FACTS;

/** Facts a guard requires that the packet does not print. None changes tax. */
export const SCENARIO_1040_13_TY2026_ASSUMPTIONS = [
  {
    field: "general.taxpayer_prior_year_agi, spouse_prior_year_agi",
    value: 0,
    why: "The packet gives no 2025 AGI for the Self-Select PIN signature.",
  },
  {
    field: "general.ats_test_submission",
    value: true,
    why: "Marks the ATS test return so the 00 SSN and EIN test prefixes apply.",
  },
  {
    field: "general.taxpayer_dob / spouse_dob",
    value: "1970-01-01 / 1960-01-01",
    why:
      "The packet prints no birth dates; page 3 line 12d checks only the spouse's 'born before January 2, 1962' box.",
  },
  {
    field: "f1099div[0]",
    value: "assumed payer; box 1a $1,000, box 2a $500",
    why:
      "1040 line 3b prints $1,000 of ordinary dividends and line 7a $500 with 'Schedule D not required' checked (capital gain distributions only); the packet has no Form 1099-DIV.",
  },
  {
    field: "f4136 Business B principal activity code",
    value: F.scheduleF.activityCode,
    why:
      "Schedule A (Form 4136) page 24 leaves the code blank; its fuel is line 1b farm use, the Schedule F activity 111100.",
  },
  {
    field: "schedule1a.vehicle_loans[0] lender, dates, vehicle type and reviews",
    value: "assumed lender; bought and financed 2026-01-15; SUV",
    why:
      "Schedule 1-A page 8 prints the VIN, $5,000 of interest and both Yes answers; the packet includes no Form 1098-VLI or purchase record.",
  },
  {
    field: "schedule_f.schedule_fs[0].line1_sales_livestock_resale",
    value: 0,
    why:
      "Page 12 leaves line 1a blank and reports only line 2 sales of raised products; a cash-method Schedule F records line 1a.",
  },
  {
    field: "direct deposit routing and account",
    value: "012345672 / 13131313",
    why: "Page 3 masks both numbers with X; the checking box is checked.",
  },
] as const;

const SE_TAX =
  "Schedule SE page 14 prints line 10 $1,145 (12.4% of $9,235) and line 11 blank, then line 12 $268, the 2.9% Medicare part alone. Line 12 is lines 10 plus 11: $1,145 + $268 = $1,413, and line 13 half of it, $707 (2026 Schedule SE lines 10-13; IRC §1401(a), (b)). AGI falls by the $573 larger deduction.";

const TAXABLE_INCOME =
  "1040 line 15 is line 11a less line 14: the packet's $49,850 of deductions from AGI lowered by the Schedule SE correction, $135,793 - $49,850 = $85,943.";
const LINE16_TAX =
  "1040 line 16 on $85,943 with $500 of line 7a capital gain distributions and no Schedule D takes the 2026 Qualified Dividends and Capital Gain Tax Worksheet: the $500 is within the $98,900 joint 0% amount (Rev. Proc. 2025-32 §4.03) and $85,443 is taxed at the 2026 joint rates (§4.01) at the $85,400-$85,450 midpoint, $2,480 + 12% of $60,625 = $9,755.";

/** Printed values that differ from 2026 law, each with the engine's value. */
export const SCENARIO_1040_13_TY2026_RECONCILIATION = {
  conflicts: [
    ...([
      [14, "Schedule SE line 12", 268, 1_413],
      [14, "Schedule SE line 13", 134, 707],
      [9, "Schedule 2 line 4", 268, 1_413],
      [10, "Schedule 2 line 21", 268, 1_413],
      [5, "Schedule 1 line 15", 134, 707],
      [5, "Schedule 1 line 26", 134, 707],
      [2, "1040 line 10", 134, 707],
      [3, "1040 line 23", 268, 1_413],
      [2, "1040 line 11a", 136_366, 135_793],
    ] as const).map(([page, line, printed, current]) => ({
      page,
      line,
      printed,
      current,
      why: SE_TAX,
    })),
    ...([
      [3, "1040 line 15", 86_516, 85_943, TAXABLE_INCOME],
      [3, "1040 line 16", 9_886, 9_755, LINE16_TAX],
      [3, "1040 line 18", 9_886, 9_755, LINE16_TAX],
      [3, "1040 line 22", 9_886, 9_755, LINE16_TAX],
      [3, "1040 line 24a", 10_154, 11_168, `${LINE16_TAX} ${SE_TAX}`],
    ] as const).map(([page, line, printed, current, why]) => ({
      page,
      line,
      printed,
      current,
      why,
    })),
  ],
  notes: [
    "1040 page 3 line 32a prints $1,007 although it is lines 27a + 28 + 29 + 30 + 31 = $6,295, and line 32c $7,302 adds the $1,007 fuel credit twice.",
    "1040 page 3 line 16 prints $9,886, the Tax Table amount with the $500 of capital gain distributions taxed as ordinary income; line 7a with 'Schedule D not required' takes the Qualified Dividends and Capital Gain Tax Worksheet (2026 Form 1040 instructions, line 16).",
    "Form 1062 page 28 line 7 enters $56,516 of section 1062 gain in taxable income, but the 1040 income lines (pages 2-3) include no sale of the farmland (no Form 4797 or Schedule D).",
  ],
  blockers: [
    "Form 1062 and its Schedule A (pages 28-29; 1040 line 24b $1,763, Schedule 3 line 13z '1062NL' $5,288): no input carries a section 1062 farmland sale and 2026v1.0 has no Form 1062 element.",
    "Schedule 1-A Part III (page 7): 2026v1.0 has no group for the per-employer code TT rows on lines 16a-16e; lines 17-27 file in the TY2025 elements.",
  ],
} as const;

const value = (
  page: number,
  line: string,
  path: string | null,
  expected: number | string,
): Ty2026PacketTarget => ({ page, line, path, expected });
const f1040 = (page: number, line: string, element: string | null, expected: number) =>
  value(page, `1040 line ${line}`, element && `IRS1040/${element}`, expected);

/** Every amount the packet prints, by the MeF element that carries it; null has no 2026v1.0 element. */
export const SCENARIO_1040_13_TY2026_TARGETS: readonly Ty2026PacketTarget[] = [
  f1040(2, "1a", "WagesAmt", F.form1040.line1a),
  f1040(2, "1z", "WagesSalariesAndTipsAmt", F.form1040.line1z),
  f1040(2, "3b", "OrdinaryDividendsAmt", F.form1040.line3b),
  f1040(2, "7a", "CapitalGainLossAmt", F.form1040.line7a),
  f1040(2, "8", "TotalAdditionalIncomeAmt", F.form1040.line8),
  f1040(2, "9", "TotalIncomeAmt", F.form1040.line9),
  f1040(2, "10", "TotalAdjustmentsAmt", F.form1040.line10),
  f1040(2, "11a", "AdjustedGrossIncomeAmt", F.form1040.line11a),
  f1040(3, "12e", "TotalItemizedOrStandardDedAmt", F.form1040.line12e),
  f1040(3, "13a", "TotalAdditionalDeductionsAmt", F.form1040.line13a),
  f1040(3, "14", "TotalDeductionsAmt", F.form1040.line14),
  f1040(3, "15", "TaxableIncomeAmt", F.form1040.line15),
  f1040(3, "16", "TaxAmt", F.form1040.line16),
  f1040(3, "18", "TotalTaxBeforeCrAndOthTaxesAmt", F.form1040.line18),
  f1040(3, "22", "TaxLessCreditsAmt", F.form1040.line22),
  f1040(3, "23", "TotalOtherTaxesAmt", F.form1040.line23),
  f1040(3, "24a", "TotalTaxAmt", F.form1040.line24a),
  f1040(3, "24b", null, F.form1040.line24b),
  f1040(3, "24c", null, F.form1040.line24c),
  f1040(3, "25a", "FormW2WithheldTaxAmt", F.form1040.line25a),
  f1040(3, "25d", "WithholdingTaxAmt", F.form1040.line25d),
  f1040(3, "31", "TotalOtherPaymentsRfdblCrAmt", F.form1040.line31),
  f1040(3, "32a", "RefundableCreditsAmt", F.form1040.line32a),
  f1040(3, "32c", null, F.form1040.line32c),
  f1040(3, "33", "TotalPaymentsAmt", F.form1040.line33),
  f1040(3, "34", "OverpaidAmt", F.form1040.line34),
  f1040(3, "35a", "RefundAmt", F.form1040.line35a),
  value(4, "Schedule 1 line 6", "IRS1040Schedule1/NetFarmProfitLossAmt", F.schedule1.line6),
  value(4, "Schedule 1 line 10", "IRS1040Schedule1/TotalAdditionalIncomeAmt", F.schedule1.line10),
  value(5, "Schedule 1 line 15", "IRS1040Schedule1/DeductibleSelfEmploymentTaxAmt", F.schedule1.line15),
  value(5, "Schedule 1 line 26", "IRS1040Schedule1/TotalAdjustmentsAmt", F.schedule1.line26),
  // 2026v1.0 carries the 2025 Schedule 1-A layout: the per-employer overtime
  // rows (16a) have no element; the rest map to the 2025 line elements.
  value(7, "Schedule 1-A line 16a", null, F.schedule1A.line16a),
  ...([
    [7, "17", "QualifiedOvertimeWagesAmt", F.schedule1A.line17],
    [7, "20", "TotalQualifiedOvertimeAmt", F.schedule1A.line20],
    [7, "21", "SmallerOvertimeOrMaxDedAmt", F.schedule1A.line21],
    [7, "27", "QualifiedOvertimeCompDedAmt", F.schedule1A.line27],
    [8, "28a(iii)", "QlfyPassengerVehicleLoanIntGrp/QualifiedCarLoanInterestAmt", F.schedule1A.line28a],
    [8, "29", "TotQualifiedCarLoanInterestAmt", F.schedule1A.line29],
    [8, "30", "SmallerCarLoanIntOrMaxDedAmt", F.schedule1A.line30],
    [8, "36", "QualifiedCarLoanInterestDedAmt", F.schedule1A.line36],
    [8, "41", "SpecfiedDolLessThrshldRedAmt", F.schedule1A.line41],
    [8, "42b", "SpouseEnhancedSeniorDedAmt", F.schedule1A.line42b],
    [8, "43", "EnhancedSeniorDeductionAmt", F.schedule1A.line43],
    [8, "44", "TotalAdditionalDeductionsAmt", F.schedule1A.line44],
  ] as const).map(([page, line, element, expected]) =>
    value(page, `Schedule 1-A line ${line}`, `IRS1040Schedule1A/${element}`, expected)
  ),
  value(8, "Schedule 1-A line 28a VIN", "IRS1040Schedule1A/QlfyPassengerVehicleLoanIntGrp/VIN", F.schedule1A.vin),
  value(9, "Schedule 2 line 4", "IRS1040Schedule2/SelfEmploymentTaxAmt", F.schedule2.line4),
  value(10, "Schedule 2 line 21", "IRS1040Schedule2/TotalOtherTaxesAmt", F.schedule2.line21),
  value(11, "Schedule 3 line 12", "IRS1040Schedule3/TotalFuelTaxCreditAmt", F.schedule3.line12),
  value(11, "Schedule 3 line 13z", "IRS1040Schedule3/OtherRefundableCreditsGrp/OtherRefundableCreditsAmt", F.schedule3.line13z),
  value(11, "Schedule 3 line 14", "IRS1040Schedule3/TotalOtherRefundableCreditsAmt", F.schedule3.line14),
  value(11, "Schedule 3 line 15", "IRS1040Schedule3/TotalOtherPaymentsRfdblCrAmt", F.schedule3.line15),
  ...([
    ["2", "FarmIncomeCashMethodGrp/SaleOfProductsRaisedAmt", F.scheduleF.line2],
    ["4a", "FarmIncomeCashMethodGrp/AgriculturalProgramPymtAmt", F.scheduleF.line4a],
    ["4b", "FarmIncomeCashMethodGrp/AgriculturalProgramPymtTxblAmt", F.scheduleF.line4b],
    ["6a", "FarmIncomeCashMethodGrp/CropInsProcAndDsstrPymtAmt", F.scheduleF.line6a],
    ["6b", "FarmIncomeCashMethodGrp/CropInsProcAndDsstrPymtTxblAmt", F.scheduleF.line6b],
    ["8", "FarmIncomeCashMethodGrp/OtherIncomeAmt", F.scheduleF.line8],
    ["9", "FarmIncomeCashMethodGrp/GrossIncomeAmt", F.scheduleF.line9],
    ["11", "FarmExpensesGrp/ChemicalExpenseAmt", F.scheduleF.line11Chemicals],
    ["17", "FarmExpensesGrp/FertilizerAndLimeExpenseAmt", F.scheduleF.line17Fertilizers],
    ["18", "FarmExpensesGrp/FreightAndTruckingExpenseAmt", F.scheduleF.line18Freight],
    ["19", "FarmExpensesGrp/GasolineFuelAndOilExpenseAmt", F.scheduleF.line19Gasoline],
    ["20", "FarmExpensesGrp/InsuranceAmt", F.scheduleF.line20Insurance],
    ["21a", "FarmExpensesGrp/MortgageInterestPaidBanksAmt", F.scheduleF.line21aMortgageInterest],
    ["24a", "FarmExpensesGrp/MachineryAndEquipmentRentAmt", F.scheduleF.line24aVehicles],
    ["24b", "FarmExpensesGrp/OtherBusinessPropertyRentAmt", F.scheduleF.line24bLand],
    ["25", "FarmExpensesGrp/RepairsAndMaintenanceAmt", F.scheduleF.line25Repairs],
    ["26", "FarmExpensesGrp/SeedAndPlantExpenseAmt", F.scheduleF.line26Seeds],
    ["27", "FarmExpensesGrp/StorageAndWarehousingExpnsAmt", F.scheduleF.line27Storage],
    ["28", "FarmExpensesGrp/SuppliesAmt", F.scheduleF.line28Supplies],
    ["29", "FarmExpensesGrp/TaxExpenseAmt", F.scheduleF.line29Taxes],
    ["30", "FarmExpensesGrp/UtilitiesAmt", F.scheduleF.line30Utilities],
    ["33", "FarmExpensesGrp/TotalExpensesAmt", F.scheduleF.line33],
    ["34", "FarmExpensesGrp/NetFarmProfitLossAmt", F.scheduleF.line34],
  ] as const).map(([line, element, expected]) =>
    value(12, `Schedule F line ${line}`, `IRS1040ScheduleF/${element}`, expected)
  ),
  ...([
    ["1a", "NetFarmProfitLossAmt", F.scheduleSE.line1a],
    ["3", "SETotalNetEarningsOrLossAmt", F.scheduleSE.line3],
    ["4a", "MinimumProfitForSETaxAmt", F.scheduleSE.line4a],
    ["4c", "CombinedSEAmt", F.scheduleSE.line4c],
    ["6", "CombinedSEAndChurchWagesAmt", F.scheduleSE.line6],
    ["8a", "SSTWagesRRTCompAmt", F.scheduleSE.line8a],
    ["8d", "TotalWagesAndUnreportedTipsAmt", F.scheduleSE.line8d],
    ["9", "AllowableSEAmt", F.scheduleSE.line9],
    ["10", "TaxBaseAmt", F.scheduleSE.line10],
    ["12", "SelfEmploymentTaxAmt", F.scheduleSE.line12],
    ["13", "DeductibleSelfEmploymentTaxAmt", F.scheduleSE.line13],
  ] as const).map(([line, element, expected]) =>
    value(14, `Schedule SE line ${line}`, `IRS1040ScheduleSE/${element}`, expected)
  ),
  value(16, "Form 4136 line 1(e)", "IRS4136/NontaxableUseOfGasolineGrp/NontaxableUseOfGasolineCrAmt", F.form4136.line1Credit),
  value(19, "Form 4136 line 17", "IRS4136/TotalFuelTaxCreditAmt", F.form4136.line17),
  ...(Object.entries(F.form1062) as [string, number][]).map(([line, expected]) =>
    value(28, `Form 1062 ${line}`, null, expected)
  ),
  ...(["line9", "line10", "line11", "line12", "line13"] as const).map((line) =>
    value(29, `Form 1062 Schedule A ${line}`, null, F.form1062ScheduleA[line])
  ),
];

export const SCENARIO_1040_13_TY2026_W2_TARGETS: readonly W2Target[] = [{
  sourcePage: 30,
  employerName: F.w2.employerName,
  fields: {
    EmployeeSSN: F.w2.employeeSsn,
    EmployerEIN: F.w2.employerEin,
    WagesAmt: F.w2.box1Wages,
    WithholdingAmt: F.w2.box2FederalWithholding,
    SocialSecurityWagesAmt: F.w2.box3SocialSecurityWages,
    SocialSecurityTaxAmt: F.w2.box4SocialSecurityWithholding,
    MedicareWagesAndTipsAmt: F.w2.box5MedicareWages,
    MedicareTaxWithheldAmt: F.w2.box6MedicareWithholding,
    StatutoryEmployeeInd: false,
    RetirementPlanInd: false,
  },
}];

/** Official IRS TY2026 1040 ATS Scenario 13 packet. */
export function ty2026Scenario104013Input(): Record<string, unknown> {
  const { taxpayer, spouse, w2, scheduleF: sf } = F;
  const [primary, ...others] = F.form4136Activities;
  const activity = (a: (typeof F.form4136Activities)[number], code: string) => ({
    business: {
      qualifying_business_activity: true,
      claimant_is_ultimate_purchaser: true,
      business_name: a.businessName,
      principal_activity_code: code,
      equipment_make: a.make,
      equipment_model: a.model,
      equipment_type: a.equipmentType,
      purchase_records_confirmed: true,
      no_duplicate_excise_claim: true,
    },
    claims: [{
      line: a.line,
      unit: "gallons",
      qualified_quantity: a.gallons,
      actual_fuel_cost: a.cost,
      not_highway_vehicle: true,
      not_noncommercial_motorboat: true,
    }],
  });
  return {
    general: {
      ats_test_submission: true,
      filing_status: FilingStatus.MFJ,
      digital_assets: false,
      taxpayer_first_name: taxpayer.firstName,
      taxpayer_last_name: taxpayer.lastName,
      taxpayer_ssn: taxpayer.ssn,
      taxpayer_dob: "1970-01-01",
      taxpayer_ssn_valid_for_employment: true,
      taxpayer_ssn_issued_before_due_date: true,
      taxpayer_tin_issued_by_due_date: true,
      spouse_first_name: spouse.firstName,
      spouse_last_name: spouse.lastName,
      spouse_ssn: spouse.ssn,
      spouse_dob: "1960-01-01",
      spouse_ssn_valid_for_employment: true,
      spouse_ssn_issued_before_due_date: true,
      spouse_tin_issued_by_due_date: true,
      taxpayer_prior_year_agi: 0,
      spouse_prior_year_agi: 0,
      address_line1: taxpayer.address.line1,
      address_city: taxpayer.address.city,
      address_state: taxpayer.address.state,
      address_zip: taxpayer.address.zip,
      qbi_deduction_not_claimed: true,
      bank_routing_number: "012345672",
      bank_account_number: "13131313",
      bank_account_type: "checking",
    },
    w2: [{
      source_document_reference: `${PACKET}-w2-page-30`,
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
      box12_entries: [{ code: Box12Code.TT, amount: w2.box12aAmount }],
      flsa_overtime_review: {
        covered_nonexempt_employee: true,
        premium_included_in_box1: true,
        source_reference: `${PACKET}-w2-page-30-box-12-tt`,
      },
    }],
    f1099div: [{
      payerName: "ATS Assumed Fund",
      payerTin: "000000013",
      recipient_tin: taxpayer.ssn,
      source_document_reference: `${PACKET}-form1040-page-2-lines-3b-7a`,
      isNominee: false,
      box11: false,
      box1a: F.form1040.line3b,
      box2a: F.form1040.line7a,
    }],
    schedule_f: {
      schedule_fs: [{
        farm_id: `${PACKET}-schedule-f-page-12`,
        proprietor_recipient: "T",
        line_a_principal_crop_activity: sf.principalActivity,
        line_b_agricultural_activity_code: sf.activityCode,
        accounting_method: "cash",
        line_e_material_participation: true,
        line_f_made_1099_payments: false,
        line1_sales_livestock_resale: 0,
        line2_sales_products_raised: sf.line2,
        line4a_ag_program_payments: sf.line4a,
        line4b_ag_program_payments_taxable: sf.line4b,
        line6a_crop_insurance: sf.line6a,
        line6b_crop_insurance_taxable: sf.line6b,
        line8_other_income: sf.line8,
        line11_chemicals: sf.line11Chemicals,
        line17_fertilizers: sf.line17Fertilizers,
        line18_freight: sf.line18Freight,
        line19_gasoline: sf.line19Gasoline,
        line20_insurance: sf.line20Insurance,
        line21a_interest_mortgage: sf.line21aMortgageInterest,
        line24a_rent_vehicles: sf.line24aVehicles,
        line24b_rent_land: sf.line24bLand,
        line25_repairs: sf.line25Repairs,
        line26_seeds: sf.line26Seeds,
        line27_storage: sf.line27Storage,
        line28_supplies: sf.line28Supplies,
        line29_taxes: sf.line29Taxes,
        line30_utilities: sf.line30Utilities,
        line32_other_expenses: [sf.line32a, sf.line32b],
      }],
    },
    f4136: {
      claimant_context: "business",
      primary_activity_has_most_credit: true,
      ...activity(primary, primary.activityCode),
      additional_activities: others.map((a) => activity(a, sf.activityCode)),
    },
    schedule1a: {
      senior_zero_exclusions_review: {
        no_section933_puerto_rico_excluded_income: true,
        section933_review_source_reference: `${PACKET}-schedule1a-page-6`,
        no_form2555_filed: true,
        form2555_review_source_reference: `${PACKET}-cover-form-list`,
        no_form4563_filed: true,
        form4563_review_source_reference: `${PACKET}-cover-form-list`,
      },
      vehicle_loans: [{
        vin: F.schedule1A.vin,
        borrower_ssn: taxpayer.ssn,
        loan_originated_date: "2026-01-15",
        vehicle_purchased_date: "2026-01-15",
        lender_name: "ATS Assumed Auto Lender",
        lender_interest_statement_reference: `${PACKET}-assumed-1098-vli`,
        purchase_and_lien_reference: `${PACKET}-assumed-purchase-and-lien`,
        final_assembly_reference: `${PACKET}-schedule1a-page-8-line28a2`,
        original_borrower: true,
        purchase_proceeds_only: true,
        first_lien_secured: true,
        original_vehicle_use: F.schedule1A.vehicleOriginalUse,
        road_vehicle_with_two_or_more_wheels: true,
        vehicle_type: "suv",
        gross_vehicle_weight_under_14000_pounds: true,
        final_assembly_in_us: F.schedule1A.vehicleFinalAssemblyInUs,
        expected_personal_use_over_half: true,
        qualified_interest_paid: F.schedule1A.line28a,
        interest_deducted_elsewhere: 0,
        no_other_interest_deduction_review_reference:
          `${PACKET}-schedule1a-page-8-column-ii-blank`,
      }],
    },
  };
}

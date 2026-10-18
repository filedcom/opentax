import { FilingStatus, TS } from "../../nodes/types.ts";
import { Box12Code } from "../../nodes/inputs/income/wages/w2/index.ts";
import type { Ty2026PacketTarget } from "./ty2026-ats.ts";
import type { W2Target } from "./ty2025-w2-value-coverage.ts";

/**
 * TY2026 Form 1040 ATS Scenario 12 (37 pages): page 1 cover, 2-3 Form 1040,
 * 4-5 Schedule 1, 6-7 Schedule 2, 8 Schedule 3, 9-10 Schedule C, 11-12
 * Schedule SE, 13-23 Form 3800, 24 Form 4562-B, 25-29 Form 7207, 30-34 Form
 * 7220, 35 Schedule A (Form 3800), 36 Form 7205, 37 W-2. The cover lists four
 * binary attachments the PDF does not contain.
 * https://www.irs.gov/pub/irs-efile/ty26-1040-ats-scenario-12.pdf
 */
const PACKET = "irs-ty2026-ats-1040-12";
const BUSINESS = `${PACKET}-schedule-c-page-9`;

export const SCENARIO_1040_12_TY2026_FACTS = {
  // Page 2: single, digital assets No.
  taxpayer: {
    firstName: "SAM",
    lastName: "GARDENIA",
    ssn: "400001212",
    address: { line1: "231 RED RUN STREET", city: "ANYTOWN", state: "KY", zip: "41011" },
  },
  form1040: {
    line1a: 100_836,
    line1z: 100_836,
    line8: 8_661,
    line9: 109_497,
    line10: 612,
    line11a: 108_885,
    line12e: 16_100,
    line14: 16_100,
    line15: 92_785,
    line16: 15_125,
    line18: 15_125,
    line20: 10_000,
    line21: 10_000,
    line22: 5_125,
    line23: 1_224,
    line24a: 6_349,
    line24c: 6_349,
    line25a: 14_444,
    line25d: 14_444,
    line33: 14_444,
    line34: 8_095,
    line35a: 8_095,
  },
  // Pages 4-8.
  schedule1: { line3: 8_661, line10: 8_661, line15: 612, line26: 612 },
  schedule2: { line4: 1_224, line15: 1_224, line21: 1_224 },
  schedule3: { line6a: 10_000, line7: 10_000, line8: 10_000 },
  // Pages 9-10: cash, G Yes, I No.
  scheduleC: {
    principalBusiness: "DESIGNER",
    businessCode: "541310",
    businessName: "ENERGY BUILD",
    businessAddress: { line1: "654 W 3RD ST", city: "ANYTOWN", state: "KY", zip: "41011" },
    line1: 25_235,
    line3: 25_235,
    line5: 25_235,
    line7: 25_235,
    line15Insurance: 550,
    line17Legal: 125,
    line18Office: 1_000,
    line20bRent: 2_500,
    line22Supplies: 6_532,
    line23Taxes: 200,
    line27aForm7205: 5_000,
    line27bOther: 667,
    partV: { description: "FORM 4562-B AMORTIZATION OF BUSINESS STARTUP COSTS", amount: 667 },
    line28: 16_574,
    line29: 8_661,
    line31: 8_661,
  },
  // Pages 11-12.
  scheduleSE: {
    line2: 8_661,
    line3: 8_661,
    line4a: 7_998,
    line4c: 7_998,
    line6: 7_998,
    line8a: 105_878,
    line8d: 105_878,
    line9: 78_622,
    line10: 992,
    line11: 232,
    line12: 1_224,
    line13: 612,
  },
  // Pages 13-15 (Form 3800): B(i) Yes; Part III line 1b Form 7207,
  // registration PG0012300005, columns (f), (g) and (j) $10,000.
  form3800: {
    line1: 10_000,
    line6: 10_000,
    line7: 16_147,
    line17: 10_000,
    line29: 6_147,
    line38: 10_000,
    registration: "PG0012300005",
  },
  // Page 35 (Schedule A (Form 3800), Rev. 12-2025).
  form3800ScheduleA: {
    transferorName: "SOLAR CO",
    transferorEin: "000001212",
    form: "7207",
    registration: "PG0012300001",
    amountSold: 10_000,
    paymentDate: "2026-10-01",
  },
  // Page 37.
  w2: {
    employerName: "DESIGN LLC",
    employerEin: "000000011",
    employerAddress: { line1: "426 BUILD ST", city: "ANYTOWN", state: "KY", zip: "41011" },
    employeeSsn: "400001212",
    box1Wages: 100_836,
    box2FederalWithholding: 14_444,
    box3SocialSecurityWages: 105_878,
    box4SocialSecurityWithholding: 6_564,
    box5MedicareWages: 105_878,
    box6MedicareWithholding: 1_535,
    box12aCode: "DD",
    box12aAmount: 10_315,
    retirementPlan: true,
    stateId: "000000056",
    box16StateWages: 100_836,
    box17StateIncomeTax: 3_420,
  },
} as const;

const F = SCENARIO_1040_12_TY2026_FACTS;

/** Facts a guard requires that the packet does not print. None changes tax. */
export const SCENARIO_1040_12_TY2026_ASSUMPTIONS = [
  {
    field: "general.taxpayer_dob",
    value: "1985-06-12",
    why:
      "The packet prints no birth date; line 12d is unchecked. Same date as the TY2025 scenario 12 fixture.",
  },
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
    field: "general.qbi_deduction_not_claimed",
    value: true,
    why:
      "Page 3 line 13b is blank and the cover lists no Form 8995; taxable income $92,785 is line 11b less the standard deduction only.",
  },
] as const;

export const SCENARIO_1040_12_TY2026_RECONCILIATION = {
  conflicts: [
    ...(["1040 line 16", "1040 line 18"] as const).map((line) => ({
      page: 3,
      line,
      printed: 15_125,
      current: 15_123,
      why:
        "Taxable income under $100,000 takes the Tax Table amount for its $50 row midpoint ($92,775): $5,800 + 22% x ($92,775 - $50,400) = $15,123 (Rev. Proc. 2025-32 §4.01 Table 3); the packet prints the exact-income $15,125.",
    })),
  ],
  notes: [
    "Form 3800 page 13 line 7 prints $16,147, but it is 1040 line 16 ($15,125) plus Schedule 2 line 1z (blank); lines 9-16, 27 and 29 follow from it.",
    "Form 3800 Part III (page 15) names registration PG0012300005 while Schedule A (Form 3800) page 35 and Form 7207 name PG0012300001; Form 7207 also names Sam as the producer of the credit Schedule A says he bought from Solar Co.",
    "1040 page 3 prints no line 13b qualified business income deduction although Schedule C reports $8,661 of profit; the fixture follows the packet and claims none.",
  ],
  blockers: [
    "Forms 4562-B, 7205 and 7220 (pages 24, 30-34, 36) have no input for any tax year; 2026v1.0 has no Form 4562-B or 7220 element. The Schedule C line 27a and Part V amounts are filed directly.",
    "Form 3800 Part III line 1b transferred Form 7207 credit (pages 13-15, 35): the Form 3800 input carries section 6418 transfers only for Form 8835.",
    "The four binary attachments the cover lists are not in the packet.",
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
export const SCENARIO_1040_12_TY2026_TARGETS: readonly Ty2026PacketTarget[] = [
  f1040(2, "1a", "WagesAmt", F.form1040.line1a),
  f1040(2, "1z", "WagesSalariesAndTipsAmt", F.form1040.line1z),
  f1040(2, "8", "TotalAdditionalIncomeAmt", F.form1040.line8),
  f1040(2, "9", "TotalIncomeAmt", F.form1040.line9),
  f1040(2, "10", "TotalAdjustmentsAmt", F.form1040.line10),
  f1040(2, "11a", "AdjustedGrossIncomeAmt", F.form1040.line11a),
  f1040(3, "12e", "TotalItemizedOrStandardDedAmt", F.form1040.line12e),
  f1040(3, "14", "TotalDeductionsAmt", F.form1040.line14),
  f1040(3, "15", "TaxableIncomeAmt", F.form1040.line15),
  f1040(3, "16", "TaxAmt", F.form1040.line16),
  f1040(3, "18", "TotalTaxBeforeCrAndOthTaxesAmt", F.form1040.line18),
  f1040(3, "20", "TotalNonrefundableCreditsAmt", F.form1040.line20),
  f1040(3, "21", "TotalCreditsAmt", F.form1040.line21),
  f1040(3, "22", "TaxLessCreditsAmt", F.form1040.line22),
  f1040(3, "23", "TotalOtherTaxesAmt", F.form1040.line23),
  f1040(3, "24a", "TotalTaxAmt", F.form1040.line24a),
  f1040(3, "24c", null, F.form1040.line24c),
  f1040(3, "25a", "FormW2WithheldTaxAmt", F.form1040.line25a),
  f1040(3, "25d", "WithholdingTaxAmt", F.form1040.line25d),
  f1040(3, "33", "TotalPaymentsAmt", F.form1040.line33),
  f1040(3, "34", "OverpaidAmt", F.form1040.line34),
  f1040(3, "35a", "RefundAmt", F.form1040.line35a),
  value(4, "Schedule 1 line 3", "IRS1040Schedule1/BusinessIncomeLossAmt", F.schedule1.line3),
  value(4, "Schedule 1 line 10", "IRS1040Schedule1/TotalAdditionalIncomeAmt", F.schedule1.line10),
  value(5, "Schedule 1 line 15", "IRS1040Schedule1/DeductibleSelfEmploymentTaxAmt", F.schedule1.line15),
  value(5, "Schedule 1 line 26", "IRS1040Schedule1/TotalAdjustmentsAmt", F.schedule1.line26),
  value(6, "Schedule 2 line 4", "IRS1040Schedule2/SelfEmploymentTaxAmt", F.schedule2.line4),
  value(7, "Schedule 2 line 21", "IRS1040Schedule2/TotalOtherTaxesAmt", F.schedule2.line21),
  value(8, "Schedule 3 line 6a", "IRS1040Schedule3/GeneralBusinessCreditAmt", F.schedule3.line6a),
  value(8, "Schedule 3 line 8", "IRS1040Schedule3/TotalNonrefundableCreditsAmt", F.schedule3.line8),
  ...([
    ["B", "PrincipalBusinessActivityCd", F.scheduleC.businessCode],
    ["1", "TotalGrossReceiptsAmt", F.scheduleC.line1],
    ["7", "GrossIncomeAmt", F.scheduleC.line7],
    ["15", "InsuranceAmt", F.scheduleC.line15Insurance],
    ["17", "LegalAndProfessionalServiceAmt", F.scheduleC.line17Legal],
    ["18", "OfficeExpensesAmt", F.scheduleC.line18Office],
    ["20b", "OtherBusinessPropertyRentAmt", F.scheduleC.line20bRent],
    ["22", "SuppliesAmt", F.scheduleC.line22Supplies],
    ["23", "TaxesAndLicensesAmt", F.scheduleC.line23Taxes],
    ["27a", "EnergyEffcntCmrclBldgDedAmt", F.scheduleC.line27aForm7205],
    ["27b", "TotalOtherExpensesAmt", F.scheduleC.line27bOther],
    ["28", "TotalExpensesAmt", F.scheduleC.line28],
    ["29", "TentativeProfitOrLossAmt", F.scheduleC.line29],
    ["31", "NetProfitOrLossAmt", F.scheduleC.line31],
  ] as const).map(([line, element, expected]) =>
    value(9, `Schedule C line ${line}`, `IRS1040ScheduleC/${element}`, expected)
  ),
  ...([
    ["2", "NetNonFarmProfitLossAmt", F.scheduleSE.line2],
    ["3", "SETotalNetEarningsOrLossAmt", F.scheduleSE.line3],
    ["4a", "MinimumProfitForSETaxAmt", F.scheduleSE.line4a],
    ["4c", "CombinedSEAmt", F.scheduleSE.line4c],
    ["6", "CombinedSEAndChurchWagesAmt", F.scheduleSE.line6],
    ["8a", "SSTWagesRRTCompAmt", F.scheduleSE.line8a],
    ["8d", "TotalWagesAndUnreportedTipsAmt", F.scheduleSE.line8d],
    ["9", "AllowableSEAmt", F.scheduleSE.line9],
    ["10", "TaxBaseAmt", F.scheduleSE.line10],
    ["11", "SEBaseAmt", F.scheduleSE.line11],
    ["12", "SelfEmploymentTaxAmt", F.scheduleSE.line12],
    ["13", "DeductibleSelfEmploymentTaxAmt", F.scheduleSE.line13],
  ] as const).map(([line, element, expected]) =>
    value(11, `Schedule SE line ${line}`, `IRS1040ScheduleSE/${element}`, expected)
  ),
  ...(["line1", "line6", "line7", "line17", "line29", "line38"] as const).map((line) =>
    value(13, `Form 3800 ${line}`, null, F.form3800[line])
  ),
  value(35, "Schedule A (Form 3800) line 3", null, F.form3800ScheduleA.amountSold),
];

export const SCENARIO_1040_12_TY2026_W2_TARGETS: readonly W2Target[] = [{
  sourcePage: 37,
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
    RetirementPlanInd: F.w2.retirementPlan,
  },
}];

/** Official IRS TY2026 1040 ATS Scenario 12 packet: the supported slice. */
export function ty2026Scenario104012Input(): Record<string, unknown> {
  const { taxpayer, w2, scheduleC: c } = F;
  return {
    general: {
      ats_test_submission: true,
      filing_status: FilingStatus.Single,
      digital_assets: false,
      taxpayer_first_name: taxpayer.firstName,
      taxpayer_last_name: taxpayer.lastName,
      taxpayer_ssn: taxpayer.ssn,
      taxpayer_dob: SCENARIO_1040_12_TY2026_ASSUMPTIONS[0].value,
      taxpayer_prior_year_agi: 0,
      qbi_deduction_not_claimed: true,
      address_line1: taxpayer.address.line1,
      address_city: taxpayer.address.city,
      address_state: taxpayer.address.state,
      address_zip: taxpayer.address.zip,
    },
    w2: [{
      source_document_reference: `${PACKET}-w2-page-37`,
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
      box12_entries: [{ code: Box12Code.DD, amount: w2.box12aAmount }],
      box13_retirement_plan: w2.retirementPlan,
      box15_state: w2.employerAddress.state,
      box16_state_wages: w2.box16StateWages,
      box17_state_withheld: w2.box17StateIncomeTax,
    }],
    schedule_c: [{
      business_reference: BUSINESS,
      proprietor_recipient: TS.T,
      line_a_principal_business: c.principalBusiness,
      line_b_business_code: c.businessCode,
      line_c_business_name: c.businessName,
      line_e_business_address: c.businessAddress,
      line_f_accounting_method: "cash",
      line_g_material_participation: true,
      line_i_made_1099_payments: false,
      line_1_gross_receipts: c.line1,
      line_15_insurance: c.line15Insurance,
      line_17_professional_services: c.line17Legal,
      line_18_office_expense: c.line18Office,
      line_20b_rent_other: c.line20bRent,
      line_22_supplies: c.line22Supplies,
      line_23_taxes_licenses: c.line23Taxes,
      line_27a_energy_efficient: c.line27aForm7205,
      part_v_other_expenses: [c.partV],
    }],
  };
}

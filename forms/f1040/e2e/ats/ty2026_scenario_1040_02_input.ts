import { FilingStatus } from "../../nodes/types.ts";
import {
  DependentRelationship,
  IRSDependentRelationshipCode,
} from "../../nodes/inputs/general/filing/general/index.ts";
import { FMVMethod } from "../../nodes/inputs/deductions/charitable/f8283/fmv-method.ts";
import { withSyntheticForm1098Copy } from "../../2025/pdf/reviews/deductions/mortgage/review-1098-copy.fixture.ts";
import type { Ty2026PacketTarget } from "./ty2026-ats.ts";
import type { W2Target } from "./ty2025-w2-value-coverage.ts";

/**
 * TY2026 Form 1040 ATS Scenario 2 (13 pages, draft 9/22/2026): page 1 cover,
 * 2-3 Form 1040, 4-5 W-2s, 6-7 Schedule 1 (blank), 8-9 Schedule A, 10-11
 * Schedule C, 12-13 Form 8283 (page 13 blank).
 * https://www.irs.gov/pub/irs-efile/1040-mef-ats-%20scenario-2-09222026.pdf
 */
const PACKET = "irs-ty2026-ats-1040-02";
const BUSINESS = `${PACKET}-statutory-business`;

export const SCENARIO_1040_02_TY2026_FACTS = {
  // Page 1 cover.
  taxpayer: {
    firstName: "James",
    lastName: "Brown",
    ssn: "400001038",
    dateOfBirth: "1978-08-02",
    // Page 2.
    address: {
      line1: "21 Linden Street",
      city: "East Hartford",
      state: "CT",
      zip: "06108",
    },
  },
  spouse: {
    firstName: "June",
    lastName: "Brown",
    ssn: "400001071",
    dateOfBirth: "1979-03-19",
    identityProtectionPin: "876543",
  },
  dependent: {
    firstName: "Jonah",
    lastName: "Brown",
    ssn: "400001070",
    dateOfBirth: "2010-07-20",
    fullTimeHighSchoolStudent: true,
  },
  estimatedTaxAppliedFrom2025: 300,
  mileageBeforeJuly1: true,
  // Page 2: MFJ, digital assets No, presidential campaign "You", Jonah lived
  // with them over half of 2026 in the U.S. and is a full-time student; both
  // credit boxes and the work-authorization answers are blank.
  // Page 3: line 27c checked; spouse IP PIN printed; every amount blank.
  printedLine27cDoNotClaimEic: true,
  preparer: {
    name: "Walter Young",
    ptin: "P00000001",
    selfEmployed: true,
    signatureDate: "2027-04-05",
    phone: "8001234567",
    firmName: "Young's Tax Service",
    firmEin: "000000079",
    firmAddress: {
      line1: "1111 New York Avenue",
      city: "New York",
      state: "NY",
      zip: "10022",
    },
  },
  w2: [
    {
      page: 4,
      employerName: "Coca-Cola Beverages Northeast",
      employerEin: "001111111",
      employerAddress: {
        line1: "451 Main Street",
        city: "East Hartford",
        state: "CT",
        zip: "06118",
      },
      employeeSsn: "400001038",
      box1Wages: 29_623,
      box2FederalWithholding: 923,
      box3SocialSecurityWages: 29_623,
      box4SocialSecurityWithholding: 1_837,
      box5MedicareWages: 29_623,
      box6MedicareWithholding: 430,
      statutoryEmployee: true,
      stateId: "000000056",
      box16StateWages: 29_623,
      box17StateIncomeTax: 930,
    },
    {
      page: 5,
      employerName: "Extra Space Storage",
      employerEin: "000000013",
      employerAddress: {
        line1: "171 Roberts Street",
        city: "East Hartford",
        state: "CT",
        zip: "06108",
      },
      employeeSsn: "400001071",
      box1Wages: 8_645,
      box2FederalWithholding: 170,
      box3SocialSecurityWages: 8_645,
      box4SocialSecurityWithholding: 536,
      box5MedicareWages: 8_645,
      box6MedicareWithholding: 125,
      statutoryEmployee: false,
      stateId: "000000056",
      box16StateWages: 8_645,
      box17StateIncomeTax: 115,
    },
  ],
  // Pages 8-9: line 18 "No" and line 19 (elect to itemize) checked.
  scheduleA: {
    line5aStateIncomeTax: 1_045,
    line5bRealEstateTax: 8_955,
    line8aMortgageInterest1098: 11_150,
    line8cPoints: 260,
    line8dMortgageInsurance: 2_316,
    line11CashGifts: 250,
    electToItemize: true,
  },
  // Pages 10-11. Line 1 is blank with its statutory-employee box checked.
  scheduleC: {
    businessDescription: "Landscaper",
    businessCode: "541320",
    line8Advertising: 865,
    line9CarAndTruck: 470,
    line19Pension: 560,
    line22Supplies: 600,
    line23TaxesAndLicenses: 60,
    line30HomeOffice: 0,
    vehiclePlacedInService: "2025-08-23",
    businessMiles: 648,
    commutingMiles: 710,
    otherMiles: 15_150,
  },
  // Page 12, Section A line A.
  form8283: {
    donee: "Goodwill",
    doneeAddress: {
      line1: "2709 Main Street",
      city: "Glastonbury",
      state: "CT",
      zip: "06033",
    },
    propertyDescription: "Clothes and toys",
    donationDate: "2026-11-15",
    howAcquired: "Purchase",
    costBasis: 3_490,
    fairMarketValue: 730,
    fairMarketValueMethod: "Thrift Store Value",
  },
} as const;

const F = SCENARIO_1040_02_TY2026_FACTS;
const LENDER = "ATS Assumed Mortgage Lender";

/** Facts a guard requires that the packet does not print. None changes tax. */
export const SCENARIO_1040_02_TY2026_ASSUMPTIONS = [
  {
    field: "general.taxpayer_prior_year_agi, general.spouse_prior_year_agi",
    value: 0,
    why: "The packet gives no 2025 AGI for the Self-Select PIN signature.",
  },
  {
    field: "general.ats_test_submission",
    value: true,
    why: "Marks the ATS test return so the 00 SSN and EIN test prefixes apply.",
  },
  {
    field: "schedule_c[0].line_1_gross_receipts",
    value: F.w2[0].box1Wages,
    why:
      "Schedule C line 1 is blank with its statutory-employee box checked; the only statutory W-2 (page 4, box 13) supplies it, as in TY2025 scenario 2.",
  },
  {
    field: "f1098[0] issuer Copy B",
    value:
      `lender "${LENDER}", borrower James Brown, box 1 $11,150, box 5 $2,316, synthetic 2026 Copy B bytes`,
    why:
      "Schedule A line 8a prints $11,150 as reported on Form 1098 and line 8d $2,316 of mortgage insurance premiums; the packet includes no Form 1098.",
  },
  {
    field: "f1040es.prior_year_applied_credit_review",
    value: "accepted 2025 joint return of the same filers; IRS account credit",
    why:
      "Page 1 says the $300 was applied from the 2025 return; page 3 line 26 names no former spouse.",
  },
  {
    field:
      "general.taxpayer_ssn_issued_before_due_date, spouse_ssn_issued_before_due_date",
    value: true,
    why: "The packet prints both SSNs; neither is described as late.",
  },
  {
    field: "dependents[0] SSN validity, citizenship and support",
    value: "valid SSN, U.S. citizen, not self-supporting, no joint return",
    why:
      "Page 2 lists Jonah as a son who lived with the filers in the U.S.; page 1 says he is a full-time high school student.",
  },
  {
    field: "f8812_credit_limit_worksheet",
    value: "all Schedule 3 credit lines 0",
    why: "The return has no Schedule 3.",
  },
  {
    field: "f8812_earned_income_worksheet",
    value:
      "line 1a $8,645 (June's W-2), line 2a $29,623 (statutory Schedule C line 1), every other line 0",
    why:
      "Schedule 8812 Earned Income Worksheet: 1040 line 1z is June's W-2 box 1 (page 5); line 2a is the statutory-employee Schedule C line 1 (pages 4 and 10). The statutory activity has no SE tax.",
  },
  {
    field: "f8283 section A item category",
    value: "noncash_50 ordinary-income property",
    why:
      "Used clothes and toys given to Goodwill, a 50% organization; FMV $730 is below the $3,490 basis.",
  },
] as const;

/** Packet facts that differ from what the return files under 2026 law. */
export const SCENARIO_1040_02_TY2026_RECONCILIATION = {
  conflicts: [],
  notes: [
    "Page 2 leaves both of Jonah's credit boxes blank and the cover lists no Schedule 8812, but a son born July 20, 2010 who lived with the filers all year is under 17 at the end of 2026 and a qualifying child for the child tax credit (IRC §24(c), (h)); the return claims it on Schedule 8812.",
    "Page 1 says the filers do not qualify for the QBI deduction as specified agricultural cooperative patrons; the return files no Form 8995.",
  ],
} as const;

const value = (
  page: number,
  line: string,
  path: string | null,
  expected: number | string,
): Ty2026PacketTarget => ({ page, line, path, expected });
const schA = (line: string, element: string, expected: number) =>
  value(8, `Schedule A line ${line}`, `IRS1040ScheduleA/${element}`, expected);
const schC = (
  page: number,
  line: string,
  element: string,
  expected: number | string,
) =>
  value(
    page,
    `Schedule C line ${line}`,
    `IRS1040ScheduleC/${element}`,
    expected,
  );

/** Every amount the packet prints, by the MeF element that carries it. */
export const SCENARIO_1040_02_TY2026_TARGETS: readonly Ty2026PacketTarget[] = [
  value(1, "1040 line 26", "IRS1040/EstimatedTaxPaymentsAmt", 300),
  schA("5a", "StateAndLocalTaxAmt", F.scheduleA.line5aStateIncomeTax),
  schA("5b", "RealEstateTaxesAmt", F.scheduleA.line5bRealEstateTax),
  schA(
    "8a",
    "RptHomeMortgIntAndPointsAmt",
    F.scheduleA.line8aMortgageInterest1098,
  ),
  schA("8c", "Form1098PointsNotReportedAmt", F.scheduleA.line8cPoints),
  schA(
    "8d",
    "MortgageInsurancePremiumsAmt",
    F.scheduleA.line8dMortgageInsurance,
  ),
  value(
    9,
    "Schedule A line 11",
    "IRS1040ScheduleA/GiftsByCashOrCheckAmt",
    F.scheduleA.line11CashGifts,
  ),
  schC(10, "B", "PrincipalBusinessActivityCd", F.scheduleC.businessCode),
  schC(10, "8", "AdvertisingAmt", F.scheduleC.line8Advertising),
  schC(10, "9", "CarAndTruckExpensesAmt", F.scheduleC.line9CarAndTruck),
  schC(10, "19", "PensionProfitSharingPlansAmt", F.scheduleC.line19Pension),
  schC(10, "22", "SuppliesAmt", F.scheduleC.line22Supplies),
  schC(10, "23", "TaxesAndLicensesAmt", F.scheduleC.line23TaxesAndLicenses),
  schC(10, "30", "ExpnsForBusUseOfHomeAmt", F.scheduleC.line30HomeOffice),
  schC(
    11,
    "44a",
    "AdditionalVehicleInfoGrp/BusinessMilesCnt",
    F.scheduleC.businessMiles,
  ),
  schC(
    11,
    "44b",
    "AdditionalVehicleInfoGrp/CommutingMilesCnt",
    F.scheduleC.commutingMiles,
  ),
  schC(
    11,
    "44c",
    "AdditionalVehicleInfoGrp/OtherMilesCnt",
    F.scheduleC.otherMiles,
  ),
  value(
    12,
    "Form 8283 line 1A(g)",
    "IRS8283/InformationOnDonatedProperty/DonorLineDetail/DonorCostOrAdjustedBasisAmt",
    F.form8283.costBasis,
  ),
  value(
    12,
    "Form 8283 line 1A(h)",
    "IRS8283/InformationOnDonatedProperty/FairMarketValueAmt",
    F.form8283.fairMarketValue,
  ),
];

export const SCENARIO_1040_02_TY2026_W2_TARGETS: readonly W2Target[] = F.w2
  .map((w2) => ({
    sourcePage: w2.page,
    employerName: w2.employerName,
    fields: {
      EmployeeSSN: w2.employeeSsn,
      EmployerEIN: w2.employerEin,
      WagesAmt: w2.box1Wages,
      WithholdingAmt: w2.box2FederalWithholding,
      SocialSecurityWagesAmt: w2.box3SocialSecurityWages,
      SocialSecurityTaxAmt: w2.box4SocialSecurityWithholding,
      MedicareWagesAndTipsAmt: w2.box5MedicareWages,
      MedicareTaxWithheldAmt: w2.box6MedicareWithholding,
      StatutoryEmployeeInd: w2.statutoryEmployee,
      RetirementPlanInd: false,
    },
  }));

/** Official IRS TY2026 1040 ATS Scenario 2 packet (draft, 9/22/2026). */
export async function ty2026Scenario104002Input(): Promise<
  Record<string, unknown>
> {
  const mortgage = await withSyntheticForm1098Copy(PACKET, {
    lender_name: LENDER,
    recipient_tin: F.taxpayer.ssn,
    source_document_reference: `${PACKET}-assumed-form-1098`,
    box1_mortgage_interest: F.scheduleA.line8aMortgageInterest1098,
    box5_mip: F.scheduleA.line8dMortgageInsurance,
  }, 2026);
  return {
    general: {
      ats_test_submission: true,
      filing_status: FilingStatus.MFJ,
      digital_assets: false,
      taxpayer_first_name: F.taxpayer.firstName,
      taxpayer_last_name: F.taxpayer.lastName,
      taxpayer_ssn: F.taxpayer.ssn,
      taxpayer_dob: F.taxpayer.dateOfBirth,
      taxpayer_ssn_valid_for_employment: true,
      taxpayer_ssn_issued_before_due_date: true,
      taxpayer_tin_issued_by_due_date: true,
      spouse_first_name: F.spouse.firstName,
      spouse_last_name: F.spouse.lastName,
      spouse_ssn: F.spouse.ssn,
      spouse_dob: F.spouse.dateOfBirth,
      spouse_ssn_valid_for_employment: true,
      spouse_ssn_issued_before_due_date: true,
      spouse_tin_issued_by_due_date: true,
      spouse_ip_pin: F.spouse.identityProtectionPin,
      taxpayer_prior_year_agi: 0,
      spouse_prior_year_agi: 0,
      address_line1: F.taxpayer.address.line1,
      address_city: F.taxpayer.address.city,
      address_state: F.taxpayer.address.state,
      address_zip: F.taxpayer.address.zip,
      presidential_campaign_fund_taxpayer: true,
      do_not_claim_eic: F.printedLine27cDoNotClaimEic,
      qbi_deduction_not_claimed: true,
      dependents: [{
        first_name: F.dependent.firstName,
        last_name: F.dependent.lastName,
        name_control: "BROW",
        ssn: F.dependent.ssn,
        ssn_valid_for_employment: true,
        ssn_issued_before_due_date: true,
        tin_issued_by_due_date: true,
        dob: F.dependent.dateOfBirth,
        relationship: DependentRelationship.Son,
        irs_relationship_code: IRSDependentRelationshipCode.Son,
        months_in_home: 12,
        months_lived_with_you_in_us: 12,
        lived_in_us_over_half_year: true,
        full_time_student: F.dependent.fullTimeHighSchoolStudent,
        filed_joint_return_except_refund_only: false,
        us_citizen_national_or_resident: true,
        provided_over_half_own_support: false,
        dependent_on_another_return: false,
      }],
    },
    w2: F.w2.map((form) => ({
      source_document_reference: `${PACKET}-w2-page-${form.page}`,
      schedule_c_business_reference: form.statutoryEmployee
        ? BUSINESS
        : undefined,
      employee_ssn: form.employeeSsn,
      employer_name: form.employerName,
      employer_ein: form.employerEin,
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
      box13_statutory_employee: form.statutoryEmployee,
      box15_state: form.employerAddress.state,
      box16_state_wages: form.box16StateWages,
      box17_state_withheld: form.box17StateIncomeTax,
    })),
    f8812_credit_limit_worksheet: {
      credit_limit_worksheet: {
        schedule3_line1: 0,
        schedule3_line2: 0,
        schedule3_line3: 0,
        schedule3_line4: 0,
        schedule3_line5b: 0,
        schedule3_line6d: 0,
        schedule3_line6f: 0,
        schedule3_line6l: 0,
        schedule3_line6m: 0,
        worksheet_b_applies: false,
      },
    },
    f8812_earned_income_worksheet: {
      earned_income_worksheet: {
        form1040_line1z_wages: F.w2[1].box1Wages,
        nontaxable_combat_pay: 0,
        schedule_c_statutory_employee_income: F.w2[0].box1Wages,
        nonfarm_schedule_c_and_k1_net: 0,
        farm_schedule_f_and_k1_net: 0,
        farm_optional_method_used: false,
        excluded_medicaid_waiver_payments: 0,
        schedule1_line15_se_deduction: 0,
      },
    },
    f1040es: {
      applied_from_prior_year: F.estimatedTaxAppliedFrom2025,
      prior_year_applied_credit_review: {
        accepted_prior_year_return_reference:
          `${PACKET}-assumed-accepted-2025-joint-return`,
        irs_account_credit_record_reference:
          `${PACKET}-assumed-2026-account-credit`,
        applied_amount: F.estimatedTaxAppliedFrom2025,
      },
    },
    preparer: {
      name: F.preparer.name,
      ptin: F.preparer.ptin,
      self_employed: F.preparer.selfEmployed,
      signature_date: F.preparer.signatureDate,
      phone: F.preparer.phone,
      firm_name: F.preparer.firmName,
      firm_ein: F.preparer.firmEin,
      firm_address_line1: F.preparer.firmAddress.line1,
      firm_city: F.preparer.firmAddress.city,
      firm_state: F.preparer.firmAddress.state,
      firm_zip: F.preparer.firmAddress.zip,
    },
    schedule_a: {
      force_itemized: F.scheduleA.electToItemize,
      line_5a_state_income_tax: F.scheduleA.line5aStateIncomeTax,
      line_5b_real_estate_tax: F.scheduleA.line5bRealEstateTax,
      line_8c_points_no_1098: F.scheduleA.line8cPoints,
      line_8d_mortgage_insurance_premiums: F.scheduleA.line8dMortgageInsurance,
      mortgage_insurance_premiums_qualified_confirmed: true,
      cash_contributions_to_50_percent_organizations:
        F.scheduleA.line11CashGifts,
    },
    f1098: [{
      ...mortgage,
      box1_current_year_deductible_interest:
        F.scheduleA.line8aMortgageInterest1098,
      box1_deduction_workpaper_reference: `${PACKET}-assumed-pub936-review`,
    }],
    f8283: {
      section_a_items: [{
        donee_organization_name: F.form8283.donee,
        donee_organization_us_address: F.form8283.doneeAddress,
        date_acquired_various: true,
        donor_acquisition_description: F.form8283.howAcquired,
        fmv_method: FMVMethod.ThriftShopValue,
        fmv_method_description: F.form8283.fairMarketValueMethod,
        property_description: F.form8283.propertyDescription,
        date_contributed: F.form8283.donationDate,
        cost_or_adjusted_basis: F.form8283.costBasis,
        fmv: F.form8283.fairMarketValue,
        charitable_limit_category: "noncash_50",
        is_capital_gain_property: false,
      }],
    },
    schedule_c: [{
      business_reference: BUSINESS,
      proprietor_recipient: "T",
      line_a_principal_business: F.scheduleC.businessDescription,
      line_b_business_code: F.scheduleC.businessCode,
      line_e_business_address: F.taxpayer.address,
      line_f_accounting_method: "cash",
      line_g_material_participation: true,
      line_i_made_1099_payments: false,
      statutory_employee: true,
      line_1_gross_receipts: F.w2[0].box1Wages,
      line_8_advertising: F.scheduleC.line8Advertising,
      line_9_car_truck_expenses: F.scheduleC.line9CarAndTruck,
      line_19_pension_plans: F.scheduleC.line19Pension,
      line_22_supplies: F.scheduleC.line22Supplies,
      line_23_taxes_licenses: F.scheduleC.line23TaxesAndLicenses,
      line_44b_business_miles: F.scheduleC.businessMiles,
      line_44c_commuting_miles: F.scheduleC.commutingMiles,
      line_44d_other_miles: F.scheduleC.otherMiles,
      line_43_date_in_service: F.scheduleC.vehiclePlacedInService,
      line_45_personal_use: true,
      line_46_another_vehicle: true,
      line_47a_evidence: true,
      line_47b_written_evidence: true,
    }],
  };
}

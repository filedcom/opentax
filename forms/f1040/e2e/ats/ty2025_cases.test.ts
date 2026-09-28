import { assertEquals, assertMatch } from "@std/assert";
import { fieldsOf } from "../../../../core/test-utils/output.ts";
import { w2 } from "../../nodes/inputs/w2/index.ts";
import { DistributionCode, f1099r } from "../../nodes/inputs/f1099r/index.ts";
import { scheduleC } from "../../nodes/inputs/schedule_c/index.ts";
import { STANDARD_DEDUCTION_BASE_2025 } from "../../nodes/config/2025.ts";
import { schedule_d } from "../../nodes/intermediate/aggregation/schedule_d/index.ts";
import { schedule_se } from "../../nodes/intermediate/forms/schedule_se/index.ts";
import { f1040 } from "../../nodes/outputs/f1040/index.ts";
import { schedule1 } from "../../nodes/outputs/schedule1/index.ts";
import { schedule2 } from "../../nodes/intermediate/aggregation/schedule2/index.ts";
import { FilingStatus } from "../../nodes/types.ts";
import {
  SCENARIO_1040_01_FACTS,
  SCENARIO_1040_02_FACTS,
  SCENARIO_1040_03_FACTS,
  SCENARIO_1040_04_FACTS,
  SCENARIO_1040_05_FACTS,
  SCENARIO_1040_08_FACTS,
  SCENARIO_1040_12_FACTS,
  SCENARIO_1040_13_FACTS,
  SCENARIO_1040_NR_01_FACTS,
  SCENARIO_1040_NR_02_FACTS,
  SCENARIO_1040_NR_03_FACTS,
  SCENARIO_1040_NR_04_FACTS,
  SCENARIO_1040_NR_12_FACTS,
  SCENARIO_1040_SS_06_FACTS,
  SCENARIO_4868_07_FACTS,
  TY2025_ATS_CASES,
} from "./ty2025_cases.ts";

const EXPECTED_IDS = [
  "1040-01",
  "1040-02",
  "1040-03",
  "1040-04",
  "1040-05",
  "1040-08",
  "1040-12",
  "1040-13",
  "1040-NR-01",
  "1040-NR-02",
  "1040-NR-03",
  "1040-NR-04",
  "1040-NR-12",
  "1040-SS-06",
  "4868-07",
];

Deno.test("TY2025 ATS inventory includes every IRS-listed scenario once", () => {
  assertEquals(TY2025_ATS_CASES.map((testCase) => testCase.id), EXPECTED_IDS);
  assertEquals(
    new Set(TY2025_ATS_CASES.map((testCase) => testCase.id)).size,
    EXPECTED_IDS.length,
  );
  for (const testCase of TY2025_ATS_CASES) {
    assertMatch(
      testCase.sourceUrl,
      /^https:\/\/www\.irs\.gov\/pub\/irs-efile\/.*\.pdf$/,
    );
    assertEquals(testCase.forms[0], testCase.returnType);
    assertEquals(testCase.forms.length > 0, true);
  }
});

Deno.test("TY2025 ATS source-fact capture is not mistaken for transmission readiness", () => {
  assertEquals(
    TY2025_ATS_CASES.filter((testCase) => testCase.capture === "partial-facts")
      .map((testCase) => testCase.id),
    [
      "1040-01",
      "1040-02",
      "1040-03",
      "1040-04",
      "1040-05",
      "1040-08",
      "1040-12",
      "1040-13",
      "1040-NR-01",
      "1040-NR-02",
      "1040-NR-03",
      "1040-NR-04",
      "1040-NR-12",
      "1040-SS-06",
      "4868-07",
    ],
  );
  assertEquals(
    TY2025_ATS_CASES.filter((testCase) => testCase.capture === "inventory-only")
      .length,
    0,
  );
});

Deno.test("1040-NR Scenario 4 retains clean-vehicle and identity source entries", () => {
  const facts = SCENARIO_1040_NR_04_FACTS;
  assertEquals(facts.taxpayer.ssn, "123005555");
  assertEquals(facts.taxpayer.spouseDeathDatePrinted, "2024-02-18");
  assertEquals(facts.priorYear.modifiedAdjustedGrossIncome, 47_511);
  assertEquals(facts.printedForm1040NR.line4aIraDistribution, 6_200);
  assertEquals(facts.printedForm1040NR.line4bTaxableIraDistribution, 3_200);
  assertEquals(facts.w2.employeeFirstNamePrinted, "Issac");
  assertEquals(facts.w2.box1Wages, 53_792);
  assertEquals(facts.w2.box2FederalWithholding, 8_493);
  assertEquals(facts.form8936ScheduleA.vin.length, 17);
  assertEquals(facts.form8936ScheduleA.placedInService, "2025-03-20");
  assertEquals(
    facts.form8936ScheduleA.tentativeCreditPartIILine9 *
      facts.form8936ScheduleA.businessUsePercent / 100,
    350,
  );
  assertEquals(facts.binaryAttachmentNames.length, 2);
});

Deno.test("1040-NR Scenario 3 retains wages, donation attachments, and refund split", () => {
  const facts = SCENARIO_1040_NR_03_FACTS;
  assertEquals(facts.taxpayer.ssn, "123004444");
  assertEquals(facts.w2.box1Wages, 72_102);
  assertEquals(facts.w2.box2FederalWithholding, 21_750);
  assertEquals(facts.scheduleA.line1aStateAndLocalIncomeTax, 18_860);
  assertEquals(facts.scheduleA.line1bAllowedProvided, false);
  assertEquals(facts.attachmentsRequiredByCoverSheet, [
    "1098-C",
    "Motor Vehicles Boats and Airplanes Statement",
  ]);
  assertEquals(
    facts.refundAllocation.savingsAccounts *
      facts.refundAllocation.amountToEachSavingsAccount,
    2_000,
  );
  assertEquals(facts.refundAllocation.remainderToChecking, true);
});

Deno.test("1040-NR Scenario 2 retains W-2, NEC, OI, and Schedule 1 entries", () => {
  const facts = SCENARIO_1040_NR_02_FACTS;
  assertEquals(facts.taxpayer.ssn, "123003333");
  assertEquals(facts.w2.box1Wages, 25_988);
  assertEquals(facts.w2.box2FederalWithholding, 2_916);
  assertEquals(facts.scheduleNEC.otherIncomeDescription, "LTC");
  assertEquals(facts.scheduleNEC.printedLine12OtherIncome, 1_100);
  assertEquals(facts.scheduleOI.appliedForGreenCard, true);
  assertEquals(facts.scheduleOI.previouslyCitizenOrGreenCardHolder, false);
  assertEquals(facts.scheduleOI.currentYearUSPresenceDays, 110);
  assertEquals(facts.schedule1.printedLine5RentalAndRoyaltyIncome, 500);
});

Deno.test("1040-NR Scenario 1 keeps conflicting IRA values separate", () => {
  const facts = SCENARIO_1040_NR_01_FACTS;
  assertEquals(facts.taxpayer.ssn, "123001111");
  assertEquals(facts.ira.coverSheetMinimumDistribution, 10_000);
  assertEquals(facts.ira.coverSheetDistribution, 4_500);
  assertEquals(facts.ira.printedForm1040NRLine4aDistribution, 6_500);
  assertEquals(facts.ira.printedLine4aNonTaxable, true);
  assertEquals(facts.w2.reduce((sum, form) => sum + form.box1Wages, 0), 33_855);
  assertEquals(
    facts.w2.reduce((sum, form) => sum + form.box2FederalWithholding, 0),
    4_788,
  );
  assertEquals(facts.administrative.form4361OnFile, true);
});

Deno.test("1040-NR Scenario 12 retains partnership transfer and printed deduction", () => {
  const facts = SCENARIO_1040_NR_12_FACTS;
  assertEquals(facts.taxpayer.ssn, "123001112");
  assertEquals(facts.taxpayer.address.country, "AUSTRALIA");
  assertEquals(facts.scheduleA.line1aStateAndLocalIncomeTax, 5_432);
  assertEquals(facts.scheduleA.printedLine1bAllowed, 5_000);
  assertEquals(
    facts.scheduleP.proceeds - facts.scheduleP.outsideBasis,
    350_000,
  );
  assertEquals(facts.scheduleP.outsideGain, facts.form8949.shortTermGain);
  assertEquals(facts.scheduleP.transferred, "2025-12-31");
  assertEquals(facts.printedForm1040NR.line7aCapitalGain, 350_000);
  assertEquals(
    facts.printedForm1040NR.line9TotalEffectivelyConnectedIncome -
      facts.printedForm1040NR.line12ItemizedDeductions,
    facts.printedForm1040NR.line15TaxableIncome,
  );
  assertEquals(
    facts.printedForm1040NR.line24TotalTax,
    facts.printedForm1040NR.line33TotalPayments,
  );
});

Deno.test("1040-SS Scenario 6 preserves Puerto Rico wages, children, and business entries", () => {
  const facts = SCENARIO_1040_SS_06_FACTS;
  assertEquals(facts.taxpayer.ssn, "400001041");
  assertEquals(facts.taxpayer.dateOfBirth, "1987-02-07");
  assertEquals(facts.qualifyingChildren.map((child) => child.dateOfBirth), [
    "2015-04-16",
    "2016-08-19",
    "2017-06-22",
  ]);
  assertEquals(facts.qualifyingChildren.length, 3);
  assertEquals(facts.priorYearOverpaymentAppliedTo2025, 3_000);
  assertEquals(facts.form499R2W2PR.wages, 42_980);
  assertEquals(facts.form499R2W2PR.puertoRicoTaxWithheld, 3_625);
  assertEquals(facts.form499R2W2PR.socialSecurityTaxWithheld, 2_665);
  assertEquals(facts.form499R2W2PR.medicareTaxWithheld, 623);
  assertEquals(facts.scheduleC.businessCode, "238210");
  assertEquals(facts.scheduleC.grossReceiptsProvided, false);
  assertEquals(
    facts.scheduleC.beginningInventory + facts.scheduleC.purchases +
      facts.scheduleC.labor + facts.scheduleC.materialsAndSupplies -
      facts.scheduleC.endingInventory,
    22_950,
  );
  assertEquals(
    facts.scheduleC.advertising + facts.scheduleC.contractLabor +
      facts.scheduleC.officeExpense + facts.scheduleC.repairsAndMaintenance,
    8_197,
  );
});

Deno.test("4868 Scenario 7 keeps payment instructions distinct from blank form lines", () => {
  const facts = SCENARIO_4868_07_FACTS;
  const form = facts.printedForm4868;
  assertEquals(facts.taxpayer.ssn, "400001042");
  assertEquals(facts.taxpayer.address.zip, "97005");
  assertEquals(facts.paymentInstructions.routingTransitNumber, "012345672");
  assertEquals(facts.paymentInstructions.bankAccountNumber, "1234567");
  assertEquals(facts.paymentInstructions.bankAccountType, "checking");
  assertEquals(facts.paymentInstructions.dueDate, "2026-03-28");
  assertEquals(facts.paymentInstructions.amount, 3_000);
  assertEquals(form.line4EstimatedTotalTax, 12_000);
  assertEquals(form.line5TotalPayments, 7_500);
  assertEquals(form.line6BalanceDueProvided, false);
  assertEquals(form.line7AmountPayingProvided, false);
  assertEquals(form.line8OutOfCountryChecked, false);
  assertEquals(form.line9NonresidentNoWithheldWagesChecked, false);
  assertEquals(form.line4EstimatedTotalTax - form.line5TotalPayments, 4_500);
  assertEquals(
    Number(facts.paymentInstructions.amount) ===
      form.line4EstimatedTotalTax - form.line5TotalPayments,
    false,
  );
});

Deno.test("1040 Scenario 1 source amounts and test SSN stay intact", () => {
  const facts = SCENARIO_1040_01_FACTS;
  assertMatch(facts.taxpayer.ssn, /^\d{3}00\d{4}$/);
  assertEquals(facts.w2.reduce((sum, item) => sum + item.box1Wages, 0), 42_470);
  assertEquals(
    facts.w2.reduce((sum, item) => sum + item.box2FederalWithholding, 0),
    2_713,
  );
  assertEquals(facts.scheduleH.socialSecurityWages, 3_100);
  assertEquals(facts.scheduleH.medicareWages, 3_100);
  assertEquals(facts.scheduleH.employerEin, "000000029");
  assertEquals(facts.scheduleH.cashWagesOver2025Limit, true);
  assertEquals(facts.scheduleH.cashWagesOverQuarterLimit, false);
  assertEquals(facts.taxpayer.filingStatus, "single");
  assertEquals(facts.taxpayer.digitalAssets, false);
  assertEquals(facts.w2[0].employerName, "The Green Ladies");
  assertEquals(facts.w2[1].employerName, "C&R");
  assertEquals(facts.w2[0].employerEin, facts.w2[1].employerEin);
  assertEquals(
    facts.form5695.exteriorDoors.reduce((sum, item) => sum + item.cost, 0),
    2_740,
  );
  assertEquals(facts.form5695.line19eOtherDoorsCost, 2_740);
  assertEquals(
    facts.form5695.windows.reduce((sum, item) => sum + item.cost, 0),
    600,
  );
  assertEquals(
    facts.form5695.centralAirConditioners.reduce(
      (sum, item) => sum + item.cost,
      0,
    ),
    2_500,
  );
});

Deno.test("1040 Scenario 1 W-2s route sourced wages and withholding to 1040", () => {
  const result = w2.compute(
    { taxYear: 2025, formType: "f1040" },
    {
      w2s: SCENARIO_1040_01_FACTS.w2.map((form) => ({
        box1_wages: form.box1Wages,
        box2_fed_withheld: form.box2FederalWithholding,
        box3_ss_wages: form.box3SocialSecurityWages,
        box4_ss_withheld: form.box4SocialSecurityWithholding,
        box5_medicare_wages: form.box5MedicareWages,
        box6_medicare_withheld: form.box6MedicareWithholding,
      })),
    },
  );
  assertEquals(fieldsOf(result.outputs, f1040)?.line1a_wages, 42_470);
  assertEquals(fieldsOf(result.outputs, f1040)?.line25a_w2_withheld, 2_713);
});

Deno.test("1040 Scenario 2 source entries remain distinct from computed totals", () => {
  const facts = SCENARIO_1040_02_FACTS;
  assertMatch(facts.taxpayer.ssn, /^\d{3}00\d{4}$/);
  assertMatch(facts.spouse.ssn, /^\d{3}00\d{4}$/);
  assertEquals(facts.w2.reduce((sum, form) => sum + form.box1Wages, 0), 38_026);
  assertEquals(
    facts.w2.reduce((sum, form) => sum + form.box2FederalWithholding, 0),
    1_164,
  );
  assertEquals(
    facts.scheduleA.stateAndLocalIncomeTax + facts.scheduleA.realEstateTax,
    10_000,
  );
  assertEquals(facts.scheduleC.businessCode, "449110");
  assertEquals(facts.scheduleC.businessAddress.zip, "07757");
  assertEquals(facts.scheduleC.printedLine1GrossReceiptsProvided, false);
  assertEquals(facts.scheduleC.businessMiles, 665);
  assertEquals(facts.form8283.fairMarketValue, 700);
  assertEquals(facts.qualifiedBusinessIncomeDeductionEligible, false);
});

Deno.test("1040 Scenario 2 statutory W-2 goes to Schedule C, not 1040 wages", () => {
  const result = w2.compute(
    { taxYear: 2025, formType: "f1040" },
    {
      w2s: SCENARIO_1040_02_FACTS.w2.map((form) => ({
        box1_wages: form.box1Wages,
        box2_fed_withheld: form.box2FederalWithholding,
        box3_ss_wages: form.box3SocialSecurityWages,
        box4_ss_withheld: form.box4SocialSecurityWithholding,
        box5_medicare_wages: form.box5MedicareWages,
        box6_medicare_withheld: form.box6MedicareWithholding,
        box13_statutory_employee: form.statutoryEmployee,
        box17_state_withheld: form.stateIncomeTaxWithheld,
      })),
    },
  );
  assertEquals(fieldsOf(result.outputs, scheduleC)?.statutory_wages, 29_513);
  assertEquals(fieldsOf(result.outputs, f1040)?.line1a_wages, 8_513);
  assertEquals(fieldsOf(result.outputs, f1040)?.line25a_w2_withheld, 1_164);
});

Deno.test("1040 Scenario 3 1099-R routes sourced pension and withholding amounts", () => {
  const form = SCENARIO_1040_03_FACTS.form1099R;
  const result = f1099r.compute(
    { taxYear: 2025, formType: "f1040" },
    {
      f1099rs: [{
        payer_name: form.payerName,
        payer_ein: form.payerEin,
        box1_gross_distribution: form.grossDistribution,
        box2a_taxable_amount: form.taxableAmount,
        box4_federal_withheld: form.federalWithholding,
        box7_distribution_code: DistributionCode.Code7,
        box7_ira_simple_indicator: form.iraSepSimple,
      }],
    },
  );
  const fields = fieldsOf(result.outputs, f1040);
  assertEquals(fields?.line5a_pension_gross, 53_778);
  assertEquals(fields?.line5b_pension_taxable, 43_100);
  assertEquals(fields?.line25b_withheld_1099, 3_405);
});

Deno.test("1040 Scenario 4 preserves the sourced credits and vehicle details", () => {
  const facts = SCENARIO_1040_04_FACTS;
  assertEquals(facts.taxpayer.ssn, "400001037");
  assertEquals(facts.w2.box1Wages, 36_014);
  assertEquals(facts.w2.box2FederalWithholding, 4_581);
  assertEquals(
    facts.form3800.partIIIline1f.creditTransferElectionAmount,
    13_200,
  );
  assertEquals(
    facts.form3800.partIIIline1y.creditNotSubjectToPassiveLimits,
    130,
  );
  assertEquals(
    facts.form8835.registrationNumber,
    facts.form3800.partIIIline1f.registrationNumber,
  );
  assertEquals(facts.form8835.solarKilowattHoursProducedAndSold, 440_000);
  assertEquals(facts.form8936ScheduleA.vin.length, 17);
  assertEquals(facts.form8936ScheduleA.creditTransferredToDealer, false);
  assertEquals(
    facts.requiredBinaryAttachmentDescription,
    "Transfer Election Statement",
  );
});

Deno.test("1040 Scenario 4 W-2 routes sourced wages and withholding to 1040", () => {
  const form = SCENARIO_1040_04_FACTS.w2;
  const result = w2.compute(
    { taxYear: 2025, formType: "f1040" },
    {
      w2s: [{
        box1_wages: form.box1Wages,
        box2_fed_withheld: form.box2FederalWithholding,
        box3_ss_wages: form.box3SocialSecurityWages,
        box4_ss_withheld: form.box4SocialSecurityWithholding,
        box5_medicare_wages: form.box5MedicareWages,
        box6_medicare_withheld: form.box6MedicareWithholding,
      }],
    },
  );
  assertEquals(fieldsOf(result.outputs, f1040)?.line1a_wages, 36_014);
  assertEquals(fieldsOf(result.outputs, f1040)?.line25a_w2_withheld, 4_581);
});

Deno.test("1040 Scenario 5 preserves dependent, care, education, and opt-out inputs", () => {
  const facts = SCENARIO_1040_05_FACTS;
  assertEquals(facts.taxpayer.ssn, "400001039");
  assertEquals(facts.taxpayer.blind, true);
  assertEquals(facts.taxpayer.filingStatus, "head-of-household");
  assertEquals(facts.dependents.map((dependent) => dependent.ssn), [
    "400001057",
    "400001058",
  ]);
  assertEquals(
    facts.form2441.providers.reduce(
      (sum, provider) => sum + provider.amountPaid,
      0,
    ),
    1_820,
  );
  assertEquals(
    facts.dependents.reduce(
      (sum, dependent) => sum + dependent.careExpenses,
      0,
    ),
    1_820,
  );
  assertEquals(facts.schedule1.movingExpenses, 1_475);
  assertEquals(facts.form8863.adjustedQualifiedEducationExpenses, 980);
  assertEquals(facts.form8862.child1DaysInUnitedStates, 365);
  assertEquals(facts.form8862.child2DaysInUnitedStates, 365);
  assertEquals(facts.optOutOfAdditionalChildTaxCredit, true);
});

Deno.test("1040 Scenario 5 W-2 routes sourced wages and withholding to 1040", () => {
  const form = SCENARIO_1040_05_FACTS.w2;
  const result = w2.compute(
    { taxYear: 2025, formType: "f1040" },
    {
      w2s: [{
        box1_wages: form.box1Wages,
        box2_fed_withheld: form.box2FederalWithholding,
        box3_ss_wages: form.box3SocialSecurityWages,
        box4_ss_withheld: form.box4SocialSecurityWithholding,
        box5_medicare_wages: form.box5MedicareWages,
        box6_medicare_withheld: form.box6MedicareWithholding,
      }],
    },
  );
  assertEquals(fieldsOf(result.outputs, f1040)?.line1a_wages, 31_232);
  assertEquals(fieldsOf(result.outputs, f1040)?.line25a_w2_withheld, 1_754);
});

Deno.test("1040 Scenario 12 printed return totals stay distinct from current tax rules", () => {
  const facts = SCENARIO_1040_12_FACTS;
  const printed = facts.printedForm1040;
  assertEquals(facts.w2.box1Wages, 100_836);
  assertEquals(facts.w2.box3SocialSecurityWages, 105_878);
  assertEquals(
    printed.line1aWages + printed.line8AdditionalIncome,
    printed.line9TotalIncome,
  );
  assertEquals(
    printed.line9TotalIncome - printed.line10Adjustments,
    printed.line11AdjustedGrossIncome,
  );
  assertEquals(
    printed.line11AdjustedGrossIncome - printed.line12StandardDeduction,
    printed.line15TaxableIncome,
  );
  assertEquals(
    printed.line16Tax + printed.line23OtherTaxes,
    printed.line24TotalTax,
  );
  assertEquals(
    printed.line24TotalTax - printed.line25aW2Withholding,
    printed.line37AmountOwed,
  );
  assertEquals(printed.line12StandardDeduction, 15_000);
  assertEquals(STANDARD_DEDUCTION_BASE_2025[FilingStatus.Single], 15_750);
  assertEquals(facts.form7217.formRevision, "2024-12");
  assertEquals(
    facts.form7217.partnerAdjustedBasisBeforeDistribution -
      facts.form7217.cashReceived,
    facts.form7217.printedRemainingPartnerBasis,
  );
  assertEquals(
    facts.form7217.distributedProperties[0].section734bBasisAdjustment,
    true,
  );
  assertEquals(facts.form7217.printedBasisAllocatedToProperty, 6_000);
  assertEquals(facts.form7217.printedPartIITotalPartnerBasis, 4_000);
  assertEquals(
    facts.form7217.printedBasisAllocatedToProperty -
      facts.form7217.printedPartIITotalPartnerBasis,
    2_000,
  );
});

Deno.test("1040 Scenario 12 Schedule C computes its printed net profit", () => {
  const form = SCENARIO_1040_12_FACTS.scheduleC;
  const result = scheduleC.compute(
    { taxYear: 2025, formType: "f1040" },
    {
      schedule_cs: [{
        line_a_principal_business: form.principalBusiness,
        line_b_business_code: form.businessCode,
        line_c_business_name: form.businessName,
        line_e_business_address: form.businessAddress,
        line_f_accounting_method: "cash",
        line_g_material_participation: form.materialParticipation,
        line_i_made_1099_payments: form.made1099Payments,
        line_1_gross_receipts: form.grossReceipts,
        line_15_insurance: form.insurance,
        line_17_professional_services: form.professionalServices,
        line_18_office_expense: form.officeExpense,
        line_20b_rent_other: form.rentOtherBusinessProperty,
        line_22_supplies: form.supplies,
        line_23_taxes_licenses: form.taxesAndLicenses,
      }],
    },
  );
  assertEquals(fieldsOf(result.outputs, schedule1)?.line3_schedule_c, 24_328);
});

Deno.test("1040 Scenario 12 W-2 routes sourced wages and withholding to 1040", () => {
  const form = SCENARIO_1040_12_FACTS.w2;
  const result = w2.compute(
    { taxYear: 2025, formType: "f1040" },
    {
      w2s: [{
        box1_wages: form.box1Wages,
        box2_fed_withheld: form.box2FederalWithholding,
        box3_ss_wages: form.box3SocialSecurityWages,
        box4_ss_withheld: form.box4SocialSecurityWithholding,
        box5_medicare_wages: form.box5MedicareWages,
        box6_medicare_withheld: form.box6MedicareWithholding,
      }],
    },
  );
  assertEquals(fieldsOf(result.outputs, f1040)?.line1a_wages, 100_836);
  assertEquals(fieldsOf(result.outputs, f1040)?.line25a_w2_withheld, 14_444);
});

Deno.test("1040 Scenario 12 Schedule SE reconciles cents and printed whole-dollar conventions", () => {
  const facts = SCENARIO_1040_12_FACTS;
  const result = schedule_se.compute(
    { taxYear: 2025, formType: "f1040" },
    {
      net_profit_schedule_c: facts.scheduleC.printedNetProfit,
      w2_ss_wages: facts.w2.box3SocialSecurityWages,
    },
  );
  const netEarnings = facts.scheduleC.printedNetProfit * 0.9235;
  const ssTax = netEarnings * 0.124;
  const medicareTax = netEarnings * 0.029;
  const centsTotal = ssTax + medicareTax;

  // IRS permits a consistent cents or whole-dollar convention. This node keeps
  // cents through line 12; the published fixture rounds lines 10 and 11 first.
  assertEquals(fieldsOf(result.outputs, schedule2)?.line4_se_tax, centsTotal);
  assertEquals(
    fieldsOf(result.outputs, schedule1)?.line15_se_deduction,
    centsTotal * 0.5,
  );
  assertEquals(Math.round(centsTotal), 3_437);
  assertEquals(Math.round(ssTax), facts.scheduleSE.printedSocialSecurityTax);
  assertEquals(Math.round(medicareTax), facts.scheduleSE.printedMedicareTax);
  assertEquals(
    Math.round(ssTax) + Math.round(medicareTax),
    facts.scheduleSE.printedTotalTax,
  );
  assertEquals(
    Math.round(facts.scheduleSE.printedTotalTax * 0.5),
    facts.scheduleSE.printedHalfTaxDeduction,
  );
});

Deno.test("1040 Scenario 13 preserves the charger credit limit and printed return", () => {
  const facts = SCENARIO_1040_13_FACTS;
  const printed = facts.printedForm1040;
  assertEquals(facts.taxpayer.ssn, "400001313");
  assertEquals(facts.spouse.ssn, "400001234");
  assertEquals(facts.form8911ScheduleA.censusTractGeoid, "48201100000");
  assertEquals(facts.form8911ScheduleA.censusTractGeoid.length, 11);
  assertEquals(
    facts.form8911ScheduleA.qualifiedCost * 0.3,
    facts.form8911.printedTentativePersonalCredit,
  );
  assertEquals(
    Math.min(
      facts.form8911.printedTentativePersonalCredit,
      facts.form8911.printedRegularTaxBeforeCredits -
        facts.form8911.printedTentativeMinimumTax,
    ),
    facts.form8911.printedAllowedPersonalCredit,
  );
  assertEquals(
    printed.line11AdjustedGrossIncome - printed.line12StandardDeduction,
    printed.line15TaxableIncome,
  );
  assertEquals(
    printed.line16Tax - printed.line20Schedule3Credit,
    printed.line24TotalTax,
  );
  assertEquals(
    printed.line25aW2Withholding - printed.line24TotalTax,
    printed.line34Overpayment,
  );
  assertEquals(printed.line34Overpayment, printed.line35aRefund);
  assertEquals(printed.line12StandardDeduction, 30_000);
  assertEquals(STANDARD_DEDUCTION_BASE_2025[FilingStatus.MFJ], 31_500);
});

Deno.test("1040 Scenario 13 W-2 routes sourced wages and withholding to 1040", () => {
  const form = SCENARIO_1040_13_FACTS.w2;
  const result = w2.compute(
    { taxYear: 2025, formType: "f1040" },
    {
      w2s: [{
        box1_wages: form.box1Wages,
        box2_fed_withheld: form.box2FederalWithholding,
        box3_ss_wages: form.box3SocialSecurityWages,
        box4_ss_withheld: form.box4SocialSecurityWithholding,
        box5_medicare_wages: form.box5MedicareWages,
        box6_medicare_withheld: form.box6MedicareWithholding,
      }],
    },
  );
  assertEquals(fieldsOf(result.outputs, f1040)?.line1a_wages, 31_620);
  assertEquals(fieldsOf(result.outputs, f1040)?.line25a_w2_withheld, 609);
});

Deno.test("1040 Scenario 8 preserves each 1099-R's code and taxable amount", () => {
  const facts = SCENARIO_1040_08_FACTS;
  assertMatch(facts.taxpayer.ssn, /^\d{3}00\d{4}$/);
  assertEquals(
    facts.form1099R.map((
      form,
    ) => [form.distributionCode, form.grossDistribution, form.taxableAmount]),
    [
      ["Q", 35_800, 0],
      ["G", 20_300, 10_300],
    ],
  );
  assertEquals(
    facts.form1099R.reduce((sum, form) => sum + form.federalWithholding, 0),
    2_555,
  );
  assertEquals(facts.socialSecurityBenefits, { gross: 1_000, taxable: 0 });
  assertEquals(facts.realEstateInvestmentTrustCapitalGainDistribution, 7_500);
  assertEquals(facts.scheduleDRequired, false);
  assertEquals(facts.form1040, {
    digitalAssets: false,
    presidentialCampaignFundTaxpayer: true,
    line4cQcdChecked: true,
    line5cRolloverChecked: true,
    line6dMfsLivedApartChecked: true,
    line7bScheduleDNotRequiredChecked: true,
    enhancedSeniorDeductionClaimed: false,
  });
  assertEquals(facts.form1099R[0].recipientAddress.zip, "89117");
  assertEquals(facts.taxpayer.address.zip, "89101");
});

Deno.test("1040 Scenario 8 code-G 1099-R retains its stated taxable amount", () => {
  const form = SCENARIO_1040_08_FACTS.form1099R[1];
  const result = f1099r.compute(
    { taxYear: 2025, formType: "f1040" },
    {
      f1099rs: [{
        payer_name: form.payerName,
        payer_ein: form.payerEin,
        box1_gross_distribution: form.grossDistribution,
        box2a_taxable_amount: form.taxableAmount,
        box4_federal_withheld: form.federalWithholding,
        box7_distribution_code: DistributionCode.CodeG,
      }],
    },
  );
  const fields = fieldsOf(result.outputs, f1040);
  assertEquals(fields?.line5a_pension_gross, 20_300);
  assertEquals(fields?.line5b_pension_taxable, 10_300);
  assertEquals(fields?.line25b_withheld_1099, 2_555);
});

Deno.test("1040 Scenario 8 capital gain distribution does not require Schedule D", () => {
  const result = schedule_d.compute(
    { taxYear: 2025, formType: "f1040" },
    {
      line13_cap_gain_distrib:
        SCENARIO_1040_08_FACTS.realEstateInvestmentTrustCapitalGainDistribution,
    },
  );
  assertEquals(fieldsOf(result.outputs, f1040)?.line7a_cap_gain_distrib, 7_500);
  assertEquals(
    result.outputs.some((output) => output.nodeType === "schedule_d"),
    false,
  );
});

Deno.test("capital gain distribution with another capital gain still uses Schedule D", () => {
  const result = schedule_d.compute(
    { taxYear: 2025, formType: "f1040" },
    { line13_cap_gain_distrib: 7_500, line_4_other_st: 100 },
  );
  assertEquals(fieldsOf(result.outputs, f1040)?.line7_capital_gain, 7_600);
  assertEquals(
    result.outputs.some((output) => output.nodeType === "schedule_d"),
    true,
  );
});

import { assertEquals, assertThrows } from "@std/assert";
import { FilingStatus } from "../nodes/types.ts";
import {
  calculateScheduleA2026,
  type ScheduleA2026Input,
} from "./schedule-a.ts";

const base: ScheduleA2026Input = {
  filingStatus: FilingStatus.Single,
  adjustedGrossIncome: 100_000,
  saltModifiedAGI: 100_000,
  medicalExpenses: 0,
  stateIncomeTax: 0,
  generalSalesTax: 0,
  realEstateTax: 0,
  personalPropertyTax: 0,
  otherTaxes: 0,
  mortgageInterestAllowed: 0,
  mortgageInsurancePremiumsAllowed: 0,
  investmentInterestAllowed: 0,
  currentYearContributionsAllowedBeforeFloor: 0,
  priorYearContributionCarryoverAllowed: 0,
  casualtyAndTheftLossAllowed: 0,
  otherItemizedDeductionsAllowed: 0,
  schedule1aDeduction: 0,
  qbiDeduction: 0,
};

Deno.test("2026 Schedule A assembles revised lines and charitable floor", () => {
  const result = calculateScheduleA2026({
    ...base,
    medicalExpenses: 10_000,
    stateIncomeTax: 12_000,
    realEstateTax: 3_000,
    mortgageInterestAllowed: 5_000,
    mortgageInsurancePremiumsAllowed: 1_000,
    investmentInterestAllowed: 500,
    currentYearContributionsAllowedBeforeFloor: 3_000,
    priorYearContributionCarryoverAllowed: 200,
    otherItemizedDeductionsAllowed: 500,
  });
  assertEquals(result.line4MedicalAllowed, 2_500);
  assertEquals(result.line5eSaltAllowed, 15_000);
  assertEquals(result.line8eMortgageInterestAndInsurance, 6_000);
  assertEquals(result.line10Interest, 6_500);
  assertEquals(result.line13CurrentYearCharityAfterFloor, 2_500);
  assertEquals(result.line14ContributionCarryoverAllowed, 200);
  assertEquals(result.line15Charity, 2_700);
  assertEquals(result.line18TotalBeforeOverallLimit, 27_200);
  assertEquals(result.line18TotalItemized, 27_200);
});

Deno.test("2026 Schedule A applies corrected SALT cap and MAGI phaseout", () => {
  assertEquals(
    calculateScheduleA2026({
      ...base,
      stateIncomeTax: 100_000,
    }).line5eSaltAllowed,
    40_400,
  );
  assertEquals(
    calculateScheduleA2026({
      ...base,
      adjustedGrossIncome: 400_000,
      saltModifiedAGI: 515_000,
      stateIncomeTax: 100_000,
    }).line5eSaltAllowed,
    37_400,
  );
  assertEquals(
    calculateScheduleA2026({
      ...base,
      filingStatus: FilingStatus.MFS,
      adjustedGrossIncome: 250_000,
      saltModifiedAGI: 252_500,
      stateIncomeTax: 100_000,
    }).line5eSaltAllowed,
    20_200,
  );
});

Deno.test("2026 Schedule A reduces line 18 above top bracket after QBI", () => {
  const result = calculateScheduleA2026({
    ...base,
    adjustedGrossIncome: 650_600,
    saltModifiedAGI: 650_600,
    otherItemizedDeductionsAllowed: 100_000,
  });
  assertEquals(result.line18OverallLimitReduction, 540);
  assertEquals(result.line18TotalItemized, 99_460);
  const afterQbi = calculateScheduleA2026({
    ...base,
    adjustedGrossIncome: 650_600,
    saltModifiedAGI: 650_600,
    otherItemizedDeductionsAllowed: 100_000,
    qbiDeduction: 10_000,
  });
  assertEquals(afterQbi.line18OverallLimitReduction, 0);
});

Deno.test("2026 Schedule A requires one line 5a tax election and valid amounts", () => {
  assertThrows(
    () =>
      calculateScheduleA2026({
        ...base,
        stateIncomeTax: 1,
        generalSalesTax: 1,
      }),
    Error,
    "election",
  );
  assertThrows(
    () =>
      calculateScheduleA2026({
        ...base,
        priorYearContributionCarryoverAllowed: -1,
      }),
    RangeError,
    "nonnegative",
  );
});

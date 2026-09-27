import { config2026 } from "../nodes/config/2026.ts";
import { FilingStatus } from "../nodes/types.ts";
import {
  charitableDeductionAfterFloor2026,
  overallItemizedLimit2026,
} from "./itemized-deductions.ts";

/**
 * Schedule A calculation from source amounts and already allowed amounts.
 * Contribution percentage limits, carryforward attribution, mortgage limits,
 * investment-interest limits, and disaster-loss eligibility are upstream work.
 * Sources: draft 2026 Schedule A and Publication 505 Worksheets 2-5/2-6.
 */
export interface ScheduleA2026Input {
  readonly filingStatus: FilingStatus;
  readonly adjustedGrossIncome: number;
  /** Includes foreign/Puerto Rico modifications required by Schedule A line 5e. */
  readonly saltModifiedAGI: number;
  readonly medicalExpenses: number;
  readonly stateIncomeTax: number;
  readonly generalSalesTax: number;
  readonly realEstateTax: number;
  readonly personalPropertyTax: number;
  readonly otherTaxes: number;
  readonly mortgageInterestAllowed: number;
  readonly mortgageInsurancePremiumsAllowed: number;
  readonly investmentInterestAllowed: number;
  /** Current-year contributions after all category percentage limits. */
  readonly currentYearContributionsAllowedBeforeFloor: number;
  /** Prior-year carryover after origin/category and current-year limits. */
  readonly priorYearContributionCarryoverAllowed: number;
  readonly casualtyAndTheftLossAllowed: number;
  /** Schedule A line 17z after each component's own eligibility rules. */
  readonly otherItemizedDeductionsAllowed: number;
  readonly schedule1aDeduction: number;
  readonly qbiDeduction: number;
}

export interface ScheduleA2026Result {
  readonly line4MedicalAllowed: number;
  readonly line5eSaltAllowed: number;
  readonly line7Taxes: number;
  readonly line8eMortgageInterestAndInsurance: number;
  readonly line10Interest: number;
  readonly line13CurrentYearCharityAfterFloor: number;
  readonly line14ContributionCarryoverAllowed: number;
  readonly line15Charity: number;
  readonly line16CasualtyAndTheft: number;
  readonly line17zOtherItemized: number;
  readonly line18TotalBeforeOverallLimit: number;
  readonly line18OverallLimitReduction: number;
  readonly line18TotalItemized: number;
}

function validate(input: ScheduleA2026Input): void {
  if (!Object.values(FilingStatus).includes(input.filingStatus)) {
    throw new Error("Schedule A requires a valid filing status");
  }
  const amounts = [
    "adjustedGrossIncome",
    "saltModifiedAGI",
    "medicalExpenses",
    "stateIncomeTax",
    "generalSalesTax",
    "realEstateTax",
    "personalPropertyTax",
    "otherTaxes",
    "mortgageInterestAllowed",
    "mortgageInsurancePremiumsAllowed",
    "investmentInterestAllowed",
    "currentYearContributionsAllowedBeforeFloor",
    "priorYearContributionCarryoverAllowed",
    "casualtyAndTheftLossAllowed",
    "otherItemizedDeductionsAllowed",
    "schedule1aDeduction",
    "qbiDeduction",
  ] as const;
  for (const name of amounts) {
    const value = input[name];
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new RangeError(`${name} must be finite`);
    }
    if (
      name !== "adjustedGrossIncome" && name !== "saltModifiedAGI" &&
      value < 0
    ) {
      throw new RangeError(`${name} must be nonnegative`);
    }
  }
  if (input.stateIncomeTax > 0 && input.generalSalesTax > 0) {
    throw new Error(
      "Schedule A line 5a requires income-tax or sales-tax election",
    );
  }
}

export function calculateScheduleA2026(
  input: ScheduleA2026Input,
): ScheduleA2026Result {
  validate(input);
  const line4MedicalAllowed = Math.max(
    0,
    input.medicalExpenses - Math.max(0, input.adjustedGrossIncome) * 0.075,
  );

  const mfs = input.filingStatus === FilingStatus.MFS;
  const saltBaseCap = mfs ? config2026.saltCap / 2 : config2026.saltCap;
  const saltThreshold = mfs
    ? config2026.saltPhaseoutThresholdMfs
    : config2026.saltPhaseoutThreshold;
  const saltFloor = mfs ? config2026.saltFloorMfs : config2026.saltFloor;
  const saltCap = Math.max(
    saltFloor,
    saltBaseCap - Math.max(0, input.saltModifiedAGI - saltThreshold) *
        config2026.saltPhaseoutRate,
  );
  const line5eSaltAllowed = Math.min(
    input.stateIncomeTax + input.generalSalesTax + input.realEstateTax +
      input.personalPropertyTax,
    saltCap,
  );
  const line7Taxes = line5eSaltAllowed + input.otherTaxes;

  const line8eMortgageInterestAndInsurance = input.mortgageInterestAllowed +
    input.mortgageInsurancePremiumsAllowed;
  const line10Interest = line8eMortgageInterestAndInsurance +
    input.investmentInterestAllowed;
  const line13CurrentYearCharityAfterFloor = charitableDeductionAfterFloor2026(
    input.currentYearContributionsAllowedBeforeFloor,
    input.adjustedGrossIncome,
  );
  const line14ContributionCarryoverAllowed =
    input.priorYearContributionCarryoverAllowed;
  const line15Charity = line13CurrentYearCharityAfterFloor +
    line14ContributionCarryoverAllowed;
  const line16CasualtyAndTheft = input.casualtyAndTheftLossAllowed;
  const line17zOtherItemized = input.otherItemizedDeductionsAllowed;
  const line18TotalBeforeOverallLimit = line4MedicalAllowed + line7Taxes +
    line10Interest + line15Charity + line16CasualtyAndTheft +
    line17zOtherItemized;
  const overall = overallItemizedLimit2026({
    filingStatus: input.filingStatus,
    adjustedGrossIncome: input.adjustedGrossIncome,
    schedule1aDeduction: input.schedule1aDeduction,
    qbiDeduction: input.qbiDeduction,
    itemizedBeforeOverallLimit: line18TotalBeforeOverallLimit,
  });
  return {
    line4MedicalAllowed,
    line5eSaltAllowed,
    line7Taxes,
    line8eMortgageInterestAndInsurance,
    line10Interest,
    line13CurrentYearCharityAfterFloor,
    line14ContributionCarryoverAllowed,
    line15Charity,
    line16CasualtyAndTheft,
    line17zOtherItemized,
    line18TotalBeforeOverallLimit,
    line18OverallLimitReduction: overall.reduction,
    line18TotalItemized: overall.allowedItemizedDeductions,
  };
}

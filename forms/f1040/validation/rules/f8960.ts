/**
 * MeF Business Rules: F8960
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 18 rules (18 implemented, 0 stubs)
 */

import type { RuleDef } from "../../../../core/validation/types.ts";
import { rule, all, alwaysPass, any, eqDiff, eqDiffFloorZero, eqMin, eqNum, eqProduct, eqSum, filingStatusIs, filingStatusNot, hasNonZero, ifThen, not, noValue, } from "../../../../core/validation/mod.ts";

export const F8960_RULES: readonly RuleDef[] = [
  rule(
    "F8960-004",
    "reject",
    "math_error",
    eqSum("RentalREAndAdjNetIncmOrLossAmt", "NetRentalIncomeOrLossAmt", "AdjNetIncmOrLossNonSect1411Amt"),
    "Form 8960, Line 4c 'RentalREAndAdjNetIncmOrLossAmt' must be equal to the sum of Line 4a 'NetRentalIncomeOrLossAmt' and Line 4b 'AdjNetIncmOrLossNonSect1411Amt'.",
  ),
  rule(
    "F8960-006",
    "reject",
    "math_error",
    eqSum("GainOrLossFromDisposAmt", "PropertyDisposGainOrLossAmt", "NonNIITPropDisposGainOrLossAmt", "AdjFromDisposOfStockAmt"),
    "If Form 8960, Line 5d 'GainOrLossFromDisposAmt' must be equal to the sum of Line 5a 'PropertyDisposGainOrLossAmt' and Line 5b 'NonNIITPropDisposGainOrLossAmt' and Line 5c 'AdjFromDisposOfStockAmt'.",
  ),
  rule(
    "F8960-007",
    "reject",
    "math_error",
    eqSum("TotalIncomeAmt", "TaxableInterestAmt", "OrdinaryDividendsAmt", "AnnuitesFromNonQlfPlansAmt", "RentalREAndAdjNetIncmOrLossAmt", "GainOrLossFromDisposAmt", "CFCAndPFICInvstIncmChangesAmt", "OtherInvestmentIncomeOrLossAmt"),
    "Form 8960, Line 8 'TotalIncomeAmt' must be equal to the sum of Line 1 'TaxableInterestAmt' and Line 2 'OrdinaryDividendsAmt' and Line 3 'AnnuitesFromNonQlfPlansAmt' and Line 4c 'RentalREAndAdjNetIncmOrLossAmt' and Line 5d 'GainOrLossFromDisposAmt' and Line 6 'CFCAndPFICInvstIncmChangesAmt' and Line 7 'OtherInvestmentIncomeOrLossAmt'.",
  ),
  rule(
    "F8960-008-01",
    "reject",
    "math_error",
    eqSum("InvestmentExpenseAmt", "InvestmentInterestAmt", "StateLocalForeignIncomeTaxAmt", "MiscInvestmentExpenseAmt"),
    "Form 8960, Line 9d 'InvestmentExpenseAmt' must be equal to the sum of Line 9a 'InvestmentInterestAmt' and Line 9b 'StateLocalForeignIncomeTaxAmt' and Line 9c 'MiscInvestmentExpenseAmt'.",
  ),
  rule(
    "F8960-009",
    "reject",
    "math_error",
    eqSum("TotalDeductionModificationAmt", "InvestmentExpenseAmt", "AdditionalModificationAmt"),
    "Form 8960, Line 11 'TotalDeductionModificationAmt' must be equal to the sum of Line 9d 'InvestmentExpenseAmt' and Line 10 'AdditionalModificationAmt'.",
  ),
  rule(
    "F8960-010",
    "reject",
    "math_error",
    eqDiff("NetInvestmentIncomeAmt", "TotalIncomeAmt", "TotalDeductionModificationAmt"),
    "Form 8960, Line 12 'NetInvestmentIncomeAmt' must be equal to Line 8 'TotalIncomeAmt' minus (-) Line 11 'TotalDeductionModificationAmt'.",
  ),
  rule(
    "F8960-018-01",
    "reject",
    "incorrect_data",
    alwaysPass,
    "If Form 8960, 'OrdinaryDividendsAmt' has a non-zero value, then it must be equal to Form 1040, 'OrdinaryDividendsAmt' unless all of the following conditions are true: 1) Filing status of the return is Married filing jointly or Qualifying surviving spouse and 2) Form 8960, checkboxes 'Section6013gInd' and 'Section6013hInd' are not checked and 3) Form 8960, 'FilingThresholdAmt' equals 125000.",
  ),
  rule(
    "F8960-019-05",
    "reject",
    "incorrect_data",
    alwaysPass,
    "If Form 8960, 'NetRentalIncomeOrLossAmt' has a non-zero value, then it must be equal to sum of Schedule 1 (Form 1040), 'BusinessIncomeLossAmt' and 'RentalRealEstateIncomeLossAmt' unless all of the following conditions are true: 1) Filing status of the return is Married filing jointly or Qualifying surviving spouse and 2) Form 8960, checkboxes 'Section6013gInd' and 'Section6013hInd' are not checked and 3) Form 8960, 'FilingThresholdAmt' equals 125000.",
  ),
  rule(
    "F8960-020-03",
    "reject",
    "math_error",
    alwaysPass,
    "If Form 8960, 'PropertyDisposGainOrLossAmt' has a non-zero value, then it must be equal to sum of [ Form 1040, 'CapitalGainLossAmt' and Schedule 1 (Form 1040), 'OtherGainLossAmt' ] unless all of the following conditions are true: 1) Filing status of the return is Married filing jointly or Qualifying surviving spouse and 2) Form 8960, checkboxes 'Section6013gInd' and 'Section6013hInd' are not checked and 3) Form 8960, 'FilingThresholdAmt' equals 125000.",
  ),
  rule(
    "F8960-021-01",
    "reject",
    "incorrect_data",
    alwaysPass,
    "If Form 8960, 'InvestmentInterestAmt' has a non-zero value, then it must be equal to Form 1040 Schedule A, 'InvestmentInterestAmt' unless all of the following conditions are true: 1) Filing status of the return is Married filing jointly or Qualifying surviving spouse and 2) Form 8960, checkboxes 'Section6013gInd' and 'Section6013hInd' are not checked and 3) Form 8960, 'FilingThresholdAmt' equals 125000.",
  ),
  rule(
    "F8960-022",
    "reject",
    "incorrect_data",
    ifThen(filingStatusIs(3), eqNum("FilingThresholdAmt", 125000)),
    "If filing status of the return is Married filing separately, then Form 8960, 'FilingThresholdAmt' must equal 125000.",
  ),
  rule(
    "F8960-023",
    "reject",
    "incorrect_data",
    ifThen(filingStatusIs(1, 4), eqNum("FilingThresholdAmt", 200000)),
    "If filing status of the return is Single or Head of household, then Form 8960, 'FilingThresholdAmt' must equal 200000.",
  ),
  rule(
    "F8960-024-01",
    "reject",
    "math_error",
    eqDiffFloorZero("MAGILessThresholdAmt", "ModifiedAGIAmt", "FilingThresholdAmt"),
    "Form 8960, Line 15 'MAGILessThresholdAmt' must be equal to Line 13 'ModifiedAGIAmt' minus (-) Line 14 'FilingThresholdAmt'.",
  ),
  rule(
    "F8960-025",
    "reject",
    "incorrect_data",
    eqMin("SmllrIncmOrMAGILessThrshldAmt", "NetInvestmentIncomeAmt", "MAGILessThresholdAmt"),
    "Form 8960, Line 16 'SmllrIncmOrMAGILessThrshldAmt' must be equal to the smaller of Line 12 'NetInvestmentIncomeAmt' or Line 15 'MAGILessThresholdAmt'.",
  ),
  rule(
    "F8960-026",
    "reject",
    "incorrect_data",
    eqProduct("NetInvstmtIncmTaxAmt", "SmllrIncmOrMAGILessThrshldAmt", 0.038),
    "Form 8960, Line 17 'IndivNetInvstIncomeTaxAmt' must equal Line 16 'SmllrIncmOrMAGILessThrshldAmt' multiplied by 3.8% (.038).",
  ),
  rule(
    "F8960-027-01",
    "reject",
    "incorrect_data",
    alwaysPass,
    "If Form 8960, 'TaxableInterestAmt' has a non-zero value, then it must be equal to Form 1040, 'TaxableInterestAmt' unless all of the following conditions are true: 1) Filing status of the return is Married filing jointly or Qualifying surviving spouse and 2) Form 8960, checkboxes 'Section6013gInd' and 'Section6013hInd' are not checked and 3) Form 8960, 'FilingThresholdAmt' equals 125000.",
  ),
  rule(
    "F8960-028-01",
    "reject",
    "incorrect_data",
    ifThen(filingStatusIs(2, 5), any(eqNum("FilingThresholdAmt", 250000), eqNum("FilingThresholdAmt", 125000))),
    "If the filing status of the return is Married filing jointly or Qualifying surviving spouse, then Form 8960, 'FilingThresholdAmt' must be equal to 250000 or 125000.",
  ),
  rule(
    "F8960-030",
    "reject",
    "incorrect_data",
    not(all(hasNonZero("Section6013gInd"), hasNonZero("Section6013hInd"))),
    "If one of the following Form 8960 checkboxes is checked, then the other must not be checked: 'Section6013gInd' or 'Section6013hInd'.",
  ),
];

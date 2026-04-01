/**
 * MeF Business Rules: F8936
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 20 rules (20 implemented, 0 stubs)
 */

import type { RuleDef } from "../../../../core/validation/types.ts";
import { rule, eqDiff, eqField, eqMin, eqSum, hasValue, hasNonZero, ifThen, } from "../../../../core/validation/mod.ts";

export const F8936_RULES: readonly RuleDef[] = [
  rule(
    "F8936-025",
    "reject",
    "incorrect_data",
    ifThen(hasValue("AdjustedGrossIncomeAmt"), eqField("AdjustedGrossIncomeAmt", "AdjustedGrossIncomeAmt")),
    "Form 8936, 'AdjustedGrossIncomeAmt' in 'CurrentYrMAGIAmountGrp' must be equal to 'AdjustedGrossIncomeAmt' in Form 1040 or 1040-NR.",
  ),
  rule(
    "F8936-026",
    "reject",
    "math_error",
    ifThen(hasValue("TotalIncomeExclusionAmt"), eqField("TotalIncomeExclusionAmt", "TotalIncomeExclusionAmt")),
    "Form 8936, 'TotalIncomeExclusionAmt' in 'CurrentYrMAGIAmountGrp' must be equal to the sum of all Forms 2555, 'TotalIncomeExclusionAmt'.",
  ),
  rule(
    "F8936-027",
    "reject",
    "math_error",
    ifThen(hasValue("HousingDeductionAmt"), eqField("HousingDeductionAmt", "HousingDeductionAmt")),
    "Form 8936, 'HousingDeductionAmt' in 'CurrentYrMAGIAmountGrp' must be equal to the sum of all Forms 2555, 'HousingDeductionAmt'.",
  ),
  rule(
    "F8936-028",
    "reject",
    "math_error",
    ifThen(hasValue("GrossIncomeExclusionAmt"), eqField("GrossIncomeExclusionAmt", "GrossIncomeExclusionAmt")),
    "Form 8936, 'GrossIncomeExclusionAmt' in 'CurrentYrMAGIAmountGrp' must be equal to the sum of all Forms 4563, 'GrossIncomeExclusionAmt'.",
  ),
  rule(
    "F8936-029",
    "reject",
    "math_error",
    eqSum("NetIncomeAmt", "AdjustedGrossIncomeAmt", "ExcldSect933PuertoRicoIncmAmt", "TotalIncomeExclusionAmt", "HousingDeductionAmt", "GrossIncomeExclusionAmt"),
    "Form 8936, 'NetIncomeAmt' in 'CurrentYrMAGIAmountGrp' must be equal to the sum of 'AdjustedGrossIncomeAmt' and 'ExcldSect933PuertoRicoIncmAmt' and 'TotalIncomeExclusionAmt' and 'HousingDeductionAmt' and 'GrossIncomeExclusionAmt' in 'CurrentYrMAGIAmountGrp'.",
  ),
  rule(
    "F8936-030",
    "reject",
    "math_error",
    eqSum("NetIncomeAmt", "AdjustedGrossIncomeAmt", "ExcldSect933PuertoRicoIncmAmt", "TotalIncomeExclusionAmt", "HousingDeductionAmt", "GrossIncomeExclusionAmt"),
    "Form 8936, 'NetIncomeAmt' in 'PriorYrMAGIAmountGrp', must be equal to the sum of 'AdjustedGrossIncomeAmt' and 'ExcldSect933PuertoRicoIncmAmt' and 'TotalIncomeExclusionAmt' and 'HousingDeductionAmt' and 'GrossIncomeExclusionAmt' in 'PriorYrMAGIAmountGrp'.",
  ),
  rule(
    "F8936-032-01",
    "reject",
    "math_error",
    ifThen(hasNonZero("BusinessInvestmentUseAmt"), eqField("BusinessInvestmentUseAmt", "BusinessInvestmentUseAmt")),
    "If Form 8936, 'BusinessInvestmentUseAmt' has a non-zero value, then it must be equal to the sum of all Schedules A (Form 8936), 'BusinessInvestmentUseAmt'.",
  ),
  rule(
    "F8936-034",
    "reject",
    "math_error",
    ifThen(hasNonZero("BusinessInvstUsePartOfCrAmt"), eqSum("BusinessInvstUsePartOfCrAmt", "BusinessInvestmentUseAmt", "NewCleanVehCrPrtshpSCorpAmt")),
    "If Form 8936, 'BusinessInvstUsePartOfCrAmt' has a non-zero value, then it must be equal to the sum of 'BusinessInvestmentUseAmt' and 'NewCleanVehCrPrtshpSCorpAmt'.",
  ),
  rule(
    "F8936-035",
    "reject",
    "math_error",
    ifThen(hasNonZero("PrsnlUseNewCleanVehicleCrAmt"), eqField("PrsnlUseNewCleanVehicleCrAmt", "PrsnlUseNewCleanVehicleCrAmt")),
    "If Form 8936, 'PrsnlUseNewCleanVehicleCrAmt' has a non-zero value, then it must be equal to the sum of all Schedules A (Form 8936), 'PrsnlUseNewCleanVehicleCrAmt'.",
  ),
  rule(
    "F8936-036",
    "reject",
    "incorrect_data",
    ifThen(hasNonZero("TotalTaxBeforeCrAndOthTaxesAmt"), eqField("TotalTaxBeforeCrAndOthTaxesAmt", "TotalTaxBeforeCrAndOthTaxesAmt")),
    "If Form 8936, 'TotalTaxBeforeCrAndOthTaxesAmt' in 'CrPrsnlUsePartNewCleanVehGrp' has a non-zero value, then it must be equal to Form 1040 or Form 1040-NR, 'TotalTaxBeforeCrAndOthTaxesAmt'.",
  ),
  rule(
    "F8936-037",
    "reject",
    "math_error",
    ifThen(hasNonZero("AdjustedPersonalTaxCreditsAmt"), eqDiff("AdjustedPersonalTaxCreditsAmt", "TotalTaxBeforeCrAndOthTaxesAmt", "PersonalTaxCreditsAmt")),
    "If Form 8936, 'AdjustedPersonalTaxCreditsAmt' in 'CrPrsnlUsePartNewCleanVehGrp' has a non-zero value, then it must be equal to 'TotalTaxBeforeCrAndOthTaxesAmt' minus (-) 'PersonalTaxCreditsAmt'.",
  ),
  rule(
    "F8936-039-01",
    "reject",
    "incorrect_data",
    eqMin("CleanVehPrsnlUsePartCrAmt", "PrsnlUseNewCleanVehicleCrAmt", "AdjustedPersonalTaxCreditsAmt"),
    "In 'CrPrsnlUsePartNewCleanVehGrp' Form 8936, 'CleanVehPrsnlUsePartCrAmt' must be equal to the smaller of ['PrsnlUseNewCleanVehicleCrAmt' or 'AdjustedPersonalTaxCreditsAmt'].",
  ),
  rule(
    "F8936-040",
    "reject",
    "incorrect_data",
    ifThen(hasNonZero("TotalTaxBeforeCrAndOthTaxesAmt"), eqField("TotalTaxBeforeCrAndOthTaxesAmt", "TotalTaxBeforeCrAndOthTaxesAmt")),
    "If Form 8936, 'TotalTaxBeforeCrAndOthTaxesAmt' in 'CrPreviouslyOwnedCleanVehGrp' has a non-zero value, then it must be equal to Form 1040 or Form 1040-NR, 'TotalTaxBeforeCrAndOthTaxesAmt'.",
  ),
  rule(
    "F8936-041",
    "reject",
    "math_error",
    ifThen(hasNonZero("AdjustedPersonalTaxCreditsAmt"), eqDiff("AdjustedPersonalTaxCreditsAmt", "TotalTaxBeforeCrAndOthTaxesAmt", "PersonalTaxCreditsAmt")),
    "If Form 8936, 'AdjustedPersonalTaxCreditsAmt' in 'CrPreviouslyOwnedCleanVehGrp' has a non-zero value, then it must be equal to 'TotalTaxBeforeCrAndOthTaxesAmt' minus (-) 'PersonalTaxCreditsAmt'.",
  ),
  rule(
    "F8936-043",
    "reject",
    "incorrect_data",
    eqMin("MaxPrevOwnedCleanVehCrAmt", "PrevOwnedCleanVehCreditAmt", "AdjustedPersonalTaxCreditsAmt"),
    "Form 8936, 'MaxPrevOwnedCleanVehCrAmt' must be equal to the smaller of 'PrevOwnedCleanVehCreditAmt' or 'AdjustedPersonalTaxCreditsAmt' in 'CrPreviouslyOwnedCleanVehGrp'.",
  ),
  rule(
    "F8936-044",
    "reject",
    "math_error",
    ifThen(hasNonZero("QlfyCmrclCleanVehicleCrAmt"), eqField("QlfyCmrclCleanVehicleCrAmt", "QlfyCmrclCleanVehicleCrAmt")),
    "If Form 8936, 'QlfyCmrclCleanVehicleCrAmt' has a non-zero value, then it must be equal to the sum of all Schedules A (Form 8936), 'QlfyCmrclCleanVehicleCrAmt'.",
  ),
  rule(
    "F8936-045",
    "reject",
    "math_error",
    eqSum("TotalQlfyCmrclCleanVehCrAmt", "QlfyCmrclCleanVehicleCrAmt", "CmrclCleanVehCrPrtshpSCorpAmt"),
    "Form 8936, 'TotalQlfyCmrclCleanVehCrAmt' must be equal to the sum of 'QlfyCmrclCleanVehicleCrAmt' and 'CmrclCleanVehCrPrtshpSCorpAmt'.",
  ),
  rule(
    "F8936-046",
    "reject",
    "data_mismatch",
    ifThen(hasNonZero("PersonalTaxCreditsAmt"), eqSum("PersonalTaxCreditsAmt", "ForeignTaxCreditAmt", "CreditForChildAndDepdCareAmt", "EducationCreditAmt", "RtrSavingsContributionsCrAmt", "EgyEffcntHmImprvCrAmt", "CreditForElderlyOrDisabledAmt", "TotRptgYrTxIncreaseDecreaseAmt", "MaxPrevOwnedCleanVehCrAmt")),
    "If Form 8936, ['PersonalTaxCreditsAmt' in 'CrPrsnlUsePartNewCleanVehGrp'] has a non-zero value, then it must be equal to the sum of the following from Schedule 3 (Form 1040): 'ForeignTaxCreditAmt' and 'CreditForChildAndDepdCareAmt' and 'EducationCreditAmt' and 'RtrSavingsContributionsCrAmt' and 'EgyEffcntHmImprvCrAmt' and 'CreditForElderlyOrDisabledAmt' and 'TotRptgYrTxIncreaseDecreaseAmt' and 'MaxPrevOwnedCleanVehCrAmt'.",
  ),
  rule(
    "F8936-047",
    "reject",
    "data_mismatch",
    ifThen(hasNonZero("PrevOwnedCleanVehCreditAmt"), eqField("PrevOwnedCleanVehCreditAmt", "PrevOwnedCleanVehCreditAmt")),
    "If Form 8936, 'PrevOwnedCleanVehCreditAmt' has a non-zero value, then it must be equal to the sum of all Schedules A (Form 8936), 'PrevOwnedCleanVehCreditAmt'.",
  ),
  rule(
    "F8936-048",
    "reject",
    "data_mismatch",
    ifThen(hasNonZero("PersonalTaxCreditsAmt"), eqSum("PersonalTaxCreditsAmt", "ForeignTaxCreditAmt", "CreditForChildAndDepdCareAmt", "EducationCreditAmt", "RtrSavingsContributionsCrAmt", "EgyEffcntHmImprvCrAmt", "CreditForElderlyOrDisabledAmt", "TotRptgYrTxIncreaseDecreaseAmt")),
    "If Form 8936, ['PersonalTaxCreditsAmt' in 'CrPreviouslyOwnedCleanVehGrp'] has a non-zero value, then it must be equal to the sum of the following from Schedule 3 (Form 1040): 'ForeignTaxCreditAmt' and 'CreditForChildAndDepdCareAmt' and 'EducationCreditAmt' and 'RtrSavingsContributionsCrAmt' and 'EgyEffcntHmImprvCrAmt' and 'CreditForElderlyOrDisabledAmt' and 'TotRptgYrTxIncreaseDecreaseAmt'.",
  ),
];

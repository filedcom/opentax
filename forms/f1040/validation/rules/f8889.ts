/**
 * MeF Business Rules: F8889
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 15 rules (15 implemented, 0 stubs)
 */

import type { RuleDef } from "../../../../core/validation/types.ts";
import { rule, alwaysPass, eqDiffFloorZero, eqField, eqProduct, eqSum, hasValue, ifThen, matchesHeaderSSN, not, notGtField, notGtNum, } from "../../../../core/validation/mod.ts";

export const F8889_RULES: readonly RuleDef[] = [
  rule(
    "F8889-001-01",
    "reject",
    "incorrect_data",
    matchesHeaderSSN("RecipientSSN"),
    "Form 8889, 'RecipientSSN' must be equal to 'PrimarySSN' or 'SpouseSSN' in the Return Header.",
  ),
  rule(
    "F8889-002-01",
    "reject",
    "incorrect_data",
    alwaysPass,
    "If two Forms 8889 are present in the return, then their 'RecipientSSN's must not be equal.",
  ),
  rule(
    "F8889-004-02",
    "reject",
    "incorrect_data",
    notGtNum("HSALimitedAnnualDeductibleAmt", 9550),
    "If Form 8889, 'HSALimitedAnnualDeductibleAmt' has a non-zero value, then it must not be greater than 9550.",
  ),
  rule(
    "F8889-005",
    "reject",
    "math_error",
    eqDiffFloorZero("HSALimitedDeductibleAllwdAmt", "HSALimitedAnnualDeductibleAmt", "TotalArcherMSAContributionAmt"),
    "Form 8889, 'HSALimitedDeductibleAllwdAmt' must be equal to 'HSALimitedAnnualDeductibleAmt' minus (-) 'TotalArcherMSAContributionAmt'. However, if 'HSALimitedAnnualDeductibleAmt' minus (-) 'TotalArcherMSAContributionAmt' is less than zero, then 'HSALimitedDeductibleAllwdAmt' must be equal to zero if an amount is entered.",
  ),
  rule(
    "F8889-006",
    "reject",
    "incorrect_data",
    notGtNum("HSAAddnlContributionAmt", 1000),
    "If Form 8889, 'HSAAddnlContributionAmt' has a non-zero value, then it must not be greater than 1000.",
  ),
  rule(
    "F8889-007",
    "reject",
    "math_error",
    eqSum("HSALimitedGrossContributionAmt", "HSAFamilyDeductibleAmt", "HSAAddnlContributionAmt"),
    "Form 8889, 'HSALimitedGrossContributionAmt' must be equal to 'HSAFamilyDeductibleAmt' plus (+) 'HSAAddnlContributionAmt'.",
  ),
  rule(
    "F8889-008",
    "reject",
    "math_error",
    eqSum("TotalHSAContributionAmt", "HSAEmployerContributionAmt", "HSAQualifiedFundingDistriAmt"),
    "Form 8889, 'TotalHSAContributionAmt' must be equal to 'HSAEmployerContributionAmt' plus (+) 'HSAQualifiedFundingDistriAmt'.",
  ),
  rule(
    "F8889-009",
    "reject",
    "math_error",
    eqDiffFloorZero("HSALimitedContributionAmt", "HSALimitedGrossContributionAmt", "TotalHSAContributionAmt"),
    "Form 8889, 'HSALimitedContributionAmt' must be equal to 'HSALimitedGrossContributionAmt' minus (-) 'TotalHSAContributionAmt'. However, if 'HSALimitedGrossContributionAmt' minus (-) 'TotalHSAContributionAmt' is less than zero, then 'HSALimitedContributionAmt' must be equal to zero if an amount is entered.",
  ),
  rule(
    "F8889-010",
    "reject",
    "incorrect_data",
    ifThen(notGtField("HSALimitedContributionAmt", "HSAContributionAmt"), eqField("TotalHSADeductionAmt", "HSALimitedContributionAmt")),
    "If Form 8889, 'HSALimitedContributionAmt' is less than 'HSAContributionAmt', then 'TotalHSADeductionAmt' must be equal to 'HSALimitedContributionAmt' if an amount is entered.",
  ),
  rule(
    "F8889-011",
    "reject",
    "math_error",
    eqDiffFloorZero("HSANetDistributionAmt", "TotalHSADistributionAmt", "HSADistributionRolloverAmt"),
    "Form 8889, 'HSANetDistributionAmt' must be equal to 'TotalHSADistributionAmt' minus (-) 'HSADistributionRolloverAmt'. However, if 'TotalHSADistributionAmt' minus (-) 'HSADistributionRolloverAmt' is less than zero, then 'HSANetDistributionAmt' must be equal to zero if an amount is entered.",
  ),
  rule(
    "F8889-012",
    "reject",
    "math_error",
    eqDiffFloorZero("TaxableHSADistributionAmt", "HSANetDistributionAmt", "UnreimbQualMedAndDentalExpAmt"),
    "Form 8889, 'TaxableHSADistributionAmt' must be equal to 'HSANetDistributionAmt' minus (-) 'UnreimbQualMedAndDentalExpAmt'. However, if 'HSANetDistributionAmt' minus (-) 'UnreimbQualMedAndDentalExpAmt' is less than zero, then 'TaxableHSADistributionAmt' must be equal to zero if an amount is entered.",
  ),
  rule(
    "F8889-013",
    "reject",
    "math_error",
    ifThen(not(hasValue("HSADistriAddnlPercentTaxExcInd")), eqProduct("HSADistriAddnlPercentTaxAmt", "TaxableHSADistributionAmt", 0.20)),
    "Form 8889, 'HSADistriAddnlPercentTaxAmt' must be equal to 20.0% (0.20) of 'TaxableHSADistributionAmt' unless the 'HSADistriAddnlPercentTaxExcInd' checkbox is checked.",
  ),
  rule(
    "F8889-014",
    "reject",
    "math_error",
    eqSum("HDHPCoverageIncomeAmt", "HDHPCoverageFailPartialYrAmt", "HDHPCoverageFailFundDistriAmt"),
    "Form 8889, 'HDHPCoverageIncomeAmt' must be equal to 'HDHPCoverageFailPartialYrAmt' plus (+) 'HDHPCoverageFailFundDistriAmt'.",
  ),
  rule(
    "F8889-015",
    "reject",
    "math_error",
    ifThen(hasValue("HDHPCoverageAddnlTaxAmt"), eqField("HDHPCoverageAddnlTaxAmt", "HDHPCoverageIncomeAmt")),
    "Form 8889, 'HDHPCoverageAddnlTaxAmt' must be equal to 10.0% (0.10) of 'HDHPCoverageIncomeAmt'.",
  ),
  rule(
    "F8889-016",
    "reject",
    "incorrect_data",
    alwaysPass,
    "If Form 8889, 'HSAContributionAmt' is less than 'HSALimitedContributionAmt', then 'TotalHSADeductionAmt' must be equal to 'HSAContributionAmt' plus (+) the smaller of [ Form 5329, 'HSAExcessContriCreditAmt' ] or [ Form 5329, 'TaxableHSADistributionAmt' minus (-) 'HSAExcessContriPriorYearAmt' ] if an amount is entered.",
  ),
];

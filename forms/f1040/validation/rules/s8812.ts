/**
 * MeF Business Rules: S8812
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 4 rules (2 implemented, 2 stubs)
 */

import type { RuleDef } from "../../../../core/validation/types.ts";
import { rule, alwaysPass, all, eqField, eqStr, hasNonZero, hasValue, ifThen, isZero, not, noValue, } from "../../../../core/validation/mod.ts";

export const S8812_RULES: readonly RuleDef[] = [
  rule(
    "S8812-F1040-003-04",
    "reject",
    "incorrect_data",
    alwaysPass,
    "Schedule 8812 (Form 1040) Part II-A, Part II-B, and Part II-C must not have entries if Form 2555, 'TotalIncomeExclusionAmt' or 'HousingDeductionAmt' has a non-zero value.",
  ),
  rule(
    "S8812-F1040-005",
    "reject",
    "incorrect_data",
    ifThen(hasValue("QlfyChildUnderAgeSSNCnt"), eqField("QlfyChildUnderAgeSSNCnt", "EligibleForChildTaxCreditInd")),
    "Schedule 8812 (Form 1040), 'QlfyChildUnderAgeSSNCnt' must be equal to the number of dependents with 'EligibleForChildTaxCreditInd' checked in the return.",
  ),
  rule(
    "S8812-F1040-012-01",
    "reject",
    "incorrect_data",
    ifThen(eqStr("CTCODCOverAGILimitInd", "No"), all(noValue("ClaimACTCAllFilersGrp"), isZero("CTCODCAmt"), isZero("AdditionalChildTaxCreditAmt"))),
    "If Schedule 8812, 'CTCODCOverAGILimitInd' has a choice of \"No\" indicated, then 'ClaimACTCAllFilersGrp' must not have a value and [ 'CTCODCAmt' and 'AdditionalChildTaxCreditAmt' ] must be zero if an amount is entered.",
  ),
  rule(
    "S8812-F1040-014",
    "reject",
    "incorrect_data",
    ifThen(hasValue("OtherDependentCnt"), eqField("OtherDependentCnt", "EligibleForODCInd")),
    "Schedule 8812 (Form 1040), 'OtherDependentCnt' must be equal to the number of dependents with 'EligibleForODCInd' checked in the return.",
  ),
];

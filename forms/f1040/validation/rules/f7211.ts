/**
 * MeF Business Rules: F7211
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 3 rules (1 implemented, 2 stubs)
 */

import type { RuleDef } from "../../../../core/validation/types.ts";
import { rule, alwaysPass, any, hasValue, ifThen, not, } from "../../../../core/validation/mod.ts";

export const F7211_RULES: readonly RuleDef[] = [
  rule(
    "F7211-001",
    "reject",
    "incorrect_data",
    ifThen(any(hasValue("ProjectNetOutputUnder1MWInd"), hasValue("FcltyConstrBeganBfrSpcfdDtInd"), hasValue("FcltyStsfyWgAprntcshpRqrInd")), not(hasValue("FcltyQlfyClmCrAltAmtNoInd"))),
    "If Form 7211, [ 'ProjectNetOutputUnder1MWInd' or 'FcltyConstrBeganBfrSpcfdDtInd' or 'FcltyStsfyWgAprntcshpRqrInd' ] is checked, then 'FcltyQlfyClmCrAltAmtNoInd' must not be checked.",
  ),
  rule(
    "F7211-002",
    "reject",
    "math_error",
    alwaysPass,
    "In each 'CleanElectricityProdGrp' on Form 7211, if 'CalculatedCreditAmt' has a non-zero value, then it must be equal to the product of the corresponding 'KilowattHrsQty' and 'InflationAdjustedCreditRtAmt'.",
  ),
  rule(
    "F7211-003",
    "reject",
    "incorrect_data",
    alwaysPass,
    "In each 'CleanElectricityProdGrp' on Form 7211, if 'CalendarYr' has a value, then it must not be prior to 'TaxYr' in the Return Header.",
  ),
];

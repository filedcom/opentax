/**
 * MeF Business Rules: F7211
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 3 rules
 */

import type { RuleDef } from "../../../../../../../core/validation/types.ts";
import {
  any,
  dateYearGte,
  eachGroup,
  eqRoundedFieldProduct,
  hasNonZero,
  hasValue,
  ifThen,
  not,
  rule,
} from "../../../../../../../core/validation/mod.ts";

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
    eachGroup(
      "CleanElectricityProdGrp",
      ifThen(
        hasNonZero("CalculatedCreditAmt"),
        eqRoundedFieldProduct("CalculatedCreditAmt", "KilowattHrsQty", "InflationAdjustedCreditRtAmt"),
      ),
    ),
    "In each 'CleanElectricityProdGrp' on Form 7211, if 'CalculatedCreditAmt' has a non-zero value, then it must be equal to the product of the corresponding 'KilowattHrsQty' and 'InflationAdjustedCreditRtAmt'.",
  ),
  rule(
    "F7211-003",
    "reject",
    "incorrect_data",
    eachGroup(
      "CleanElectricityProdGrp",
      ifThen(hasValue("CalendarYr"), dateYearGte("CalendarYr", "TaxYr")),
    ),
    "In each 'CleanElectricityProdGrp' on Form 7211, if 'CalendarYr' has a value, then it must not be prior to 'TaxYr' in the Return Header.",
  ),
];

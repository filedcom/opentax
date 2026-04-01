/**
 * MeF Business Rules: F172
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 4 rules (2 implemented, 2 stubs)
 */

import type { RuleDef } from "../../../../core/validation/types.ts";
import { rule, alwaysPass, any, eqStr, hasValue, ifThen, notGtNum, } from "../../../../core/validation/mod.ts";

export const F172_RULES: readonly RuleDef[] = [
  rule(
    "F172-003",
    "reject",
    "incorrect_data",
    ifThen(hasValue("NOLCarryoverPrecYrGrp"), any(eqStr("PrecedingYearNum", "1st"), eqStr("PrecedingYearNum", "2nd"))),
    "If Form 172, 'NOLCarryoverPrecYrGrp' has a value, then [ 'PrecedingYearNum' in 'NOLCarryoverPrecYrGrp' ] must have one of the following values: \"1st\" or \"2nd\".",
  ),
  rule(
    "F172-004",
    "reject",
    "incorrect_data",
    alwaysPass,
    "On Form 172, there must not be two or more instances of 'NOLCarryoverPrecYrGrp' having the same 'PrecedingYearNum'.",
  ),
  rule(
    "F172-005",
    "reject",
    "incorrect_data",
    alwaysPass,
    "On Form 172, instances of 'NOLCarryoverPrecYrGrp' must be provided in descending order based on the value of 'PrecedingYearNum'.",
  ),
  rule(
    "F172-006",
    "reject",
    "incorrect_data",
    notGtNum("SmllrCombNetSchDLossOrFSAmt", 3000),
    "Form 172, 'SmllrCombNetSchDLossOrFSAmt' must not have a value greater than 3000.",
  ),
];

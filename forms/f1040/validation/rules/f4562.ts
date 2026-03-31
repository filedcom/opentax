/**
 * MeF Business Rules: F4562
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 2 rules (2 implemented, 0 stubs)
 */

import type { RuleDef } from "../../../../core/validation/types.ts";
import { rule, notGtNum, } from "../../../../core/validation/mod.ts";

export const F4562_RULES: readonly RuleDef[] = [
  rule(
    "F4562-002-10",
    "reject",
    "incorrect_data",
    notGtNum("MaximumDollarLimitationAmt", 1),
    "If Form 4562, 'MaximumDollarLimitationAmt' has a non-zero value, then 'MaximumDollarLimitationAmt' must not be greater than 1,220,000.",
  ),
  rule(
    "F4562-003-11",
    "reject",
    "incorrect_data",
    notGtNum("ThresholdCostOfSect179PropAmt", 3),
    "If Form 4562, 'ThresholdCostOfSect179PropAmt' has a non-zero value, then 'ThresholdCostOfSect179PropAmt' must not be greater than 3,050,000.",
  ),
];

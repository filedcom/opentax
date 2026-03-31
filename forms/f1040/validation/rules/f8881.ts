/**
 * MeF Business Rules: F8881
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 2 rules (2 implemented, 0 stubs)
 */

import type { RuleDef } from "../../../../core/validation/types.ts";
import { rule, hasNonZero, notGtNum, } from "../../../../core/validation/mod.ts";

export const F8881_RULES: readonly RuleDef[] = [
  rule(
    "F8881-001-02",
    "reject",
    "incorrect_data",
    notGtNum("AutoEnrlmtOptForRetireSavCrAmt", 500),
    "Form 8881, 'AutoEnrlmtOptForRetireSavCrAmt' must not be greater than 500.",
  ),
  rule(
    "F8881-002-01",
    "reject",
    "missing_data",
    hasNonZero("PensionPlanStartupCostsCrAmt"),
    "Form 8881, 'PensionPlanStartupCostsCrAmt' must have a non-zero value if an amount is entered.",
  ),
];

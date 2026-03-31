/**
 * MeF Business Rules: F8829
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 1 rules (0 implemented, 1 stubs)
 */

import type { RuleDef } from "../../../../core/validation/types.ts";
import { rule, notGtNum, } from "../../../../core/validation/mod.ts";

export const F8829_RULES: readonly RuleDef[] = [
  rule(
    "F8829-002",
    "reject",
    "incorrect_data",
    notGtNum("TotalHoursAvailableCnt", 8784),
    "Form 8829, 'TotalHoursAvailableCnt' must not have a value greater than: [ 8760, if the tax year for which the return is being filed is not a leap year ] or [ 8784, if it is a leap year ].",
  ),
];

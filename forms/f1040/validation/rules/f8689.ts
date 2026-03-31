/**
 * MeF Business Rules: F8689
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 2 rules (0 implemented, 2 stubs)
 */

import type { RuleDef } from "../../../../core/validation/types.ts";
import { rule, isZero, } from "../../../../core/validation/mod.ts";

export const F8689_RULES: readonly RuleDef[] = [
  rule(
    "F8689-002",
    "reject",
    "incorrect_data",
    isZero("TuitionAndFeesDedAmt"),
    "Form 8689 'TuitionAndFeesDedAmt' must be equal to zero if an amount is entered.",
  ),
  rule(
    "F8689-003",
    "reject",
    "incorrect_data",
    isZero("CharitableContributionAmt"),
    "Form 8689 'CharitableContributionAmt' must be equal to zero if an amount is entered.",
  ),
];

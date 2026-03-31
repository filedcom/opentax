/**
 * MeF Business Rules: F5074
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 2 rules (0 implemented, 2 stubs)
 */

import type { RuleDef } from "../../../../core/validation/types.ts";
import { rule, isZero, } from "../../../../core/validation/mod.ts";

export const F5074_RULES: readonly RuleDef[] = [
  rule(
    "F5074-002",
    "reject",
    "incorrect_data",
    isZero("TuitionAndFeesDedAmt"),
    "Form 5074, 'TuitionAndFeesDedAmt' must be equal to zero if an amount is entered.",
  ),
  rule(
    "F5074-003",
    "reject",
    "incorrect_data",
    isZero("CharitableContributionAmt"),
    "Form 5074, 'CharitableContributionAmt' must be equal to zero if an amount is entered.",
  ),
];

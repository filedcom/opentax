/**
 * MeF Business Rules: F8908
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 1 rules (0 implemented, 1 stubs)
 */

import type { RuleDef } from "../../../../core/validation/types.ts";
import { rule, alwaysPass, } from "../../../../core/validation/mod.ts";

export const F8908_RULES: readonly RuleDef[] = [
  rule(
    "F8908-005",
    "reject",
    "incorrect_data",
    alwaysPass,
    "Form 8908, 'StateAbbreviationCd' must not have a value of \"AS\", \"MP\", \"FM\", \"GU\", \"MH\", \"PW\", \"PR\", or \"VI\".",
  ),
];

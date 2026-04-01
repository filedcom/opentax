/**
 * MeF Business Rules: F8908
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 1 rules (1 implemented, 0 stubs)
 */

import type { RuleDef } from "../../../../core/validation/types.ts";
import { rule, any, eqStr, not, } from "../../../../core/validation/mod.ts";

export const F8908_RULES: readonly RuleDef[] = [
  rule(
    "F8908-005",
    "reject",
    "incorrect_data",
    not(any(eqStr("StateAbbreviationCd", "AS"), eqStr("StateAbbreviationCd", "MP"), eqStr("StateAbbreviationCd", "FM"), eqStr("StateAbbreviationCd", "GU"), eqStr("StateAbbreviationCd", "MH"), eqStr("StateAbbreviationCd", "PW"), eqStr("StateAbbreviationCd", "PR"), eqStr("StateAbbreviationCd", "VI"))),
    "Form 8908, 'StateAbbreviationCd' must not have a value of \"AS\", \"MP\", \"FM\", \"GU\", \"MH\", \"PW\", \"PR\", or \"VI\".",
  ),
];

/**
 * MeF Business Rules: F9000
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 2 rules (1 implemented, 1 stubs)
 */

import type { RuleDef } from "../../../../core/validation/types.ts";
import { rule, alwaysPass, matchesHeaderSSN, } from "../../../../core/validation/mod.ts";

export const F9000_RULES: readonly RuleDef[] = [
  rule(
    "F9000-001",
    "reject",
    "incorrect_data",
    matchesHeaderSSN("SSN"),
    "Form 9000, 'SSN' must be the same as 'PrimarySSN' or 'SpouseSSN' in the Return Header.",
  ),
  rule(
    "F9000-002",
    "reject",
    "incorrect_data",
    alwaysPass,
    "If two Forms 9000 are present in the return, then their 'SSN' must not be the same.",
  ),
];

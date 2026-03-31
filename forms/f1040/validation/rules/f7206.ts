/**
 * MeF Business Rules: F7206
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 1 rules (0 implemented, 1 stubs)
 */

import type { RuleDef } from "../../../../core/validation/types.ts";
import { rule, matchesHeaderSSN, } from "../../../../core/validation/mod.ts";

export const F7206_RULES: readonly RuleDef[] = [
  rule(
    "F7206-001",
    "reject",
    "incorrect_data",
    matchesHeaderSSN("SSN"),
    "Form 7206, 'SSN' must be the same as the 'PrimarySSN' or 'SpouseSSN' in the Return Header.",
  ),
];

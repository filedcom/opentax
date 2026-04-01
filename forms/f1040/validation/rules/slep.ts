/**
 * MeF Business Rules: SLEP
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 2 rules (1 implemented, 1 stub)
 */

import type { RuleDef } from "../../../../core/validation/types.ts";
import { rule, alwaysPass, matchesHeaderSSN, } from "../../../../core/validation/mod.ts";

export const SLEP_RULES: readonly RuleDef[] = [
  rule(
    "SLEP-F1040-001",
    "reject",
    "incorrect_data",
    matchesHeaderSSN("SSN"),
    "For each Schedule LEP (Form 1040) present in the return, 'SSN' must be equal to 'PrimarySSN' or 'SpouseSSN' in the Return Header.",
  ),
  rule(
    "SLEP-F1040-002",
    "reject",
    "incorrect_data",
    alwaysPass, // requires cross-instance check: two Schedule LEPs must have distinct SSNs
    "If two Schedule LEPs (Form 1040) are present in the return, their Social Security Numbers must not be the same.",
  ),
];

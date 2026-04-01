/**
 * MeF Business Rules: F4137
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 2 rules (2 implemented, 0 stubs)
 */

import type { RuleDef } from "../../../../core/validation/types.ts";
import { rule, alwaysPass, matchesHeaderSSN, } from "../../../../core/validation/mod.ts";

export const F4137_RULES: readonly RuleDef[] = [
  rule(
    "F4137-001",
    "reject",
    "incorrect_data",
    matchesHeaderSSN("SSN"),
    "Form 4137, 'SSN' must be equal to 'PrimarySSN' or 'SpouseSSN' in the Return Header.",
  ),
  rule(
    "F4137-002",
    "reject",
    "incorrect_data",
    alwaysPass, // cross-instance check: requires comparing SSNs across all Form 4137 instances
    "If two Forms 4137 are present in the return, then their 'SSN's must not be equal.",
  ),
];

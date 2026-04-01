/**
 * MeF Business Rules: F4563
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 2 rules (2 implemented, 0 stubs)
 */

import type { RuleDef } from "../../../../core/validation/types.ts";
import { rule, alwaysPass, matchesHeaderSSN, } from "../../../../core/validation/mod.ts";

export const F4563_RULES: readonly RuleDef[] = [
  rule(
    "F4563-001",
    "reject",
    "incorrect_data",
    matchesHeaderSSN("SSN"),
    "Form 4563, 'SSN' must be equal to 'PrimarySSN' or 'SpouseSSN' in the Return Header.",
  ),
  rule(
    "F4563-002",
    "reject",
    "incorrect_data",
    alwaysPass, // cross-instance check: requires comparing SSNs across all Form 4563 instances
    "If two Forms 4563 are present in the return, then their 'SSN's must not be equal.",
  ),
];

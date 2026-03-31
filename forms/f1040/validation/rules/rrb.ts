/**
 * MeF Business Rules: RRB
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 1 rules (1 implemented, 0 stubs)
 */

import type { RuleDef } from "../../../../core/validation/types.ts";
import { rule, matchesHeaderSSN, } from "../../../../core/validation/mod.ts";

export const RRB_RULES: readonly RuleDef[] = [
  rule(
    "RRB-F1042S-001",
    "reject",
    "incorrect_data",
    matchesHeaderSSN("SSN"),
    "Form RRB 1042-S 'SSN' must be equal to the 'PrimarySSN' or 'SpouseSSN' in the Return Header.",
  ),
];

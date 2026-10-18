/**
 * MeF Business Rules: F2106
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 3 rules (3 implemented)
 */

import type { RuleDef } from "../../../../../../core/validation/types.ts";
import {
  amountLte,
  constant,
  matchesHeaderSSN,
  rule,
  someMatchesFilerSSN,
} from "../../../../../../core/validation/mod.ts";
import {
  documentCountWhere,
} from "../../../../../../core/validation/predicates.ts";

export const F2106_RULES: readonly RuleDef[] = [
  rule(
    "F2106-001-01",
    "reject",
    "incorrect_data",
    matchesHeaderSSN("SSN"),
    "Form 2106, 'SSN' provided must be equal to the 'PrimarySSN' or the 'SpouseSSN' in the Return Header.",
  ),
  rule(
    "F2106-002-01",
    "reject",
    "incorrect_data",
    amountLte(documentCountWhere("F2106", someMatchesFilerSSN("primary", "SSN")), constant(2)),
    "There can be no more than 2 Forms 2106 present whose 'SSN' is the same as the 'PrimarySSN' in the Return Header.",
  ),
  rule(
    "F2106-003-01",
    "reject",
    "incorrect_data",
    amountLte(documentCountWhere("F2106", someMatchesFilerSSN("spouse", "SSN")), constant(2)),
    "There can be no more than 2 Forms 2106 present whose 'SSN' is the same as the 'SpouseSSN' in Return Header.",
  ),
];

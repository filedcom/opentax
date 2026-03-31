/**
 * MeF Business Rules: F8606
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 4 rules (4 implemented, 0 stubs)
 */

import type { RuleDef } from "../../../../core/validation/types.ts";
import { rule, charCountAtMost, contains, matchesHeaderSSN, notGtNum, } from "../../../../core/validation/mod.ts";

export const F8606_RULES: readonly RuleDef[] = [
  rule(
    "F8606-001",
    "reject",
    "incorrect_data",
    matchesHeaderSSN("NondedIRATxpyrWithIRASSN"),
    "Form 8606, 'NondedIRATxpyrWithIRASSN' must be equal to 'PrimarySSN' or 'SpouseSSN' in the Return Header.",
  ),
  rule(
    "F8606-003",
    "reject",
    "incorrect_data",
    notGtNum("QlfyFirstTimeHmByrExpensesAmt", 10000),
    "Form 8606, Line 20 'QlfyFirstTimeHmByrExpensesAmt' must not be greater than 10000.",
  ),
  rule(
    "F8606-004-01",
    "reject",
    "incorrect_data",
    contains("Form8606IRANamelineTxt", "<"),
    "Form 8606 'Form8606IRANamelineTxt' must contain a less-than sign (<).",
  ),
  rule(
    "F8606-005-01",
    "reject",
    "incorrect_data",
    charCountAtMost("Form8606IRANamelineTxt", "<", 2),
    "Form 8606 'Form8606IRANamelineTxt' must not contain more than two less-than-signs (<).",
  ),
];

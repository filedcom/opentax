/**
 * MeF Business Rules: F8828
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 1 rules (0 implemented, 1 stubs)
 */

import type { RuleDef } from "../../../../core/validation/types.ts";
import { rule, dateGteConst, } from "../../../../core/validation/mod.ts";

export const F8828_RULES: readonly RuleDef[] = [
  rule(
    "F8828-001",
    "reject",
    "incorrect_data",
    dateGteConst("MortgSbsdyOriginalLoanClsDt", 1991, 1, 1),
    "Form 8828, Line 5 'MortgSbsdyOriginalLoanClsDt' must not be before January 1, 1991.",
  ),
];

/**
 * MeF Business Rules: F4952
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 1 rules (0 implemented, 1 stubs)
 */

import type { RuleDef } from "../../../../core/validation/types.ts";
import { rule, any, hasNonZero, } from "../../../../core/validation/mod.ts";

export const F4952_RULES: readonly RuleDef[] = [
  rule(
    "F4952-001",
    "reject",
    "incorrect_data",
    any(hasNonZero("InvestmentInterestExpenseAmt"), hasNonZero("PriorYrDisallowInvsmtIntExpAmt"), hasNonZero("InvestmentInterestExpDeductAmt")),
    "Form 4952, Line 1 'InvestmentInterestExpenseAmt' or Line 2 'PriorYrDisallowInvsmtIntExpAmt' or Line 8 'InvestmentInterestExpDeductAmt' must have a non-zero value.",
  ),
];

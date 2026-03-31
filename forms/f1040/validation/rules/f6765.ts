/**
 * MeF Business Rules: F6765
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 3 rules (1 implemented, 2 stubs)
 */

import type { RuleDef } from "../../../../core/validation/types.ts";
import { rule, alwaysPass, notGtNum, } from "../../../../core/validation/mod.ts";

export const F6765_RULES: readonly RuleDef[] = [
  rule(
    "F6765-003-01",
    "reject",
    "incorrect_data",
    notGtNum("FixedBasedPct", 16),
    "Form 6765, 'FixedBasedPct' must not be greater than 16% (0.16000).",
  ),
  rule(
    "F6765-004-02",
    "reject",
    "incorrect_data",
    alwaysPass,
    "If Form 6765 has significant data on any Line in Section A, then if an amount is entered on any Line in Section B, it must have a zero value.",
  ),
  rule(
    "F6765-008",
    "reject",
    "incorrect_data",
    notGtNum("PayrollTaxLimitationAmt", 500000),
    "Form 6765, 'PayrollTaxLimitationAmt' must not have a value greater than 500000.",
  ),
];

/**
 * MeF Business Rules: SSA
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 2 rules (2 implemented, 0 stubs)
 */

import type { RuleDef } from "../../../../core/validation/types.ts";
import { rule, eqDiff, hasNonZero, ifThen, matchesHeaderSSN, } from "../../../../core/validation/mod.ts";

export const SSA_RULES: readonly RuleDef[] = [
  rule(
    "SSA-F1042S-001",
    "reject",
    "math_error",
    ifThen(hasNonZero("RefundAmt"), eqDiff("NetTaxWithheldAmt", "FederalIncomeTaxWithheldAmt", "RefundAmt")),
    "If Form SSA 1042-S, 'RefundAmt' has a non-zero value, then 'NetTaxWithheldAmt' must be equal to 'FederalIncomeTaxWithheldAmt' minus (-) 'RefundAmt'.",
  ),
  rule(
    "SSA-F1042S-002",
    "reject",
    "incorrect_data",
    matchesHeaderSSN("SSN"),
    "Form SSA 1042-S 'SSN' must be equal to the 'PrimarySSN' or 'SpouseSSN' in  the Return Header.",
  ),
];

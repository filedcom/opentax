/**
 * MeF Business Rules: F8995
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 2 rules (2 implemented, 0 stubs)
 */

import type { RuleDef } from "../../../../../../core/validation/types.ts";
import {
  eqField,
  eqRoundedProduct,
  hasNonZero,
  hasValue,
  ifThen,
  rule,
} from "../../../../../../core/validation/mod.ts";

export const F8995_RULES: readonly RuleDef[] = [
  rule(
    "F8995-001",
    "reject",
    "math_error",
    ifThen(hasNonZero("QBIComponentAmt"), eqRoundedProduct("QBIComponentAmt", "TotQualifiedBusinessIncomeAmt", 0.2)),
    "If Form 8995, 'QBIComponentAmt' has a non-zero value, then it must be equal to 'TotQualifiedBusinessIncomeAmt' multiplied by 20% (0.20).",
  ),
  rule(
    "F8995-002",
    "reject",
    "math_error",
    ifThen(hasValue("REITPTPComponentAmt"), eqField("REITPTPComponentAmt", "TotQlfyREITDivPTPIncomeAmt")),
    "If Form 8995, 'REITPTPComponentAmt' has a non-zero value, then it must be equal to 'TotQlfyREITDivPTPIncomeAmt' multiplied by 20% (0.20).",
  ),
];

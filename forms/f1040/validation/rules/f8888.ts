/**
 * MeF Business Rules: F8888
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 5 rules (5 implemented, 0 stubs)
 */

import type { RuleDef } from "../../../../core/validation/types.ts";
import { rule, allDistinct, eqField, eqSum, hasNonZero, hasValue, ifThen, notGtNum, } from "../../../../core/validation/mod.ts";

export const F8888_RULES: readonly RuleDef[] = [
  rule(
    "F8888-001-04",
    "reject",
    "math_error",
    eqSum("TotalAllocationOfRefundAmt", "DirectDepositRefundAmt", "RefundByCheckAmt"),
    "The sum of all amounts on Form 8888, 'DirectDepositRefundAmt' and 'RefundByCheckAmt' must be equal to 'TotalAllocationOfRefundAmt'.",
  ),
  rule(
    "F8888-002-03",
    "reject",
    "data_mismatch",
    ifThen(hasValue("TotalAllocationOfRefundAmt"), eqField("TotalAllocationOfRefundAmt", "RefundAmt")),
    "Form 8888, 'TotalAllocationOfRefundAmt' must be equal to 'RefundAmt' in the return.",
  ),
  rule(
    "F8888-015",
    "reject",
    "duplicate",
    allDistinct("DepositorAccountNum"),
    "'DepositorAccountNum' on Form 8888 must be unique.",
  ),
  rule(
    "F8888-016",
    "reject",
    "incorrect_data",
    hasNonZero("DepositorAccountNum"),
    "'DepositorAccountNum' on Form 8888 must not be all zeros.",
  ),
  rule(
    "F8888-020",
    "reject",
    "incorrect_data",
    notGtNum("AmendedReturnInd", 999),
    "If 'AmendedReturnInd' [1040, 1040NR], 'SupersededReturnInd' [1040, 1040NR, 1040SSPR] or 'CorrectedReturnInd' [1040SSPR] in the return is checked, and Form 8888 is present in the return, then 'TotalAllocationOfRefundAmt' must not be greater than 999,999,999.",
  ),
];

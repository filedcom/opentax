/**
 * MeF Business Rules: F8866
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 1 rules (0 implemented, 1 stubs)
 */

import type { RuleDef } from "../../../../core/validation/types.ts";
import { rule, alwaysPass, } from "../../../../core/validation/mod.ts";

export const F8866_RULES: readonly RuleDef[] = [
  rule(
    "F8866-002-01",
    "reject",
    "incorrect_data",
    alwaysPass,
    "If more than one Form 8866 is present in the return, then only one Form 8866 can have non-zero values on Line 7(c) 'TotalInterestDueOnIncreaseAmt' or Line 8(c) 'TotalInterestToBeRefundedAmt'.",
  ),
];

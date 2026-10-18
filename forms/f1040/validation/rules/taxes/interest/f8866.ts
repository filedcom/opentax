/**
 * MeF Business Rules: F8866
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 1 rules (1 implemented)
 */

import type { RuleDef } from "../../../../../../core/validation/types.ts";
import {
  amountLte,
  any,
  constant,
  hasNonZero,
  rule,
} from "../../../../../../core/validation/mod.ts";
import {
  documentCountWhere,
} from "../../../../../../core/validation/predicates.ts";

export const F8866_RULES: readonly RuleDef[] = [
  rule(
    "F8866-002-01",
    "reject",
    "incorrect_data",
    amountLte(
      documentCountWhere("F8866", any(hasNonZero("TotalInterestDueOnIncreaseAmt"), hasNonZero("TotalInterestToBeRefundedAmt"))),
      constant(1),
    ),
    "If more than one Form 8866 is present in the return, then only one Form 8866 can have non-zero values on Line 7(c) 'TotalInterestDueOnIncreaseAmt' or Line 8(c) 'TotalInterestToBeRefundedAmt'.",
  ),
];

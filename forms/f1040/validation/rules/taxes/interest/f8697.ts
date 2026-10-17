/**
 * MeF Business Rules: F8697
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 3 rules (3 implemented)
 */

import type { RuleDef } from "../../../../../../core/validation/types.ts";
import {
  amountLte,
  any,
  constant,
  hasNonZero,
  ifThen,
  isZero,
  matchesHeaderSSN,
  rule,
} from "../../../../../../core/validation/mod.ts";
import {
  documentCountWhere,
} from "../../../../../../core/validation/predicates.ts";

export const F8697_RULES: readonly RuleDef[] = [
  rule(
    "F8697-007-01",
    "reject",
    "incorrect_data",
    amountLte(
      documentCountWhere("F8697", any(hasNonZero("TotalInterestDueOnIncreaseAmt"), hasNonZero("TotalInterestToBeRefundedAmt"))),
      constant(1),
    ),
    "If more than one Form 8697 is present in the return, then only one Form 8697 can have non-zero values on Line 7(c) 'TotalInterestDueOnIncreaseAmt' or Line 8(c) 'TotalInterestToBeRefundedAmt'.",
  ),
  rule(
    "F8697-008-01",
    "reject",
    "incorrect_data",
    ifThen(hasNonZero("NetAmtOfInterestOwedAmt"), isZero("NetAmtOfInterestOwedAmt")),
    "If Form 8697, Part I, Line 10(c) 'NetAmtOfInterestOwedAmt' has a non-zero value then Part II, Line 11(d) 'NetAmtOfInterestOwedAmt' must have a zero value if an amount is entered.",
  ),
  rule(
    "F8697-009",
    "reject",
    "incorrect_data",
    matchesHeaderSSN("SSN"),
    "If Form 8697, Line A \"SSN\" has a value, then it must be equal to the Primary SSN or Spouse SSN in the Return Header.",
  ),
];

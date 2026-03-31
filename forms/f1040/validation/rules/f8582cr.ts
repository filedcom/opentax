/**
 * MeF Business Rules: F8582CR
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 4 rules (2 implemented, 2 stubs)
 */

import type { RuleDef } from "../../../../core/validation/types.ts";
import { rule, formPresent, hasNonZero, ifThen, notGtNum, } from "../../../../core/validation/mod.ts";

export const F8582CR_RULES: readonly RuleDef[] = [
  rule(
    "F8582CR-001",
    "reject",
    "incorrect_data",
    notGtNum("PercentNetAGIAmt", 25000),
    "Form 8582-CR, Line 12 'PercentNetAGIAmt' must not be greater than 25000.",
  ),
  rule(
    "F8582CR-002",
    "reject",
    "incorrect_data",
    notGtNum("PercentNetAGIAmt", 25000),
    "Form 8582-CR, Line 24 'PercentNetAGIAmt' must not be greater than 25000.",
  ),
  rule(
    "F8582CR-005",
    "reject",
    "missing_document",
    ifThen(hasNonZero("AllowedRentalRealtyLossAmt"), formPresent("form8582")),
    "If Form 8582-CR 'AllowedRentalRealtyLossAmt' in 'SpecialAllowActiveGrp' has a non-zero value, then Form 8582 must be present in the return.",
  ),
  rule(
    "F8582CR-006",
    "reject",
    "missing_document",
    ifThen(hasNonZero("AllowedRentalRealtyLossAmt"), formPresent("form8582")),
    "If Form 8582-CR 'AllowedRentalRealtyLossAmt' in 'SpecialAllowRehabGrp' has a non-zero value, then Form 8582 must be present in the return.",
  ),
];

/**
 * MeF Business Rules: F4797
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 3 rules (3 implemented, 0 stubs)
 */

import type { RuleDef } from "../../../../core/validation/types.ts";
import { rule, formPresent, hasNonZero, ifThen, sumOfAll, } from "../../../../core/validation/mod.ts";

export const F4797_RULES: readonly RuleDef[] = [
  rule(
    "F4797-005-01",
    "reject",
    "data_mismatch",
    ifThen(hasNonZero("GainLossForm8824Amt"), formPresent("form8824")),
    "If Form 4797, Line 5(g) 'GainLossForm8824Amt' has a non-zero value, then Form 8824 must be present in the return.",
  ),
  rule(
    "F4797-006-01",
    "reject",
    "data_mismatch",
    ifThen(hasNonZero("OrdinaryGainLossForm8824Amt"), formPresent("form8824")),
    "If Form 4797, 'OrdinaryGainLossForm8824Amt' has a non-zero value, then Form 8824 must be present in the return.",
  ),
  rule(
    "F4797-008-01",
    "reject",
    "data_mismatch",
    ifThen(formPresent("form4684"), sumOfAll("GainForm4684Amt", "LongTermPropIncomePlusGainAmt")),
    "If Form 4684 is present in the return, then Form 4797 'GainForm4684Amt' must be equal to the sum of all Forms 4684 'LongTermPropIncomePlusGainAmt'.",
  ),
];

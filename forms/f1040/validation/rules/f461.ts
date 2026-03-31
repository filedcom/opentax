/**
 * MeF Business Rules: F461
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 2 rules (1 implemented, 1 stubs)
 */

import type { RuleDef } from "../../../../core/validation/types.ts";
import { rule, all, any, eqField, eqStr, filingStatusIs, filingStatusNot, hasValue, ifThen, } from "../../../../core/validation/mod.ts";

export const F461_RULES: readonly RuleDef[] = [
  rule(
    "F461-001-01",
    "reject",
    "incorrect_data",
    ifThen(hasValue("AdjustedTotalGainOrLossAmt"), eqField("AdjustedTotalGainOrLossAmt", "TotalGainOrLossAmt")),
    "Form 461, 'AdjustedTotalGainOrLossAmt' must be equal to 'TotalGainOrLossAmt' multiplied by negative 1.",
  ),
  rule(
    "F461-002-05",
    "reject",
    "incorrect_data",
    any(all(filingStatusIs(2), eqStr("FilingStatusThresholdCd", "626000")), all(filingStatusNot(2), eqStr("FilingStatusThresholdCd", "313000"))),
    "Form 461,'FilingStatusThresholdCd' must have the value [\"626000\" if the filing status of the return is married filing jointly] or \"313000\" for all other filing status.",
  ),
];

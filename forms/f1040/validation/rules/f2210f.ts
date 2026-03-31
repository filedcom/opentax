/**
 * MeF Business Rules: F2210F
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 2 rules (1 implemented, 1 stubs)
 */

import type { RuleDef } from "../../../../core/validation/types.ts";
import { rule, alwaysPass, eqField, hasValue, ifThen, } from "../../../../core/validation/mod.ts";

export const F2210F_RULES: readonly RuleDef[] = [
  rule(
    "F2210F-001",
    "reject",
    "missing_document",
    alwaysPass,
    "If Form 2210-F, Part I, Line A checkbox 'PenaltyWaiverRequestInd' is checked, then [WaiverExplanationStatement] must be attached to Line 16.",
  ),
  rule(
    "F2210F-006",
    "reject",
    "data_mismatch",
    ifThen(hasValue("PenaltyAmt"), eqField("PenaltyAmt", "EsPenaltyAmt")),
    "Form 2210-F, 'PenaltyAmt' must be equal to 'EsPenaltyAmt' in the return.",
  ),
];

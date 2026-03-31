/**
 * MeF Business Rules: F6781
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 3 rules (3 implemented, 0 stubs)
 */

import type { RuleDef } from "../../../../core/validation/types.ts";
import { rule, hasNonZero, hasValue, ifThen, } from "../../../../core/validation/mod.ts";

export const F6781_RULES: readonly RuleDef[] = [
  rule(
    "F6781-024-01",
    "reject",
    "missing_data",
    ifThen(hasNonZero("Form1099BAdjustmentsAmt"), hasValue("ExplanationOfForm1099BAdjustmentsSchedule")),
    "If Form 6781, Line 4c 'Form1099BAdjustmentsAmt' has a non-zero value, then \"Explanation of Form 1099-B Adjustments Schedule\" [ExplanationOfForm1099BAdjustmentsSchedule] must be attached to line 4c.",
  ),
  rule(
    "F6781-025-01",
    "reject",
    "missing_data",
    ifThen(hasValue("PropertyDesc"), hasValue("StraddlesAndComponentsSchedule")),
    "If any Line 10a 'PropertyDesc' on Form 6781 has a value, then \"Straddles and Components Schedule\" [StraddlesAndComponentsSchedule] must be present in the return.",
  ),
  rule(
    "F6781-026",
    "reject",
    "missing_data",
    ifThen(hasValue("MixedStraddleAccountInd"), hasValue("MixedStraddleAccountElectionStatement")),
    "If Form 6781, Line C 'MixedStraddleAccountInd' checkbox is checked, then [MixedStraddleAccountElectionStatement] must be attached to Line C.",
  ),
];

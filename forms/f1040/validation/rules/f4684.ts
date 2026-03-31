/**
 * MeF Business Rules: F4684
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 1 rules (0 implemented, 1 stubs)
 */

import type { RuleDef } from "../../../../core/validation/types.ts";
import { rule, alwaysPass, } from "../../../../core/validation/mod.ts";

export const F4684_RULES: readonly RuleDef[] = [
  rule(
    "F4684-003-02",
    "reject",
    "missing_data",
    alwaysPass,
    "If more than one Form 4684 is present in the return, then only one Form 4684 can have non-zero values in the following:Line 13 'TotalCasualtyAndTheftGainAmt' Line 14 'TotalNetCasualtyOrTheftLossAmt' Line 15 'TotalTheftGainLessTotalLossAmt' Line 16 'TotalLossLessTotalTheftGainAmt' Line 17 'TenPercentOfAGIAmt' Line 18 'CalcAdjGroIncmMnsTotNetLossAmt'.",
  ),
];

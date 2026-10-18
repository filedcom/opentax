/**
 * MeF Business Rules: F8594
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 1 rules
 */

import type { RuleDef } from "../../../../../../../core/validation/types.ts";
import {
  documentPresent,
  eqStr,
  ifThen,
  rule,
} from "../../../../../../../core/validation/mod.ts";

export const F8594_RULES: readonly RuleDef[] = [
  rule(
    "F8594-001-01",
    "reject",
    "missing_document",
    ifThen(eqStr("PrchsOrEntrAgrmtWithSellrInd", "Yes"), documentPresent("ConsiderationComputationStatement")),
    "If Form 8594, Line 6 'PrchsOrEntrAgrmtWithSellrInd' has a choice of \"Yes\" indicated, then \"Form 8594 Consideration Computation Statement\" [ConsiderationComputationStatement] must be attached to Line 6.",
  ),
];

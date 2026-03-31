/**
 * MeF Business Rules: F8993
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 1 rules (0 implemented, 1 stubs)
 */

import type { RuleDef } from "../../../../core/validation/types.ts";
import { rule, formPresent, gt, ifThen, } from "../../../../core/validation/mod.ts";

export const F8993_RULES: readonly RuleDef[] = [
  rule(
    "F8993-002",
    "reject",
    "missing_document",
    ifThen(gt("GILTIReceivedAmt", 0), formPresent("form8992")),
    "If Form 8993, 'GILTIReceivedAmt' has a value greater than zero, then Form 8992 must be present in the return.",
  ),
];

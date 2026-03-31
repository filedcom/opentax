/**
 * MeF Business Rules: F8826
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 1 rules (0 implemented, 1 stubs)
 */

import type { RuleDef } from "../../../../core/validation/types.ts";
import { rule, lt, } from "../../../../core/validation/mod.ts";

export const F8826_RULES: readonly RuleDef[] = [
  rule(
    "F8826-002",
    "reject",
    "incorrect_data",
    lt("PrtshpandSCorpReportAmt", 5001),
    "Form 8826, Line 8 'PrtshpandSCorpReportAmt' must be less than 5001.",
  ),
];

/**
 * MeF Business Rules: SCHK3
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 3 rules (3 implemented, 0 stubs)
 */

import type { RuleDef } from "../../../../core/validation/types.ts";
import { rule, alwaysPass, } from "../../../../core/validation/mod.ts";

export const SCHK3_RULES: readonly RuleDef[] = [
  rule(
    "SCHK3-001",
    "reject",
    "incorrect_data",
    alwaysPass,
    "If [ScheduleK3BaseErosionWorksheetBStatement] is present in the return, then it must be referenced from one and only one of the following: Schedule K-3 (Form 1065) or Schedule K-3 (Form 8865).",
  ),
  rule(
    "SCHK3-002",
    "reject",
    "incorrect_data",
    alwaysPass,
    "If [ScheduleK3InterestExpenseWorksheetAStatement] is present in the return, then it must be referenced from one and only one of the following: Schedule K-3 (Form 1065) or Schedule K-3 (Form 8865).",
  ),
  rule(
    "SCHK3-004",
    "reject",
    "incorrect_data",
    alwaysPass,
    "If [ScheduleK3Section267ADisallowedDeductionStatement] is present in the return, then it must be referenced from one and only one of the following: Schedule K-3 (Form 1065) or Schedule K-3 (Form 1120-S) or Schedule K-3 (Form 8865).",
  ),
];

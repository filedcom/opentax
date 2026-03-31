/**
 * MeF Business Rules: F8880
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 1 rules (1 implemented, 0 stubs)
 */

import type { RuleDef } from "../../../../core/validation/types.ts";
import { rule, eqField, hasValue, ifThen, } from "../../../../core/validation/mod.ts";

export const F8880_RULES: readonly RuleDef[] = [
  rule(
    "F8880-001-04",
    "reject",
    "data_mismatch",
    ifThen(hasValue("CrQualifiedRetirementSavAmt"), eqField("CrQualifiedRetirementSavAmt", "RtrSavingsContributionsCrAmt")),
    "Form 8880, 'CrQualifiedRetirementSavAmt' must be equal to 'RtrSavingsContributionsCrAmt' in Schedule 3 (Form 1040).",
  ),
];

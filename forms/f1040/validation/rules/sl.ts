/**
 * MeF Business Rules: SL
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 2 rules (0 implemented, 2 stubs)
 */

import type { RuleDef } from "../../../../core/validation/types.ts";
import { rule, alwaysPass, ifThen, hasValue, } from "../../../../core/validation/mod.ts";

export const SL_RULES: readonly RuleDef[] = [
  rule(
    "SL-F1118-001",
    "reject",
    "incorrect_data",
    alwaysPass,
    "If Schedule L (Form 1118) is present in the return, then it must be referenced from one and only one Form 1118.",
  ),
  rule(
    "SL-F1118-002",
    "reject",
    "incorrect_data",
    ifThen(hasValue("ContestResolvedInd"), hasValue("ContestResolvedDt")),
    "In each 'AnnualRptgContestedTaxesGrp' on Schedule L (Form 1118), if 'ContestResolvedInd' is checked, then 'ContestResolvedDt' must have a value.",
  ),
];

/**
 * MeF Business Rules: F8917
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 1 rules (0 implemented, 1 stubs)
 */

import type { RuleDef } from "../../../../core/validation/types.ts";
import { rule, formAbsent, } from "../../../../core/validation/mod.ts";

export const F8917_RULES: readonly RuleDef[] = [
  rule(
    "F8917-014",
    "reject",
    "incorrect_data",
    formAbsent("form8917"),
    "Form 8917 must not be present in the return.",
  ),
];

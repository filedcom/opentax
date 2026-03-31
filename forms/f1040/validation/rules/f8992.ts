/**
 * MeF Business Rules: F8992
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 1 rules (0 implemented, 1 stubs)
 */

import type { RuleDef } from "../../../../core/validation/types.ts";
import { rule, any, formPresent, } from "../../../../core/validation/mod.ts";

export const F8992_RULES: readonly RuleDef[] = [
  rule(
    "F8992-006",
    "reject",
    "missing_document",
    any(formPresent("schedule_a_form8992"), formPresent("schedule_b_form8992")),
    "A return containing Form 8992 must include a Schedule A (Form 8992) or Schedule B (Form 8992).",
  ),
];

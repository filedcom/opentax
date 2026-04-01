/**
 * MeF Business Rules: SG
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 1 rules (0 implemented, 1 stubs)
 */

import type { RuleDef } from "../../../../core/validation/types.ts";
import { rule, alwaysPass, } from "../../../../core/validation/mod.ts";

export const SG_RULES: readonly RuleDef[] = [
  rule(
    "SG-F8865-001",
    "reject",
    "incorrect_data",
    alwaysPass, // requires cross-instance reference count: Schedule G (Form 8865) must be referenced from exactly one Form 8865
    "If Schedule G (Form 8865) is present in the return, then it must be referenced from one and only one Form 8865.",
  ),
];

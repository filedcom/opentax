/**
 * MeF Business Rules: SK1
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 2 rules (0 implemented, 2 stubs)
 */

import type { RuleDef } from "../../../../core/validation/types.ts";
import { rule, alwaysPass, any, hasValue, } from "../../../../core/validation/mod.ts";

export const SK1_RULES: readonly RuleDef[] = [
  rule(
    "SK1-F8865-001",
    "reject",
    "incorrect_data",
    alwaysPass,
    "If Schedule K-1 (Form 8865) is present in the return, then it must be referenced from one and only one Form 8865.",
  ),
  rule(
    "SK1-F8865-002-01",
    "reject",
    "missing_data",
    any(hasValue("PartnershipsEIN"), hasValue("ForeignEntityReferenceIdNum")),
    "Schedule K1 (Form 8865) 'PartnershipsEIN' or 'ForeignEntityReferenceIdNum' must have a value.",
  ),
];

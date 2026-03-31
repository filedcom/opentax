/**
 * MeF Business Rules: F8833
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 1 rules (0 implemented, 1 stubs)
 */

import type { RuleDef } from "../../../../core/validation/types.ts";
import { rule, any, hasValue, } from "../../../../core/validation/mod.ts";

export const F8833_RULES: readonly RuleDef[] = [
  rule(
    "F8833-001-02",
    "reject",
    "missing_data",
    any(hasValue("EIN"), hasValue("SSN"), hasValue("ForeignEntityReferenceIdNum")),
    "Form 8833 'EIN' or 'SSN' or 'ForeignEntityReferenceIdNum' must have a value.",
  ),
];

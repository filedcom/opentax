/**
 * MeF Business Rules: F926
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 1 rules (0 implemented, 1 stubs)
 */

import type { RuleDef } from "../../../../core/validation/types.ts";
import { rule, any, hasValue, } from "../../../../core/validation/mod.ts";

export const F926_RULES: readonly RuleDef[] = [
  rule(
    "F926-001-01",
    "reject",
    "missing_data",
    any(hasValue("TransfereeEIN"), hasValue("ForeignEntityReferenceIdNum")),
    "Form 926, 'TransfereeEIN' or 'ForeignEntityReferenceIdNum' must have a value.",
  ),
];

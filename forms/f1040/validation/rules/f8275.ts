/**
 * MeF Business Rules: F8275
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 1 rules (0 implemented, 1 stubs)
 */

import type { RuleDef } from "../../../../core/validation/types.ts";
import { rule, any, hasValue, ifThen, } from "../../../../core/validation/mod.ts";

export const F8275_RULES: readonly RuleDef[] = [
  rule(
    "F8275-001-01",
    "reject",
    "missing_data",
    ifThen(hasValue("ForeignEntityName"), any(hasValue("ForeignEntityEIN"), hasValue("ForeignEntityReferenceIdNum"))),
    "If 'ForeignEntityName' has a value, then Form 8275, 'ForeignEntityEIN' or 'ForeignEntityReferenceIdNum' must have a value.",
  ),
];

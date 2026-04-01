/**
 * MeF Business Rules: SI1
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 2 rules (1 implemented, 1 stubs)
 */

import type { RuleDef } from "../../../../core/validation/types.ts";
import { rule, alwaysPass, any, hasValue, } from "../../../../core/validation/mod.ts";

export const SI1_RULES: readonly RuleDef[] = [
  rule(
    "SI1-F5471-001",
    "reject",
    "incorrect_data",
    alwaysPass, // requires cross-instance reference count: Schedule I-1 (Form 5471) must be referenced from exactly one Form 5471
    "If Schedule I-1 (Form 5471) is present in the return, then it must be referenced from one and only one Form 5471.",
  ),
  rule(
    "SI1-F5471-002",
    "reject",
    "missing_data",
    any(hasValue("ForeignCorporationEIN"), hasValue("ForeignEntityReferenceIdNum")),
    "Schedule I-1 (Form 5471), 'ForeignCorporationEIN' or 'ForeignEntityReferenceIdNum' must have a value.",
  ),
];

/**
 * MeF Business Rules: SM
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 3 rules (2 implemented, 1 stub)
 */

import type { RuleDef } from "../../../../core/validation/types.ts";
import { rule, alwaysPass, any, hasValue, } from "../../../../core/validation/mod.ts";

export const SM_RULES: readonly RuleDef[] = [
  rule(
    "SM-F5471-001",
    "reject",
    "incorrect_data",
    alwaysPass,
    "If Schedule M (Form 5471) is present in the return, then it must be referenced from one and only one Form 5471.",
  ),
  rule(
    "SM-F5471-002-01",
    "reject",
    "missing_data",
    any(hasValue("ForeignCorporationEIN"), hasValue("ForeignEntityReferenceIdNum")),
    "Schedule M (Form 5471) 'ForeignCorporationEIN' or 'ForeignEntityReferenceIdNum' must have a value.",
  ),
  rule(
    "SM-F8858-002-01",
    "reject",
    "missing_data",
    any(hasValue("ForeignCorporationEIN"), hasValue("ForeignEntityReferenceIdNum")),
    "Schedule M (Form 8858) 'ForeignCorporationEIN' or 'ForeignEntityReferenceIdNum' must have a value.",
  ),
];

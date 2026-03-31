/**
 * MeF Business Rules: SO
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 4 rules (0 implemented, 4 stubs)
 */

import type { RuleDef } from "../../../../core/validation/types.ts";
import { rule, alwaysPass, any, hasValue, } from "../../../../core/validation/mod.ts";

export const SO_RULES: readonly RuleDef[] = [
  rule(
    "SO-F5471-001",
    "reject",
    "incorrect_data",
    alwaysPass,
    "If Schedule O (Form 5471) is present in the return, then it must be referenced from one and only one Form 5471.",
  ),
  rule(
    "SO-F5471-002-01",
    "reject",
    "missing_data",
    any(hasValue("ForeignCorporationEIN"), hasValue("ForeignEntityReferenceIdNum")),
    "Schedule O (Form 5471) 'ForeignCorporationEIN' or 'ForeignEntityReferenceIdNum' must have a value.",
  ),
  rule(
    "SO-F8865-001",
    "reject",
    "incorrect_data",
    alwaysPass,
    "If Schedule O (Form 8865) is present in the return, then it must be referenced from one and only one Form 8865.",
  ),
  rule(
    "SO-F8865-002-01",
    "reject",
    "missing_data",
    any(hasValue("EIN"), hasValue("ForeignEntityReferenceIdNum")),
    "Schedule O (Form 8865) 'EIN' or 'ForeignEntityReferenceIdNum' must have a value.",
  ),
];

/**
 * MeF Business Rules: SP
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 4 rules (4 implemented, 0 stubs)
 */

import type { RuleDef } from "../../../../core/validation/types.ts";
import { rule, alwaysPass, any, hasValue, } from "../../../../core/validation/mod.ts";

export const SP_RULES: readonly RuleDef[] = [
  rule(
    "SP-F5471-001",
    "reject",
    "incorrect_data",
    alwaysPass,
    "If Schedule P (Form 5471) is present in the return, then it must be referenced from one and only one Form 5471.",
  ),
  rule(
    "SP-F5471-002",
    "reject",
    "missing_data",
    any(hasValue("ForeignCorporationEIN"), hasValue("ForeignEntityReferenceIDNum")),
    "Schedule P (Form 5471), 'ForeignCorporationEIN' or 'ForeignEntityReferenceIDNum' must have a value.",
  ),
  rule(
    "SP-F8865-001",
    "reject",
    "incorrect_data",
    alwaysPass,
    "If Schedule P (Form 8865) is present in the return, then it must be referenced from one and only one Form 8865.",
  ),
  rule(
    "SP-F8865-002-01",
    "reject",
    "missing_data",
    any(hasValue("EIN"), hasValue("ForeignEntityReferenceIdNum")),
    "Schedule P (Form 8865) 'EIN' or 'ForeignEntityReferenceIdNum' must have a value.",
  ),
];

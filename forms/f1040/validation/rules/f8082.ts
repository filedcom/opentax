/**
 * MeF Business Rules: F8082
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 4 rules (2 implemented, 2 stubs)
 */

import type { RuleDef } from "../../../../core/validation/types.ts";
import { rule, alwaysPass, eqStr, hasValue, ifThen, } from "../../../../core/validation/mod.ts";

export const F8082_RULES: readonly RuleDef[] = [
  rule(
    "F8082-003-01",
    "reject",
    "missing_data",
    hasValue("PassThroughEntityEIN"),
    "Form 8082, Line 3 'PassThroughEntityEIN' must have a value.",
  ),
  rule(
    "F8082-004-02",
    "reject",
    "missing_data",
    hasValue("PassThroughEntityName"),
    "Form 8082, Line 4 'PassThroughEntityName' must have a value.",
  ),
  rule(
    "F8082-006",
    "reject",
    "missing_document",
    alwaysPass,
    "If Form 8082, 'AARAdjImputedUnderpaymentInd', is checked \"No\", then a binary attachment document with Description \"8082 Signature Document\" must be present.",
  ),
  rule(
    "F8082-007",
    "reject",
    "missing_document",
    alwaysPass,
    "If Form 8082, 'Section6227b2ElectonInd', is checked \"Yes\", then a binary attachment document with Description \"8082 Signature Document\" must be present.",
  ),
];

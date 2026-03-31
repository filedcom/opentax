/**
 * MeF Business Rules: F8858
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 2 rules (0 implemented, 2 stubs)
 */

import type { RuleDef } from "../../../../core/validation/types.ts";
import { rule, any, hasValue, ifThen, } from "../../../../core/validation/mod.ts";

export const F8858_RULES: readonly RuleDef[] = [
  rule(
    "F8858-002-03",
    "reject",
    "missing_data",
    ifThen(hasValue("TaxOwnerName"), any(hasValue("TaxOwnerUSIdNumberDetail"), hasValue("ForeignEntityReferenceIdNum"))),
    "If line 3a 'TaxOwnerName' has a value, then Form 8858, Line 3c(1), EIN or SSN in 'TaxOwnerUSIdNumberDetail' or line 3c(2) 'ForeignEntityReferenceIdNum' must have a value.",
  ),
  rule(
    "F8858-003-02",
    "reject",
    "missing_data",
    any(hasValue("FDEOrFBUSIdNumberDetail"), hasValue("ForeignEntityReferenceIdNum")),
    "Form 8858, Line 1b(1), 'EIN' in 'FDEOrFBUSIdNumberDetail' or Line 1b(2) 'ForeignEntityReferenceIdNum' must have a value.",
  ),
];

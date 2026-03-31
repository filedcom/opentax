/**
 * MeF Business Rules: F965A
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 2 rules (0 implemented, 2 stubs)
 */

import type { RuleDef } from "../../../../core/validation/types.ts";
import { rule, any, hasValue, ifThen, not, } from "../../../../core/validation/mod.ts";

export const F965A_RULES: readonly RuleDef[] = [
  rule(
    "F965A-001-01",
    "reject",
    "missing_data",
    ifThen(any(hasValue("AmendedReturnInd"), hasValue("SupersededReturnInd")), hasValue("AmendedInd")),
    "If 'AmendedReturnInd' or 'SupersededReturnInd' in the return is checked, then Form 965-A, 'AmendedInd' must be checked.",
  ),
  rule(
    "F965A-004-01",
    "reject",
    "missing_data",
    ifThen(hasValue("AmendedInd"), any(hasValue("AmendedReturnInd"), hasValue("SupersededReturnInd"))),
    "Form 965-A, 'AmendedInd' must not be checked unless Form 1040, [ 'AmendedReturnInd' or 'SupersededReturnInd' ] is checked.",
  ),
];

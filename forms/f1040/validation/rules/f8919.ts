/**
 * MeF Business Rules: F8919
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 3 rules (3 implemented, 0 stubs)
 */

import type { RuleDef } from "../../../../core/validation/types.ts";
import { rule, allDistinct, any, eqStr, hasValue, ifThen, matchesHeaderSSN, } from "../../../../core/validation/mod.ts";

export const F8919_RULES: readonly RuleDef[] = [
  rule(
    "F8919-001",
    "reject",
    "incorrect_data",
    matchesHeaderSSN("SSN"),
    "Form 8919, 'SSN' must be equal to 'PrimarySSN' or 'SpouseSSN' in the Return Header.",
  ),
  rule(
    "F8919-002",
    "reject",
    "incorrect_data",
    allDistinct("SSN"),
    "If two Forms 8919 are present in the return, then their SSN's must not be equal.",
  ),
  rule(
    "F8919-003-01",
    "reject",
    "missing_data",
    ifThen(any(eqStr("UncollectedSocSecMedReasonCd", "A"), eqStr("UncollectedSocSecMedReasonCd", "C")), hasValue("CorrespondenceReceivedDt")),
    "For each firm on Form 8919 with a value of \"A\" or \"C\" on column (c) 'UncollectedSocSecMedReasonCd', the corresponding 'CorrespondenceReceivedDt' on column (d) must have a value.",
  ),
];

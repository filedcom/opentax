/**
 * MeF Business Rules: SQ
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 5 rules (5 implemented, 0 stubs)
 */

import type { RuleDef } from "../../../../core/validation/types.ts";
import { rule, all, any, eqStr, hasValue, ifThen, } from "../../../../core/validation/mod.ts";

export const SQ_RULES: readonly RuleDef[] = [
  rule(
    "SQ-F5471-001",
    "reject",
    "incorrect_data",
    ifThen(hasValue("SeparateCategoryCd"), hasValue("PassiveCategoryIncomeGroupCd")),
    "If Schedule Q (Form 5471) 'SeparateCategoryCd' has a value of \"PAS\", then 'PassiveCategoryIncomeGroupCd' must have a value.",
  ),
  rule(
    "SQ-F5471-002",
    "reject",
    "missing_data",
    any(hasValue("ForeignCorporationEIN"), hasValue("ForeignEntityReferenceIdNum")),
    "Schedule Q (Form 5471), 'ForeignCorporationEIN' or 'ForeignEntityReferenceIdNum' must have a value.",
  ),
  rule(
    "SQ-F5471-003",
    "reject",
    "incorrect_data",
    ifThen(hasValue("SeparateCategoryCd"), hasValue("SanctionedCountryCd")),
    "If Schedule Q (Form 5471) 'SeparateCategoryCd' has a value of '901j', then 'SanctionedCountryCd' must have a value.",
  ),
  rule(
    "SQ-F5471-004",
    "reject",
    "incorrect_data",
    any(hasValue("USSourceIncomeInd"), hasValue("ForeignSourceIncomeInd")),
    "At least one of the checkboxes, 'USSourceIncomeInd' or 'ForeignSourceIncomeInd' on Schedule Q (Form 5471) must be checked.",
  ),
  rule(
    "SQ-F5471-005",
    "reject",
    "incorrect_data",
    ifThen(all(hasValue("USSourceIncomeInd"), hasValue("ForeignSourceIncomeInd")), eqStr("SeparateCategoryCd", "TOTAL")),
    "If both 'USSourceIncomeInd' and 'ForeignSourceIncomeInd' on Schedule Q (Form 5471) are checked, 'SeparateCategoryCd' must have the value \"TOTAL\".",
  ),
];

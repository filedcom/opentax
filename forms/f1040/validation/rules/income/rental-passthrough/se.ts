/**
 * MeF Business Rules: SE
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 6 rules (6 implemented)
 */

import type { RuleDef } from "../../../../../../core/validation/types.ts";
import {
  all,
  any,
  formPresent,
  hasNonZero,
  hasValue,
  ifThen,
  rule,
} from "../../../../../../core/validation/mod.ts";
import {
  scheduleReferencedOnce,
} from "../../../../../../core/validation/predicates.ts";

export const SE_RULES: readonly RuleDef[] = [
  rule(
    "SE-F1040-001-02",
    "reject",
    "missing_document",
    ifThen(all(hasValue("AnyAmountIsNotAtRiskInd"), hasNonZero("NonpassiveLossAmt")), formPresent("form6198")),
    "If Schedule E (Form 1040), 'AnyAmountIsNotAtRiskInd' checkbox is checked, and the corresponding 'NonpassiveLossAmt' has a non-zero value, then Form 6198 must be present in the Return.",
  ),
  rule(
    "SE-F1040-030",
    "reject",
    "missing_document",
    ifThen(hasNonZero("NetFarmRentalIncomeOrLossAmt"), formPresent("form4835")),
    "If Schedule E (Form 1040), Line 40 'NetFarmRentalIncomeOrLossAmt' has a non-zero value, then Form 4835 must be present in the Return.",
  ),
  rule(
    "SE-F1040-060-01",
    "reject",
    "missing_data",
    ifThen(hasValue("nonpassiveActivityLiteralCd"), hasNonZero("nonpassiveActivityAmt")),
    "If Schedule E (Form 1040), Line 26 'nonpassiveActivityLiteralCd' has a value, then Line 26 'nonpassiveActivityAmt' must have a non-zero value.",
  ),
  rule(
    "SE-F1040-070-01",
    "reject",
    "missing_data",
    ifThen(hasNonZero("nonpassiveActivityAmt"), hasValue("nonpassiveActivityLiteralCd")),
    "If Schedule E (Form 1040), Line 26 'nonpassiveActivityAmt' has a non-zero value, then Line 26 'nonpassiveActivityLiteralCd' must have a value.",
  ),
  rule(
    "SE-F5471-002",
    "reject",
    "incorrect_data",
    scheduleReferencedOnce("F5471ScheduleE", "F5471"),
    "If Schedule E (Form 5471) is present in the return, then it must be referenced from one and only one Form 5471.",
  ),
  rule(
    "SE-F5471-003",
    "reject",
    "missing_data",
    any(hasValue("ForeignCorporationEIN"), hasValue("ForeignEntityReferenceIDNum")),
    "Schedule E (Form 5471), 'ForeignCorporationEIN' or 'ForeignEntityReferenceIDNum' must have a value.",
  ),
];

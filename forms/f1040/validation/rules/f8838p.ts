/**
 * MeF Business Rules: F8838P
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 3 rules (2 implemented, 1 stubs)
 */

import type { RuleDef } from "../../../../core/validation/types.ts";
import { rule, alwaysPass, any, hasValue, noValue, } from "../../../../core/validation/mod.ts";

export const F8838P_RULES: readonly RuleDef[] = [
  rule(
    "F8838P-001",
    "reject",
    "missing_document",
    alwaysPass,
    "If Form 8838P is present in the return, then a binary attachment document with Description \"8838P Signature Document\" must be present.",
  ),
  rule(
    "F8838P-002",
    "reject",
    "incorrect_data",
    noValue("BusinessConsentGrp"),
    "Form 8838P 'BusinessConsentGrp' must not have a value.",
  ),
  rule(
    "F8838P-004",
    "reject",
    "missing_data",
    any(hasValue("GainDeferralContributionGrp"), hasValue("ContriNotSubjGainDeferralGrp")),
    "Form 8838P 'GainDeferralContributionGrp' or 'ContriNotSubjGainDeferralGrp' must have a value.",
  ),
];

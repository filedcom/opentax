/**
 * MeF Business Rules: SR
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 4 rules (3 implemented, 1 stub)
 */

import type { RuleDef } from "../../../../core/validation/types.ts";
import { rule, alwaysPass, any, hasNonZero, hasValue, ifThen, } from "../../../../core/validation/mod.ts";

export const SR_RULES: readonly RuleDef[] = [
  rule(
    "SR-F1040-001-02",
    "reject",
    "missing_data",
    ifThen(any(hasValue("Und65RtdPermnntTotDsbltyInd"), hasValue("BothUnder65OneRtdDsbltyInd"), hasValue("BothUnder65BothRtdDsbltyInd"), hasValue("One65OrOlderOtherRtdDsbltyInd"), hasValue("Under65DidNotLiveTogetherInd")), hasNonZero("TaxableDisabilityAmt")),
    "Schedule R (Form 1040), 'TaxableDisabilityAmt' must have a non-zero value if one of the following is checked : 'Und65RtdPermnntTotDsbltyInd', 'BothUnder65OneRtdDsbltyInd', 'BothUnder65BothRtdDsbltyInd', 'One65OrOlderOtherRtdDsbltyInd', 'Under65DidNotLiveTogetherInd'.",
  ),
  rule(
    "SR-F1040-002-02",
    "reject",
    "missing_data",
    ifThen(any(hasNonZero("NontxSocSecAndRlrdBenefitsAmt"), hasNonZero("NontaxableOtherAmt")), hasNonZero("TotalNontaxableAmt")),
    "If Schedule R (Form 1040), 'NontxSocSecAndRlrdBenefitsAmt' or 'NontaxableOtherAmt' has a non-zero value, then 'TotalNontaxableAmt', must have a non-zero value.",
  ),
  rule(
    "SR-F5471-001",
    "reject",
    "incorrect_data",
    alwaysPass,
    "If Schedule R (Form 5471) is present in the return, then it must be referenced from one and only one Form 5471.",
  ),
  rule(
    "SR-F5471-002",
    "reject",
    "missing_data",
    any(hasValue("ForeignCorporationEIN"), hasValue("ForeignEntityReferenceIdNum")),
    "Schedule R (Form 5471), 'ForeignCorporationEIN' or 'ForeignEntityReferenceIdNum' must have a value.",
  ),
];

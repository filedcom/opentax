/**
 * MeF Business Rules: F8933
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 7 rules (7 implemented, 0 stubs)
 */

import type { RuleDef } from "../../../../core/validation/types.ts";
import { rule, eqStr, hasNonZero, hasValue, ifThen, not, noValue, } from "../../../../core/validation/mod.ts";

export const F8933_RULES: readonly RuleDef[] = [
  rule(
    "F8933-001-03",
    "reject",
    "missing_document",
    ifThen(hasNonZero("QlfyCrbnOxdDACNotUsedDispGrp/IncreasedCreditAmt"), hasValue("QlfyCrbnOxdDACNotUsedDispGrp/ScheduleAAndScheduleB_F8933")),
    "If Form 8933, 'IncreasedCreditAmt' in the 'QlfyCrbnOxdDACNotUsedDispGrp' has a non-zero value, then a binary attachment with description \"Schedule A (F8933) and Schedule B (F8933)\" must be attached to 'IncreasedCreditAmt'.",
  ),
  rule(
    "F8933-002-03",
    "reject",
    "missing_document",
    ifThen(hasNonZero("QlfyCrbnOxdDACUsedInjectantGrp/IncreasedCreditAmt"), hasValue("QlfyCrbnOxdDACUsedInjectantGrp/ScheduleAAndScheduleC_F8933")),
    "If Form 8933, 'IncreasedCreditAmt' in the 'QlfyCrbnOxdDACUsedInjectantGrp' has a non-zero value, then a binary attachment with description \"Schedule A (F8933) and Schedule C (F8933)\" must be attached to 'IncreasedCreditAmt'.",
  ),
  rule(
    "F8933-003-04",
    "reject",
    "missing_document",
    ifThen(hasNonZero("QlfyCrbnOxdDACPhysclUtlzGrp/IncreasedCreditAmt"), hasValue("QlfyCrbnOxdDACPhysclUtlzGrp/ScheduleF_F8933")),
    "If Form 8933, 'IncreasedCreditAmt' in the 'QlfyCrbnOxdDACPhysclUtlzGrp' has a non-zero value, then a binary attachment with description \"Schedule F (F8933)\" must be attached to 'IncreasedCreditAmt'.",
  ),
  rule(
    "F8933-007-02",
    "reject",
    "missing_document",
    ifThen(hasNonZero("TotalCOSCElectClmAmt"), hasValue("ScheduleAAndScheduleEAndScheduleF_F8933")),
    "If Form 8933, 'TotalCOSCElectClmAmt' has a non-zero value, then a binary attachment with description \"Schedule A (F8933), Schedule E (F8933) and Schedule F (F8933)\" must be attached to 'TotalCOSCElectClmAmt'.",
  ),
  rule(
    "F8933-008-01",
    "reject",
    "missing_document",
    ifThen(hasNonZero("CrbnOxdSqstrtnCrRcptrAmt"), hasValue("ScheduleD_F8933")),
    "If Form 8933, 'CrbnOxdSqstrtnCrRcptrAmt', has a non-zero value, then a binary attachment with description \"Schedule D (F8933)\" must be attached to 'CrbnOxdSqstrtnCrRcptrAmt'.",
  ),
  rule(
    "F8933-012-01",
    "reject",
    "missing_document",
    ifThen(not(hasValue("LCAInd")), noValue("QlfyCrbnOxdDACPhysclUtlzGrp/IncreasedCreditAmt")),
    "If Form 8933, 'LCAInd' is not checked, then 'IncreasedCreditAmt' in 'QlfyCrbnOxdDACPhysclUtlzGrp' must not have a value.",
  ),
  rule(
    "F8933-019",
    "reject",
    "missing_document",
    ifThen(eqStr("AttestmentLetterAttachedInd", "Yes"), hasValue("AttestmentLetter")),
    "If Form 8933, 'AttestmentLetterAttachedInd' is \"Yes\", then a binary attachment with description \"AttestmentLetter\" must be attached to 'AttestmentLetterAttachedInd'.",
  ),
];

/**
 * MeF Business Rules: F2210
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 4 rules (4 implemented, 0 stubs)
 */

import type { RuleDef } from "../../../../core/validation/types.ts";
import { rule, any, eqField, hasValue, ifThen, } from "../../../../core/validation/mod.ts";

export const F2210_RULES: readonly RuleDef[] = [
  rule(
    "F2210-002-02",
    "reject",
    "incorrect_data",
    any(hasValue("WaiverOfEntirePenaltyInd"), hasValue("WaiverOfPartOfPenaltyInd"), hasValue("AnnualizedIncomeMethodInd"), hasValue("ActuallyWithheldInd"), hasValue("JointReturnInd")),
    "On Form 2210, Part II, one of more of the following checkboxes must be checked: (Line A 'WaiverOfEntirePenaltyInd' or Line B 'WaiverOfPartOfPenaltyInd' or Line C 'AnnualizedIncomeMethodInd' or Line D 'ActuallyWithheldInd' or Line E 'JointReturnInd').",
  ),
  rule(
    "F2210-003",
    "reject",
    "missing_document",
    ifThen(hasValue("WaiverOfEntirePenaltyInd"), hasValue("WaiverExplanationStatement")),
    "If Form 2210, Part II, Line A checkbox 'WaiverOfEntirePenaltyInd' is checked, then [WaiverExplanationStatement] must be attached to Form 2210.",
  ),
  rule(
    "F2210-004",
    "reject",
    "missing_document",
    ifThen(hasValue("WaiverOfPartOfPenaltyInd"), hasValue("WaiverExplanationStatement")),
    "If Form 2210, Part II, Line B checkbox 'WaiverOfPartOfPenaltyInd' is checked, then [WaiverExplanationStatement] must be attached to Form 2210.",
  ),
  rule(
    "F2210-006-01",
    "reject",
    "data_mismatch",
    ifThen(hasValue("TotalPenaltyAmt"), eqField("TotalPenaltyAmt", "EsPenaltyAmt")),
    "Form 2210, 'TotalPenaltyAmt' must be equal to 'EsPenaltyAmt' in the return.",
  ),
];

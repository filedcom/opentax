/**
 * MeF Business Rules: F4972
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 7 rules (7 implemented, 0 stubs)
 */

import type { RuleDef } from "../../../../core/validation/types.ts";
import { rule, alwaysPass, any, eqStr, hasNonZero, not, } from "../../../../core/validation/mod.ts";

export const F4972_RULES: readonly RuleDef[] = [
  rule(
    "F4972-001",
    "reject",
    "incorrect_data",
    not(eqStr("DistributionOfQualifiedPlanInd", "No")),
    "Form 4972, Line 1 'DistributionOfQualifiedPlanInd' must not have a choice of \"No\" indicated.",
  ),
  rule(
    "F4972-002",
    "reject",
    "incorrect_data",
    not(eqStr("RolloverInd", "Yes")),
    "Form 4972, Line 2 'RolloverInd' must not have a choice of \"Yes\" indicated.",
  ),
  rule(
    "F4972-003",
    "reject",
    "incorrect_data",
    not(eqStr("PriorYearDistributionInd", "Yes")),
    "Form 4972, Line 5a 'PriorYearDistributionInd' must not have a choice of \"Yes\" indicated.",
  ),
  rule(
    "F4972-004",
    "reject",
    "incorrect_data",
    not(eqStr("BeneficiaryDistributionInd", "Yes")),
    "Form 4972, Line 5b 'BeneficiaryDistributionInd' must not have a choice of \"Yes\" indicated.",
  ),
  rule(
    "F4972-005",
    "reject",
    "incorrect_data",
    alwaysPass, // requires mutual exclusion check: only one of EmployeeBeneficiaryDistriInd=No or QualifyingAge5YearMemberInd=No is allowed
    "Only one of the two choices given below is allowed on Form 4972: a choice of \"No\" for Line 3 'EmployeeBeneficiaryDistriInd' or a choice of \"No\" for Line 4 'QualifyingAge5YearMemberInd'.",
  ),
  rule(
    "F4972-006",
    "reject",
    "missing_data",
    any(hasNonZero("CapitalGainTimesElectionPctAmt"), hasNonZero("LumpSumDistriOrdinaryIncmAmt"), hasNonZero("LumpSumRsdlAnnuityAvgTaxAmt")),
    "At least one of the following must have a non-zero value on Form 4972: Line 7 'CapitalGainTimesElectionPctAmt' or Line 8 'LumpSumDistriOrdinaryIncmAmt' or Line 29 'LumpSumRsdlAnnuityAvgTaxAmt'.",
  ),
  rule(
    "F4972-007",
    "reject",
    "incorrect_data",
    alwaysPass, // requires cross-instance check: if two Forms 4972, their SSNs must differ
    "If two Forms 4972 are present in the return, then their 'SSN's must not be equal.",
  ),
];

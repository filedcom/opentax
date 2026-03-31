/**
 * MeF Business Rules: F8379
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 17 rules (17 implemented, 0 stubs)
 */

import type { RuleDef } from "../../../../core/validation/types.ts";
import { rule, all, alwaysPass, eqStr, filingStatusIs, formAbsent, formPresent, hasNonZero, hasValue, ifThen, noValue, } from "../../../../core/validation/mod.ts";

export const F8379_RULES: readonly RuleDef[] = [
  rule(
    "F8379-001",
    "reject",
    "missing_data",
    hasValue("InjuredSpouseInd"),
    "There must be at least one checkbox 'InjuredSpouseInd' checked on Form 8379, Line 10.",
  ),
  rule(
    "F8379-002",
    "reject",
    "incorrect_data",
    alwaysPass,
    "There must be no more than one checkbox 'InjuredSpouseInd' checked on Form 8379, Line 10.",
  ),
  rule(
    "F8379-003-01",
    "reject",
    "incorrect_data",
    ifThen(eqStr("CommunityPropertyStateInd", "Yes"), hasValue("CommunityPropertyStateCd")),
    "If Form 8379, 'CommunityPropertyStateInd' has a choice of \"Yes\" indicated, then 'CommunityPropertyStateCd' must have a value.",
  ),
  rule(
    "F8379-004",
    "reject",
    "math_error",
    alwaysPass,
    "Form 8379, [ 'TotalOtherIncomeAmt' in 'JointReturnAmtGrp' ] must be equal to [ 'TotalOtherIncomeAmt' in 'InjuredSpouseAllocatedAmtGrp' ] plus (+) [ 'TotalOtherIncomeAmt' in 'OtherSpouseAllocatedAmtGrp' ].",
  ),
  rule(
    "F8379-005",
    "reject",
    "math_error",
    alwaysPass,
    "Form 8379, [ 'StandardOrItemizedDeductionAmt' in 'JointReturnAmtGrp' ] must be equal to [ 'StandardOrItemizedDeductionAmt' in 'InjuredSpouseAllocatedAmtGrp' ] plus (+) [ 'StandardOrItemizedDeductionAmt' in 'OtherSpouseAllocatedAmtGrp' ].",
  ),
  rule(
    "F8379-009",
    "reject",
    "math_error",
    alwaysPass,
    "Form 8379, [ 'EstimatedTaxPaymentAmt' in 'JointReturnAmtGrp' ] must be equal to [ 'EstimatedTaxPaymentAmt' in 'InjuredSpouseAllocatedAmtGrp' ] plus (+) [ 'EstimatedTaxPaymentAmt' in 'OtherSpouseAllocatedAmtGrp' ].",
  ),
  rule(
    "F8379-011",
    "reject",
    "incorrect_data",
    ifThen(formPresent("form8379"), noValue("ForeignAddress")),
    "If Form 8379 is present in the return, then Filer must not have a 'ForeignAddress' in the Return Header.",
  ),
  rule(
    "F8379-012-01",
    "reject",
    "incorrect_data",
    alwaysPass,
    "If Form 8379 is present in the return, then the 'StateAbbreviationCd' of Filer address in the Return Header must not have the value \"PR\" or \"VI\".",
  ),
  rule(
    "F8379-013",
    "reject",
    "incorrect_data",
    ifThen(formPresent("form8379"), filingStatusIs(2)),
    "If Form 8379 is present in the return, then the filing status of the return must be \"Married filing jointly\" (element 'IndividualReturnFilingStatusCd' must have the value 2).",
  ),
  rule(
    "F8379-015",
    "reject",
    "math_error",
    alwaysPass,
    "Form 8379, Line 13a(a) Joint Return 'WagesAmt' must be equal to the sum of Line 13a(b) Injured Spouse 'WagesAmt' and Line 13a(c) Other Spouse 'WagesAmt'.",
  ),
  rule(
    "F8379-016",
    "reject",
    "math_error",
    alwaysPass,
    "Form 8379, Line 14a Joint Return 'IncomeAdjustmentAmt' must be equal to the sum of Line 14b Injured Spouse 'IncomeAdjustmentAmt' and Line 14c Other Spouse 'IncomeAdjustmentAmt'.",
  ),
  rule(
    "F8379-017",
    "reject",
    "math_error",
    alwaysPass,
    "Form 8379, Line 18a Joint Return 'OtherTaxesAmt' must be equal to the sum of Line 18b Injured Spouse 'OtherTaxesAmt' and Line 18c Other Spouse 'OtherTaxesAmt'.",
  ),
  rule(
    "F8379-018",
    "reject",
    "math_error",
    alwaysPass,
    "Form 8379, Line 19a Joint Return 'FederalIncomeTaxWithheldAmt' must be equal to the sum of Line 19b Injured Spouse 'FederalIncomeTaxWithheldAmt' and Line 19c Other Spouse 'FederalIncomeTaxWithheldAmt'.",
  ),
  rule(
    "F8379-019-01",
    "reject",
    "incorrect_data",
    ifThen(formPresent("form8379"), all(formAbsent("form2555"), formAbsent("form8833"), formAbsent("form8888"), formAbsent("form4563"), formAbsent("form5074"), formAbsent("form8689"))),
    "If Form 8379 is present in the return, then the following forms must not be present in the return: (2555 or 8833 or 8888 or 4563 or 5074 or 8689).",
  ),
  rule(
    "F8379-021",
    "reject",
    "incorrect_data",
    alwaysPass,
    "If Form 8379, 'NonrefundableCreditsAmt' in 'JointReturnAmtGrp' has a non-zero value, then it must be equal to Form 1040, 'TotalCreditsAmt'.",
  ),
  rule(
    "F8379-023",
    "reject",
    "math_error",
    alwaysPass,
    "Form 8379, 'RefundableCreditsAmt' in 'JointReturnAmtGrp' must be equal to [ 'RefundableCreditsAmt' in 'InjuredSpouseAllocatedAmtGrp' plus (+) 'RefundableCreditsAmt' in 'OtherSpouseAllocatedAmtGrp'. ]",
  ),
  rule(
    "F8379-024",
    "reject",
    "math_error",
    alwaysPass,
    "Form 8379, 'NonrefundableCreditsAmt' in 'JointReturnAmtGrp' must be equal to [ 'NonrefundableCreditsAmt' in 'InjuredSpouseAllocatedAmtGrp' plus (+) 'NonrefundableCreditsAmt' in 'OtherSpouseAllocatedAmtGrp'. ]",
  ),
];

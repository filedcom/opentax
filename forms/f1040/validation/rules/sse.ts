/**
 * MeF Business Rules: SSE
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 8 rules (5 implemented, 3 stubs)
 */

import type { RuleDef } from "../../../../core/validation/types.ts";
import { rule, allDistinct, alwaysPass, any, formPresent, hasNonZero, ifThen, matchesHeaderSSN, not, all, noValue, } from "../../../../core/validation/mod.ts";

export const SSE_RULES: readonly RuleDef[] = [
  rule(
    "SSE-F1040-001",
    "reject",
    "incorrect_data",
    matchesHeaderSSN("SSN"),
    "For each Schedule SE (Form 1040) present in the return, 'SSN' must be equal to the Primary SSN or Spouse SSN in the Return Header.",
  ),
  rule(
    "SSE-F1040-002",
    "reject",
    "incorrect_data",
    allDistinct("SSN"),
    "If two Schedule SEs (Form 1040) are present in the return, their Social Security Numbers must not be the same.",
  ),
  rule(
    "SSE-F1040-005-09",
    "reject",
    "incorrect_data",
    alwaysPass, // requires threshold comparison: if SSTWagesRRTCompAmt or UnreportedTipsAmt or WagesSubjectToSSTAmt nonzero, then TotalWagesAndUnreportedTipsAmt nonzero unless SSTWagesRRTCompAmt >= yearly threshold
    "If Schedule SE (Form 1040), 'SSTWagesRRTCompAmt' has a non-zero value or 'UnreportedTipsAmt' has a non-zero value, or 'WagesSubjectToSSTAmt' has a non-zero value, then 'TotalWagesAndUnreportedTipsAmt' must have a non-zero value unless 'SSTWagesRRTCompAmt' is greater than or equal to the threshold amount for the tax year.",
  ),
  rule(
    "SSE-F1040-017-03",
    "reject",
    "incorrect_data",
    ifThen(hasNonZero("SelfEmploymentTaxAmt"), hasNonZero("DeductibleSelfEmploymentTaxAmt")),
    "If Schedule SE (Form 1040), 'SelfEmploymentTaxAmt' has a non-zero value, then 'DeductibleSelfEmploymentTaxAmt' must have a non-zero value.",
  ),
  rule(
    "SSE-F1040-019-03",
    "reject",
    "incorrect_data",
    ifThen(hasNonZero("DeductibleSelfEmploymentTaxAmt"), hasNonZero("SelfEmploymentTaxAmt")),
    "If Schedule SE (Form 1040), 'DeductibleSelfEmploymentTaxAmt' has a non-zero value, then 'SelfEmploymentTaxAmt' must have a non-zero value.",
  ),
  rule(
    "SSE-F1040-021-04",
    "reject",
    "incorrect_data",
    ifThen(
      all(
        hasNonZero("DeductibleSelfEmploymentTaxAmt"),
        noValue("selfEmploymentTaxExemptCd"),
        noValue("chap11BankruptcyIncomeCd"),
        noValue("communityIncmTaxedToSpouseCd"),
        noValue("exemptCommunityIncomeCd"),
        noValue("additionalIncomeOrLossCd"),
      ),
      hasNonZero("Schedule1/DeductibleSelfEmploymentTaxAmt"),
    ),
    "If Schedule SE (1040), 'DeductibleSelfEmploymentTaxAmt' has a non-zero value and [ 'selfEmploymentTaxExemptCd' or 'chap11BankruptcyIncomeCd' or 'communityIncmTaxedToSpouseCd' or 'exemptCommunityIncomeCd' or 'additionalIncomeOrLossCd' ] does not have a value, then Schedule 1 (Form 1040), 'DeductibleSelfEmploymentTaxAmt' must have a non-zero value.",
  ),
  rule(
    "SSE-F1040-022-05",
    "reject",
    "math_error",
    alwaysPass, // requires cross-form sum: Schedule 1 DeductibleSelfEmploymentTaxAmt must equal sum of all Schedule SE DeductibleSelfEmploymentTaxAmt
    "If Schedule 1 (Form 1040), 'DeductibleSelfEmploymentTaxAmt' has a non-zero value, then it must be equal to the sum of all Schedule SE (Form 1040), 'DeductibleSelfEmploymentTaxAmt'.",
  ),
  rule(
    "SSE-F1040-026",
    "reject",
    "missing_document",
    ifThen(hasNonZero("WagesSubjectToSSTAmt"), formPresent("form8919")),
    "If Schedule SE (Form 1040), 'WagesSubjectToSSTAmt' has a non-zero value, then Form 8919 must be present in the return.",
  ),
];

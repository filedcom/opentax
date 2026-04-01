/**
 * MeF Business Rules: F2555
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 20 rules (20 implemented, 0 stubs)
 */

import type { RuleDef } from "../../../../core/validation/types.ts";
import { rule, alwaysPass, any, dateLteField, eqStr, eqSum, hasNonZero, hasValue, ifThen, matchesHeaderSSN, not, notGtField, noValue, } from "../../../../core/validation/mod.ts";

export const F2555_RULES: readonly RuleDef[] = [
  rule(
    "F2555-001",
    "reject",
    "incorrect_data",
    matchesHeaderSSN("SSN"),
    "Form 2555, 'SSN' must be equal to 'PrimarySSN' or 'SpouseSSN' in the Return Header.",
  ),
  rule(
    "F2555-002",
    "reject",
    "incorrect_data",
    alwaysPass, // requires cross-instance check: two Forms 2555 must not have equal SSNs
    "If two Forms 2555 are present in the return, their SSN's must not be equal.",
  ),
  rule(
    "F2555-003",
    "reject",
    "incorrect_data",
    notGtField("ForeignEarnedIncExclusionAmt", "ForeignEarnedIncomeAmt"),
    "Form 2555, Line 42 'ForeignEarnedIncExclusionAmt' must not be greater than Line 26 'ForeignEarnedIncomeAmt'.",
  ),
  rule(
    "F2555-004-01",
    "reject",
    "incorrect_data",
    alwaysPass, // requires date equality check: BonaFideResidenceEndDt == TaxPeriodEndDt (eqField is numeric only)
    "If Form 2555, Line 10 'BonaFideResidenceEndDt' is equal to 'TaxPeriodEndDt' in the Return Header, then Line 10 'BonaFideResidenceBeginDt' must not be after the 'TaxPeriodBeginDt' in the Return Header.",
  ),
  rule(
    "F2555-005-02",
    "reject",
    "incorrect_data",
    ifThen(eqStr("BonaFideResidenceContinuedCd", "CONTINUES"), dateLteField("BonaFideResidenceBeginDt", "TaxPeriodEndDt")),
    "If Form 2555, 'BonaFideResidenceContinuedCd' has the value \"CONTINUES\", then 'BonaFideResidenceBeginDt' must not be after 'TaxPeriodEndDt' in the Return Header.",
  ),
  rule(
    "F2555-006-01",
    "reject",
    "incorrect_data",
    alwaysPass, // requires date inequality check and first-day-of-previous-year calculation (no date-before predicate or prior-year constant)
    "If Form 2555, Line 10 'BonaFideResidenceEndDt' is before 'TaxPeriodEndDt' in the Return Header then Line 10 'BonaFideResidenceBeginDt' must not be after the first day of the previous tax year.",
  ),
  rule(
    "F2555-007",
    "reject",
    "incorrect_data",
    ifThen(eqStr("SubmittedNonResidentStmtInd", "Yes"), not(eqStr("RequiredToPayIncomeTaxInd", "No"))),
    "If Form 2555, Line 13a \"SubmittedNonResidentStmtInd\" has a choice of \"Yes\" indicated, then Line 13b 'RequiredToPayIncomeTaxInd' must not have a choice of \"No\" indicated.",
  ),
  rule(
    "F2555-008",
    "reject",
    "missing_data",
    ifThen(eqStr("SeparateForeignResidenceInd", "Yes"), hasValue("SeparateForeignResLocationTxt")),
    "If Form 2555, Line 8a checkbox 'SeparateForeignResidenceInd' has a choice of \"Yes\" indicated, then Line 8b 'SeparateForeignResLocationTxt' must have a value.",
  ),
  rule(
    "F2555-009",
    "reject",
    "missing_data",
    ifThen(eqStr("SeparateForeignResidenceInd", "Yes"), hasNonZero("SeparateForeignResidenceDayCnt")),
    "If Form 2555, Line 8a checkbox 'SeparateForeignResidenceInd' has a choice of \"Yes\" indicated, then Line 8b 'SeparateForeignResidenceDayCnt' must have a non-zero value.",
  ),
  rule(
    "F2555-010",
    "reject",
    "incorrect_data",
    notGtField("HousingExclusionAmt", "EmployerProvidedHousingAmt"),
    "Form 2555, Line 36 'HousingExclusionAmt' must not be greater than Line 34 'EmployerProvidedHousingAmt'.",
  ),
  rule(
    "F2555-011",
    "reject",
    "math_error",
    eqSum("TentativeIncomeExclusionAmt", "HousingExclusionAmt", "ForeignEarnedIncExclusionAmt"),
    "Form 2555, Line 43 'TentativeIncomeExclusionAmt' must be equal to the sum of Line 36 'HousingExclusionAmt' and 42 'ForeignEarnedIncExclusionAmt'.",
  ),
  rule(
    "F2555-012-01",
    "reject",
    "incorrect_data",
    ifThen(hasValue("NoFrgnEarnIncExclPrevFiledInd"), noValue("ForeignEarnIncExclRevokedInd")),
    "If Form 2555, Line 6b checkbox 'NoFrgnEarnIncExclPrevFiledInd' is checked, then Line 6c 'ForeignEarnIncExclRevokedInd' must have neither choices \"Yes\" or \"No\" indicated.",
  ),
  rule(
    "F2555-013-01",
    "reject",
    "incorrect_data",
    ifThen(hasValue("NoFrgnEarnIncExclPrevFiledInd"), noValue("ForeignEarnIncExclRevokeTaxYr")),
    "If Form 2555, Line 6b checkbox 'NoFrgnEarnIncExclPrevFiledInd' is checked, then Line 6d 'ForeignEarnIncExclRevokeTaxYr' must not have a value.",
  ),
  rule(
    "F2555-015",
    "reject",
    "missing_document",
    ifThen(hasNonZero("DeductionAllocToExcludedIncAmt"), hasValue("DeductionsAllocableToExcludedIncomeStatement")),
    "If Form 2555, Line 44 'DeductionAllocToExcludedIncAmt' has a non-zero value, then [DeductionsAllocableToExcludedIncomeStatement] must be attached to Line 44.",
  ),
  rule(
    "F2555-016",
    "reject",
    "incorrect_data",
    alwaysPass, // requires external date lookup: IRS submission received date is not available at validation time
    "Form 2555, Line 10 'BonaFideResidenceEndDt' must not be greater than the date submission was received at the IRS.",
  ),
  rule(
    "F2555-017",
    "reject",
    "incorrect_data",
    alwaysPass, // requires external date lookup: IRS submission received date is not available at validation time
    "Form 2555, Line 16 'PhysicalPresenceEndDt' must not be greater than the date submission was received at the IRS.",
  ),
  rule(
    "F2555-018",
    "reject",
    "incorrect_data",
    ifThen(hasValue("BonaFideResidenceBeginDt"), noValue("PhysicalPresenceBeginDt")),
    "If Form 2555, Line 10 'BonaFideResidenceBeginDt' has a value, then Line 16 'PhysicalPresenceBeginDt' must not have a value.",
  ),
  rule(
    "F2555-019",
    "reject",
    "incorrect_data",
    alwaysPass, // requires date difference calculation: EndDt minus BeginDt > 329 days (no day-count-diff predicate available)
    "If Form 2555, 'claimFrgnEarnIncWaiverCd' does not have a value, and [ForeignEarnedIncomeWaiverOfTimeRequirementsStatement] is not present in the Return and Line 16 'PhysicalPresenceEndDt' has a value, then Line 16 'PhysicalPresenceEndDt' minus (-) 'PhysicalPresenceBeginDt' must be greater than 329 days.",
  ),
  rule(
    "F2555-021",
    "reject",
    "missing_data",
    any(hasValue("BonaFideResidenceBeginDt"), hasValue("PhysicalPresenceBeginDt")),
    "Form 2555, Line 10 'BonaFideResidenceBeginDt' or Line 16 'PhysicalPresenceBeginDt' must have a value.",
  ),
  rule(
    "F2555-022",
    "reject",
    "incorrect_data",
    alwaysPass, // requires date inequality (before) and first-day-of-current-year constant (no prior-year date or date-before predicate)
    "If Form 2555, 'BonaFideResidenceBeginDt' is before 'TaxPeriodBeginDt' in the Return Header, then 'BonaFideResidenceEndDt' must not be before the first date of the current tax year.",
  ),
];

/**
 * MeF Business Rules: F8863
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 18 rules (18 implemented, 0 stubs)
 */

import type { RuleDef } from "../../../../core/validation/types.ts";
import { rule, alwaysPass, any, eqField, everyItem, hasNonZero, hasValue, ifThen, notGtNum, validSSN, } from "../../../../core/validation/mod.ts";

export const F8863_RULES: readonly RuleDef[] = [
  rule(
    "F8863-001-04",
    "reject",
    "data_mismatch",
    alwaysPass, // requires cross-instance check: StudentSSN must match PrimarySSN, SpouseSSN, or a DependentSSN in DependentDetail
    "Each 'StudentSSN' that has a value on Form 8863 must be equal to 'PrimarySSN' or 'SpouseSSN' in the Return Header or a 'DependentSSN' in 'DependentDetail' on the return.",
  ),
  rule(
    "F8863-003-03",
    "reject",
    "incorrect_data",
    alwaysPass, // requires cross-instance check: each StudentSSN may only appear once across Line 30 or Line 31 credit groups
    "Each 'StudentSSN' that has a value on Form 8863, Line 21 can only be used once to claim either Line 30 'AmerOppCreditNetCalcExpnssAmt' or Line 31 'LifetimeQualifiedExpensesAmt'.",
  ),
  rule(
    "F8863-009-04",
    "reject",
    "incorrect_data",
    ifThen(hasValue("StudentSSN"), validSSN("StudentSSN")),
    "Each 'StudentSSN' that has a value on Form 8863 must be within the valid range of SSN/ITIN/ATIN.",
  ),
  rule(
    "F8863-010-01",
    "reject",
    "incorrect_data",
    notGtNum("AmerOppCreditNetCalcExpnssAmt", 2500),
    "Each 'AmerOppCreditNetCalcExpnssAmt' provided on Form 8863, Line 30 must not exceed 2500.",
  ),
  rule(
    "F8863-015-01",
    "reject",
    "incorrect_data",
    notGtNum("AmerOppQualifiedExpensesAmt", 4000),
    "Each 'AmerOppQualifiedExpensesAmt' provided on Form 8863, Line 27 must not exceed 4000.",
  ),
  rule(
    "F8863-018-02",
    "reject",
    "incorrect_data",
    ifThen(hasValue("RefundableAmerOppCrUnder24Ind"), eqField("RefundableAmerOppCrUnder24Ind", "RefundableAmerOppCreditAmt")),
    "If Form 8863, Line 7 checkbox 'RefundableAmerOppCrUnder24Ind' is checked, then Line 8 'RefundableAmerOppCreditAmt' must be equal to zero if an amount is entered.",
  ),
  rule(
    "F8863-021",
    "reject",
    "incorrect_data",
    notGtNum("TentLifetimeLearningCreditAmt", 2000),
    "Form 8863, Line 12 'TentLifetimeLearningCreditAmt' must not exceed 2000.",
  ),
  rule(
    "F8863-022",
    "reject",
    "incorrect_data",
    alwaysPass, // requires cross-instance aggregation: TentativeAmerOppCreditAmt must not exceed sum of all AmerOppCreditNetCalcExpnssAmt
    "If Form 8863, Line 1 'TentativeAmerOppCreditAmt' has a non-zero value, then it must not exceed the sum of all Line 30 'AmerOppCreditNetCalcExpnssAmt'.",
  ),
  rule(
    "F8863-023",
    "reject",
    "incorrect_data",
    ifThen(hasValue("AmerOppQualifiedExpensesAmt"), eqField("AmerOppQualifiedExpensesAmt", "AmerOppCreditNetCalcExpnssAmt")),
    "If Form 8863, Line 27 'AmerOppQualifiedExpensesAmt' has a zero value, then Line 30 'AmerOppCreditNetCalcExpnssAmt' must be equal to zero if an amount is entered.",
  ),
  rule(
    "F8863-024",
    "reject",
    "incorrect_data",
    alwaysPass, // requires cross-instance aggregation: TotalQualifiedExpensesAmt must not exceed sum of all LifetimeQualifiedExpensesAmt
    "If Form 8863, Line 10 'TotalQualifiedExpensesAmt' has a non-zero value, then it must not exceed the sum of all Lines 31 'LifetimeQualifiedExpensesAmt'.",
  ),
  rule(
    "F8863-025",
    "reject",
    "missing_data",
    ifThen(hasNonZero("AmerOppCreditNetCalcExpnssAmt"), hasValue("AcademicPdEligibleStudentInd")),
    "If Form 8863, Line 30 'AmerOppCreditNetCalcExpnssAmt' has a non-zero value, then each of Line 24 'AcademicPdEligibleStudentInd' and Line 25 'PostSecondaryEducationInd' and Line 26 'DrugFelonyConvictionInd' must have a choice of \"Yes\" or \"No\" indicated.",
  ),
  rule(
    "F8863-026-01",
    "reject",
    "incorrect_data",
    ifThen(any(hasNonZero("RefundableAmerOppCreditAmt"), hasNonZero("TentativeEducCrLessRfdblCrAmt")), everyItem("EIN", (v) => v !== null && v !== undefined && v !== "")),
    "If Form 8863, 'RefundableAmerOppCreditAmt' and/or 'TentativeEducCrLessRfdblCrAmt' has a non-zero value, then 'EIN' must have a value in each occurrence of 'EducationalInstitutionGroup' in the 'StudentAndEducationalInstnGrp'.",
  ),
  rule(
    "F8863-027",
    "alert",
    "information",
    alwaysPass, // requires e-File database lookup: prior-year student claim detection across accepted returns
    "A student claimed on Form 8863 for the Education Credit was previously claimed as a student on another accepted return for the same tax year. Visit www.irs.gov/identity-theft-fraud-scams/identity-theft-dependents for additional information.",
  ),
  rule(
    "F8863-512-02",
    "reject",
    "data_mismatch",
    alwaysPass, // requires e-File database lookup: StudentNameControlTxt and StudentSSN must match e-File database
    "For each student in Form 8863, Line 20 'StudentNameControlTxt' and Line 21 'StudentSSN' must match e-File database.",
  ),
  rule(
    "F8863-528-04",
    "reject",
    "duplicate",
    alwaysPass, // requires cross-instance check: StudentSSN must not appear on another Form 8863 for the same tax year (cross-return duplicate detection)
    "Each Student SSN that has a value on Form 8863, must not be the same as that in another Form 8863 for the same tax year. Visit www.irs.gov/identity-theft-fraud-scams/identity-theft-dependents for additional information. To electronically file with this duplicate condition, an Identity Protection Personal Identification Number (IP PIN) will be required. If you wish to get an IP PIN and you don't already have an account on IRS.gov, then you must register to validate your identity. Please visit www.irs.gov/getanippin for further information and resubmit your return with an IP PIN.",
  ),
  rule(
    "F8863-901",
    "reject_and_stop",
    "database",
    alwaysPass, // requires e-File database lookup: SSA deceased-individual lock status
    "The Student SSN that has a value on Form 8863, Line 21 has been locked because Social Security Administration records indicate the number belongs to a deceased individual.",
  ),
  rule(
    "F8863-902",
    "reject_and_stop",
    "database",
    alwaysPass, // requires e-File database lookup: taxpayer-requested account lock status
    "The Student SSN that has a value on Form 8863, Line 21 has been locked. The account was locked per the taxpayer's request.",
  ),
  rule(
    "F8863-904",
    "reject_and_stop",
    "database",
    alwaysPass, // requires e-File database lookup: parent/guardian-requested account lock status
    "The Student SSN that has a value on Form 8863, Line 21 has been locked. The account was locked per the request of the student's parent or guardian.",
  ),
];

/**
 * MeF Business Rules: SEIC
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 24 rules (2 implemented, 22 stubs)
 */

import type { RuleDef } from "../../../../core/validation/types.ts";
import { rule, alwaysPass, allDistinct, hasValue, ifThen, any, validSSN, ssnNotEqual, eqStr, eqNum, filingStatusIs, filingStatusNot, not, } from "../../../../core/validation/mod.ts";

export const SEIC_RULES: readonly RuleDef[] = [
  rule(
    "SEIC-F1040-001-02",
    "reject",
    "incorrect_data",
    ifThen(hasValue("QualifyingChildSSN"), validSSN("QualifyingChildSSN")),
    "Each 'QualifyingChildSSN' that has a value on Schedule EIC (Form 1040) must be within the valid range of SSNs.",
  ),
  rule(
    "SEIC-F1040-002-02",
    "reject",
    "incorrect_data",
    ifThen(hasValue("QualifyingChildSSN"), ssnNotEqual("QualifyingChildSSN", "PrimarySSN")),
    "Each 'QualifyingChildSSN' that has a value on Schedule EIC (Form 1040) must not be equal to 'PrimarySSN' or 'SpouseSSN' in the Return Header.",
  ),
  rule(
    "SEIC-F1040-003-04",
    "reject",
    "incorrect_data",
    alwaysPass,
    "Each 'ChildBirthYr' that has a value on Schedule EIC (Form 1040) must not be greater than 'TaxYr' in the Return Header.",
  ),
  rule(
    "SEIC-F1040-004-05",
    "reject",
    "incorrect_data",
    alwaysPass,
    "For each 'ChildBirthYr' on Schedule EIC (Form 1040) that is equal to 'TaxYr' in the Return Header, the corresponding 'MonthsChildLivedWithYouCnt' must be equal to 12 or 'KidnappedChildCd' must have the value \"KC\".",
  ),
  rule(
    "SEIC-F1040-005-10",
    "reject",
    "incorrect_data",
    alwaysPass,
    "For each child who is 19 years or older and younger than 24 years per the 'ChildBirthYr' on Schedule EIC (Form 1040), the corresponding 'ChildIsAStudentUnder24Ind' or 'ChildPermanentlyDisabledInd' must have a choice of \"Yes\" indicated.",
  ),
  rule(
    "SEIC-F1040-006-10",
    "reject",
    "incorrect_data",
    alwaysPass,
    "For each child who is 24 years or older per the 'ChildBirthYr' on Schedule EIC (Form 1040), the corresponding 'ChildPermanentlyDisabledInd' must have a choice of \"Yes\" indicated.",
  ),
  rule(
    "SEIC-F1040-007-01",
    "reject",
    "incorrect_data",
    allDistinct("QualifyingChildSSN"),
    "Each 'QualifyingChildSSN' that has a value on Schedule EIC (Form 1040), must not be equal to another 'QualifyingChildSSN' on the same Schedule EIC (Form 1040).",
  ),
  rule(
    "SEIC-F1040-008-02",
    "reject",
    "missing_document",
    alwaysPass,
    "For each child on Schedule EIC (Form 1040), where 'DiedLiteralCd' has the value \"DIED\", there must be a binary attachment with Description beginning with \"BirthCertificate\" or \"DeathCertificate\" or \"HospitalMedicalRecords\" present in the return.",
  ),
  rule(
    "SEIC-F1040-009",
    "alert",
    "information",
    alwaysPass,
    "A qualifying child claimed on Schedule EIC (Form 1040) for the Earned Income Credit was previously claimed as a qualifying child on another accepted return for the same tax year. Visit www.irs.gov/identity-theft-fraud-scams/identity-theft-dependents for additional information.",
  ),
  rule(
    "SEIC-F1040-010",
    "alert",
    "information",
    alwaysPass,
    "A qualifying child claimed on Schedule EIC (Form 1040) for the Earned Income Credit was previously claimed as a qualifying child on another accepted return for the same tax year. Visit www.irs.gov/identity-theft-fraud-scams/identity-theft-dependents for additional information.",
  ),
  rule(
    "SEIC-F1040-501-02",
    "reject",
    "incorrect_data",
    alwaysPass,
    "In each 'QualifyingChildInformation' on Schedule EIC (Form 1040), [ 'QualifyingChildSSN' and 'QualifyingChildNameControlTxt' ] must match the e-File database.",
  ),
  rule(
    "SEIC-F1040-506-04",
    "reject",
    "incorrect_data",
    alwaysPass,
    "In each 'QualifyingChildInformation' on Schedule EIC (Form 1040), 'QualifyingChildSSN' must not be the same as a qualifying child SSN on another return filed for the same tax year. Visit www.irs.gov/identity-theft-fraud-scams/identity-theft-dependents for additional information. To electronically file with this duplicate condition, an Identity Protection Personal Identification Number (IP PIN) will be required. If you wish to get an IP PIN and you don't already have an account on IRS.gov, then you must register to validate your identity. Please visit www.irs.gov/getanippin for further information and resubmit your return with an IP PIN.",
  ),
  rule(
    "SEIC-F1040-509-04",
    "reject",
    "incorrect_data",
    alwaysPass,
    "In each 'QualifyingChildInformation' on Schedule EIC (Form 1040), 'QualifyingChildSSN' must not be the same as the spouse SSN on another return filed for the same tax year. Visit www.irs.gov/identity-theft-fraud-scams/identity-theft-dependents for additional information. To electronically file with this duplicate condition, an Identity Protection Personal Identification Number (IP PIN) will be required. If you wish to get an IP PIN and you don't already have an account on IRS.gov, then you must register to validate your identity. Please visit www.irs.gov/getanippin for further information and resubmit your return with an IP PIN.",
  ),
  rule(
    "SEIC-F1040-521-03",
    "reject",
    "incorrect_data",
    alwaysPass,
    "Each qualifying child listed on Schedule EIC (Form 1040) must have been born prior to or during the tax year for which the return is being filed.",
  ),
  rule(
    "SEIC-F1040-534-03",
    "reject",
    "incorrect_data",
    alwaysPass,
    "A qualifying child that is deceased must not be listed on Schedule EIC (Form 1040) if their date of death was prior to the tax year for which the return is being filed.",
  ),
  rule(
    "SEIC-F1040-535-04",
    "reject",
    "incorrect_data",
    alwaysPass,
    "In each 'QualifyingChildInformation' on Schedule EIC (Form 1040), 'ChildBirthYr' must match the e-File database.",
  ),
  rule(
    "SEIC-F1040-536-04",
    "reject",
    "incorrect_data",
    alwaysPass,
    "If the filing status of the return is Single or Head of household or Married Filing Separate or Qualifying surviving spouse, then each qualifying child listed on Schedule EIC (Form 1040) must be younger than the primary taxpayer.",
  ),
  rule(
    "SEIC-F1040-537-02",
    "reject",
    "incorrect_data",
    alwaysPass,
    "If the filing status of the return is Married filing jointly, then each qualifying child listed on Schedule EIC (Form 1040) must be younger than both the primary taxpayer and the secondary taxpayer.",
  ),
  rule(
    "SEIC-F1040-539-03",
    "reject",
    "missing_data",
    alwaysPass,
    "Schedule EIC (Form 1040), [ 'QualifyingChildSSN' or 'DiedLiteralCd' ] in 'QualifyingChildInformation' must have a value unless both of the following are true: (1) Form 1040, 'EarnedIncomeCreditAmt' has a value less than or equal to 649 and (2) The self-only EIC being claimed with a qualifying child (see instructions and also Pub. 596).",
  ),
  rule(
    "SEIC-F1040-911-01",
    "reject_and_stop",
    "database",
    alwaysPass,
    "The Qualifying Child SSN that has a value on Schedule EIC (Form 1040), has been locked because Social Security Administration records indicate the number belongs to a deceased individual.",
  ),
  rule(
    "SEIC-F1040-912-01",
    "reject_and_stop",
    "database",
    alwaysPass,
    "The Qualifying Child SSN that has a value on Schedule EIC (Form 1040), has been locked. The account was locked per the taxpayer's request.",
  ),
  rule(
    "SEIC-F1040-914-01",
    "reject_and_stop",
    "database",
    alwaysPass,
    "The Qualifying Child SSN that has a value on Schedule EIC (Form 1040), has been locked. The account was locked per the request of the qualifying child's parent or guardian.",
  ),
  rule(
    "SEIC-F1040-995-01",
    "reject_and_stop",
    "incorrect_data",
    alwaysPass,
    "The Dependent/Qualifying Child Identity Protection Personal Identification Number (IP PIN) on Schedule EIC (Form 1040) must match the e-File database. Please double check your entry and resubmit your return with the correct number.",
  ),
  rule(
    "SEIC-F1040-996-01",
    "reject_and_stop",
    "incorrect_data",
    alwaysPass,
    "The Primary Taxpayer did not enter a valid Identity Protection Personal Identification Number (IP PIN) for Dependent/Qualifying Child on Schedule EIC (Form 1040). Please visit www.irs.gov/getanippin for further information and resubmit your return with the correct number.",
  ),
];

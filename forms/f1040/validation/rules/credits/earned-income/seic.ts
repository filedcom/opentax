/**
 * MeF Business Rules: SEIC
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 24 rules (24 implemented)
 */

import type { RuleCheck, RuleDef } from "../../../../../../core/validation/types.ts";
import {
  all,
  allDistinct,
  allMatch,
  amount,
  amountEq,
  amountLte,
  any,
  attachmentCountStartingWith,
  eachGroup,
  eqNum,
  eqStr,
  filingStatusIs,
  groupCount,
  hasValue,
  ifThen,
  inOwnDocument,
  noneMatchHeaderSSN,
  notGtNum,
  rule,
  ssnNotEqual,
  validSSN,
  yearOf,
} from "../../../../../../core/validation/mod.ts";
import {
  everyIssuableTin,
  personNameControlAgrees,
  wellFormedIpPins,
} from "../../../../../../core/validation/predicates.ts";

/** No qualifying child was born before the filer; a birth in the same year cannot be ordered. */
const childrenBornAfter = (birthDate: string): RuleCheck =>
  (ctx) => {
    const filer = yearOf(birthDate)(ctx);
    return Number.isNaN(filer) ||
      ctx.fieldArray("ChildBirthYr").every((year) => Number(year) >= filer);
  };

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
    inOwnDocument((ctx) => ctx.fieldArray("ChildBirthYr").every((year) => Number(year) <= ctx.num("TaxYr"))),
    "Each 'ChildBirthYr' that has a value on Schedule EIC (Form 1040) must not be greater than 'TaxYr' in the Return Header.",
  ),
  rule(
    "SEIC-F1040-004-05",
    "reject",
    "incorrect_data",
    inOwnDocument(
      eachGroup(
        "QualifyingChildInformation",
        ifThen(
          (ctx) => ctx.hasValue("ChildBirthYr") && ctx.num("ChildBirthYr") === ctx.num("TaxYr"),
          any(eqNum("MonthsChildLivedWithYouCnt", 12), eqStr("KidnappedChildCd", "KC")),
        ),
        "ChildBirthYr",
        "MonthsChildLivedWithYouCnt",
        "KidnappedChildCd",
      ),
    ),
    "For each 'ChildBirthYr' on Schedule EIC (Form 1040) that is equal to 'TaxYr' in the Return Header, the corresponding 'MonthsChildLivedWithYouCnt' must be equal to 12 or 'KidnappedChildCd' must have the value \"KC\".",
  ),
  rule(
    "SEIC-F1040-005-10",
    "reject",
    "incorrect_data",
    inOwnDocument(
      eachGroup(
        "QualifyingChildInformation",
        ifThen(
          (ctx) => ctx.hasValue("ChildBirthYr") && ctx.num("TaxYr") - ctx.num("ChildBirthYr") >= 19 &&
            ctx.num("TaxYr") - ctx.num("ChildBirthYr") < 24,
          any(eqStr("ChildIsAStudentUnder24Ind", "Yes"), eqStr("ChildPermanentlyDisabledInd", "Yes")),
        ),
        "ChildBirthYr",
        "ChildIsAStudentUnder24Ind",
        "ChildPermanentlyDisabledInd",
      ),
    ),
    "For each child who is 19 years or older and younger than 24 years per the 'ChildBirthYr' on Schedule EIC (Form 1040), the corresponding 'ChildIsAStudentUnder24Ind' or 'ChildPermanentlyDisabledInd' must have a choice of \"Yes\" indicated.",
  ),
  rule(
    "SEIC-F1040-006-10",
    "reject",
    "incorrect_data",
    inOwnDocument(
      eachGroup(
        "QualifyingChildInformation",
        ifThen(
          (ctx) => ctx.hasValue("ChildBirthYr") && ctx.num("TaxYr") - ctx.num("ChildBirthYr") >= 24,
          eqStr("ChildPermanentlyDisabledInd", "Yes"),
        ),
        "ChildBirthYr",
        "ChildPermanentlyDisabledInd",
      ),
    ),
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
    inOwnDocument(
      amountLte(
        groupCount("QualifyingChildInformation", eqStr("DiedLiteralCd", "DIED"), "DiedLiteralCd"),
        attachmentCountStartingWith("BirthCertificate", "DeathCertificate", "HospitalMedicalRecords"),
      ),
    ),
    "For each child on Schedule EIC (Form 1040), where 'DiedLiteralCd' has the value \"DIED\", there must be a binary attachment with Description beginning with \"BirthCertificate\" or \"DeathCertificate\" or \"HospitalMedicalRecords\" present in the return.",
  ),
  rule(
    "SEIC-F1040-009",
    "alert",
    "information",
    // Offline: no child twice on this return, nor a filer.
    inOwnDocument(all(allDistinct("QualifyingChildSSN"), noneMatchHeaderSSN("QualifyingChildSSN"))),
    "A qualifying child claimed on Schedule EIC (Form 1040) for the Earned Income Credit was previously claimed as a qualifying child on another accepted return for the same tax year. Visit www.irs.gov/identity-theft-fraud-scams/identity-theft-dependents for additional information.",
  ),
  rule(
    "SEIC-F1040-010",
    "alert",
    "information",
    // Offline: no child twice on this return, nor a filer.
    inOwnDocument(all(allDistinct("QualifyingChildSSN"), noneMatchHeaderSSN("QualifyingChildSSN"))),
    "A qualifying child claimed on Schedule EIC (Form 1040) for the Earned Income Credit was previously claimed as a qualifying child on another accepted return for the same tax year. Visit www.irs.gov/identity-theft-fraud-scams/identity-theft-dependents for additional information.",
  ),
  rule(
    "SEIC-F1040-501-02",
    "reject",
    "incorrect_data",
    // Offline: an issuable SSN whose name control agrees with the rest of the return.
    inOwnDocument(
      eachGroup(
        "QualifyingChildInformation",
        all(
          everyIssuableTin("QualifyingChildSSN"),
          personNameControlAgrees("QualifyingChildNameControlTxt", "QualifyingChildSSN"),
        ),
        "QualifyingChildSSN", "QualifyingChildNameControlTxt",
      ),
    ),
    "In each 'QualifyingChildInformation' on Schedule EIC (Form 1040), [ 'QualifyingChildSSN' and 'QualifyingChildNameControlTxt' ] must match the e-File database.",
  ),
  rule(
    "SEIC-F1040-506-04",
    "reject",
    "incorrect_data",
    // Offline: no child twice on this return, nor a filer.
    inOwnDocument(all(allDistinct("QualifyingChildSSN"), noneMatchHeaderSSN("QualifyingChildSSN"))),
    "In each 'QualifyingChildInformation' on Schedule EIC (Form 1040), 'QualifyingChildSSN' must not be the same as a qualifying child SSN on another return filed for the same tax year. Visit www.irs.gov/identity-theft-fraud-scams/identity-theft-dependents for additional information. To electronically file with this duplicate condition, an Identity Protection Personal Identification Number (IP PIN) will be required. If you wish to get an IP PIN and you don't already have an account on IRS.gov, then you must register to validate your identity. Please visit www.irs.gov/getanippin for further information and resubmit your return with an IP PIN.",
  ),
  rule(
    "SEIC-F1040-509-04",
    "reject",
    "incorrect_data",
    // Offline: no child is a filer of this return.
    inOwnDocument(noneMatchHeaderSSN("QualifyingChildSSN")),
    "In each 'QualifyingChildInformation' on Schedule EIC (Form 1040), 'QualifyingChildSSN' must not be the same as the spouse SSN on another return filed for the same tax year. Visit www.irs.gov/identity-theft-fraud-scams/identity-theft-dependents for additional information. To electronically file with this duplicate condition, an Identity Protection Personal Identification Number (IP PIN) will be required. If you wish to get an IP PIN and you don't already have an account on IRS.gov, then you must register to validate your identity. Please visit www.irs.gov/getanippin for further information and resubmit your return with an IP PIN.",
  ),
  rule(
    "SEIC-F1040-521-03",
    "reject",
    "incorrect_data",
    inOwnDocument((ctx) => ctx.fieldArray("ChildBirthYr").every((year) => Number(year) <= ctx.num("TaxYr"))),
    "Each qualifying child listed on Schedule EIC (Form 1040) must have been born prior to or during the tax year for which the return is being filed.",
  ),
  rule(
    "SEIC-F1040-534-03",
    "reject",
    "incorrect_data",
    // Offline: no child born after the tax year; "DIED" only for a child born that year.
    inOwnDocument(
      eachGroup(
        "QualifyingChildInformation",
        all(
          amountLte(amount("ChildBirthYr"), amount("TaxYr")),
          ifThen(hasValue("DiedLiteralCd"), amountEq(amount("ChildBirthYr"), amount("TaxYr"))),
        ),
        "ChildBirthYr",
        "DiedLiteralCd",
      ),
    ),
    "A qualifying child that is deceased must not be listed on Schedule EIC (Form 1040) if their date of death was prior to the tax year for which the return is being filed.",
  ),
  rule(
    "SEIC-F1040-535-04",
    "reject",
    "incorrect_data",
    // Offline: a four-digit birth year no later than the tax year.
    inOwnDocument(
      eachGroup(
        "QualifyingChildInformation",
        all(allMatch("ChildBirthYr", /^\d{4}$/), amountLte(amount("ChildBirthYr"), amount("TaxYr"))),
        "ChildBirthYr",
      ),
    ),
    "In each 'QualifyingChildInformation' on Schedule EIC (Form 1040), 'ChildBirthYr' must match the e-File database.",
  ),
  rule(
    "SEIC-F1040-536-04",
    "reject",
    "incorrect_data",
    inOwnDocument(ifThen(filingStatusIs(1, 3, 4, 5), childrenBornAfter("PrimaryBirthDt"))),
    "If the filing status of the return is Single or Head of household or Married Filing Separate or Qualifying surviving spouse, then each qualifying child listed on Schedule EIC (Form 1040) must be younger than the primary taxpayer.",
  ),
  rule(
    "SEIC-F1040-537-02",
    "reject",
    "incorrect_data",
    inOwnDocument(ifThen(filingStatusIs(2), all(childrenBornAfter("PrimaryBirthDt"), childrenBornAfter("SpouseBirthDt")))),
    "If the filing status of the return is Married filing jointly, then each qualifying child listed on Schedule EIC (Form 1040) must be younger than both the primary taxpayer and the secondary taxpayer.",
  ),
  rule(
    "SEIC-F1040-539-03",
    "reject",
    "missing_data",
    inOwnDocument(
      any(
        eachGroup(
          "QualifyingChildInformation",
          any(hasValue("QualifyingChildSSN"), hasValue("DiedLiteralCd")),
          "QualifyingChildSSN",
          "DiedLiteralCd",
        ),
        notGtNum("1040/EarnedIncomeCreditAmt", 649),
      ),
    ),
    "Schedule EIC (Form 1040), [ 'QualifyingChildSSN' or 'DiedLiteralCd' ] in 'QualifyingChildInformation' must have a value unless both of the following are true: (1) Form 1040, 'EarnedIncomeCreditAmt' has a value less than or equal to 649 and (2) The self-only EIC being claimed with a qualifying child (see instructions and also Pub. 596).",
  ),
  rule(
    "SEIC-F1040-911-01",
    "reject_and_stop",
    "database",
    // Offline: an SSN the SSA can issue; its lock is IRS data.
    inOwnDocument(everyIssuableTin("QualifyingChildSSN")),
    "The Qualifying Child SSN that has a value on Schedule EIC (Form 1040), has been locked because Social Security Administration records indicate the number belongs to a deceased individual.",
  ),
  rule(
    "SEIC-F1040-912-01",
    "reject_and_stop",
    "database",
    // Offline: an SSN the SSA can issue; its lock is IRS data.
    inOwnDocument(everyIssuableTin("QualifyingChildSSN")),
    "The Qualifying Child SSN that has a value on Schedule EIC (Form 1040), has been locked. The account was locked per the taxpayer's request.",
  ),
  rule(
    "SEIC-F1040-914-01",
    "reject_and_stop",
    "database",
    // Offline: an SSN the SSA can issue; its lock is IRS data.
    inOwnDocument(everyIssuableTin("QualifyingChildSSN")),
    "The Qualifying Child SSN that has a value on Schedule EIC (Form 1040), has been locked. The account was locked per the request of the qualifying child's parent or guardian.",
  ),
  rule(
    "SEIC-F1040-995-01",
    "reject_and_stop",
    "incorrect_data",
    inOwnDocument(wellFormedIpPins("QualifyingChildInformation/IdentityProtectionPIN")),
    "The Dependent/Qualifying Child Identity Protection Personal Identification Number (IP PIN) on Schedule EIC (Form 1040) must match the e-File database. Please double check your entry and resubmit your return with the correct number.",
  ),
  rule(
    "SEIC-F1040-996-01",
    "reject_and_stop",
    "incorrect_data",
    inOwnDocument(wellFormedIpPins("QualifyingChildInformation/IdentityProtectionPIN")),
    "The Primary Taxpayer did not enter a valid Identity Protection Personal Identification Number (IP PIN) for Dependent/Qualifying Child on Schedule EIC (Form 1040). Please visit www.irs.gov/getanippin for further information and resubmit your return with the correct number.",
  ),
];

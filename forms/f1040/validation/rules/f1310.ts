/**
 * MeF Business Rules: F1310
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 17 rules (17 implemented, 0 stubs)
 */

import type { RuleDef } from "../../../../core/validation/types.ts";
import { rule, alwaysPass, any, dateYearGte, eqField, eqStr, filingStatusIs, filingStatusNot, formPresent, hasValue, ifThen, noValue, ssnNotEqual, } from "../../../../core/validation/mod.ts";

export const F1310_RULES: readonly RuleDef[] = [
  rule(
    "F1310-002",
    "reject",
    "incorrect_data",
    ifThen(hasValue("DecedentSSN"), eqField("DecedentSSN", "PrimarySSN")),
    "Form 1310, 'DecedentSSN' must be equal to 'PrimarySSN' in the Return Header, if the filing status of the return is not Married filing jointly.",
  ),
  rule(
    "F1310-004",
    "reject",
    "incorrect_data",
    ifThen(filingStatusIs(2), any(eqField("DecedentSSN", "PrimarySSN"), eqField("DecedentSSN", "SpouseSSN"))),
    "Form 1310, 'DecedentSSN' must be equal to 'PrimarySSN' or 'SpouseSSN' in the Return Header, if the filing status of the return is Married filing jointly.",
  ),
  rule(
    "F1310-005",
    "reject",
    "incorrect_data",
    alwaysPass,
    "If two Forms 1310 are present in the Return, their 'DecedentSSN's must not be equal.",
  ),
  rule(
    "F1310-006-02",
    "reject",
    "incorrect_data",
    ifThen(hasValue("RefundDueTaxYr"), eqField("RefundDueTaxYr", "TaxYr")),
    "Form 1310, 'RefundDueTaxYr' must be equal to 'TaxYr' in the Return Header.",
  ),
  rule(
    "F1310-007-01",
    "reject",
    "incorrect_data",
    dateYearGte("DeathDt", "TaxYr"),
    "Form 1310, the year of 'DeathDt' must not be less than 'TaxYr' in the Return Header.",
  ),
  rule(
    "F1310-008-01",
    "reject",
    "data_mismatch",
    any(eqField("DeathDt", "PrimaryDeathDt"), eqField("DeathDt", "SpouseDeathDt")),
    "Form 1310, 'DeathDt' must be the same as 'PrimaryDeathDt' or 'SpouseDeathDt' in the return.",
  ),
  rule(
    "F1310-009-01",
    "reject",
    "missing_data",
    ifThen(hasValue("RefundClaimWithProofOfDeathGrp"), eqStr("CourtAppointedRepInd", "No")),
    "If Form 1310, 'RefundClaimWithProofOfDeathGrp' has a value, then 'CourtAppointedRepInd' must have a choice of \"No\" indicated.",
  ),
  rule(
    "F1310-010-01",
    "reject",
    "missing_data",
    ifThen(hasValue("RefundClaimWithProofOfDeathGrp"), eqStr("RepresentativeToBeAppointedInd", "No")),
    "If Form 1310, 'RefundClaimWithProofOfDeathGrp' has a value, 'RepresentativeToBeAppointedInd' must have a choice of \"No\" indicated.",
  ),
  rule(
    "F1310-011-01",
    "reject",
    "missing_data",
    ifThen(hasValue("RefundClaimWithProofOfDeathGrp"), eqStr("PaymentAccordingToStateLawInd", "Yes")),
    "If Form 1310, 'RefundClaimWithProofOfDeathGrp' has a value, 'PaymentAccordingToStateLawInd' must have a choice of \"Yes\" indicated.",
  ),
  rule(
    "F1310-012",
    "reject",
    "incorrect_data",
    ssnNotEqual("RefundClaimantSSN", "PrimarySSN"),
    "Form 1310, 'RefundClaimantSSN' must not be equal to the 'PrimarySSN' in the Return Header.",
  ),
  rule(
    "F1310-014",
    "reject",
    "incorrect_data",
    ifThen(hasValue("RefundClaimantSSN"), eqField("RefundClaimantSSN", "SpouseSSN")),
    "Form 1310, 'RefundClaimantSSN' must be equal to 'SpouseSSN' in the Return Header, if the filing status of the return is Married filing separately.",
  ),
  rule(
    "F1310-015",
    "reject",
    "incorrect_data",
    ifThen(filingStatusNot(3), ssnNotEqual("RefundClaimantSSN", "SpouseSSN")),
    "Form 1310, 'RefundClaimantSSN' must not be equal to 'SpouseSSN' in the Return Header, if the filing status of the return is not Married filing separately.",
  ),
  rule(
    "F1310-016",
    "reject",
    "incorrect_data",
    alwaysPass,
    "If two Forms 1310 are present in the Return, their 'RefundClaimantSSN's must be equal.",
  ),
  rule(
    "F1310-019",
    "reject",
    "missing_data",
    ifThen(formPresent("form1310"), hasValue("InCareOfNm")),
    "If Form 1310 is present in the return, then 'InCareOfNm' in the Return Header must have a value.",
  ),
  rule(
    "F1310-023-02",
    "reject",
    "missing_data",
    alwaysPass,
    "If Form 1310 'CourtOrPersonalRepInd' is checked, then a binary attachment with Description 'personal representative court certificate' must be present in the return, unless 'CertificatePreviouslyFiledCd' (Form 1310) is present.",
  ),
  rule(
    "F1310-024-02",
    "reject",
    "incorrect_data",
    ifThen(hasValue("CourtOrPersonalRepInd"), any(hasValue("AmendedReturnInd"), hasValue("SupersededReturnInd"), hasValue("CorrectedReturnInd"))),
    "If Form 1310 'CourtOrPersonalRepInd' is checked, then one of the following checkboxes must be checked: Form 1040/1040-NR, 'AmendedReturnInd' or 'SupersededReturnInd' or Form 1040-SS, 'CorrectedReturnInd' or 'SupersededReturnInd'.",
  ),
  rule(
    "F1310-518",
    "reject",
    "database",
    alwaysPass,
    "Form 1310, Name Control of the person claiming refund 'PersonNameControlTxt' and SSN of Person claiming Refund 'RefundClaimantSSN' must match the e-File database.",
  ),
];

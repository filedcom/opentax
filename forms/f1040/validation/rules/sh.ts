/**
 * MeF Business Rules: SH
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 21 rules (21 implemented, 0 stubs)
 */

import type { RuleDef } from "../../../../core/validation/types.ts";
import { rule, all, alwaysPass, any, eqField, eqStr, gte, hasNonZero, hasValue, ifThen, matchesHeaderSSN, not, notGtField, notMatchesHeaderSSN, noValue, } from "../../../../core/validation/mod.ts";

export const SH_RULES: readonly RuleDef[] = [
  rule(
    "SH-F1040-001",
    "reject",
    "incorrect_data",
    matchesHeaderSSN("SSN"),
    "Schedule H (Form 1040), 'SSN' must be equal to the 'PrimarySSN' or 'SpouseSSN' in the Return Header.",
  ),
  rule(
    "SH-F1040-002",
    "reject",
    "incorrect_data",
    alwaysPass,
    "If two Schedules H (Form 1040) are present in the return, their SSN's must not be equal.",
  ),
  rule(
    "SH-F1040-003",
    "reject",
    "incorrect_data",
    notMatchesHeaderSSN("EmployerEIN"),
    "Schedule H (Form 1040), 'EmployerEIN' must not be equal to the 'PrimarySSN' or the 'SpouseSSN' in the Return Header.",
  ),
  rule(
    "SH-F1040-004",
    "reject",
    "incorrect_data",
    alwaysPass,
    "If two Schedules H (Form 1040) are present in the return, their 'EmployerEIN's must not be equal.",
  ),
  rule(
    "SH-F1040-005",
    "reject",
    "incorrect_data",
    any(
      all(eqStr("HsldEmplPdCashWageOverLmtCYInd", "Yes"), not(eqStr("HsldEmplFedIncmTaxWithheldInd", "Yes")), not(eqStr("HsldEmplPdCashWageOvrLmtQtrInd", "Yes"))),
      all(not(eqStr("HsldEmplPdCashWageOverLmtCYInd", "Yes")), eqStr("HsldEmplFedIncmTaxWithheldInd", "Yes"), not(eqStr("HsldEmplPdCashWageOvrLmtQtrInd", "Yes"))),
      all(not(eqStr("HsldEmplPdCashWageOverLmtCYInd", "Yes")), not(eqStr("HsldEmplFedIncmTaxWithheldInd", "Yes")), eqStr("HsldEmplPdCashWageOvrLmtQtrInd", "Yes")),
    ),
    "On Schedule H(Form 1040), exactly one of Line A 'HsldEmplPdCashWageOverLmtCYInd' or Line B 'HsldEmplFedIncmTaxWithheldInd' or Line C 'HsldEmplPdCashWageOvrLmtQtrInd' must have a choice of \"Yes\" indicated.",
  ),
  rule(
    "SH-F1040-006-01",
    "reject",
    "missing_data",
    ifThen(eqStr("HsldEmplFedIncmTaxWithheldInd", "Yes"), hasNonZero("FederalIncomeTaxWithheldAmt")),
    "If a choice of \"Yes\" is indicated on Schedule H(Form 1040), Line B 'HsldEmplFedIncmTaxWithheldInd', then Line 7 'FederalIncomeTaxWithheldAmt' must have a non-zero value.",
  ),
  rule(
    "SH-F1040-007",
    "reject",
    "incorrect_data",
    ifThen(all(eqStr("HsldEmplPdCashWageOverLmtCYInd", "No"), eqStr("HsldEmplFedIncmTaxWithheldInd", "Yes")), noValue("HsldEmplPdCashWageOvrLmtQtrInd")),
    "If a choice of \"No\" is indicated on Schedule H(Form 1040), Line A 'HsldEmplPdCashWageOverLmtCYInd' and a choice of \"Yes\" is indicated on Line B 'HsldEmplFedIncmTaxWithheldInd', then Line C 'HsldEmplPdCashWageOvrLmtQtrInd' must have neither choices \"Yes\" or \"No\" indicated.",
  ),
  rule(
    "SH-F1040-008-10",
    "reject",
    "incorrect_data",
    ifThen(eqStr("HsldEmplPdCashWageOverLmtCYInd", "Yes"), gte("SocialSecurityTaxCashWagesAmt", 2800)),
    "If a choice of \"Yes\" is indicated on Schedule H (Form 1040), 'HsldEmplPdCashWageOverLmtCYInd', then 'SocialSecurityTaxCashWagesAmt' must not be less than 2800.",
  ),
  rule(
    "SH-F1040-009-10",
    "reject",
    "incorrect_data",
    ifThen(eqStr("HsldEmplPdCashWageOverLmtCYInd", "Yes"), gte("MedicareTaxCashWagesAmt", 2800)),
    "If a choice of \"Yes\" is indicated on Schedule H (Form 1040), 'HsldEmplPdCashWageOverLmtCYInd', then 'MedicareTaxCashWagesAmt' must not be less than 2800.",
  ),
  rule(
    "SH-F1040-010",
    "reject",
    "incorrect_data",
    ifThen(eqStr("HsldEmplPdCashWageOverLmtCYInd", "Yes"), all(noValue("HsldEmplFedIncmTaxWithheldInd"), noValue("HsldEmplPdCashWageOvrLmtQtrInd"))),
    "If a choice of \"Yes\" is indicated on Schedule H(Form 1040), Line A 'HsldEmplPdCashWageOverLmtCYInd', then Line B 'HsldEmplFedIncmTaxWithheldInd' and Line C 'HsldEmplPdCashWageOvrLmtQtrInd' must have neither choices \"Yes\" or \"No\" indicated.",
  ),
  rule(
    "SH-F1040-011",
    "reject",
    "incorrect_data",
    ifThen(hasNonZero("SocialSecurityTaxCashWagesAmt"), notGtField("SocialSecurityTaxCashWagesAmt", "MedicareTaxCashWagesAmt")),
    "If Schedule H (Form 1040), 'SocialSecurityTaxCashWagesAmt' has a non-zero value, then it must not be greater than 'MedicareTaxCashWagesAmt'.",
  ),
  rule(
    "SH-F1040-012-03",
    "reject",
    "data_mismatch",
    ifThen(hasValue("TotalTaxHouseholdEmplCalcAmt"), eqField("TotalTaxHouseholdEmplCalcAmt", "TotSocSecMedcrAndFedIncmTaxAmt")),
    "If Schedule H (Form 1040), 'TotalTaxHouseholdEmplCalcAmt' has a non-zero value, then it must be equal to 'TotSocSecMedcrAndFedIncmTaxAmt'.",
  ),
  rule(
    "SH-F1040-017-01",
    "reject",
    "missing_data",
    ifThen(eqStr("HsldEmplPdTotCashWageAnyQtrInd", "Yes"), hasNonZero("CombinedFUTATaxPlusNetTaxesAmt")),
    "If Schedule H(Form 1040), Line 9 'HsldEmplPdTotCashWageAnyQtrInd' has a choice of \"Yes\" indicated, then Line 26 'CombinedFUTATaxPlusNetTaxesAmt' must have a non-zero value.",
  ),
  rule(
    "SH-F1040-018-01",
    "reject",
    "missing_data",
    ifThen(all(eqStr("HsldEmplPdCashWageOverLmtCYInd", "No"), eqStr("HsldEmplFedIncmTaxWithheldInd", "No"), eqStr("HsldEmplPdCashWageOvrLmtQtrInd", "Yes")), hasNonZero("CombinedFUTATaxPlusNetTaxesAmt")),
    "If a choice of \"No\" is indicated on Schedule H(Form 1040), [ Line A 'HsldEmplPdCashWageOverLmtCYInd' and Line B 'HsldEmplFedIncmTaxWithheldInd' ] and Line C 'HsldEmplPdCashWageOvrLmtQtrInd' has a choice of \"Yes\" indicated, then Line 26 'CombinedFUTATaxPlusNetTaxesAmt' must have a non-zero value.",
  ),
  rule(
    "SH-F1040-019-01",
    "reject",
    "missing_data",
    ifThen(eqStr("HsldEmplPdCashWageOvrLmtQtrInd", "Yes"), all(hasValue("UnemplPaidOnlyOneStateInd"), hasValue("PayAllStateUnemplContriInd"), hasValue("TxblFUTAWagesAlsoTxblUnemplInd"))),
    "If a choice of \"Yes\" is indicated on Schedule H(Form 1040), Line C 'HsldEmplPdCashWageOvrLmtQtrInd', then Line 10 'UnemplPaidOnlyOneStateInd' and Line 11 'PayAllStateUnemplContriInd' and Line 12 'TxblFUTAWagesAlsoTxblUnemplInd' must have a choice of \"Yes\" or \"No\" indicated.",
  ),
  rule(
    "SH-F1040-020-01",
    "reject",
    "missing_data",
    ifThen(eqStr("HsldEmplPdTotCashWageAnyQtrInd", "Yes"), all(hasValue("UnemplPaidOnlyOneStateInd"), hasValue("PayAllStateUnemplContriInd"), hasValue("TxblFUTAWagesAlsoTxblUnemplInd"))),
    "If a choice of \"Yes\" is indicated on Schedule H(Form 1040), Line 9 'HsldEmplPdTotCashWageAnyQtrInd', then Line 10  'UnemplPaidOnlyOneStateInd' and Line 11 'PayAllStateUnemplContriInd' and Line 12 'TxblFUTAWagesAlsoTxblUnemplInd' must have a choice of \"Yes\" or \"No\" indicated.",
  ),
  rule(
    "SH-F1040-022",
    "reject",
    "missing_data",
    hasValue("SSN"),
    "Schedule H (Form 1040), 'SSN' must have a value.",
  ),
  rule(
    "SH-F1040-520-01",
    "reject",
    "database",
    alwaysPass,
    "Schedule H (Form 1040), 'EmployerEIN' and 'EmployerNameControlTxt' must match data in the e-File database.",
  ),
  rule(
    "SH-F5471-001",
    "reject",
    "incorrect_data",
    alwaysPass,
    "If Schedule H (Form 5471) is present in the return, then it must be referenced from one and only one Form 5471.",
  ),
  rule(
    "SH-F5471-002",
    "reject",
    "missing_data",
    any(hasValue("ForeignCorporationEIN"), hasValue("ForeignEntityReferenceIDNum")),
    "Schedule H (Form 5471), 'ForeignCorporationEIN' or 'ForeignEntityReferenceIDNum' must have a value.",
  ),
  rule(
    "SH-F8865-001",
    "reject",
    "incorrect_data",
    alwaysPass,
    "If Schedule H (Form 8865) is present in the return, then it must be referenced from one and only one Form 8865.",
  ),
];

/**
 * MeF Business Rules: F9465
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 20 rules (20 implemented, 0 stubs)
 */

import type { RuleDef } from "../../../../core/validation/types.ts";
import { rule, all, alwaysPass, any, eqField, eqStr, gt, hasNonZero, hasValue, ifThen, not, notGtField, notLtSum, noValue, } from "../../../../core/validation/mod.ts";

export const F9465_RULES: readonly RuleDef[] = [
  rule(
    "F9465-001-03",
    "reject",
    "incorrect_data",
    not(gt("TotalTaxDueAmt", 50000)),
    "Form 9465 may not be filed electronically when 'TotalTaxDueAmt' is greater than 50000. If the tax due amount is more than 50000, then you must complete Form 9465 and Form 433-F on paper and mail them to the mailing address provided at https://www.irs.gov/filing/where-to-file-your-taxes-for-form-9465.",
  ),
  rule(
    "F9465-014",
    "reject",
    "incorrect_data",
    alwaysPass,
    "Form 9465, Line 1 'PrimarySSN' must be equal to either the 'PrimarySSN' or 'SpouseSSN' in the Return Header.",
  ),
  rule(
    "F9465-015",
    "reject",
    "incorrect_data",
    alwaysPass,
    "If Form 9465, Line 1 'SpouseSSN' has a value, then it must be equal to either the 'PrimarySSN' or 'SpouseSSN' in the Return Header.",
  ),
  rule(
    "F9465-016-01",
    "reject",
    "missing_data",
    ifThen(hasValue("RoutingTransitNum"), hasValue("BankAccountNum")),
    "If Form 9465, Line 13a 'RoutingTransitNum' has a value, then Line 13b 'BankAccountNum' must also have a value.",
  ),
  rule(
    "F9465-017-01",
    "reject",
    "missing_data",
    ifThen(hasValue("BankAccountNum"), hasValue("RoutingTransitNum")),
    "If Form 9465, Line 13b 'BankAccountNum' has a value, then Line 13a 'RoutingTransitNum' must also have a value.",
  ),
  rule(
    "F9465-018-01",
    "reject",
    "missing_data",
    any(hasValue("PhoneNum"), hasValue("ForeignPhoneNum")),
    "In Form 9465, one of the following must have a value: Line 3 Home 'PhoneNum' or Line 4 Work 'PhoneNum' or Line 3 Home 'ForeignPhoneNum' or Line 4 Work 'ForeignPhoneNum'.",
  ),
  rule(
    "F9465-019-01",
    "reject",
    "incorrect_data",
    ifThen(hasValue("PaymentAmt"), eqField("PaymentAmt", "PaymentAmt")),
    "If IRS Payment Record is present in the return, then Form 9465, Line 8 'PaymentAmt' must be equal to 'PaymentAmt' in IRS Payment Record.",
  ),
  rule(
    "F9465-020-01",
    "reject",
    "missing_data",
    ifThen(hasValue("SpouseName"), hasValue("SpouseNameControlTxt")),
    "If Form 9465, Line 1a 'SpouseName' has a value, then 'SpouseNameControlTxt' must also have a value.",
  ),
  rule(
    "F9465-026-01",
    "reject",
    "incorrect_data",
    noValue("PayrollDeductionAgreementInd"),
    "Form 9465 may not be filed electronically when 'PayrollDeductionAgreementInd' is checked. If you want to make payments by payroll deduction, then you must complete Form 9465 and Form 2159 on paper and mail them to the mailing address provided at https://www.irs.gov/filing/where-to-file-your-taxes-for-form-9465.",
  ),
  rule(
    "F9465-027-01",
    "reject",
    "incorrect_data",
    ifThen(hasNonZero("PaymentDueAmt"), notGtField("CalculatedMonthlyPymtAmt", "PaymentDueAmt")),
    "Form 9465 may not be filed electronically when 'PaymentDueAmt' is less than 'CalculatedMonthlyPymtAmt'. If the payment due amount is less than the calculated monthly payment amount, then you must complete Form 9465 and Form 433-F on paper. Check the box below Line 11b of Form 9465. Mail both completed forms to the mailing address provided at https://www.irs.gov/filing/where-to-file-your-taxes-for-form-9465.",
  ),
  rule(
    "F9465-029-02",
    "reject",
    "incorrect_data",
    not(any(eqStr("F9465TaxReturnTypeCd", "FORM 940"), eqStr("F9465TaxReturnTypeCd", "FORM 941"), eqStr("F9465TaxReturnTypeCd", "FORM 943"), eqStr("F9465TaxReturnTypeCd", "FORM 944"), eqStr("F9465TaxReturnTypeCd", "FORM 945"), eqStr("F9465TaxReturnTypeCd", "FORM 720"), eqStr("F9465TaxReturnTypeCd", "FORM 2290"))),
    "If Form 9465 is attached to Form 1040 or Form 1040SS or Form 1040NR, then 'F9465TaxReturnTypeCd' must not have the following values: [\"FORM 940\" or \"FORM 941\" or \"FORM 943\" or \"FORM 944\" or \"FORM 945\" or \"FORM 720\" or \"FORM 2290\"].",
  ),
  rule(
    "F9465-030-02",
    "reject",
    "missing_data",
    ifThen(any(eqStr("F9465TaxReturnTypeCd", "FORM 1040"), eqStr("F9465TaxReturnTypeCd", "FORM 1040NR"), eqStr("F9465TaxReturnTypeCd", "FORM 1040SS")), hasValue("IATaxYrDt")),
    "If Form 9465, 'F9465TaxReturnTypeCd' has the value [ \"FORM 1040\" or \"FORM 1040NR\" or \"FORM 1040SS\" ], then 'IATaxYrDt' must have a value.",
  ),
  rule(
    "F9465-037-01",
    "reject",
    "incorrect_data",
    noValue("CanNotIncreasePaymentInd"),
    "Form 9465 'CanNotIncreasePaymentInd' must not be checked. Form 9465 may not be filed electronically when you cannot increase your payment to more than or equal to the calculated payment amount. If you cannot increase your payment, then you must complete Form 9465 and Form 433-F on paper and mail them to the mailing address provided at https://www.irs.gov/filing/where-to-file-your-taxes-for-form-9465.",
  ),
  rule(
    "F9465-038-02",
    "reject",
    "incorrect_data",
    ifThen(any(eqStr("F9465TaxReturnTypeCd", "FORM 1040"), eqStr("F9465TaxReturnTypeCd", "FORM 1040NR"), eqStr("F9465TaxReturnTypeCd", "FORM 1040SS")), noValue("TaxPeriodDetailGrp")),
    "If Form 9465, 'F9465TaxReturnTypeCd' has the value [\"FORM 1040\" or \"FORM 1040NR\" or \"FORM 1040SS\"], then 'TaxPeriodDetailGrp' must not have a value.",
  ),
  rule(
    "F9465-039-01",
    "reject",
    "incorrect_data",
    ifThen(hasNonZero("RevisedMonthlyPaymentAmt"), notGtField("CalculatedMonthlyPymtAmt", "RevisedMonthlyPaymentAmt")),
    "Form 9465 may not be filed electronically when 'RevisedMonthlyPaymentAmt' has a value and it is less than 'CalculatedMonthlyPymtAmt'. If 'RevisedMonthlyPaymentAmt' has a non-zero value and it is less than 'CalculatedMonthlyPymtAmt', then you must complete Form 9465 and Form 433-F on paper. Check the box below Line 11b of Form 9465. Mail both completed forms to the mailing address provided at https://www.irs.gov/filing/where-to-file-your-taxes-for-form-9465.",
  ),
  rule(
    "F9465-040",
    "reject",
    "incorrect_data",
    ifThen(hasValue("RoutingTransitNum"), noValue("NoElectronicPaymentInd")),
    "If Form 9465, 'RoutingTransitNum' have a value, then 'NoElectronicPaymentInd' must not be checked.",
  ),
  rule(
    "F9465-041",
    "reject",
    "math_error",
    ifThen(hasNonZero("TotalBalanceDueAmt"), notLtSum("TotalBalanceDueAmt", "TaxDueAmt", "AdditionalBalanceDueAmt")),
    "If Form 9465 'TotalBalanceDueAmt' have a non-zero value, it must not be less than the sum of the following: 'TaxDueAmt' and 'AdditionalBalanceDueAmt'.",
  ),
  rule(
    "F9465-042",
    "reject",
    "incorrect_data",
    ifThen(all(hasNonZero("RevisedMonthlyPaymentAmt"), hasNonZero("CalculatedMonthlyPymtAmt")), noValue("CanNotIncreasePaymentInd")),
    "If Form 9465, ['RevisedMonthlyPaymentAmt' and 'CalculatedMonthlyPymtAmt'] have non-zero values and ['RevisedMonthlyPaymentAmt' is greater than or equal to 'CalculatedMonthlyPymtAmt'], then 'CanNotIncreasePaymentInd' must not be checked.",
  ),
  rule(
    "F9465-043",
    "reject",
    "incorrect_data",
    ifThen(all(hasNonZero("PaymentDueAmt"), hasNonZero("RevisedMonthlyPaymentAmt")), not(eqField("PaymentDueAmt", "RevisedMonthlyPaymentAmt"))),
    "If Form 9465 'PaymentDueAmt' and 'RevisedMonthlyPaymentAmt' have non-zero values, then they must not be equal.",
  ),
  rule(
    "F9465-044",
    "reject",
    "missing_data",
    alwaysPass,
    "If (1) Form 9465, 'TotalTaxDueAmt' is between 25000 and 50000 and (2) [ 'PaymentDueAmt' or 'RevisedMonthlyPaymentAmt' ] has a value greater than 'CalculatedMonthlyPymtAmt', then [ 'RoutingTransitNum' and 'BankAccountNum' must have values] or [ 'PayrollDeductionAgreementInd' must be checked ]. If you choose to pay by payroll deduction, choose not to provide bank account information, or elect neither payroll deduction or bank account withdrawal, then you must complete Form 9465 and Form 2159 on paper and mail them to the mailing address provided at https://www.irs.gov/filing/where-to-file-your-taxes-for-form-9465.",
  ),
];

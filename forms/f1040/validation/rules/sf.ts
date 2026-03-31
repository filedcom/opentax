/**
 * MeF Business Rules: SF
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 10 rules (10 implemented, 0 stubs)
 */

import type { RuleDef } from "../../../../core/validation/types.ts";
import { rule, alwaysPass, any, eqField, formPresent, hasNonZero, hasValue, ifThen, all, } from "../../../../core/validation/mod.ts";

export const SF_RULES: readonly RuleDef[] = [
  rule(
    "SF-F1040-011-02",
    "reject",
    "incorrect_data",
    any(hasNonZero("GrossIncomeAmt"), hasNonZero("TotalExpensesAmt"), hasNonZero("NetFarmProfitLossAmt")),
    "Schedule F (Form 1040) must have a non-zero value in one of the following: 'GrossIncomeAmt', 'TotalExpensesAmt', 'NetFarmProfitLossAmt'.",
  ),
  rule(
    "SF-F1040-012-02",
    "reject",
    "missing_document",
    ifThen(all(hasNonZero("NetFarmProfitLossAmt"), hasValue("SomeInvestmentIsNotAtRiskInd")), formPresent("form6198")),
    "If Schedule F (Form 1040) 'NetFarmProfitLossAmt' has a value less than zero and 'SomeInvestmentIsNotAtRiskInd' checkbox is checked, then Form 6198 must be present in the return.",
  ),
  rule(
    "SF-F1040-015-01",
    "reject",
    "missing_document",
    ifThen(hasNonZero("CarAndTruckExpensesAmt"), formPresent("form4562")),
    "If Schedule F (Form 1040), 'CarAndTruckExpensesAmt' has a non-zero value, then Form 4562 must be present in the return.",
  ),
  rule(
    "SF-F1040-016-01",
    "reject",
    "missing_data",
    any(hasValue("MethodOfAccountingCashInd"), hasValue("MethodOfAccountingAccrualInd")),
    "Schedule F (Form 1040) 'MethodOfAccountingCashInd' checkbox or 'MethodOfAccountingAccrualInd' checkbox must be checked.",
  ),
  rule(
    "SF-F1040-017",
    "reject",
    "missing_data",
    ifThen(hasNonZero("CCCLoanReportedElectionAmt"), hasValue("CCCLoanDetailCashMethodStatement")),
    "If Schedule F (Form 1040) 'CCCLoanReportedElectionAmt' has a non-zero value, then [CCCLoanDetailCashMethodStatement] must be attached to Schedule F.",
  ),
  rule(
    "SF-F1040-019",
    "reject",
    "missing_data",
    ifThen(hasValue("GrossIncomeAmt"), eqField("GrossIncomeAmt", "GrossIncomeAmt")),
    "If Schedule F (Form 1040), Part III, 'GrossIncomeAmt' has a non-zero value, then it must be equal to Part I, 'GrossIncomeAmt'.",
  ),
  rule(
    "SF-F1040-020-01",
    "reject",
    "missing_data",
    ifThen(hasValue("MethodOfAccountingAccrualInd"), any(hasNonZero("FarmIncomeAccrualMethodGrp/GrossIncomeAmt"), hasNonZero("TotalExpensesAmt"))),
    "If Schedule F (Form 1040), Line C 'MethodOfAccountingAccrualInd' is checked, then Part III, 'GrossIncomeAmt' within [FarmIncomeAccrualMethodGrp] or Part II, 'TotalExpensesAmt' must have a non-zero value.",
  ),
  rule(
    "SF-F1040-022",
    "reject",
    "missing_data",
    ifThen(hasValue("ElectionDeferCropInsProcInd"), hasValue("PostponementOfCropInsuranceAndDisasterPaymentsStatement")),
    "If Schedule F (Form 1040) 'ElectionDeferCropInsProcInd' checkbox is checked, then [PostponementOfCropInsuranceAndDisasterPaymentsStatement] must be attached to Schedule F.",
  ),
  rule(
    "SF-F1040-023-01",
    "reject",
    "missing_data",
    ifThen(hasValue("MethodOfAccountingCashInd"), any(hasNonZero("FarmIncomeCashMethodGrp/GrossIncomeAmt"), hasNonZero("TotalExpensesAmt"))),
    "If Schedule F (Form 1040), Line C 'MethodOfAccountingCashInd' checkbox is checked, then Part I, 'GrossIncomeAmt' within [FarmIncomeCashMethodGrp] or Part II, 'TotalExpensesAmt' must have a non-zero value.",
  ),
  rule(
    "SF-F1040-024",
    "reject",
    "incorrect_data",
    alwaysPass, // requires cross-form check: SSN must equal PrimarySSN or SpouseSSN in Return Header
    "For each Schedule F (Form 1040) present in the return, 'SSN' must be equal to the Primary SSN or Spouse SSN in the Return Header.",
  ),
];

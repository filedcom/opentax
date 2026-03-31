/**
 * MeF Business Rules: SC
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 17 rules (17 implemented, 0 stubs)
 */

import type { RuleDef } from "../../../../core/validation/types.ts";
import { rule, all, alwaysPass, any, eqDiff, eqStr, formPresent, gt, hasNonZero, hasValue, ifThen, lt, notMatchesHeaderSSN, noValue, } from "../../../../core/validation/mod.ts";

export const SC_RULES: readonly RuleDef[] = [
  rule(
    "SC-F1040-001",
    "reject",
    "incorrect_data",
    notMatchesHeaderSSN("EIN"),
    "Schedule C (Form 1040), Item D 'EIN' must not be the same as the Primary SSN or the Spouse SSN in the Return Header.",
  ),
  rule(
    "SC-F1040-002-02",
    "reject",
    "missing_data",
    any(hasNonZero("TotalGrossReceiptsAmt"), hasNonZero("GrossIncomeAmt"), hasNonZero("TotalExpensesAmt"), hasNonZero("TentativeProfitOrLossAmt"), hasNonZero("NetProfitOrLossAmt")),
    "One of the following lines in Schedule C (Form 1040) must have a non-zero value: Line 1 'TotalGrossReceiptsAmt', Line 7 'GrossIncomeAmt', Line 28 'TotalExpensesAmt', Line 29 'TentativeProfitOrLossAmt', Line 31 'NetProfitOrLossAmt'.",
  ),
  rule(
    "SC-F1040-003-01",
    "reject",
    "missing_data",
    ifThen(hasNonZero("CarAndTruckExpensesAmt"), any(hasValue("VehiclePlacedInServiceDt"), formPresent("form4562"))),
    "If Schedule C (Form 1040), Part II, Line 9 'CarAndTruckExpensesAmt' has a non-zero value, then Schedule C (Form 1040), Part IV, Line 43 'VehiclePlacedInServiceDt' must have a value or Form 4562 must be present in the return.",
  ),
  rule(
    "SC-F1040-004-01",
    "reject",
    "missing_data",
    ifThen(hasNonZero("BusinessMilesCnt"), hasValue("VehiclePlacedInServiceDt")),
    "If Schedule C (Form 1040), Part IV, Line 44a 'BusinessMilesCnt' has a non-zero value, Line 43 'VehiclePlacedInServiceDt' must have a value.",
  ),
  rule(
    "SC-F1040-005-02",
    "reject",
    "math_error",
    eqDiff("NetGrossReceiptsAmt", "TotalGrossReceiptsAmt", "ReturnsAndAllowancesAmt"),
    "Schedule C (Form 1040), 'NetGrossReceiptsAmt' must be equal to [ 'TotalGrossReceiptsAmt' minus (-) 'ReturnsAndAllowancesAmt' ].",
  ),
  rule(
    "SC-F1040-007",
    "reject",
    "missing_document",
    ifThen(hasValue("OtherClosingInventoryMethodInd"), hasValue("OtherMethodUsedToValueClosingInventoryStatement")),
    "If Schedule C (Form 1040) Line 33c checkbox 'OtherClosingInventoryMethodInd' is checked, then \"Other Method Used To Value Closing Inventory Statement\" [OtherMethodUsedToValueClosingInventoryStatement] must be attached.",
  ),
  rule(
    "SC-F1040-010",
    "reject",
    "missing_document",
    ifThen(all(lt("NetProfitOrLossAmt", 0), hasValue("SomeInvestmentIsNotAtRiskInd")), formPresent("form6198")),
    "If Schedule C (Form 1040), Line 31 'NetProfitOrLossAmt' is less than zero and Line 32b 'SomeInvestmentIsNotAtRiskInd' is checked, then Form 6198 must be present in the return.",
  ),
  rule(
    "SC-F1040-014",
    "reject",
    "missing_document",
    ifThen(eqStr("ChangeInValuationsInd", "Yes"), hasValue("ChangeInValuationsStatement")),
    "If Schedule C (Form 1040), Line 34 'ChangeInValuationsInd' has a choice of \"Yes\" indicated, then [ChangeInValuationsStatement] must be attached to Line 34.",
  ),
  rule(
    "SC-F1040-015-01",
    "reject",
    "incorrect_data",
    alwaysPass,
    "If Schedule C (Form 1040), 'TotalAreaOfHomeCnt' and 'HomeBusinessUseSquareFeetCnt' both have a non-zero value, then 'HomeBusinessExpenseAmt' must not be greater than (1500 plus the sum of all Form 8829, 'AllowableHomeBusExpnssSchCAmt').",
  ),
  rule(
    "SC-F1040-017",
    "reject",
    "missing_data",
    ifThen(hasNonZero("TotalAreaOfHomeCnt"), hasNonZero("HomeBusinessUseSquareFeetCnt")),
    "If Schedule C (Form 1040), Line 30a 'TotalAreaOfHomeCnt' has a non-zero value, then Line 30b 'HomeBusinessUseSquareFeetCnt' must have a non-zero value.",
  ),
  rule(
    "SC-F1040-018",
    "reject",
    "missing_data",
    ifThen(hasNonZero("HomeBusinessUseSquareFeetCnt"), hasNonZero("TotalAreaOfHomeCnt")),
    "If Schedule C (Form 1040), Line 30b 'HomeBusinessUseSquareFeetCnt' has a non-zero value, then 30a 'TotalAreaOfHomeCnt' must have a non-zero value.",
  ),
  rule(
    "SC-F1040-020",
    "reject",
    "missing_document",
    ifThen(gt("HomeBusinessExpenseAmt", 1500), formPresent("form8829")),
    "If Schedule C (Form 1040), Line 30 'HomeBusinessExpenseAmt' is greater than 1500, then Form 8829 must be attached to Line 30.",
  ),
  rule(
    "SC-F1040-021",
    "reject",
    "math_error",
    eqDiff("GrossProfitAmt", "NetGrossReceiptsAmt", "CostOfGoodsSoldAmt"),
    "Schedule C (Form 1040), 'GrossProfitAmt' must be equal to [ 'NetGrossReceiptsAmt' minus (-) 'CostOfGoodsSoldAmt' ].",
  ),
  rule(
    "SC-F1040-023-01",
    "reject",
    "math_error",
    alwaysPass,
    "Each 'NetProfitOrLossAmt' in Form 1040 Schedule C, must be equal to 'TentativeProfitOrLossAmt' minus (-) 'HomeBusinessExpenseAmt'.",
  ),
  rule(
    "SC-F1040-024",
    "reject",
    "incorrect_data",
    alwaysPass,
    "For each Schedule C (Form 1040) present in the return, 'SSN' must be equal to the Primary SSN or Spouse SSN in the Return Header.",
  ),
  rule(
    "SC-F1040-033",
    "alert",
    "missing_document",
    ifThen(hasNonZero("EnergyEffcntCmrclBldgDedAmt"), formPresent("form7205")),
    "Schedule C (Form 1040), 'EnergyEffcntCmrclBldgDedAmt' has a non-zero value, but Form 7205 is not present in the return. Form 7205 should be completed and filed with the return anytime this credit is being claimed.",
  ),
  rule(
    "SC-F1116-001",
    "reject",
    "incorrect_data",
    ifThen(hasValue("ContestResolvedInd"), hasValue("ContestResolvedDt")),
    "In each 'AnnualRptgContestedTaxesGrp' on Schedule C (Form 1116), if 'ContestResolvedInd' is checked, then 'ContestResolvedDt' must have a value.",
  ),
];

/**
 * MeF Business Rules: F1116
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 9 rules (9 implemented, 0 stubs)
 */

import type { RuleDef } from "../../../../core/validation/types.ts";
import { rule, alwaysPass, eqField, hasNonZero, hasValue, ifThen, } from "../../../../core/validation/mod.ts";

export const F1116_RULES: readonly RuleDef[] = [
  rule(
    "F1116-002-01",
    "reject",
    "incorrect_data",
    alwaysPass, // requires cross-instance uniqueness check: among all Forms 1116 with AMT code, each category checkbox must appear at most once
    "Among all Forms 1116 present in the return with 'AlternativeMinimumTaxCd' having the value \"AMT\", there must be only one Form 1116 with each one of the following checkboxes checked: 'ForeignIncmSection951AInd', 'ForeignBranchIncomeInd', 'ForeignIncPassiveCategoryInd', 'ForeignIncGeneralCategoryInd', 'ForeignIncSection901jInd', 'ForeignIncResourcedTreatyInd', 'ForeignIncLumpSumDistribInd'.",
  ),
  rule(
    "F1116-005",
    "reject",
    "missing_document",
    ifThen(hasNonZero("ForeignTaxReductionAmt"), hasValue("ForeignTaxReductionStatement")),
    "If Form 1116, Line 12 'ForeignTaxReductionAmt' has a non-zero value, then [ForeignTaxReductionStatement] must be attached to Line 12.",
  ),
  rule(
    "F1116-006-01",
    "reject",
    "data_mismatch",
    ifThen(hasValue("SmllrOfRtnTaxOrForeignTaxCrAmt"), eqField("SmllrOfRtnTaxOrForeignTaxCrAmt", "GrossForeignTaxCreditAmt")),
    "If only one Form 1116 is present in the return, then 'SmllrOfRtnTaxOrForeignTaxCrAmt' must be equal to 'GrossForeignTaxCreditAmt'.",
  ),
  rule(
    "F1116-007-01",
    "reject",
    "incorrect_data",
    alwaysPass, // requires single-form-count check plus multiple fields must be zero
    "If only one Form 1116 is present in the return, then all of the following must be equal to zero if an amount is entered: 'ForeignIncmSection951ACrAmt', 'ForeignBranchIncomeCrAmt', 'ForeignPassiveIncTaxCreditAmt', 'ForeignGeneralIncTaxCreditAmt', 'ForeignIncmSection901jCrAmt', 'ForeignIncRsrcdTreatyTaxCrAmt', 'ForeignIncLumpSumDistribCrAmt', 'TentativeForeignTaxCreditAmt'.",
  ),
  rule(
    "F1116-008",
    "reject",
    "missing_document",
    ifThen(hasValue("AltBasisCompensationSourceInd"), hasValue("AltBasisCompensationSourceStatement")),
    "If Form 1116, Line 1b 'AltBasisCompensationSourceInd' checkbox is checked, then [AltBasisCompensationSourceStatement] must be attached to Line 1b.",
  ),
  rule(
    "F1116-012",
    "reject",
    "missing_document",
    ifThen(hasNonZero("ForeignIncRelatedExpensesAmt"), hasValue("ForeignIncmRelatedExpensesStmt")),
    "If for any country in Form 1116, Line 2 'ForeignIncRelatedExpensesAmt' has a non-zero value, then [ForeignIncmRelatedExpensesStmt] must be attached to Line 2.",
  ),
  rule(
    "F1116-013",
    "reject",
    "missing_document",
    ifThen(hasNonZero("OtherDeductionsNotRelatedAmt"), hasValue("OtherDeductionsNotRelatedStatement")),
    "If for any country in Form 1116, Line 3b 'OtherDeductionsNotRelatedAmt' has a non-zero value, then [OtherDeductionsNotRelatedStatement] must be attached to Line 3b.",
  ),
  rule(
    "F1116-014-02",
    "reject",
    "incorrect_data",
    alwaysPass, // requires cross-instance check: among Forms 1116 without 901j/LumpSum, only one can have nonzero ForeignTaxCreditAmt
    "If there is more than one Form 1116 with Item e checkbox 'ForeignIncSection901jInd' or Item g 'ForeignIncLumpSumDistribInd' not checked, then only one of those Form 1116s can have a non-zero value on 'ForeignTaxCreditAmt'.",
  ),
  rule(
    "F1116-017",
    "reject",
    "missing_document",
    ifThen(hasNonZero("ForeignIncomeNetAdjustmentAmt"), hasValue("ForeignIncomeNetAdjustmentStatement")),
    "If Form 1116, Line 16 'ForeignIncomeNetAdjustmentAmt' has a non-zero value, then [ForeignIncomeNetAdjustmentStatement] must be attached to Line 16.",
  ),
];

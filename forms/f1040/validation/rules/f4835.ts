/**
 * MeF Business Rules: F4835
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 3 rules (3 implemented, 0 stubs)
 */

import type { RuleDef } from "../../../../core/validation/types.ts";
import { rule, alwaysPass, any, formPresent, hasNonZero, hasValue, ifThen, } from "../../../../core/validation/mod.ts";

export const F4835_RULES: readonly RuleDef[] = [
  rule(
    "F4835-001",
    "reject",
    "math_error",
    alwaysPass,
    "The sum of [all Forms 4835, Line 32 'NetFarmRentalIncomeOrLossAmt' with an amount greater than zero] minus (-) the sum of the absolute values of all Line 34c 'FarmRentalDeductibleLossAmt' must be equal to Schedule E (Form 1040), Line 40 'NetFarmRentalIncomeOrLossAmt'.",
  ),
  rule(
    "F4835-002-01",
    "reject",
    "missing_document",
    ifThen(hasValue("SomeInvestmentIsNotAtRiskInd"), any(formPresent("form6198"), formPresent("form8582"))),
    "If Form 4835, Line 34b checkbox 'SomeInvestmentIsNotAtRiskInd' is checked, then Form 6198 or Form 8582 must be present in the return.",
  ),
  rule(
    "F4835-004-01",
    "reject",
    "missing_document",
    ifThen(hasNonZero("CarAndTruckExpensesAmt"), formPresent("form4562")),
    "If Form 4835, Line 8 'CarAndTruckExpensesAmt' has a non-zero value, then Form 4562 must be present in the return.",
  ),
];

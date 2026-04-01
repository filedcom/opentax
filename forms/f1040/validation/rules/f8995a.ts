/**
 * MeF Business Rules: F8995A
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 5 rules (1 implemented, 4 stubs)
 */

import type { RuleDef } from "../../../../core/validation/types.ts";
import { rule, all, any, decimalPlacesEq, eqField, eqStr, filingStatusIs, filingStatusNot, hasNonZero, hasValue, ifThen, notLtSum, } from "../../../../core/validation/mod.ts";

export const F8995A_RULES: readonly RuleDef[] = [
  rule(
    "F8995A-001",
    "reject",
    "incorrect_data",
    ifThen(hasNonZero("PhaseInPct"), decimalPlacesEq("PhaseInPct", 5)),
    "If Form 8995-A, 'PhaseInPct' has a non-zero value, then it must have exactly five decimal places.",
  ),
  rule(
    "F8995A-002",
    "reject",
    "incorrect_data",
    ifThen(hasNonZero("DPADSect199AgAllocAgricHortAmt"), notLtSum("TaxableIncomeBeforeQBIDedAmt", "DPADSect199AgAllocAgricHortAmt", "QBIDedBeforeDPADSect199AgAmt")),
    "If Form 8995-A, 'DPADSect199AgAllocAgricHortAmt' has a non-zero value, then it must not be greater than 'TaxableIncomeBeforeQBIDedAmt' minus (-) 'QBIDedBeforeDPADSect199AgAmt'.",
  ),
  rule(
    "F8995A-003",
    "reject",
    "math_error",
    ifThen(hasValue("REITPTPComponentAmt"), eqField("REITPTPComponentAmt", "TotQlfyREITDivPTPIncomeAmt")),
    "If Form 8995-A, 'REITPTPComponentAmt' has a non-zero value, then it must be equal to 'TotQlfyREITDivPTPIncomeAmt' multiplied by 20% (0.20).",
  ),
  rule(
    "F8995A-004-05",
    "reject",
    "incorrect_data",
    ifThen(hasValue("FilingStatusThresholdCd"), any(all(filingStatusIs(2), eqStr("FilingStatusThresholdCd", "383900")), all(filingStatusNot(2), eqStr("FilingStatusThresholdCd", "191950")))),
    "If Form 8995-A, 'FilingStatusThresholdCd' has a value, then it must be one of the following based on the filing status of the return: (1) \"383900\", if married filing jointly or (2) \"191950\" for all other filing status.",
  ),
  rule(
    "F8995A-007",
    "reject",
    "incorrect_data",
    ifThen(hasValue("FilingStatusPhaseInRangeCd"), any(all(filingStatusIs(2), eqStr("FilingStatusPhaseInRangeCd", "100000")), all(filingStatusNot(2), eqStr("FilingStatusPhaseInRangeCd", "50000")))),
    "If Form 8995-A, 'FilingStatusPhaseInRangeCd' has a value, then it must be one of the following based on the filing status of the return: (1) \"100000\", if married filing jointly or (2) \"50000\" for all other filing status.",
  ),
];

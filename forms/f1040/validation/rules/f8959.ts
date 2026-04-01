/**
 * MeF Business Rules: F8959
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 18 rules (18 implemented, 0 stubs)
 */

import type { RuleDef } from "../../../../core/validation/types.ts";
import { rule, alwaysPass, eqDiff, eqDiffFloorZero, eqField, eqNum, eqSum, filingStatusIs, hasValue, ifThen, } from "../../../../core/validation/mod.ts";

export const F8959_RULES: readonly RuleDef[] = [
  rule(
    "F8959-001",
    "reject",
    "math_error",
    alwaysPass,
    "Form 8959, Line 2 'TotalUnreportedMedicareTipsAmt' must be equal to the sum of all Form 4137, Line 6 'NetUnreportedMinusIncdntlAmt'.",
  ),
  rule(
    "F8959-002",
    "reject",
    "math_error",
    alwaysPass,
    "Form 8959, Line 3 'TotalWagesWithNoWithholdingAmt' must be equal to the sum of all Form 8919, Line 6 'TotalWagesWithNoWithholdingAmt'.",
  ),
  rule(
    "F8959-003",
    "reject",
    "math_error",
    eqSum("TotalMedicareWagesAndTipsAmt", "TotalW2MedicareWagesAndTipsAmt", "TotalUnreportedMedicareTipsAmt", "TotalWagesWithNoWithholdingAmt"),
    "Form 8959, Line 4 'TotalMedicareWagesAndTipsAmt' must be equal to the sum of Line 1 'TotalW2MedicareWagesAndTipsAmt' and Line 2 'TotalUnreportedMedicareTipsAmt' and Line 3 'TotalWagesWithNoWithholdingAmt'.",
  ),
  rule(
    "F8959-004",
    "reject",
    "incorrect_data",
    ifThen(filingStatusIs(2), eqNum("FilingStatusThresholdCd", 250000)),
    "If filing status of the return is Married filing jointly, then Form 8959, 'FilingStatusThresholdCd' must be equal to 250000.",
  ),
  rule(
    "F8959-005",
    "reject",
    "incorrect_data",
    ifThen(filingStatusIs(3), eqNum("FilingStatusThresholdCd", 125000)),
    "If filing status of the return is Married filing separately, then Form 8959, 'FilingStatusThresholdCd' must be equal to 125000.",
  ),
  rule(
    "F8959-006",
    "reject",
    "incorrect_data",
    ifThen(filingStatusIs(1, 4, 5), eqNum("FilingStatusThresholdCd", 200000)),
    "If filing status of the return is Single, Head of household, or Qualifying surviving spouse, then Form 8959, 'FilingStatusThresholdCd' must be equal to 200000.",
  ),
  rule(
    "F8959-008",
    "reject",
    "math_error",
    eqDiffFloorZero("WagesTipsSubjToAddlMedcrTaxAmt", "TotalMedicareWagesAndTipsAmt", "FilingStatusThresholdCd"),
    "Form 8959, Line 6 'WagesTipsSubjToAddlMedcrTaxAmt' must be equal to Line 4 'TotalMedicareWagesAndTipsAmt' minus (-) Line 5 'FilingStatusThresholdCd'.",
  ),
  rule(
    "F8959-009",
    "reject",
    "math_error",
    ifThen(hasValue("AdditionalMedicareTaxAmt"), eqField("AdditionalMedicareTaxAmt", "WagesTipsSubjToAddlMedcrTaxAmt")),
    "Form 8959, Line 7 'AdditionalMedicareTaxAmt' must be equal to Line 6 'WagesTipsSubjToAddlMedcrTaxAmt' multiplied by 0.9% (0.009).",
  ),
  rule(
    "F8959-010-02",
    "reject",
    "math_error",
    alwaysPass,
    "Form 8959, 'TotalSelfEmploymentIncomeAmt' must be equal to the sum of all Schedule SE (Form 1040), 'CombinedSEAndChurchWagesAmt'.",
  ),
  rule(
    "F8959-012",
    "reject",
    "math_error",
    eqDiffFloorZero("MedcrWagesTipsBelowThrshldAmt", "FilingStatusThresholdCd", "TotalMedicareWagesAndTipsAmt"),
    "Form 8959, Line 11 'MedcrWagesTipsBelowThrshldAmt' must be equal to Line 9 'FilingStatusThresholdCd' minus (-) Line  10 'TotalMedicareWagesAndTipsAmt'.",
  ),
  rule(
    "F8959-013",
    "reject",
    "math_error",
    eqDiff("SEIncomeSubjToAddSETaxAmt", "TotalSelfEmploymentIncomeAmt", "MedcrWagesTipsBelowThrshldAmt"),
    "Form 8959, Line 12 'SEIncomeSubjToAddSETaxAmt' must be equal to Line 8 'TotalSelfEmploymentIncomeAmt' minus (-) Line 11 'MedcrWagesTipsBelowThrshldAmt'.",
  ),
  rule(
    "F8959-014",
    "reject",
    "math_error",
    ifThen(hasValue("AddlSelfEmploymentTaxAmt"), eqField("AddlSelfEmploymentTaxAmt", "SEIncomeSubjToAddSETaxAmt")),
    "Form 8959, Line 13 'AddlSelfEmploymentTaxAmt' must be equal to Line 12 'SEIncomeSubjToAddSETaxAmt' multiplied by 0.9% (0.009).",
  ),
  rule(
    "F8959-015",
    "reject",
    "math_error",
    eqDiffFloorZero("RRTCompSubjToAddRRTTaxAmt", "TotalRailroadRetirementCompAmt", "FilingStatusThresholdCd"),
    "Form 8959, Line 16 'RRTCompSubjToAddRRTTaxAmt' must be equal to Line 14 'TotalRailroadRetirementCompAmt' minus (-) Line 15 'FilingStatusThresholdCd'.",
  ),
  rule(
    "F8959-016",
    "reject",
    "math_error",
    ifThen(hasValue("AddlRailroadRetirementTaxAmt"), eqField("AddlRailroadRetirementTaxAmt", "RRTCompSubjToAddRRTTaxAmt")),
    "Form 8959, Line 17 'AddlRailroadRetirementTaxAmt' must be equal to Line 16 'RRTCompSubjToAddRRTTaxAmt' multiplied by 0.9% (0.009).",
  ),
  rule(
    "F8959-017",
    "reject",
    "math_error",
    eqSum("TotalAMRRTTaxAmt", "AdditionalMedicareTaxAmt", "AddlSelfEmploymentTaxAmt", "AddlRailroadRetirementTaxAmt"),
    "Form 8959, Line 18 'TotalAMRRTTaxAmt' must be equal to the sum of Line 7 'AdditionalMedicareTaxAmt' and Line 13 'AddlSelfEmploymentTaxAmt' and Line 17 'AddlRailroadRetirementTaxAmt'.",
  ),
  rule(
    "F8959-018",
    "reject",
    "math_error",
    ifThen(hasValue("TotalMedicareTaxAmt"), eqField("TotalMedicareTaxAmt", "TotalW2MedicareWagesAndTipsAmt")),
    "Form 8959, Line 21 'TotalMedicareTaxAmt' must be equal to Line 20 'TotalW2MedicareWagesAndTipsAmt' multiplied by 1.45% (0.0145).",
  ),
  rule(
    "F8959-019-01",
    "reject",
    "math_error",
    eqDiff("AddnlMedicareTaxWithholdingAmt", "TotalW2MedicareTaxWithheldAmt", "TotalMedicareTaxAmt"),
    "Form 8959, Line 22 'AddnlMedicareTaxWithholdingAmt' must be equal to Line 19 'TotalW2MedicareTaxWithheldAmt' minus (-) Line 21 'TotalMedicareTaxAmt'.",
  ),
  rule(
    "F8959-020-01",
    "reject",
    "math_error",
    eqSum("AddlMedcrRRTTaxWithholdingAmt", "AddnlMedicareTaxWithholdingAmt", "TotalW2AddlRRTTaxAmt"),
    "Form 8959, Line 24 'AddlMedcrRRTTaxWithholdingAmt' must be equal to the sum of Line 22 'AddnlMedicareTaxWithholdingAmt' and Line 23 'TotalW2AddlRRTTaxAmt'.",
  ),
];

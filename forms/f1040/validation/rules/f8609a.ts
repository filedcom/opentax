/**
 * MeF Business Rules: F8609A
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 2 rules (0 implemented, 2 stubs)
 */

import type { RuleDef } from "../../../../core/validation/types.ts";
import { rule, all, eqStr, ifThen, isZero, noValue, } from "../../../../core/validation/mod.ts";

export const F8609A_RULES: readonly RuleDef[] = [
  rule(
    "F8609A-003-01",
    "reject",
    "data_mismatch",
    ifThen(eqStr("QlfyLowIncmHsngProjSect42Ind", "No"), isZero("LowIncomeHousingCrAmt")),
    "If Form 8609-A, Line D, 'QlfyLowIncmHsngProjSect42Ind' has a choice of \"No\" indicated, then Line 18 'LowIncomeHousingCrAmt' must have a zero value if an amount is entered.",
  ),
  rule(
    "F8609A-006",
    "reject",
    "data_mismatch",
    ifThen(eqStr("Orig8609HousingCrAgencyRecInd", "No"), all(noValue("BuildingEligibleBasisAmt"), noValue("LowIncomePortionRt"), noValue("QualifiedBasisOfLowIncmBldgAmt"), noValue("PartYearAdjustmentDuringTYAmt"), noValue("MaximumApplicableCrPct"), noValue("CreditForLowIncomeBuildingAmt"), noValue("QualifiedBasisAdditionAmt"), noValue("PartYearAdjustment2DuringTYAmt"), noValue("OneThirdMaximumApplicableCrPct"), noValue("IntBasedLowIncomeBuildingAmt"), noValue("Section42f3BModificationAmt"), noValue("AdjCrForLowIncomeBuildingAmt"), noValue("CreditForBldgBfrReductionAmt"), noValue("DsallwCrDueToFederalGrantAmt"), noValue("CreditAllowedForBldgForTYAmt"), noValue("TaxpayerShareOfCreditForYrAmt"), noValue("AdjForDeferredFirstYrCreditAmt"), noValue("LowIncomeHousingCrAmt"))),
    "If Form 8609-A, Line C 'Orig8609HousingCrAgencyRecInd' has a choice of \"No\" indicated, then the following fields must not have a value: Line 1 'BuildingEligibleBasisAmt', Line 2 'LowIncomePortionRt', Line 3 'QualifiedBasisOfLowIncmBldgAmt', Line 4 'PartYearAdjustmentDuringTYAmt', Line 5 'MaximumApplicableCrPct', Line 6 'CreditForLowIncomeBuildingAmt', Line 7 'QualifiedBasisAdditionAmt', Line 8 'PartYearAdjustment2DuringTYAmt', Line 9 'OneThirdMaximumApplicableCrPct', Line 10 'IntBasedLowIncomeBuildingAmt', Line 11 'Section42f3BModificationAmt', Line 12 'AdjCrForLowIncomeBuildingAmt', Line 13 'CreditForBldgBfrReductionAmt', Line 14 'DsallwCrDueToFederalGrantAmt', Line 15 'CreditAllowedForBldgForTYAmt', Line 16 'TaxpayerShareOfCreditForYrAmt', Line 17 'AdjForDeferredFirstYrCreditAmt', Line 18 'LowIncomeHousingCrAmt'.",
  ),
];

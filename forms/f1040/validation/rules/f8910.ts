/**
 * MeF Business Rules: F8910
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 9 rules (8 implemented, 1 stubs)
 */

import type { RuleDef } from "../../../../core/validation/types.ts";
import { rule, alwaysPass, hasNonZero, hasValue, ifThen, isZero, all, } from "../../../../core/validation/mod.ts";

export const F8910_RULES: readonly RuleDef[] = [
  rule(
    "F8910-007-01",
    "reject",
    "incorrect_data",
    ifThen(hasNonZero("TotalBusinessInvestmentUseAmt"), hasValue("VehicleDescriptionGrp")),
    "If Form 8910, Part II, Line 7 'TotalBusinessInvestmentUseAmt' has a non-zero value, then 'VehicleDescriptionGrp' must have a value.",
  ),
  rule(
    "F8910-008-01",
    "reject",
    "incorrect_data",
    ifThen(hasNonZero("TotalBusinessInvestmentUseAmt"), hasValue("VIN")),
    "If Form 8910, Part II, Line 7 'TotalBusinessInvestmentUseAmt' has a non-zero value, then Part I Line 2 'VIN' must have a value.",
  ),
  rule(
    "F8910-009-01",
    "reject",
    "incorrect_data",
    ifThen(hasNonZero("TotalBusinessInvestmentUseAmt"), hasValue("VehiclePlacedInServiceDt")),
    "If Form 8910, Part II, Line 7 'TotalBusinessInvestmentUseAmt' has a non-zero value, then Part I Line 3 'VehiclePlacedInServiceDt' must have a value.",
  ),
  rule(
    "F8910-010-01",
    "reject",
    "incorrect_data",
    ifThen(hasNonZero("PersonalUsePartOfCreditAmt"), hasValue("VehicleDescriptionGrp")),
    "If Form 8910, Part III, Line 15 'PersonalUsePartOfCreditAmt' has a non-zero value, then 'VehicleDescriptionGrp' must have a value.",
  ),
  rule(
    "F8910-011-01",
    "reject",
    "incorrect_data",
    ifThen(hasNonZero("PersonalUsePartOfCreditAmt"), hasValue("VIN")),
    "If Form 8910, Part III, Line 15 'PersonalUsePartOfCreditAmt' has a non-zero value, then Part I Line 2 'VIN' must have a value.",
  ),
  rule(
    "F8910-012-01",
    "reject",
    "incorrect_data",
    ifThen(hasNonZero("PersonalUsePartOfCreditAmt"), hasValue("VehiclePlacedInServiceDt")),
    "If Form 8910, Part III, Line 15 'PersonalUsePartOfCreditAmt' has a non-zero value, then Part I Line 3 'VehiclePlacedInServiceDt' must have a value.",
  ),
  rule(
    "F8910-013-07",
    "reject",
    "incorrect_data",
    alwaysPass,
    "For each vehicle listed in 'VehicleDescriptionGrp' of Form 8910, if 'VehiclePlacedInServiceDt' has a value, it must be on or after 'TaxPeriodBeginDt' and on or before 'TaxPeriodEndDt' in the Return Header.",
  ),
  rule(
    "F8910-022",
    "reject",
    "incorrect_data",
    all(isZero("BusinessInvestmentUsePct"), isZero("BusinessInvestmentUseAmt"), isZero("TotalBusinessInvestmentUseAmt")),
    "The following Form 8910 values must be zero if present: 'BusinessInvestmentUsePct', 'BusinessInvestmentUseAmt', and 'TotalBusinessInvestmentUseAmt'.",
  ),
  rule(
    "F8910-023",
    "reject",
    "incorrect_data",
    all(isZero("TentativeCreditForPrsnlUseAmt"), isZero("TotalTentativeCrForPrsnlUseAmt"), isZero("TotalTaxBeforeCrAndOthTaxesAmt"), isZero("AltMotorVehCreditFromFormsAmt"), isZero("AltMotorVehAdjustedCreditAmt"), isZero("PersonalUsePartOfCreditAmt")),
    "The following Form 8910 amounts must be zero if present: 'TentativeCreditForPrsnlUseAmt', 'TotalTentativeCrForPrsnlUseAmt', 'TotalTaxBeforeCrAndOthTaxesAmt', 'AltMotorVehCreditFromFormsAmt', 'AltMotorVehAdjustedCreditAmt' and 'PersonalUsePartOfCreditAmt'.",
  ),
];

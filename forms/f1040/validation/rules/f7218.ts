/**
 * MeF Business Rules: F7218
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 3 rules (3 implemented, 0 stubs)
 */

import type { RuleDef } from "../../../../core/validation/types.ts";
import { rule, alwaysPass, } from "../../../../core/validation/mod.ts";

export const F7218_RULES: readonly RuleDef[] = [
  rule(
    "F7218-001",
    "reject",
    "math_error",
    alwaysPass,
    "In each 'ClnAvnNonAvnFuelPrdcdSoldGrp' on Form 7218, if 'ClnAvnNonAvnFuelProdCrAmt' has a value greater than zero, then it must be equal to the product of [ 'CalcFacilityEmissionsValueOrRt' and 'GallonsOrGallonsEquivalentQty' and 'InflationAdjFuelSoldAmt' ].",
  ),
  rule(
    "F7218-002",
    "reject",
    "math_error",
    alwaysPass,
    "If Form 7218, 'TotClnAvnNonAvnFuelProdCrAmt' has a value greater than zero, then it must be equal to the sum of all [ 'ClnAvnNonAvnFuelProdCrAmt' in 'ClnAvnNonAvnFuelPrdcdSoldGrp' ].",
  ),
  rule(
    "F7218-003",
    "reject",
    "incorrect_data",
    alwaysPass,
    "In each 'ClnAvnNonAvnFuelPrdcdSoldGrp' on Form 7218, if 'SoldCalendarYr' has a value, then it must not be prior to 'TaxYr' in the Return Header.",
  ),
];

/**
 * MeF Business Rules: F8332
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 4 rules (0 implemented, 4 stubs)
 */

import type { RuleDef } from "../../../../core/validation/types.ts";
import { rule, alwaysPass, any, hasValue, ifThen, } from "../../../../core/validation/mod.ts";

export const F8332_RULES: readonly RuleDef[] = [
  rule(
    "F8332-001",
    "reject",
    "incorrect_data",
    alwaysPass,
    "Form 8332, [ 'CurrentTaxYr' in 'RelClmExemptionCYAndFutYrsGrp' ] must be the same as 'TaxYr' in the Return Header.",
  ),
  rule(
    "F8332-002",
    "reject",
    "incorrect_data",
    alwaysPass,
    "On Form 8332, each [ 'FutureTaxYr' in 'RelClmExemptionCYAndFutYrsGrp' ] must not be the same as 'TaxYr' in the Return Header.",
  ),
  rule(
    "F8332-003",
    "reject",
    "incorrect_data",
    alwaysPass,
    "On Form 8332, each [ 'FutureTaxYr' in 'RvkRelClmExemptionFutYrsGrp' ] must not be the same as 'TaxYr' in the Return Header.",
  ),
  rule(
    "F8332-004",
    "reject",
    "incorrect_data",
    ifThen(hasValue("RelClmExemptionCYAndFutYrsGrp"), any(hasValue("CurrentTaxYr"), hasValue("FutureTaxYr"), hasValue("AllFutureTaxYrLiteralCd"))),
    "If Form 8332, 'RelClmExemptionCYAndFutYrsGrp' has a value, then [ 'CurrentTaxYr' or 'FutureTaxYr' or 'AllFutureTaxYrLiteralCd' ] in 'RelClmExemptionCYAndFutYrsGrp' must have a value.",
  ),
];

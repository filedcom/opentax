/**
 * MeF Business Rules: F7205
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 2 rules (0 implemented, 2 stubs)
 */

import type { RuleDef } from "../../../../core/validation/types.ts";
import { rule, alwaysPass, hasValue, ifThen, } from "../../../../core/validation/mod.ts";

export const F7205_RULES: readonly RuleDef[] = [
  rule(
    "F7205-001",
    "reject",
    "missing_data",
    alwaysPass,
    "If Form 7205, 'EEPDesignerInd' is checked, then [ 'Sect179DDedAllocDesignerAmt' in each 'EnergyBuildingDeductionGrp' ] must have a value greater than zero.",
  ),
  rule(
    "F7205-002",
    "reject",
    "missing_data",
    alwaysPass,
    "If Form 7205, 'EEPDesignerInd' is checked, then [ 'DesignerAllocationInfoPropGrp' in each 'EnergyBuildingDeductionGrp' ] must have a value.",
  ),
];

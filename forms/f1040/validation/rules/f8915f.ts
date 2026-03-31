/**
 * MeF Business Rules: F8915F
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 3 rules (1 implemented, 2 stubs)
 */

import type { RuleDef } from "../../../../core/validation/types.ts";
import { rule, alwaysPass, notGtNum, } from "../../../../core/validation/mod.ts";

export const F8915F_RULES: readonly RuleDef[] = [
  rule(
    "F8915F-001",
    "reject",
    "incorrect_data",
    alwaysPass,
    "Form 8915-F, 'CalendarYrDisasterCd' must not have the value [ \"2025\" or \"2026\" or \"2027\" ] for a return filed for Tax Year 2024.",
  ),
  rule(
    "F8915F-002",
    "reject",
    "incorrect_data",
    alwaysPass,
    "Form 8915-F, 'TaxYearFilingFormCd' must not have the value [ \"2025\" or \"2026\" or \"2027\" or \"2028\" ] for a return filed for Tax Year 2024.",
  ),
  rule(
    "F8915F-003",
    "reject",
    "incorrect_data",
    notGtNum("PriorYrNotRptDistributionAmt", 22000),
    "Form 8915F 'PriorYrNotRptDistributionAmt' in 'TotalDistriAllRetirePlansGrp' must not be greater than 22000 times the number of qualified disasters.",
  ),
];

/**
 * MeF Business Rules: F8915F
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 3 rules (3 implemented)
 */

import type { RuleDef } from "../../../../../../core/validation/types.ts";
import {
  amount,
  amountLte,
  any,
  eqStr,
  inOwnDocument,
  not,
  rule,
} from "../../../../../../core/validation/mod.ts";

export const F8915F_RULES: readonly RuleDef[] = [
  rule(
    "F8915F-001",
    "reject",
    "incorrect_data",
    not(any(eqStr("CalendarYrDisasterCd", "2026"), eqStr("CalendarYrDisasterCd", "2027"), eqStr("CalendarYrDisasterCd", "2028"))),
    "Form 8915-F, 'CalendarYrDisasterCd' must not have the value [ \"2026\" or \"2027\" or \"2028\" ] for a return filed for Tax Year 2025.",
  ),
  rule(
    "F8915F-002",
    "reject",
    "incorrect_data",
    not(any(eqStr("TaxYearFilingFormCd", "2026"), eqStr("TaxYearFilingFormCd", "2027"), eqStr("TaxYearFilingFormCd", "2028"), eqStr("TaxYearFilingFormCd", "2029"))),
    "Form 8915-F, 'TaxYearFilingFormCd' must not have the value [ \"2026\" or \"2027\" or \"2028\" or \"2029\" ] for a return filed for Tax Year 2025.",
  ),
  rule(
    "F8915F-003",
    "reject",
    "incorrect_data",
    // Each distinct FEMA declaration number is one qualified disaster.
    inOwnDocument(
      amountLte(
        amount("TotalDistriAllRetirePlansGrp/PriorYrNotRptDistributionAmt"),
        (ctx) => 22000 * new Set(ctx.fieldArray("FEMADisasterDeclarationNum").map(String)).size,
      ),
    ),
    "Form 8915F 'PriorYrNotRptDistributionAmt' in 'TotalDistriAllRetirePlansGrp' must not be greater than 22000 times the number of qualified disasters.",
  ),
];

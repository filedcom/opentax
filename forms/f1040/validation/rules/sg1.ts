/**
 * MeF Business Rules: SG1
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 2 rules (0 implemented, 2 stubs)
 */

import type { RuleDef } from "../../../../core/validation/types.ts";
import { rule, any, hasValue, ifThen, } from "../../../../core/validation/mod.ts";

export const SG1_RULES: readonly RuleDef[] = [
  rule(
    "SG1-F5471-002",
    "reject",
    "missing_data",
    ifThen(hasValue("PlatformContributionInd"), any(hasValue("ComparableUncontrolledTransInd"), hasValue("MarketCapitalizationMethodInd"), hasValue("IncomeMethodInd"), hasValue("ResidualProfitSplitMethodInd"), hasValue("AcquisitionPriceMethodInd"), hasValue("UnspecifiedMethodsInd"))),
    "If Schedule G-1 (Form 5471), 'PlatformContributionInd' has a choice of \"Yes\" indicated, then at least one of the following must be checked: 'ComparableUncontrolledTransInd' or 'MarketCapitalizationMethodInd' or 'IncomeMethodInd' or 'ResidualProfitSplitMethodInd' or 'AcquisitionPriceMethodInd' or 'UnspecifiedMethodsInd'.",
  ),
  rule(
    "SG1-F5471-003",
    "reject",
    "missing_data",
    any(hasValue("ForeignCorporationEIN"), hasValue("ForeignEntityReferenceIdNum")),
    "Schedule G-1 (Form 5471), 'ForeignCorporationEIN' or 'ForeignEntityReferenceIdNum' must have a value.",
  ),
];

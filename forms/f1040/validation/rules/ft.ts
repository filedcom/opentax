/**
 * MeF Business Rules: FT
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 4 rules (2 implemented, 2 stubs)
 */

import type { RuleDef } from "../../../../core/validation/types.ts";
import { rule, all, alwaysPass, dateGteField, dateLteField, hasNonZero, hasValue, ifThen, } from "../../../../core/validation/mod.ts";

export const FT_RULES: readonly RuleDef[] = [
  rule(
    "FT-001-01",
    "reject",
    "missing_data",
    ifThen(hasNonZero("OtherConsiderationAmt"), hasValue("OtherConsiderationNatureTxt")),
    "If Form T, Part I, Line 5a, 'OtherConsiderationAmt' has a non-zero value, then the literal on Part I, Line 5b, 'OtherConsiderationNatureTxt' must have a value.",
  ),
  rule(
    "FT-002-01",
    "reject",
    "missing_data",
    ifThen(hasNonZero("OtherConsiderationAmt"), hasValue("OtherConsiderationNatureTxt")),
    "If Form T, Part III, Line 5a, 'OtherConsiderationAmt' has a non-zero value, then the literal on Part III, Line 5b, 'OtherConsiderationNatureTxt' must have a value.",
  ),
  rule(
    "FT-003-07",
    "reject",
    "incorrect_data",
    ifThen(hasValue("AcquiredDt"), all(dateGteField("AcquiredDt", "TaxPeriodBeginDt"), dateLteField("AcquiredDt", "TaxPeriodEndDt"))),
    "If Form T, Part I, Line 3b 'AcquiredDt' has a value, it must be on or after 'TaxPeriodBeginDt' and on or before 'TaxPeriodEndDt' in the Return Header.",
  ),
  rule(
    "FT-004-07",
    "reject",
    "incorrect_data",
    ifThen(hasValue("SaleDt"), all(dateGteField("SaleDt", "TaxPeriodBeginDt"), dateLteField("SaleDt", "TaxPeriodEndDt"))),
    "If Form T, Part III, Line 3b 'SaleDt' has a value, it must be on or after 'TaxPeriodBeginDt' and on or before 'TaxPeriodEndDt' in the Return Header.",
  ),
];

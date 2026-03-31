/**
 * MeF Business Rules: SB
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 5 rules (3 implemented, 2 stubs)
 */

import type { RuleDef } from "../../../../core/validation/types.ts";
import { rule, eqField, eqStr, hasValue, ifThen, } from "../../../../core/validation/mod.ts";

export const SB_RULES: readonly RuleDef[] = [
  rule(
    "SB-F1040-003-02",
    "reject",
    "incorrect_data",
    ifThen(hasValue("CalculatedTotalTaxableIntAmt"), eqField("CalculatedTotalTaxableIntAmt", "TaxableInterestAmt")),
    "If Schedule B (Form 1040), 'CalculatedTotalTaxableIntAmt' has a non-zero value, then it must be equal to Form 1040, 'TaxableInterestAmt' unless Form 8958 is present in the return.",
  ),
  rule(
    "SB-F1040-004-02",
    "reject",
    "incorrect_data",
    ifThen(hasValue("TotalOrdinaryDividendsAmt"), eqField("TotalOrdinaryDividendsAmt", "OrdinaryDividendsAmt")),
    "If Schedule B (Form 1040), 'TotalOrdinaryDividendsAmt' has a non-zero value, then it must be equal to Form 1040 'OrdinaryDividendsAmt' unless Form 8958 is present in the return.",
  ),
  rule(
    "SB-F1040-005-01",
    "reject",
    "incorrect_data",
    ifThen(hasValue("ExcludableSavingsBondIntAmt"), eqField("ExcludableSavingsBondIntAmt", "ExcludableSavingsBondIntAmt")),
    "If Schedule B (Form 1040), 'ExcludableSavingsBondIntAmt' has a non-zero value, then it must be equal to Form 8815, 'ExcludableSavingsBondIntAmt'.",
  ),
  rule(
    "SB-F1040-006-02",
    "reject",
    "missing_data",
    ifThen(eqStr("FinCENForm114Ind", "Yes"), hasValue("ForeignCountryCd")),
    "If Schedule B (Form 1040), 'FinCENForm114Ind' has a choice of \"Yes\" indicated, then 'ForeignCountryCd' must have a value.",
  ),
  rule(
    "SB-F1040-007-02",
    "reject",
    "missing_data",
    ifThen(hasValue("ForeignCountryCd"), eqStr("FinCENForm114Ind", "Yes")),
    "If Schedule B (Form 1040), 'ForeignCountryCd' has a value, then 'FinCENForm114Ind' must have a choice of \"Yes\" indicated.",
  ),
];

/**
 * MeF Business Rules: SJ
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 4 rules (4 implemented, 0 stubs)
 */

import type { RuleDef } from "../../../../core/validation/types.ts";
import { rule, alwaysPass, any, eqField, hasNonZero, hasValue, ifThen, } from "../../../../core/validation/mod.ts";

export const SJ_RULES: readonly RuleDef[] = [
  rule(
    "SJ-F1040-001",
    "reject",
    "data_mismatch",
    ifThen(hasValue("TaxableIncomeAmt"), eqField("TaxableIncomeAmt", "TaxableIncomeAmt")),
    "Schedule J (Form 1040),'TaxableIncomeAmt' must be equal to 'TaxableIncomeAmt' in the return.",
  ),
  rule(
    "SJ-F1040-002",
    "reject",
    "incorrect_data",
    ifThen(hasNonZero("TotalTaxTableAmt"), any(hasNonZero("CurrentTaxAmt"), hasNonZero("TaxTableAmt"))),
    "If Schedule J (Form 1040), Line 17 'TotalTaxTableAmt' has a non-zero value, then one of the following must have a non-zero value: Line 4 'CurrentTaxAmt' or Line 8 'TaxTableAmt' or Line 12 'TaxTableAmt' or Line 16 'TaxTableAmt'.",
  ),
  rule(
    "SJ-F5471-001",
    "reject",
    "incorrect_data",
    alwaysPass,
    "If Schedule J (Form 5471) is present in the return, then it must be referenced from one and only one Form 5471.",
  ),
  rule(
    "SJ-F5471-002-01",
    "reject",
    "missing_data",
    any(hasValue("ForeignCorporationEIN"), hasValue("ForeignEntityReferenceIdNum")),
    "Schedule J (Form 5471), 'ForeignCorporationEIN' or 'ForeignEntityReferenceIdNum' must have a value.",
  ),
];

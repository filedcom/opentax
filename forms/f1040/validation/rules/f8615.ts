/**
 * MeF Business Rules: F8615
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 3 rules (2 implemented, 1 stubs)
 */

import type { RuleDef } from "../../../../core/validation/types.ts";
import { rule, eqField, gt, hasValue, ifThen, } from "../../../../core/validation/mod.ts";

export const F8615_RULES: readonly RuleDef[] = [
  rule(
    "F8615-001-02",
    "reject",
    "incorrect_data",
    ifThen(hasValue("ChildTaxableIncomeAmt"), eqField("ChildTaxableIncomeAmt", "TaxableIncomeAmt")),
    "If Form 8615, 'ChildTaxableIncomeAmt' has a non-zero value, then it must be equal to Form 1040, 'TaxableIncomeAmt' unless Form 2555 is present in the return.",
  ),
  rule(
    "F8615-003-07",
    "reject",
    "incorrect_data",
    gt("ChildInvestmentIncomeAmt", 2700),
    "Form 8615, 'ChildInvestmentIncomeAmt' must be greater than 2700.",
  ),
  rule(
    "F8615-004-04",
    "reject",
    "incorrect_data",
    ifThen(hasValue("KiddieTaxAmt"), eqField("KiddieTaxAmt", "TaxAmt")),
    "If Form 8615, 'KiddieTaxAmt' has a non-zero value, then it must be equal to Form 1040, 'TaxAmt' unless Form 2555 is present in the return.",
  ),
];

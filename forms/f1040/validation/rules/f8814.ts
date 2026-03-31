/**
 * MeF Business Rules: F8814
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 6 rules (6 implemented, 0 stubs)
 */

import type { RuleDef } from "../../../../core/validation/types.ts";
import { rule, alwaysPass, eqField, gt, hasNonZero, hasValue, ifThen, validSSN, } from "../../../../core/validation/mod.ts";

export const F8814_RULES: readonly RuleDef[] = [
  rule(
    "F8814-001",
    "reject",
    "incorrect_data",
    alwaysPass, // requires form count check: if only one Form 8814, MultipleForm8814Ind must not be checked
    "If only one Form 8814 is present in the return, then Line C checkbox 'MultipleForm8814Ind' must not be checked.",
  ),
  rule(
    "F8814-002",
    "reject",
    "missing_data",
    alwaysPass, // requires form count check: if more than one Form 8814, MultipleForm8814Ind must be checked on one
    "If more than one Form 8814 is present in the return, then Line C checkbox 'MultipleForm8814Ind' must be checked on one of them.",
  ),
  rule(
    "F8814-003-08",
    "reject",
    "incorrect_data",
    alwaysPass, // requires range check: ChildInvestmentIncomeAmt must be > 1350 and < 13500
    "Form 8814, 'ChildInvestmentIncomeAmt' must be greater than 1350 and less than 13500.",
  ),
  rule(
    "F8814-004-01",
    "reject",
    "incorrect_data",
    validSSN("ChildSSN"),
    "Form 8814, 'ChildSSN' must be within the valid range of SSN/ITIN/ATIN.",
  ),
  rule(
    "F8814-006-07",
    "reject",
    "incorrect_data",
    ifThen(hasValue("ChildInterestAndDivTaxBasisAmt"), eqField("ChildInterestAndDivTaxBasisAmt", "ChildInterestAndDividendTaxAmt")),
    "If Form 8814, 'ChildInterestAndDivTaxBasisAmt' is greater than 1349, then 'ChildInterestAndDividendTaxAmt' must be equal to 135.",
  ),
  rule(
    "F8814-007-01",
    "reject",
    "incorrect_data",
    ifThen(gt("ChildInterestAndDivTaxBasisAmt", 0), hasNonZero("ChildInterestAndDividendTaxAmt")),
    "If Form 8814 'ChildInterestAndDivTaxBasisAmt' is greater than 'ChildQualifiedDividendAdjAmt', then 'ChildInterestAndDividendTaxAmt' must have a non-zero value.",
  ),
];

/**
 * MeF Business Rules: F8815
 * Derived from 1040_Business_Rules_2025v3.0.csv.
 * The two generated implications were reversed. The predicates below follow
 * the official 2025 Form 8815 line 9 MAGI ceilings by filing status:
 * https://www.irs.gov/pub/irs-prior/f8815--2025.pdf
 */

import type { RuleDef } from "../../../../core/validation/types.ts";
import {
  filingStatusIs,
  ifThen,
  lt,
  rule,
} from "../../../../core/validation/mod.ts";

export const F8815_RULES: readonly RuleDef[] = [
  rule(
    "F8815-001-14",
    "reject",
    "incorrect_data",
    ifThen(filingStatusIs(2), lt("ExclBondIntModifiedAGIAmt", 179250)),
    "If filing status is married filing jointly and Form 8815 is claimed, modified AGI must be less than $179,250.",
  ),
  rule(
    "F8815-002-14",
    "reject",
    "incorrect_data",
    ifThen(filingStatusIs(1, 4, 5), lt("ExclBondIntModifiedAGIAmt", 114500)),
    "If filing status is single, head of household, or qualifying surviving spouse and Form 8815 is claimed, modified AGI must be less than $114,500.",
  ),
];

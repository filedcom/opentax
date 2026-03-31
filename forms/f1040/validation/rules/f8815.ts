/**
 * MeF Business Rules: F8815
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 2 rules (0 implemented, 2 stubs)
 */

import type { RuleDef } from "../../../../core/validation/types.ts";
import { rule, filingStatusIs, ifThen, lt, } from "../../../../core/validation/mod.ts";

export const F8815_RULES: readonly RuleDef[] = [
  rule(
    "F8815-001-14",
    "reject",
    "incorrect_data",
    ifThen(lt("ExclBondIntModifiedAGIAmt", 179250), filingStatusIs(2)),
    "If Form 8815, 'ExclBondIntModifiedAGIAmt' is less than 179,250, then filing status in the return must be Married filing jointly.",
  ),
  rule(
    "F8815-002-14",
    "reject",
    "incorrect_data",
    ifThen(lt("ExclBondIntModifiedAGIAmt", 114500), filingStatusIs(1, 4, 5)),
    "If Form 8815, 'ExclBondIntModifiedAGIAmt' is less than 114500, then filing status in the return must be Single or Head of household or Qualifying surviving spouse.",
  ),
];

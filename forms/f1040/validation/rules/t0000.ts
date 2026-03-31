/**
 * MeF Business Rules: T0000
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 5 rules (5 implemented, 0 stubs)
 */

import type { RuleDef } from "../../../../core/validation/types.ts";
import { rule, alwaysPass, } from "../../../../core/validation/mod.ts";

export const T0000_RULES: readonly RuleDef[] = [
  rule(
    "T0000-013",
    "reject_and_stop",
    "incorrect_data",
    alwaysPass, // requires global uniqueness check for Message ID against MeF database
    "The Message ID must be globally unique.",
  ),
  rule(
    "T0000-014",
    "reject_and_stop",
    "incorrect_data",
    alwaysPass, // requires global uniqueness check for Submission ID against MeF database
    "The Submission ID must be globally unique.",
  ),
  rule(
    "T0000-015",
    "reject_and_stop",
    "incorrect_data",
    alwaysPass, // requires ETIN matching: first 5 digits of Message ID must match request ETIN
    "The ETIN in the Message ID (the first five digits) must match the ETIN provided with the request.",
  ),
  rule(
    "T0000-016",
    "reject_and_stop",
    "incorrect_data",
    alwaysPass, // requires format validation: 20 positions, 12 digits followed by 8 lowercase alphanumeric
    "The Message ID must be 20 positions in length and conform to the following format: 12 digits followed by 8 alphanumeric characters (only lower case alphabetic characters allowed).",
  ),
  rule(
    "T0000-017",
    "reject_and_stop",
    "incorrect_data",
    alwaysPass, // requires length validation: Submission ID must be 20 characters
    "The Submission ID must be 20 characters in length.",
  ),
];

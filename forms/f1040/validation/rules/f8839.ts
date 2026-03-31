/**
 * MeF Business Rules: F8839
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 6 rules (6 implemented, 0 stubs)
 */

import type { RuleDef } from "../../../../core/validation/types.ts";
import { rule, alwaysPass, ssnNotEqual, validSSN, } from "../../../../core/validation/mod.ts";

export const F8839_RULES: readonly RuleDef[] = [
  rule(
    "F8839-001",
    "reject",
    "incorrect_data",
    ssnNotEqual("ChildSSN", "PrimarySSN"),
    "Each 'ChildSSN' on Form 8839, Line 1f must not be equal to 'PrimarySSN' in the Return Header.",
  ),
  rule(
    "F8839-002",
    "reject",
    "incorrect_data",
    ssnNotEqual("ChildSSN", "SpouseSSN"),
    "Each 'ChildSSN' on Form 8839, Line 1f must not be equal to 'SpouseSSN' in the Return Header.",
  ),
  rule(
    "F8839-004",
    "reject",
    "incorrect_data",
    alwaysPass, // requires date comparison: ChildBirthYr must not be greater than TaxYr in Return Header
    "Each 'ChildBirthYr' on Form 8839, Line 1b must not be greater than the 'TaxYr' in the Return Header.",
  ),
  rule(
    "F8839-005-07",
    "reject",
    "incorrect_data",
    alwaysPass, // requires age calculation: child must be under 18 unless DisabledChildOver18Ind is checked
    "Each 'AdoptedChild' on Form 8839, must be an eligible child under the age of 18, unless the corresponding 'DisabledChildOver18Ind' is checked. Refer to the Form 8839 instructions for the definition of an eligible child.",
  ),
  rule(
    "F8839-007",
    "reject",
    "incorrect_data",
    alwaysPass, // requires per-item uniqueness check across all ChildSSN values on Line 1f
    "Each 'ChildSSN' on Form 8839, Line 1f must be unique among all 'ChildSSN's on Line 1f.",
  ),
  rule(
    "F8839-009-01",
    "reject",
    "incorrect_data",
    validSSN("ChildSSN"),
    "Each 'ChildSSN' on Form 8839 must be within the valid range of SSN/ITIN/ATIN.",
  ),
];

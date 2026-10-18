/**
 * MeF Business Rules: F8839
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 6 rules (6 implemented)
 */

import type { RuleDef } from "../../../../../../core/validation/types.ts";
import {
  allDistinct,
  amount,
  amountLt,
  constant,
  eachGroup,
  hasValue,
  ifThen,
  inOwnDocument,
  minus,
  not,
  notGtField,
  rule,
  ssnNotEqual,
  validSSN,
} from "../../../../../../core/validation/mod.ts";

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
    ifThen(hasValue("ChildBirthYr"), notGtField("ChildBirthYr", "TaxYr")),
    "Each 'ChildBirthYr' on Form 8839, Line 1b must not be greater than the 'TaxYr' in the Return Header.",
  ),
  rule(
    "F8839-005-07",
    "reject",
    "incorrect_data",
    inOwnDocument(
      eachGroup(
        "AdoptedChild",
        ifThen(
          not(hasValue("DisabledChildOver18Ind")),
          amountLt(minus(amount("TaxYr"), amount("ChildBirthYr")), constant(18)),
        ),
        "DisabledChildOver18Ind",
        "ChildBirthYr",
      ),
    ),
    "Each 'AdoptedChild' on Form 8839, must be an eligible child under the age of 18, unless the corresponding 'DisabledChildOver18Ind' is checked. Refer to the Form 8839 instructions for the definition of an eligible child.",
  ),
  rule(
    "F8839-007",
    "reject",
    "incorrect_data",
    allDistinct("ChildSSN"),
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

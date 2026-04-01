/**
 * MeF Business Rules: F2120
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 5 rules (5 implemented, 0 stubs)
 */

import type { RuleDef } from "../../../../core/validation/types.ts";
import { rule, eqField, filingStatusIs, hasValue, ifThen, ssnNotEqual, validSSN, } from "../../../../core/validation/mod.ts";

export const F2120_RULES: readonly RuleDef[] = [
  rule(
    "F2120-001-02",
    "reject",
    "incorrect_data",
    ifThen(hasValue("CalendarYr"), eqField("CalendarYr", "TaxYr")),
    "Form 2120, 'CalendarYr' must be equal to 'TaxYr' in the Return Header.",
  ),
  rule(
    "F2120-002-01",
    "reject",
    "incorrect_data",
    ifThen(hasValue("QualifyingPersonName"), eqField("QualifyingPersonName", "DependentDetail")),
    "Form 2120, 'QualifyingPersonName' must be equal to one of the Dependent's name in 'DependentDetail' of the return.",
  ),
  rule(
    "F2120-003",
    "reject",
    "incorrect_data",
    ifThen(hasValue("SSN"), ssnNotEqual("SSN", "PrimarySSN")),
    "Each SSN that has a value on Form 2120, 'EligiblePersonWaivingDepdRight' must not be equal to the 'PrimarySSN' in the Return Header.",
  ),
  rule(
    "F2120-004",
    "reject",
    "incorrect_data",
    ifThen(filingStatusIs(2), ssnNotEqual("SSN", "SpouseSSN")),
    "Each SSN that has a value on Form 2120, 'EligiblePersonWaivingDepdRight' must not be equal to the 'SpouseSSN' in the Return Header when the return filing status is \"Married filing jointly\" (element 'IndividualReturnFilingStatusCd' has the value 2).",
  ),
  rule(
    "F2120-005-01",
    "reject",
    "incorrect_data",
    ifThen(hasValue("SSN"), validSSN("SSN")),
    "Each SSN that has a value on Form 2120, 'EligiblePersonWaivingDepdRight' must be within the valid range of an SSN/ITIN/ATIN.",
  ),
];

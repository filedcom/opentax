/**
 * MeF Business Rules: FW2G
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 11 rules (5 implemented, 6 stubs)
 */

import type { RuleDef } from "../../../../core/validation/types.ts";
import { rule, all, alwaysPass, eqField, gt, hasNonZero, hasValue, ifThen, ltField, matchesHeaderSSN, validEIN, } from "../../../../core/validation/mod.ts";

export const FW2G_RULES: readonly RuleDef[] = [
  rule(
    "FW2G-001-01",
    "reject",
    "incorrect_data",
    ifThen(gt("FederalIncomeTaxWithheldAmt", 0), ltField("FederalIncomeTaxWithheldAmt", "GamblingReportableWinningAmt")),
    "If Form W-2G, 'FederalIncomeTaxWithheldAmt' has a value greater than zero, then it must be less than 'GamblingReportableWinningAmt'.",
  ),
  rule(
    "FW2G-002",
    "reject",
    "incorrect_data",
    alwaysPass, // requires SSN format validation against known invalid SSNs for individual returns
    "Form W-2G, 'PayerSSN' is invalid for processing an Individual e-filed return.",
  ),
  rule(
    "FW2G-003",
    "reject",
    "incorrect_data",
    validEIN("PayerEIN"),
    "Form W-2G, 'PayerEIN' is invalid for processing an Individual e-filed return.",
  ),
  rule(
    "FW2G-007-01",
    "reject",
    "incorrect_data",
    alwaysPass, // requires zip code to state cross-reference validation per Publication 4164
    "If Form W-2G, Payer Address is a US Address, then the first five digits of the 'ZipCd' must be within the valid ranges of zip codes for the corresponding 'StateAbbreviationCd'. See Publication 4164.",
  ),
  rule(
    "FW2G-008-03",
    "reject",
    "incorrect_data",
    alwaysPass, // requires cross-form sum comparison: sum(W-2G GamblingReportableWinningAmt) <= max(sum(SchC TotalGrossReceiptsAmt), Schedule1 GamblingReportableWinningAmt)
    "The sum of all Form W-2G, 'GamblingReportableWinningAmt' must be less than or equal to at least one of the following: the sum of all Schedule C (Form 1040), 'TotalGrossReceiptsAmt', or Schedule 1 (Form 1040), 'GamblingReportableWinningAmt'.",
  ),
  rule(
    "FW2G-009-01",
    "reject",
    "incorrect_data",
    ifThen(hasNonZero("GamblingWinningAmt"), all(hasValue("StateAbbreviationCd"), hasValue("PayerStateIdNum"))),
    "If Form W-2G, Line 14 'GamblingWinningAmt' has a non-zero value, then Line 13 'StateAbbreviationCd' and 'PayerStateIdNum' must have a value.",
  ),
  rule(
    "FW2G-010",
    "reject",
    "data_mismatch",
    matchesHeaderSSN("RecipientSSN"),
    "Form W-2G, 'RecipientSSN' must be equal to the 'PrimarySSN' or 'SpouseSSN' in the Return Header.",
  ),
  rule(
    "FW2G-011",
    "reject",
    "incorrect_data",
    ifThen(hasValue("CalendarYr"), eqField("CalendarYr", "TaxYr")),
    "Form W-2G, 'CalendarYr' must be equal to 'TaxYr' in the Return Header.",
  ),
  rule(
    "FW2G-502",
    "reject",
    "database",
    alwaysPass, // requires e-File database lookup for EIN validity
    "Form W-2G, 'PayerEIN' must match data in the e-File database.",
  ),
  rule(
    "FW2G-505-01",
    "reject",
    "incorrect_data",
    alwaysPass, // requires e-File database lookup for EIN issuance date
    "Form W-2G, 'PayerEIN' was issued after the 'TaxYr' in the Return Header.",
  ),
  rule(
    "FW2G-599",
    "reject",
    "database",
    alwaysPass, // requires e-File database lookup for SSN validity
    "Form W-2G, 'PayerSSN' must match data in the e-File database.",
  ),
];

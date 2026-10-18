/**
 * MeF Business Rules: F2439
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 6 rules (6 implemented)
 */

import type { RuleDef } from "../../../../../../core/validation/types.ts";
import {
  hasValue,
  inOwnDocument,
  matchesHeaderSSN,
  rule,
  validEIN,
} from "../../../../../../core/validation/mod.ts";

export const F2439_RULES: readonly RuleDef[] = [
  rule(
    "F2439-002",
    "reject",
    "data_mismatch",
    matchesHeaderSSN("ShareholderSSN"),
    "Form 2439, 'ShareholderSSN' must be equal to the 'PrimarySSN' or 'SpouseSSN' in the return header of Form 1040.",
  ),
  rule(
    "F2439-003-02",
    "reject",
    "missing_data",
    hasValue("ShareholderSSN"),
    "Form 2439, 'ShareholderSSN' must have a value.",
  ),
  rule(
    "F2439-004",
    "reject",
    "missing_data",
    hasValue("RegInvstCoOrReInvstTrustName"),
    "If Form 2439 is present in the return, then 'RegInvstCoOrReInvstTrustName' must have a value.",
  ),
  rule(
    "F2439-005-01",
    "reject",
    "missing_data",
    hasValue("RICOrREITEIN"),
    "If Form 2439 is present in the return, then 'RICOrREITEIN' must have a value.",
  ),
  rule(
    "F2439-502-01",
    "reject",
    "incorrect_data",
    // Offline: an EIN the IRS can issue.
    inOwnDocument(validEIN("RICOrREITEIN")),
    "Form 2439, 'RICOrREITEIN' must  match data in  the e-File database.",
  ),
  rule(
    "F2439-505-01",
    "reject",
    "incorrect_data",
    // Offline: an EIN the IRS can issue; its issue date is IRS data.
    inOwnDocument(validEIN("RICOrREITEIN")),
    "Form 2439, 'RICOrREITEIN' was issued after the 'TaxYr' in the Return Header.",
  ),
];

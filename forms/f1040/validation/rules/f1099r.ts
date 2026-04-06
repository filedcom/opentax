/**
 * MeF Business Rules: F1099R
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 7 rules (4 implemented, 3 stubs)
 */

import type { RuleDef } from "../../../../core/validation/types.ts";
import { rule, alwaysPass, hasValue, ifThen, validEIN, } from "../../../../core/validation/mod.ts";

export const F1099R_RULES: readonly RuleDef[] = [
  rule(
    "F1099R-002-01",
    "reject",
    "missing_data",
    ifThen(hasValue("PayerUSAddress"), hasValue("StateAbbreviationCd")),
    "If Form 1099-R has a US Address in the Payer Address, then 'StateAbbreviationCd' must have a value.",
  ),
  rule(
    "F1099R-003-01",
    "reject",
    "missing_data",
    ifThen(hasValue("PayerUSAddress"), hasValue("ZipCd")),
    "If Form 1099-R has a US Address in the Payer Address, then 'ZipCd' must have a value.",
  ),
  rule(
    "F1099R-004-01",
    "reject",
    "incorrect_data",
    alwaysPass, // requires zip code to state cross-reference validation per Publication 4164
    "If Form 1099-R has a US Address in the Payer Address, then the first five digits of the Payer 'ZipCd' must be with in the valid ranges of Zip Codes listed for the corresponding 'StateAbbreviationCd'. See Publication 4164.",
  ),
  rule(
    "F1099R-005",
    "reject",
    "missing_data",
    ifThen(hasValue("FATCAFilingRequirementInd"), hasValue("PayerRecipientAccountNum")),
    "If Form 1099R, checkbox 'FATCAFilingRequirementInd' is checked, then 'PayerRecipientAccountNum' must have a value.",
  ),
  rule(
    "F1099R-499-02",
    "reject",
    "incorrect_data",
    validEIN("PayerEIN"),
    "Form 1099-R, 'PayerEIN' is invalid for processing an Individual e-filed return.",
  ),
  rule(
    "F1099R-502-02",
    "reject",
    "incorrect_data",
    alwaysPass, // requires e-File database lookup
    "Form 1099-R, 'PayerEIN' must match data in the e-File database.",
  ),
  rule(
    "F1099R-505-02",
    "reject",
    "incorrect_data",
    alwaysPass, // requires e-File database lookup for EIN issuance date
    "Form 1099-R, 'PayerEIN' was issued after the Tax Year in the Return Header.",
  ),
];

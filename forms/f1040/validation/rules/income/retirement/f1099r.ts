/**
 * MeF Business Rules: F1099R
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 7 rules (5 implemented, 2 IRS-side)
 */

import type { RuleDef } from "../../../../../../core/validation/types.ts";
import {
  hasValue,
  ifThen,
  inOwnDocument,
  irsSide,
  rule,
  validEIN,
  zipValidForState,
} from "../../../../../../core/validation/mod.ts";

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
    ifThen(hasValue("PayerUSAddress"), hasValue("ZIPCd")),
    "If Form 1099-R has a US Address in the Payer Address, then 'ZipCd' must have a value.",
  ),
  rule(
    "F1099R-004-01",
    "reject",
    "incorrect_data",
    inOwnDocument(zipValidForState("PayerUSAddress/ZIPCd", "PayerUSAddress/StateAbbreviationCd")),
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
    irsSide,
    "Form 1099-R, 'PayerEIN' must match data in the e-File database.",
  ),
  rule(
    "F1099R-505-02",
    "reject",
    "incorrect_data",
    irsSide,
    "Form 1099-R, 'PayerEIN' was issued after the Tax Year in the Return Header.",
  ),
];

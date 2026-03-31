/**
 * MeF Business Rules: STATE
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 15 rules (15 implemented, 0 stubs)
 */

import type { RuleDef } from "../../../../core/validation/types.ts";
import { rule, alwaysPass, any, hasValue, ifThen, noValue, } from "../../../../core/validation/mod.ts";

export const STATE_RULES: readonly RuleDef[] = [
  rule(
    "STATE-001",
    "reject",
    "incorrect_data",
    alwaysPass,
    "The agency to which a State Submission is filed must participate in the Fed/State program.",
  ),
  rule(
    "STATE-005",
    "reject",
    "data_mismatch",
    alwaysPass,
    "The Submission Category of  a State Submission  must match Submission Category of the referenced IRS Submission.",
  ),
  rule(
    "STATE-006",
    "reject",
    "unsupported",
    alwaysPass,
    "If IRS Submission ID is not provided in the State Submission Manifest, the State must participate in the State Stand Alone Program.",
  ),
  rule(
    "STATE-007",
    "reject",
    "incorrect_data",
    alwaysPass,
    "The IRS Submission ID referenced in the State Submission must be that of an IRS Return.",
  ),
  rule(
    "STATE-010",
    "reject",
    "data_mismatch",
    alwaysPass,
    "'TaxYr' referenced in the State Submission Manifest must match 'TaxYr' of the linked Federal return.",
  ),
  rule(
    "STATE-011",
    "reject",
    "data_mismatch",
    alwaysPass,
    "An SSN (either the Primary or the Spouse) referenced in the State Submission Manifest must match an SSN (either the Primary or the Spouse) of a linked Federal return.",
  ),
  rule(
    "STATE-012",
    "reject_and_stop",
    "unsupported",
    alwaysPass,
    "The State Submission category that was filed is not being accepted by Modernized e-File (MeF) at this time.  Please check the MeF web page under irs.gov for more information.  The submission category filed was <category>.",
  ),
  rule(
    "STATE-013",
    "reject_and_stop",
    "unsupported",
    alwaysPass,
    "The ETIN associated with the Individual submission is not a participating transmitter.  Please check the Modernized e-File (MeF) web page under irs.gov for more information on participation rules.",
  ),
  rule(
    "STATE-015",
    "reject_and_stop",
    "incorrect_data",
    alwaysPass,
    "If the Submission Category in the State Submission Manifest has a value of (\"CORP\" or \"PART\" or \"IND\" or \"EO\" or \"ESTRST\"), then 'TaxYr' in the State Submission Manifest must be valid for the current or prior year returns that are being accepted by Modernized e-File (MeF).",
  ),
  rule(
    "STATE-016",
    "reject_and_stop",
    "incorrect_data",
    alwaysPass,
    "If the Submission Category in the State Submission Manifest has a value of (\"CORPEP\" or \"PARTEP\" or \"INDEP\"or \"ESTRSTEP\"), then 'TaxYr'  in the State Submission Manifest must be the same as processing year.",
  ),
  rule(
    "STATE-017",
    "reject_and_stop",
    "incorrect_data",
    alwaysPass,
    "If the Submission Category in the State Submission Manifest has a value of (\"CORPEP\" or \"PARTEP\" or \"INDEP\"or \"ESTRSTEP\"), then 'IRSSubmissionId' in the State Submission Manifest must not have a value.",
  ),
  rule(
    "STATE-019",
    "reject_and_stop",
    "incorrect_data",
    alwaysPass,
    "In the State Submission Manifest, if the Submission Category has a value of (\"IND\" or \"INDEP\"), then ( 'PrimarySSN'  and 'PrimaryNameControlTxt' ) or 'TempId' must have a value.",
  ),
  rule(
    "STATE-901",
    "reject",
    "database",
    alwaysPass,
    "The IRS Submission ID referenced in the State Submission Manifest must be present in the e-File database.",
  ),
  rule(
    "STATE-902",
    "reject",
    "database",
    alwaysPass,
    "The IRS Submission ID referenced in the State Submission Manifest must be in accepted status.",
  ),
  rule(
    "STATE-903",
    "reject",
    "database",
    alwaysPass,
    "Electronic Filing Identification Number (EFIN) in the State Submission Manifest must be approved and present in the e-File database.",
  ),
];

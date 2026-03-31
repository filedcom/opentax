/**
 * MeF Business Rules: F8862
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 14 rules (14 implemented, 0 stubs)
 */

import type { RuleDef } from "../../../../core/validation/types.ts";
import { rule, alwaysPass, any, eqField, eqStr, filingStatusIs, hasValue, ifThen, noValue, } from "../../../../core/validation/mod.ts";

export const F8862_RULES: readonly RuleDef[] = [
  rule(
    "F8862-001-02",
    "reject",
    "incorrect_data",
    ifThen(hasValue("TaxYr"), eqField("TaxYr", "TaxYr")),
    "Form 8862, 'TaxYr' must be equal to 'TaxYr' in the Return Header.",
  ),
  rule(
    "F8862-002-02",
    "reject",
    "missing_data",
    alwaysPass,
    "For each Form 8862, 'LiveInUSDayCnt' that has a value less than 183 days, the corresponding 'BirthMonthDayDt' or 'DeathMonthDayDt' must have a value.",
  ),
  rule(
    "F8862-004",
    "reject",
    "incorrect_data",
    ifThen(eqStr("EICEligClmIncmIncorrectRptInd", "Yes"), noValue("EICEligClmQlfyChldOfOtherInd")),
    "If Form 8862, 'EICEligClmIncmIncorrectRptInd' has a choice of \"Yes\" indicated, then 'EICEligClmQlfyChldOfOtherInd' must have neither choices \"Yes\" or \"No\" indicated.",
  ),
  rule(
    "F8862-005",
    "reject",
    "missing_data",
    ifThen(eqStr("EICEligClmIncmIncorrectRptInd", "No"), hasValue("EICEligClmQlfyChldOfOtherInd")),
    "If Form 8862, 'EICEligClmIncmIncorrectRptInd' has a choice of \"No\" indicated, then 'EICEligClmQlfyChldOfOtherInd' must have a choice of \"Yes\" or \"No\" indicated.",
  ),
  rule(
    "F8862-006-01",
    "reject",
    "missing_data",
    ifThen(hasValue("CTCACTCODCClaimedInd"), any(hasValue("CTCACTCChildInformationGrp"), hasValue("ODCPersonInformationGrp"))),
    "If Form 8862, 'CTCACTCODCClaimedInd' is checked, then 'CTCACTCChildInformationGrp' or 'ODCPersonInformationGrp' must have a value.",
  ),
  rule(
    "F8862-007",
    "reject",
    "missing_data",
    ifThen(hasValue("AOTCClaimedInd"), hasValue("AOTCStudentInformationGrp")),
    "If Form 8862, 'AOTCClaimedInd' is checked, then 'AOTCStudentInformationGrp' must have a value.",
  ),
  rule(
    "F8862-008",
    "reject",
    "missing_data",
    ifThen(eqStr("QualifyingChildInd", "No"), hasValue("PrimaryNoQualifyingChildGrp")),
    "If Form 8862, 'QualifyingChildInd' has a choice of \"No\" indicated, then 'PrimaryNoQualifyingChildGrp' must have a value.",
  ),
  rule(
    "F8862-009",
    "reject",
    "missing_data",
    ifThen(eqStr("QualifyingChildInd", "No"), ifThen(filingStatusIs(2), hasValue("SpouseNoQualifyingChildGrp"))),
    "If Form 8862, 'QualifyingChildInd' has a choice of \"No\" indicated and the Filing Status of the return is \"Married filing jointly\" (element 'IndividualReturnFilingStatusCd' has the value 2), then 'SpouseNoQualifyingChildGrp' must have a value.",
  ),
  rule(
    "F8862-010",
    "reject",
    "missing_data",
    ifThen(eqStr("QualifyingChildInd", "Yes"), hasValue("FilerWithQualifyingChildGrp")),
    "If Form 8862, 'QualifyingChildInd' is 'Yes' then, 'FilerWithQualifyingChildGrp' must have a value.",
  ),
  rule(
    "F8862-011",
    "reject",
    "missing_data",
    ifThen(hasValue("CTCACTCChildInformationGrp"), hasValue("CTCACTCODCClaimedInd")),
    "If Form 8862, 'CTCACTCChildInformationGrp' has a value, then 'CTCACTCODCClaimedInd' must be checked.",
  ),
  rule(
    "F8862-012",
    "reject",
    "missing_data",
    ifThen(hasValue("ODCPersonInformationGrp"), hasValue("CTCACTCODCClaimedInd")),
    "If Form 8862, 'ODCPersonInformationGrp' has a value then, 'CTCACTCODCClaimedInd' must be checked.",
  ),
  rule(
    "F8862-013",
    "reject",
    "missing_data",
    ifThen(hasValue("AOTCStudentInformationGrp"), hasValue("AOTCClaimedInd")),
    "If Form 8862, 'AOTCStudentInformationGrp' has a value, then 'AOTCClaimedInd' must be checked.",
  ),
  rule(
    "F8862-014",
    "reject",
    "missing_data",
    ifThen(hasValue("EICClaimedInd"), any(hasValue("FilerWithQualifyingChildGrp"), hasValue("PrimaryNoQualifyingChildGrp"), hasValue("SpouseNoQualifyingChildGrp"))),
    "If Form 8862, 'EICClaimedInd' is checked, then 'FilerWithQualifyingChildGrp' or 'PrimaryNoQualifyingChildGrp' or 'SpouseNoQualifyingChildGrp' must have a value.",
  ),
  rule(
    "F8862-015",
    "reject",
    "missing_data",
    ifThen(any(hasValue("FilerWithQualifyingChildGrp"), hasValue("PrimaryNoQualifyingChildGrp"), hasValue("SpouseNoQualifyingChildGrp")), hasValue("EICClaimedInd")),
    "If Form 8862, 'FilerWithQualifyingChildGrp' or 'PrimaryNoQualifyingChildGrp' or 'SpouseNoQualifyingChildGrp' has a value, then 'EICClaimedInd' must be checked.",
  ),
];

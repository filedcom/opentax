/**
 * MeF Business Rules: F982
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 3 rules (3 implemented, 0 stubs)
 */

import type { RuleDef } from "../../../../core/validation/types.ts";
import { rule, all, hasNonZero, hasValue, ifThen, isZero, not, } from "../../../../core/validation/mod.ts";

export const F982_RULES: readonly RuleDef[] = [
  rule(
    "F982-003-01",
    "reject",
    "missing_data",
    ifThen(hasValue("DschrgQlfyRealPropBusIndbtInd"), hasNonZero("ExcldForDschrgQlfyRealPropAmt")),
    "If Form 982, Line 1d 'DschrgQlfyRealPropBusIndbtInd' is checked, Line 4 'ExcldForDschrgQlfyRealPropAmt' must have a non-zero value.",
  ),
  rule(
    "F982-004-01",
    "reject",
    "incorrect_data",
    ifThen(all(hasValue("DischargeOfQlfyFarmIndbtInd"), not(hasValue("DschrgOfIndbtInATitle11CaseInd")), not(hasValue("DschrgIndbtExtentInsolventInd")), not(hasValue("DschrgQlfyRealPropBusIndbtInd"))), isZero("ExcludedToReduceBasisOfPropAmt")),
    "If Form 982, Line 1c 'DischargeOfQlfyFarmIndbtInd' checkbox is checked and Lines 1a 'DschrgOfIndbtInATitle11CaseInd', Line 1b 'DschrgIndbtExtentInsolventInd', and Line 1d 'DschrgQlfyRealPropBusIndbtInd' checkboxes are not checked, then Line 10a 'ExcludedToReduceBasisOfPropAmt' must equal zero if an amount is entered.",
  ),
  rule(
    "F982-005-01",
    "reject",
    "missing_document",
    ifThen(hasNonZero("ExcludedUnderSection108b5Amt"), hasValue("ElectionToReduceBasisOfDeprecPropUnderIRC1017Statement")),
    "If Form 982, Line 5 'ExcludedUnderSection108b5Amt' has a non zero value, then the [ElectionToReduceBasisOfDeprecPropUnderIRC1017Statement] must be attached.",
  ),
];

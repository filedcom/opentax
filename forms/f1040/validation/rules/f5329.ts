/**
 * MeF Business Rules: F5329
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 10 rules (10 implemented, 0 stubs)
 */

import type { RuleDef } from "../../../../core/validation/types.ts";
import { rule, allDistinct, eqStr, eqSum, gt, hasNonZero, hasValue, ifThen, isZero, matchesHeaderSSN, not, notLtSum, ssnNotEqual, } from "../../../../core/validation/mod.ts";

export const F5329_RULES: readonly RuleDef[] = [
  rule(
    "F5329-001",
    "reject",
    "incorrect_data",
    matchesHeaderSSN("SSN"),
    "Form 5329, 'SSN' must be equal to the 'PrimarySSN' or 'SpouseSSN' in the Return Header.",
  ),
  rule(
    "F5329-002",
    "reject",
    "incorrect_data",
    allDistinct("SSN"),
    "If two Forms 5329 are present in the return, then their 'SSN's must not be equal.",
  ),
  rule(
    "F5329-004",
    "reject",
    "incorrect_data",
    ifThen(hasNonZero("EarlyDistriNotSubjectToTaxAmt"), hasValue("EarlyDistriExceptionReasonCd")),
    "If Form 5329, 'EarlyDistriNotSubjectToTaxAmt' has a non-zero value, then 'EarlyDistriExceptionReasonCd' must have a value.",
  ),
  rule(
    "F5329-005-01",
    "reject",
    "incorrect_data",
    eqSum("RtmntAnntyExcessContribTaxAmt", "QlfyRetirePlanExcessAccumAmt", "AllOthQlfyPlanExcessAccumAmt"),
    "Form 5329, 'RtmntAnntyExcessContribTaxAmt' must be equal to [ 'QlfyRetirePlanExcessAccumAmt' plus (+) 'AllOthQlfyPlanExcessAccumAmt' ].",
  ),
  rule(
    "F5329-008",
    "reject",
    "incorrect_data",
    ifThen(not(notLtSum("AllOthQlfyPlanMinRqrDistriAmt", "AllOthQlfyPlanActualDistriAmt", "AllOthQlfyPlanExcessAccumAmt/waiveTaxOnExAccumQRPStmtAmt")), isZero("AllOthQlfyPlanExcessAccumAmt")),
    "If the value of Form 5329, 'AllOthQlfyPlanMinRqrDistriAmt' minus (-) [ 'AllOthQlfyPlanActualDistriAmt' plus (+) 'waiveTaxOnExAccumQRPStmtAmt' on 'AllOthQlfyPlanExcessAccumAmt' ] is less than zero, then 'AllOthQlfyPlanExcessAccumAmt' must be equal to zero if an amount is entered.",
  ),
  rule(
    "F5329-009",
    "reject",
    "incorrect_data",
    ifThen(not(notLtSum("QlfyRetirePlanMinRqrDistriAmt", "QlfyRetirePlanActualDistriAmt", "QlfyRetirePlanExcessAccumAmt/waiveTaxOnExAccumQRPStmtAmt")), isZero("QlfyRetirePlanExcessAccumAmt")),
    "If the value of Form 5329, 'QlfyRetirePlanMinRqrDistriAmt' minus (-) [ 'QlfyRetirePlanActualDistriAmt' plus (+) 'waiveTaxOnExAccumQRPStmtAmt' on 'QlfyRetirePlanExcessAccumAmt' ] is less than zero, then 'QlfyRetirePlanExcessAccumAmt' must be equal to zero if an amount is entered.",
  ),
  rule(
    "F5329-010",
    "reject",
    "incorrect_data",
    ifThen(gt("QlfyRetirePlanExcessAccumAmt/waiveTaxOnExAccumQRPStmtAmt", 0), eqStr("QlfyRetirePlanExcessAccumAmt/waiveTaxOnExAccumQRPStmtCd", "RC")),
    "If Form 5329, attribute 'waiveTaxOnExAccumQRPStmtAmt' on 'QlfyRetirePlanExcessAccumAmt' has a value greater than zero, then attribute 'waiveTaxOnExAccumQRPStmtCd' on 'QlfyRetirePlanExcessAccumAmt' must have the value \"RC\".",
  ),
  rule(
    "F5329-011",
    "reject",
    "incorrect_data",
    ifThen(gt("QlfyRetirePlanExcessAccumAmt/waiveTaxOnExAccumQRPStmtAmt", 0), hasValue("WaiveTaxOnExcessAccumQRPStmt")),
    "If Form 5329, attribute 'waiveTaxOnExAccumQRPStmtAmt' on 'QlfyRetirePlanExcessAccumAmt' has a value greater than zero, then [WaiveTaxOnExcessAccumQRPStmt] must be attached to 'QlfyRetirePlanExcessAccumAmt'.",
  ),
  rule(
    "F5329-012",
    "reject",
    "incorrect_data",
    ifThen(gt("AllOthQlfyPlanExcessAccumAmt/waiveTaxOnExAccumQRPStmtAmt", 0), eqStr("AllOthQlfyPlanExcessAccumAmt/waiveTaxOnExAccumQRPStmtCd", "RC")),
    "If Form 5329, attribute 'waiveTaxOnExAccumQRPStmtAmt' on 'AllOthQlfyPlanExcessAccumAmt' has a value greater than zero, then attribute 'waiveTaxOnExAccumQRPStmtCd' on 'AllOthQlfyPlanExcessAccumAmt' must have the value \"RC\".",
  ),
  rule(
    "F5329-013",
    "reject",
    "incorrect_data",
    ifThen(gt("AllOthQlfyPlanExcessAccumAmt/waiveTaxOnExAccumQRPStmtAmt", 0), hasValue("WaiveTaxOnExcessAccumQRPStmt")),
    "If Form 5329, attribute 'waiveTaxOnExAccumQRPStmtAmt' on 'AllOthQlfyPlanExcessAccumAmt' has a value greater than zero, then [WaiveTaxOnExcessAccumQRPStmt] must be attached to 'AllOthQlfyPlanExcessAccumAmt'.",
  ),
];

/**
 * MeF Business Rules: F2210F
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 2 rules (2 implemented)
 */

import type { RuleDef } from "../../../../../../core/validation/types.ts";
import {
  eqField,
  hasValue,
  ifThen,
  inOwnDocument,
  rule,
} from "../../../../../../core/validation/mod.ts";
import {
  statementAttached,
} from "../../../../../../core/validation/predicates.ts";

export const F2210F_RULES: readonly RuleDef[] = [
  rule(
    "F2210F-001",
    "reject",
    "missing_document",
    inOwnDocument(
      ifThen(
        hasValue("PenaltyWaiverRequestInd"),
        statementAttached("PenaltyAmt", "WaiverExplanationStatement"),
      ),
    ),
    "If Form 2210-F, Part I, Line A checkbox 'PenaltyWaiverRequestInd' is checked, then [WaiverExplanationStatement] must be attached to Line 16.",
  ),
  rule(
    "F2210F-006",
    "reject",
    "data_mismatch",
    ifThen(hasValue("PenaltyAmt"), eqField("PenaltyAmt", "EsPenaltyAmt")),
    "Form 2210-F, 'PenaltyAmt' must be equal to 'EsPenaltyAmt' in the return.",
  ),
];

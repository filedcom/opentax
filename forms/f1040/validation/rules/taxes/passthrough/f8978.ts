/**
 * MeF Business Rules: F8978
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 6 rules (6 implemented)
 */

import type { RuleDef } from "../../../../../../core/validation/types.ts";
import {
  all,
  amount,
  amountLt,
  constant,
  documentTotal,
  eqStr,
  eqSumOfAll,
  groupCount,
  hasNonZero,
  hasValue,
  ifThen,
  rule,
} from "../../../../../../core/validation/mod.ts";

export const F8978_RULES: readonly RuleDef[] = [
  rule(
    "F8978-001",
    "reject",
    "missing_data",
    ifThen(
      amountLt(constant(0), documentTotal("F8978", amount("TotRptgYrTxIncreaseDecreaseAmt"))),
      hasValue("1040/OtherTaxAmtInd"),
    ),
    "If the sum of all Forms 8978, 'TotRptgYrTxIncreaseDecreaseAmt' is greater than zero, then Form 1040, 'OtherTaxAmtInd' must be checked.",
  ),
  rule(
    "F8978-002",
    "reject",
    "missing_data",
    ifThen(
      amountLt(constant(0), documentTotal("F8978", amount("TotRptgYrTxIncreaseDecreaseAmt"))),
      amountLt(
        constant(0),
        groupCount(
          "1040/OtherTaxAmtGrp",
          all(eqStr("OtherTaxAmtCd", "FORM 8978"), hasNonZero("OtherTaxAmt")),
          "OtherTaxAmtCd",
          "OtherTaxAmt",
        ),
      ),
    ),
    "If the sum of all Forms 8978, 'TotRptgYrTxIncreaseDecreaseAmt' is greater than zero, then Form 1040, 'OtherTaxAmtCd' must have the value \"FORM 8978\" with the corresponding 'OtherTaxAmt' having a non-zero value.",
  ),
  rule(
    "F8978-030-01",
    "reject",
    "missing_document",
    // Each emitted Form 8978 references its own Schedule A copy.
    (ctx) => ctx.formCount("form8978schedulea") >= ctx.formCount("form8978"),
    "If Form 8978 is present in the return, then Schedule A (Form 8978) must be attached to Form 8978.",
  ),
  rule(
    "F8978-031",
    "reject",
    "data_mismatch",
    eqSumOfAll("TotRptgYrTxIncreaseDecreaseAmt", "TYAuditLiabilityCmptGrp/TaxIncreaseDecreaseAmt"),
    "The sum of 'TaxIncreaseDecreaseAmt' in all 'TYAuditLiabilityCmptGrp' on Form 8978 must be equal to 'TotRptgYrTxIncreaseDecreaseAmt'.",
  ),
  rule(
    "F8978-032",
    "reject",
    "data_mismatch",
    eqSumOfAll("TotalPenaltyAmt", "TYAuditLiabilityCmptGrp/PenaltyAmt"),
    "The sum of 'PenaltyAmt' in all 'TYAuditLiabilityCmptGrp' on Form 8978 must be equal to 'TotalPenaltyAmt'.",
  ),
  rule(
    "F8978-033",
    "reject",
    "data_mismatch",
    eqSumOfAll("TotalInterestAmt", "TYAuditLiabilityCmptGrp/InterestAmt"),
    "The sum of 'InterestAmt' in all 'TYAuditLiabilityCmptGrp' on Form 8978 must be equal to 'TotalInterestAmt'.",
  ),
];

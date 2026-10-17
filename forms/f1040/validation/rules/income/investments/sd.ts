/**
 * MeF Business Rules: SD
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 8 rules (8 implemented)
 */

import type { RuleDef } from "../../../../../../core/validation/types.ts";
import {
  amount,
  amountEq,
  any,
  eqStr,
  formPresent,
  groupTotal,
  hasValue,
  ifThen,
  inOwnDocument,
  rule,
} from "../../../../../../core/validation/mod.ts";

export const SD_RULES: readonly RuleDef[] = [
  rule(
    "SD-F1040-001",
    "reject",
    "data_mismatch",
    inOwnDocument(
      any(
        formPresent("form8958"),
        (ctx) => {
          // Line 21 is entered as a positive amount and carried to line 7 as a loss.
          const schedule = ctx.hasValue("AllowableLossAmt")
            ? -ctx.num("AllowableLossAmt")
            : ctx.num("NetSTAndLTCapitalGainOrLossAmt");
          return Math.abs(schedule - ctx.num("1040/CapitalGainLossAmt")) < 0.01;
        },
      ),
    ),
    "Schedule D (Form 1040), 'NetSTAndLTCapitalGainOrLossAmt' or 'AllowableLossAmt' must be equal to 'CapitalGainLossAmt' in the return unless Form 8958 is present in the return.",
  ),
  rule(
    "SD-F1040-006",
    "reject",
    "data_mismatch",
    inOwnDocument(
      amountEq(
        amount("TotalSTCGL1099ShowsBasisGrp/TotalGainOrLossAmt"),
        groupTotal("8949/ShortTermCapitalGainAndLossGrp", amount("TotalGainOrLossAmt"), hasValue("TransRptOn1099BThatShowBssInd"), "TransRptOn1099BThatShowBssInd", "TotalGainOrLossAmt"),
      ),
    ),
    "Schedule D (Form 1040), Line 1b(h) 'TotalGainOrLossAmt' must be equal to the attached Form 8949, Part I, Line 2(h) 'TotalGainOrLossAmt' with checkbox A 'TransRptOn1099BThatShowBssInd' checked.",
  ),
  rule(
    "SD-F1040-007",
    "reject",
    "data_mismatch",
    inOwnDocument(
      amountEq(
        amount("TotalSTCGL1099NotShowBasisGrp/TotalGainOrLossAmt"),
        groupTotal("8949/ShortTermCapitalGainAndLossGrp", amount("TotalGainOrLossAmt"), hasValue("TransRptOn1099BNotShowBasisInd"), "TransRptOn1099BNotShowBasisInd", "TotalGainOrLossAmt"),
      ),
    ),
    "Schedule D (Form 1040), Line 2(h), 'TotalGainOrLossAmt' must be equal to the attached Form 8949, Part I, Line 2(h) 'TotalGainOrLossAmt' with checkbox B 'TransRptOn1099BNotShowBasisInd' checked.",
  ),
  rule(
    "SD-F1040-008",
    "reject",
    "data_mismatch",
    inOwnDocument(
      amountEq(
        amount("TotalSTCGL1099NotReceivedGrp/TotalGainOrLossAmt"),
        groupTotal("8949/ShortTermCapitalGainAndLossGrp", amount("TotalGainOrLossAmt"), hasValue("NonDATransNotRptOn1099BOrDAInd"), "NonDATransNotRptOn1099BOrDAInd", "TotalGainOrLossAmt"),
      ),
    ),
    "Schedule D (Form 1040), Line 3(h) 'TotalGainOrLossAmt' must be equal to the attached Form 8949, Part I, Line 2(h) 'TotalGainOrLossAmt' with checkbox C 'TransactionsNotRptedOn1099BInd' checked.",
  ),
  rule(
    "SD-F1040-009",
    "reject",
    "data_mismatch",
    inOwnDocument(
      amountEq(
        amount("TotalLTCGL1099ShowsBasisGrp/TotalGainOrLossAmt"),
        groupTotal("8949/LongTermCapitalGainAndLossGrp", amount("TotalGainOrLossAmt"), hasValue("TransRptOn1099BThatShowBssInd"), "TransRptOn1099BThatShowBssInd", "TotalGainOrLossAmt"),
      ),
    ),
    "Schedule D (Form 1040), Line 8b(h) 'TotalGainOrLossAmt' must be equal to the attached Form 8949, Part II, Line 2(h) 'TotalGainOrLossAmt' with checkbox D 'TransRptOn1099BThatShowBssInd' checked.",
  ),
  rule(
    "SD-F1040-010",
    "reject",
    "data_mismatch",
    inOwnDocument(
      amountEq(
        amount("TotalLTCGL1099NotShowBasisGrp/TotalGainOrLossAmt"),
        groupTotal("8949/LongTermCapitalGainAndLossGrp", amount("TotalGainOrLossAmt"), hasValue("TransRptOn1099BNotShowBasisInd"), "TransRptOn1099BNotShowBasisInd", "TotalGainOrLossAmt"),
      ),
    ),
    "Schedule D (Form 1040), Line 9(h) 'TotalGainOrLossAmt' must be equal to the attached Form 8949, Part II, Line 2(h) 'TotalGainOrLossAmt' with checkbox E 'TransRptOn1099BNotShowBasisInd' checked.",
  ),
  rule(
    "SD-F1040-011",
    "reject",
    "data_mismatch",
    inOwnDocument(
      amountEq(
        amount("TotalLTCGL1099NotReceivedGrp/TotalGainOrLossAmt"),
        groupTotal("8949/LongTermCapitalGainAndLossGrp", amount("TotalGainOrLossAmt"), hasValue("NonDATransNotRptOn1099BOrDAInd"), "NonDATransNotRptOn1099BOrDAInd", "TotalGainOrLossAmt"),
      ),
    ),
    "Schedule D (Form 1040), Line 10(h) 'TotalGainOrLossAmt' must be equal to the attached Form 8949, Part II, Line 2(h) 'TotalGainOrLossAmt' with checkbox F 'TransactionsNotRptedOn1099BInd' checked.",
  ),
  rule(
    "SD-F1040-018",
    "reject",
    "missing_document",
    ifThen(eqStr("DisposeInvestmentQOFInd", "Yes"), formPresent("form8949")),
    "If Schedule D (Form 1040), 'DisposeInvestmentQOFInd' has a choice of \"Yes\" indicated, then Form 8949 must be present in the return.",
  ),
];

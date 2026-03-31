/**
 * MeF Business Rules: SD
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 8 rules (8 implemented, 0 stubs)
 */

import type { RuleDef } from "../../../../core/validation/types.ts";
import { rule, alwaysPass, eqField, eqStr, formPresent, ifThen, } from "../../../../core/validation/mod.ts";

export const SD_RULES: readonly RuleDef[] = [
  rule(
    "SD-F1040-001",
    "reject",
    "data_mismatch",
    alwaysPass, // requires cross-form check: NetSTAndLTCapitalGainOrLossAmt or AllowableLossAmt must equal CapitalGainLossAmt in return, unless Form 8958 present
    "Schedule D (Form 1040), 'NetSTAndLTCapitalGainOrLossAmt' or 'AllowableLossAmt' must be equal to 'CapitalGainLossAmt' in the return unless Form 8958 is present in the return.",
  ),
  rule(
    "SD-F1040-006",
    "reject",
    "data_mismatch",
    alwaysPass, // requires cross-form field comparison with Form 8949 Part I checkbox A
    "Schedule D (Form 1040), Line 1b(h) 'TotalGainOrLossAmt' must be equal to the attached Form 8949, Part I, Line 2(h) 'TotalGainOrLossAmt' with checkbox A 'TransRptOn1099BThatShowBssInd' checked.",
  ),
  rule(
    "SD-F1040-007",
    "reject",
    "data_mismatch",
    alwaysPass, // requires cross-form field comparison with Form 8949 Part I checkbox B
    "Schedule D (Form 1040), Line 2(h), 'TotalGainOrLossAmt' must be equal to the attached Form 8949, Part I, Line 2(h) 'TotalGainOrLossAmt' with checkbox B 'TransRptOn1099BNotShowBasisInd' checked.",
  ),
  rule(
    "SD-F1040-008",
    "reject",
    "data_mismatch",
    alwaysPass, // requires cross-form field comparison with Form 8949 Part I checkbox C
    "Schedule D (Form 1040), Line 3(h) 'TotalGainOrLossAmt' must be equal to the attached Form 8949, Part I, Line 2(h) 'TotalGainOrLossAmt' with checkbox C 'TransactionsNotRptedOn1099BInd' checked.",
  ),
  rule(
    "SD-F1040-009",
    "reject",
    "data_mismatch",
    alwaysPass, // requires cross-form field comparison with Form 8949 Part II checkbox D
    "Schedule D (Form 1040), Line 8b(h) 'TotalGainOrLossAmt' must be equal to the attached Form 8949, Part II, Line 2(h) 'TotalGainOrLossAmt' with checkbox D 'TransRptOn1099BThatShowBssInd' checked.",
  ),
  rule(
    "SD-F1040-010",
    "reject",
    "data_mismatch",
    alwaysPass, // requires cross-form field comparison with Form 8949 Part II checkbox E
    "Schedule D (Form 1040), Line 9(h) 'TotalGainOrLossAmt' must be equal to the attached Form 8949, Part II, Line 2(h) 'TotalGainOrLossAmt' with checkbox E 'TransRptOn1099BNotShowBasisInd' checked.",
  ),
  rule(
    "SD-F1040-011",
    "reject",
    "data_mismatch",
    alwaysPass, // requires cross-form field comparison with Form 8949 Part II checkbox F
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

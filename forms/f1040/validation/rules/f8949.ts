/**
 * MeF Business Rules: F8949
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 10 rules (10 implemented, 0 stubs)
 */

import type { RuleDef } from "../../../../core/validation/types.ts";
import { rule, alwaysPass, formCountAtMost, formPresent, hasValue, ifThen, } from "../../../../core/validation/mod.ts";

export const F8949_RULES: readonly RuleDef[] = [
  rule(
    "F8949-002",
    "reject",
    "incorrect_data",
    alwaysPass, // requires per-item iteration to check code ordering within repeating groups
    "For each property on Form 8949, Part I and II, if Line 1(f) 'AdjustmentsToGainOrLossCd' has a value, then the codes in 'AdjustmentsToGainOrLossCd' must not be repeated and must be in alphabetical order.",
  ),
  rule(
    "F8949-003-04",
    "reject",
    "incorrect_data",
    alwaysPass, // requires per-item validation of code values within repeating groups
    "In each 'CapitalGainAndLossAssetGrp' on Form 8949, Part I or Part II, if 'AdjustmentsToGainOrLossCd' has a value, then it must not contain a code other than one of the following: \"B\", \"C\", \"D\", \"E\", \"H\", \"L\", \"M\", \"N\", \"O\", \"P\", \"Q\", \"R\", \"S\", \"T\", \"W\", \"X\", \"Y\" or \"Z\".",
  ),
  rule(
    "F8949-012",
    "reject",
    "incorrect_data",
    formCountAtMost("shortTermCapitalGainAndLossGrp_A", 1),
    "Form 8949, Part I, checkbox A 'TransRptOn1099BThatShowBssInd' must not be checked in more than one 'ShortTermCapitalGainAndLossGrp'.",
  ),
  rule(
    "F8949-013",
    "reject",
    "incorrect_data",
    formCountAtMost("shortTermCapitalGainAndLossGrp_B", 1),
    "Form 8949, Part I, checkbox B 'TransRptOn1099BNotShowBasisInd' must not be checked in more than one 'ShortTermCapitalGainAndLossGrp'.",
  ),
  rule(
    "F8949-014",
    "reject",
    "incorrect_data",
    formCountAtMost("shortTermCapitalGainAndLossGrp_C", 1),
    "Form 8949, Part I, checkbox C 'TransactionsNotRptedOn1099BInd' must not be checked in more than one 'ShortTermCapitalGainAndLossGrp'.",
  ),
  rule(
    "F8949-015",
    "reject",
    "incorrect_data",
    formCountAtMost("longTermCapitalGainAndLossGrp_D", 1),
    "Form 8949, Part II, checkbox D 'TransRptOn1099BThatShowBssInd' must not be checked in more than one 'LongTermCapitalGainAndLossGrp'.",
  ),
  rule(
    "F8949-016",
    "reject",
    "incorrect_data",
    formCountAtMost("longTermCapitalGainAndLossGrp_E", 1),
    "Form 8949, Part II, checkbox E 'TransRptOn1099BNotShowBasisInd' must not be checked in more than one 'LongTermCapitalGainAndLossGrp'.",
  ),
  rule(
    "F8949-017",
    "reject",
    "incorrect_data",
    formCountAtMost("longTermCapitalGainAndLossGrp_F", 1),
    "Form 8949, Part II, checkbox F 'TransactionsNotRptedOn1099BInd' must not be checked in more than one 'LongTermCapitalGainAndLossGrp'.",
  ),
  rule(
    "F8949-018",
    "reject",
    "multiple_documents",
    formCountAtMost("form8949", 1),
    "No more than one Form 8949 can be referenced from Schedule D (Form 1040).",
  ),
  rule(
    "F8949-024",
    "reject",
    "missing_document",
    ifThen(hasValue("AdjustmentsToGainOrLossCd_YZ"), formPresent("form8997")),
    "If Form 8949, 'AdjustmentsToGainOrLossCd' in ['ShortTermCapitalGainAndLossGrp' or 'LongTermCapitalGainAndLossGrp'] contains \"Y\" or \"Z\", then Form 8997 must be present in the return.",
  ),
];

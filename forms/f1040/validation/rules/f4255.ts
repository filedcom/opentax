/**
 * MeF Business Rules: F4255
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 11 rules (11 implemented, 0 stubs)
 */

import type { RuleDef } from "../../../../core/validation/types.ts";
import { rule, noValue, } from "../../../../core/validation/mod.ts";

export const F4255_RULES: readonly RuleDef[] = [
  rule(
    "F4255-003",
    "reject",
    "incorrect_data",
    noValue("Form7218PYCreditsGrp"),
    "Form 4255, 'Form7218PYCreditsGrp' must not have a value.",
  ),
  rule(
    "F4255-004",
    "reject",
    "incorrect_data",
    noValue("Form7213PartIIPYCreditsGrp"),
    "Form 4255, 'Form7213PartIIPYCreditsGrp' must not have a value.",
  ),
  rule(
    "F4255-005",
    "reject",
    "incorrect_data",
    noValue("Form3468PartVPYCreditsGrp"),
    "Form 4255, 'Form3468PartVPYCreditsGrp' must not have a value.",
  ),
  rule(
    "F4255-007",
    "reject",
    "incorrect_data",
    noValue("OtherNonChapter1PYCreditsGrp/PYNetEPEAmt"),
    "Form 4255, 'PYNetEPEAmt' in 'OtherNonChapter1PYCreditsGrp' must not have a value.",
  ),
  rule(
    "F4255-008",
    "reject",
    "incorrect_data",
    noValue("OtherChapter1PYCreditsGrp/PYNetEPEAmt"),
    "Form 4255, 'PYNetEPEAmt' in 'OtherChapter1PYCreditsGrp' must not have a value.",
  ),
  rule(
    "F4255-009",
    "reject",
    "incorrect_data",
    noValue("Form8936PartVPYCreditsGrp/TotEx20PrvlWgAprntcshpPnltyAmt"),
    "Form 4255, 'TotEx20PrvlWgAprntcshpPnltyAmt' in 'Form8936PartVPYCreditsGrp' must not have a value.",
  ),
  rule(
    "F4255-010",
    "reject",
    "incorrect_data",
    noValue("Form3468PartIVPYCreditsGrp/PrvlWgAprntcshpPnltyAmt"),
    "Form 4255, 'PrvlWgAprntcshpPnltyAmt' from 'Form3468PartIVPYCreditsGrp' must not have a value.",
  ),
  rule(
    "F4255-011",
    "reject",
    "incorrect_data",
    noValue("OtherNonChapter1PYCreditsGrp/RcptrPrtnEPEAppRegTaxAmt"),
    "Form 4255, 'RcptrPrtnEPEAppRegTaxAmt' from 'OtherNonChapter1PYCreditsGrp' must not have a value.",
  ),
  rule(
    "F4255-012",
    "reject",
    "incorrect_data",
    noValue("OtherChapter1PYCreditsGrp/RcptrPrtnEPEAppRegTaxAmt"),
    "Form 4255, 'RcptrPrtnEPEAppRegTaxAmt' from 'OtherChapter1PYCreditsGrp' must not have a value.",
  ),
  rule(
    "F4255-013",
    "reject",
    "incorrect_data",
    noValue("TotalAmountsPYCreditsGrp/RecapturePct"),
    "Form 4255, 'RecapturePct' from 'TotalAmountsPYCreditsGrp' must not have a value.",
  ),
  rule(
    "F4255-014",
    "reject",
    "incorrect_data",
    noValue("TotalAmountsPYCreditsGrp/RecapturePctNACd"),
    "Form 4255, 'RecapturePctNACd' from 'TotalAmountsPYCreditsGrp' must not have a value.",
  ),
];

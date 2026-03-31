/**
 * MeF Business Rules: F8997
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 4 rules (4 implemented, 0 stubs)
 */

import type { RuleDef } from "../../../../core/validation/types.ts";
import { rule, any, eqStr, hasValue, ifThen, } from "../../../../core/validation/mod.ts";

export const F8997_RULES: readonly RuleDef[] = [
  rule(
    "F8997-001",
    "reject",
    "incorrect_data",
    ifThen(hasValue("SpecialGainCd"), any(eqStr("SpecialGainCd", "A"), eqStr("SpecialGainCd", "B"), eqStr("SpecialGainCd", "C"), eqStr("SpecialGainCd", "D"), eqStr("SpecialGainCd", "E"), eqStr("SpecialGainCd", "F"), eqStr("SpecialGainCd", "G"))),
    "If Form 8997, 'SpecialGainCd' in 'InclsnEvtOthTrnsfrDurCurrTYGrp' has a value, then it must be \"A\" or \"B\" or \"C\" or \"D\" or \"E\" or \"F\" or \"G\".",
  ),
  rule(
    "F8997-002",
    "reject",
    "incorrect_data",
    ifThen(hasValue("SpecialGainCd"), any(eqStr("SpecialGainCd", "A"), eqStr("SpecialGainCd", "B"), eqStr("SpecialGainCd", "C"), eqStr("SpecialGainCd", "D"), eqStr("SpecialGainCd", "E"), eqStr("SpecialGainCd", "F"), eqStr("SpecialGainCd", "G"))),
    "If 'SpecialGainCd' in 'TotQOFInvstHoldBOYGrp' has a value, it must be \"A\" or \"B\" or \"C\" or \"D\" or \"E\" or \"F\" or \"G\".",
  ),
  rule(
    "F8997-003",
    "reject",
    "incorrect_data",
    ifThen(hasValue("SpecialGainCd"), any(eqStr("SpecialGainCd", "A"), eqStr("SpecialGainCd", "B"), eqStr("SpecialGainCd", "C"), eqStr("SpecialGainCd", "D"), eqStr("SpecialGainCd", "E"), eqStr("SpecialGainCd", "F"), eqStr("SpecialGainCd", "G"))),
    "If 'SpecialGainCd' in 'CapGainDefrdInvstQOFCurrTYGrp' has a value, it must be \"A\" or \"B\" or \"C\" or \"D\" or \"E\" or \"F\" or \"G\".",
  ),
  rule(
    "F8997-004",
    "reject",
    "incorrect_data",
    ifThen(hasValue("SpecialGainCd"), any(eqStr("SpecialGainCd", "A"), eqStr("SpecialGainCd", "B"), eqStr("SpecialGainCd", "C"), eqStr("SpecialGainCd", "D"), eqStr("SpecialGainCd", "E"), eqStr("SpecialGainCd", "F"), eqStr("SpecialGainCd", "G"))),
    "If 'SpecialGainCd' in 'TotQOFInvstHoldEOYGrp' has a value, it must be \"A\" or \"B\" or \"C\" or \"D\" or \"E\" or \"F\" or \"G\".",
  ),
];

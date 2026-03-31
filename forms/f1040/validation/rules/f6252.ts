/**
 * MeF Business Rules: F6252
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 2 rules (0 implemented, 2 stubs)
 */

import type { RuleDef } from "../../../../core/validation/types.ts";
import { rule, any, formPresent, hasNonZero, ifThen, } from "../../../../core/validation/mod.ts";

export const F6252_RULES: readonly RuleDef[] = [
  rule(
    "F6252-004-01",
    "reject",
    "missing_data",
    ifThen(hasNonZero("InstalSaleLessOrdnryIncmAmt"), any(formPresent("schedule_d"), formPresent("form4797"))),
    "If Form 6252, Line 26 'InstalSaleLessOrdnryIncmAmt' has a non-zero value, then Schedule D (Form 1040) or Form 4797 must be present in the return.",
  ),
  rule(
    "F6252-005-01",
    "reject",
    "missing_data",
    ifThen(hasNonZero("PaymentPriceLessOrdnryIncmAmt"), any(formPresent("schedule_d"), formPresent("form4797"))),
    "If Form 6252, Line 37 'PaymentPriceLessOrdnryIncmAmt' has a non-zero value, then Schedule D (Form 1040) or Form 4797 must be present in the return.",
  ),
];

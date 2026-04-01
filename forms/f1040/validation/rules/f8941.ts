/**
 * MeF Business Rules: F8941
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 5 rules (5 implemented, 0 stubs)
 */

import type { RuleDef } from "../../../../core/validation/types.ts";
import { rule, alwaysPass, all, eqMin, gt, hasNonZero, ifThen, isZero, matchesHeaderSSN, } from "../../../../core/validation/mod.ts";

export const F8941_RULES: readonly RuleDef[] = [
  rule(
    "F8941-001",
    "reject",
    "incorrect_data",
    matchesHeaderSSN("SSN"),
    "Form 8941 'SSN' must be equal to the 'PrimarySSN' or 'SpouseSSN' in the Return Header.",
  ),
  rule(
    "F8941-002",
    "reject",
    "incorrect_data",
    alwaysPass, // requires cross-instance check: if two Forms 8941, their SSNs must differ
    "If two Forms 8941 are present in the return, their SSN's must not be equal.",
  ),
  rule(
    "F8941-003",
    "reject",
    "incorrect_data",
    ifThen(gt("SmllEmplrHIPFTEEmplForTaxYrCnt", 24), all(isZero("AvgAnnualWagesPdForTxYrAmt"), isZero("HIPPaidForEmplEmployedForCrAmt"), isZero("SmllEmplrHIPPotentiallyPaidAmt"), isZero("SmllEmplrEligibleHIPPaidAmt"), isZero("SmllEmplrEligHIPTimesPctAmt"), isZero("SmllEmplrHIPFTECreditAmt"), isZero("AnnualWgPdLessThanSpecifiedAmt"), isZero("TotStPremSbsdyPdOrCrForHIPAmt"), isZero("SmallerAnnualWgPdOrHIPPdAmt"))),
    "If Form 8941, Line 2 'SmllEmplrHIPFTEEmplForTaxYrCnt' has a value greater than \"24\", then Line 3 'AvgAnnualWagesPdForTxYrAmt', Line 4 'HIPPaidForEmplEmployedForCrAmt', Line 5 'SmllEmplrHIPPotentiallyPaidAmt', Line 6 'SmllEmplrEligibleHIPPaidAmt', Line 7 'SmllEmplrEligHIPTimesPctAmt', Line 8 'SmllEmplrHIPFTECreditAmt', Line 9 'AnnualWgPdLessThanSpecifiedAmt', Line 10 'TotStPremSbsdyPdOrCrForHIPAmt' and Line 12 'SmallerAnnualWgPdOrHIPPdAmt', must be equal to zero if an amount is entered.",
  ),
  rule(
    "F8941-004-10",
    "reject",
    "incorrect_data",
    ifThen(gt("AvgAnnualWagesPdForTxYrAmt", 67000), all(isZero("HIPPaidForEmplEmployedForCrAmt"), isZero("SmllEmplrHIPPotentiallyPaidAmt"), isZero("SmllEmplrEligibleHIPPaidAmt"), isZero("SmllEmplrEligHIPTimesPctAmt"), isZero("SmllEmplrHIPFTECreditAmt"), isZero("AnnualWgPdLessThanSpecifiedAmt"), isZero("TotStPremSbsdyPdOrCrForHIPAmt"), isZero("HIPPdLessTotStPremOrCrAmt"), isZero("SmallerAnnualWgPdOrHIPPdAmt"))),
    "If Form 8941, 'AvgAnnualWagesPdForTxYrAmt' has a value greater than \"67000\", then 'HIPPaidForEmplEmployedForCrAmt', 'SmllEmplrHIPPotentiallyPaidAmt', 'SmllEmplrEligibleHIPPaidAmt', 'SmllEmplrEligHIPTimesPctAmt', 'SmllEmplrHIPFTECreditAmt', 'AnnualWgPdLessThanSpecifiedAmt', 'TotStPremSbsdyPdOrCrForHIPAmt', 'HIPPdLessTotStPremOrCrAmt', and 'SmallerAnnualWgPdOrHIPPdAmt', must be equal to zero if an amount is entered.",
  ),
  rule(
    "F8941-005",
    "reject",
    "data_mismatch",
    ifThen(hasNonZero("SmllEmplrEligibleHIPPaidAmt"), eqMin("SmllEmplrEligibleHIPPaidAmt", "HIPPaidForEmplEmployedForCrAmt", "SmllEmplrHIPPotentiallyPaidAmt")),
    "If Form 8941, line 6 'SmllEmplrEligibleHIPPaidAmt' has a non-zero value, then it must be equal to Line 4 'HIPPaidForEmplEmployedForCrAmt' or Line 5 'SmllEmplrHIPPotentiallyPaidAmt', whichever is less.",
  ),
];

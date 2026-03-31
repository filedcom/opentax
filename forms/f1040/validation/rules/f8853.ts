/**
 * MeF Business Rules: F8853
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 8 rules (7 implemented, 1 stubs)
 */

import type { RuleDef } from "../../../../core/validation/types.ts";
import { rule, alwaysPass, any, hasNonZero, hasValue, ifThen, matchesHeaderSSN, validSSN, } from "../../../../core/validation/mod.ts";

export const F8853_RULES: readonly RuleDef[] = [
  rule(
    "F8853-001-01",
    "reject",
    "incorrect_data",
    validSSN("LTCInsurancePolicyHolderSSN"),
    "Form 8853 'LTCInsurancePolicyHolderSSN' must be within the valid range of SSN/ITIN and must not be an ATIN.",
  ),
  rule(
    "F8853-002",
    "reject",
    "incorrect_data",
    matchesHeaderSSN("MSAHolderSSN"),
    "Form 8853, 'MSAHolderSSN' must be equal to  'PrimarySSN' or 'SpouseSSN' in the Return Header.",
  ),
  rule(
    "F8853-003",
    "reject",
    "incorrect_data",
    matchesHeaderSSN("LTCInsurancePolicyHolderSSN"),
    "Form 8853, 'LTCInsurancePolicyHolderSSN' must be equal to 'PrimarySSN' or 'SpouseSSN' in the Return Header.",
  ),
  rule(
    "F8853-004",
    "reject",
    "missing_data",
    ifThen(hasNonZero("TaxableMedicareMSADistriAmt"), any(hasValue("MedicareMSADistriMeetTaxExcInd"), hasValue("MedicareMSAAddnlDistriTaxAmt"))),
    "If Form 8853, 'TaxableMedicareMSADistriAmt' has a non-zero value, then checkbox 'MedicareMSADistriMeetTaxExcInd' must be checked or 'MedicareMSAAddnlDistriTaxAmt' must be equal to or greater than zero.",
  ),
  rule(
    "F8853-005",
    "reject",
    "missing_data",
    ifThen(hasNonZero("TaxableArcherMSADistriAmt"), any(hasValue("ArcherMSADistriMeetTaxExcInd"), hasNonZero("ArcherMSAAddnlDistriTaxAmt"))),
    "If Form 8853, 'TaxableArcherMSADistriAmt' has a non-zero value, then checkbox 'ArcherMSADistriMeetTaxExcInd' must be checked or 'ArcherMSAAddnlDistriTaxAmt' must have a non-zero value.",
  ),
  rule(
    "F8853-006-01",
    "reject",
    "incorrect_data",
    validSSN("LTCInsuredSSN"),
    "Form 8853, 'LTCInsuredSSN' must be within the valid range of SSN/ITIN and must not be an ATIN.",
  ),
  rule(
    "F8853-009",
    "reject",
    "missing_data",
    ifThen(hasNonZero("MedicareMSAAddnlDistriTaxAmt"), hasValue("MedicareMSAAddnlDistriTaxAmt")),
    "If Form 8853, 'MedicareMSAAddnlDistriTaxAmt' has a non-zero value, then Schedule 2 (Form 1040), 'MedicareMSAAddnlDistriTaxAmt' must have a value greater than zero.",
  ),
  rule(
    "F8853-514-01",
    "reject",
    "database",
    alwaysPass,
    "Form 8853, 'LTCInsuredSSN' and 'LTCInsuredNameControlTxt' must match data in the e-File database.",
  ),
];

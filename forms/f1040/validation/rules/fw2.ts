/**
 * MeF Business Rules: FW2
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 10 rules (10 implemented, 0 stubs)
 */

import type { RuleDef } from "../../../../core/validation/types.ts";
import { rule, alwaysPass, any, eqStr, hasValue, ifThen, matchesHeaderSSN, } from "../../../../core/validation/mod.ts";

export const FW2_RULES: readonly RuleDef[] = [
  rule(
    "FW2-001-03",
    "reject",
    "math_error",
    alwaysPass, // requires cross-form sum comparison with tolerance: sum(W2 wages) <= return wages + sum(SchC statutory gross receipts), unless Form 8958 present or certain Schedule 1 fields nonzero
    "The sum of all Form W-2s, 'WagesAmt' must not be greater than the sum of ['WagesAmt' in the return and (sum of all Schedule C (Form 1040), 'TotalGrossReceiptsAmt' when 'StatutoryEmployeeFromW2Ind' is checked)] unless Form 8958 is present in the return or Schedule 1 (Form 1040), 'CertainPenalInstnWagesAmt' or 'NonqlfyDeferredCompensationAmt' has a non-zero value. When evaluating this, a tolerance of $5.00 is allowed.",
  ),
  rule(
    "FW2-002-01",
    "reject",
    "incorrect_data",
    hasValue("WagesAmt"),
    "Form W-2, 'WagesAmt' must have a value greater than zero unless Combat Pay and/or Third-Party Sick Pay has been excluded from income.",
  ),
  rule(
    "FW2-003-02",
    "reject",
    "data_mismatch",
    matchesHeaderSSN("EmployeeSSN"),
    "Form W-2, Line a, 'EmployeeSSN' must be equal to 'PrimarySSN' or 'SpouseSSN' in the Return Header.",
  ),
  rule(
    "FW2-007-01",
    "reject",
    "incorrect_data",
    alwaysPass, // requires string length validation: CityNm in EmployerUSAddress must have >= 3 chars
    "'CityNm' of Form W-2, Line C 'EmployerUSAddress' must contain at least three characters.",
  ),
  rule(
    "FW2-008-01",
    "reject",
    "incorrect_data",
    alwaysPass, // requires string length validation: CityNm in EmployerForeignAddress must have >= 3 chars
    "'CityNm' of Form W-2, Line C 'EmployerForeignAddress' must contain at least three characters.",
  ),
  rule(
    "FW2-011",
    "reject",
    "incorrect_data",
    ifThen(hasValue("EmployersUseCd"), any(eqStr("EmployersUseCd", "A"), eqStr("EmployersUseCd", "B"), eqStr("EmployersUseCd", "C"), eqStr("EmployersUseCd", "D"), eqStr("EmployersUseCd", "E"), eqStr("EmployersUseCd", "F"), eqStr("EmployersUseCd", "G"), eqStr("EmployersUseCd", "H"), eqStr("EmployersUseCd", "J"), eqStr("EmployersUseCd", "K"), eqStr("EmployersUseCd", "L"), eqStr("EmployersUseCd", "M"), eqStr("EmployersUseCd", "N"), eqStr("EmployersUseCd", "P"), eqStr("EmployersUseCd", "Q"), eqStr("EmployersUseCd", "R"), eqStr("EmployersUseCd", "S"), eqStr("EmployersUseCd", "T"), eqStr("EmployersUseCd", "V"), eqStr("EmployersUseCd", "W"), eqStr("EmployersUseCd", "Y"), eqStr("EmployersUseCd", "Z"), eqStr("EmployersUseCd", "AA"), eqStr("EmployersUseCd", "BB"), eqStr("EmployersUseCd", "DD"), eqStr("EmployersUseCd", "EE"), eqStr("EmployersUseCd", "FF"), eqStr("EmployersUseCd", "GG"), eqStr("EmployersUseCd", "HH"), eqStr("EmployersUseCd", "II"))),
    "If Form W-2, [ 'EmployersUseCd' in 'EmployersUseGrp' ] has a value, then it must be one of the following: {A, B, C, D, E, F, G, H, J, K, L, M, N, P, Q, R, S, T, V, W, Y, Z, AA, BB, DD, EE, FF, GG, HH, II}.",
  ),
  rule(
    "FW2-012",
    "reject",
    "missing_data",
    alwaysPass, // requires per-item mutual presence check within EmployersUseGrp repeating group
    "In 'EmployersUseGrp' on Form W-2, if one of the following has a value, then the other must also have a value: 'EmployersUseCd' and 'EmployersUseAmt'.",
  ),
  rule(
    "FW2-499",
    "reject",
    "incorrect_data",
    alwaysPass, // requires EIN validation against known invalid EINs for individual returns
    "Form W-2, Line B 'EmployerEIN' is invalid for processing an Individual e-filed return.",
  ),
  rule(
    "FW2-502",
    "reject",
    "incorrect_data",
    alwaysPass, // requires e-File database lookup
    "Form W-2, Line B 'EmployerEIN' must match data in the eFile database.",
  ),
  rule(
    "FW2-505-01",
    "reject",
    "incorrect_data",
    alwaysPass, // requires e-File database lookup for EIN issuance date
    "Form W-2, Line B 'EmployerEIN' was issued after the Tax Year in the Return Header.",
  ),
];

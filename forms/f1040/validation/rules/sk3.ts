/**
 * MeF Business Rules: SK3
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 15 rules (15 implemented, 0 stubs)
 */

import type { RuleDef } from "../../../../core/validation/types.ts";
import { rule, eqStr, isZero, ifThen, all, } from "../../../../core/validation/mod.ts";

// Reusable predicate: when OtherCategoryDescriptionCd == "XX", all income amounts must be zero.
const ifXxThenAllZero = ifThen(
  eqStr("OtherCategoryDescriptionCd", "XX"),
  all(
    isZero("USSourceIncomeAmt"),
    isZero("ForeignBranchIncomeAmt"),
    isZero("PassiveCategoryIncomeAmt"),
    isZero("GeneralCategoryIncomeAmt"),
    isZero("OtherCategoryIncomeAmt"),
  ),
);

export const SK3_RULES: readonly RuleDef[] = [
  rule(
    "SK3-F8865-023",
    "reject",
    "incorrect_data",
    ifXxThenAllZero,
    "If Schedule K-3 (Form 8865), 'OtherCategoryDescriptionCd' in 'SalesGrossIncomeGrp', has the value \"XX\", then the corresponding 'USSourceIncomeAmt' and 'ForeignBranchIncomeAmt' and 'PassiveCategoryIncomeAmt' and 'GeneralCategoryIncomeAmt' and 'OtherCategoryIncomeAmt' must be zero, if amounts are entered.",
  ),
  rule(
    "SK3-F8865-024",
    "reject",
    "incorrect_data",
    ifXxThenAllZero,
    "If Schedule K-3 (Form 8865), 'OtherCategoryDescriptionCd' in 'GrossIncmPerfOfSrvcGrp', has the value \"XX\", then the corresponding 'USSourceIncomeAmt' and 'ForeignBranchIncomeAmt' and 'PassiveCategoryIncomeAmt' and 'GeneralCategoryIncomeAmt' and 'OtherCategoryIncomeAmt' must be zero, if amounts are entered.",
  ),
  rule(
    "SK3-F8865-025",
    "reject",
    "incorrect_data",
    ifXxThenAllZero,
    "If Schedule K-3 (Form 8865), 'OtherCategoryDescriptionCd' in 'GroRntlRealEstateIncmGrp', has the value \"XX\", then the corresponding 'USSourceIncomeAmt' and 'ForeignBranchIncomeAmt' and 'PassiveCategoryIncomeAmt' and 'GeneralCategoryIncomeAmt' and 'OtherCategoryIncomeAmt' must be zero, if amounts are entered.",
  ),
  rule(
    "SK3-F8865-026",
    "reject",
    "incorrect_data",
    ifXxThenAllZero,
    "If Schedule K-3 (Form 8865), 'OtherCategoryDescriptionCd' in 'OthGrossRentalIncomeGrp', has the value \"XX\", then the corresponding 'USSourceIncomeAmt' and 'ForeignBranchIncomeAmt' and 'PassiveCategoryIncomeAmt' and 'GeneralCategoryIncomeAmt' and 'OtherCategoryIncomeAmt' must be zero, if amounts are entered.",
  ),
  rule(
    "SK3-F8865-027",
    "reject",
    "incorrect_data",
    ifXxThenAllZero,
    "If Schedule K-3 (Form 8865), 'OtherCategoryDescriptionCd' in 'SchK2K3InterestIncomeGrp', has the value \"XX\", then the corresponding 'USSourceIncomeAmt' and 'ForeignBranchIncomeAmt' and 'PassiveCategoryIncomeAmt' and 'GeneralCategoryIncomeAmt' and 'OtherCategoryIncomeAmt' must be zero, if amounts are entered.",
  ),
  rule(
    "SK3-F8865-028",
    "reject",
    "incorrect_data",
    ifXxThenAllZero,
    "If Schedule K-3 (Form 8865), 'OtherCategoryDescriptionCd' in 'SchK2K3OrdinaryDividendsGrp', has the value \"XX\", then the corresponding 'USSourceIncomeAmt' and 'ForeignBranchIncomeAmt' and 'PassiveCategoryIncomeAmt' and 'GeneralCategoryIncomeAmt' and 'OtherCategoryIncomeAmt' must be zero, if amounts are entered.",
  ),
  rule(
    "SK3-F8865-029",
    "reject",
    "incorrect_data",
    ifXxThenAllZero,
    "If Schedule K-3 (Form 8865), 'OtherCategoryDescriptionCd' in 'QualifiedDividendsGrp', has the value \"XX\", then the corresponding 'USSourceIncomeAmt' and 'ForeignBranchIncomeAmt' and 'PassiveCategoryIncomeAmt' and 'GeneralCategoryIncomeAmt' and 'OtherCategoryIncomeAmt' must be zero, if amounts are entered.",
  ),
  rule(
    "SK3-F8865-030",
    "reject",
    "incorrect_data",
    ifXxThenAllZero,
    "If Schedule K-3 (Form 8865), 'OtherCategoryDescriptionCd' in 'RoyaltiesLicenseFeesGrp', has the value \"XX\", then the corresponding 'USSourceIncomeAmt' and 'ForeignBranchIncomeAmt' and 'PassiveCategoryIncomeAmt' and 'GeneralCategoryIncomeAmt' and 'OtherCategoryIncomeAmt' must be zero, if amounts are entered.",
  ),
  rule(
    "SK3-F8865-031",
    "reject",
    "incorrect_data",
    ifXxThenAllZero,
    "If Schedule K-3 (Form 8865), 'OtherCategoryDescriptionCd' in 'NetShortTermCapGainGrp', has the value \"XX\", then the corresponding 'USSourceIncomeAmt' and 'ForeignBranchIncomeAmt' and 'PassiveCategoryIncomeAmt' and 'GeneralCategoryIncomeAmt' and 'OtherCategoryIncomeAmt' must be zero, if amounts are entered.",
  ),
  rule(
    "SK3-F8865-032",
    "reject",
    "incorrect_data",
    ifXxThenAllZero,
    "If Schedule K-3 (Form 8865), 'OtherCategoryDescriptionCd' in 'NetLongTermCapGainGrp', has the value \"XX\", then the corresponding 'USSourceIncomeAmt' and 'ForeignBranchIncomeAmt' and 'PassiveCategoryIncomeAmt' and 'GeneralCategoryIncomeAmt' and 'OtherCategoryIncomeAmt' must be zero, if amounts are entered.",
  ),
  rule(
    "SK3-F8865-033",
    "reject",
    "incorrect_data",
    ifXxThenAllZero,
    "If Schedule K-3 (Form 8865), 'OtherCategoryDescriptionCd' in 'CollectiblesGainGrp', has the value \"XX\", then the corresponding 'USSourceIncomeAmt' and 'ForeignBranchIncomeAmt' and 'PassiveCategoryIncomeAmt' and 'GeneralCategoryIncomeAmt' and 'OtherCategoryIncomeAmt' must be zero, if amounts are entered.",
  ),
  rule(
    "SK3-F8865-034",
    "reject",
    "incorrect_data",
    ifXxThenAllZero,
    "If Schedule K-3 (Form 8865), 'OtherCategoryDescriptionCd' in 'SchK2K3UnrcptrSect1250GainGrp', has the value \"XX\", then the corresponding 'USSourceIncomeAmt' and 'ForeignBranchIncomeAmt' and 'PassiveCategoryIncomeAmt' and 'GeneralCategoryIncomeAmt' and 'OtherCategoryIncomeAmt' must be zero, if amounts are entered.",
  ),
  rule(
    "SK3-F8865-035",
    "reject",
    "incorrect_data",
    ifXxThenAllZero,
    "If Schedule K-3 (Form 8865), 'OtherCategoryDescriptionCd' in 'SchK2K3NetSection1231GainGrp', has the value \"XX\", then the corresponding 'USSourceIncomeAmt' and 'ForeignBranchIncomeAmt' and 'PassiveCategoryIncomeAmt' and 'GeneralCategoryIncomeAmt' and 'OtherCategoryIncomeAmt' must be zero, if amounts are entered.",
  ),
  rule(
    "SK3-F8865-036",
    "reject",
    "incorrect_data",
    ifXxThenAllZero,
    "If Schedule K-3 (Form 8865), 'OtherCategoryDescriptionCd' in 'SchK2K3OtherIncomeGrp', has the value \"XX\", then the corresponding 'USSourceIncomeAmt' and 'ForeignBranchIncomeAmt' and 'PassiveCategoryIncomeAmt' and 'GeneralCategoryIncomeAmt' and 'OtherCategoryIncomeAmt' must be zero, if amounts are entered.",
  ),
  rule(
    "SK3-F8865-037",
    "reject",
    "incorrect_data",
    ifXxThenAllZero,
    "If Schedule K-3 (Form 8865), 'OtherCategoryDescriptionCd' in 'TotGrossIncomeByCountryGrp', has the value \"XX\", then the corresponding 'USSourceIncomeAmt' and 'ForeignBranchIncomeAmt' and 'PassiveCategoryIncomeAmt' and 'GeneralCategoryIncomeAmt' and 'OtherCategoryIncomeAmt' must be zero, if amounts are entered.",
  ),
];

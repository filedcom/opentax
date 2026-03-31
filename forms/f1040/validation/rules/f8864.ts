/**
 * MeF Business Rules: F8864
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 2 rules (0 implemented, 2 stubs)
 */

import type { RuleDef } from "../../../../core/validation/types.ts";
import { rule, all, isZero, noValue, } from "../../../../core/validation/mod.ts";

export const F8864_RULES: readonly RuleDef[] = [
  rule(
    "F8864-011",
    "reject",
    "incorrect_data",
    isZero("SumAgriRnwblBiodieselAvnAmt"),
    "Form 8864, 'SumAgriRnwblBiodieselAvnAmt' must be equal to zero if an amount is entered.",
  ),
  rule(
    "F8864-012",
    "reject",
    "incorrect_data",
    all(noValue("BiodieselGallonsQty"), noValue("BiodieselAmt"), noValue("AgriBiodieselGallonsQty"), noValue("AgriBiodieselAmt"), noValue("RenewableDieselGallonsQty"), noValue("RenewableDieselAmt"), noValue("BiodieselMixtureGallonsQty"), noValue("BiodieselMixAmt"), noValue("AgriBiodieselIncludedGalsQty"), noValue("AgriBiodieselIncludedAmt"), noValue("RenewableDieselMixtureGalsQty"), noValue("RenewableDieselInclMixtureAmt"), noValue("QualifiedAgriBioDieselProdQty"), noValue("QualifiedAgriBioDieselProdAmt"), noValue("GallonsQty"), noValue("Rt"), noValue("ClaimAmt")),
    "If Form 8864 is present in the return, then each of the following must not have a value:'BiodieselGallonsQty' and 'BiodieselAmt' and 'AgriBiodieselGallonsQty' and 'AgriBiodieselAmt' and 'RenewableDieselGallonsQty' and 'RenewableDieselAmt' and 'BiodieselMixtureGallonsQty' and 'BiodieselMixAmt' and 'AgriBiodieselIncludedGalsQty' and 'AgriBiodieselIncludedAmt' and 'RenewableDieselMixtureGalsQty' and 'RenewableDieselInclMixtureAmt' and 'QualifiedAgriBioDieselProdQty' and 'QualifiedAgriBioDieselProdAmt' and [ 'GallonsQty' and 'Rt' and 'ClaimAmt' in 'SustainableAvnFuelMxtrCrGrp' ].",
  ),
];

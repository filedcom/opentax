/**
 * MeF Business Rules: F8854
 * Auto-generated from 1040_Business_Rules_2025v3.0.csv
 * 21 rules (21 implemented, 0 stubs)
 */

import type { RuleDef } from "../../../../core/validation/types.ts";
import { rule, all, alwaysPass, eqField, eqStr, gt, hasNonZero, hasValue, ifThen, noValue, } from "../../../../core/validation/mod.ts";

export const F8854_RULES: readonly RuleDef[] = [
  rule(
    "F8854-001",
    "reject",
    "missing_data",
    ifThen(hasValue("USAddress"), hasValue("ForeignResidenceAddress")),
    "If Form 8854, 'USAddress' has a value, then 'ForeignResidenceAddress' must have a value.",
  ),
  rule(
    "F8854-017-09",
    "reject",
    "incorrect_data",
    alwaysPass,
    "On Form 8854, if the average of ['USIncomeTax1stYearBfrExptrtAmt' and 'USIncomeTax2ndYearBfrExptrtAmt' and 'USIncomeTax3rdYearBfrExptrtAmt' and 'USIncomeTax4thYearBfrExptrtAmt' and 'USIncomeTax5thYearBfrExptrtAmt'] is less than 206,001 and 'NetWorthOnExptrtDateAmt' is less than 2,000,000 and 'InCompliance5PrecTaxYearInd' has a choice of \"Yes\" indicated, then 'PropertyOwnedDtExpatriationGrp' must not have a value.",
  ),
  rule(
    "F8854-018",
    "reject",
    "incorrect_data",
    ifThen(all(eqStr("DualCitizenBirthUSOthCntryInd", "Yes"), eqStr("USResNoMoreThan10Of15YrInd", "Yes"), eqStr("InCompliance5PrecTaxYearInd", "Yes")), noValue("PropertyOwnedDtExpatriationGrp")),
    "If Form 8854, ['DualCitizenBirthUSOthCntryInd' and 'USResNoMoreThan10Of15YrInd' and 'InCompliance5PrecTaxYearInd'] have a choice of \"Yes\" indicated, then 'PropertyOwnedDtExpatriationGrp' must not have a value.",
  ),
  rule(
    "F8854-019",
    "reject",
    "missing_data",
    ifThen(eqStr("DualCitizenBirthUSOthCntryInd", "Yes"), hasValue("USResNoMoreThan10Of15YrInd")),
    "If Form 8854, 'DualCitizenBirthUSOthCntryInd' has a choice of \"Yes\" indicated, then 'USResNoMoreThan10Of15YrInd' must have a choice of \"Yes\" or \"No\" indicated.",
  ),
  rule(
    "F8854-020",
    "reject",
    "incorrect_data",
    ifThen(all(eqStr("Under18USResLessThan10YrInd", "Yes"), eqStr("InCompliance5PrecTaxYearInd", "Yes")), noValue("PropertyOwnedDtExpatriationGrp")),
    "If Form 8854, 'Under18USResLessThan10YrInd' and 'InCompliance5PrecTaxYearInd' both have a choice of \"Yes\" indicated, then 'PropertyOwnedDtExpatriationGrp' must not have a value.",
  ),
  rule(
    "F8854-021",
    "reject",
    "missing_document",
    alwaysPass,
    "For each 'GainAfterAllocationExclAmt' in 'MarkToMarketPropertySaleGrp' that has a non-zero value, there must be a [Form8854ComputationStatement] attached to 'GainAfterAllocationExclAmt'.",
  ),
  rule(
    "F8854-022",
    "reject",
    "missing_data",
    alwaysPass,
    "If Form 8854, 'DeferredTaxAmt' in 'MarkToMarketPropertySaleGrp' has a non-zero value, then 'TaxEligibleForDeferralAmt' in 'ExptrtTaxDeferralGrp' must have a non-zero value.",
  ),
  rule(
    "F8854-023",
    "reject",
    "missing_document",
    alwaysPass,
    "For each 'DeferredTaxAmt' in 'MarkToMarketPropertySaleGrp' that has a non-zero value, there must be a [DeferredPropertyTaxElectionStatement] attached to 'DeferredTaxAmt'.",
  ),
  rule(
    "F8854-024",
    "reject",
    "missing_data",
    ifThen(eqStr("TaxDeferSect877AbElectionInd", "Yes"), gt("TotalTaxWithSect877AaAmt", 0)),
    "If Form 8854, 'TaxDeferSect877AbElectionInd' has a choice of \"Yes\" indicated, then 'TotalTaxWithSect877AaAmt' must have a value greater than zero.",
  ),
  rule(
    "F8854-025",
    "reject",
    "missing_data",
    ifThen(eqStr("TaxDeferSect877AbElectionInd", "Yes"), gt("TotalTaxWithoutSect877AaAmt", 0)),
    "If Form 8854, 'TaxDeferSect877AbElectionInd' has a choice of \"Yes\" indicated, then 'TotalTaxWithoutSect877AaAmt' must have a value greater than zero.",
  ),
  rule(
    "F8854-026",
    "reject",
    "missing_data",
    ifThen(eqStr("TaxDeferSect877AbElectionInd", "Yes"), gt("TaxEligibleForDeferralAmt", 0)),
    "If Form 8854, 'TaxDeferSect877AbElectionInd' has a choice of \"Yes\" indicated, then 'TaxEligibleForDeferralAmt' in 'ExptrtTaxDeferralGrp' must have a value greater than zero.",
  ),
  rule(
    "F8854-027",
    "reject",
    "missing_data",
    ifThen(eqStr("TaxDeferSect877AbElectionInd", "Yes"), gt("TotalTaxDeferredAmt", 0)),
    "If Form 8854, 'TaxDeferSect877AbElectionInd' has a choice of \"Yes\" indicated, then 'TotalTaxDeferredAmt' in 'PropertyOwnedDtExpatriationGrp' must have a value greater than zero.",
  ),
  rule(
    "F8854-028",
    "reject",
    "incorrect_data",
    ifThen(hasValue("TaxDeferSect877AbElectionInd"), eqField("TaxDeferSect877AbElectionInd", "TotalTaxWithSect877AaAmt")),
    "If Form 8854, 'TaxDeferSect877AbElectionInd' has a choice of \"No\" indicated, then 'TotalTaxWithSect877AaAmt' must be equal to zero if an amount is entered.",
  ),
  rule(
    "F8854-029",
    "reject",
    "incorrect_data",
    ifThen(hasValue("TaxDeferSect877AbElectionInd"), eqField("TaxDeferSect877AbElectionInd", "TotalTaxWithoutSect877AaAmt")),
    "If Form 8854, 'TaxDeferSect877AbElectionInd' has a choice of \"No\" indicated, then 'TotalTaxWithoutSect877AaAmt' must be equal to zero if an amount is entered.",
  ),
  rule(
    "F8854-030",
    "reject",
    "incorrect_data",
    ifThen(eqStr("TaxDeferSect877AbElectionInd", "No"), alwaysPass),
    "If Form 8854, 'TaxDeferSect877AbElectionInd' has a choice of \"No\" indicated, then 'TaxEligibleForDeferralAmt' in 'ExptrtTaxDeferralGrp' must be equal to zero if an amount is entered.",
  ),
  rule(
    "F8854-031",
    "reject",
    "missing_document",
    ifThen(hasValue("TotalPartnershipInterestGrp"), hasValue("PartnershipInterestStatement")),
    "If Form 8854, 'TotalPartnershipInterestGrp' has a value, then [PartnershipInterestStatement] must be present in the return.",
  ),
  rule(
    "F8854-032",
    "reject",
    "missing_document",
    ifThen(hasValue("TotAssetsHeldByTrSect671679Grp"), hasValue("OwnedTrustValueStatement")),
    "If Form 8854, 'TotAssetsHeldByTrSect671679Grp' has a value, then [OwnedTrustValueStatement] must be present in the return.",
  ),
  rule(
    "F8854-033",
    "reject",
    "missing_document",
    ifThen(hasValue("TotNongrantorTrBnfclIntGrp"), hasValue("NongrantorTrustsBeneficialInterestStatement")),
    "If Form 8854, 'TotNongrantorTrBnfclIntGrp' has a value, then [NongrantorTrustsBeneficialInterestStatement] must be present in the return.",
  ),
  rule(
    "F8854-034",
    "reject",
    "missing_document",
    ifThen(hasValue("TotalOtherAssetsNotIncludedGrp"), hasValue("OtherAssetsNotIncludedStatement")),
    "If Form 8854, 'TotalOtherAssetsNotIncludedGrp' has a value, then [OtherAssetsNotIncludedStatement] must be present in the return.",
  ),
  rule(
    "F8854-035",
    "reject",
    "missing_document",
    ifThen(hasNonZero("OtherLiabilityAmt"), hasValue("OtherLiabilitiesStatement")),
    "If Form 8854, 'OtherLiabilityAmt' has a non-zero value, then [OtherLiabilitiesStatement] must be attached to 'OtherLiabilityAmt'.",
  ),
  rule(
    "F8854-036",
    "reject",
    "missing_document",
    ifThen(eqStr("ChangeAstLiab5YrBfrExptrtInd", "Yes"), hasValue("ChangePreOrPostExpatriationDateStatement")),
    "If ['ChangeAstLiab5YrBfrExptrtInd' in 'ExpatriationInformationGrp'] on Form 8854 has a choice of \"Yes\" indicated, then [ChangePreOrPostExpatriationDateStatement] must be attached to 'ChangeAstLiab5YrBfrExptrtInd'.",
  ),
];
